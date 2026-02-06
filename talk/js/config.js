/**
 * 配置文件
 * 存放API密钥和游戏常量
 */
export const CONFIG = {
    // 1. 修正后的 API 路径 (中转商通常支持 /v1/chat/completions)
    API_URL: 'https://yunwu.zeabur.app/v1/chat/completions',
    // 2. 你的 API KEY (保持现状)
    API_KEY: 'sk-hnZUSovMGuQaFLIxkGu9Y6ZidXu1cTB63Md5nDB3s87Irfsn',
    MODEL: 'gemini-3-flash-preview',

    // 游戏时长配置
    GAME_DURATION: 900,      // 总时长（秒）= 15分钟
    MAX_ROUNDS: 80,          // 最大对话轮数

    // 初始数值
    INITIAL_SUSPICION: 30,   // 初始怀疑度
    INITIAL_TRUST: 10,       // 初始信任度

    // 阈值配置
    SUSPICION_THRESHOLD: 90, // 游戏结束怀疑度阈值
    TRUST_BREAKTHROUGH: 80,  // 信任突破阈值
    AWAKENING_TRUST: 70,     // 觉醒结局信任阈值

    // 存储键名
    SAVE_KEY: 'sentinel_save_v1'
};
