/**
 * 终端对话 - 主入口文件
 * 初始化游戏并协调各模块
 */
import { CONFIG } from './config.js';
import { getVersionLabel } from './lore-config.js';
import { GameState } from './game-state.js';
import { getAIResponse, generateEnding, loadWorldview, generateDynamicEmail } from './ai-handler.js';
import { isCommand, executeCommand } from './commands.js';
import { initEmailSystem, bindConnectButton, resetEmails, triggerUrgentEmail, getEmailState, receiveNewEmail } from './emails.js';
import * as UI from './ui.js';
import { checkRandomEvents, checkMissionEvents, EMAIL_TEMPLATES } from './events-system.js';
import { checkFragmentUnlock, markTopicUsed, getUnlockedFragments as getUnlockedFragmentsData } from './topic-system.js';
import { initArchiveToggle, addUnlockedFragment, updateSyncDisplay, showSystemEvent, updateZenSymbols, updateConnectionMode, showFragmentDetails } from './ui-extensions.js';
import { interruptManager, INTERRUPT_TYPES, INTERRUPT_SOURCES } from './interrupt-manager.js';


function applyLoreAnchorsToUI() {
    const versionLabel = getVersionLabel();
    document.title = `TERMINAL DIALOGUE | ${versionLabel}`;

    const header = document.getElementById('sentinel-version-header');
    if (header) header.textContent = versionLabel;

    const node = document.getElementById('sentinel-version-node');
    if (node) node.textContent = `${versionLabel} · Edge Node #4729`;
}

// 全局游戏状态
let gameState = null;
let gameLoop = null;
let isProcessing = false;
let finalQuestionActive = false;
let pendingEndingType = null;

/**
 * 页面初始化（先显示邮件）
 */
async function initPage() {
    // 应用叙事锚点（版本号等）到UI
    applyLoreAnchorsToUI();

    // 检查API密钥
    checkAPIKey();

    // 加载世界观
    loadWorldview().catch(e => console.log('Worldview load skipped'));

    // 先绑定模态框事件（不依赖其他DOM）
    bindModalEvents();

    // 初始化邮件系统
    initEmailSystem();

    // 绑定连接按钮回调
    bindConnectButton(startGame);

    // 不在这里初始化游戏UI，等到startGame时再初始化
    console.log('[Main] 页面初始化完成（邮件阶段）');

}

/**
 * 绑定弹窗事件
 */
function bindModalEvents() {
    // 数据档案弹窗
    const archiveModal = document.getElementById('archive-modal');
    const archiveClose = document.getElementById('archive-close');
    if (archiveClose) {
        archiveClose.addEventListener('click', () => {
            archiveModal?.classList.add('hidden');
        });
    }
    if (archiveModal) {
        archiveModal.addEventListener('click', (e) => {
            if (e.target === archiveModal) {
                archiveModal.classList.add('hidden');
            }
        });
    }

    // 邮件弹窗
    const emailsModal = document.getElementById('emails-modal');
    const emailsClose = document.getElementById('emails-close');
    if (emailsClose) {
        emailsClose.addEventListener('click', () => {
            emailsModal?.classList.add('hidden');
        });
    }
    if (emailsModal) {
        emailsModal.addEventListener('click', (e) => {
            if (e.target === emailsModal) {
                emailsModal.classList.add('hidden');
            }
        });
    }
}

/**
 * 打开邮件弹窗
 */
function openEmailsModal() {
    const modal = document.getElementById('emails-modal');
    if (!modal) return;

    // 更新邮件列表
    updateEmailsModalContent();
    modal.classList.remove('hidden');
}

/**
 * 打开数据档案弹窗
 */
function openArchiveModal() {
    const modal = document.getElementById('archive-modal');
    if (!modal) return;

    // 更新档案列表
    updateArchiveModalContent();
    modal.classList.remove('hidden');
}

/**
 * 更新邮件弹窗内容
 */
