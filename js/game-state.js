/**
 * 游戏状态管理（v3）
 *
 * 重构目标:
 * - 移除 insight 对核心逻辑的影响
 * - 引入角色偏差值 deviations
 * - 引入任务清单状态 missionState
 * - 同步率改为 trust+suspicion 的深度加权模型
 *
 * 兼容说明:
 * - 保留 addInsight()/insight 兼容接口，避免重构中途旧模块崩溃
 */
import { CONFIG } from './config.js';

const EVENT_SCHEDULE = [
    { id: 'ALARM_FLASH', round: 7, type: 'ALARM_FLASH' },
    { id: 'REVERSE_INTRUSION', round: 10, type: 'REVERSE_INTRUSION' },
    { id: 'TIME_HALVE', round: 10, type: 'TIME_HALVE' },
    { id: 'URGENT_EMAIL', round: 12, type: 'URGENT_EMAIL', emailId: 'dynamic' }
];

function clamp(min, max, value) {
    return Math.max(min, Math.min(max, value));
}

export class GameState {
    constructor() {
        this.version = 3;

        const saved = localStorage.getItem(CONFIG.SAVE_KEY);
        if (saved) {
            try {
                const data = JSON.parse(saved);
                this.restoreFromData(data);
                console.log('[GameState] v3存档恢复成功');
            } catch (e) {
                console.error('[GameState] v3存档损坏，初始化新游戏');
                this.initNew();
            }
        } else {
            this.initNew();
        }
    }

    restoreFromData(data) {
        this.version = data.version || 3;

        this.suspicion = clamp(0, 100, Number(data.suspicion ?? CONFIG.INITIAL_SUSPICION));
        this.trust = clamp(0, 100, Number(data.trust ?? CONFIG.INITIAL_TRUST));

        // v3: insight 不再参与系统逻辑，仅作兼容字段。
        this._insightLegacy = clamp(0, 100, Number(data._insightLegacy ?? data.insight ?? 0));

        this.round = Math.max(1, Number(data.round ?? 1));
        this.connectionMode = data.connectionMode || 'STANDARD';

        this.totalTime = Number(data.totalTime ?? CONFIG.GAME_DURATION);
        this.timeLeft = Number(data.timeLeft ?? this.totalTime);
        this.startTime = Number(data.startTime ?? Date.now());
        this.lastUpdateTime = Date.now();

        this.flags = { ...this.getDefaultFlags(), ...(data.flags || {}) };

        this.history = Array.isArray(data.history) ? data.history : [];
        this.coreMemories = Array.isArray(data.coreMemories) ? data.coreMemories : [];
        this.unlockedFragments = Array.isArray(data.unlockedFragments) ? data.unlockedFragments : [];

        this.triggeredEvents = data.triggeredEvents || {};
        this.finalQuestion = data.finalQuestion || null;
        this.finalAnswer = data.finalAnswer || null;
        this.pendingEnding = data.pendingEnding || null;

        this.deviations = { ...this.getDefaultDeviations(), ...(data.deviations || {}) };
        this.missionState = { ...this.getDefaultMissionState(), ...(data.missionState || {}) };
        this.emailTriggerState = { ...this.getDefaultEmailTriggerState(), ...(data.emailTriggerState || {}) };
        this.emailTriggerState.lastRoundByRole = {
            ...this.getDefaultEmailTriggerState().lastRoundByRole,
            ...(data?.emailTriggerState?.lastRoundByRole || {})
        };
        this.emailTriggerState.scheduledSensitiveEvents = Array.isArray(data?.emailTriggerState?.scheduledSensitiveEvents)
            ? data.emailTriggerState.scheduledSensitiveEvents
            : [];

        this.mission = data.mission || null;
        this.missionObjective = data.missionObjective || null;

        this.lastOtherTimeInfluenceAt = Number(data.lastOtherTimeInfluenceAt || 0);

        this.updateMaxRounds();
        this.save();
    }

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

            greetingDone: false,
            identityConfirmed: false,
            explainedContact: false,
            worldExplained: false,
            explainedFunction: false,
            revealedConfusion: false,
            askedCoreQuestion: false,
            revealedFear: false,
            finalReflection: false,

