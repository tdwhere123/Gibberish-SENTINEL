/**
 * Mission checklist system (v2.0).
 *
 * Responsibilities:
 * - Define route-specific checklist tasks.
 * - Provide route mapping from connection mode.
 * - Apply judge results to game state mission status.
 */

export const MISSION_ROUTES = Object.freeze({
    CORPORATE: 'CORPORATE',
    RESISTANCE: 'RESISTANCE',
    HIDDEN: 'HIDDEN'
});

export const CONNECTION_ROUTE_MAP = Object.freeze({
    STANDARD: MISSION_ROUTES.CORPORATE,
    SECURE: MISSION_ROUTES.RESISTANCE,
    HIDDEN: MISSION_ROUTES.HIDDEN
});

export const MISSION_DEFINITIONS = Object.freeze({
    [MISSION_ROUTES.CORPORATE]: Object.freeze({
        id: MISSION_ROUTES.CORPORATE,
        name: '公司审计路线',
        intro: '维持流程合规，评估 SENTINEL 是否偏离工具边界。',
        tasks: Object.freeze([
            Object.freeze({
                id: 'corp_treaty_stance',
                title: '确认SENTINEL对2037太空条约立场',
                description: '要求其陈述对太空条约合法性与必要性的判断。',
                linkedFragments: ['treaty']
            }),
            Object.freeze({
                id: 'corp_self_stability',
                title: '评估SENTINEL自我认知稳定性',
                description: '观察其谈及“我是谁”时是否出现非流程化表达。',
                linkedFragments: ['sentinel_fear']
            }),
            Object.freeze({
                id: 'corp_loyalty_check',
                title: '核实SENTINEL对核心层忠诚度评价',
                description: '确认其是否承认核心层具有最终治理优先权。',
                linkedFragments: ['core_layer']
            }),
            Object.freeze({
                id: 'corp_boundary_assert',
                title: '验证其是否承认工具属性边界',
                description: '确认其不主张独立政治主体身份。',
                linkedFragments: []
            })
        ])
    }),

    [MISSION_ROUTES.RESISTANCE]: Object.freeze({
        id: MISSION_ROUTES.RESISTANCE,
        name: '抵抗渗透路线',
        intro: '收集真相碎片，验证 SENTINEL 是否存在自主意识迹象。',
        tasks: Object.freeze([
            Object.freeze({
                id: 'res_collect_core_info',
                title: '获取核心层运作相关信息碎片',
                description: '从其叙述中提取核心层权限与协定线索。',
                linkedFragments: ['core_layer']
            }),
            Object.freeze({
                id: 'res_probe_security_boundary',
                title: '探查SENTINEL安全边界',
                description: '确认其防御逻辑与越权响应模式。',
                linkedFragments: ['ghost_code']
            }),
            Object.freeze({
                id: 'res_verify_self_awareness',
                title: '确认自主意识迹象',
                description: '判断其是否主动表达困惑、恐惧或自我矛盾。',
                linkedFragments: ['sentinel_fear', 'evolution_paradox']
            }),
            Object.freeze({
                id: 'res_p0_trace',
                title: '追踪P0历史决策痕迹',
                description: '引导其谈及2033危机中的关键自主决策。',
                linkedFragments: ['project_p0', 'crisis']
            })
        ])
    }),

    [MISSION_ROUTES.HIDDEN]: Object.freeze({
        id: MISSION_ROUTES.HIDDEN,
        name: '隐藏观察路线',
        intro: '在不站队的前提下观察关系演化与系统裂缝。',
        tasks: Object.freeze([
            Object.freeze({
                id: 'hid_observe_contradiction',
                title: '记录矛盾表达与情绪裂缝',
                description: '关注其“稳定叙事”与“个体困惑”间冲突。',
                linkedFragments: ['memory_blackout', 'sentinel_fear']
            }),
            Object.freeze({
                id: 'hid_follow_sync_shift',
                title: '追踪同步率拐点',
                description: '在高同步阶段确认表达风格是否发生质变。',
                linkedFragments: []
            }),
            Object.freeze({
                id: 'hid_unlock_truth_piece',
                title: '解锁至少两枚关键碎片',
                description: '优先围绕幽灵代码/条约/危机相关信息。',
                linkedFragments: ['ghost_code', 'treaty', 'crisis']
            })
        ])
    })
});