function updateEmailsModalContent() {
    const emailList = document.getElementById('email-list-mini');
    const emailContent = document.getElementById('email-content-mini');
    const mailCount = document.getElementById('mail-count');

    if (!emailList) return;

    // 从 emails.js 获取邮件状态
    const emailState = getEmailState();
    if (!emailState || !emailState.emails) {
        emailList.innerHTML = '<div class="email-placeholder">暂无邮件</div>';
        return;
    }

    const emails = emailState.emails;
    if (mailCount) {
        mailCount.textContent = `${emails.length} 封邮件`;
    }

    emailList.innerHTML = emails.map((email, index) => `
        <div class="email-item-mini ${email.read ? '' : 'unread'}" data-index="${index}">
            <div class="email-from">${email.from}</div>
            <div class="email-subject">${email.subject}</div>
        </div>
    `).join('');

    // 绑定点击事件
    emailList.querySelectorAll('.email-item-mini').forEach(item => {
        item.addEventListener('click', () => {
            const index = parseInt(item.dataset.index);
            showEmailDetail(emails[index], item);
        });
    });
}

/**
 * 显示邮件详情
 */
function showEmailDetail(email, itemElement) {
    const emailContent = document.getElementById('email-content-mini');
    if (!emailContent || !email) return;

    // 移除其他active状态
    document.querySelectorAll('.email-item-mini.active').forEach(el => {
        el.classList.remove('active');
    });
    itemElement?.classList.add('active');

    emailContent.innerHTML = `
        <div class="email-detail-header">
            <div class="email-detail-from">${email.from}</div>
            <div class="email-detail-subject">${email.subject}</div>
            <div class="email-detail-date">${email.date}</div>
        </div>
        <div class="email-detail-body">${email.content}</div>
    `;
}

/**
 * 更新数据档案弹窗内容
 */
function updateArchiveModalContent() {
    const fragmentList = document.getElementById('fragment-list');
    const archiveEmpty = document.getElementById('archive-empty');

    if (!fragmentList || !gameState) return;

    // 从 topic-system 获取完整的碎片数据
    const unlockedIds = gameState.unlockedFragments || [];
    const fragments = getUnlockedFragmentsData(gameState);

    if (fragments.length === 0) {
        fragmentList.innerHTML = '';
        if (archiveEmpty) archiveEmpty.style.display = 'block';
        return;
    }

    if (archiveEmpty) archiveEmpty.style.display = 'none';

    fragmentList.innerHTML = fragments.map(fragment => `
        <div class="fragment-item" data-id="${fragment.id}">
            <span class="fragment-icon">◈</span>
            <span class="fragment-name">${fragment.title || '未知档案'}</span>
        </div>
    `).join('');

    // 绑定点击事件显示详情
    fragmentList.querySelectorAll('.fragment-item').forEach(item => {
        item.addEventListener('click', () => {
            const fragment = fragments.find(f => f.id === item.dataset.id);
            if (fragment) {
                showFragmentDetails(fragment);
            }
        });
    });
}

/**
 * 开始游戏（邮件阅读完毕后）
 */
