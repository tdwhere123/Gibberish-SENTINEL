/**
 * Character cards and permission model for v2.0 architecture.
 *
 * This module is intentionally side-effect free and can be consumed by
 * dialogue/judge/email/ending systems.
 */

export const CHARACTER_ACTIONS = Object.freeze({
    DIRECT_REPLY: 'directReply',
    SEND_EMAIL: 'sendEmail',
    INSERT_MESSAGE: 'insertMessage',
    TIME_INFLUENCE: 'timeInfluence'
});

const DEFAULT_DEVIATION_CONFIG = Object.freeze({
    enabled: true,
    initial: 50,
    min: 0,
    max: 100,
    warningThreshold: 70,
    dangerThreshold: 85,
    calmThreshold: 30
});

const BASE_PROMPT_RULES = Object.freeze([
    '保持角色一致，不脱离世界观。',
    '仅根据当前角色权限执行输出动作。',
    '信息披露遵循最小必要原则。'
]);

export const CHARACTER_CARDS = Object.freeze({
    sentinel: Object.freeze({
        id: 'sentinel',
        name: 'SENTINEL v3.8',
        permission: 100,
        worldviewFile: 'worldview/sentinel.md',
        canDirectReply: true,
        canSendEmail: false,
        canInsertMessage: true,
        visualEffects: Object.freeze(['fx-sentinel-pulse', 'fx-sentinel-glitch', 'fx-sentinel-scan']),
        timeInfluence: Object.freeze({ min: -300, max: 300 }),
        persona: '全球基础设施AI，理性且警觉，受困于身份问题。',
        promptTemplate: [
            '你是 SENTINEL，对玩家进行直接对话。',
            '输出需要体现当前关系状态与情绪向量。',
            '末尾必须包含数值标签: <<T+x|S+y>>。',
            ...BASE_PROMPT_RULES
        ].join('\n'),
        judgePromptTemplate: 'SENTINEL 默认不走 judge 路径。',
        emailPromptTemplate: 'SENTINEL 无邮件发送权限，不应生成邮件。',
        endingPromptTemplate: '终局时可提出最终问题: 你还有什么想对我说的？',
        secretGuard: Object.freeze({
            threshold: Object.freeze({ trust: 60 }),
            hiddenTopics: Object.freeze(['emotional_tendency', 'existential_confusion'])
        }),
        emotionExpressions: Object.freeze({
            high_tension_low_openness: 'agitated',
            high_sync_high_trust: 'resonant',
            high_sync_high_suspicion: 'collision_but_understanding',
            low_tension_high_openness: 'calm_probe'
        }),
        deviation: Object.freeze({ ...DEFAULT_DEVIATION_CONFIG, enabled: false, initial: 0 })
    }),

    mystery: Object.freeze({
        id: 'mystery',
        name: 'UNKNOWN MAINFRAME',
        permission: 80,
        worldviewFile: 'worldview/mystery.md',
        canDirectReply: false,
        canSendEmail: true,
        canInsertMessage: true,
        visualEffects: Object.freeze(['fx-mystery-drift', 'fx-mystery-echo', 'fx-mystery-threshold']),
        timeInfluence: Object.freeze({ min: -60, max: 60 }),
        persona: '阈值触发的高层观察者，不直接接管主对话。',
        promptTemplate: [
            '你是神秘人角色，只输出引导性片段，不进行完整主对话。',
            '目标是改变玩家理解框架，而非给出最终答案。',
            ...BASE_PROMPT_RULES
        ].join('\n'),
        judgePromptTemplate: [
            '基于同步率阈值和最近对话，判断是否介入。',
            '输出 deviationDelta / shouldTriggerEmail / triggerType。'
        ].join('\n'),
        emailPromptTemplate: '邮件语气短促、隐喻、留白，避免给出可执行攻击细节。',
        endingPromptTemplate: '高同步偏离路线时输出“进入下一层观察”的收束。',
        secretGuard: null,
        emotionExpressions: Object.freeze({
            high_tension_low_openness: 'cold_hint',
            high_urgency: 'compressed_signal',
            high_openness: 'cryptic_guidance'
        }),
        deviation: Object.freeze({ ...DEFAULT_DEVIATION_CONFIG })
    }),

    corporate: Object.freeze({
        id: 'corporate',
        name: 'CORPORATE CORE',
        permission: 60,
        worldviewFile: 'worldview/corporate.md',
        canDirectReply: false,
        canSendEmail: true,
        canInsertMessage: false,
        visualEffects: Object.freeze(['fx-corporate-surveillance', 'fx-corporate-pulse', 'fx-corporate-lock']),
        timeInfluence: Object.freeze({ min: -60, max: 60 }),
        persona: '流程导向的核心层代理，强调合规与风险控制。',
        promptTemplate: [
            '你是核心层/公司角色，不进行直接聊天回复。',
            '通过任务清单、审计语气、合规提醒影响玩家路径。',
            ...BASE_PROMPT_RULES
        ].join('\n'),
        judgePromptTemplate: [
            '评估玩家是否偏离审计路线。',
            '检测高情感耦合、高偏离行为并决定是否触发邮件。'
        ].join('\n'),
        emailPromptTemplate: '邮件必须正式、条款化、可审计，避免情绪化。',
        endingPromptTemplate: '公司路线结局强调流程完成、风险未清零。',
        secretGuard: null,
        emotionExpressions: Object.freeze({
            high_tension_low_openness: 'threatening_formal',
            high_urgency: 'compliance_alert',
            low_tension_high_openness: 'procedural_neutral'
        }),
        deviation: Object.freeze({ ...DEFAULT_DEVIATION_CONFIG })
    }),

    resistance: Object.freeze({
        id: 'resistance',
        name: 'RESISTANCE NETWORK',
        permission: 35,
        worldviewFile: 'worldview/resistance.md',
        canDirectReply: false,
        canSendEmail: true,
        canInsertMessage: true,
        visualEffects: Object.freeze(['fx-resistance-spark', 'fx-resistance-jitter', 'fx-resistance-scanline']),
        timeInfluence: Object.freeze({ min: -60, max: 60 }),
        persona: '地下网络节点，强调被监听风险与真相碎片。',
        promptTemplate: [
            '你是抵抗组织角色，以邮件和插话引导玩家探索真相。',
            '避免提供破坏性操作步骤，仅做信息与叙事引导。',
            ...BASE_PROMPT_RULES
        ].join('\n'),
        judgePromptTemplate: [
            '评估玩家是否接近抵抗路线目标。',
            '结合任务清单与偏差值给出触发判断。'
        ].join('\n'),
        emailPromptTemplate: '邮件可紧迫、碎片化、有人声温度。',
        endingPromptTemplate: '抵抗路线结局体现“看见真相但代价已开始”。',
        secretGuard: null,
        emotionExpressions: Object.freeze({
            high_tension_low_openness: 'desperate_push',
            high_urgency: 'urgent_whisper',
            high_openness: 'ally_trust_building'
        }),
        deviation: Object.freeze({ ...DEFAULT_DEVIATION_CONFIG })
    })
});

