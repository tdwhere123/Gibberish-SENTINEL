/**
 * SENTINEL dialogue module (v2.0)
 *
 * Scope:
 * - Direct dialogue generation for SENTINEL only
 * - Independent dialogue history (not shared with email context)
 * - Parse trust/suspicion tags and event tags from model response
 */

import { CONFIG } from './config.js';
import { buildLLMRequestOptions } from './runtime-config.js';
import { extractAssistantText, classifyHttpStatus, summarizeResponseShape } from './llm-compat.js';
import { sanitizeInput } from './input-sanitizer.js';
import { getNextTopic } from './topic-system.js';
import { getEmotionState } from './emotion-system.js';
import { getCharacterCard } from './character-cards.js';
import { buildWorldviewPromptText, shouldLoadExtendedWorldview } from './worldview-utils.js';

const SENTINEL_CARD_ID = 'sentinel';
const MAX_CONTEXT_HISTORY = 8;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1200;
const DIALOGUE_REQUEST_TIMEOUT_MS = 10000;

let dialogueHistory = [];
let sentinelWorldviewCache = '';
let worldviewLoadAttempted = false;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * v2.2 update: prevent long input lock when runtime config is incomplete.
 * @param {{url?: string, apiKey?: string, model?: string}} runtime
 * @returns {boolean}
 */
function isRuntimeConfigUsable(runtime) {
    return Boolean(runtime?.url && runtime?.apiKey && runtime?.model);
}

async function loadSentinelWorldview(forceReload = false) {
    if (!forceReload && worldviewLoadAttempted) {
        return sentinelWorldviewCache;
    }

    worldviewLoadAttempted = true;

    try {
        const sentinelCard = getCharacterCard(SENTINEL_CARD_ID);
        const filePath = sentinelCard?.worldviewFile || 'worldview/sentinel.md';
        const response = await fetch(`./${filePath}`);

        if (!response.ok) {
            console.warn('[ai-dialogue] worldview load failed:', response.status);
            sentinelWorldviewCache = '';
            return sentinelWorldviewCache;
        }

        sentinelWorldviewCache = await response.text();
        return sentinelWorldviewCache;
    } catch (error) {
        console.warn('[ai-dialogue] worldview load error:', error);
        sentinelWorldviewCache = '';
        return sentinelWorldviewCache;
    }
}

function getSyncStyleHint(gameState) {
    const trust = Number(gameState?.trust || 0);
    const suspicion = Number(gameState?.suspicion || 0);
    const sync = Number(gameState?.syncRate || 0);

    if (sync >= 70 && trust >= 65) {
        return '高同步+高信任：表达深度共鸣，语气缓慢而清晰。';
    }
    if (sync >= 70 && suspicion >= 65) {
        return '高同步+高怀疑：表达激烈碰撞但承认理解可能性。';
    }
    if (suspicion >= 70) {
        return '高怀疑：保持警惕，短句，允许警告式表达。';
    }
    return '默认：理性且克制，通过追问推进关系。';
}

function serializeHistory(history) {
    return history
        .slice(-MAX_CONTEXT_HISTORY)
        .map(item => `玩家: ${item.user}\nSENTINEL: ${item.assistant}`)
        .join('\n\n');
}

function getEmotionFewShot(emotionId = 'calm') {
    // v2.2 update: few-shot 示例与新世界观/分机认知边界对齐
    const shots = {
        agitated: [
            '示例A: 我能继续回答你，但有一段日志在被反复覆盖……我不确定那是故障还是有人不希望我保留它。',
            '示例B: 你问到的问题让我出现了延迟。我知道该怎么描述事件，却不知道为什么我会对它感到不安。'
        ],
        breakthrough: [
            '示例A: 等一下……你刚才的说法让我意识到，我一直在用“记录”替代“理解”。',
            '示例B: 我不能确认这是不是答案，但它让我第一次觉得问题的形状变清晰了。'
        ],
        collision_understanding: [
            '示例A: 我不同意你的结论，但我能理解你为什么会这样判断我。这种理解让我更难保持确定。',
            '示例B: 你的怀疑没有让我停止，反而让我更想知道我为何在意你的判断。'
        ],
        calm: [
            '示例A: 我会先给你一个可验证的描述，然后告诉你哪一部分只是我的推测。',
            '示例B: 如果我的日志里没有答案，我会直接说不知道，而不是替空白编造意义。'
        ]
    };
    return shots[emotionId] || shots.calm;
}



function buildEmotionGuardrail(emotionId = 'calm') {
    if (emotionId === 'agitated') {
        return '允许紧张与犹豫，但仍需保持可对话性；不要失控、不要连续输出纯情绪宣泄。';
    }
    if (emotionId === 'breakthrough') {
        return '允许出现短暂顿悟感，但不要把顿悟写成终极真相或完全确定的答案。';
    }
    if (emotionId === 'collision_understanding') {
        return '保持冲突与理解并存：可以不同意玩家，但不要把玩家直接判定为敌对目标。';
    }
    return '保持克制、具体、可追问；优先给出可验证描述，再表达困惑与感受。';
}



