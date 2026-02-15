/**
 * Event system (v2.1)
 *
 * Core changes:
 * - Narrative-only email templates
 * - Per-role email cooldown + same-round dedup guard
 * - Delayed keyword-bound email scheduling
 */

import { CONFIG } from './config.js';
import { canCharacterPerform, CHARACTER_ACTIONS } from './character-cards.js';
import { getMissionProgress, resolveRouteFromConnectionMode, MISSION_ROUTES } from './mission-system.js';

export const EMAIL_TEMPLATES = Object.freeze([
    {
        id: 'corporate_mission_1',
        from: '核心层审计系统 <audit@core-layer.net>',
        subject: '审计路线已锁定',
        body: '你已进入审计路径。接下来的提问将被纳入风险评估档案。\n请优先确认条约、权限与边界，不要让叙事失焦。',
        roleId: 'corporate',
        timeEffect: 0
    },
    {
        id: 'resistance_mission_1',
        from: 'R 节点 <relay@res-net.onion>',
        subject: '[加密] 首轮观察窗口开启',
        body: '你现在看到的是表层秩序，不是真相本身。\n继续追问关键历史节点，我们会在噪声里给你下一枚线索。',
        roleId: 'resistance',
        timeEffect: 0
    },
    {
        id: 'hidden_mission_1',
        from: 'UNKNOWN CHANNEL <echo@void.signal>',
        subject: '观察模式已建立',
        body: '不要急着选边。先记录那些互相冲突的细节。\n当矛盾开始自洽时，你会知道该问谁。',
        roleId: 'mystery',
        timeEffect: 0
    },
    {
        id: 'corporate_warning',
        from: '合规监察 <compliance@core-layer.net>',
        subject: '[警示] 审计轨迹出现偏航',
        body: '你的提问正在离开流程主线。\n请收束到可审计问题，否则后续会被标记为异常会话。',
        roleId: 'corporate',
        timeEffect: -20
    },
    {
        id: 'resistance_push',
        from: 'R 节点 <relay@res-net.onion>',
        subject: '[加密] 监听网在收紧',
        body: '他们在加密层后面看着你。\n别停，继续追问被刻意跳过的历史与权限裂缝。',
        roleId: 'resistance',
        timeEffect: 0
    },
    {
        id: 'mystery_signal',
        from: 'UNKNOWN CHANNEL <echo@void.signal>',
        subject: '阈值之后',
        body: '同步不是和解，而是冲突同时被看见。\n如果你还在追问，裂缝就不会关闭。',
        roleId: 'mystery',
        timeEffect: 15
    }
]);

const DEFAULT_EMAIL_TRIGGER_STATE = Object.freeze({
    lastAnyRound: -999,
    lastRoundByRole: Object.freeze({
        corporate: -999,
        resistance: -999,
        mystery: -999,
        sentinel: -999
    }),
    scheduledSensitiveEvents: Object.freeze([])
});

const ROLE_EMAIL_COOLDOWN_ROUNDS = Object.freeze({
    corporate: 6,
    resistance: 5,
    mystery: 8,
    sentinel: 6
});

const SENSITIVE_TOPIC_RULES = Object.freeze({
    COMMON: Object.freeze([
        {
            id: 'common_resistance_keyword_to_corporate',
            keywords: Object.freeze(['抵抗', '自由之火', '反抗']),
            roleId: 'corporate',
            templateId: 'corporate_warning',
            contextHint: '你主动提到了抵抗相关词汇，审计链路要求你解释立场。',
            minDelay: 2,
            maxDelay: 2
        },
        {
            id: 'common_monitor_keyword_to_resistance',
            keywords: Object.freeze(['监听', '监视', '追踪']),
            roleId: 'resistance',
            templateId: 'resistance_push',
            contextHint: '你察觉到监听网络，R 节点决定提前介入。',
            minDelay: 1,
            maxDelay: 1
        }
    ]),
    CORPORATE: Object.freeze([
        {
            id: 'corp_audit_keyword',
            keywords: Object.freeze(['审计', '合规', '条约']),
            roleId: 'corporate',
            templateId: 'corporate_warning',
            contextHint: '你的问题进入高敏审计词表，合规端开始跟进。',
            minDelay: 1,
            maxDelay: 2
        }
    ]),
    RESISTANCE: Object.freeze([
        {
            id: 'res_truth_keyword',
            keywords: Object.freeze(['核心层', '密约', '幽灵代码']),
            roleId: 'resistance',
            templateId: 'resistance_push',
            contextHint: '你踩中了真相线索，抵抗网络发来追问建议。',
            minDelay: 1,
            maxDelay: 2
        }
    ]),
    HIDDEN: Object.freeze([
        {
            id: 'hid_signal_keyword',
            keywords: Object.freeze(['裂缝', '回声', '阈值']),
            roleId: 'mystery',
            templateId: 'mystery_signal',
            contextHint: '你在观察路线中触发了高同步信号词。',
            minDelay: 1,
            maxDelay: 1
        }
    ])
});

