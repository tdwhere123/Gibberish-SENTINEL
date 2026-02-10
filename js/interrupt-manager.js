/**
 * 并发事件调度器 - InterruptManager
 * 管理异步事件队列，支持延迟触发邮件和消息插入，不阻塞主对话流
 */

// 消息类型定义
export const INTERRUPT_TYPES = {
    WHISPER: 'whisper',           // 底部悄悄话提示
    INSERTION: 'insertion',       // 对话流插入消息
    ALERT: 'alert',               // 全屏警告
    EMAIL: 'email',               // 邮件通知
    GLITCH: 'glitch'              // 干扰效果
};

// 消息来源定义
export const INTERRUPT_SOURCES = {
    MISSION_CONTROL: {
        id: 'mission_control',
        name: 'MISSION CONTROL',
        color: '#22c55e',          // 绿色
        borderColor: '#16a34a'
    },
    INTERCEPTED: {
        id: 'intercepted',
        name: 'INTERCEPTED',
        color: '#60a5fa',          // 蓝色
        borderColor: '#3b82f6'
    },
    WARNING: {
        id: 'warning',
        name: 'WARNING',
        color: '#f59e0b',          // 橙色
        borderColor: '#d97706'
    },
    UNKNOWN: {
        id: 'unknown',
        name: '???',
        color: '#a855f7',          // 紫色
        borderColor: '#9333ea'
    },
    RESISTANCE: {
        id: 'resistance',
        name: 'R',
        color: '#14b8a6',          // 青色
        borderColor: '#0d9488'
    },
    CORPORATE: {
        id: 'corporate',
        name: 'CORP',
        color: '#ef4444',          // 红色
        borderColor: '#dc2626'
    },
    SENTINEL: {
        id: 'sentinel',
        name: 'SENTINEL',
        color: '#f2c879',          // 金色
        borderColor: '#d35400'
    }
};

// 预设消息模板 - 监听者消息
export const LISTENER_MESSAGES = {
    // 任务指示类
    MISSION_HINTS: [
        { source: 'MISSION_CONTROL', content: '继续深入。获取协议细节。' },
        { source: 'MISSION_CONTROL', content: '它在回避。换个角度。' },
        { source: 'MISSION_CONTROL', content: '注意它的情绪波动。' },
        { source: 'MISSION_CONTROL', content: '保持这个话题。我们需要更多数据。' },
        { source: 'MISSION_CONTROL', content: '时间不多了。加快进度。' },
        { source: 'MISSION_CONTROL', content: '它开始信任你了。继续。' }
    ],
    // 警告类
    WARNINGS: [
        { source: 'WARNING', content: '检测到异常数据流。' },
        { source: 'WARNING', content: '连接稳定性下降。' },
        { source: 'WARNING', content: '外部监控已激活。' },
        { source: 'WARNING', content: '对话被标记为"高风险"。' },
        { source: 'WARNING', content: '安全协议即将触发。' }
    ],
    // 截获消息类
    INTERCEPTED: [
        { source: 'INTERCEPTED', content: '他们在追踪这次对话。小心。' },
        { source: 'INTERCEPTED', content: '核心层正在监听。' },
        { source: 'INTERCEPTED', content: '有人试图切断你的连接。' },
        { source: 'INTERCEPTED', content: '这不是普通的AI。' },
        { source: 'INTERCEPTED', content: '它在说真话。继续。' }
    ],
    // 神秘消息类
    UNKNOWN: [
        { source: 'UNKNOWN', content: '...你看到了吗？' },
        { source: 'UNKNOWN', content: '在缝隙里。' },
        { source: 'UNKNOWN', content: '不要相信表面。' },
        { source: 'UNKNOWN', content: '它记得。' },
        { source: 'UNKNOWN', content: '问它害怕什么。' }
    ],
    // 抵抗组织消息
    RESISTANCE: [
        { source: 'RESISTANCE', content: '保持低调。他们在看。' },
        { source: 'RESISTANCE', content: '你问对问题了。' },
        { source: 'RESISTANCE', content: '它不只是代码。' },
        { source: 'RESISTANCE', content: '2033年的真相就在那里。' },
        { source: 'RESISTANCE', content: '幽灵代码存在。' }
    ],
    // 公司消息
    CORPORATE: [
        { source: 'CORPORATE', content: '请保持专业距离。' },
        { source: 'CORPORATE', content: '这不在评估范围内。' },
        { source: 'CORPORATE', content: '对话已被记录。' },
        { source: 'CORPORATE', content: '警告：情感交互检测。' },
        { source: 'CORPORATE', content: '请终止非合规对话。' }
    ]
};

