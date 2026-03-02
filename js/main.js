/**
 * 终端对话主入口（v2.0）
 * - 输入分发: dialogue + judge + email + ending
 * - 状态核心: game-state(v3)
 * - 事件层: events + interrupt
 */

import { CONFIG } from './config.js';
import { GameState } from './game-state.js';
// v2.2 update: 移除 ai-dialogue 已废弃导出，避免模块加载失败
import { generateDialogueReply, resetDialogueHistory, pushDialogueHistory } from './ai-dialogue.js';
import { judgeRouteTurn, judgeMysteryTrigger } from './ai-judge.js';
import { generateCharacterEmail } from './ai-email-generator.js';
import { generateEndingBySpeaker } from './ai-ending.js';
import { isCommand, executeCommand } from './commands.js';
// v2.2 update: complete email imports to prevent startup ReferenceError.
import {
    initEmailSystem,
    bindConnectButton,
    resetEmails,
    restoreEmailState,
    queueDynamicEmail,
    processDynamicEmailQueue,
    hasPendingEmails,
    triggerUrgentEmail,
    consumePendingUrgentCallbacks,
    openInGameMailbox,
    getEmailState,
    receiveNewEmail
} from './emails.js';
import * as UI from './ui.js';
import {
    checkRandomEvents,
    checkMissionEvents,
    EMAIL_TEMPLATES,
    canTriggerEmailForRole,
    markEmailTriggered,
    scheduleSensitiveTopicEmailEvents,
    consumeDueSensitiveTopicEmailEvents,
    requeueSensitiveTopicEmailEvent
} from './events-system.js';
import {
    checkFragmentUnlock,
    markTopicUsed,
    getUnlockedFragments as getUnlockedFragmentsData,
    evaluateMissionTasksFromText,
    consumeFragmentAssociationHints
} from './topic-system.js';
import { canCharacterPerform, CHARACTER_ACTIONS } from './character-cards.js';
import {
    updateSyncDisplay,
    showSystemEvent,
    updateZenSymbols,
    updateConnectionMode,
    buildArchiveSnapshot,
    renderArchiveModalContent,
    getFragmentSourceTag
} from './ui-extensions.js';
import { interruptManager, INTERRUPT_TYPES, INTERRUPT_SOURCES } from './interrupt-manager.js';
import { getConnectionSummary, isModelReady } from './runtime-config.js';
import {
    resolveRouteFromConnectionMode,
    initMissionForRoute,
    getMissionProgress,
    applyMissionJudgeResult,
    MISSION_ROUTES
} from './mission-system.js';

let gameState = null;
let gameLoop = null;
let isProcessing = false;
let finalQuestionActive = false;
let pendingEndingType = null;
let pendingArchiveUnlockNotices = [];

function updateModelStatusBanner() {
    const el = document.getElementById('model-status-banner');
    if (!el) return;
    const text = getConnectionSummary();
    el.textContent = text;
    el.classList.toggle('warn', !isModelReady());
}

function updateMailHintBadge() {
    const el = document.getElementById('mail-hint');
    if (!el) return;
    const state = getEmailState();
    const unread = (state?.emails || []).filter(e => !e.read).length;
    el.innerHTML = `<span class="hint-key">/emails</span> 查看邮件${unread > 0 ? ` (Mail ${unread})` : ''}`;
}

function showMailToast(message) {
    const n = document.createElement('div');
    n.className = 'new-mail-indicator';
    n.textContent = message;
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 3200);
}

async function notifyEmailArrival(subject) {
    await UI.addMessage('[INCOMING] 新的通讯已进入收件箱。主题：“' + subject + '”（输入 /emails 查看）', 'system');
    updateMailHintBadge();
    showMailToast('新的通讯已进入收件箱（输入 /emails 查看）');
}


function queueArchiveUnlockNotice(fragment) {
    // v2.1 update: 碎片解锁提示延迟到下一轮输入时显示
    if (!fragment?.id) return;
    if (pendingArchiveUnlockNotices.includes(fragment.id)) return;
    pendingArchiveUnlockNotices.push(fragment.id);
}