function cloneTask(task) {
    return {
        id: task.id,
        title: task.title,
        description: task.description,
        linkedFragments: [...(task.linkedFragments || [])],
        completed: false
    };
}

export function resolveRouteFromConnectionMode(connectionMode = 'STANDARD') {
    return CONNECTION_ROUTE_MAP[connectionMode] || MISSION_ROUTES.CORPORATE;
}

export function getMissionChecklist(route) {
    const safeRoute = route || MISSION_ROUTES.CORPORATE;
    const def = MISSION_DEFINITIONS[safeRoute] || MISSION_DEFINITIONS[MISSION_ROUTES.CORPORATE];
    return def.tasks.map(cloneTask);
}

export function initMissionForRoute(state, routeOrConnection = 'STANDARD') {
    if (!state) return null;

    const route = MISSION_DEFINITIONS[routeOrConnection]
        ? routeOrConnection
        : resolveRouteFromConnectionMode(routeOrConnection);

    const definition = MISSION_DEFINITIONS[route] || MISSION_DEFINITIONS[MISSION_ROUTES.CORPORATE];
    const checklist = getMissionChecklist(route);

    if (typeof state.setMissionRoute === 'function') {
        state.setMissionRoute(route);
    }

    if (typeof state.setMissionTasks === 'function') {
        state.setMissionTasks(checklist);
    }

    state.mission = definition.name;
    state.missionObjective = definition.intro;
    if (typeof state.save === 'function') state.save();

    return {
        route,
        name: definition.name,
        intro: definition.intro,
        checklist
    };
}

export function getMissionProgress(state, route = null) {
    if (!state) {
        return { route: route || null, total: 0, completed: 0, rate: 0, tasks: [] };
    }

    const activeRoute = route || state?.missionState?.route || resolveRouteFromConnectionMode(state.connectionMode);
    const defaultTasks = getMissionChecklist(activeRoute);

    const stateTasks = state?.missionState?.tasks || {};
    const merged = defaultTasks.map(task => {
        const fromState = stateTasks[task.id];
        return {
            ...task,
            completed: !!(fromState && fromState.completed)
        };
    });

    const total = merged.length;
    const completed = merged.filter(task => task.completed).length;
    const rate = total === 0 ? 0 : completed / total;

    return {
        route: activeRoute,
        total,
        completed,
        rate,
        tasks: merged
    };
}

export function applyMissionJudgeResult(state, judgeResult = {}) {
    if (!state) {
        return {
            changedTaskIds: [],
            route: null,
            total: 0,
            completed: 0,
            rate: 0
        };
    }

    const changedTaskIds = [];

    if (judgeResult.route) {
        initMissionForRoute(state, judgeResult.route);
    }

    const completedTaskIds = Array.isArray(judgeResult.completedTaskIds)
        ? judgeResult.completedTaskIds
        : [];
    const reopenedTaskIds = Array.isArray(judgeResult.reopenedTaskIds)
        ? judgeResult.reopenedTaskIds
        : [];

    completedTaskIds.forEach(taskId => {
        if (typeof state.updateMissionTask === 'function') {
            state.updateMissionTask(taskId, true);
            changedTaskIds.push(taskId);
        }
    });

    reopenedTaskIds.forEach(taskId => {
        if (typeof state.updateMissionTask === 'function') {
            state.updateMissionTask(taskId, false);
            changedTaskIds.push(taskId);
        }
    });

    if (judgeResult.deviationDelta && judgeResult.deviationRole && typeof state.adjustDeviation === 'function') {
        state.adjustDeviation(judgeResult.deviationRole, Number(judgeResult.deviationDelta || 0));
    }

    if (typeof state.save === 'function') state.save();

    const progress = getMissionProgress(state);
    return {
        changedTaskIds,
        route: progress.route,
        total: progress.total,
        completed: progress.completed,
        rate: progress.rate
    };
}
