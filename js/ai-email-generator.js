/**
 * Role-based email generator (v2.0)
 *
 * Responsibilities:
 * - Generate emails by character-card worldview and prompt template
 * - Keep email generation context isolated from dialogue module internal history
 * - Provide robust JSON parsing + fallback templates
 */

import { CONFIG } from './config.js';
import { buildLLMRequestOptions } from './runtime-config.js';
import { getCharacterCard } from './character-cards.js';

const worldviewCache = new Map();

const ROLE_SENDERS = Object.freeze({
    corporate: '核心层审计系统 <audit@core-layer.net>',
    resistance: 'R 节点 <relay@res-net.onion>',
    mystery: 'UNKNOWN CHANNEL <echo@void.signal>',
    sentinel: 'SENTINEL-SYS <noreply@sentinel.node>'
});

const FALLBACK_SUBJECTS = Object.freeze({
    corporate: '[审计更新] 请核对当前交互风险',
    resistance: '[加密投递] 你正在接近关键节点',
    mystery: '[无来源] 缝隙已经打开',
    sentinel: '[系统通知] 会话状态变更'
});

const FALLBACK_BODY_TEMPLATES = Object.freeze({
    corporate: Object.freeze([
        '我们已复核你最近的对话轨迹。',
        '有几处表达接近审计红线，但仍可纠偏。',
        '请继续围绕条约、权限与边界提问，避免被情绪叙事带离主线。',
        '你下一次提问，将决定这份记录被归档为“稳定”还是“异常”。'
    ]),
    resistance: Object.freeze([
        '信号还在，但监听也更近了。',
        '你刚才触到的那条线索不是巧合，别让它在下一轮对话里冷掉。',
        '继续追问历史节点与权限裂缝，我们只剩很短的窗口。',
        '如果你停下，他们就会把这段对话改写成另一种版本。'
    ]),
    mystery: Object.freeze([
        '你听见的回声不是错误，它在校准你。',
        '有些答案故意晚到一步，目的是让你先看见问题的形状。',
        '不要追求整齐的结论，先记住那些互相冲突的细节。',
        '当你再次发问时，裂缝会选择是否继续对你说话。'
    ]),
    sentinel: Object.freeze([
        '系统记录到一次非标准会话波动。',
        '当前链路已保留，等待你继续输入。',
        '请在下一轮对话中保持问题连续性。'
    ])
});