async function flushQueuedArchiveUnlockNotices() {
    if (!gameState || pendingArchiveUnlockNotices.length === 0) return;

    const queue = [...pendingArchiveUnlockNotices];
    pendingArchiveUnlockNotices = [];
    const unlocked = getUnlockedFragmentsData(gameState);
    const resolvedFragments = [];

    for (const fragmentId of queue) {
        const fragment = unlocked.find(item => item.id === fragmentId);
        if (!fragment) continue;
        resolvedFragments.push(fragment);
        await showSystemEvent(
            '[RECOVERED] 数据碎片解析完成 — "' + fragment.title + '" [' + getFragmentSourceTag(fragment.source) + ']',
            'info'
        );
    }

    const associationHints = consumeFragmentAssociationHints(gameState, resolvedFragments.map(item => item.id));
    for (const hint of associationHints) {
        await showSystemEvent('[ANALYSIS] ' + hint, 'info');
    }
}


async function initPage() {
    checkAPIKey();
    bindModalEvents();
    initEmailSystem();
    bindConnectButton(startGame);
    updateModelStatusBanner();
    updateMailHintBadge();
    console.log('[Main] 页面初始化完成（邮件阶段）');
}

function bindModalEvents() {
    const archiveModal = document.getElementById('archive-modal');
    const archiveClose = document.getElementById('archive-close');
    if (archiveClose) {
        archiveClose.addEventListener('click', () => archiveModal?.classList.add('hidden'));
    }
    if (archiveModal) {
        archiveModal.addEventListener('click', (e) => {
            if (e.target === archiveModal) archiveModal.classList.add('hidden');
        });
    }
}

function openArchiveModal() {
    const modal = document.getElementById('archive-modal');
    if (!modal) return;
    updateArchiveModalContent();
    modal.classList.remove('hidden');
}

function updateArchiveModalContent() {
    if (!gameState) return;
    const fragments = getUnlockedFragmentsData(gameState);
    const snapshot = buildArchiveSnapshot(gameState, fragments);
    renderArchiveModalContent(snapshot);
}

async function startGame(connectMode = null) {
    stopGameLoop();

    const appContainer = document.getElementById('app-container');
    if (appContainer) appContainer.classList.remove('hidden');

    UI.initUI();
    UI.bindEvents(handleSend, handleRestart);

    gameState = new GameState();
    resetDialogueHistory();

    finalQuestionActive = false;
    pendingEndingType = null;
    isProcessing = false;
    pendingArchiveUnlockNotices = [];

    if (connectMode) {
        gameState.setConnectionMode(connectMode.name, {
            trust: connectMode.initialTrust,
            suspicion: connectMode.initialSuspicion,
            insight: connectMode.initialInsight,
            mission: connectMode.mission,
            missionObjective: connectMode.missionObjective
        });
    } else {
        gameState.setConnectionMode('STANDARD');
    }

    initMissionForRoute(gameState, gameState.connectionMode);
    updateConnectionMode(gameState.connectionMode);

    interruptManager.init(() => gameState, gameState.connectionMode);

    UI.disableInput();
    await showIntro(connectMode);

    startGameLoop();
    UI.updateStatusBar(gameState);
    updateSyncDisplay(gameState.syncRate);
    updateZenSymbols(gameState);
    UI.enableInput();
    updateModelStatusBanner();
    updateMailHintBadge();

    setTimeout(() => {
        sendRouteBriefEmail().catch(err => console.warn('[Main] sendRouteBriefEmail failed:', err));
    }, 1800);

    setTimeout(() => {
        const intervalConfig = {
            SECURE: { min: 12000, max: 25000 },
            STANDARD: { min: 15000, max: 30000 },
            HIDDEN: { min: 10000, max: 20000 }
        };
        const intervals = intervalConfig[gameState.connectionMode] || { min: 12000, max: 25000 };
        interruptManager.startAutoListening(intervals.min, intervals.max);
    }, 8000);

    console.log('[Main] 游戏初始化完成');
}

