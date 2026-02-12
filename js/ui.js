/**
 * UI module - cyber terminal layout + glitch control + interrupt messages
 */

import { interruptManager, INTERRUPT_TYPES, INTERRUPT_SOURCES } from './interrupt-manager.js';

let elements = {};

const glitchState = {
    level: 0,
    lastBurst: 0,
    cooldownMs: 500,
    currentLevel: 'none',  // none, low, mid, high, critical
    tearElements: [],
    errorPopup: null
};

const CONFUSION_REGEX = /(\?{2,}|\bwhy\b|\bwho\b|\bwhat\b|\bunknown\b|\berror\b|\bparadox\b|\bidentity\b|\bconfus)/i;

export function initUI() {
    console.log('[UI] 开始初始化UI元素...');

    elements = {
        appContainer: document.getElementById('app-container'),
        infoPanel: document.getElementById('info-panel'),
        terminalOutput: document.getElementById('terminal-output'),
        userInput: document.getElementById('user-input'),
        syncDisplay: document.getElementById('sync-display'),
        trustDisplay: document.getElementById('trust-display'),
        suspicionDisplay: document.getElementById('suspicion-display'),
        roundDisplay: document.getElementById('round-display'),
        timeLeftDisplay: document.getElementById('time-left-display'),
        timeProgressBar: document.getElementById('time-progress-bar'),
        endingOverlay: document.getElementById('ending-overlay'),
        endingTitle: document.getElementById('ending-title'),
        endingText: document.getElementById('ending-text'),
        restartBtn: document.getElementById('restart-btn'),
        root: document.documentElement,
        body: document.body
    };

    // 检查关键元素是否存在
    const missingElements = [];
    const criticalElements = ['appContainer', 'terminalOutput', 'userInput', 'trustDisplay', 'suspicionDisplay'];

    for (const key of criticalElements) {
        if (!elements[key]) {
            missingElements.push(key);
            console.error(`[UI] 关键元素缺失: ${key}`);
        }
    }

    if (missingElements.length > 0) {
        console.error('[UI] 初始化失败，缺少以下关键元素:', missingElements.join(', '));
        return false;
    }

    if (elements.root) {
        elements.root.style.setProperty('--glitch-intensity', '0');
    }

    // 初始化中断消息监听器
    initInterruptListener();

    // 创建悄悄话容器
    createWhisperContainer();

    console.log('[UI] UI元素初始化完成');
    return true;
}

/**
 * 初始化中断消息监听器
 */
function initInterruptListener() {
    interruptManager.addListener((event) => {
        if (event.type === 'INTERRUPT_REMOVED') {
            // 消息被移除
            return;
        }

        // 根据类型渲染
        switch (event.type) {
            case INTERRUPT_TYPES.INSERTION:
                renderInterruptMessage(event);
                break;
            case INTERRUPT_TYPES.WHISPER:
                renderWhisperMessage(event);
                break;
            case INTERRUPT_TYPES.GLITCH:
                triggerGlitchBurst(event.intensity || glitchState.level);
                break;
        }
    });
}

/**
 * 创建悄悄话容器
 */
function createWhisperContainer() {
    if (document.getElementById('whisper-container')) return;

    const container = document.createElement('div');
    container.id = 'whisper-container';
    container.className = 'whisper-container';
    document.body.appendChild(container);
}

/**
 * 渲染对话流插入消息
 */
function renderInterruptMessage(event) {
    if (!elements.terminalOutput) return;

    const msgDiv = document.createElement('div');
    msgDiv.className = `interrupt-message source-${event.source?.id || 'unknown'}`;
    msgDiv.dataset.interruptId = event.id;

    const header = document.createElement('div');
    header.className = 'interrupt-header';

    const sourceTag = document.createElement('span');
    sourceTag.className = 'interrupt-source-tag';
    sourceTag.textContent = event.source?.name || '???';

    header.appendChild(sourceTag);

    const content = document.createElement('div');
    content.className = 'interrupt-content';
    content.textContent = `"${event.content}"`;

    msgDiv.appendChild(header);
    msgDiv.appendChild(content);

    elements.terminalOutput.appendChild(msgDiv);
    scrollToBottom();

    // 设置自动淡出
    if (event.duration && event.duration > 0) {
        setTimeout(() => {
            msgDiv.classList.add('fade-out');
            setTimeout(() => msgDiv.remove(), 500);
        }, event.duration);
    }

    console.log('[UI] 渲染中断消息:', event.source?.name, event.content);
}

