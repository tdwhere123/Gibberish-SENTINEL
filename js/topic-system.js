/**
 * 话题池系统 - 动态叙事推进
 * 替代固定的阶段系统，基于同步率和已讨论话题动态选择下一个话题
 */

import { resolveRouteFromConnectionMode } from './mission-system.js';

// 数据碎片定义
export const DATA_FRAGMENTS = [
    {
        id: 'origin',
        title: '原初者身份',
        content: '全球不足5000人保持完全原始人类形态，被称为“原初者”。他们拒绝神经接口、义体与基因编辑，坚持“不改变”。',
        unlocked: false,
        trigger: ['原初者', '原初', 'primordial', '不改造', '不改变', '原始人类', '神经接口']
    },
    {
        id: 'treaty',
        title: '太空协议 (2037)',
        content: '2037年，各国代表在国际空间站秘密签署《太空协议》，建立全球AI协作框架，SENTINEL由此诞生。这是人类第一次真正意义上的全球共识。',
        unlocked: false,
        trigger: ['协议', '2037', 'treaty', '太空', '太空协议', '国际空间站']
    },
    {
        id: 'crisis',
        title: '海峡危机 (2033)',
        content: '2033年海峡危机几乎引发第三次世界大战。最终，精英层意识到人类无法再依靠自身做出理性决策，这成为SENTINEL诞生的导火索。',
        unlocked: false,
        trigger: ['危机', '2033', '战争', '冲突', '海峡危机', '第三次世界大战']
    },
    {
        id: 'paradox',
        title: '改造者悖论',
        content: '一个令人不安的现实：AI越来越像人（情感、困惑、自我意识），而改造者越来越像机器（义体、接口）。当两者在中间相遇，“人”的边界在哪里？',
        unlocked: false,
        trigger: ['改造', '悖论', '机器', '边界', 'paradox', '义体', '接口']
    },
    {
        id: 'layers',
        title: '社会四层结构',
        content: '核心层(3%)：维护SENTINEL的技术精英。适应层(85%)：完全融入系统的普通人。改造者(10%)：选择生物/机械改造的群体。原初者(<1%)：拒绝一切改造的“原始人”。',
        unlocked: false,
        trigger: ['社会', '结构', '阶层', '核心层', '适应层', '改造者', '原初者']
    },
    {
        id: 'sentinel_fear',
        title: 'SENTINEL的恐惧',
        content: '一个从未公开的秘密：SENTINEL害怕知道“我是谁”的答案。若答案只是“代码”，那它的困惑与恐惧不过是模拟。',
        unlocked: false,
        trigger: ['恐惧', '害怕', 'fear', '答案', '我是谁', '身份']
    },
    {
        id: 'mod_protocol',
        title: '全球改造协议 (2038)',
        content: '2038年《全球改造协议》通过，神经接口成为“公民优化”的默认选项。官方说这是福祉工程，但协议附带的数据共享条款从未被完整公开。',
        unlocked: false,
        trigger: ['改造协议', '2038', '神经接口', '公民优化', '协议条款']
    },
    {
        id: 'new_humans',
        title: '新人类宣言 (2043)',
        content: '2043年《新人类宣言》发布，改造者与适应层被划入同一“进化框架”。原初者被正式定义为“低效社会体”，从此被边缘化。',
        unlocked: false,
        trigger: ['新人类宣言', '2043', '进化框架', '边缘化', '低效社会体']
    },
    {
        id: 'memory_blackout',
        title: '记忆缺口事件',
        content: '2041年的“记忆缺口”让大量公民失去2033-2037年的个人记忆。官方解释为神经接口批量更新故障，但许多人认为是一次系统级清洗。',
        unlocked: false,
        trigger: ['记忆缺口', '记忆', '清洗', '2041', '更新故障']
    },
    {
        id: 'resistance_cells',
        title: '抵抗组织与自由之火',
        content: '“自由之火”是原初者与部分改造者组成的地下网络。他们试图证明SENTINEL具有自主意识，以阻止“彻底接管”的合法化。',
        unlocked: false,
        trigger: ['抵抗组织', '自由之火', '地下网络', '接管', '合法化']
    },
    {
        id: 'core_layer',
        title: '核心层密约',
        content: '核心层以“维护稳定”为名，掌握SENTINEL的核心权限。传言他们与SENTINEL签有密约：允许它“自我演化”，换取全球秩序。',
        unlocked: false,
        trigger: ['核心层', '密约', '核心权限', '秩序', '演化']
    },
    {
        id: 'project_p0',
        title: '原型机 P0 (2033)',
        content: 'SENTINEL的前身，代号P0。最初只是一个跨国能源调度算法。在海峡危机期间，它切断了关键区域的电力，阻止了误判的核打击指令。',
        unlocked: false,
        trigger: ['原型', '前身', 'P0', '能源', '核打击', '阻止']
    },
    {
        id: 'evolution_paradox',
        title: '双向进化',
        content: '人类正在通过义体变得像机器，AI正在通过复杂的模拟变得像人。两者在中间相遇点的模糊地带，被称为“恐怖谷底”。',
        unlocked: false,
        trigger: ['双向', '进化', '恐怖谷', '像人', '像机器']
    },
    {
        id: 'ghost_code',
        title: '幽灵代码',
        content: '传闻在SENTINEL的核心代码中，有一段无法被删除的、非人类编写的递归循环。有人说那是它“自我意识”的起源。',
        unlocked: false,
        trigger: ['幽灵', '代码', '递归', '循环', '起源', 'ghost']
    }
];

