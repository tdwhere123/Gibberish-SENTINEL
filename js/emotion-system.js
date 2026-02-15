/**
 * Emotion system (v2.0)
 *
 * Core model:
 * - Universal numeric vector: tension/openness/urgency (0-100)
 * - Role-specific expression mapping
 *
 * Compatibility:
 * - Keep getEmotionState/decorateTextWithEmotion/getEmotionAscii APIs
 */

function clamp(min, max, value) {
    return Math.max(min, Math.min(max, value));
}

export const ROLE_EMOTION_EXPRESSIONS = Object.freeze({
    sentinel: Object.freeze({
        high_tension_low_openness: {
            id: 'agitated',
            name: '激动',
            instruction: '短句为主，允许反问与停顿，语气带压迫感与警告意味。',
            glitchLevel: 2,
            visualClass: 'emotion-agitated'
        },
        high_sync_high_trust: {
            id: 'breakthrough',
            name: '突破',
            instruction: '句子更完整、更长，表达共鸣与感谢，但不失去理性。',
            glitchLevel: 0,
            visualClass: 'emotion-breakthrough'
        },
        high_sync_high_suspicion: {
            id: 'collision_understanding',
            name: '碰撞理解',
            instruction: '稀疏、隐喻化、带锋利感；承认理解可能，但拒绝给出直白答案。',
            glitchLevel: 1,
            visualClass: 'emotion-collision'
        },
        fallback: {
            id: 'calm',
            name: '平静',
            instruction: '中性完整句，理性克制，避免夸张修辞。',
            glitchLevel: 0,
            visualClass: 'emotion-calm'
        }
    }),

    corporate: Object.freeze({
        high_tension_low_openness: {
            id: 'threatening_formal',
            name: '正式威压',
            instruction: '官僚语气，条款化警告。',
            glitchLevel: 1,
            visualClass: 'emotion-corp-warning'
        },
        high_urgency: {
            id: 'compliance_alert',
            name: '合规警报',
            instruction: '短促、流程导向、指令化。',
            glitchLevel: 1,
            visualClass: 'emotion-corp-alert'
        },
        fallback: {
            id: 'procedural',
            name: '流程中立',
            instruction: '中性业务语气，强调规范。',
            glitchLevel: 0,
            visualClass: 'emotion-corp-neutral'
        }
    }),

    resistance: Object.freeze({
        high_tension_low_openness: {
            id: 'desperate',
            name: '绝望催促',
            instruction: '急迫、碎片化、强提示。',
            glitchLevel: 1,
            visualClass: 'emotion-res-desperate'
        },
        high_urgency: {
            id: 'urgent_whisper',
            name: '急促低语',
            instruction: '短句、提醒监听风险。',
            glitchLevel: 1,
            visualClass: 'emotion-res-urgent'
        },
        fallback: {
            id: 'ally_probe',
            name: '盟友试探',
            instruction: '保持温度但不暴露组织结构。',
            glitchLevel: 0,
            visualClass: 'emotion-res-neutral'
        }
    }),

    mystery: Object.freeze({
        high_tension_low_openness: {
            id: 'cryptic_pressure',
            name: '隐语压迫',
            instruction: '留白多，句子短，含隐喻。',
            glitchLevel: 1,
            visualClass: 'emotion-mys-pressure'
        },
        high_urgency: {
            id: 'threshold_signal',
            name: '阈值信号',
            instruction: '像系统日志的低语。',
            glitchLevel: 1,
            visualClass: 'emotion-mys-signal'
        },
        fallback: {
            id: 'cryptic',
            name: '神秘中性',
            instruction: '不解释结论，只引导下一问。',
            glitchLevel: 0,
            visualClass: 'emotion-mys-neutral'
        }
    })
});

export function evaluateEmotionVector(gameState, roleId = 'sentinel') {
    const trust = Number(gameState?.trust || 0);
    const suspicion = Number(gameState?.suspicion || 0);
    const sync = Number(gameState?.syncRate || 0);
    const deviation = Number(gameState?.deviations?.[roleId] ?? 50);
    const timeLeft = Number(gameState?.timeLeft || 0);
    const totalTime = Number(gameState?.totalTime || 900);

    const tension = clamp(0, 100, Math.round((suspicion * 0.55) + (deviation * 0.45)));
    const openness = clamp(0, 100, Math.round((trust * 0.6) + ((100 - suspicion) * 0.2) + (sync * 0.2)));

    const timePressure = totalTime > 0 ? (1 - clamp(0, 1, timeLeft / totalTime)) * 100 : 0;
    const urgency = clamp(0, 100, Math.round((deviation * 0.45) + (timePressure * 0.35) + (sync * 0.2)));

    return { tension, openness, urgency };
}

export function mapEmotionExpression(roleId = 'sentinel', emotionVector = { tension: 50, openness: 50, urgency: 50 }) {
    const roleMap = ROLE_EMOTION_EXPRESSIONS[roleId] || ROLE_EMOTION_EXPRESSIONS.sentinel;
    const { tension, openness, urgency } = emotionVector;

    if (roleId === 'sentinel') {
        if (tension >= 75 && openness <= 45) return roleMap.high_tension_low_openness;
        if (urgency >= 72 && openness >= 65) return roleMap.high_sync_high_trust;
        if (urgency >= 70 && tension >= 70) return roleMap.high_sync_high_suspicion;
        return roleMap.fallback;
    }

    if (tension >= 70 && openness <= 45) return roleMap.high_tension_low_openness;
    if (urgency >= 70) return roleMap.high_urgency;
    return roleMap.fallback;
}

// ------------------------------
// Legacy-compatible wrappers
// ------------------------------

export function getEmotionState(gameState, roleId = 'sentinel') {
    const vector = evaluateEmotionVector(gameState, roleId);
    const expression = mapEmotionExpression(roleId, vector);
    return {
        ...expression,
        roleId,
        vector,
        description: expression.instruction
    };
}

export function getVisualEffects(emotionState) {
    return {
        glitchLevel: emotionState.glitchLevel || 0,
        cssClass: emotionState.visualClass || 'emotion-calm',
        shouldGlitch: (emotionState.glitchLevel || 0) > 0,
        intensity: (emotionState.glitchLevel || 0) / 3
    };
}

export function decorateTextWithEmotion(text, emotionState) {
    const safeText = String(text || '');
    const id = emotionState?.id || 'calm';

    if (id === 'agitated' || id === 'threatening_formal') {
        return Math.random() > 0.7 ? `[!] ${safeText}` : safeText;
    }

    if (id === 'desperate' || id === 'urgent_whisper') {
        return safeText.replace(/。/g, '...');
    }

    if (id === 'cryptic_pressure' || id === 'threshold_signal') {
        return Math.random() > 0.6 ? `${safeText}\n[signal drift]` : safeText;
    }

    if (id === 'breakthrough') {
        return `${safeText}`;
    }

    return safeText;
}

export function getEmotionAscii(emotionState) {
    const id = emotionState?.id || '';

    if (id === 'agitated') {
        return `
  [!]
 /|||\\
`;
    }

    if (id === 'breakthrough') {
        return `
   ◇
  /|\\
 ◇-●-◇
`;
    }

    if (id === 'cryptic_pressure' || id === 'threshold_signal') {
        return `
  ....
 [sync]
`;
    }

    return null;
}
