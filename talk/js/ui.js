/**
 * UI模块 - 适配Claude Code风格布局
 */

let elements = {};

export function initUI() {
    elements = {
        infoPanel: document.getElementById('info-panel'),
        terminalOutput: document.getElementById('terminal-output'),
        userInput: document.getElementById('user-input'),
        trustDisplay: document.getElementById('trust-display'),
        suspicionDisplay: document.getElementById('suspicion-display'),
        roundDisplay: document.getElementById('round-display'),
        timeLeftDisplay: document.getElementById('time-left-display'),
        timeProgressBar: document.getElementById('time-progress-bar'),
        endingOverlay: document.getElementById('ending-overlay'),
        endingTitle: document.getElementById('ending-title'),
        endingText: document.getElementById('ending-text'),
        restartBtn: document.getElementById('restart-btn')
    };
    console.log('[UI] 初始化完成');
}

/**
 * 添加消息 (支持分段显示和打字机效果)
 * 对于SENTINEL消息，会按换行符分割成多条独立消息
 */
export async function addMessage(text, type = 'system', typewriter = false) {
    if (type === 'sentinel') {
        // SENTINEL消息 - 按段落分割成多条消息
        const paragraphs = text.split('\n').filter(p => p.trim());

        for (const paragraph of paragraphs) {
            await addSingleMessage(paragraph, type, typewriter);
            // 段落间短暂停顿
            if (typewriter && paragraphs.length > 1) {
                await new Promise(r => setTimeout(r, 200));
            }
        }
    } else {
        await addSingleMessage(text, type, typewriter);
    }
}

/**
 * 添加单条消息的内部函数
 */
async function addSingleMessage(text, type, typewriter) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${type}-msg`;

    if (type === 'user') {
        msgDiv.innerHTML = `<span class="prompt-symbol">></span><span class="content">${text}</span>`;
        elements.terminalOutput.appendChild(msgDiv);
    } else if (type === 'sentinel') {
        const contentSpan = document.createElement('span');
        contentSpan.className = 'content';
        msgDiv.appendChild(contentSpan);
        elements.terminalOutput.appendChild(msgDiv);

        if (typewriter) {
            contentSpan.classList.add('typing-cursor');
            for (const char of text) {
                contentSpan.textContent += char;
                scrollToBottom();
                // 标点停顿更长
                let delay = 20;
                if ('，。？！：；'.includes(char)) delay = 120;
                else if ('、'.includes(char)) delay = 60;
                else if (Math.random() > 0.95) delay = 80; // 随机停顿
                await new Promise(r => setTimeout(r, delay));
            }
            contentSpan.classList.remove('typing-cursor');
        } else {
            contentSpan.textContent = text;
        }
    } else {
        msgDiv.textContent = text;
        elements.terminalOutput.appendChild(msgDiv);
    }

    scrollToBottom();
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
    elements.trustDisplay.textContent = gameState.trust;
    elements.suspicionDisplay.textContent = gameState.suspicion;
    elements.roundDisplay.textContent = `${gameState.round}/${gameState.maxRounds}`;

    const timeLeft = gameState.updateTime();
    elements.timeLeftDisplay.textContent = gameState.formatTime(timeLeft);

    // 进度条
    const progress = (timeLeft / gameState.totalTime) * 100;
    elements.timeProgressBar.style.width = `${progress}%`;

    // 时间紧迫状态
    if (progress < 20) {
        elements.infoPanel.classList.add('time-critical');
    } else {
        elements.infoPanel.classList.remove('time-critical');
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

export function showEnding(title, text) {
    elements.endingTitle.textContent = title;
    elements.endingText.textContent = text;
    elements.endingOverlay.classList.remove('hidden');
    setTimeout(() => elements.endingOverlay.classList.add('visible'), 10);
}

export function hideEnding() {
    elements.endingOverlay.classList.remove('visible');
    setTimeout(() => elements.endingOverlay.classList.add('hidden'), 500);
}

export function clearTerminal() {
    elements.terminalOutput.innerHTML = '';
}

export function bindEvents(onSend, onRestart) {
    elements.userInput.addEventListener('keypress', e => {
        if (e.key === 'Enter') onSend();
    });
    elements.restartBtn.addEventListener('click', onRestart);
}

function scrollToBottom() {
    elements.terminalOutput.scrollTop = elements.terminalOutput.scrollHeight;
}

export function flashScreen() {
    // 可选的屏幕闪烁效果
}
