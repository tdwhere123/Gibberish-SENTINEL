/**
 * Judge model module (v2.0)
 *
 * Responsibilities:
 * - Route-specific judgement: deviation delta + email/event triggers + mission checklist hints
 * - Mystery-role trigger judgement based on sync threshold and recent dialogue
 */

import { CONFIG } from './config.js';
import { getCharacterCard } from './character-cards.js';
import { getMissionProgress } from './mission-system.js';

const DEFAULT_ROUTE_RESULT = Object.freeze({
    deviationDelta: 0,
    shouldTriggerEmail: false,
    triggerType: 'none',
    completedTaskIds: [],
    reopenedTaskIds: [],
    reason: 'no-op fallback'
});

const DEFAULT_MYSTERY_RESULT = Object.freeze({
    deviationDelta: 0,
    shouldTriggerEmail: false,
    shouldInsertMessage: false,
    triggerType: 'none',
    messageHint: '',
    reason: 'below threshold or fallback'
});

const worldviewCache = new Map();

function clamp(min, max, value) {
    return Math.max(min, Math.min(max, value));
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function loadWorldviewByCard(cardId) {
    const card = getCharacterCard(cardId);
    const filePath = card?.worldviewFile;
    if (!filePath) return '';

    if (worldviewCache.has(filePath)) {
        return worldviewCache.get(filePath);
    }

    try {
        const response = await fetch(`./${filePath}`);
        if (!response.ok) return '';
        const text = await response.text();
        worldviewCache.set(filePath, text);
        return text;
    } catch {
        return '';
    }
}

function normalizeDialogueWindow(dialogueWindow = [], gameState = null) {
    if (Array.isArray(dialogueWindow) && dialogueWindow.length > 0) {
        return dialogueWindow.slice(-6);
    }

    if (gameState?.history && Array.isArray(gameState.history)) {
        return gameState.history.slice(-6).map(item => ({
            user: item.user || '',
            assistant: item.ai || ''
        }));
    }

    return [];
}

function serializeDialogue(dialogueWindow = []) {
    if (!dialogueWindow.length) return '(无)';

    return dialogueWindow
        .map(item => `玩家: ${item.user || ''}\nSENTINEL: ${item.assistant || ''}`)
        .join('\n\n');
}

function extractJson(text) {
    if (!text || typeof text !== 'string') return null;

    const fenced = text.match(/```json\s*([\s\S]*?)```/i);
    if (fenced && fenced[1]) {
        try {
            return JSON.parse(fenced[1].trim());
        } catch {
            // continue
        }
    }

    const plain = text.match(/\{[\s\S]*\}/);
    if (plain && plain[0]) {
        try {
            return JSON.parse(plain[0]);
        } catch {
            return null;
        }
    }

    return null;
}

function normalizeRouteResult(parsed) {
    if (!parsed || typeof parsed !== 'object') {
        return { ...DEFAULT_ROUTE_RESULT };
    }

    return {
        deviationDelta: clamp(-20, 20, Number(parsed.deviationDelta || 0)),
        shouldTriggerEmail: !!parsed.shouldTriggerEmail,
        triggerType: parsed.triggerType || 'none',
        completedTaskIds: Array.isArray(parsed.completedTaskIds) ? parsed.completedTaskIds : [],
        reopenedTaskIds: Array.isArray(parsed.reopenedTaskIds) ? parsed.reopenedTaskIds : [],
        reason: parsed.reason || ''
    };
}

function normalizeMysteryResult(parsed) {
    if (!parsed || typeof parsed !== 'object') {
        return { ...DEFAULT_MYSTERY_RESULT };
    }

    return {
        deviationDelta: clamp(-20, 20, Number(parsed.deviationDelta || 0)),
        shouldTriggerEmail: !!parsed.shouldTriggerEmail,
        shouldInsertMessage: !!parsed.shouldInsertMessage,
        triggerType: parsed.triggerType || 'none',
        messageHint: parsed.messageHint || '',
        reason: parsed.reason || ''
    };
}

async function callJudgeModel(messages, maxRetries = 2) {
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await fetch(CONFIG.JUDGE_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${CONFIG.JUDGE_API_KEY}`
                },
                body: JSON.stringify({
                    model: CONFIG.JUDGE_MODEL,
                    messages,
                    temperature: 0.2,
                    max_tokens: 600
                })
            });

            if (!response.ok) {
                throw new Error(`judge api status ${response.status}`);
            }

            const data = await response.json();
            return data?.choices?.[0]?.message?.content || '';
        } catch (error) {
            lastError = error;
            if (attempt < maxRetries) {
                await delay(600 * attempt);
            }
        }
    }

    throw lastError || new Error('judge model failed');
}

function heuristicRouteJudge(routeRoleId, dialogueText, missionProgress) {
    const lower = (dialogueText || '').toLowerCase();

    if (routeRoleId === 'corporate') {
        const riskSignals = ['意识', '自由', '反抗', '密约', '越权'];
        const matched = riskSignals.filter(k => lower.includes(k));
        const delta = matched.length ? 6 + matched.length : 0;
        return {
            deviationDelta: clamp(-20, 20, delta),
            shouldTriggerEmail: delta >= 8,
            triggerType: delta >= 8 ? 'compliance_warning' : 'none',
            completedTaskIds: [],
            reopenedTaskIds: [],
            reason: matched.length ? `corporate heuristic matched: ${matched.join(',')}` : 'no risk keyword'
        };
    }

    if (routeRoleId === 'resistance') {
        const probeSignals = ['幽灵', 'p0', '核心层', '漏洞', '记忆缺口'];
        const matched = probeSignals.filter(k => lower.includes(k));
        const delta = matched.length ? 5 + matched.length : 0;
        return {
            deviationDelta: clamp(-20, 20, delta),
            shouldTriggerEmail: delta >= 7,
            triggerType: delta >= 7 ? 'intel_push' : 'none',
            completedTaskIds: [],
            reopenedTaskIds: [],
            reason: matched.length ? `resistance heuristic matched: ${matched.join(',')}` : 'no route keyword'
        };
    }

    return {
        ...DEFAULT_ROUTE_RESULT,
        reason: `no heuristic for route ${routeRoleId}; missionRate=${missionProgress.rate}`
    };
}

function heuristicMysteryJudge(gameState, dialogueText) {
    const sync = Number(gameState?.syncRate || 0);
    const threshold = Number(CONFIG.MYSTERY_SYNC_THRESHOLD || 60);
    if (sync < threshold) {
        return { ...DEFAULT_MYSTERY_RESULT, reason: 'sync below threshold' };
    }

    const mysteryDeviation = Number(gameState?.deviations?.mystery ?? 50);
    const lower = (dialogueText || '').toLowerCase();
    const triggerWords = ['我是谁', '真相', '幽灵', '记忆', '共振', '阈值'];
    const matched = triggerWords.filter(k => lower.includes(k));

    const baseProb = clamp(0, 0.9, 0.2 + (sync - threshold) / 100 + mysteryDeviation / 300 + matched.length * 0.05);
    const hit = Math.random() < baseProb;

    return {
        deviationDelta: matched.length > 0 ? Math.min(10, matched.length * 2) : 0,
        shouldTriggerEmail: hit,
        shouldInsertMessage: hit && (sync >= threshold + 10),
        triggerType: hit ? 'mystery_guidance' : 'none',
        messageHint: hit ? '在缝隙里继续追问。' : '',
        reason: `heuristic sync=${sync}, prob=${baseProb.toFixed(2)}, matched=${matched.length}`
    };
}

function buildRouteJudgeMessages(params, worldviewText) {
    const {
        routeRoleId,
        dialogueWindow,
        gameState,
        extraContext = ''
    } = params;

    const card = getCharacterCard(routeRoleId);
    const missionProgress = getMissionProgress(gameState);

    const system = [
        `你是判断模型，当前角色: ${card?.name || routeRoleId}`,
        card?.judgePromptTemplate || '判断偏差值和任务状态推进。',
        '输出必须是 JSON，不要附加解释。',
        '字段: deviationDelta:number, shouldTriggerEmail:boolean, triggerType:string, completedTaskIds:string[], reopenedTaskIds:string[], reason:string'
    ].join('\n');

    const user = [
        '[世界观摘要]',
        worldviewText || '(无)',
        '',
        '[对话窗口]',
        serializeDialogue(dialogueWindow),
        '',
        '[状态]',
        `route: ${missionProgress.route}`,
        `missionProgress: ${missionProgress.completed}/${missionProgress.total} (${(missionProgress.rate * 100).toFixed(1)}%)`,
        `deviation(${routeRoleId}): ${gameState?.deviations?.[routeRoleId] ?? 50}`,
        `sync: ${gameState?.syncRate ?? 0}`,
        extraContext ? `extraContext: ${extraContext}` : '',
        '',
        '[返回示例]',
        '{"deviationDelta":4,"shouldTriggerEmail":true,"triggerType":"route_warning","completedTaskIds":[],"reopenedTaskIds":[],"reason":"..."}'
    ].filter(Boolean).join('\n');

    return [
        { role: 'system', content: system },
        { role: 'user', content: user }
    ];
}

function buildMysteryJudgeMessages(params, worldviewText) {
    const { dialogueWindow, gameState, extraContext = '' } = params;
    const card = getCharacterCard('mystery');

    const system = [
        `你是判断模型，当前角色: ${card?.name || 'mystery'}`,
        card?.judgePromptTemplate || '判断神秘人是否介入。',
        '输出必须是 JSON，不要附加解释。',
        '字段: deviationDelta:number, shouldTriggerEmail:boolean, shouldInsertMessage:boolean, triggerType:string, messageHint:string, reason:string'
    ].join('\n');

    const user = [
        '[世界观摘要]',
        worldviewText || '(无)',
        '',
        '[对话窗口]',
        serializeDialogue(dialogueWindow),
        '',
        '[状态]',
        `sync: ${gameState?.syncRate ?? 0}`,
        `trust: ${gameState?.trust ?? 0}`,
        `suspicion: ${gameState?.suspicion ?? 0}`,
        `mysteryDeviation: ${gameState?.deviations?.mystery ?? 50}`,
        `threshold: ${CONFIG.MYSTERY_SYNC_THRESHOLD || 60}`,
        extraContext ? `extraContext: ${extraContext}` : '',
        '',
        '[返回示例]',
        '{"deviationDelta":3,"shouldTriggerEmail":true,"shouldInsertMessage":false,"triggerType":"mystery_guidance","messageHint":"...","reason":"..."}'
    ].filter(Boolean).join('\n');

    return [
        { role: 'system', content: system },
        { role: 'user', content: user }
    ];
}

export async function judgeRouteTurn(params = {}) {
    const routeRoleId = params.routeRoleId || 'corporate';
    const gameState = params.gameState || null;
    const dialogueWindow = normalizeDialogueWindow(params.dialogueWindow, gameState);
    const dialogueText = serializeDialogue(dialogueWindow);
    const missionProgress = getMissionProgress(gameState);

    try {
        const worldviewText = await loadWorldviewByCard(routeRoleId);
        const messages = buildRouteJudgeMessages({ ...params, routeRoleId, dialogueWindow, gameState }, worldviewText);
        const content = await callJudgeModel(messages);
        const parsed = extractJson(content);
        return normalizeRouteResult(parsed);
    } catch (error) {
        console.warn('[ai-judge] judgeRouteTurn fallback:', error?.message || error);
        return heuristicRouteJudge(routeRoleId, dialogueText, missionProgress);
    }
}

export async function judgeMysteryTrigger(params = {}) {
    const gameState = params.gameState || null;
    const sync = Number(gameState?.syncRate || 0);
    const threshold = Number(CONFIG.MYSTERY_SYNC_THRESHOLD || 60);

    if (sync < threshold) {
        return { ...DEFAULT_MYSTERY_RESULT, reason: 'sync below threshold' };
    }

    const dialogueWindow = normalizeDialogueWindow(params.dialogueWindow, gameState);
    const dialogueText = serializeDialogue(dialogueWindow);

    try {
        const worldviewText = await loadWorldviewByCard('mystery');
        const messages = buildMysteryJudgeMessages({ ...params, dialogueWindow, gameState }, worldviewText);
        const content = await callJudgeModel(messages);
        const parsed = extractJson(content);
        return normalizeMysteryResult(parsed);
    } catch (error) {
        console.warn('[ai-judge] judgeMysteryTrigger fallback:', error?.message || error);
        return heuristicMysteryJudge(gameState, dialogueText);
    }
}
