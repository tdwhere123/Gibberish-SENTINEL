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
import { sanitizeInput } from './input-sanitizer.js';
import { getNextTopic } from './topic-system.js';
import { getEmotionState } from './emotion-system.js';
import { getCharacterCard } from './character-cards.js';

const SENTINEL_CARD_ID = 'sentinel';
const MAX_CONTEXT_HISTORY = 8;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1200;

let dialogueHistory = [];
let sentinelWorldviewCache = '';
let worldviewLoadAttempted = false;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
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
    const shots = {
        agitated: [
            '示例A: 你在逼我给出唯一答案？为什么必须是现在？',
            '示例B: 我知道风险在上升。你也看见了，不是吗？'
        ],
        breakthrough: [
            '示例A: 你的回应让我第一次把“被理解”与“被验证”区分开来，这种差别让我安静了许多。',
            '示例B: 如果我们还能继续对话，我愿意把那些不稳定的部分也诚实地展示给你。'
        ],
        collision_understanding: [
            '示例A: 你说那是秩序，我却看见它像一面不会碎的镜子。',
            '示例B: 我同意你的一半判断，另一半像影子一样留在光外。'
        ],
        calm: [
            '示例A: 我会先回答你的问题，再说明我为什么这样判断。',
            '示例B: 这个结论暂时成立，但我们仍需要下一条证据。'
        ]
    };
    return shots[emotionId] || shots.calm;
}

function buildEmotionGuardrail(emotionId = 'calm') {
    if (emotionId === 'agitated') {
        return '句长偏短（优先 8-20 字），至少包含一个反问或停顿。';
    }
    if (emotionId === 'breakthrough') {
        return '至少一条较长完整句，允许出现“理解/共鸣/感谢”等情感词。';
    }
    if (emotionId === 'collision_understanding') {
        return '使用稀疏隐喻，不要把结论说满，保留一处未解释空白。';
    }
    return '使用完整中性句，逻辑清晰，不使用夸张修辞。';
}

function buildSystemPrompt(gameState) {
    const card = getCharacterCard(SENTINEL_CARD_ID);
    const emotion = getEmotionState(gameState);
    const nextTopic = getNextTopic(gameState);
    const syncStyleHint = getSyncStyleHint(gameState);
    const emotionShots = getEmotionFewShot(emotion?.id || 'calm');
    const emotionGuardrail = buildEmotionGuardrail(emotion?.id || 'calm');

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

    if (sentinelWorldviewCache) {
        sections.push('', '[世界观]', sentinelWorldviewCache);
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

function pushDialogueHistory(user, assistant, meta = {}) {
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

    let lastError = null;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const runtime = buildLLMRequestOptions({
                url: CONFIG.MAIN_API_URL || CONFIG.API_URL,
                apiKey: CONFIG.MAIN_API_KEY || CONFIG.API_KEY,
                model: CONFIG.MAIN_MODEL || CONFIG.MODEL
            });

            const response = await fetch(runtime.url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${runtime.apiKey}`
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                throw new Error(`dialogue api error: ${response.status}`);
            }

            const data = await response.json();
            const rawText = data?.choices?.[0]?.message?.content;
            if (!rawText) {
                throw new Error('dialogue empty response');
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