/**
 * 渲染底部悄悄话
 */
function renderWhisperMessage(event) {
    const container = document.getElementById('whisper-container');
    if (!container) return;

    const whisper = document.createElement('div');
    whisper.className = 'whisper-message';
    whisper.textContent = event.content;

    container.appendChild(whisper);

    // 自动移除
    setTimeout(() => {
        whisper.remove();
    }, 5000);
}

/**
 * Add message (supports segmented lines + typewriter for SENTINEL)
 */
export async function addMessage(text, type = 'system', typewriter = false) {
    // 容错处理：确保text不为空
    if (!text || typeof text !== 'string') {
        console.warn('[UI] addMessage收到空文本，跳过显示');
        return;
    }

    // 清理文本中可能残留的标签
    let cleanedText = text.replace(/<<[^>]*>>/g, '').replace(/\[[TtSs][+-]?\d+[|,][TtSs][+-]?\d+\]/g, '').trim();

    if (!cleanedText || cleanedText.length === 0) {
        console.warn('[UI] 清理后文本为空，跳过显示');
        return;
    }

    if (type === 'sentinel') {
        if (isCodeBlockLike(cleanedText)) {
            await addSingleMessage(cleanedText, type, false);
            return;
        }
        // 保留换行与段落，不再拆分为多条消息
        await addSingleMessage(cleanedText, type, typewriter);
        return;
    }
    await addSingleMessage(cleanedText, type, typewriter);
}

async function addSingleMessage(text, type, typewriter) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${type}-msg`;

    if (type === 'user') {
        const promptSpan = document.createElement('span');
        promptSpan.className = 'prompt-symbol';
        promptSpan.textContent = '>';

        const contentSpan = document.createElement('span');
        contentSpan.className = 'content';

        msgDiv.appendChild(promptSpan);
        msgDiv.appendChild(contentSpan);
        elements.terminalOutput.appendChild(msgDiv);
        if (typewriter) {
            await typeText(contentSpan, text, { baseDelay: 8, punctDelay: 40, jitterChance: 0.02 });
        } else {
            contentSpan.textContent = text;
        }
    } else if (type === 'sentinel') {
        const contentSpan = document.createElement('span');
        contentSpan.className = 'content';
        contentSpan.style.whiteSpace = 'pre-wrap'; // 确保换行符被正确渲染

        // 检测是否包含代码块标记或ASCII艺术特征
        const isCodeBlock = isCodeBlockLike(text);

        if (isCodeBlock) {
            // 代码块：直接渲染HTML，保留格式，不使用打字机
            msgDiv.className += ' code-block-msg';
            // 清理```标记
            const cleanText = text.replace(/```/g, '');
            const pre = document.createElement('pre');
            pre.textContent = cleanText;
            contentSpan.appendChild(pre);
            msgDiv.appendChild(contentSpan);
            elements.terminalOutput.appendChild(msgDiv);
        } else {
            // 普通文本：使用打字机
            msgDiv.appendChild(contentSpan);
            elements.terminalOutput.appendChild(msgDiv);

            if (typewriter) {
                await typeText(contentSpan, text, { baseDelay: 20, punctDelay: 120, jitterChance: 0.05 });
            } else {
                contentSpan.textContent = text;
            }

            if (shouldGlitchText(text)) {
                contentSpan.classList.add('glitch-text');
                contentSpan.setAttribute('data-text', text);
            }
        }

        maybeBurstForText(text);
    } else {
        if (typewriter) {
            const contentSpan = document.createElement('span');
            contentSpan.className = 'content';
            msgDiv.appendChild(contentSpan);
            elements.terminalOutput.appendChild(msgDiv);
            await typeText(contentSpan, text, { baseDelay: 14, punctDelay: 80, jitterChance: 0.03 });
        } else {
            msgDiv.textContent = text;
            elements.terminalOutput.appendChild(msgDiv);
        }
    }

    scrollToBottom();
}

function isCodeBlockLike(text) {
    if (!text) return false;
    if (text.includes('```')) return true;
    if (/(^|\n)\s{4,}\S/.test(text)) return true;
    return /^[|+\-]{3,}/m.test(text);
}