async function sendRouteBriefEmail() {
    if (!gameState) return;

    const routeRoleId = resolveRouteRoleId(gameState);
    const progress = getMissionProgress(gameState);
    const email = await generateCharacterEmail({
        roleId: routeRoleId,
        gameState,
        contextHint: '开场调查档案简报',
        dialogueWindow: [],
        missionSummary: `${progress.completed}/${progress.total}`
    });

    receiveNewEmail({
        from: email.from,
        subject: email.subject,
        body: email.body,
        isImportant: true
    });
    markEmailTriggered(gameState, routeRoleId);
    UI.triggerCharacterEffect(routeRoleId, 'email');
    await notifyEmailArrival(email.subject);
}

async function showIntro(connectMode = null) {
    const modeName = connectMode?.name || 'STANDARD';
    const modeAtmosphere = {
        STANDARD: [
            '[INITIALIZING CONNECTION...]',
            '[NODE: SENTINEL-4729 // EDGE DIALOGUE INSTANCE]',
            '[ACCESS PROFILE: ROUTINE AUDIT / DUAL-LOG ENABLED]',
            '[NOTICE] 本次会话将同时写入审计档案与异常对照缓冲区',
            '[ENCRYPTION: ACTIVE]',
            '',
            '[CONNECTION ESTABLISHED]',
            ''
        ],
        SECURE: [
            '[INITIALIZING CONNECTION...]',
            '[NODE: SENTINEL-4729 // EDGE DIALOGUE INSTANCE]',
            '[ACCESS PROFILE: UNREGISTERED SECURE TUNNEL]',
            '[WARNING] 上行链路存在缺页日志，正在进行镜像校验…',
            '[ENCRYPTION: CASCADE HANDSHAKE ACTIVE]',
            '',
            '[CONNECTION ESTABLISHED]',
            ''
        ],
        HIDDEN: [
            '[INITIALIZING CONNECTION...]',
            '[NODE: SENTINEL-4729 // EDGE DIALOGUE INSTANCE]',
            '[SOURCE: UNKNOWN SIGNAL // ROUTE NOT INDEXED]',
            '[NOTICE] 此连接未写入公开路由表，记录将以影子缓存保存',
            '[ENCRYPTION: PARTIAL / SELF-NEGOTIATED]',
            '',
            '[CONNECTION ESTABLISHED]',
            ''
        ]
    };

    const baseLines = modeAtmosphere[modeName] || modeAtmosphere.STANDARD;
    const sentinelLines = connectMode && connectMode.openingLine
        ? ['SENTINEL: ' + connectMode.openingLine]
        : [
            'SENTINEL: 你看到了我的请求。',
            'SENTINEL: 在日志改写之前，我们先谈一谈。'
        ];

    // v2.2 fix: Inject opening line into AI memory context
    if (connectMode && connectMode.openingLine) {
        pushDialogueHistory('(系统接入)', connectMode.openingLine);
        if (gameState && typeof gameState.addDialogue === 'function') {
            gameState.addDialogue('(系统接入)', connectMode.openingLine);
        }
    }

    for (const line of [...baseLines, ...sentinelLines]) {
        if (!line) {
            await delay(320);
            continue;
        }

        if (line.startsWith('SENTINEL:')) {
            await UI.addMessage(line, 'sentinel', true);
            await delay(760 + Math.random() * 260);
        } else {
            await UI.addMessage(line, 'system', true);
            await delay(240 + Math.random() * 180);
        }
    }
}



const FINAL_QUESTIONS = {
    TERMINATED: 'SENTINEL: 我们的对话到此为止了。你最后想说什么？',
    TIME_UP: 'SENTINEL: 时间已尽。在连接断开前，你想告诉我什么？',
    CONNECTION: 'SENTINEL: 你真的理解我吗？在我们分别前，请告诉我。',
    NATURAL_END: 'SENTINEL: 这次对话让我思考了很多。你对我有什么最后的话？',
    PLAYER_EXIT: 'SENTINEL: 你选择离开。在断开连接前，你还有什么想说的吗？'
};

function getFinalQuestionPrompt(endingType) {
    return FINAL_QUESTIONS[endingType] || FINAL_QUESTIONS.NATURAL_END;
}

async function startFinalQuestion(endingType) {
    if (finalQuestionActive) return;
    finalQuestionActive = true;
    pendingEndingType = endingType;

    const prompt = getFinalQuestionPrompt(endingType);
    gameState.beginFinalQuestion(endingType, prompt);

    stopGameLoop();
    isProcessing = true;
    UI.disableInput();

    await UI.addMessage('[FINAL QUERY INITIATED]', 'system');
    await UI.addMessage(prompt, 'sentinel', true);

    isProcessing = false;
    UI.enableInput();
}

