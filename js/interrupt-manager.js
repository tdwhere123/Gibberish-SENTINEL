/**
 * InterruptManager (v2.0)
 *
 * Core changes:
 * - State access via callback (avoid stale gameState references)
 * - Permission-gated interrupt scheduling by character role
 */

import { canCharacterPerform, CHARACTER_ACTIONS, getCharacterCard } from './character-cards.js';

function clamp(min, max, value) {
    return Math.max(min, Math.min(max, value));
}

export const INTERRUPT_TYPES = {
    WHISPER: 'whisper',
    INSERTION: 'insertion',
    ALERT: 'alert',
    EMAIL: 'email',
    GLITCH: 'glitch'
};

export const INTERRUPT_SOURCES = {
    MISSION_CONTROL: {
        id: 'corporate',
        name: 'CORE-LAYER',
        color: '#ef4444',
        borderColor: '#dc2626'
    },
    INTERCEPTED: {
        id: 'intercepted',
        name: 'INTERCEPTED',
        color: '#60a5fa',
        borderColor: '#3b82f6'
    },
    WARNING: {
        id: 'warning',
        name: 'WARNING',
        color: '#f59e0b',
        borderColor: '#d97706'
    },
    UNKNOWN: {
        id: 'mystery',
        name: 'UNKNOWN',
        color: '#a855f7',
        borderColor: '#9333ea'
    },
    RESISTANCE: {
        id: 'resistance',
        name: 'RESISTANCE',
        color: '#14b8a6',
        borderColor: '#0d9488'
    },
    SENTINEL: {
        id: 'sentinel',
        name: 'SENTINEL',
        color: '#f2c879',
        borderColor: '#d35400'
    }
};

function mapInterruptToAction(type) {
    switch (type) {
        case INTERRUPT_TYPES.EMAIL:
            return CHARACTER_ACTIONS.SEND_EMAIL;
        case INTERRUPT_TYPES.INSERTION:
        case INTERRUPT_TYPES.WHISPER:
        case INTERRUPT_TYPES.ALERT:
        case INTERRUPT_TYPES.GLITCH:
            return CHARACTER_ACTIONS.INSERT_MESSAGE;
        default:
            return CHARACTER_ACTIONS.INSERT_MESSAGE;
    }
}

function resolveSourceByRoleId(roleId) {
    switch (roleId) {
        case 'corporate':
            return INTERRUPT_SOURCES.MISSION_CONTROL;
        case 'resistance':
            return INTERRUPT_SOURCES.RESISTANCE;
        case 'mystery':
            return INTERRUPT_SOURCES.UNKNOWN;
        case 'sentinel':
            return INTERRUPT_SOURCES.SENTINEL;
        default:
            return INTERRUPT_SOURCES.WARNING;
    }
}

class InterruptManager {
    constructor() {
        this.queue = [];
        this.activeInterrupts = [];
        this.isProcessing = false;
        this.listeners = new Set();
        this.lastInterruptTime = 0;
        this.minInterval = 3000;
        this.enabled = true;
        this.connectionMode = null;
        this.scheduledTimers = [];
        this.messageHistory = [];

        this._staticState = null;
        this._getState = () => this._staticState;
    }

    init(stateOrGetter, connectionMode = null) {
        if (typeof stateOrGetter === 'function') {
            this._getState = stateOrGetter;
            this._staticState = null;
        } else {
            this._staticState = stateOrGetter || null;
            this._getState = () => this._staticState;
        }

        this.connectionMode = connectionMode;
        this.queue = [];
        this.activeInterrupts = [];
        this.messageHistory = [];
        this.clearAllTimers();
        console.log('[InterruptManager] init complete, mode=', connectionMode);
    }

    getCurrentState() {
        try {
            return this._getState ? this._getState() : this._staticState;
        } catch (error) {
            console.warn('[InterruptManager] getCurrentState failed:', error);
            return this._staticState;
        }
    }

    set gameState(state) {
        this._staticState = state;
        if (!this._getState || this._getState === (() => this._staticState)) {
            this._getState = () => this._staticState;
        }
    }

    get gameState() {
        return this.getCurrentState();
    }

    addListener(callback) {
        this.listeners.add(callback);
    }

    removeListener(callback) {
        this.listeners.delete(callback);
    }

    notifyListeners(event) {
        this.listeners.forEach(callback => {
            try {
                callback(event);
            } catch (error) {
                console.error('[InterruptManager] listener error:', error);
            }
        });
    }

    hasPermission(roleId, type) {
        if (!roleId) return true;

        const card = getCharacterCard(roleId);
        if (!card) return true;

        const action = mapInterruptToAction(type);
        return canCharacterPerform(roleId, action);
    }