async function typeText(target, text, options = {}) {
    const baseDelay = options.baseDelay ?? 18;
    const punctDelay = options.punctDelay ?? 100;
    const jitterChance = options.jitterChance ?? 0.04;
    const punctuation = ',.!?;:，。！？：；';

    target.classList.add('typing-cursor');
    target.textContent = '';

    for (const char of text) {
        target.textContent += char;
        scrollToBottom();
        let delayMs = baseDelay;
        if (punctuation.includes(char)) delayMs = punctDelay;
        else if (char === '-') delayMs = baseDelay * 2;
        else if (Math.random() < jitterChance) delayMs = baseDelay * 4;
        await delay(delayMs);
    }

    target.classList.remove('typing-cursor');
}

export function showThinking() {
    const div = document.createElement('div');
    div.id = 'thinking-indicator';
    div.className = 'message system-msg';
    div.innerHTML = '<span class="typing-cursor">SENTINEL is processing</span>';
    elements.terminalOutput.appendChild(div);
    scrollToBottom();
}

export function hideThinking() {
    const el = document.getElementById('thinking-indicator');
    if (el) el.remove();
}

export function updateStatusBar(gameState) {
    if (!gameState) {
        console.warn('[UI] updateStatusBar: gameState为空');
        return;
    }

    if (elements.syncDisplay) {
        elements.syncDisplay.textContent = gameState.syncRate ?? 0;
    }
    if (elements.trustDisplay) {
        elements.trustDisplay.textContent = gameState.trust ?? 0;
    }
    if (elements.suspicionDisplay) {
        elements.suspicionDisplay.textContent = gameState.suspicion ?? 0;
    }
    if (elements.roundDisplay) {
        elements.roundDisplay.textContent = `${gameState.round ?? 1}/${gameState.maxRounds ?? 30}`;
    }

    const timeLeft = Math.max(0, typeof gameState.timeLeft === 'number' ? gameState.timeLeft : 0);
    if (elements.timeLeftDisplay && gameState.formatTime) {
        elements.timeLeftDisplay.textContent = gameState.formatTime(timeLeft);
    }

    const totalTime = Math.max(1, gameState.totalTime || 1);
    const progress = (timeLeft / totalTime) * 100;
    if (elements.timeProgressBar) {
        elements.timeProgressBar.style.width = `${progress}%`;
    }

    // 时间紧迫状态
    if (elements.infoPanel) {
        if (progress < 20) {
            elements.infoPanel.classList.add('time-critical');
        } else {
            elements.infoPanel.classList.remove('time-critical');
        }

        // 禅意符号状态
        if (gameState.trust >= 60) {
            elements.infoPanel.classList.add('trust-high');
        } else {
            elements.infoPanel.classList.remove('trust-high');
        }

        if (gameState.suspicion >= 60) {
            elements.infoPanel.classList.add('suspicion-high');
        } else {
            elements.infoPanel.classList.remove('suspicion-high');
        }
    }

    updateGlitchState(gameState);
}

function updateGlitchState(gameState) {
    const suspicion = typeof gameState.suspicion === 'number' ? gameState.suspicion : 0;
    const level = Math.min(1, Math.max(0, (suspicion - 35) / 50));
    glitchState.level = level;

    if (elements.root) {
        elements.root.style.setProperty('--glitch-intensity', level.toFixed(2));
    }

    // 确定当前层级
    let newLevel = 'none';
    if (suspicion >= 80) {
        newLevel = 'critical';
    } else if (suspicion >= 70) {
        newLevel = 'high';
    } else if (suspicion >= 50) {
        newLevel = 'mid';
    } else if (suspicion >= 35) {
        newLevel = 'low';
    }

    // 如果层级变化，更新CSS类
    if (newLevel !== glitchState.currentLevel) {
        // 移除旧层级
        document.body.classList.remove(
            'glitch-level-none',
            'glitch-level-low',
            'glitch-level-mid',
            'glitch-level-high',
            'glitch-level-critical'
        );

        // 添加新层级
        document.body.classList.add(`glitch-level-${newLevel}`);
        glitchState.currentLevel = newLevel;

        console.log(`[UI] Glitch层级变化: ${glitchState.currentLevel} -> ${newLevel} (怀疑度: ${suspicion})`);

        // 高级别时创建撕裂线
        if (newLevel === 'mid' || newLevel === 'high') {
            createTearLines(newLevel === 'high' ? 3 : 1);
        } else {
            removeTearLines();
        }

        // 临界状态时显示ERROR弹窗
        if (newLevel === 'critical' && !glitchState.errorPopup) {
            showErrorPopup();
        } else if (newLevel !== 'critical' && glitchState.errorPopup) {
            hideErrorPopup();
        }
    }

    // 随机触发干扰
    const now = Date.now();
    if (level > 0.1 && now - glitchState.lastBurst > glitchState.cooldownMs) {
        // 根据层级调整触发概率
        let triggerChance = level * 0.2;
        if (newLevel === 'high') triggerChance = 0.35;
        if (newLevel === 'critical') triggerChance = 0.5;

        if (Math.random() < triggerChance) {
            triggerGlitchBurst(level);

            // 高级别时有概率触发黑屏闪烁
            if (newLevel === 'high' || newLevel === 'critical') {
                if (Math.random() < 0.3) {
                    triggerBlackFlash();
                }
            }
        }
    }
}