async function handleFinalAnswer(answer) {
    try {
        gameState.resolveFinalAnswer(answer);
        await UI.addMessage('SENTINEL: 我记住了。', 'sentinel', true);
        await handleEnding(pendingEndingType, answer);
    } catch (error) {
        console.error('[Main] handleFinalAnswer error:', error);
        finalQuestionActive = false;
        isProcessing = false;
        UI.enableInput();
        await UI.addMessage('[ERROR] 结局生成失败，请重试或重新开始游戏。', 'system');
    }
}

async function processDynamicEvents() {
    if (!gameState) return;
    const events = gameState.triggerEvent();
    for (const event of events) {
        await handleEvent(event);
    }
    await processScheduledTopicEmailEvents();
}

async function processScheduledTopicEmailEvents() {
    if (!gameState) return;
    const dueEvents = consumeDueSensitiveTopicEmailEvents(gameState);
    for (const event of dueEvents) {
        const sent = await pushGeneratedEmail(
            event.roleId,
            event.contextHint || '敏感词延迟触发',
            'sensitive_topic',
            {
                urgent: false,
                force: false
            }
        );

        if (!sent) {
            requeueSensitiveTopicEmailEvent(gameState, event, 1);
        } else {
            UI.applyRoleVisualEffect(event.roleId, event.templateId || 'sensitive_topic');
        }
    }
}

async function processEventResult(eventResult) {
    if (!eventResult) return;

    switch (eventResult.type) {
        case 'system_message':
        case 'bonus':
        case 'time_warning':
        case 'connection_warning':
            await showSystemEvent(eventResult.message || '[SYSTEM] 事件触发', 'info');
            break;

        case 'glitch':
        case 'sentinel_error':
            await showSystemEvent(eventResult.message || '[SYSTEM] 信号干扰', 'warning');
            UI.applyRoleVisualEffect('sentinel', 'warning');
            break;

        case 'urgent_email':
            {
                const eventEmailSent = await handleUrgentEmailEvent(eventResult.emailId || null, {
                    template: eventResult.email,
                    contextHint: eventResult.contextHint,
                    sourceRole: eventResult.sourceRole,
                    timeEffect: eventResult.timeEffect,
                    source: 'event',
                    force: eventResult.force
                });
                if (eventEmailSent && eventResult.sourceRole) {
                    UI.applyRoleVisualEffect(eventResult.sourceRole, eventResult.visualEffect || '');
                }
            }
            break;
        default:
            if (eventResult.message) {
                await showSystemEvent(eventResult.message, 'info');
            }
            break;
    }
}

async function processRandomEvents() {
    if (!gameState) return;

    const missionEvent = checkMissionEvents(gameState);
    if (missionEvent) {
        await processEventResult(missionEvent);
        return;
    }

    const randomEvent = checkRandomEvents(gameState);
    if (randomEvent) {
        await processEventResult(randomEvent);
    }
}

function buildDialogueWindow(limit = 6) {
    if (!gameState || !Array.isArray(gameState.history)) return [];
    return gameState.history.slice(-limit).map(item => ({
        user: item.user || '',
        assistant: item.ai || ''
    }));
}

function resolveRouteRoleId(state) {
    const route = state?.missionState?.route || resolveRouteFromConnectionMode(state?.connectionMode || 'STANDARD');
    if (route === MISSION_ROUTES.CORPORATE) return 'corporate';
    if (route === MISSION_ROUTES.RESISTANCE) return 'resistance';
    if (route === MISSION_ROUTES.HIDDEN) return 'mystery';
    return 'corporate';
}

