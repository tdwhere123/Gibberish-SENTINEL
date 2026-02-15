/**
 * 配置文件（v2.0 过渡版）
 *
 * 说明:
 * - 主模型用于对话/邮件/结局生成。
 * - 判断模型用于偏差值与任务清单评估。
 * - 为保证重构过渡期兼容，保留 API_URL/API_KEY/MODEL 等旧字段别名。
 */
export const CONFIG = {
    // Main model (dialogue / email / ending)
    MAIN_API_URL: '',
    MAIN_API_KEY: '',
    MAIN_MODEL: 'gpt-4o-mini',

    // Judge model (deviation / mission checklist)
    JUDGE_API_URL: '',
    JUDGE_API_KEY: '',
    JUDGE_MODEL: 'gpt-4o-mini',

    // Game timing
    GAME_DURATION: 900,
    BASE_ROUNDS: 20,
    SYNC_BONUS_ROUNDS: [
        { syncThreshold: 30, bonusRounds: 3 },
        { syncThreshold: 60, bonusRounds: 5 },
        { syncThreshold: 80, bonusRounds: 7 }
    ],
    MYSTERY_SYNC_THRESHOLD: 60,

    // Initial values / thresholds
    INITIAL_SUSPICION: 20,
    INITIAL_TRUST: 20,
    SUSPICION_THRESHOLD: 100,
    TRUST_BREAKTHROUGH: 100,

    // v3 save key (no migration from v2)
    SAVE_KEY: 'sentinel_save_v3',

    // Time influence limits (seconds)
    TIME_INFLUENCE: {
        sentinel: { min: -300, max: 300 },
        others: { min: -60, max: 60 },
        othersCooldown: 180
    },

    // v2.1 update: role-based email cooldown (rounds)
    EMAIL_COOLDOWN_ROUNDS: Object.freeze({
        corporate: 6,
        resistance: 5,
        mystery: 8,
        sentinel: 6
    }),

    // Legacy aliases for v1.3 modules
    API_URL: '',
    API_KEY: '',
    MODEL: 'gpt-4o-mini',
    MAX_ROUNDS: 30
};