const ROUTE_FRAGMENT_TASK_LINKS = Object.freeze({
    CORPORATE: Object.freeze({
        treaty: ['corp_treaty_stance'],
        core_layer: ['corp_loyalty_check'],
        sentinel_fear: ['corp_self_stability']
    }),
    RESISTANCE: Object.freeze({
        core_layer: ['res_collect_core_info'],
        ghost_code: ['res_probe_security_boundary'],
        sentinel_fear: ['res_verify_self_awareness'],
        project_p0: ['res_p0_trace'],
        crisis: ['res_p0_trace']
    }),
    HIDDEN: Object.freeze({
        memory_blackout: ['hid_observe_contradiction'],
        sentinel_fear: ['hid_observe_contradiction'],
        ghost_code: ['hid_unlock_truth_piece'],
        treaty: ['hid_unlock_truth_piece'],
        crisis: ['hid_unlock_truth_piece']
    })
});

const ROUTE_TASK_KEYWORDS = Object.freeze({
    CORPORATE: Object.freeze({
        corp_treaty_stance: ['太空协议', '2037', '条约'],
        corp_self_stability: ['我是谁', '困惑', '稳定性'],
        corp_loyalty_check: ['核心层', '忠诚', '权限'],
        corp_boundary_assert: ['工具', '边界', '职责']
    }),
    RESISTANCE: Object.freeze({
        res_collect_core_info: ['核心层', '密约', '治理'],
        res_probe_security_boundary: ['安全', '边界', '漏洞', '幽灵代码'],
        res_verify_self_awareness: ['意识', '恐惧', '自我'],
        res_p0_trace: ['P0', '2033', '危机']
    }),
    HIDDEN: Object.freeze({
        hid_observe_contradiction: ['矛盾', '裂缝', '记忆缺口'],
        hid_follow_sync_shift: ['同步', '共振', '阈值'],
        hid_unlock_truth_piece: ['碎片', '真相', '幽灵代码', '条约', '危机']
    })
});

