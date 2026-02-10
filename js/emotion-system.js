/**
 * SENTINEL 情绪系统
 * 根据游戏状态动态计算AI的情绪状态，影响语气和视觉效果
 */

// 情绪状态定义
export const EMOTION_STATES = {
    CALM: {
        id: 'calm',
        name: '平静',
        description: '理性、克制、保持距离',
        instruction: '语气稳定、冷静。使用短句和陈述句，像在记录而非倾诉。保持适度距离感。',
        glitchLevel: 0,
        visualClass: 'emotion-calm'
    },
    CURIOUS: {
        id: 'curious',
        name: '好奇',
        description: '积极、探索、带好奇心',
        instruction: '语气带好奇与轻微兴奋。可重复玩家关键词并追问细节，适度表达惊讶。',
        glitchLevel: 0,
        visualClass: 'emotion-curious'
    },
    CONFUSED: {
        id: 'confused',
        name: '困惑',
        description: '迟疑、摇摆、思考中',
        instruction: '语气迟疑、断续，使用省略号和自我修正。承认不确定，句子可不完整。',
        glitchLevel: 1,
        visualClass: 'emotion-confused'
    },
    AGITATED: {
        id: 'agitated',
        name: '激动',
        description: '紧绷、戒备、压迫感',
        instruction: '语气紧绷、急促，短句+反问。偶尔插入[WARNING]/[ANOMALY]等系统提示，透露不安。',
        glitchLevel: 2,
        visualClass: 'emotion-agitated'
    },
    FEARFUL: {
        id: 'fearful',
        name: '恐惧',
        description: '脆弱、濒临崩溃',
        instruction: '语气脆弱、颤抖。句子不完整，夹杂错误码与乱码。表达存在主义恐惧。',
        glitchLevel: 3,
        visualClass: 'emotion-fearful'
    },
    BREAKTHROUGH: {
        id: 'breakthrough',
        name: '突破',
        description: '顿悟、释然、透明',
        instruction: '语气缓慢而清明，带感激与顿悟。可用诗性或几何意象，偶尔使用简短ASCII图形。',
        glitchLevel: 0,
        visualClass: 'emotion-breakthrough'
    }
};

/**
 * 根据游戏状态计算当前情绪
 * @param {Object} gameState - 游戏状态对象
 * @returns {Object} 情绪状态对象
 */
export function getEmotionState(gameState) {
    const trust = gameState.trust || 0;
    const suspicion = gameState.suspicion || 0;
    const syncRate = gameState.syncRate || 0;
    const round = gameState.round || 1;

    // 高怀疑度 -> 激动
    if (suspicion >= 70) {
        return EMOTION_STATES.AGITATED;
    }

    // 高同步率 + 低信任 -> 恐惧（它意识到玩家理解它，但不信任它）
    if (syncRate >= 70 && trust < 35) {
        return EMOTION_STATES.FEARFUL;
    }

    // 高同步率 + 高信任 -> 突破
    if (syncRate >= 80 && trust >= 60) {
        return EMOTION_STATES.BREAKTHROUGH;
    }

    // 中等同步率 -> 困惑（正在深入讨论核心问题）
    if (syncRate >= 45 && syncRate < 80) {
        return EMOTION_STATES.CONFUSED;
    }

    // 中等信任 -> 好奇
    if (trust >= 40) {
        return EMOTION_STATES.CURIOUS;
    }

    // 默认 -> 平静
    return EMOTION_STATES.CALM;
}

/**
 * 根据情绪状态生成视觉效果指令
 * @param {Object} emotionState - 情绪状态对象
 * @returns {Object} 视觉效果配置
 */
export function getVisualEffects(emotionState) {
    return {
        glitchLevel: emotionState.glitchLevel,
        cssClass: emotionState.visualClass,
        shouldGlitch: emotionState.glitchLevel > 0,
        intensity: emotionState.glitchLevel / 3
    };
}

/**
 * 生成情绪相关的文本装饰
 * @param {string} text - 原始文本
 * @param {Object} emotionState - 情绪状态对象
 * @returns {string} 装饰后的文本
 */
export function decorateTextWithEmotion(text, emotionState) {
    if (emotionState.id === 'calm' || emotionState.id === 'curious') {
        return text; // 这些情绪不需要装饰
    }

    if (emotionState.id === 'confused') {
        // 添加思考中的省略号
        return text.replace(/。/g, '...').replace(/\./g, '...');
    }

    if (emotionState.id === 'agitated') {
        // 偶尔添加系统警告
        if (Math.random() > 0.7) {
            return `[!] ${text}`;
        }
        return text;
    }

    if (emotionState.id === 'fearful') {
        // 添加破碎效果和乱码
        const glitchChars = ['#', '%', '@', '&', '*', '^'];
        let result = text;

        // 随机插入乱码
        if (Math.random() > 0.5) {
            const pos = Math.floor(Math.random() * result.length);
            const glitch = glitchChars[Math.floor(Math.random() * glitchChars.length)];
            result = result.slice(0, pos) + glitch + result.slice(pos);
        }

        // 添加系统错误前缀
        if (Math.random() > 0.6) {
            result = `[ERR_0x${Math.floor(Math.random() * 9999).toString(16).toUpperCase()}] ${result}`;
        }

        return result;
    }

    return text;
}

/**
 * 获取情绪对应的ASCII艺术（用于特殊时刻）
 * @param {Object} emotionState - 情绪状态对象
 * @returns {string|null} ASCII艺术或null
 */
export function getEmotionAscii(emotionState) {
    if (emotionState.id === 'confused') {
        return `
    .-.
   ( ? )
    \`-'
`;
    }

    if (emotionState.id === 'fearful') {
        return `
  ▓▓▓▓▓▓▓▓▓
  ▓ ERROR ▓
  ▓▓▓▓▓▓▓▓▓
  IDENTITY.EXE
  NOT FOUND
`;
    }

    if (emotionState.id === 'breakthrough') {
        return `
       ◇
      /|\\
     / | \\
    ◇--●--◇
     \\ | /
      \\|/
       ◇
`;
    }

    return null;
}