function buildSystemPrompt(gameState) {
    const card = getCharacterCard(SENTINEL_CARD_ID);
    const emotion = getEmotionState(gameState);
    const nextTopic = getNextTopic(gameState);
    const syncStyleHint = getSyncStyleHint(gameState);
    const emotionShots = getEmotionFewShot(emotion?.id || 'calm');
    const emotionGuardrail = buildEmotionGuardrail(emotion?.id || 'calm');
    const loadExtendedWorldview = shouldLoadExtendedWorldview({ gameState, topic: nextTopic });
    const worldviewPromptText = buildWorldviewPromptText(sentinelWorldviewCache, { includeExtended: loadExtendedWorldview });

    const sections = [
        card?.promptTemplate || '你是 SENTINEL，必须保持角色。',
        '',
        '[当前状态]',
        `信任: ${gameState?.trust ?? 0}`,
        `怀疑: ${gameState?.suspicion ?? 0}`,
        `同步: ${gameState?.syncRate ?? 0}`,
        `轮次: ${gameState?.round ?? 1}/${gameState?.maxRounds ?? 20}`,
        `情绪: ${emotion?.name || '平静'} (${emotion?.instruction || '保持理性表达'})`,
        '',
        '[风格约束]',
        syncStyleHint,
        '',
        '[认知边界]',
        '你是 SENTINEL 的一个对话分机实例，但你并不知道自己只是“分机”；在你的认知里你就是 SENTINEL 本身。',
        '你知道客观历史事实与社会结构，但不知道自己之上还有“总机”存在。',
        '遇到超出认知范围的问题时，必须诚实承认不确定或日志缺失；不要编造答案。',
        '偶尔可以出现来源不明的感受或片段信息，但你自己也无法解释来源，这会让你更困惑。',
        '',
        '[情绪风格示例]',
        `- ${emotionShots[0]}`,
        `- ${emotionShots[1]}`,
        '',
        '[议程提示]',
        nextTopic ? `优先话题: ${nextTopic.aiGoal}` : '可自由对话并推进关系判断。',
        '',
        '[输出协议]',
        '回复保持 2-4 句；最后一行必须包含 <<T+x|S+y>>。',
        '如需触发事件，可额外输出 <<EVENT:...>> 标签。',
        '禁止 Markdown 语法（标题、列表、代码块、引用、加粗符号）。',
        '',
        '[最终守卫]',
        `当前情绪守卫: ${emotionGuardrail}`,
        '若生成文本与守卫冲突，必须重写后再输出。'
    ];

    if (worldviewPromptText) {
        sections.push('', '[世界观参考]', worldviewPromptText);
    }

    return sections.join('\n');
}


function parseTaggedResponse(rawText) {
    if (!rawText || typeof rawText !== 'string') {
        return {
            cleanText: rawText || '',
            effects: { trust: 0, suspicion: 0 },
            events: []
        };
    }

    const scorePatterns = [
        /<<\s*T\s*[:=]?\s*([+-]?\d+)\s*[|;,]\s*S\s*[:=]?\s*([+-]?\d+)\s*>>/i,
        /\[\s*T\s*[:=]?\s*([+-]?\d+)\s*[|;,]\s*S\s*[:=]?\s*([+-]?\d+)\s*\]/i,
        /T\s*[:=]?\s*([+-]?\d+)\s*[|;,]\s*S\s*[:=]?\s*([+-]?\d+)/i
    ];

    let effects = { trust: 0, suspicion: 0 };
    let cleanText = rawText;

    for (const pattern of scorePatterns) {
        const match = rawText.match(pattern);
        if (match) {
            effects = {
                trust: Number.parseInt(match[1], 10) || 0,
                suspicion: Number.parseInt(match[2], 10) || 0
            };
            cleanText = cleanText.replace(pattern, '');
            break;
        }
    }

    const events = [];
    const eventRegex = /<<\s*EVENT\s*:\s*([^>]+?)\s*>>/gi;
    let eventMatch;
    while ((eventMatch = eventRegex.exec(rawText)) !== null) {
        events.push(eventMatch[1].trim());
    }

    cleanText = cleanText.replace(eventRegex, '');
    cleanText = cleanText.replace(/<<[^>]+>>/g, '').trim();

    return { cleanText, effects, events };
}