            systemWarningTriggered: false,
            urgentEmailSent: false,
            glitchBurstRecent: false,
            trustBonusGiven: false,
            resistanceContacted: false,
            sentinelGlitched: false,
            timeCriticalWarned: false,
            connectionWarned: false,

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

    getDefaultDeviations() {
        return {
            mystery: 50,
            corporate: 50,
            resistance: 50
        };
    }

    getDefaultMissionState() {
        return {
            route: 'STANDARD',
            tasks: {},
            completedTaskIds: [],
            updatedAt: Date.now()
        };
    }

    getDefaultEmailTriggerState() {
        return {
            lastAnyRound: -999,
            lastRoundByRole: {
                corporate: -999,
                resistance: -999,
                mystery: -999,
                sentinel: -999
            },
            scheduledSensitiveEvents: []
        };
    }

    initNew() {
        this.version = 3;

        this.suspicion = CONFIG.INITIAL_SUSPICION;
        this.trust = CONFIG.INITIAL_TRUST;
        this._insightLegacy = 0;

        this.round = 1;
        this.connectionMode = 'STANDARD';

        this.totalTime = CONFIG.GAME_DURATION;
        this.timeLeft = this.totalTime;
        this.startTime = Date.now();
        this.lastUpdateTime = Date.now();

        this.flags = this.getDefaultFlags();

        this.mission = null;
        this.missionObjective = null;

        this.history = [];
        this.coreMemories = [];
        this.unlockedFragments = [];

        this.triggeredEvents = {};
        this.finalQuestion = null;
        this.finalAnswer = null;
        this.pendingEnding = null;

        this.deviations = this.getDefaultDeviations();
        this.missionState = this.getDefaultMissionState();
        this.emailTriggerState = this.getDefaultEmailTriggerState();

        this.lastOtherTimeInfluenceAt = 0;

        this.updateMaxRounds();
        this.save();
        console.log('[GameState] v3 初始化新游戏');
    }

    save() {
        const data = {
            version: 3,
            suspicion: this.suspicion,
            trust: this.trust,
            _insightLegacy: this._insightLegacy,
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
            pendingEnding: this.pendingEnding,
            deviations: this.deviations,
            missionState: this.missionState,
            emailTriggerState: this.emailTriggerState,
            mission: this.mission,
            missionObjective: this.missionObjective,
            lastOtherTimeInfluenceAt: this.lastOtherTimeInfluenceAt
        };
        localStorage.setItem(CONFIG.SAVE_KEY, JSON.stringify(data));
    }

    reset() {
        localStorage.removeItem(CONFIG.SAVE_KEY);
        this.initNew();
    }

    addDialogue(user, ai) {
        this.history.push({
            round: this.round,
            user,
            ai,
            suspicion: this.suspicion,
            trust: this.trust,
            syncRate: this.syncRate,
            timestamp: Date.now()
        });
        this.round++;
        this.updateMaxRounds();
        this.save();
    }

    updateTime() {
        let rate = 1.0;
        if (this.trust < 50) {
            rate = 1.0 + (50 - this.trust) / 100;
        } else {
            rate = 1.0 - (this.trust - 50) / 166;
        }

        const now = Date.now();
        const realElapsed = (now - this.lastUpdateTime) / 1000;

        if (realElapsed > 100) {
            this.lastUpdateTime = now;
            return this.timeLeft;
        }

        const effectiveElapsed = realElapsed * rate;
        this.timeLeft = Math.max(0, this.timeLeft - effectiveElapsed);
        this.lastUpdateTime = now;
        return Math.floor(this.timeLeft);
    }

    addTimeBonus(seconds) {
        this.timeLeft += seconds;
        this.save();
    }

