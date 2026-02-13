import { CONFIG } from './config.js';

const STORAGE_KEY = 'sentinel_runtime_api_config_v1';

const DEFAULTS = {
    baseUrl: (window.__APP_CONFIG__?.baseUrl || CONFIG.MAIN_API_URL || '').trim(),
    apiKey: (window.__APP_CONFIG__?.apiKey || '').trim(),
    model: (window.__APP_CONFIG__?.model || CONFIG.MAIN_MODEL || CONFIG.MODEL || '').trim(),
    temperature: Number(window.__APP_CONFIG__?.temperature ?? 0.8),
    maxTokens: Number(window.__APP_CONFIG__?.maxTokens ?? 1200),
    tested: false,
    lastTestStatus: '未配置',
    lastError: ''
};

let cache = null;

function normalize(cfg = {}) {
    return {
        baseUrl: String(cfg.baseUrl || '').trim(),
        apiKey: String(cfg.apiKey || '').trim(),
        model: String(cfg.model || '').trim(),
        temperature: Number.isFinite(Number(cfg.temperature)) ? Number(cfg.temperature) : 0.8,
        maxTokens: Number.isFinite(Number(cfg.maxTokens)) ? Number(cfg.maxTokens) : 1200,
        tested: Boolean(cfg.tested),
        lastTestStatus: cfg.lastTestStatus || '未配置',
        lastError: cfg.lastError || ''
    };
}

export function getRuntimeConfig() {
    if (cache) return { ...cache };

    let stored = {};
    try {
        stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch {
        stored = {};
    }

    cache = normalize({ ...DEFAULTS, ...stored });
    return { ...cache };
}

export function saveRuntimeConfig(patch = {}) {
    const next = normalize({ ...getRuntimeConfig(), ...patch });
    cache = next;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return { ...next };
}

export function buildLLMRequestOptions(override = {}) {
    const cfg = getRuntimeConfig();
    return {
        url: override.url || cfg.baseUrl,
        apiKey: override.apiKey || cfg.apiKey,
        model: override.model || cfg.model,
        temperature: Number(override.temperature ?? cfg.temperature),
        max_tokens: Number(override.max_tokens ?? cfg.maxTokens)
    };
}

export function getConnectionSummary() {
    const cfg = getRuntimeConfig();
    if (!cfg.baseUrl || !cfg.model) return '模型未配置';
    if (cfg.tested) return `模型已连接（${cfg.model} @ ${cfg.baseUrl}）`;
    return '模型未验证，回复可能失败';
}

export function isModelReady() {
    const cfg = getRuntimeConfig();
    return Boolean(cfg.baseUrl && cfg.apiKey && cfg.model && cfg.tested);
}

export async function testRuntimeConnection(inputConfig) {
    const merged = normalize({ ...getRuntimeConfig(), ...inputConfig });
    if (!merged.baseUrl || !merged.apiKey || !merged.model) {
        return saveRuntimeConfig({ ...merged, tested: false, lastTestStatus: '未配置', lastError: '请填写 Base URL / API Key / Model' });
    }

    try {
        const response = await fetch(merged.baseUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${merged.apiKey}`
            },
            body: JSON.stringify({
                model: merged.model,
                messages: [{ role: 'user', content: 'ping' }],
                temperature: 0,
                max_tokens: 8
            })
        });

        if (!response.ok) {
            return saveRuntimeConfig({ ...merged, tested: false, lastTestStatus: `验证失败(${response.status})`, lastError: `HTTP ${response.status}` });
        }

        return saveRuntimeConfig({ ...merged, tested: true, lastTestStatus: '验证成功', lastError: '' });
    } catch (error) {
        return saveRuntimeConfig({ ...merged, tested: false, lastTestStatus: '验证失败(network)', lastError: String(error.message || error) });
    }
}