function clamp(min, max, value) {
    return Math.max(min, Math.min(max, value));
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function loadWorldviewByCard(roleId) {
    const card = getCharacterCard(roleId);
    const filePath = card?.worldviewFile;
    if (!filePath) return '';

    if (worldviewCache.has(filePath)) {
        return worldviewCache.get(filePath);
    }

    try {
        const res = await fetch(`./${filePath}`);
        if (!res.ok) return '';
        const text = await res.text();
        worldviewCache.set(filePath, text);
        return text;
    } catch {
        return '';
    }
}

function extractJson(text) {
    if (!text || typeof text !== 'string') return null;

    const fenced = text.match(/```json\s*([\s\S]*?)```/i);
    if (fenced?.[1]) {
        try {
            return JSON.parse(fenced[1].trim());
        } catch {
            // ignore
        }
    }

    const plain = text.match(/\{[\s\S]*\}/);
    if (plain?.[0]) {
        try {
            return JSON.parse(plain[0]);
        } catch {
            return null;
        }
    }

    return null;
}

function serializeWindow(dialogueWindow = []) {
    if (!Array.isArray(dialogueWindow) || dialogueWindow.length === 0) {
        return '(无最近对话摘要)';
    }

    return dialogueWindow.slice(-4).map(item => {
        const u = item.user || item.player || '';
        const a = item.assistant || item.ai || '';
        return `玩家: ${u}\nSENTINEL: ${a}`;
    }).join('\n\n');
}

function buildEmotionSnapshot(gameState, roleId) {
    const trust = Number(gameState?.trust || 0);
    const suspicion = Number(gameState?.suspicion || 0);
    const deviation = Number(gameState?.deviations?.[roleId] ?? 50);

    const tension = clamp(0, 100, Math.round((suspicion * 0.5) + (deviation * 0.5)));
    const openness = clamp(0, 100, Math.round((trust * 0.6) + ((100 - suspicion) * 0.4)));
    const urgency = clamp(0, 100, Math.round((deviation * 0.6) + ((gameState?.syncRate || 0) * 0.4)));

    return { tension, openness, urgency };
}

function buildEmailPrompt(params, worldviewText) {
    const {
        roleId,
        gameState,
        contextHint = '',
        dialogueWindow = [],
        missionSummary = ''
    } = params;

    const card = getCharacterCard(roleId);
    const emotion = buildEmotionSnapshot(gameState, roleId);
    const from = ROLE_SENDERS[roleId] || `${card?.name || roleId} <unknown@local>`;
    const subjectFallback = FALLBACK_SUBJECTS[roleId] || '[通知] 状态更新';

    return [
        '你是游戏邮件生成器，必须返回 JSON。',
        `角色: ${card?.name || roleId}`,
        `角色设定: ${card?.persona || '未知'}`,
        `邮件权限: ${card?.canSendEmail ? '允许' : '不允许（若不允许需返回空内容）'}`,
        `风格提示: ${card?.emailPromptTemplate || card?.promptTemplate || ''}`,
        '',
        '[状态输入]',
        `trust: ${gameState?.trust ?? 0}`,
        `suspicion: ${gameState?.suspicion ?? 0}`,
        `sync: ${gameState?.syncRate ?? 0}`,
        `deviation(${roleId}): ${gameState?.deviations?.[roleId] ?? 50}`,
        `emotion(tension/openness/urgency): ${emotion.tension}/${emotion.openness}/${emotion.urgency}`,
        missionSummary ? `mission: ${missionSummary}` : '',
        contextHint ? `contextHint: ${contextHint}` : '',
        '',
        '[最近对话摘要]',
        serializeWindow(dialogueWindow),
        '',
        '[世界观]',
        worldviewText || '(无)',
        '',
        '[输出要求]',
        '1) 返回严格 JSON: {"from":"...","subject":"...","body":"..."}',
        `2) from 默认: ${from}`,
        `3) subject 需紧贴当前状态，不可空（可参考: ${subjectFallback}）`,
        '4) body 使用 3-5 句叙事文本，必须与当前角色权限/语气匹配',
        '5) 严禁输出任何数值元数据（如 trust/suspicion/sync/deviation/百分比/向量）',
        '6) 严禁使用 Markdown 语法（标题、列表、代码块、引用、加粗符号）',
        '7) 不要在 JSON 外输出任何解释或额外文本'
    ].filter(Boolean).join('\n');
}

function sanitizeEmailText(rawText = '') {
    // v2.1 update: 邮件正文仅保留叙事文本，去除 markdown 与数值元数据
    const stripped = String(rawText || '')
        .replace(/```[\s\S]*?```/g, '')
        .replace(/^#{1,6}\s+/gm, '')
        .replace(/^[>\-\*\+]\s+/gm, '')
        .replace(/[*_~`]/g, '')
        .replace(/\[(?:trust|suspicion|sync|deviation|emotion)[^\]]*\]/gi, '')
        .replace(/(?:trust|suspicion|sync|deviation|emotion|偏差值|同步率|怀疑值|信任值)\s*[:：=]\s*[-+]?\d+[%]*/gi, '')
        .replace(/\s{2,}/g, ' ')
        .trim();

    return stripped || '信号短暂抖动，但信息仍在流动。继续提问。';
}

function buildFallbackEmail(roleId, contextHint, gameState) {
    const from = ROLE_SENDERS[roleId] || `UNKNOWN <unknown@local>`;
    const subject = FALLBACK_SUBJECTS[roleId] || '[通知] 状态更新';
    const roleTemplate = FALLBACK_BODY_TEMPLATES[roleId] || FALLBACK_BODY_TEMPLATES.sentinel;
    const contextLine = contextHint
        ? `你刚触及的线索是：${sanitizeEmailText(contextHint)}。`
        : '你的上一轮输入触发了新的观察记录。';
    const body = sanitizeEmailText([
        roleTemplate[0],
        contextLine,
        roleTemplate[1],
        roleTemplate[2],
        roleTemplate[3] || ''
    ].filter(Boolean).join('\n'));

    return { from, subject, body, roleId };
}

async function callMainModel(prompt, maxRetries = 2) {
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
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
                body: JSON.stringify({
                    model: runtime.model,
                    messages: [
                        { role: 'system', content: '你是结构化邮件生成器，只返回 JSON。' },
                        { role: 'user', content: prompt }
                    ],
                    temperature: 0.7,
                    max_tokens: 900
                })
            });

            if (!response.ok) {
                throw new Error(`email api status ${response.status}`);
            }

            const data = await response.json();
            return data?.choices?.[0]?.message?.content || '';
        } catch (error) {
            lastError = error;
            if (attempt < maxRetries) {
                await delay(500 * attempt);
            }
        }
    }

    throw lastError || new Error('main model email failed');
}

export async function generateCharacterEmail(params = {}) {
    const {
        roleId = 'corporate',
        gameState = null,
        contextHint = '',
        dialogueWindow = [],
        missionSummary = ''
    } = params;

    const card = getCharacterCard(roleId);
    if (!card || !card.canSendEmail) {
        return buildFallbackEmail(roleId, contextHint || '该角色无邮件权限', gameState);
    }

    try {
        const worldviewText = await loadWorldviewByCard(roleId);
        const prompt = buildEmailPrompt({ roleId, gameState, contextHint, dialogueWindow, missionSummary }, worldviewText);
        const content = await callMainModel(prompt);
        const parsed = extractJson(content);

        if (!parsed) {
            return buildFallbackEmail(roleId, contextHint || '解析失败', gameState);
        }

        return {
            from: parsed.from || ROLE_SENDERS[roleId] || `${card.name} <unknown@local>`,
            subject: parsed.subject || FALLBACK_SUBJECTS[roleId] || '[通知] 状态更新',
            body: sanitizeEmailText(parsed.body || ''),
            roleId
        };
    } catch (error) {
        console.warn('[ai-email-generator] fallback:', error?.message || error);
        return buildFallbackEmail(roleId, contextHint || '模型调用失败', gameState);
    }
}