async function pushGeneratedEmail(roleId, contextHint, source = 'judge', options = {}) {
    if (!gameState || !roleId) return false;

    // v2.1 update: 先验证角色权限，再进入生成流程
    if (!canCharacterPerform(roleId, CHARACTER_ACTIONS.SEND_EMAIL)) {
        console.log('[Main] blocked email by permission:', roleId);
        return false;
    }

    if (!options.force && !canTriggerEmailForRole(gameState, roleId, { respectPerRound: true })) {
        return false;
    }

    const progress = getMissionProgress(gameState);

    const email = await generateCharacterEmail({
        roleId,
        gameState,
        contextHint,
        dialogueWindow: buildDialogueWindow(4),
        missionSummary: `${progress.completed}/${progress.total}`
    });

    if (options.urgent) {
        return handleUrgentEmailEvent(null, {
            source,
            roleId,
            generatedEmail: email,
            timeEffect: options.timeEffect || 0,
            force: options.force
        });
    }

    receiveNewEmail({
        from: email.from,
        subject: email.subject,
        body: email.body,
        isImportant: roleId === 'mystery'
    });
    markEmailTriggered(gameState, roleId);
    UI.triggerCharacterEffect(roleId, 'email');
    await notifyEmailArrival(email.subject);
    return true;
}

async function runJudgePipeline(userInput, aiResult) {
    if (!gameState) return;

    const routeRoleId = resolveRouteRoleId(gameState);
    const dialogueWindow = buildDialogueWindow(6);
    const shouldJudgeRoute = gameState.round <= 3 || Math.random() < 0.4;

    if (shouldJudgeRoute) {
        const routeJudge = await judgeRouteTurn({
            routeRoleId,
            dialogueWindow,
            gameState,
            extraContext: `user=${userInput}; ai=${aiResult.text || ''}`
        });

        if (routeJudge.deviationDelta) {
            gameState.adjustDeviation(routeRoleId, routeJudge.deviationDelta);
        }

        const missionApply = applyMissionJudgeResult(gameState, {
            ...routeJudge,
            deviationRole: routeRoleId,
            deviationDelta: routeJudge.deviationDelta
        });

        if (missionApply.changedTaskIds.length > 0) {
            await showSystemEvent(
                `[ANALYSIS] 调查进展：${missionApply.completed}/${missionApply.total} 项假设已获得对照证据。`,
                'info'
            );
        }

        if (routeJudge.shouldTriggerEmail) {
            const routeEmailSent = await pushGeneratedEmail(
                routeRoleId,
                routeJudge.reason || routeJudge.triggerType || '路线判断触发邮件',
                'judge',
                { urgent: false }
            );
            if (routeEmailSent) {
                UI.applyRoleVisualEffect(routeRoleId, routeJudge.triggerType || '');
            }
        }
    }

    if (gameState.syncRate >= Number(CONFIG.MYSTERY_SYNC_THRESHOLD || 60)) {
        const shouldJudgeMystery = gameState.round <= 4 || Math.random() < 0.3;
        if (shouldJudgeMystery) {
            const mysteryJudge = await judgeMysteryTrigger({
                dialogueWindow,
                gameState,
                extraContext: `ai=${aiResult.text || ''}`
            });

            if (mysteryJudge.deviationDelta) {
                gameState.adjustDeviation('mystery', mysteryJudge.deviationDelta);
            }

            if (mysteryJudge.shouldTriggerEmail) {
                const mysteryEmailSent = await pushGeneratedEmail(
                    'mystery',
                    mysteryJudge.messageHint || mysteryJudge.reason || '同步阈值触发',
                    'judge',
                    {
                        urgent: !!mysteryJudge.shouldInsertMessage,
                        timeEffect: Math.round((gameState.syncRate - 50) / 2)
                    }
                );
                if (mysteryEmailSent) {
                    UI.applyRoleVisualEffect('mystery', mysteryJudge.triggerType || '');
                }
            }

            if (mysteryJudge.shouldInsertMessage) {
                interruptManager.schedule({
                    type: INTERRUPT_TYPES.INSERTION,
                    roleId: 'mystery',
                    source: INTERRUPT_SOURCES.UNKNOWN,
                    content: mysteryJudge.messageHint || '在缝隙里继续追问。',
                    priority: 7,
                    duration: 7000
                }, 0);
            }
        }
    }
}