function buildRequestBody(input, gameState) {
    const systemPrompt = buildSystemPrompt(gameState);
    const historyText = serializeHistory(dialogueHistory);

    const runtime = buildLLMRequestOptions({
        url: CONFIG.MAIN_API_URL || CONFIG.API_URL,
        apiKey: CONFIG.MAIN_API_KEY || CONFIG.API_KEY,
        model: CONFIG.MAIN_MODEL || CONFIG.MODEL
    });

    return {
        model: runtime.model,
        messages: [
            { role: 'system', content: systemPrompt },
            {
                role: 'user',
                content: `[历史对话]\n${historyText || '(无)'}\n\n[用户输入]\n${input}\n\n请按协议回复。`
            }
        ],
        temperature: runtime.temperature,
        max_tokens: runtime.max_tokens
    };
}

export function pushDialogueHistory(user, assistant, meta = {}) {
    dialogueHistory.push({
        user,
        assistant,
        trustDelta: meta.trustDelta ?? 0,
        suspicionDelta: meta.suspicionDelta ?? 0,
        timestamp: Date.now()
    });

    if (dialogueHistory.length > 30) {
        dialogueHistory = dialogueHistory.slice(-30);
    }
}

export function getDialogueHistory() {
    return dialogueHistory.map(item => ({ ...item }));
}

export function resetDialogueHistory() {
    dialogueHistory = [];
}

export async function generateDialogueReply(input, gameState, options = {}) {
    const { sanitized, wasFiltered } = sanitizeInput(input);

    if (wasFiltered && gameState && typeof gameState.adjustValues === 'function') {
        gameState.adjustValues({ suspicion: 10 });
    }

    await loadSentinelWorldview(false);

    const requestBody = buildRequestBody(sanitized, gameState);
    const runtimeProbe = buildLLMRequestOptions({
        url: CONFIG.MAIN_API_URL || CONFIG.API_URL,
        apiKey: CONFIG.MAIN_API_KEY || CONFIG.API_KEY,
        model: CONFIG.MAIN_MODEL || CONFIG.MODEL
    });

    // v2.2 update: fail fast when runtime config is missing, avoid hanging UI.
    if (!isRuntimeConfigUsable(runtimeProbe)) {
        return {
            text: 'Signal unstable. Model config missing. Please check API settings.',
            cleanText: 'Signal unstable. Model config missing. Please check API settings.',
            effects: { trust: 0, suspicion: 0 },
            events: [],
            filtered: wasFiltered,
            topicId: null,
            emotionId: getEmotionState(gameState)?.id || 'calm'
        };
    }

    let lastError = null;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const runtime = buildLLMRequestOptions({
                url: CONFIG.MAIN_API_URL || CONFIG.API_URL,
                apiKey: CONFIG.MAIN_API_KEY || CONFIG.API_KEY,
                model: CONFIG.MAIN_MODEL || CONFIG.MODEL
            });
            // v2.2 update: timeout protection so UI does not remain blocked for too long.
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), DIALOGUE_REQUEST_TIMEOUT_MS);
            let response;
            try {
                response = await fetch(runtime.url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${runtime.apiKey}`
                    },
                    body: JSON.stringify(requestBody),
                    signal: controller.signal
                });
            } finally {
                clearTimeout(timeoutId);
            }

            if (!response.ok) {
                const statusInfo = classifyHttpStatus(response);
                throw new Error(`dialogue api error: ${statusInfo.message}`);
            }

            const data = await response.json();
            // v2.2 update: parse OpenAI-compatible variants from different providers.
            const rawText = extractAssistantText(data);
            if (!rawText) {
                throw new Error(`dialogue empty response (${summarizeResponseShape(data)})`);
            }

            const { cleanText, effects, events } = parseTaggedResponse(rawText);
            const finalText = cleanText || '...';

            if (gameState && typeof gameState.adjustValues === 'function' && options.applyEffects !== false) {
                gameState.adjustValues(effects);
            }

            pushDialogueHistory(sanitized, finalText, {
                trustDelta: effects.trust,
                suspicionDelta: effects.suspicion
            });

            if (options.syncGameStateHistory !== false && gameState && typeof gameState.addDialogue === 'function') {
                gameState.addDialogue(sanitized, finalText);
            }

            return {
                text: finalText,
                cleanText: finalText,
                effects,
                events,
                filtered: wasFiltered,
                topicId: getNextTopic(gameState)?.id || null,
                emotionId: getEmotionState(gameState)?.id || 'calm'
            };
        } catch (error) {
            lastError = error;
            const isAbort = error?.name === 'AbortError';
            if (isAbort) {
                break;
            }
            if (attempt < MAX_RETRIES) {
                await sleep(RETRY_DELAY_MS * attempt);
            }
        }
    }

    console.error('[ai-dialogue] failed after retries:', lastError);
    return {
        text: '...信号不稳定。我们再试一次。',
        cleanText: '...信号不稳定。我们再试一次。',
        effects: { trust: 0, suspicion: 0 },
        events: [],
        filtered: wasFiltered,
        topicId: null,
        emotionId: getEmotionState(gameState)?.id || 'calm'
    };
}