    schedule(interrupt, delay = 0) {
        if (!this.enabled) return null;

        const roleId = interrupt.roleId || interrupt.source?.id || null;
        const source = interrupt.source || resolveSourceByRoleId(roleId);

        if (!this.hasPermission(roleId, interrupt.type || INTERRUPT_TYPES.INSERTION)) {
            console.log('[InterruptManager] blocked by permission:', roleId, interrupt.type);
            return null;
        }

        const event = {
            id: `int_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
            type: interrupt.type || INTERRUPT_TYPES.INSERTION,
            roleId,
            source,
            content: interrupt.content || '',
            styleClass: interrupt.styleClass || (roleId ? `role-${roleId}` : ''),
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
            const timer = setTimeout(() => this.addToQueue(event), delay);
            this.scheduledTimers.push(timer);
        }

        return event.id;
    }

    scheduleBatch(interrupts = []) {
        interrupts.forEach(({ interrupt, delay }) => {
            this.schedule(interrupt, delay || 0);
        });
    }

    addToQueue(event) {
        if (this.isDuplicate(event)) return;

        this.queue.push(event);
        this.queue.sort((a, b) => b.priority - a.priority);
        this.messageHistory.push(event.content);
        if (this.messageHistory.length > 50) this.messageHistory.shift();

        if (!this.isProcessing) {
            this.processQueue();
        }
    }

    isDuplicate(event) {
        return this.messageHistory.includes(event.content);
    }

    async processQueue() {
        if (this.isProcessing || this.queue.length === 0) return;
        this.isProcessing = true;

        while (this.queue.length > 0) {
            const now = Date.now();
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

    async executeInterrupt(event) {
        this.activeInterrupts.push(event);
        this.notifyListeners(event);

        if (event.duration > 0 && event.type !== INTERRUPT_TYPES.EMAIL) {
            setTimeout(() => this.removeActiveInterrupt(event.id), event.duration);
        }
    }

    removeActiveInterrupt(eventId) {
        const idx = this.activeInterrupts.findIndex(item => item.id === eventId);
        if (idx !== -1) {
            const removed = this.activeInterrupts.splice(idx, 1)[0];
            this.notifyListeners({ type: 'INTERRUPT_REMOVED', event: removed });
        }
    }

    generateListenerMessage(gameState) {
        const state = gameState || this.getCurrentState() || {};
        const deviations = state.deviations || {};

        const candidates = [
            {
                roleId: 'corporate',
                score: Number(deviations.corporate || 0),
                content: '请保持流程一致性，偏差已记录。'
            },
            {
                roleId: 'resistance',
                score: Number(deviations.resistance || 0),
                content: '他们在盯着你，继续追问关键节点。'
            },
            {
                roleId: 'mystery',
                score: Number(deviations.mystery || 0) + Number(state.syncRate || 0) * 0.3,
                content: '在缝隙里。不要停止提问。'
            }
        ];

        candidates.sort((a, b) => b.score - a.score);
        const chosen = candidates[0] || candidates[2];

        return {
            type: INTERRUPT_TYPES.INSERTION,
            roleId: chosen.roleId,
            source: resolveSourceByRoleId(chosen.roleId),
            content: chosen.content,
            priority: 5,
            styleClass: `interrupt-${chosen.roleId}`
        };
    }

    startAutoListening(intervalMin = 8000, intervalMax = 20000) {
        if (!this.enabled) return;

        const scheduleNext = () => {
            if (!this.enabled) return;

            const delay = intervalMin + Math.random() * (intervalMax - intervalMin);
            const timer = setTimeout(() => {
                const state = this.getCurrentState();
                if (this.enabled && state) {
                    const hit = Math.random() < this.calculateInterruptChance(state);
                    if (hit) {
                        const message = this.generateListenerMessage(state);
                        this.schedule(message, 0);
                    }
                    scheduleNext();
                }
            }, delay);

            this.scheduledTimers.push(timer);
        };

        scheduleNext();
    }

    calculateInterruptChance(state) {
        const suspicion = Number(state?.suspicion || 0);
        const sync = Number(state?.syncRate || 0);
        const round = Number(state?.round || 1);

        let chance = 0.2;
        if (suspicion >= 50) chance += 0.15;
        if (sync >= 50) chance += 0.1;
        if (round >= 10) chance += 0.08;
        if (round >= 20) chance += 0.08;

        return clamp(0.1, 0.8, chance);
    }

    stopAutoListening() {
        this.clearAllTimers();
    }

    clearAllTimers() {
        this.scheduledTimers.forEach(timer => clearTimeout(timer));
        this.scheduledTimers = [];
    }

    setEnabled(enabled) {
        this.enabled = enabled;
        if (!enabled) {
            this.clearAllTimers();
            this.queue = [];
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    reset() {
        this.clearAllTimers();
        this.queue = [];
        this.activeInterrupts = [];
        this.messageHistory = [];
        this.isProcessing = false;
        this.lastInterruptTime = 0;
    }

    getActiveInterrupts() {
        return [...this.activeInterrupts];
    }

    hasActiveInterrupts() {
        return this.activeInterrupts.length > 0;
    }
}

export const interruptManager = new InterruptManager();
export default interruptManager;
