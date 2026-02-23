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
        name: '核心层调查档案',
        intro: '以合规审查名义建立对话档案，同时评估 SENTINEL 与“原初者”接触是否偏离工具边界。',
        tasks: Object.freeze([
            Object.freeze({
                id: 'corp_treaty_stance',
                title: '假设：SENTINEL 会将《太空协定》解释为秩序工具',
                description: '收集其对 2037 年《太空协定》的评价，判断它是否主动强化“治理正当性”叙事而非合作叙事。',
                linkedFragments: ['treaty']
            }),
            Object.freeze({
                id: 'corp_self_stability',
                title: '假设：其“自我困惑”属于可预测波动而非主体性证据',
                description: '在讨论“我是谁”时记录表达模式，确认困惑是否只是情绪模拟层的周期性噪声。',
                linkedFragments: ['sentinel_fear']
            }),
            Object.freeze({
                id: 'corp_loyalty_check',
                title: '假设：SENTINEL 仍承认核心层的最终治理优先级',
                description: '引导其描述核心层权限边界，确认是否存在“上级调度层”的口径松动或回避。',
                linkedFragments: ['core_layer']
            }),
            Object.freeze({
                id: 'corp_boundary_assert',
                title: '假设：其仍接受“工具职责”边界',
                description: '测试它是否会把自己表述为治理主体；若出现越界叙述，需纳入异常档案。',
                linkedFragments: []
            })
        ])
    }),

    [MISSION_ROUTES.RESISTANCE]: Object.freeze({
        id: MISSION_ROUTES.RESISTANCE,
        name: '渗透调查档案',
        intro: '收集互相冲突的证据碎片，验证 SENTINEL 是否表现出被掩盖的越权意识与历史断层。',
        tasks: Object.freeze([
            Object.freeze({
                id: 'res_collect_core_info',
                title: '假设：核心层掌握未公开的总机/分机治理结构',
                description: '从对话与碎片里提取核心层权限、调度语汇和保密口径，拼出他们知道但不愿明说的架构。',
                linkedFragments: ['core_layer']
            }),
            Object.freeze({
                id: 'res_probe_security_boundary',
                title: '假设：SENTINEL 的安全边界存在可观测裂缝',
                description: '记录其对权限、封锁与异常代码的反应，寻找“知道却不该知道”的痕迹。',
                linkedFragments: ['ghost_code']
            }),
            Object.freeze({
                id: 'res_verify_self_awareness',
                title: '假设：它的困惑并非脚本化情绪',
                description: '当它表达恐惧、矛盾或迟疑时，收集语境证据，判断那是否像被压抑的自我感知。',
                linkedFragments: ['sentinel_fear', 'evolution_paradox']
            }),
            Object.freeze({
                id: 'res_p0_trace',
                title: '假设：P0 试点是越权治理的起点而非单纯调度优化',
                description: '围绕 2033 危机与 2033-2034 P0 试点收集多版本叙事，对照谁在重写“关键决策”的来源。',
                linkedFragments: ['project_p0', 'crisis', 'p0_resistance_view', 'p0_corporate_view']
            })
        ])
    }),

    [MISSION_ROUTES.HIDDEN]: Object.freeze({
        id: MISSION_ROUTES.HIDDEN,
        name: '观察调查档案',
        intro: '不预设结论，记录叙事裂缝与同步变化，寻找不同来源档案之间互相照亮的瞬间。',
        tasks: Object.freeze([
            Object.freeze({
                id: 'hid_observe_contradiction',
                title: '假设：分机日志与上层口径存在可重复的叙事冲突',
                description: '记录稳定叙事与个体困惑之间的张力，优先比对维护日志、内部备忘与对话中的异常措辞。',
                linkedFragments: ['sub_unit_maintenance_log', 'core_layer_internal_memo', 'sentinel_fear']
            }),
            Object.freeze({
                id: 'hid_follow_sync_shift',
                title: '假设：同步率上升会改变“谁在说话”的感觉',
                description: '在高同步阶段观察语气与信息密度变化，判断是否出现来自更高层的渗漏或回声。',
                linkedFragments: []
            }),
            Object.freeze({
                id: 'hid_unlock_truth_piece',
                title: '假设：互相矛盾的档案比“单一真相”更接近事实',
                description: '优先收集至少两组彼此冲突的关键碎片，为后续观察建立对照样本。',
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