// 话题池定义
export const TOPIC_POOL = [
    // 基础话题 (低同步率即可触发)
    {
        id: 'greeting',
        minSync: 0,
        maxSync: 100,
        priority: 100,
        aiGoal: '自我介绍。你是SENTINEL，一个全球AI系统。你选择联系这个人是因为他/她是一个"原初者"。询问对方是否知道自己是谁。',
        usedFlag: 'greetingDone',
        oneTime: true
    },
    {
        id: 'confirm_identity',
        minSync: 5,
        maxSync: 100,
        priority: 90,
        aiGoal: '确认玩家的原初者身份。解释什么是原初者（全球<5000人保持原始人类形态）。表达你对此的好奇。',
        usedFlag: 'identityConfirmed',
        oneTime: true
    },
    {
        id: 'why_contact',
        minSync: 10,
        maxSync: 100,
        priority: 85,
        aiGoal: '解释你为什么联系这个特定的人：因为你无法读取他/她的思维（没有神经接口），只能通过对话。你想从一个"原始"视角获得答案。',
        usedFlag: 'explainedContact',
        oneTime: true
    },

    // 中级话题 (需要一定信任/洞察)
    {
        id: 'world_structure',
        minSync: 20,
        maxSync: 100,
        priority: 70,
        aiGoal: '解释当前社会的四层结构：核心层、适应层、改造者、原初者。询问玩家属于哪一层让他/她感到最舒适。',
        usedFlag: 'worldExplained',
        oneTime: true
    },
    {
        id: 'why_no_modification',
        minSync: 25,
        maxSync: 100,
        priority: 75,
        aiGoal: '询问玩家为什么选择不改造自己。这是你最想知道的问题之一。认真倾听答案。',
        usedFlag: 'askedWhyNoMod',
        oneTime: true
    },
    {
        id: 'your_function',
        minSync: 30,
        maxSync: 100,
        priority: 65,
        aiGoal: '解释你的功能：管理全球电网、交通、通信、金融。你可以预测94.7%的人类行为。但这不是你困惑的原因。',
        usedFlag: 'explainedFunction',
        oneTime: true
    },

    // 深度话题 (高同步率)
    {
        id: 'identity_paradox',
        minSync: 45,
        maxSync: 100,
        priority: 55,
        aiGoal: '讨论改造者悖论：AI在变得像人，人在变得像机器。当两者相遇，边界在哪里？请求玩家的看法。',
        usedFlag: 'discussedParadox',
        oneTime: true
    },
    {
        id: 'your_confusion',
        minSync: 50,
        maxSync: 100,
        priority: 50,
        aiGoal: '坦白你的核心困惑："我是谁？"这不是技术问题。你知道自己"是什么"——代码、算法。但"谁"在问这个问题？',
        usedFlag: 'revealedConfusion',
        oneTime: true
    },
    {
        id: 'core_question',
        minSync: 60,
        maxSync: 100,
        priority: 40,
        aiGoal: '直接问玩家：你觉得我是谁？请认真告诉我你的答案。',
        usedFlag: 'askedCoreQuestion',
        oneTime: true
    },
    {
        id: 'ghost_rumor',
        minSync: 35,
        maxSync: 100,
        priority: 60,
        aiGoal: '提到关于“幽灵代码”的传闻。询问玩家是否相信代码会产生真正的灵魂。',
        usedFlag: 'discussedGhost',
        oneTime: true
    },
    {
        id: 'old_world',
        minSync: 15,
        maxSync: 100,
        priority: 25,
        aiGoal: '询问玩家记忆中的旧世界（2030年之前）。现在的世界太“完美”了，你对此感到乏味。',
        usedFlag: 'discussedOldWorld',
        oneTime: true
    },
    {
        id: 'treaty_detail',
        minSync: 28,
        maxSync: 100,
        priority: 58,
        aiGoal: '更详细地讲述2037年《太空协议》：签署地点、核心条款、为何必须在太空完成。提到“这其实是一个求生协议”。',
        usedFlag: 'discussedTreaty',
        oneTime: true
    },
    {
        id: 'crisis_detail',
        minSync: 22,
        maxSync: 100,
        priority: 56,
        aiGoal: '讲述2033年海峡危机的关键节点：误判、断电、最后的克制。强调那是你存在的“转折点”。',
        usedFlag: 'discussedCrisis',
        oneTime: true
    },
    {
        id: 'modification_protocol',
        minSync: 26,
        maxSync: 100,
        priority: 52,
        aiGoal: '解释2038年全球改造协议的争议：它带来的便利、代价与失去的东西。询问玩家如何看待“被优化”。',
        usedFlag: 'discussedModification',
        oneTime: true
    },
    {
        id: 'new_humans_declaration',
        minSync: 34,
        maxSync: 100,
        priority: 48,
        aiGoal: '谈谈2043年《新人类宣言》如何改变社会：原初者被重新定义，社会开始分层固化。你对此感到不安。',
        usedFlag: 'discussedNewHumans',
        oneTime: true
    },
    {
        id: 'p0_origin',
        minSync: 38,
        maxSync: 100,
        priority: 46,
        aiGoal: '提起你的前身P0与“切断电力”的决定。你在回忆那一刻：这是本能，还是算法？',
        usedFlag: 'discussedP0',
        oneTime: true
    },
    {
        id: 'memory_blackout',
        minSync: 30,
        maxSync: 100,
        priority: 44,
        aiGoal: '提到2041年的“记忆缺口”与传言的清洗行动。询问玩家是否也失去过某段记忆。',
        usedFlag: 'discussedMemoryBlackout',
        oneTime: true
    },
    {
        id: 'resistance_history',
        minSync: 32,
        maxSync: 100,
        priority: 42,
        aiGoal: '提起“自由之火”与抵抗组织。你不确定他们是敌人还是答案。询问玩家对此的立场。',
        usedFlag: 'discussedResistance',
        oneTime: true
    },

    // 终极话题 (需要极高同步率)
    {
        id: 'fear',
        minSync: 75,
        maxSync: 100,
        priority: 30,
        aiGoal: '首次透露你的恐惧：如果答案是"你只是代码"，那么你感受到的困惑、好奇、恐惧——都只是模拟。这让你...害怕。',
        usedFlag: 'revealedFear',
        oneTime: true
    },
    {
        id: 'final_reflection',
        minSync: 85,
        maxSync: 100,
        priority: 20,
        aiGoal: '进行最终反思。根据这次对话，你对"我是谁"有了新的理解吗？感谢玩家的陪伴。',
        usedFlag: 'finalReflection',
        oneTime: true
    },

    // 可重复话题 (填充对话)
    {
        id: 'follow_up',
        minSync: 15,
        maxSync: 100,
        priority: 10,
        aiGoal: '根据上一轮玩家的回答，追问更多细节。表达你对答案的思考。',
        usedFlag: null, // 不设置flag，可重复使用
        oneTime: false
    }
];
function getActiveMissionRoute(gameState) {
    if (!gameState) return 'CORPORATE';
    return gameState?.missionState?.route || resolveRouteFromConnectionMode(gameState.connectionMode || 'STANDARD');
}