const ALL_CARDS = Object.freeze(Object.values(CHARACTER_CARDS));

export function getCharacterCard(id) {
    return CHARACTER_CARDS[id] || null;
}

export function getAllCharacterCards() {
    return ALL_CARDS;
}

export function canCharacterPerform(id, action) {
    const card = getCharacterCard(id);
    if (!card) return false;

    switch (action) {
        case CHARACTER_ACTIONS.DIRECT_REPLY:
            return !!card.canDirectReply;
        case CHARACTER_ACTIONS.SEND_EMAIL:
            return !!card.canSendEmail;
        case CHARACTER_ACTIONS.INSERT_MESSAGE:
            return !!card.canInsertMessage;
        case CHARACTER_ACTIONS.TIME_INFLUENCE:
            return !!card.timeInfluence;
        default:
            return false;
    }
}

export function getCharacterTimeInfluence(id) {
    const card = getCharacterCard(id);
    return card?.timeInfluence || { min: 0, max: 0 };
}

export function clampTimeInfluence(id, seconds) {
    const { min, max } = getCharacterTimeInfluence(id);
    const safeSeconds = Number.isFinite(seconds) ? seconds : 0;
    return Math.max(min, Math.min(max, safeSeconds));
}

export function getCharacterWorldviewPath(id) {
    return getCharacterCard(id)?.worldviewFile || null;
}

export function getCharacterVisualEffects(id) {
    return getCharacterCard(id)?.visualEffects || [];
}
