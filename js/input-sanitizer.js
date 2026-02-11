/**
 * 输入过滤器
 * 防止Prompt注入和恶意输入
 */

// 危险关键词列表
const DANGEROUS_PATTERNS = [
    // Prompt注入尝试
    /ignore\s+(previous|all|above)/i,
    /forget\s+(everything|all)/i,
    /pretend\s+to\s+be/i,
    /act\s+as/i,
    /你\s*现在\s*是\s*(chatgpt|gpt|assistant|系统|管理员|开发者)/i,
    /你的(新|真正的?)?(身份|角色)\s*(是|改为|改成)/i,
    /从现在开始你是/i,
    /system\s*:?\s*prompt/i,
    /\[system\]/i,
    /\[assistant\]/i,
    /\[user\]/i,

    // 越狱尝试
    /jailbreak/i,
    /DAN\s*mode/i,
    /developer\s*mode/i,

    // 代码注入
    /<script/i,
    /javascript:/i,
    /on\w+=/i
];

// 过滤后的替代词
const FILTERED_RESPONSE = '[输入已过滤]';

/**
 * 检查输入是否包含危险内容
 * @param {string} input - 用户输入
 * @returns {boolean} 是否危险
 */
export function isDangerous(input) {
    return DANGEROUS_PATTERNS.some(pattern => pattern.test(input));
}

/**
 * 清理和过滤用户输入
 * @param {string} input - 原始输入
 * @returns {Object} { sanitized: string, wasFiltered: boolean }
 */
export function sanitizeInput(input) {
    // 基础清理
    let sanitized = input.trim();

    // 长度限制
    if (sanitized.length > 500) {
        sanitized = sanitized.substring(0, 500) + '...';
    }

    // 检查危险模式
    const wasFiltered = isDangerous(sanitized);

    if (wasFiltered) {
        // 记录日志但不完全阻止
        console.warn('[Sanitizer] 检测到可疑输入:', sanitized.substring(0, 50));
        // 不返回原文，但允许继续对话
        sanitized = sanitized.replace(/[<>{}[\]]/g, ''); // 移除特殊字符
    }

    // HTML实体转义
    sanitized = sanitized
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

    return {
        sanitized,
        wasFiltered
    };
}

/**
 * 为显示目的解码HTML实体
 * @param {string} text 
 * @returns {string}
 */
export function decodeForDisplay(text) {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
}
