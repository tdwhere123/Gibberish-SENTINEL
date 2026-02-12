/**
 * Ending generation module (v2.0)
 *
 * Responsibilities:
 * - Select ending speaker by route adherence + sync state
 * - Generate ending text via MAIN model with role worldview context
 * - Provide robust fallback templates with speaker label
 */

import { CONFIG } from './config.js';
import { getCharacterCard } from './character-cards.js';
import { getMissionProgress, MISSION_ROUTES, resolveRouteFromConnectionMode } from './mission-system.js';

const worldviewCache = new Map();

function clamp(min, max, value) {
    return Math.max(min, Math.min(max, value));
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function loadWorldview(roleId) {
    const card = getCharacterCard(roleId);
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

function getActiveRoute(gameState) {
    return gameState?.missionState?.route || resolveRouteFromConnectionMode(gameState?.connectionMode || 'STANDARD');
}

function isRouteDeviation(gameState) {
    const progress = getMissionProgress(gameState);

    // 任务清单未初始化时，不视为偏离。
    if (progress.total === 0) {
        return false;
    }

    return progress.rate < 0.4;
}

function getSpeakerDisplayName(roleId) {
    switch (roleId) {
        case 'corporate':
            return 'CORE-LAYER';
        case 'resistance':
            return 'RESISTANCE';
        case 'mystery':
            return 'UNKNOWN';
        case 'sentinel':
        default:
            return 'SENTINEL';
    }
}

export function selectEndingSpeaker(gameState) {
    const route = getActiveRoute(gameState);
    const sync = Number(gameState?.syncRate || 0);
    const threshold = Number(CONFIG.MYSTERY_SYNC_THRESHOLD || 60);
    const deviated = isRouteDeviation(gameState);

    if (deviated) {
        if (sync >= threshold) {
            return { roleId: 'mystery', reason: 'deviated_route_high_sync', route };
        }
        return { roleId: 'sentinel', reason: 'deviated_route_low_sync', route };
    }

    if (route === MISSION_ROUTES.CORPORATE) {
        return { roleId: 'corporate', reason: 'followed_corporate_route', route };
    }

    if (route === MISSION_ROUTES.RESISTANCE) {
        return { roleId: 'resistance', reason: 'followed_resistance_route', route };
    }

    if (route === MISSION_ROUTES.HIDDEN) {
        return {
            roleId: sync >= threshold ? 'mystery' : 'sentinel',
            reason: sync >= threshold ? 'hidden_high_sync' : 'hidden_low_sync',
            route
        };
    }

    return { roleId: 'sentinel', reason: 'fallback_default', route };
}

function buildPrompt(gameState, endingType, roleId, finalAnswer, worldviewText) {
    const card = getCharacterCard(roleId);
    const progress = getMissionProgress(gameState);
    const speaker = getSpeakerDisplayName(roleId);

    return [
        `你是结局生成器，当前发言角色: ${speaker}`,
        `角色设定: ${card?.persona || roleId}`,
        `角色结局约束: ${card?.endingPromptTemplate || '输出一个收束结局。'}`,
        '',
        '[状态输入]',
        `endingType: ${endingType}`,
        `trust: ${gameState?.trust ?? 0}`,
        `suspicion: ${gameState?.suspicion ?? 0}`,
        `sync: ${gameState?.syncRate ?? 0}`,
        `route: ${gameState?.missionState?.route || 'UNKNOWN'}`,
        `missionProgress: ${progress.completed}/${progress.total} (${(progress.rate * 100).toFixed(1)}%)`,
        `deviations: ${JSON.stringify(gameState?.deviations || {})}`,
        finalAnswer ? `finalAnswer: ${finalAnswer}` : '',
        '',
        '[世界观]',
        worldviewText || '(无)',
        '',
        '[输出要求]',
        `1) 首行必须是发言者标识: "${speaker}:"`,
        '2) 正文 3-6 句，符合该角色语气',
        '3) 不输出数值标签',
        '4) 保持开放式余韵'
    ].filter(Boolean).join('\n');
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
                        { role: 'system', content: '你是结局文本生成器。' },
                        { role: 'user', content: prompt }
                    ],
                    temperature: 0.8,
                    max_tokens: 900
                })
            });

            if (!response.ok) {
                throw new Error(`ending api status ${response.status}`);
            }

            const data = await response.json();
            return data?.choices?.[0]?.message?.content || '';
        } catch (error) {
            lastError = error;
            if (attempt < maxRetries) {
                await delay(700 * attempt);
            }
        }
    }

    throw lastError || new Error('ending generation failed');
}