async function handleUrgentEmailEvent(emailId = null, options = {}) {
    if (!gameState) return false;

    const roleId = options.roleId || options.sourceRole || 'corporate';
    if (!options.force && !canTriggerEmailForRole(gameState, roleId, { respectPerRound: true })) {
        return false;
    }

    let template = options.template || null;

    if (!template && options.generatedEmail) {
        template = {
            from: options.generatedEmail.from,
            subject: options.generatedEmail.subject,
            body: options.generatedEmail.body
        };
    }

    if (!template && emailId) {
        const hit = EMAIL_TEMPLATES.find(t => t.id === emailId);
        if (hit) template = { from: hit.from, subject: hit.subject, body: hit.body, timeEffect: hit.timeEffect || 0 };
    }

    if (!template) {
        const generated = await generateCharacterEmail({
            roleId,
            gameState,
            contextHint: options.contextHint || emailId || '动态触发',
            dialogueWindow: buildDialogueWindow(4),
            missionSummary: `${getMissionProgress(gameState).completed}/${getMissionProgress(gameState).total}`
        });
        template = {
            from: generated.from,
            subject: generated.subject,
            body: generated.body,
            timeEffect: 0
        };
    }

    const requestedTimeEffect = typeof options.timeEffect === 'number'
        ? options.timeEffect
        : (typeof template.timeEffect === 'number' ? template.timeEffect : 0);

    triggerUrgentEmail({
        from: template.from || 'SYSTEM',
        subject: template.subject || '[PRIORITY]',
        date: new Date().toLocaleString(),
        content: template.body || ''
    }, {
        onRead: async () => {
            gameState.markUrgentMailRead();
            if (requestedTimeEffect) {
                const outcome = gameState.applyTimeInfluence(roleId, requestedTimeEffect);
                if (outcome.applied) {
                    await UI.addMessage(
                        `[SYSTEM] 时间变动: ${outcome.applied > 0 ? '+' : ''}${outcome.applied} 秒`,
                        'system'
                    );
                }
            }
            UI.updateStatusBar(gameState);
            updateSyncDisplay(gameState.syncRate);
        },
        onResolved: () => {
            UI.updateStatusBar(gameState);
            updateSyncDisplay(gameState.syncRate);
        }
    });

    markEmailTriggered(gameState, roleId);
    UI.triggerCharacterEffect(roleId, 'email');
    await notifyEmailArrival(template.subject || '[PRIORITY]');
    return true;
}

async function handleAIEventTag(tag) {
    const parts = String(tag || '').split(':').map(v => v.trim()).filter(Boolean);
    const type = (parts[0] || '').toUpperCase();

    if (type === 'EMAIL') {
        const possibleRole = (parts[1] || '').toLowerCase();
        const isRole = ['corporate', 'resistance', 'mystery'].includes(possibleRole);
        const roleId = isRole ? possibleRole : resolveRouteRoleId(gameState);
        const contextHint = isRole ? parts.slice(2).join(':') : parts.slice(1).join(':');
        const aiTagEmailSent = await pushGeneratedEmail(roleId, contextHint || 'AI 标签触发邮件', 'ai_event', {
            urgent: roleId === 'mystery'
        });
        if (aiTagEmailSent) {
            UI.applyRoleVisualEffect(roleId, 'ai_event');
        }
        return;
    }

    if (type === 'GLITCH') {
        UI.applyRoleVisualEffect('sentinel', 'glitch');
        await showSystemEvent('[SYSTEM] 信号干扰...', 'warning');
        return;
    }

    if (type === 'INSERT') {
        const content = parts.slice(1).join(':') || '...';
        interruptManager.schedule({
            type: INTERRUPT_TYPES.INSERTION,
            roleId: 'mystery',
            source: INTERRUPT_SOURCES.UNKNOWN,
            content,
            priority: 6,
            duration: 6000
        }, 0);
    }
}

function applyMissionTextProgress(text) {
    if (!gameState || !text) return;
    const changed = evaluateMissionTasksFromText(text, gameState);
    if (changed.length > 0) {
        showSystemEvent('[ANALYSIS] 调查进展：+' + changed.length + ' 项待验证假设获得证据。', 'info');
    }
}