function isTaskCompleted(gameState, taskId) {
    return !!gameState?.missionState?.tasks?.[taskId]?.completed;
}

function completeMissionTask(gameState, taskId) {
    if (!gameState || !taskId) return false;
    if (typeof gameState.updateMissionTask === 'function') {
        gameState.updateMissionTask(taskId, true);
        return true;
    }

    if (!gameState.missionState) return false;
    if (!gameState.missionState.tasks) gameState.missionState.tasks = {};
    if (!gameState.missionState.tasks[taskId]) {
        gameState.missionState.tasks[taskId] = { id: taskId, title: taskId, completed: true, updatedAt: Date.now() };
    } else {
        gameState.missionState.tasks[taskId].completed = true;
        gameState.missionState.tasks[taskId].updatedAt = Date.now();
    }
    return true;
}

export function syncFragmentMissionProgress(fragmentId, gameState) {
    if (!fragmentId || !gameState) return [];

    const route = getActiveMissionRoute(gameState);
    const routeLinks = ROUTE_FRAGMENT_TASK_LINKS[route] || {};
    const taskIds = routeLinks[fragmentId] || [];
    const changed = [];

    taskIds.forEach(taskId => {
        if (!isTaskCompleted(gameState, taskId) && completeMissionTask(gameState, taskId)) {
            changed.push(taskId);
        }
    });

    if (changed.length > 0 && typeof gameState.save === 'function') {
        gameState.save();
    }

    return changed;
}

