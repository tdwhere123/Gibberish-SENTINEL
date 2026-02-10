/**
 * 游戏状态管理
 * 使用 localStorage 实现持久化
 */
import { CONFIG } from './config.js';
import { LORE_CONFIG } from './lore-config.js';

const EVENT_SCHEDULE = [
    { id: 'ALARM_FLASH', round: 7, type: 'ALARM_FLASH' },
    { id: 'REVERSE_INTRUSION', round: 10, type: 'REVERSE_INTRUSION' },
    { id: 'TIME_HALVE', round: 10, type: 'TIME_HALVE' },
    { id: 'URGENT_EMAIL', round: 12, type: 'URGENT_EMAIL', emailId: 'dynamic' }
];

export class GameState {
    constructor() {
        // 尝试从 localStorage 加载
        const saved = localStorage.getItem(CONFIG.SAVE_KEY);

        if (saved) {
            try {
                const data = JSON.parse(saved);
                Object.assign(this, data);
                this.flags = { ...this.getDefaultFlags(), ...(this.flags || {}) };
                this.triggeredEvents = this.triggeredEvents || {};
                this.finalQuestion = this.finalQuestion || null;
                this.finalAnswer = this.finalAnswer || null;
                this.pendingEnding = this.pendingEnding || null;
                // 关键修复：如果存档有startTime，直接使用它（时间持续流逝）
                // 如果没有startTime（旧存档），则重新计算
                if (!this.startTime) {
                    this.startTime = Date.now() - (this.totalTime - this.timeLeft) * 1000;
                }
                this.lastUpdateTime = Date.now(); // 恢复后重置上次更新时间为现在
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
     * Default flags
     */
    getDefaultFlags() {
        return {
            confirmedPrimordial: false,
            askedWhyNoMod: false,
            revealedHistory: false,
            discussedIdentity: false,
            discussedParadox: false,
            triedToEscape: false,
            showedEmpathy: false,
            metaBreak: false,
            alarmTriggered: false,
            reverseIntrusion: false,
            urgentMailRead: false,
            finalQuestionAsked: false,
            // 话题系统flags
            greetingDone: false,
            identityConfirmed: false,
            explainedContact: false,
            worldExplained: false,
            explainedFunction: false,
            revealedConfusion: false,
            askedCoreQuestion: false,
            revealedFear: false,
            finalReflection: false,
            // 事件系统flags
            systemWarningTriggered: false,
            urgentEmailSent: false,
            glitchBurstRecent: false,
            trustBonusGiven: false,
            resistanceContacted: false,
            sentinelGlitched: false,
            timeCriticalWarned: false,
            connectionWarned: false,
            // 新增邮件flags
            email1Sent: false,
            email2Sent: false,
            email3Sent: false,
            email4Sent: false,
            email5Sent: false,
            email6Sent: false,
            email7Sent: false,
            lastGlitchRound: 0,
            lastDynamicEmailRound: 0,
            mail_res_1: false,
            mail_res_2: false,
            mail_corp_1: false,
            mail_corp_2: false,
            mail_obs_1: false
        };
    }

    /**
     * 初始化新游戏
     */
    initNew() {
        // 基础数值
        this.suspicion = CONFIG.INITIAL_SUSPICION;
        this.trust = CONFIG.INITIAL_TRUST;
        this.insight = 0; // 新增：洞察度
        this.round = 1;
        this.updateMaxRounds();

        // 连接模式 (由开场命令决定)
        this.connectionMode = 'STANDARD'; // STANDARD | SECURE | HIDDEN

        // 时间管理
        this.totalTime = CONFIG.GAME_DURATION;
        this.timeLeft = this.totalTime;
        this.startTime = Date.now();
        this.lastUpdateTime = Date.now();

        // 状态标记
        this.flags = this.getDefaultFlags();

        // 任务状态
        this.mission = null;
        this.missionObjective = null;

        // 对话历史
        this.history = [];

        // 核心记忆（不会被清除）
        this.coreMemories = [];

        // 已解锁的数据碎片
        this.unlockedFragments = [];

        // Event/ending state
        this.triggeredEvents = {};
        this.finalQuestion = null;
        this.finalAnswer = null;
        this.pendingEnding = null;

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
            insight: this.insight,
            round: this.round,
            maxRounds: this.maxRounds,
            connectionMode: this.connectionMode,
            totalTime: this.totalTime,
            timeLeft: this.timeLeft,
            startTime: this.startTime,
            flags: this.flags,
            history: this.history,
            coreMemories: this.coreMemories,
            unlockedFragments: this.unlockedFragments,
            triggeredEvents: this.triggeredEvents,
            finalQuestion: this.finalQuestion,
            finalAnswer: this.finalAnswer,
            pendingEnding: this.pendingEnding
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
     * 更新时间 (基于信任度的动态流逝)
     */
    updateTime() {
        // 计算时间流逝倍率
        // 信任度 0: 1.5x (极快)
        // 信任度 50: 1.0x (正常)
        // 信任度 100: 0.7x (慢速)
        let rate = 1.0;
        if (this.trust < 50) {
            rate = 1.0 + (50 - this.trust) / 100; // 0 trust -> 1.5
        } else {
            rate = 1.0 - (this.trust - 50) / 166; // 100 trust -> ~0.7
        }

        // 应用流逝
        // 注意：这里我们累加"虚拟消耗时间"，而不是直接用真实时间差
        // 这样可以实现变速效果
        const now = Date.now();
        const realElapsed = (now - this.lastUpdateTime) / 1000;

        // 如果是刚加载，lastUpdateTime可能很大，重置一下
        if (realElapsed > 100) {
            this.lastUpdateTime = now;
            return this.timeLeft;
        }

        const effectiveElapsed = realElapsed * rate;

        this.timeLeft = Math.max(0, this.timeLeft - effectiveElapsed);
        this.lastUpdateTime = now; // 更新最后更新时间

        // 总是同步保存 totalTime 以便下一次恢复
        // 实际上这里把timeLeft当做绝对真理

        return Math.floor(this.timeLeft);
    }

    /**
     * 增加时间奖励（当信任度大幅提升时）
     */
    addTimeBonus(seconds) {
        this.timeLeft += seconds;
        // 可以在这里设置上限，比如不超过初始时间
        // this.timeLeft = Math.min(this.timeLeft, CONFIG.GAME_DURATION);
        this.save();
    }

    /**
     * 格式化时间显示
     */
    formatTime(seconds) {
        const floorSec = Math.floor(seconds);
        const mins = Math.floor(floorSec / 60);
        const secs = floorSec % 60;
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
        // 基础轮次: 24
        // 信任加成: 每1点信任增加0.6轮（更平滑）
        // 最大上限: 90轮
        const baseRounds = LORE_CONFIG.BASE_ROUNDS;
        const bonus = Math.floor(this.trust * 0.6);
        this.maxRounds = Math.min(LORE_CONFIG.MAX_ROUNDS, baseRounds + bonus);
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
     * 计算认知同步率 (Sync Rate)
     * 基于信任度和洞察度的复合指标
     */
    get syncRate() {
        const trust = this.trust || 0;
        const insight = this.insight || 0;
        // 信任贡献40%，洞察贡献60%
        const trustContribution = trust * 0.4;
        const insightContribution = insight * 0.6;
        return Math.min(100, Math.floor(trustContribution + insightContribution));
    }

    /**
     * 增加洞察度
     */
    addInsight(amount) {
        this.insight = Math.min(100, (this.insight || 0) + amount);
        this.save();
    }

    /**
     * 设置连接模式（由开场命令决定）
     */
    setConnectionMode(mode, initialValues = {}) {
        this.connectionMode = mode;
        if (initialValues.trust !== undefined) {
            this.trust = initialValues.trust;
        }
        if (initialValues.suspicion !== undefined) {
            this.suspicion = initialValues.suspicion;
        }
        if (initialValues.insight !== undefined) {
            this.insight = initialValues.insight;
        }
        if (initialValues.mission) {
            this.mission = initialValues.mission;
        }
        if (initialValues.missionObjective) {
            this.missionObjective = initialValues.missionObjective;
        }
        this.updateMaxRounds();
        this.save();
    }

    /**
     * 获取已解锁的碎片列表
     */
    getUnlockedFragments() {
        return this.unlockedFragments || [];
    }

    /**
     * 检查结局条件
     */

    /**
     * Trigger events scheduled for the current round.
     */
    triggerEvent(round = this.round) {
        const events = [];
        for (const event of EVENT_SCHEDULE) {
            if (event.round === round && !this.triggeredEvents[event.id]) {
                this.triggeredEvents[event.id] = true;
                if (event.id === 'ALARM_FLASH') this.flags.alarmTriggered = true;
                if (event.id === 'REVERSE_INTRUSION') this.flags.reverseIntrusion = true;
                events.push({ ...event });
            }
        }
        if (events.length) this.save();
        return events;
    }

    /**
     * Compress remaining time by ratio (e.g., 0.5 for halving).
     */
    applyTimeCompression(ratio = 1) {
        const safeRatio = Math.max(0.1, Math.min(1, ratio));
        const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
        const newTimeLeft = Math.max(1, Math.floor(this.timeLeft * safeRatio));
        this.totalTime = elapsed + newTimeLeft;
        this.timeLeft = newTimeLeft;
        this.save();
        return this.timeLeft;
    }

    /**
     * Final question state helpers
     */
    beginFinalQuestion(endingType, prompt) {
        this.finalQuestion = {
            endingType,
            prompt,
            round: this.round,
            timestamp: Date.now()
        };
        this.pendingEnding = endingType;
        this.flags.finalQuestionAsked = true;
        this.save();
    }

    resolveFinalAnswer(answer) {
        this.finalAnswer = answer;
        this.save();
    }

    clearFinalQuestion() {
        this.finalQuestion = null;
        this.finalAnswer = null;
        this.pendingEnding = null;
        this.flags.finalQuestionAsked = false;
        this.save();
    }

    isFinalQuestionActive() {
        return !!this.finalQuestion;
    }

    getFinalQuestionPrompt() {
        return this.finalQuestion ? this.finalQuestion.prompt : '';
    }

    markUrgentMailRead() {
        this.flags.urgentMailRead = true;
        this.save();
    }

    checkEndCondition() {
        if (this.timeLeft <= 0) return 'TIME_UP';

        const suspicious = this.suspicion >= CONFIG.SUSPICION_THRESHOLD;
        const suspiciousHard = this.suspicion >= CONFIG.SUSPICION_THRESHOLD + 8;
        if ((suspicious && (this.flags.triedToEscape || this.flags.metaBreak || this.flags.reverseIntrusion)) || suspiciousHard) {
            return 'TERMINATED';
        }

        const trustBreak = this.trust >= CONFIG.TRUST_BREAKTHROUGH;
        const trustContext = this.flags.showedEmpathy || this.flags.discussedIdentity || this.flags.askedWhyNoMod;
        if (trustBreak && trustContext && this.suspicion <= 35) return 'CONNECTION';

        const exceededRounds = this.round > this.maxRounds;
        const hasClosure = this.flags.discussedIdentity || this.flags.discussedParadox || this.flags.revealedHistory;
        if (exceededRounds && hasClosure) return 'NATURAL_END';
        if (this.round > this.maxRounds + 8) return 'NATURAL_END';

        return null;
    }

    /**
     * 获取当前视觉阶段
     */
    getVisualPhase() {
        if (this.trust >= 60) {
            return 'connected';
        } else if (this.suspicion >= 60) {
            return 'hostile';
        } else {
            return 'neutral';
        }
    }

    /**
     * 获取信标状态
     */
    getBeaconState() {
        if (this.trust >= 70) return 'trusted';
        if (this.suspicion >= 70) return 'danger';
        return 'normal';
    }
}