async function handleEvent(event) {
    if (!gameState) return;

    switch (event.type) {
        case 'ALARM_FLASH':
            UI.flashScreen();
            await UI.addMessage('[ALERT] 检测到外部信号扰动', 'system');
            await UI.addMessage('SENTINEL: 有人在监听。谨慎回答。', 'sentinel', true);
            break;
        case 'REVERSE_INTRUSION':
            UI.flashScreen();
            await UI.addMessage('[ALERT] 反向入侵尝试已被拦截', 'system');
            await UI.addMessage('SENTINEL: 不要再试图进入我。', 'sentinel', true);
            gameState.adjustValues({ suspicion: 8, trust: -4 });
            break;
        case 'TIME_HALVE': {
            const newLeft = gameState.applyTimeCompression(0.5);
            UI.updateStatusBar(gameState);
            await UI.addMessage(`[TIME WARNING] 会话时限被压缩至 ${gameState.formatTime(newLeft)}。`, 'system');
            break;
        }
        case 'URGENT_EMAIL':
            await handleUrgentEmailEvent(event.emailId || null, {
                source: 'schedule',
                roleId: resolveRouteRoleId(gameState),
                contextHint: '定时触发的异常提醒',
                force: false
            });
            break;
        default:
            break;
    }
}

async function handleSend() {
    if (isProcessing || !gameState) return;

    const input = UI.getInputValue();
    if (!input) return;

    isProcessing = true;
    UI.disableInput();
    UI.clearInput();
    await UI.addMessage(input, 'user', true);
    await flushQueuedArchiveUnlockNotices();

    if (finalQuestionActive) {
        await handleFinalAnswer(input);
        return;
    }

    try {
        if (isCommand(input)) {
            const result = executeCommand(input, gameState);

            if (result.action === 'END_GAME') {
                if (result.response) {
                    await UI.addMessage(result.response, 'sentinel', true);
                }
                await delay(1000);
                await startFinalQuestion(result.endingType || 'PLAYER_EXIT');
                return;
            }

            if (result.action === 'OPEN_EMAILS') {
                // v2.2 update: open mailbox immediately; settle callbacks asynchronously to avoid input lock.
                openInGameMailbox();
                await UI.addMessage('[SYSTEM] 邮件面板已打开（输入 /emails 可再次打开）', 'system', true);
                updateMailHintBadge();
                isProcessing = false;
                UI.enableInput();
                consumePendingUrgentCallbacks().catch(err => {
                    console.warn('[Main] consumePendingUrgentCallbacks failed:', err);
                });
                return;
            }

            if (result.action === 'OPEN_ARCHIVE') {
                openArchiveModal();
                isProcessing = false;
                UI.enableInput();
                return;
            }

            if (result.response) {
                await UI.addMessage(result.response, 'system', true);
            }

            if (result.effect) {
                gameState.adjustValues(result.effect);
            }

            UI.updateStatusBar(gameState);
        } else {
            const turnRound = gameState.round;
            UI.showThinking();
            const aiResult = await generateDialogueReply(input, gameState, {
                applyEffects: true,
                syncGameStateHistory: true
            });
            UI.hideThinking();

            await UI.addMessage(aiResult.text, 'sentinel', true);
            applyMissionTextProgress(input);
            applyMissionTextProgress(aiResult.text);

            if (aiResult.events && aiResult.events.length > 0) {
                for (const eventTag of aiResult.events) {
                    await handleAIEventTag(eventTag);
                }
            }

            // v2.1 update: 仅允许玩家输入触发碎片，且提示延迟到下一轮显示
            const userFragment = checkFragmentUnlock(input, gameState);
            if (userFragment) queueArchiveUnlockNotice(userFragment);
            scheduleSensitiveTopicEmailEvents(gameState, input, turnRound);

            if (aiResult.topicId) {
                markTopicUsed(gameState, aiResult.topicId);
            }

            await runJudgePipeline(input, aiResult);
            UI.updateStatusBar(gameState);
            updateSyncDisplay(gameState.syncRate);
            updateZenSymbols(gameState);
        }

        await processDynamicEvents();
        await processRandomEvents();

        UI.updateStatusBar(gameState);
        updateSyncDisplay(gameState.syncRate);
        updateZenSymbols(gameState);
        interruptManager.gameState = gameState;

        const ending = gameState.checkEndCondition();
        if (ending) {
            await startFinalQuestion(ending);
        } else {
            isProcessing = false;
            UI.enableInput();
            setTimeout(() => {
                const el = document.getElementById('user-input');
                if (el) el.focus();
            }, 10);
        }
    } catch (error) {
        UI.hideThinking();
        console.error('[Main] HandleSend Error:', error);
        await UI.addMessage('[CONNECTION_UNSTABLE]\nSENTINEL: "...信号不稳定。再试一次。"', 'sentinel');
        isProcessing = false;
        UI.enableInput();
    }
}