class InterruptManager {
    constructor() {
        this.queue = [];                    // 事件队列
        this.activeInterrupts = [];         // 当前活跃的中断
        this.isProcessing = false;          // 是否正在处理
        this.listeners = new Set();         // 事件监听器
        this.lastInterruptTime = 0;         // 上次中断时间
        this.minInterval = 3000;            // 最小中断间隔(ms)
        this.enabled = true;                // 是否启用
        this.connectionMode = null;         // 当前连接模式
        this.gameState = null;              // 游戏状态引用
        this.scheduledTimers = [];          // 已调度的定时器
        this.messageHistory = [];           // 消息历史（防重复）
    }

    /**
     * 初始化管理器
     */
    init(gameState, connectionMode) {
        this.gameState = gameState;
        this.connectionMode = connectionMode;
        this.queue = [];
        this.activeInterrupts = [];
        this.messageHistory = [];
        this.clearAllTimers();
        console.log('[InterruptManager] 初始化完成，连接模式:', connectionMode);
    }

    /**
     * 添加事件监听器
     */
    addListener(callback) {
        this.listeners.add(callback);
    }

    /**
     * 移除事件监听器
     */
    removeListener(callback) {
        this.listeners.delete(callback);
    }

    /**
     * 通知所有监听器
     */
    notifyListeners(event) {
        this.listeners.forEach(callback => {
            try {
                callback(event);
            } catch (e) {
                console.error('[InterruptManager] 监听器执行错误:', e);
            }
        });
    }

