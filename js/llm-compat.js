/**
 * OpenAI-compatible endpoint/response compatibility helpers.
 */

const NORMALIZATION_MODES = Object.freeze({
    SAFE: 'safe',
    FORCE_V1: 'force_v1',
    NONE: 'none'
});

/**
 * v2.2 update: Return readable mode constant.
 * @param {string} mode
 * @returns {string}
 */
export function resolveNormalizationMode(mode) {
    const normalized = String(mode || '').trim().toLowerCase();
    if (normalized === NORMALIZATION_MODES.NONE) return NORMALIZATION_MODES.NONE;
    if (normalized === NORMALIZATION_MODES.FORCE_V1) return NORMALIZATION_MODES.FORCE_V1;
    return NORMALIZATION_MODES.SAFE;
}

/**
 * v2.2 update: Normalize user-provided base URL to a chat-completions endpoint.
 * @param {string} rawUrl
 * @param {string} mode
 * @returns {string}
 */
export function normalizeChatCompletionsUrl(rawUrl, mode = NORMALIZATION_MODES.SAFE) {
    const trimmed = String(rawUrl || '').trim();
    if (!trimmed) return '';
    const resolvedMode = resolveNormalizationMode(mode);
    if (resolvedMode === NORMALIZATION_MODES.NONE) return trimmed.replace(/\/+$/, '');

    let normalized = trimmed.replace(/\/+$/, '');
    const lower = normalized.toLowerCase();

    if (lower.endsWith('/chat/completions')) return normalized;

    const hasVersionPath = /\/v\d+(\/|$)/.test(lower);
    const hasVendorSpecificPath = (
        lower.includes('/deployments/')
        || lower.includes('/openai/')
        || lower.includes('api-version=')
    );

    if (resolvedMode === NORMALIZATION_MODES.SAFE) {
        if (hasVersionPath || hasVendorSpecificPath) {
            return `${normalized}/chat/completions`;
        }
        return `${normalized}/v1/chat/completions`;
    }

    if (!hasVersionPath && !lower.endsWith('/v1')) {
        normalized = `${normalized}/v1`;
    }

    return `${normalized}/chat/completions`;
}

/**
 * v2.2 update: Read text payload from OpenAI-compatible responses across vendors.
 * @param {any} data
 * @returns {string}
 */
export function extractAssistantText(data) {
    const fromChoices = data?.choices?.[0]?.message?.content;
    if (typeof fromChoices === 'string' && fromChoices.trim()) return fromChoices;

    if (Array.isArray(fromChoices)) {
        const textParts = fromChoices
            .map(part => (typeof part?.text === 'string' ? part.text : ''))
            .filter(Boolean);
        if (textParts.length > 0) return textParts.join('\n');
    }

    const altMessage = data?.message?.content;
    if (typeof altMessage === 'string' && altMessage.trim()) return altMessage;

    const outputText = data?.output_text;
    if (typeof outputText === 'string' && outputText.trim()) return outputText;

    const output = data?.output;
    if (Array.isArray(output)) {
        for (const item of output) {
            const content = item?.content;
            if (!Array.isArray(content)) continue;
            const textParts = content
                .map(part => (typeof part?.text === 'string' ? part.text : ''))
                .filter(Boolean);
            if (textParts.length > 0) return textParts.join('\n');
        }
    }

    return '';
}

/**
 * v2.2 update: classify fetch status for easier diagnostics.
 * @param {Response} response
 * @returns {{ok: boolean, code: string, message: string}}
 */
export function classifyHttpStatus(response) {
    const status = Number(response?.status || 0);
    if (status >= 200 && status < 300) {
        return { ok: true, code: 'ok', message: 'OK' };
    }
    if (status === 401 || status === 403) {
        return { ok: false, code: 'auth_error', message: `HTTP ${status}（鉴权失败）` };
    }
    if (status === 429) {
        return { ok: false, code: 'rate_limited', message: 'HTTP 429（请求过于频繁）' };
    }
    if (status >= 500) {
        return { ok: false, code: 'server_error', message: `HTTP ${status}（服务端异常）` };
    }
    return { ok: false, code: 'http_error', message: `HTTP ${status}` };
}

/**
 * v2.2 update: summarize schema when an OpenAI-compatible payload is malformed.
 * @param {any} data
 * @returns {string}
 */
export function summarizeResponseShape(data) {
    if (!data || typeof data !== 'object') return 'non-object payload';
    const keys = Object.keys(data).slice(0, 10).join(', ') || 'no keys';
    const choicesType = Array.isArray(data.choices) ? 'array' : typeof data.choices;
    const outputType = Array.isArray(data.output) ? 'array' : typeof data.output;
    return `keys=[${keys}] choices=${choicesType} output=${outputType}`;
}
