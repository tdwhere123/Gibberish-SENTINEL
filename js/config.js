import { LORE_CONFIG } from './lore-config.js';

/**
 * 配置文件
 * 存放API密钥和游戏常量
 */
export const CONFIG = {
    // API 配置
    API_URL: 'https://open.cherryin.ai/v1/chat/completions',
    API_KEY: 'sk-sMD5HWXXZCWL0JOojrmDpL8Q0pjyP8DpwBfKYNVukBE83Zqg',
    MODEL: 'anthropic/claude-haiku-4.5',

    // 游戏时长配置
    GAME_DURATION: 900,      // 总时长（秒）= 15分钟
    MAX_ROUNDS: LORE_CONFIG.MAX_ROUNDS, // 最大对话轮数（硬上限）

    // 初始数值
    INITIAL_SUSPICION: 20,   // 初始怀疑度（较低，SENTINEL主动联系）
    INITIAL_TRUST: 20,       // 初始信任度（中立开始）

    // 阈值配置
    SUSPICION_THRESHOLD: 100, // 被终止的怀疑度阈值
    TRUST_BREAKTHROUGH: 100,  // 达成连接的信任阈值

    // 存储键名
    SAVE_KEY: 'sentinel_save_v2'
};