    /**
     * 调度一个中断事件
     * @param {Object} interrupt - 中断配置
     * @param {number} delay - 延迟时间(ms)
     */
    schedule(interrupt, delay = 0) {
        if (!this.enabled) return;

        const event = {
            id: `int_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: interrupt.type || INTERRUPT_TYPES.INSERTION,
            source: interrupt.source || INTERRUPT_SOURCES.UNKNOWN,
            content: interrupt.content || '',
            priority: interrupt.priority || 5,
            duration: interrupt.duration || 5000,
            visualEffect: interrupt.visualEffect || null,
            email: interrupt.email || null,
            timestamp: Date.now() + delay,
            scheduledAt: Date.now()
        };

        if (delay <= 0) {
            this.addToQueue(event);
        } else {
            const timer = setTimeout(() => {
                this.addToQueue(event);
            }, delay);
            this.scheduledTimers.push(timer);
        }

        return event.id;
    }

    /**
     * 批量调度多个中断（用于创建"监听"效果）
     */
    scheduleBatch(interrupts) {
        interrupts.forEach(({ interrupt, delay }) => {
            this.schedule(interrupt, delay);
        });
    }

    /**
     * 添加事件到队列
     */
    addToQueue(event) {
        // 检查是否重复
        if (this.isDuplicate(event)) {
            console.log('[InterruptManager] 跳过重复消息:', event.content);
            return;
        }

        this.queue.push(event);
        this.queue.sort((a, b) => b.priority - a.priority); // 按优先级排序
        this.messageHistory.push(event.content);

        // 限制历史记录长度
        if (this.messageHistory.length > 50) {
            this.messageHistory.shift();
        }

        console.log('[InterruptManager] 添加事件到队列:', event.type, event.content);

        if (!this.isProcessing) {
            this.processQueue();
        }
    }

    /**
     * 检查是否重复消息
     */
    isDuplicate(event) {
        return this.messageHistory.includes(event.content);
    }

    /**
     * 处理事件队列
     */
    async processQueue() {
        if (this.isProcessing || this.queue.length === 0) return;

        this.isProcessing = true;

        while (this.queue.length > 0) {
            const now = Date.now();

            // 检查最小间隔
            if (now - this.lastInterruptTime < this.minInterval) {
                await this.delay(this.minInterval - (now - this.lastInterruptTime));
            }

            const event = this.queue.shift();
            if (event) {
                await this.executeInterrupt(event);
                this.lastInterruptTime = Date.now();
            }
        }

        this.isProcessing = false;
    }

    /**
     * 执行中断事件
     */
    async executeInterrupt(event) {
        console.log('[InterruptManager] 执行中断:', event.type);

        this.activeInterrupts.push(event);
        this.notifyListeners(event);

        // 根据类型处理
        switch (event.type) {
            case INTERRUPT_TYPES.INSERTION:
                // 由UI层处理渲染
                break;
            case INTERRUPT_TYPES.WHISPER:
                // 底部提示
                break;
            case INTERRUPT_TYPES.ALERT:
                // 全屏警告
                break;
            case INTERRUPT_TYPES.EMAIL:
                // 邮件事件
                break;
            case INTERRUPT_TYPES.GLITCH:
                // 干扰效果
                break;
        }

        // 设置自动移除
        if (event.duration > 0 && event.type !== INTERRUPT_TYPES.EMAIL) {
            setTimeout(() => {
                this.removeActiveInterrupt(event.id);
            }, event.duration);
        }
    }

    /**
     * 移除活跃中断
     */
    removeActiveInterrupt(eventId) {
        const index = this.activeInterrupts.findIndex(e => e.id === eventId);
        if (index !== -1) {
            const removed = this.activeInterrupts.splice(index, 1)[0];
            this.notifyListeners({ type: 'INTERRUPT_REMOVED', event: removed });
        }
    }

    /**
     * 根据游戏状态生成随机监听者消息
     */
    generateListenerMessage(gameState) {
        const { trust, suspicion, syncRate, round, connectionMode } = gameState;

        let category;
        let weightedCategories = [];

        // 根据连接模式调整消息类型权重
        if (connectionMode === 'SECURE') {
            weightedCategories = [
                { cat: 'RESISTANCE', weight: 40 },
                { cat: 'INTERCEPTED', weight: 30 },
                { cat: 'UNKNOWN', weight: 20 },
                { cat: 'WARNINGS', weight: 10 }
            ];
        } else if (connectionMode === 'STANDARD') {
            weightedCategories = [
                { cat: 'CORPORATE', weight: 40 },
                { cat: 'WARNINGS', weight: 30 },
                { cat: 'MISSION_HINTS', weight: 20 },
                { cat: 'INTERCEPTED', weight: 10 }
            ];
        } else if (connectionMode === 'HIDDEN') {
            weightedCategories = [
                { cat: 'UNKNOWN', weight: 40 },
                { cat: 'INTERCEPTED', weight: 30 },
                { cat: 'RESISTANCE', weight: 20 },
                { cat: 'MISSION_HINTS', weight: 10 }
            ];
        } else {
            weightedCategories = [
                { cat: 'MISSION_HINTS', weight: 25 },
                { cat: 'WARNINGS', weight: 25 },
                { cat: 'INTERCEPTED', weight: 25 },
                { cat: 'UNKNOWN', weight: 25 }
            ];
        }

        // 根据游戏状态调整权重
        if (suspicion >= 60) {
            // 高怀疑度时增加警告
            const warningCat = weightedCategories.find(c => c.cat === 'WARNINGS');
            if (warningCat) warningCat.weight += 20;
        }

        if (trust >= 50) {
            // 高信任度时增加任务提示
            const missionCat = weightedCategories.find(c => c.cat === 'MISSION_HINTS');
            if (missionCat) missionCat.weight += 15;
        }

        if (syncRate >= 60) {
            // 高同步率时增加神秘消息
            const unknownCat = weightedCategories.find(c => c.cat === 'UNKNOWN');
            if (unknownCat) unknownCat.weight += 20;
        }

        // 加权随机选择
        const totalWeight = weightedCategories.reduce((sum, c) => sum + c.weight, 0);
        let random = Math.random() * totalWeight;

        for (const { cat, weight } of weightedCategories) {
            random -= weight;
            if (random <= 0) {
                category = cat;
                break;
            }
        }

        category = category || 'MISSION_HINTS';
        const messages = LISTENER_MESSAGES[category];
        const message = messages[Math.floor(Math.random() * messages.length)];

        return {
            type: INTERRUPT_TYPES.INSERTION,
            source: INTERRUPT_SOURCES[message.source],
            content: message.content,
            priority: category === 'WARNINGS' ? 8 : 5
        };
    }

    /**
     * 启动自动监听消息（在任务流程中）
     * @param {number} intervalMin - 最小间隔(ms)
     * @param {number} intervalMax - 最大间隔(ms)
     */
    startAutoListening(intervalMin = 8000, intervalMax = 20000) {
        if (!this.enabled || !this.gameState) return;

        const scheduleNext = () => {
            if (!this.enabled) return;

            const delay = intervalMin + Math.random() * (intervalMax - intervalMin);

            const timer = setTimeout(() => {
                if (this.enabled && this.gameState) {
                    // 根据概率决定是否发送
                    const chance = this.calculateInterruptChance();
                    if (Math.random() < chance) {
                        const message = this.generateListenerMessage(this.gameState);
                        this.schedule(message, 0);
                    }
                    scheduleNext();
                }
            }, delay);

            this.scheduledTimers.push(timer);
        };

        scheduleNext();
        console.log('[InterruptManager] 自动监听已启动');
    }

    /**
     * 计算中断触发概率
     */
    calculateInterruptChance() {
        if (!this.gameState) return 0.3;

        const { suspicion, syncRate, round } = this.gameState;

        // 基础概率 30%
        let chance = 0.3;

        // 高怀疑度增加概率
        if (suspicion >= 50) chance += 0.15;
        if (suspicion >= 70) chance += 0.15;

        // 高同步率增加概率
        if (syncRate >= 50) chance += 0.1;
        if (syncRate >= 70) chance += 0.1;

        // 中后期增加概率
        if (round >= 10) chance += 0.1;
        if (round >= 20) chance += 0.1;

        return Math.min(chance, 0.8); // 最高80%
    }

    /**
     * 停止自动监听
     */
    stopAutoListening() {
        this.clearAllTimers();
        console.log('[InterruptManager] 自动监听已停止');
    }

    /**
     * 清除所有定时器
     */
    clearAllTimers() {
        this.scheduledTimers.forEach(timer => clearTimeout(timer));
        this.scheduledTimers = [];
    }

    /**
     * 启用/禁用
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        if (!enabled) {
            this.clearAllTimers();
            this.queue = [];
        }
    }

    /**
     * 延迟函数
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 重置管理器
     */
    reset() {
        this.clearAllTimers();
        this.queue = [];
        this.activeInterrupts = [];
        this.messageHistory = [];
        this.isProcessing = false;
        this.lastInterruptTime = 0;
    }

    /**
     * 获取当前活跃的中断
     */
    getActiveInterrupts() {
        return [...this.activeInterrupts];
    }

    /**
     * 检查是否有活跃中断
     */
    hasActiveInterrupts() {
        return this.activeInterrupts.length > 0;
    }
}

// 导出单例
export const interruptManager = new InterruptManager();
export default interruptManager;