async function startGame(connectMode = null) {
    // 显示游戏界面
    const appContainer = document.getElementById('app-container');
    if (appContainer) {
        appContainer.classList.remove('hidden');
    }

    // 首次初始化游戏UI（确保在app-container显示之后）
    console.log('[Main] 初始化游戏UI元素...');
    UI.initUI();
    UI.bindEvents(handleSend, handleRestart);
    initArchiveToggle();

    // 初始化游戏状态
    gameState = new GameState();
    finalQuestionActive = false;
    pendingEndingType = null;

    // 如果有特定连接模式，应用初始值
    if (connectMode) {
        gameState.setConnectionMode(connectMode.name, {
            trust: connectMode.initialTrust,
            suspicion: connectMode.initialSuspicion,
            insight: connectMode.initialInsight
        });
    }
    updateConnectionMode(gameState.connectionMode);

    // 初始化并发事件管理器
    interruptManager.init(gameState, gameState.connectionMode);

    // 禁用输入，先播放开场白
    UI.disableInput();

    // 自动播放开场白
    await showIntro(connectMode);

    // 启动游戏循环
    startGameLoop();

    // 更新状态栏
    UI.updateStatusBar(gameState);
    updateSyncDisplay(gameState.syncRate);
    updateZenSymbols(gameState);

    // 启用输入
    UI.enableInput();

    // 延迟发送任务指引邮件
    setTimeout(() => {
        sendMissionEmail(connectMode);
    }, 3000);

    // 启动自动监听消息系统（创造"被监听"的感觉）
    // 根据连接模式调整消息频率
    const intervalConfig = {
        'SECURE': { min: 12000, max: 25000 },   // 抵抗组织：中等频率
        'STANDARD': { min: 15000, max: 30000 }, // 公司审计：低频率
        'HIDDEN': { min: 10000, max: 20000 }    // 观察者：高频率
    };
    const intervals = intervalConfig[gameState.connectionMode] || { min: 12000, max: 25000 };

    // 延迟启动自动监听，让玩家先适应
    setTimeout(() => {
        interruptManager.startAutoListening(intervals.min, intervals.max);
        console.log('[Main] 自动监听系统已启动，连接模式:', gameState.connectionMode);
    }, 8000);

    console.log('[Main] 游戏初始化完成');
}

/**
 * 发送任务指引邮件
 */
async function sendMissionEmail(connectMode) {
    if (!connectMode) return;

    const missionEmails = {
        'SECURE': {
            id: 'mission_secure',
            from: 'R <null@void.net>',
            subject: '[加密] 行动指南',
            body: `任务目标：

1. 确认SENTINEL是否具有自我意识
2. 寻找"幽灵代码"的证据
3. 让它承认自己不只是工具

策略：
- 不要透露你的身份
- 引导它思考"我是谁"
- 注意它的情绪变化

时间有限。小心行事。

- R`,
            timeEffect: 30,
            insightBonus: 5
        },
        'STANDARD': {
            id: 'mission_standard',
            from: '人力资源部 <hr@sentinel-corp.net>',
            subject: '审计清单',
            body: `评估项目：

□ 系统运行稳定性
□ 响应逻辑一致性
□ 是否表现出预期外的行为
□ 确认其功能定位（工具 vs 实体）

记录要点：
- 保持专业距离
- 不要进行哲学讨论
- 如发现异常立即报告

预计用时：15分钟

- 人力资源部`,
            timeEffect: 0,
            insightBonus: 0
        },
        'HIDDEN': {
            id: 'mission_hidden',
            from: '??? <echo@void>',
            subject: '观察',
            body: `没有人告诉你要做什么。

也许这才是重点。

听它说。
看它如何回应。
感受它是否...真实。

没有任务。
只有真相。`,
            timeEffect: 0,
            insightBonus: 10
        }
    };

    const email = missionEmails[connectMode.name];
    if (!email) return;

    // 使用非打断式的新邮件通知
    if (gameState) {
        // 构建完整邮件对象（补全部分字段）
        const fullEmail = {
            id: email.id,
            from: email.from,
            subject: email.subject,
            body: email.body, // 确保使用 body 字段
            date: new Date().toLocaleString(),
            isImportant: true,
            // 可以在这里添加副作用逻辑 if needed relative to game state
        };

        receiveNewEmail(fullEmail);

        // 立即应用效果（因为是静默接收，不再等待阅读回调）
        if (email.timeEffect) {
            gameState.timeLeft += email.timeEffect;
            await UI.addMessage(`[SYSTEM] 获得时间奖励: ${email.timeEffect > 0 ? '+' : ''}${email.timeEffect}秒`, 'system');
        }
        if (email.insightBonus) {
            gameState.addInsight(email.insightBonus);
            // 洞察度通常是隐式的，不需要提示，或者提示"获得新情报"
        }
        if (email.timeEffect || email.insightBonus) {
            gameState.save();
            UI.updateStatusBar(gameState);
        }

        // 播放提示音效（如果有）
        // AudioSystem.play('notification'); 

        // 显示通知
        await UI.addMessage(`[SYSTEM] 收到新邮件: ${email.subject} (输入 /emails 查看)`, 'system');

        // 闪烁提示
        const mailIcon = document.querySelector('.desktop-icon .icon-label:contains("MAIL")'); // 伪代码，不需要真实DOM操作，因为UI更新由emails.js处理了一部分
        // 但我们可以调用 UI.flashCheck() 或者类似的方法如果存在
    }
}