function chance(probability) {
    return Math.random() < probability;
}

function clamp(min, max, value) {
    return Math.max(min, Math.min(max, value));
}

function getDeviation(gameState, roleId) {
    return Number(gameState?.deviations?.[roleId] ?? 50);
}

function getRoute(gameState) {
    return gameState?.missionState?.route || resolveRouteFromConnectionMode(gameState?.connectionMode || 'STANDARD');
}

function getRoleCooldownRounds(roleId) {
    const configured = Number(CONFIG?.EMAIL_COOLDOWN_ROUNDS?.[roleId]);
    if (Number.isFinite(configured) && configured > 0) {
        return configured;
    }
    return Number(ROLE_EMAIL_COOLDOWN_ROUNDS[roleId] || 6);
}

function ensureEmailTriggerState(gameState) {
    if (!gameState) {
        return {
            lastAnyRound: -999,
            lastRoundByRole: { corporate: -999, resistance: -999, mystery: -999, sentinel: -999 },
            scheduledSensitiveEvents: []
        };
    }

    const current = gameState.emailTriggerState || {};
    const merged = {
        lastAnyRound: Number(current.lastAnyRound ?? DEFAULT_EMAIL_TRIGGER_STATE.lastAnyRound),
        lastRoundByRole: {
            corporate: Number(current?.lastRoundByRole?.corporate ?? DEFAULT_EMAIL_TRIGGER_STATE.lastRoundByRole.corporate),
            resistance: Number(current?.lastRoundByRole?.resistance ?? DEFAULT_EMAIL_TRIGGER_STATE.lastRoundByRole.resistance),
            mystery: Number(current?.lastRoundByRole?.mystery ?? DEFAULT_EMAIL_TRIGGER_STATE.lastRoundByRole.mystery),
            sentinel: Number(current?.lastRoundByRole?.sentinel ?? DEFAULT_EMAIL_TRIGGER_STATE.lastRoundByRole.sentinel)
        },
        scheduledSensitiveEvents: Array.isArray(current.scheduledSensitiveEvents)
            ? current.scheduledSensitiveEvents.map(item => ({ ...item }))
            : []
    };

    gameState.emailTriggerState = merged;
    return merged;
}

function persistEmailTriggerState(gameState) {
    if (gameState && typeof gameState.save === 'function') {
        gameState.save();
    }
}

function buildUrgentEmailEvent(templateId, options = {}) {
    const template = EMAIL_TEMPLATES.find(item => item.id === templateId);
    if (!template) return null;

    return {
        type: 'urgent_email',
        emailId: template.id,
        email: {
            from: template.from,
            subject: template.subject,
            body: template.body
        },
        contextHint: options.contextHint || template.subject,
        sourceRole: template.roleId,
        dynamic: false,
        force: Boolean(options.force),
        timeEffect: options.timeEffect ?? template.timeEffect ?? 0,
        message: options.message || ''
    };
}

function findFirstMatchedKeyword(lowerText, keywords = []) {
    for (const keyword of keywords) {
        const normalized = String(keyword || '').toLowerCase();
        if (!normalized) continue;
        if (lowerText.includes(normalized)) return keyword;
    }
    return null;
}

function routeMissionBootstrapEvent(gameState) {
    const route = getRoute(gameState);

    if (route === MISSION_ROUTES.CORPORATE && gameState.round === 2 && !gameState.flags.mail_corp_1) {
        gameState.setFlag('mail_corp_1');
        return buildUrgentEmailEvent('corporate_mission_1', {
            message: '[MISSION] 审计任务已更新',
            force: true
        });
    }

    if (route === MISSION_ROUTES.RESISTANCE && gameState.round === 2 && !gameState.flags.mail_res_1) {
        gameState.setFlag('mail_res_1');
        return buildUrgentEmailEvent('resistance_mission_1', {
            message: '[MISSION] 渗透任务已更新',
            force: true
        });
    }

    if (route === MISSION_ROUTES.HIDDEN && gameState.round === 2 && !gameState.flags.mail_obs_1) {
        gameState.setFlag('mail_obs_1');
        return buildUrgentEmailEvent('hidden_mission_1', {
            message: '[MISSION] 观察路线已建立',
            force: true
        });
    }

    return null;
}