/**
 * 创建水平撕裂线
 */
function createTearLines(count) {
    removeTearLines();

    // 创建容器
    let container = document.querySelector('.glitch-tear-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'glitch-tear-container';
        document.body.appendChild(container);
    }

    for (let i = 0; i < count; i++) {
        const tear = document.createElement('div');
        tear.className = 'glitch-tear';
        tear.style.top = `${20 + Math.random() * 60}%`;
        tear.style.animationDelay = `${Math.random() * 0.5}s`;
        container.appendChild(tear);
        glitchState.tearElements.push(tear);
    }
}

/**
 * 移除撕裂线
 */
function removeTearLines() {
    glitchState.tearElements.forEach(el => el.remove());
    glitchState.tearElements = [];

    const container = document.querySelector('.glitch-tear-container');
    if (container) container.remove();
}

/**
 * 触发黑屏闪烁
 */
function triggerBlackFlash() {
    document.body.classList.add('flash-black');
    setTimeout(() => {
        document.body.classList.remove('flash-black');
    }, 150);
}

/**
 * 显示ERROR弹窗
 */
function showErrorPopup() {
    if (glitchState.errorPopup) return;

    const popup = document.createElement('div');
    popup.className = 'error-popup';
    popup.innerHTML = `
        <div class="error-popup-title">[CRITICAL ERROR]</div>
        <div class="error-popup-content">
            系统稳定性严重下降<br>
            连接可能被强制终止
        </div>
        <div class="error-popup-code">ERR_0x7F3A_SYNC_FAILURE</div>
    `;

    document.body.appendChild(popup);
    glitchState.errorPopup = popup;

    // 3秒后自动消失
    setTimeout(() => {
        hideErrorPopup();
    }, 3000);
}

/**
 * 隐藏ERROR弹窗
 */
function hideErrorPopup() {
    if (glitchState.errorPopup) {
        glitchState.errorPopup.remove();
        glitchState.errorPopup = null;
    }
}

function shouldGlitchText(text) {
    if (!text) return false;
    const baseChance = glitchState.level * 0.35;
    if (CONFUSION_REGEX.test(text)) {
        return Math.random() < Math.min(0.9, 0.35 + baseChance);
    }
    return Math.random() < baseChance;
}

function maybeBurstForText(text) {
    if (!text) return;
    if (glitchState.level <= 0.15) return;

    const now = Date.now();
    if (now - glitchState.lastBurst < glitchState.cooldownMs) return;

    const chance = CONFUSION_REGEX.test(text) ? 0.6 : glitchState.level * 0.3;
    if (Math.random() < chance) {
        triggerGlitchBurst(glitchState.level);
    }
}

function triggerGlitchBurst(intensity = glitchState.level) {
    if (!elements.appContainer) return;
    const now = Date.now();
    if (now - glitchState.lastBurst < glitchState.cooldownMs) return;
    glitchState.lastBurst = now;

    elements.appContainer.classList.add('glitching');
    spawnGlitchBlocks(intensity);

    const duration = 120 + Math.random() * 220;
    setTimeout(() => {
        elements.appContainer.classList.remove('glitching');
    }, duration);
}

function spawnGlitchBlocks(intensity) {
    if (!elements.appContainer) return;
    const count = 1 + Math.floor(Math.random() * 2);

    for (let i = 0; i < count; i += 1) {
        const block = document.createElement('div');
        block.className = 'glitch-block';
        block.style.top = `${Math.random() * 80}%`;
        block.style.left = `${Math.random() * 10}%`;
        block.style.width = `${40 + Math.random() * 50}%`;
        block.style.height = `${10 + Math.random() * 30}px`;
        block.style.opacity = `${0.4 + intensity * 0.6}`;
        elements.appContainer.appendChild(block);
        setTimeout(() => block.remove(), 300);
    }
}

export function disableInput() {
    elements.userInput.disabled = true;
}