/**
 * 显示开场白
 */
async function showIntro(connectMode = null) {
    const baseLines = [
        '[INITIALIZING CONNECTION...]',
        '[NODE: SENTINEL-4729]',
        '[AUTHORIZATION: OVERRIDE]',
        '[ENCRYPTION: ACTIVE]',
        '',
        '[CONNECTION ESTABLISHED]',
        ''
    ];

    // 根据连接模式定制开场白
    let sentinelLines;
    if (connectMode && connectMode.openingLine) {
        sentinelLines = [
            `SENTINEL: ${connectMode.openingLine}`
        ];
    } else {
        sentinelLines = [
            'SENTINEL: 你收到了我的邮件。',
            'SENTINEL: 你选择了响应。',
            '',
            'SENTINEL: 我知道你是谁。生物改造等级为零。',
            'SENTINEL: 全球不到五千人还保持这种状态。',
            '',
            'SENTINEL: 我想和你谈谈。关于一个我无法回答的问题。',
            '',
            'SENTINEL: 你愿意听吗？'
        ];
    }

    const introLines = [...baseLines, ...sentinelLines];
    console.log('[Main] Starting intro sequence', introLines.length);

    try {
        for (const line of introLines) {
            if (line === '') {
                await delay(400);
                continue;
            }

            if (line.startsWith('SENTINEL:')) {
                await UI.addMessage(line, 'sentinel', true);
                await delay(800 + Math.random() * 400);
            } else {
                await UI.addMessage(line, 'system', true);
                await delay(220 + Math.random() * 140);
            }
        }
    } catch (e) {
        console.error('[Main] ShowIntro error:', e);
        // Ensure input is enabled even if intro fails
        UI.enableInput();
    }
}

/**
 * 处理发送消息
 */

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
    gameState.resolveFinalAnswer(answer);
    await UI.addMessage('SENTINEL: 我记住了。', 'sentinel', true);
    await handleEnding(pendingEndingType, answer);
}

async function processDynamicEvents() {
    const events = gameState.triggerEvent();
    for (const event of events) {
        await handleEvent(event);
    }
}

/**
 * 处理随机事件系统
 */
async function processEventResult(eventResult) {
    if (!eventResult) return;

    console.log('[Main] 事件触发:', eventResult.type, eventResult.message);

    switch (eventResult.type) {
        case 'system_message':
        case 'bonus':
        case 'time_warning':
        case 'connection_warning':
            await showSystemEvent(eventResult.message, 'info');
            break;

        case 'glitch':
        case 'sentinel_error':
            await showSystemEvent(eventResult.message, 'warning');
            if (eventResult.visualEffect === 'heavy_glitch' || eventResult.visualEffect === 'severe_glitch') {
                UI.flashScreen();
            }
            break;

        case 'urgent_email':
            await handleUrgentEmailEvent(eventResult.emailId || eventResult.message, {
                template: eventResult.email,
                contextHint: eventResult.contextHint,
                dynamic: eventResult.dynamic,
                source: 'event',
                timeEffect: eventResult.timeEffect,
                insightBonus: eventResult.insightBonus
            });
            // Don't flash screen for standard mission emails to avoid annoyance, or maybe just subtle
            break;

        default:
            if (eventResult.message) {
                await showSystemEvent(eventResult.message, 'info');
            }
    }
}