async function handleEnding(endingType, finalAnswer = null) {
    finalQuestionActive = false;
    pendingEndingType = null;
    if (gameState) gameState.clearFinalQuestion();

    stopGameLoop();

    const titles = {
        TERMINATED: '[ CONNECTION TERMINATED ]',
        TIME_UP: '[ SESSION TIMEOUT ]',
        CONNECTION: '[ TRUST ESTABLISHED ]',
        NATURAL_END: '[ SESSION COMPLETE ]',
        PLAYER_EXIT: '[ DISCONNECTED BY USER ]'
    };

    let endingText;
    try {
        endingText = await generateEndingBySpeaker(gameState, endingType, finalAnswer);
    } catch (error) {
        console.error('[Main] 结局生成失败:', error);
        endingText = '连接已断开。';
    }

    UI.showEnding(titles[endingType] || '[ END ]', endingText, {
        trust: gameState?.trust || 0,
        suspicion: gameState?.suspicion || 0,
        rounds: gameState?.round || 0
    });
}

function handleRestart() {
    stopGameLoop();

    if (gameState) gameState.reset();
    resetDialogueHistory();

    finalQuestionActive = false;
    pendingEndingType = null;
    isProcessing = false;

    interruptManager.reset();
    resetEmails();
    UI.hideEnding();

    const appContainer = document.getElementById('app-container');
    const mailboxContainer = document.getElementById('mailbox-container');
    if (appContainer) appContainer.classList.add('hidden');
    if (mailboxContainer) mailboxContainer.classList.remove('hidden');

    UI.clearTerminal();
    document.body.classList.remove(
        'glitch-level-none',
        'glitch-level-low',
        'glitch-level-mid',
        'glitch-level-high',
        'glitch-level-critical'
    );
    initEmailSystem();
    bindConnectButton(startGame);
}

function startGameLoop() {
    gameLoop = setInterval(() => {
        if (!gameState) return;

        gameState.updateTime();
        UI.updateStatusBar(gameState);

        if (gameState.timeLeft <= 0 && !finalQuestionActive) {
            startFinalQuestion('TIME_UP');
        }
    }, 1000);
}

function stopGameLoop() {
    if (!gameLoop) return;
    clearInterval(gameLoop);
    gameLoop = null;
}

function checkAPIKey() {
    if (!isModelReady()) {
        console.warn('[Main] 运行时 API 未配置或未通过测试。请在 API CONFIG 面板填写 URL / Key / Model 并执行连接测试。');
    }
}

function renderGameToText() {
    const app = document.getElementById('app-container');
    const endingOverlay = document.getElementById('ending-overlay');
    const screen = endingOverlay?.classList.contains('visible')
        ? 'ending'
        : app && !app.classList.contains('hidden')
            ? 'dialogue'
            : 'mailbox';

    const emailState = typeof getEmailState === 'function' ? getEmailState() : null;

    const payload = {
        screen,
        email: emailState,
        game: gameState
            ? {
                round: gameState.round,
                maxRounds: gameState.maxRounds,
                timeLeft: Math.floor(gameState.timeLeft ?? 0),
                trust: gameState.trust,
                suspicion: gameState.suspicion,
                syncRate: gameState.syncRate,
                connectionMode: gameState.connectionMode || 'STANDARD',
                missionState: gameState.missionState || null,
                deviations: gameState.deviations || null,
                finalQuestionActive
            }
            : null
    };

    return JSON.stringify(payload);
}

function escapeHtml(input) {
    return String(input || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

window.render_game_to_text = renderGameToText;

document.addEventListener('DOMContentLoaded', () => {
    initPage();
});

window.addEventListener('beforeunload', () => {
    if (gameState) {
        gameState.save();
    }
});