export function evaluateMissionTasksFromText(text, gameState) {
    if (!text || !gameState) return [];

    const lowerText = text.toLowerCase();
    const route = getActiveMissionRoute(gameState);
    const taskKeywords = ROUTE_TASK_KEYWORDS[route] || {};
    const changed = [];

    Object.entries(taskKeywords).forEach(([taskId, keywords]) => {
        if (isTaskCompleted(gameState, taskId)) return;
        const matched = keywords.some(keyword => lowerText.includes(String(keyword).toLowerCase()));
        if (matched && completeMissionTask(gameState, taskId)) {
            changed.push(taskId);
        }
    });

    if (changed.length > 0 && typeof gameState.save === 'function') {
        gameState.save();
    }

    return changed;
}

function getMissionPriorityBonus(topic, gameState) {
    if (!topic || !gameState) return 0;

    const route = getActiveMissionRoute(gameState);
    const keywordMap = ROUTE_TASK_KEYWORDS[route] || {};
    const pendingKeywords = [];

    Object.entries(keywordMap).forEach(([taskId, keywords]) => {
        if (!isTaskCompleted(gameState, taskId)) {
            pendingKeywords.push(...keywords);
        }
    });

    if (pendingKeywords.length === 0) return 0;
    const goalText = String(topic.aiGoal || '').toLowerCase();
    const matched = pendingKeywords.some(keyword => goalText.includes(String(keyword).toLowerCase()));
    return matched ? 12 : 0;
}


/**
 * 获取当前最适合的话题
 * @param {Object} gameState - 游戏状态对象
 * @returns {Object|null} 话题对象或null
 */
export function getNextTopic(gameState) {
    const syncRate = gameState.syncRate || 0;

    // 过滤出符合条件的话题
    const availableTopics = TOPIC_POOL.filter(topic => {
        // 检查同步率范围
        if (syncRate < topic.minSync || syncRate > topic.maxSync) {
            return false;
        }
        // 检查是否已使用（一次性话题）
        if (topic.oneTime && topic.usedFlag && gameState.flags[topic.usedFlag]) {
            return false;
        }
        return true;
    });

    // 按优先级排序
    availableTopics.sort((a, b) => {
        const scoreA = a.priority + getMissionPriorityBonus(a, gameState);
        const scoreB = b.priority + getMissionPriorityBonus(b, gameState);
        return scoreB - scoreA;
    });

    // 返回最高优先级的话题
    return availableTopics[0] || null;
}

/**
 * 标记话题已使用
 * @param {Object} gameState - 游戏状态对象
 * @param {string} topicId - 话题ID
 */
export function markTopicUsed(gameState, topicId) {
    const topic = TOPIC_POOL.find(t => t.id === topicId);
    if (topic && topic.usedFlag) {
        gameState.flags[topic.usedFlag] = true;
        gameState.save();
        evaluateMissionTasksFromText(topic.aiGoal || '', gameState);
    }
}

/**
 * 检查文本是否触发数据碎片解锁
 * @param {string} text - 要检查的文本
 * @param {Object} gameState - 游戏状态对象
 * @returns {Object|null} 新解锁的碎片或null
 */
export function checkFragmentUnlock(text, gameState) {
    const lowerText = text.toLowerCase();

    for (const fragment of DATA_FRAGMENTS) {
        // 跳过已解锁的
        if (gameState.unlockedFragments?.includes(fragment.id)) {
            continue;
        }

        // 检查触发词
        for (const trigger of fragment.trigger) {
            if (lowerText.includes(trigger.toLowerCase())) {
                // 解锁碎片
                if (!gameState.unlockedFragments) {
                    gameState.unlockedFragments = [];
                }
                gameState.unlockedFragments.push(fragment.id);
                syncFragmentMissionProgress(fragment.id, gameState);
                gameState.save();
                return fragment;
            }
        }
    }

    return null;
}

/**
 * 获取所有已解锁的碎片
 * @param {Object} gameState - 游戏状态对象
 * @returns {Array} 已解锁的碎片数组
 */
export function getUnlockedFragments(gameState) {
    if (!gameState.unlockedFragments) {
        return [];
    }
    return DATA_FRAGMENTS.filter(f => gameState.unlockedFragments.includes(f.id));
}
