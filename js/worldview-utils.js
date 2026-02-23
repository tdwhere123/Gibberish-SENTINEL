const WORLDVIEW_EXTENDED_SEPARATOR = '---EXTENDED---';

const DEEP_HISTORY_TOPIC_IDS = Object.freeze([
    'treaty_detail',
    'crisis_detail',
    'p0_origin',
    'record_discrepancy',
    'modification_protocol',
    'new_humans_declaration',
    'resistance_history',
    'ghost_rumor'
]);

const DEEP_HISTORY_HINT_KEYWORDS = Object.freeze([
    '2033',
    '2037',
    '2038',
    '2043',
    '危机',
    '海峡',
    'P0',
    '条约',
    '太空协定',
    '改造协议',
    '新人类宣言',
    '起源',
    '历史',
    '档案',
    '版本'
]);

/**
 * 将 worldview 文本按核心层/扩展层分段。
 * 如果文件中不存在分隔符，则回退为完整文本全部视作核心层。
 *
 * @param {string} text - 原始 worldview 文本
 * @returns {{ core: string, extended: string, hasSeparator: boolean }}
 */
export function parseWorldviewSections(text) {
    const raw = String(text || '');
    const markerIndex = raw.indexOf(WORLDVIEW_EXTENDED_SEPARATOR);

    if (markerIndex < 0) {
        return {
            core: raw.trim(),
            extended: '',
            hasSeparator: false
        };
    }

    const core = raw.slice(0, markerIndex).trim();
    const extended = raw.slice(markerIndex + WORLDVIEW_EXTENDED_SEPARATOR.length).trim();

    return {
        core,
        extended,
        hasSeparator: true
    };
}

/**
 * 根据是否需要扩展层，生成用于 prompt 注入的 worldview 文本。
 * 如果文件未使用分隔符，返回完整文本以保持兼容。
 *
 * @param {string} text - 原始 worldview 文本
 * @param {{ includeExtended?: boolean }} [options]
 * @returns {string}
 */
export function buildWorldviewPromptText(text, options = {}) {
    const includeExtended = Boolean(options.includeExtended);
    const sections = parseWorldviewSections(text);

    if (!sections.hasSeparator) {
        return String(text || '').trim();
    }

    if (!includeExtended) {
        return sections.core;
    }

    if (!sections.extended) {
        return sections.core;
    }

    return `${sections.core}\n\n${sections.extended}`.trim();
}

/**
 * 根据当前同步率、话题和上下文提示判断是否需要加载 worldview 扩展层。
 * 规则：
 * - 默认仅加载核心层
 * - syncRate >= 40 时加载扩展层
 * - 深度历史话题或上下文提示命中关键历史词时加载扩展层
 *
 * @param {{
 *   gameState?: { syncRate?: number } | null,
 *   topic?: { id?: string, aiGoal?: string } | null,
 *   topicId?: string,
 *   contextHint?: string,
 *   extraContext?: string,
 *   textHints?: string[]
 * }} [options]
 * @returns {boolean}
 */
export function shouldLoadExtendedWorldview(options = {}) {
    const sync = Number(options?.gameState?.syncRate ?? 0);
    if (sync >= 40) {
        return true;
    }

    const topicId = String(options?.topic?.id || options?.topicId || '').trim();
    if (topicId && DEEP_HISTORY_TOPIC_IDS.includes(topicId)) {
        return true;
    }

    const hintBlob = [
        options?.topic?.aiGoal || '',
        options?.contextHint || '',
        options?.extraContext || '',
        ...(Array.isArray(options?.textHints) ? options.textHints : [])
    ]
        .join(' ')
        .toLowerCase();

    if (!hintBlob) {
        return false;
    }

    return DEEP_HISTORY_HINT_KEYWORDS.some(keyword => hintBlob.includes(String(keyword).toLowerCase()));
}

