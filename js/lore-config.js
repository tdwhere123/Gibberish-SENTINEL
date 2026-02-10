/**
 * 世界观锚点配置（单一事实源）
 * 用于统一 UI、Prompt、文档中的关键叙事常量
 */
export const LORE_CONFIG = {
    VERSION: '3.8',
    CURRENT_YEAR: 2048,
    SENTINEL_LAUNCH_YEAR: 2038,

    // 对话轮次口径
    MAX_ROUNDS: 90,
    BASE_ROUNDS: 24,
    STAGE_ONE_END: 5,
    STAGE_TWO_END: 15,

    // 关键人口比例口径
    HUMAN_MODIFIED_PERCENT: 98,
    PRIMORDIAL_MAX_COUNT: 5000
};

export function getVersionLabel() {
    return `SENTINEL v${LORE_CONFIG.VERSION}`;
}

export function getPopulationAnchorText() {
    return `${LORE_CONFIG.HUMAN_MODIFIED_PERCENT}%人类已改造，未改造者不到${LORE_CONFIG.PRIMORDIAL_MAX_COUNT}人`;
}
