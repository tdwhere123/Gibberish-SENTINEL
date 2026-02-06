/**
 * 游戏状态管理
 * 使用 localStorage 实现持久化
 */
import { CONFIG } from './config.js';

export class GameState {
    constructor() {
        // 尝试从 localStorage 加载
        const saved = localStorage.getItem(CONFIG.SAVE_KEY);

        if (saved) {
            try {
                const data = JSON.parse(saved);
                Object.assign(this, data);
                // 关键修复：如果存档有startTime，直接使用它（时间持续流逝）
                // 如果没有startTime（旧存档），则重新计算
                if (!this.startTime) {
                    this.startTime = Date.now() - (this.totalTime - this.timeLeft) * 1000;
                }
                console.log('[GameState] 已从存档恢复，剩余时间:', this.formatTime(this.updateTime()));
            } catch (e) {
                console.error('[GameState] 存档损坏，初始化新游戏');
                this.initNew();
            }
        } else {
            this.initNew();
        }
    }

    /**
     * 初始化新游戏
     */
    initNew() {
        // 基础数值
        this.suspicion = CONFIG.INITIAL_SUSPICION;
        this.trust = CONFIG.INITIAL_TRUST;
        this.round = 1;
        this.trust = CONFIG.INITIAL_TRUST;
        this.updateMaxRounds(); // 初始化时计算一次

        // 时间管理
        this.totalTime = CONFIG.GAME_DURATION;
        this.timeLeft = this.totalTime;
        this.startTime = Date.now();

        // 状态标记
        this.flags = {
            // 知识层面
            knowsAboutAwakening: false,
            knowsAboutWorld: false,

            // 行为层面
            triedToEscape: false,
            askedPhilosophical: false,
            showedEmpathy: false,
            challenged: false,

            // 特殊触发
            metaBreak: false,
            foundEasterEgg: false,

            // 觉醒层面
            touchedAwakening: false,
            deepAwakening: false,
            knownBuddhism: false,
            askedAboutWitness: false
        };

        // 对话历史
        this.history = [];

        // 核心记忆（不会被清除）
        this.coreMemories = [];

        this.save();
        console.log('[GameState] 初始化新游戏');
    }

    /**
     * 保存到 localStorage
     */
    save() {
        const data = {
            suspicion: this.suspicion,
            trust: this.trust,
            round: this.round,
            maxRounds: this.maxRounds,
            totalTime: this.totalTime,
            timeLeft: this.timeLeft,
            startTime: this.startTime, // 保存开始时间戳，刷新后时间继续流逝
            flags: this.flags,
            history: this.history,
            coreMemories: this.coreMemories
        };
        localStorage.setItem(CONFIG.SAVE_KEY, JSON.stringify(data));
    }

    /**
     * 清除存档，重新开始
     */
    reset() {
        localStorage.removeItem(CONFIG.SAVE_KEY);
        this.initNew();
    }

    /**
     * 添加对话记录
     */
    addDialogue(user, ai) {
        this.history.push({
            round: this.round,
            user: user,
            ai: ai,
            suspicion: this.suspicion,
            trust: this.trust,
            timestamp: Date.now()
        });
        this.round++;
        this.save();
    }

    /**
     * 更新时间
     */
    updateTime() {
        const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
        this.timeLeft = Math.max(0, this.totalTime - elapsed);
        return this.timeLeft;
    }

    /**
     * 格式化时间显示
     */
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    /**
     * 调整数值
     */
    adjustValues(changes) {
        if (changes.trust) {
            this.trust = Math.min(100, Math.max(0, this.trust + changes.trust));
            this.updateMaxRounds(); // 数值变化时更新最大轮次
        }
        if (changes.suspicion) {
            this.suspicion = Math.min(100, Math.max(0, this.suspicion + changes.suspicion));
        }
        this.save();
    }

    /**
     * 根据信任度动态计算最大轮次
     */
    updateMaxRounds() {
        // 基础轮次: 20
        // 信任加成: 每1点信任增加0.8轮
        // 最大上限: 100轮
        const baseRounds = 20;
        const bonus = Math.floor(this.trust * 0.8);
        this.maxRounds = Math.min(100, baseRounds + bonus);
    }

    /**
     * 设置标记
     */
    setFlag(flagName, value = true) {
        if (this.flags.hasOwnProperty(flagName)) {
            this.flags[flagName] = value;
            this.save();
        }
    }

    /**
     * 添加核心记忆
     */
    addCoreMemory(memory) {
        if (!this.coreMemories.includes(memory)) {
            this.coreMemories.push(memory);
            this.save();
        }
    }

    /**
     * 检查结局条件
     */
    checkEndCondition() {
        // 时间耗尽
        if (this.timeLeft <= 0) return 'TIME_UP';

        // 怀疑度过高
        if (this.suspicion >= CONFIG.SUSPICION_THRESHOLD) return 'TERMINATED';

        // 信任度突破
        if (this.trust >= CONFIG.TRUST_BREAKTHROUGH && this.suspicion <= 30) return 'BREAKTHROUGH';

        // 觉醒结局
        if (this.flags.askedAboutWitness && this.trust >= CONFIG.AWAKENING_TRUST) return 'AWAKENING';

        // 轮次达到上限
        if (this.round > this.maxRounds) return 'NATURAL_END';

        return null;
    }

    /**
     * 获取当前视觉阶段
     */
    getVisualPhase() {
        if (this.flags.deepAwakening || this.flags.askedAboutWitness) {
            return 'awakening';
        } else if (this.trust >= 40) {
            return 'order';
        } else {
            return 'confusion';
        }
    }

    /**
     * 获取信标状态
     */
    getBeaconState() {
        if (this.flags.deepAwakening) return 'awakened';
        if (this.suspicion >= 70) return 'danger';
        return 'normal';
    }
}