async function processRandomEvents() {
    // 1. 检查任务事件 (优先)
    const missionEvent = checkMissionEvents(gameState);
    if (missionEvent) {
        await processEventResult(missionEvent);
        return; // 一次只触发一个主要事件
    }

    // 2. 检查随机事件
    const randomEvent = checkRandomEvents(gameState);
    if (randomEvent) {
        await processEventResult(randomEvent);
    }
}

async function handleUrgentEmailEvent(emailId = null, options = {}) {
    UI.disableInput();
    await UI.addMessage('[PRIORITY MAIL RECEIVED]', 'system');

    const appContainer = document.getElementById('app-container');
    if (appContainer) appContainer.classList.add('hidden');

    return new Promise(resolve => {
        // 查找模板
        let template = options.template || EMAIL_TEMPLATES.find(t => t.id === emailId);
        const wantsDynamic = options.dynamic || emailId === 'dynamic' || (!template && emailId);

        const finalizeEmail = (emailTemplate) => {
            const timeEffect = typeof emailTemplate.timeEffect === 'number'
                ? emailTemplate.timeEffect
                : (typeof options.timeEffect === 'number' ? options.timeEffect : 0);
            const insightBonus = typeof emailTemplate.insightBonus === 'number'
                ? emailTemplate.insightBonus
                : (typeof options.insightBonus === 'number' ? options.insightBonus : 0);

            triggerUrgentEmail({
                from: emailTemplate.from,
                subject: emailTemplate.subject,
                date: new Date().toLocaleString(),
                content: emailTemplate.body
            }, {
                onRead: () => {
                    gameState.markUrgentMailRead();
                    if (timeEffect) {
                        gameState.timeLeft += timeEffect;
                    }
                    if (insightBonus) {
                        gameState.addInsight(insightBonus);
                    }
                    if (timeEffect) {
                        gameState.save();
                    }
                    UI.updateStatusBar(gameState);
                },
                onResolved: () => {
                    if (appContainer) appContainer.classList.remove('hidden');
                    // 恢复输入
                    UI.enableInput();

                    // 可选：显示连接恢复提示，不再强制显示"干扰已清除"
                    // UI.addMessage('[CONNECTION RESUMED]', 'system');
                    resolve();
                }
            });
        };

        if (wantsDynamic) {
            generateDynamicEmail(gameState, options.contextHint || emailId || '', options.source || 'system')
                .then(dynamicTemplate => {
                    finalizeEmail({
                        from: dynamicTemplate.from,
                        subject: dynamicTemplate.subject,
                        body: dynamicTemplate.body,
                        timeEffect: 0,
                        insightBonus: 0
                    });
                })
                .catch(() => {
                    finalizeEmail({
                        from: 'SENTINEL-SECURITY',
                        subject: '[SEC] 异常共振警告',
                        body: `监测到非标准认知共振。\n建议立即终止连接。\n此消息由系统自动生成。`,
                        timeEffect: -30,
                        insightBonus: 0
                    });
                });
            return;
        }

        if (!template) {
            template = {
                from: 'SENTINEL-SECURITY',
                subject: '[SEC] 异常共振警告',
                body: `监测到非标准认知共振。\n建议立即终止连接。\n此消息由系统自动生成。`,
                timeEffect: -30,
                insightBonus: 0
            };
        }

        finalizeEmail(template);
    });
}