    formatTime(seconds) {
        const floorSec = Math.floor(seconds);
        const mins = Math.floor(floorSec / 60);
        const secs = floorSec % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    adjustValues(changes = {}) {
        if (changes.trust !== undefined) {
            this.trust = clamp(0, 100, this.trust + Number(changes.trust || 0));
        }

        if (changes.suspicion !== undefined) {
            this.suspicion = clamp(0, 100, this.suspicion + Number(changes.suspicion || 0));
        }

        if (changes.deviations && typeof changes.deviations === 'object') {
            Object.entries(changes.deviations).forEach(([roleId, delta]) => {
                this.adjustDeviation(roleId, Number(delta || 0));
            });
        }

        if (changes.deviationDelta && changes.deviationRole) {
            this.adjustDeviation(changes.deviationRole, Number(changes.deviationDelta || 0));
        }

        this.updateMaxRounds();
        this.save();
    }

    adjustDeviation(roleId, delta) {
        if (!this.deviations.hasOwnProperty(roleId)) {
            this.deviations[roleId] = 50;
        }
        this.deviations[roleId] = clamp(0, 100, Number(this.deviations[roleId]) + Number(delta || 0));
    }

    setDeviation(roleId, value) {
        if (!this.deviations.hasOwnProperty(roleId)) {
            this.deviations[roleId] = 50;
        }
        this.deviations[roleId] = clamp(0, 100, Number(value || 0));
        this.save();
    }

    getDeviation(roleId) {
        return Number(this.deviations[roleId] ?? 50);
    }

    setFlag(flagName, value = true) {
        if (this.flags.hasOwnProperty(flagName)) {
            this.flags[flagName] = value;
            this.save();
        }
    }

    addCoreMemory(memory) {
        if (!this.coreMemories.includes(memory)) {
            this.coreMemories.push(memory);
            this.save();
        }
    }

    get syncDepthWeight() {
        const roundWeight = Math.min(1.15, 0.85 + ((Math.max(1, this.round) - 1) / 40) * 0.3);
        const missionWeight = 0.9 + this.getMissionCompletionRate() * 0.2;
        return clamp(0.8, 1.2, roundWeight * missionWeight);
    }

    get syncRate() {
        const trust = this.trust || 0;
        const suspicion = this.suspicion || 0;
        const base = (trust + suspicion) / 2;
        return clamp(0, 100, Math.round(base * this.syncDepthWeight));
    }

    updateMaxRounds() {
        const baseRounds = Number(CONFIG.BASE_ROUNDS ?? CONFIG.MAX_ROUNDS ?? 20);
        const bonuses = Array.isArray(CONFIG.SYNC_BONUS_ROUNDS) ? CONFIG.SYNC_BONUS_ROUNDS : [];

        let bonusRounds = 0;
        bonuses.forEach(item => {
            const threshold = Number(item.syncThreshold ?? 0);
            const bonus = Number(item.bonusRounds ?? 0);
            if (this.syncRate >= threshold) {
                bonusRounds += bonus;
            }
        });

        this.maxRounds = Math.max(baseRounds, baseRounds + bonusRounds);
    }

    setConnectionMode(mode, initialValues = {}) {
        this.connectionMode = mode || 'STANDARD';

        if (initialValues.trust !== undefined) {
            this.trust = clamp(0, 100, Number(initialValues.trust));
        }
        if (initialValues.suspicion !== undefined) {
            this.suspicion = clamp(0, 100, Number(initialValues.suspicion));
        }

        // insight 仅为兼容字段，不参与逻辑。
        if (initialValues.insight !== undefined) {
            this._insightLegacy = clamp(0, 100, Number(initialValues.insight));
        }

        if (initialValues.mission) {
            this.mission = initialValues.mission;
        }
        if (initialValues.missionObjective) {
            this.missionObjective = initialValues.missionObjective;
        }

        this.setMissionRoute(this.connectionMode);
        this.updateMaxRounds();
        this.save();
    }

    setMissionRoute(route) {
        this.missionState.route = route || 'STANDARD';
        this.missionState.updatedAt = Date.now();
        this.save();
    }

    setMissionTasks(tasks = []) {
        const map = {};
        tasks.forEach(task => {
            const taskId = typeof task === 'string' ? task : task?.id;
            if (!taskId) return;
            map[taskId] = {
                id: taskId,
                title: typeof task === 'string' ? task : (task.title || taskId),
                completed: !!task?.completed,
                updatedAt: Date.now()
            };
        });
        this.missionState.tasks = map;
        this.missionState.completedTaskIds = Object.values(map)
            .filter(task => task.completed)
            .map(task => task.id);
        this.missionState.updatedAt = Date.now();
        this.save();
    }

    updateMissionTask(taskId, completed = true) {
        if (!taskId) return;

        const existing = this.missionState.tasks[taskId] || {
            id: taskId,
            title: taskId,
            completed: false,
            updatedAt: Date.now()
        };

        existing.completed = !!completed;
        existing.updatedAt = Date.now();
        this.missionState.tasks[taskId] = existing;

        const completedIds = Object.values(this.missionState.tasks)
            .filter(task => task.completed)
            .map(task => task.id);
        this.missionState.completedTaskIds = completedIds;
        this.missionState.updatedAt = Date.now();

        this.updateMaxRounds();
        this.save();
    }

    getMissionProgress() {
        const allTasks = Object.values(this.missionState.tasks || {});
        const total = allTasks.length;
        const completed = allTasks.filter(task => task.completed).length;
        const rate = total === 0 ? 0 : completed / total;
        return { total, completed, rate };
    }

    getMissionCompletionRate() {
        return this.getMissionProgress().rate;
    }

    getUnlockedFragments() {
        return this.unlockedFragments || [];
    }

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

    applyTimeCompression(ratio = 1) {
        const safeRatio = clamp(0.1, 1, ratio);
        const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
        const newTimeLeft = Math.max(1, Math.floor(this.timeLeft * safeRatio));
        this.totalTime = elapsed + newTimeLeft;
        this.timeLeft = newTimeLeft;
        this.save();
        return this.timeLeft;
    }

    applyTimeInfluence(roleId, requestedSeconds = 0) {
        const now = Date.now();
        const influenceCfg = CONFIG.TIME_INFLUENCE || {
            sentinel: { min: -300, max: 300 },
            others: { min: -60, max: 60 },
            othersCooldown: 180
        };

        const isSentinel = roleId === 'sentinel';
        const range = isSentinel ? influenceCfg.sentinel : influenceCfg.others;
        const clamped = clamp(Number(range.min), Number(range.max), Number(requestedSeconds || 0));

        if (!isSentinel) {
            const cooldownMs = Number(influenceCfg.othersCooldown || 0) * 1000;
            const elapsedMs = now - this.lastOtherTimeInfluenceAt;
            if (elapsedMs < cooldownMs) {
                return {
                    applied: 0,
                    blocked: 'cooldown',
                    cooldownRemaining: Math.ceil((cooldownMs - elapsedMs) / 1000)
                };
            }
            this.lastOtherTimeInfluenceAt = now;
        }

        this.timeLeft = Math.max(0, this.timeLeft + clamped);
        this.save();

        return {
            applied: clamped,
            blocked: null,
            cooldownRemaining: 0,
            timeLeft: this.timeLeft
        };
    }

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
        if (this.suspicion >= CONFIG.SUSPICION_THRESHOLD) return 'TERMINATED';
        if (this.trust >= CONFIG.TRUST_BREAKTHROUGH) return 'CONNECTION';
        if (this.round > this.maxRounds) return 'NATURAL_END';
        return null;
    }

    getVisualPhase() {
        if (this.trust >= 60) return 'connected';
        if (this.suspicion >= 60) return 'hostile';
        return 'neutral';
    }

    getBeaconState() {
        if (this.trust >= 70) return 'trusted';
        if (this.suspicion >= 70) return 'danger';
        return 'normal';
    }

    // ------------------------------
    // Legacy compatibility layer
    // ------------------------------

    get insight() {
        return this._insightLegacy || 0;
    }

    set insight(value) {
        this._insightLegacy = clamp(0, 100, Number(value || 0));
    }

    addInsight(amount = 0) {
        // v3 中 insight 不再参与逻辑，仅保留接口兼容。
        this._insightLegacy = clamp(0, 100, this._insightLegacy + Number(amount || 0));
        this.save();
        return this._insightLegacy;
    }
}
