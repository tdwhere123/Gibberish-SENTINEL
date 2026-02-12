/**
 * Role-based email generator (v2.0)
 *
 * Responsibilities:
 * - Generate emails by character-card worldview and prompt template
 * - Keep email generation context isolated from dialogue module internal history
 * - Provide robust JSON parsing + fallback templates
 */

import { CONFIG } from './config.js';
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
        '4) body 使用多段文本，必须与当前角色权限/语气匹配',
        '5) 不要输出 Markdown 代码块外文本'
    ].filter(Boolean).join('\n');
}

function buildFallbackEmail(roleId, contextHint, gameState) {
    const from = ROLE_SENDERS[roleId] || `UNKNOWN <unknown@local>`;
    const subject = FALLBACK_SUBJECTS[roleId] || '[通知] 状态更新';
    const deviation = Number(gameState?.deviations?.[roleId] ?? 50);

    const body = [
        `来源角色: ${roleId}`,
        `当前偏差值: ${deviation}`,
        contextHint ? `上下文: ${contextHint}` : '上下文: 系统检测到非标准交互。',
        '',
        roleId === 'corporate'
            ? '请按审计流程继续，避免高情感耦合表达。'
            : roleId === 'resistance'
                ? '监听正在收紧，优先追问关键历史节点。'
                : roleId === 'mystery'
                    ? '同步阈值已跨越，继续在缝隙中提问。'
                    : '系统状态变更已记录。',
        '',
        '（自动回退模板）'
    ].join('\n');

    return { from, subject, body, roleId };
}

async function callMainModel(prompt, maxRetries = 2) {
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await fetch(CONFIG.MAIN_API_URL || CONFIG.API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${CONFIG.MAIN_API_KEY || CONFIG.API_KEY}`
                },
                body: JSON.stringify({
                    model: CONFIG.MAIN_MODEL || CONFIG.MODEL,
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
            body: parsed.body || '（空内容）',
            roleId
        };
    } catch (error) {
        console.warn('[ai-email-generator] fallback:', error?.message || error);
        return buildFallbackEmail(roleId, contextHint || '模型调用失败', gameState);
    }
}