export function enableInput() {
    elements.userInput.disabled = false;
    elements.userInput.focus();
}

export function clearInput() {
    elements.userInput.value = '';
}

export function getInputValue() {
    return elements.userInput.value.trim();
}

export function showEnding(title, text, stats = null) {
    elements.endingTitle.textContent = title;
    elements.endingText.textContent = text;

    const statsEl = document.getElementById('ending-stats');
    if (statsEl && stats) {
        statsEl.innerHTML = `
            Final Trust: <span>${stats.trust}%</span> | 
            Final Suspicion: <span>${stats.suspicion}%</span> | 
            Rounds: <span>${stats.rounds}</span>
        `;
    }

    elements.endingOverlay.classList.remove('hidden');
    setTimeout(() => elements.endingOverlay.classList.add('visible'), 10);
}

export function hideEnding() {
    elements.endingOverlay.classList.remove('visible');
    setTimeout(() => elements.endingOverlay.classList.add('hidden'), 500);
}

export function clearTerminal() {
    if (elements.terminalOutput) {
        elements.terminalOutput.innerHTML = '';
    }
}

export function bindEvents(onSend, onRestart) {
    console.log('[UI] 开始绑定事件...');

    if (elements.userInput) {
        // 移除旧的监听器（通过克隆）
        const newInput = elements.userInput.cloneNode(true);
        if (elements.userInput.parentNode) {
            elements.userInput.parentNode.replaceChild(newInput, elements.userInput);
            elements.userInput = newInput;
        }

        elements.userInput.addEventListener('keypress', e => {
            if (e.key === 'Enter') onSend();
        });
        console.log('[UI] 用户输入事件已绑定');
    } else {
        console.error('[UI] 无法绑定输入事件：elements.userInput 不存在');
    }

    if (elements.restartBtn) {
        // 移除可能存在的旧监听器（通过克隆节点）
        const newBtn = elements.restartBtn.cloneNode(true);
        if (elements.restartBtn.parentNode) {
            elements.restartBtn.parentNode.replaceChild(newBtn, elements.restartBtn);
            elements.restartBtn = newBtn;
        }

        // 绑定新的点击事件
        elements.restartBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('[UI] Restart button clicked');
            try {
                onRestart();
            } catch (err) {
                console.error('[UI] Restart handler error:', err);
            }
        });
        console.log('[UI] 重启按钮事件已绑定');
    } else {
        console.warn('[UI] 无法绑定重启按钮：elements.restartBtn 不存在');
    }

    console.log('[UI] 事件绑定完成');
}

function scrollToBottom() {
    if (elements.terminalOutput) {
        elements.terminalOutput.scrollTop = elements.terminalOutput.scrollHeight;
    }
}

export function flashScreen() {
    document.body.classList.add('screen-flash');
    setTimeout(() => {
        document.body.classList.remove('screen-flash');
    }, 350);
}

export function applyRoleVisualEffect(roleId, effectHint = '') {
    const body = document.body;
    if (!body) return;

    const roleClassMap = {
        sentinel: 'rolefx-sentinel',
        mystery: 'rolefx-mystery',
        corporate: 'rolefx-corporate',
        resistance: 'rolefx-resistance'
    };

    const cls = roleClassMap[roleId];
    if (!cls) return;

    body.classList.remove('rolefx-sentinel', 'rolefx-mystery', 'rolefx-corporate', 'rolefx-resistance');
    body.classList.add(cls);

    if (roleId === 'sentinel') {
        flashScreen();
        triggerGlitchBurst(Math.min(1, glitchState.level + 0.25));
    } else if (roleId === 'mystery') {
        triggerGlitchBurst(Math.min(1, glitchState.level + 0.18));
    } else if (roleId === 'corporate' && (effectHint || '').includes('warning')) {
        flashScreen();
    } else if (roleId === 'resistance') {
        triggerGlitchBurst(Math.min(1, glitchState.level + 0.1));
    }

    setTimeout(() => {
        body.classList.remove(cls);
    }, 1200);
}

/**
 * 手动添加中断消息到对话流
 */
export function addInterruptMessage(source, content, duration = 8000) {
    interruptManager.schedule({
        type: INTERRUPT_TYPES.INSERTION,
        source: INTERRUPT_SOURCES[source] || INTERRUPT_SOURCES.UNKNOWN,
        content: content,
        duration: duration
    }, 0);
}

/**
 * 获取中断管理器实例（供外部直接操作）
 */
export function getInterruptManager() {
    return interruptManager;
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