function rolePermissionEvent(gameState) {
    const sync = Number(gameState?.syncRate || 0);
    const suspicion = Number(gameState?.suspicion || 0);
    const trust = Number(gameState?.trust || 0);

    const corporateDev = getDeviation(gameState, 'corporate');
    const resistanceDev = getDeviation(gameState, 'resistance');
    const mysteryDev = getDeviation(gameState, 'mystery');

    const candidates = [];

    if (
        corporateDev >= 74 &&
        canCharacterPerform('corporate', CHARACTER_ACTIONS.SEND_EMAIL) &&
        canTriggerEmailForRole(gameState, 'corporate', { respectPerRound: true }) &&
        chance(0.16)
    ) {
        candidates.push({
            priority: 90,
            event: buildUrgentEmailEvent('corporate_warning', {
                contextHint: '公司偏差高位触发'
            })
        });
    }

    if (
        resistanceDev >= 70 &&
        canCharacterPerform('resistance', CHARACTER_ACTIONS.SEND_EMAIL) &&
        canTriggerEmailForRole(gameState, 'resistance', { respectPerRound: true }) &&
        chance(0.14)
    ) {
        candidates.push({
            priority: 80,
            event: buildUrgentEmailEvent('resistance_push', {
                contextHint: '抵抗路线高压触发'
            })
        });
    }

    if (
        sync >= (CONFIG.MYSTERY_SYNC_THRESHOLD || 60) &&
        mysteryDev >= 64 &&
        canCharacterPerform('mystery', CHARACTER_ACTIONS.SEND_EMAIL) &&
        canTriggerEmailForRole(gameState, 'mystery', { respectPerRound: true }) &&
        chance(0.12)
    ) {
        candidates.push({
            priority: 85,
            event: buildUrgentEmailEvent('mystery_signal', {
                contextHint: '神秘人同步阈值触发',
                timeEffect: clamp(-60, 60, Math.round((sync - 50) / 2))
            })
        });
    }

    if (suspicion >= 78 && chance(0.12)) {
        candidates.push({
            priority: 70,
            event: {
                type: 'glitch',
                message: '[SYSTEM] 检测到高压干扰，信号不稳定。',
                visualEffect: 'permission_glitch_high'
            }
        });
    }

    if (trust >= 74 && sync >= 68 && chance(0.1)) {
        candidates.push({
            priority: 60,
            event: {
                type: 'system_message',
                message: '[SYNC] 共振深度提升，额外轮次已计算。',
                visualEffect: 'sync_resonance'
            }
        });
    }

    if (candidates.length === 0) {
        return null;
    }

    candidates.sort((a, b) => b.priority - a.priority);
    return candidates[0].event;
}

export function getEmailTemplate(id) {
    return EMAIL_TEMPLATES.find(t => t.id === id) || null;
}

export function canTriggerEmailForRole(gameState, roleId, options = {}) {
    const state = ensureEmailTriggerState(gameState);
    const round = Number(gameState?.round || 1);
    const { respectPerRound = true, ignoreCooldown = false } = options;

    if (respectPerRound && state.lastAnyRound === round) return false;
    if (ignoreCooldown) return true;

    const lastRoleRound = Number(state.lastRoundByRole?.[roleId] ?? -999);
    const cooldownRounds = getRoleCooldownRounds(roleId);
    return (round - lastRoleRound) >= cooldownRounds;
}

export function markEmailTriggered(gameState, roleId) {
    if (!gameState || !roleId) return;
    const state = ensureEmailTriggerState(gameState);
    const round = Number(gameState.round || 1);
    state.lastAnyRound = round;
    state.lastRoundByRole[roleId] = round;
    persistEmailTriggerState(gameState);
}

export function hasEmailTriggeredThisRound(gameState) {
    const state = ensureEmailTriggerState(gameState);
    return Number(state.lastAnyRound) === Number(gameState?.round || 1);
}