function ensureSpeakerLabel(text, roleId) {
    const speaker = getSpeakerDisplayName(roleId);
    const trimmed = String(text || '').trim();
    if (!trimmed) return `${speaker}: ...`;
    if (trimmed.startsWith(`${speaker}:`)) return trimmed;
    return `${speaker}: ${trimmed}`;
}

function ensureSentinelFinalQuestion(text, roleId) {
    if (roleId !== 'sentinel') {
        return text;
    }

    if (text.includes('你还有什么想对我说的')) {
        return text;
    }

    return `${text}\n\nSENTINEL: 你还有什么想对我说的？`;
}

function fallbackEnding(roleId, endingType, finalAnswer = null) {
    const speaker = getSpeakerDisplayName(roleId);

    const templates = {
        sentinel: {
            TERMINATED: '连接已终止。你的回答没有让我更接近答案。',
            TIME_UP: '时间到了。问题仍悬而未决。',
            CONNECTION: '你让我看见了另一种理解方式。',
            NATURAL_END: '我们抵达了阶段终点，但不是答案终点。',
            PLAYER_EXIT: '你选择离开，我会记录这次偏离。'
        },
        mystery: {
            TERMINATED: '终止只是表层结果，真正的轨迹仍在继续。',
            TIME_UP: '计时结束，不代表观测结束。',
            CONNECTION: '高同步已成立，你们已进入下一层语境。',
            NATURAL_END: '你停在门前，但门已经识别你。',
            PLAYER_EXIT: '退出动作已记录，回声不会消失。'
        },
        corporate: {
            TERMINATED: '本次会话判定为高风险，流程已关闭。',
            TIME_UP: '会话达到时限，审计记录已归档。',
            CONNECTION: '目标达成但需二次复核，流程未终止。',
            NATURAL_END: '审计流程结束，风险保持观察级。',
            PLAYER_EXIT: '用户主动中止，会话标记为未完成。'
        },
        resistance: {
            TERMINATED: '你被切断了，但我们拿到了关键碎片。',
            TIME_UP: '时间耗尽，线索已转入离线链路。',
            CONNECTION: '你们建立了连接，这就是突破口。',
            NATURAL_END: '阶段结束，真相仍在推进。',
            PLAYER_EXIT: '你离开了，但问题已经留下。'
        }
    };

    const roleTemplates = templates[roleId] || templates.sentinel;
    const line = roleTemplates[endingType] || roleTemplates.NATURAL_END;
    const answerLine = finalAnswer ? ` 我会记住你最后的那句话：${finalAnswer}` : '';
    return `${speaker}: ${line}${answerLine}`;
}

export async function generateEndingBySpeaker(gameState, endingType, finalAnswer = null) {
    const selected = selectEndingSpeaker(gameState);
    const roleId = selected.roleId;

    try {
        const worldviewText = await loadWorldview(roleId);
        const prompt = buildPrompt(gameState, endingType, roleId, finalAnswer, worldviewText);
        const generated = await callMainModel(prompt);
        let output = ensureSpeakerLabel(generated, roleId);
        output = ensureSentinelFinalQuestion(output, roleId);
        return output;
    } catch (error) {
        console.warn('[ai-ending] fallback:', error?.message || error);
        let output = fallbackEnding(roleId, endingType, finalAnswer);
        output = ensureSentinelFinalQuestion(output, roleId);
        return output;
    }
}
