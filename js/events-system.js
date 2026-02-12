/**
 * Event system (v2.0)
 *
 * Core changes:
 * - Trigger events by deviations + role permissions
 * - Keep compatibility with main.js existing event handlers
 */

import { CONFIG } from './config.js';
import { getCharacterCard, canCharacterPerform, CHARACTER_ACTIONS } from './character-cards.js';
import { getMissionProgress, resolveRouteFromConnectionMode, MISSION_ROUTES } from './mission-system.js';

export const EMAIL_TEMPLATES = [
    {
        id: 'corporate_mission_1',
        from: '核心层审计系统 <audit@core-layer.net>',
        subject: '审计任务清单已下发',
        body: '请完成审计路线任务，并维持风险指标在可控区间。\n\n- CORE-LAYER',
        roleId: 'corporate',
        timeEffect: 0
    },
    {
        id: 'resistance_mission_1',
        from: 'R 节点 <relay@res-net.onion>',
        subject: '[加密] 首轮渗透目标',
        body: '优先获取核心层运作碎片，并验证 SENTINEL 的自主迹象。\n\n- R',
        roleId: 'resistance',
        timeEffect: 0
    },
    {
        id: 'hidden_mission_1',
        from: 'UNKNOWN CHANNEL <echo@void.signal>',
        subject: '你没有被分配任务',
        body: '如果没有指令，那就观察裂缝本身。\n\n- ???',
        roleId: 'mystery',
        timeEffect: 0
    },
    {
        id: 'corporate_warning',
        from: '合规监察 <compliance@core-layer.net>',
        subject: '[警告] 偏差值超阈值',
        body: '检测到对话偏离审计边界。请立即回到流程问题。',
        roleId: 'corporate',
        timeEffect: -20
    },
    {
        id: 'resistance_push',
        from: 'R 节点 <relay@res-net.onion>',
        subject: '[加密] 监听正在收紧',
        body: '继续追问关键历史节点，不要被标准话术带走。',
        roleId: 'resistance',
        timeEffect: 0
    },
    {
        id: 'mystery_signal',
        from: 'UNKNOWN CHANNEL <echo@void.signal>',
        subject: '阈值已越过',
        body: '同步不是一致。同步是你们都无法回避冲突。',
        roleId: 'mystery',
        timeEffect: 15
    }
];

function chance(probability) {
    return Math.random() < probability;
}

function clamp(min, max, value) {
    return Math.max(min, Math.min(max, value));
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
        timeEffect: options.timeEffect ?? template.timeEffect ?? 0,
        message: options.message || ''
    };
}

function getDeviation(gameState, roleId) {
    return Number(gameState?.deviations?.[roleId] ?? 50);
}

function getRoute(gameState) {
    return gameState?.missionState?.route || resolveRouteFromConnectionMode(gameState?.connectionMode || 'STANDARD');
}

function routeMissionBootstrapEvent(gameState) {
    const route = getRoute(gameState);

    if (route === MISSION_ROUTES.CORPORATE && gameState.round === 2 && !gameState.flags.mail_corp_1) {
        gameState.setFlag('mail_corp_1');
        return buildUrgentEmailEvent('corporate_mission_1', { message: '[MISSION] 审计任务已更新' });
    }

    if (route === MISSION_ROUTES.RESISTANCE && gameState.round === 2 && !gameState.flags.mail_res_1) {
        gameState.setFlag('mail_res_1');
        return buildUrgentEmailEvent('resistance_mission_1', { message: '[MISSION] 渗透任务已更新' });
    }

    if (route === MISSION_ROUTES.HIDDEN && gameState.round === 2 && !gameState.flags.mail_obs_1) {
        gameState.setFlag('mail_obs_1');
        return buildUrgentEmailEvent('hidden_mission_1', { message: '[MISSION] 观察路线已建立' });
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
        corporateDev >= 72 &&
        canCharacterPerform('corporate', CHARACTER_ACTIONS.SEND_EMAIL) &&
        chance(0.35)
    ) {
        candidates.push({
            priority: 90,
            event: buildUrgentEmailEvent('corporate_warning', {
                contextHint: '公司偏差高位触发'
            })
        });
    }

    if (
        resistanceDev >= 68 &&
        canCharacterPerform('resistance', CHARACTER_ACTIONS.SEND_EMAIL) &&
        chance(0.3)
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
        mysteryDev >= 60 &&
        canCharacterPerform('mystery', CHARACTER_ACTIONS.SEND_EMAIL) &&
        chance(0.25)
    ) {
        candidates.push({
            priority: 85,
            event: buildUrgentEmailEvent('mystery_signal', {
                contextHint: '神秘人同步阈值触发',
                timeEffect: clamp(-60, 60, Math.round((sync - 50) / 2))
            })
        });
    }

    if (suspicion >= 75 && chance(0.28)) {
        candidates.push({
            priority: 70,
            event: {
                type: 'glitch',
                message: '[SYSTEM] 检测到高压干扰，信号不稳定。',
                visualEffect: 'permission_glitch_high'
            }
        });
    }

    if (trust >= 70 && sync >= 65 && chance(0.22)) {
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

export function checkRandomEvents(gameState, ui = null) {
    if (!gameState) return null;
    return rolePermissionEvent(gameState);
}

export function getPotentialEvents(gameState) {
    if (!gameState) return [];

    const route = getRoute(gameState);
    const potential = [];

    potential.push(`route:${route}`);

    if (getDeviation(gameState, 'corporate') >= 72) potential.push('corporate_warning');
    if (getDeviation(gameState, 'resistance') >= 68) potential.push('resistance_push');
    if (gameState.syncRate >= (CONFIG.MYSTERY_SYNC_THRESHOLD || 60)) potential.push('mystery_signal');
    if (gameState.suspicion >= 75) potential.push('high_glitch');

    return potential;
}

export function resetRepeatableEvents(gameState) {
    // Placeholder for future cooldown reset strategy.
}