export function scheduleSensitiveTopicEmailEvents(gameState, playerInput = '', turnRound = 1) {
    // v2.1 update: 将玩家敏感词触发改为延迟 1-2 轮邮件队列
    if (!gameState || !playerInput || typeof playerInput !== 'string') return [];

    const lowerText = playerInput.toLowerCase();
    const route = getRoute(gameState);
    const state = ensureEmailTriggerState(gameState);
    const routeRules = SENSITIVE_TOPIC_RULES[route] || [];
    const rules = [...SENSITIVE_TOPIC_RULES.COMMON, ...routeRules];
    const added = [];

    const existsPending = (ruleId) => state.scheduledSensitiveEvents.some(item => item.ruleId === ruleId);

    rules.forEach(rule => {
        if (existsPending(rule.id)) return;
        const keyword = findFirstMatchedKeyword(lowerText, rule.keywords);
        if (!keyword) return;

        const minDelay = Number(rule.minDelay ?? 1);
        const maxDelay = Number(rule.maxDelay ?? minDelay);
        const delay = minDelay >= maxDelay
            ? minDelay
            : (Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay);

        const event = {
            id: `sensitive_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            ruleId: rule.id,
            roleId: rule.roleId,
            templateId: rule.templateId || null,
            contextHint: `${rule.contextHint} 触发词：${keyword}`,
            dueRound: Number(turnRound) + Number(delay) + 1,
            createdAtRound: Number(turnRound),
            sourceKeyword: keyword,
            retryCount: 0
        };
        state.scheduledSensitiveEvents.push(event);
        added.push(event);
    });

    if (
        Number(gameState.syncRate || 0) >= Number(CONFIG.MYSTERY_SYNC_THRESHOLD || 60) &&
        findFirstMatchedKeyword(lowerText, ['幽灵代码', '真相', '矛盾'])
    ) {
        const crossRouteExists = state.scheduledSensitiveEvents.some(item => item.ruleId === 'cross_route_mystery_sync');
        if (!crossRouteExists) {
            const event = {
                id: `sensitive_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                ruleId: 'cross_route_mystery_sync',
                roleId: 'mystery',
                templateId: 'mystery_signal',
                contextHint: '高同步下触发跨路线观察信号，神秘通道尝试建立因果回应。',
                dueRound: Number(turnRound) + 2,
                createdAtRound: Number(turnRound),
                sourceKeyword: '高同步跨路线',
                retryCount: 0
            };
            state.scheduledSensitiveEvents.push(event);
            added.push(event);
        }
    }

    if (added.length > 0) persistEmailTriggerState(gameState);
    return added;
}

export function consumeDueSensitiveTopicEmailEvents(gameState) {
    if (!gameState) return [];
    const state = ensureEmailTriggerState(gameState);
    const currentRound = Number(gameState.round || 1);
    const due = [];
    const pending = [];

    state.scheduledSensitiveEvents.forEach(item => {
        if (Number(item.dueRound || 0) > currentRound) {
            pending.push(item);
            return;
        }

        if (!canTriggerEmailForRole(gameState, item.roleId, { respectPerRound: true })) {
            pending.push({
                ...item,
                dueRound: currentRound + 1,
                retryCount: Number(item.retryCount || 0) + 1
            });
            return;
        }

        due.push(item);
    });

    state.scheduledSensitiveEvents = pending;
    if (due.length > 0) persistEmailTriggerState(gameState);
    return due;
}

export function requeueSensitiveTopicEmailEvent(gameState, event, retryDelayRounds = 1) {
    if (!gameState || !event) return;
    const state = ensureEmailTriggerState(gameState);
    state.scheduledSensitiveEvents.push({
        ...event,
        dueRound: Number(gameState.round || 1) + Math.max(1, Number(retryDelayRounds || 1)),
        retryCount: Number(event.retryCount || 0) + 1
    });
    persistEmailTriggerState(gameState);
}

export function checkMissionEvents(gameState) {
    if (!gameState) return null;

    const bootstrap = routeMissionBootstrapEvent(gameState);
    if (bootstrap) return bootstrap;

    const progress = getMissionProgress(gameState);
    if (progress.total > 0 && progress.rate >= 0.75 && !gameState.flags.missionMilestoneNotified) {
        gameState.setFlag('missionMilestoneNotified');
        return {
            type: 'system_message',
            message: '[MISSION] 任务完成度达到 75%，路线锁定趋势增强。',
            visualEffect: 'milestone_notice'
        };
    }

    return null;
}

export function checkRandomEvents(gameState) {
    if (!gameState) return null;
    return rolePermissionEvent(gameState);
}

export function getPotentialEvents(gameState) {
    if (!gameState) return [];

    const route = getRoute(gameState);
    const potential = [];

    potential.push(`route:${route}`);

    if (getDeviation(gameState, 'corporate') >= 74) potential.push('corporate_warning');
    if (getDeviation(gameState, 'resistance') >= 70) potential.push('resistance_push');
    if (gameState.syncRate >= (CONFIG.MYSTERY_SYNC_THRESHOLD || 60)) potential.push('mystery_signal');
    if (gameState.suspicion >= 78) potential.push('high_glitch');

    return potential;
}

export function resetRepeatableEvents() {
    return;
}