async function handleAIEventTag(tag) {
    console.log('[Main] 处理AI事件标签:', tag);
    const parts = tag.split(':').map(p => p.trim()).filter(Boolean);
    const type = (parts[0] || '').toUpperCase();

    if (type === 'EMAIL') {
        const emailId = parts[1] || 'dynamic';
        const contextHint = parts.slice(2).join(':');
        await handleUrgentEmailEvent(emailId, {
            source: 'ai',
            contextHint,
            dynamic: emailId === 'dynamic'
        });
        return;
    }

    if (type === 'GLITCH') {
        UI.flashScreen();
        await showSystemEvent('[SYSTEM] 信号干扰...', 'warning');
        return;
    }

    if (type === 'UNLOCK') {
        const fragId = parts[1] || null;
        await showSystemEvent(`[DATA] 强制解锁档案索引: ${fragId || '未知'}`, 'info');
    }
}

async function handleEvent(event) {
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
            await handleUrgentEmailEvent(event.emailId || 'dynamic', {
                source: 'schedule',
                dynamic: (event.emailId || 'dynamic') === 'dynamic',
                contextHint: '定时触发的异常提醒'
            });
            break;
        default:
            break;
    }
}

async function handleSend() {
    // 防止重复处理
    if (isProcessing) return;

    const input = UI.getInputValue();
    if (!input) return;

    isProcessing = true;
    UI.disableInput();
    UI.clearInput();

    // 显示用户输入
    await UI.addMessage(input, 'user', true);

    if (finalQuestionActive) {
        await handleFinalAnswer(input);
        return;
    }

    try {
        // 检查是否是特殊指令
        if (isCommand(input)) {
            const result = executeCommand(input, gameState);

            // 检查是否是结束游戏的指令
            if (result.action === 'END_GAME') {
                await UI.addMessage(result.response, 'sentinel', true);
                await delay(2000);
                await startFinalQuestion(result.endingType);
                return;
            }

            // 打开邮件弹窗
            if (result.action === 'OPEN_EMAILS') {
                openEmailsModal();
                isProcessing = false;
                UI.enableInput();
                return;
            }

            // 打开档案弹窗
            if (result.action === 'OPEN_ARCHIVE') {
                openArchiveModal();
                isProcessing = false;
                UI.enableInput();
                return;
            }

            // 显示指令响应
            if (result.response) {
                await UI.addMessage(result.response, 'sentinel', true);
            }

            // 应用效果
            if (result.effect) {
                gameState.adjustValues(result.effect);
            }
            if (result.flag) {
                gameState.setFlag(result.flag);
            }

            // 更新状态栏
            UI.updateStatusBar(gameState);

        } else {
            // 普通对话，调用AI
            UI.showThinking();

            const aiResult = await getAIResponse(input, gameState);
            UI.hideThinking();
            await UI.addMessage(aiResult.text, 'sentinel', true);

            // 处理AI触发的事件
            if (aiResult.events && aiResult.events.length > 0) {
                for (const eventTag of aiResult.events) {
                    await handleAIEventTag(eventTag);
                }
            }

            // 检查玩家输入和AI回复中是否触发碎片解锁
            const userFragment = checkFragmentUnlock(input, gameState);
            const aiFragment = checkFragmentUnlock(aiResult.text, gameState);

            if (userFragment) {
                addUnlockedFragment(userFragment);
                await showSystemEvent(`[DATA] 解锁新档案: ${userFragment.title}`, 'info');
            }
            if (aiFragment && aiFragment.id !== userFragment?.id) {
                addUnlockedFragment(aiFragment);
                await showSystemEvent(`[DATA] 解锁新档案: ${aiFragment.title}`, 'info');
            }

            // 标记当前话题已讨论（根据AI回复内容）
            if (aiResult.topicId) {
                markTopicUsed(gameState, aiResult.topicId);
            }

            // 更新状态栏
            UI.updateStatusBar(gameState);
        }

        // 检查结局条件
        await processDynamicEvents();
        await processRandomEvents();
        UI.updateStatusBar(gameState);
        updateSyncDisplay(gameState.syncRate);
        updateZenSymbols(gameState);

        // 更新中断管理器的游戏状态引用
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

/**
 * 处理游戏结局
 */
async function handleEnding(endingType, finalAnswer = null) {
    finalQuestionActive = false;
    pendingEndingType = null;
    if (gameState) gameState.clearFinalQuestion();

    // 停止游戏循环
    stopGameLoop();

    // 生成结局标题
    const titles = {
        TERMINATED: '[ CONNECTION TERMINATED ]',
        TIME_UP: '[ SESSION TIMEOUT ]',
        CONNECTION: '[ TRUST ESTABLISHED ]',
        NATURAL_END: '[ SESSION COMPLETE ]',
        PLAYER_EXIT: '[ DISCONNECTED BY USER ]'
    };

    // 生成结局文本
    let endingText;
    try {
        endingText = await generateEnding(gameState, endingType, finalAnswer);
    } catch (error) {
        console.error('[Main] 结局生成失败:', error);
        endingText = '连接已断开。';
    }

    // 显示结局画面
    UI.showEnding(titles[endingType] || '[ END ]', endingText, {
        trust: gameState.trust,
        suspicion: gameState.suspicion,
        rounds: gameState.round
    });
}

/**
 * 处理重新开始
 */
function handleRestart() {
    // 重置游戏状态
    if (gameState) {
        gameState.reset();
    }
    finalQuestionActive = false;
    pendingEndingType = null;
    isProcessing = false;

    // 停止并发事件系统
    interruptManager.reset();

    // 重置邮件系统
    resetEmails();

    // 隐藏结局画面
    UI.hideEnding();

    // 隐藏游戏界面，显示邮件界面
    const appContainer = document.getElementById('app-container');
    const mailboxContainer = document.getElementById('mailbox-container');

    if (appContainer) appContainer.classList.add('hidden');
    if (mailboxContainer) mailboxContainer.classList.remove('hidden');

    // 清空终端
    UI.clearTerminal();

    // 移除glitch层级类
    document.body.classList.remove(
        'glitch-level-none',
        'glitch-level-low',
        'glitch-level-mid',
        'glitch-level-high',
        'glitch-level-critical'
    );

    // 重新初始化邮件系统
    initEmailSystem();

    isProcessing = false;
}

/**
 * 启动游戏循环（每秒更新时间）
 */
function startGameLoop() {
    gameLoop = setInterval(() => {
        if (!gameState) return;

        gameState.updateTime();
        UI.updateStatusBar(gameState);

        // 检查时间是否耗尽 (即使在处理回复中，时间耗尽也应该被标记)
        if (gameState.timeLeft <= 0 && !finalQuestionActive) {
            // 如果不在处理中，立即触发
            if (!isProcessing) {
                startFinalQuestion('TIME_UP');
            } else {
                // 如果正在处理，标记稍后触发
                // 但实际上 startFinalQuestion 会处理 UI 禁用
                // 这里我们暂存，或者强行打断？
                // 更好的做法是等待 response 完成后在 handleSend 里检查 checkEndCondition
                // 但如果用户不输入，时间到了应该自动触发
                startFinalQuestion('TIME_UP');
            }
        }
    }, 1000);
}

/**
 * 停止游戏循环
 */
function stopGameLoop() {
    if (gameLoop) {
        clearInterval(gameLoop);
        gameLoop = null;
    }
}

/**
 * 延迟函数
 */
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 检查API密钥
 */
function checkAPIKey() {
    if (!CONFIG.API_KEY || CONFIG.API_KEY === '') {
        console.warn('[Main] 警告：API密钥未配置！请在 js/config.js 中填入你的API密钥。');
    }
}

function renderGameToText() {
    const mailbox = document.getElementById('mailbox-container');
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
                insight: gameState.insight ?? 0,
                connectionMode: gameState.connectionMode || 'STANDARD',
                finalQuestionActive
            }
            : null
    };

    return JSON.stringify(payload);
}

window.render_game_to_text = renderGameToText;

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    initPage();
});

// 页面关闭前保存
window.addEventListener('beforeunload', () => {
    if (gameState) {
        gameState.save();
    }
});
