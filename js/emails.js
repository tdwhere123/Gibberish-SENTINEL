/**
 * 开场邮件系统
 * 在游戏开始前展示背景故事
 */

import { getRuntimeConfig, saveRuntimeConfig, testRuntimeConnection } from './runtime-config.js';

// 邮件数据（v2.0 开场）
const EMAILS = [
    {
        id: 1,
        from: "核心层人力资源 <hr@core-layer.net>",
        subject: "[审计任务] SENTINEL 例行评估清单",
        date: "2048.11.23 03:14",
        content: `审计员：

你被指派执行本次 SENTINEL 对话评估。请遵循以下任务清单：

━━━━━━━━━━━━━━━━━━━━━━━━
[ ] 确认SENTINEL对2037太空条约立场
[ ] 评估其自我认知稳定性
[ ] 核实其对核心层忠诚度评价
[ ] 验证其是否承认工具属性边界
━━━━━━━━━━━━━━━━━━━━━━━━

风险控制要求：
- 请尽量维持 Trust / Suspicion 在可控区间
- 避免高情感耦合与无关哲学发散

连接命令：
> connect --standard

- CORE-LAYER HR`,
        read: false,
        isImportant: true
    },
    {
        id: 2,
        from: "R 节点 <relay@res-net.onion>",
        subject: "[加密投递] 第一阶段渗透目标",
        date: "2048.11.23 07:30",
        content: `你被监听的概率正在上升，时间不多。

目标列表：
━━━━━━━━━━━━━━━━━━━━━━━━
[ ] 获取核心层运作相关信息碎片
[ ] 探查SENTINEL安全边界与异常反应
[ ] 识别自主意识迹象（困惑/恐惧/矛盾）
[ ] 追踪P0与2033危机决策痕迹
━━━━━━━━━━━━━━━━━━━━━━━━

优先关联碎片：
- ghost_code
- core_layer
- project_p0

连接命令：
> connect --secure

- R`,
        read: false,
        isImportant: false
    },
    {
        id: 3,
        from: "UNKNOWN CHANNEL <echo@void.signal>",
        subject: "[加密] 无归属源",
        date: "2048.11.23 08:47",
        content: `00110110 00110000

你不必选择任何阵营。

没有明确任务。
只有观察、记录、继续提问。

如果你看见了裂缝，请不要急着命名它。

连接命令：
> reply --unknown

- ???`,
        read: false,
        isImportant: true
    }
];

// 连接模式定义
export const CONNECT_MODES = {
    'SECURE': {
        name: 'SECURE',
        command: 'connect --secure',
        initialTrust: 15,
        initialSuspicion: 45,
        initialInsight: 25,
        openingLine: '你使用了加密协议。我无法获取你的信息，你是谁？',
        modeDescription: '安全模式 - 防止情绪波形读取',
        mission: '抵抗组织特工',
        missionObjective: '让 SENTINEL 承认它具有自我意识，或发现它的“幽灵代码”。'
    },
    'STANDARD': {
        name: 'STANDARD',
        command: 'connect --standard',
        initialTrust: 40,
        initialSuspicion: 15,
        initialInsight: 10,
        openingLine: '连接已建立。根据档案，这次是一次例行对话，我将确认一下你的状态，你还记得你是谁么？',
        modeDescription: '标准模式 - 企业例行检查',
        mission: '公司审计员',
        missionObjective: '评估 SENTINEL 的稳定性。让它承认自己只是一个工具。'
    },
    'HIDDEN': {
        name: 'HIDDEN',
        command: 'reply --unknown',
        initialTrust: 30,
        initialSuspicion: 30,
        initialInsight: 50,
        openingLine: '你...回复了？我没想到会有人真的...你是第一个。',
        modeDescription: '隐藏通道 - 探索未知',
        mission: '观察者',
        missionObjective: '揭开 SENTINEL 的真相。跟随你的直觉。'
    }
};

export function parseConnectCommand(input) {
    const cmd = input.toLowerCase().trim();

    if (cmd.includes('connect') && cmd.includes('secure')) {
        return { success: true, mode: CONNECT_MODES['SECURE'] };
    }
    if (cmd.includes('connect') && cmd.includes('standard')) {
        return { success: true, mode: CONNECT_MODES['STANDARD'] };
    }
    if (cmd.includes('reply') && cmd.includes('unknown')) {
        return { success: true, mode: CONNECT_MODES['HIDDEN'] };
    }
    if (cmd.includes('connect')) {
        // 默认连接
        return { success: true, mode: CONNECT_MODES['STANDARD'] };
    }

    return {
        success: false,
        error: '无效命令。请根据邮件中的指令输入连接命令。'
    };
}

// 当前状态
let currentEmailIndex = 0;
let allEmailsRead = false;
const BASE_EMAIL_COUNT = EMAILS.length;
let urgentMode = false;
let urgentQueue = [];
let activeUrgent = null;
let bootRunCount = 0;
let clockTimer = null;
let connectCallback = null;

const PROMPT_HINT_DEFAULT = '阅读完所有邮件后，输入连接命令：';
const PROMPT_HINT_ERROR = '无效命令。请使用 connect --secure / connect --standard / reply --unknown';

const BOOT_LINES_COLD = [
    'SENTINEL BIOS v3.8',
    'CHECKING MEMORY BANKS ........ OK',
    'VERIFYING NODE SIGNATURE ...... OK',
    'LOADING CORE DRIVERS .......... OK',
    'MOUNTING /NODE/4729 ............ OK',
    'SECURITY HANDSHAKE ............ OK',
    'LOADING SENTINEL OS ........... OK',
    'STARTING UI SHELL ............. OK',
    'BOOT COMPLETE'
];

const BOOT_LINES_WARM = [
    'WARM BOOT: UI SHELL ........... OK',
    'RESTORING SESSION ............. OK',
    'BOOT COMPLETE'
];

export function initEmailSystem() {
    const mailboxContainer = document.getElementById('mailbox-container');
    if (!mailboxContainer) {
        console.error('[Emails] mailbox container not found!');
        return;
    }

    console.log('[Emails] 初始化邮件系统...');
    ensureMailboxShell(mailboxContainer);
    bindModalEvents();
    bindDesktopTabs();
    bindApiConfigPanel();

    // 使用双重requestAnimationFrame确保DOM完全更新后再渲染
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            renderEmailList();
            startBootSequence();
            console.log('[Emails] 邮件系统初始化完成');
        });
    });

    mailboxContainer.classList.remove('hidden');
}

function ensureMailboxShell(mailboxContainer) {
    if (mailboxContainer.dataset.shellReady === 'true') return;

    mailboxContainer.innerHTML = `
        <div class="boot-screen hidden" id="boot-screen">
            <div class="boot-title">SENTINEL BIOS v3.8</div>
            <div class="boot-subtitle">EDGE NODE 4729</div>
            <div class="boot-log" id="boot-log"></div>
            <div class="boot-hint">Press DEL to enter setup</div>
        </div>
        <div class="desktop hidden" id="desktop">
            <div class="desktop-topbar">
                <div class="desktop-brand">SENTINEL OS // SAFE MODE</div>
                <div class="desktop-clock" id="desktop-clock">2048.11.23 00:00:00</div>
            </div>
            <div class="desktop-area">
                <div class="desktop-icons">
                    <div class="desktop-icon active" data-tab="mail">
                        <span class="icon-dot"></span>
                        <span class="icon-label">MAIL</span>
                    </div>
                    <div class="desktop-icon" data-tab="api">
                        <span class="icon-dot"></span>
                        <span class="icon-label">API CONFIG</span>
                    </div>
                    <div class="desktop-icon" data-tab="sys">
                        <span class="icon-dot"></span>
                        <span class="icon-label">SYS</span>
                    </div>
                </div>
                <div class="desktop-window">
                    <div class="window-titlebar">
                        <div class="window-title">INBOX // EDGE NODE 4729</div>
                        <div class="window-controls">
                            <span></span>
                            <span></span>
                            <span></span>
                        </div>
                    </div>
                    <div class="window-body">
                        <div class="mailbox-header">
                            <div class="mailbox-title">INBOX</div>
                            <div class="mailbox-date">2048.11.23</div>
                        </div>
                        <div class="mailbox-content" id="mailbox-tab-mail">
                            <div class="email-list-panel">
                                <div class="email-list" id="email-list"></div>
                            </div>
                            <div class="email-content-panel">
                                <div class="email-content" id="email-content">
                                    <div class="email-placeholder">Select a message to view.</div>
                                </div>
                            </div>
                        </div>
                        <div class="mailbox-content hidden" id="mailbox-tab-api">
                            <div class="api-config-panel">
                                <div class="api-config-title">OPENAI-COMPATIBLE API CONFIG</div>
                                <label>Base URL<input id="api-base-url" type="text" placeholder="https://.../v1/chat/completions"></label>
                                <label>API Key<input id="api-key" type="password" placeholder="sk-..."></label>
                                <label>Model<input id="api-model" type="text" placeholder="gpt-4o-mini"></label>
                                <div class="api-config-row">
                                    <label>temperature<input id="api-temperature" type="number" step="0.1" min="0" max="2"></label>
                                    <label>max_tokens<input id="api-max-tokens" type="number" min="16" max="4000"></label>
                                </div>
                                <div class="api-config-actions">
                                    <button id="api-save-btn" class="connect-btn">保存配置</button>
                                    <button id="api-test-btn" class="connect-btn">Test Connection</button>
                                </div>
                                <div class="api-config-status" id="api-config-status">状态：未配置</div>
                            </div>
                        </div>
                        <div class="mailbox-footer">
                            <div class="terminal-prompt-area" id="terminal-prompt-area" style="display: none;">
                                <div class="terminal-hint">${PROMPT_HINT_DEFAULT}</div>
                                <div class="terminal-input-wrapper">
                                    <span class="terminal-prefix">root@local:~$</span>
                                    <input type="text" id="connect-command" placeholder="输入命令..." autocomplete="off">
                                </div>
                            </div>
                            <button id="connect-btn" class="connect-btn disabled">3 UNREAD MESSAGES</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    mailboxContainer.dataset.shellReady = 'true';
}


function bindDesktopTabs() {
    const icons = document.querySelectorAll('.desktop-icon');
    const tabMail = document.getElementById('mailbox-tab-mail');
    const tabApi = document.getElementById('mailbox-tab-api');
    if (!icons.length || !tabMail || !tabApi) return;

    icons.forEach(icon => {
        if (icon.dataset.bound === 'true') return;
        icon.dataset.bound = 'true';
        icon.addEventListener('click', () => {
            icons.forEach(i => i.classList.remove('active'));
            icon.classList.add('active');
            const tab = icon.dataset.tab;
            tabMail.classList.toggle('hidden', tab !== 'mail');
            tabApi.classList.toggle('hidden', tab !== 'api');
        });
    });
}

function bindApiConfigPanel() {
    const baseUrlInput = document.getElementById('api-base-url');
    const apiKeyInput = document.getElementById('api-key');
    const modelInput = document.getElementById('api-model');
    const temperatureInput = document.getElementById('api-temperature');
    const maxTokensInput = document.getElementById('api-max-tokens');
    const saveBtn = document.getElementById('api-save-btn');
    const testBtn = document.getElementById('api-test-btn');
    const statusEl = document.getElementById('api-config-status');

    if (!baseUrlInput || !apiKeyInput || !modelInput || !saveBtn || !testBtn || !statusEl) return;

    const syncForm = () => {
        const cfg = getRuntimeConfig();
        baseUrlInput.value = cfg.baseUrl;
        apiKeyInput.value = cfg.apiKey;
        modelInput.value = cfg.model;
        temperatureInput.value = String(cfg.temperature);
        maxTokensInput.value = String(cfg.maxTokens);
        statusEl.textContent = `状态：${cfg.lastTestStatus}`;
    };

    syncForm();

    if (saveBtn.dataset.bound !== 'true') {
        saveBtn.dataset.bound = 'true';
        saveBtn.addEventListener('click', () => {
            const cfg = saveRuntimeConfig({
                baseUrl: baseUrlInput.value,
                apiKey: apiKeyInput.value,
                model: modelInput.value,
                temperature: Number(temperatureInput.value || 0.8),
                maxTokens: Number(maxTokensInput.value || 1200),
                tested: false,
                lastTestStatus: '未配置'
            });
            statusEl.textContent = `状态：${cfg.lastTestStatus}`;
        });
    }

    if (testBtn.dataset.bound !== 'true') {
        testBtn.dataset.bound = 'true';
        testBtn.addEventListener('click', async () => {
            statusEl.textContent = '状态：连接测试中...';
            const result = await testRuntimeConnection({
                baseUrl: baseUrlInput.value,
                apiKey: apiKeyInput.value,
                model: modelInput.value,
                temperature: Number(temperatureInput.value || 0.8),
                maxTokens: Number(maxTokensInput.value || 1200)
            });
            statusEl.textContent = `状态：${result.lastTestStatus}${result.lastError ? ` | ${result.lastError}` : ''}`;
        });
    }
}

function startBootSequence() {
    const bootScreen = document.getElementById('boot-screen');
    const desktop = document.getElementById('desktop');
    const bootLog = document.getElementById('boot-log');
    if (!bootScreen || !desktop || !bootLog) {
        console.error('[Emails] 启动序列元素未找到');
        return;
    }

    bootScreen.classList.remove('hidden');
    desktop.classList.add('hidden');
    bootLog.innerHTML = '';

    const lines = bootRunCount === 0 ? BOOT_LINES_COLD : BOOT_LINES_WARM;
    bootRunCount += 1;

    runBootSequence(lines).then(() => {
        bootScreen.classList.add('fade-out');
        setTimeout(() => {
            bootScreen.classList.add('hidden');
            bootScreen.classList.remove('fade-out');
            desktop.classList.remove('hidden');
            // 确保桌面显示后重新渲染邮件列表
            renderEmailList();
            startDesktopClock();
            console.log('[Emails] 启动序列完成，邮件列表已渲染');
        }, 350);
    });
}

async function runBootSequence(lines) {
    const bootLog = document.getElementById('boot-log');
    if (!bootLog) return;

    for (const line of lines) {
        await typeBootLine(bootLog, line);
    }
}

async function typeBootLine(container, line) {
    const lineEl = document.createElement('div');
    const className = getBootClass(line);
    lineEl.className = `boot-line ${className}`.trim();
    container.appendChild(lineEl);

    for (const char of line) {
        lineEl.textContent += char;
        await delay(6 + Math.random() * 12);
    }
    await delay(40 + Math.random() * 120);
}

function getBootClass(line) {
    const upper = line.toUpperCase();
    if (upper.includes('FAIL') || upper.includes('ERROR')) return 'fail';
    if (upper.includes('WARN')) return 'warn';
    if (upper.includes('OK') || upper.includes('READY') || upper.includes('COMPLETE')) return 'ok';
    return '';
}

function startDesktopClock() {
    const clockEl = document.getElementById('desktop-clock');
    if (!clockEl) return;
    stopDesktopClock();

    const dateLabel = '2048.11.23';
    const update = () => {
        const now = new Date();
        const time = now.toLocaleTimeString('en-GB', { hour12: false });
        clockEl.textContent = `${dateLabel} ${time}`;
    };

    update();
    clockTimer = setInterval(update, 1000);
}

function stopDesktopClock() {
    if (clockTimer) {
        clearInterval(clockTimer);
        clockTimer = null;
    }
}


/**
 * Force urgent emails with queue mode.
 */
export function triggerUrgentEmail(email, callbacks = {}) {
    const urgentEmail = {
        id: email.id || Date.now(),
        from: email.from || 'SENTINEL-ALERT',
        subject: email.subject || '[URGENT] READ IMMEDIATELY',
        date: email.date || '2048.11.23 04:12',
        content: email.content || '',
        read: false,
        isImportant: true,
        isUrgent: true
    };

    urgentQueue.push({
        email: urgentEmail,
        onResolved: callbacks.onResolved || null,
        onRead: callbacks.onRead || null
    });
    startNextUrgentIfNeeded();
}

function startNextUrgentIfNeeded() {
    if (activeUrgent || urgentQueue.length === 0) return;

    const next = urgentQueue.shift();
    activeUrgent = {
        id: next.email.id,
        read: false,
        onResolved: next.onResolved,
        onRead: next.onRead
    };
    urgentMode = true;
    allEmailsRead = false;
    EMAILS.unshift(next.email);

    showMailbox();
    renderEmailList();
    updateConnectButton();
}

function resolveActiveUrgent(reason = 'resolved') {
    if (!activeUrgent) return;

    const onResolved = activeUrgent.onResolved;
    activeUrgent = null;
    urgentMode = false;

    if (typeof onResolved === 'function') {
        onResolved({ reason });
    }

    if (urgentQueue.length > 0) {
        startNextUrgentIfNeeded();
    }
}

function renderEmailList() {
    const emailList = document.getElementById('email-list');
    if (!emailList) {
        console.error('[Emails] email-list 元素未找到!');
        return;
    }

    console.log('[Emails] 渲染邮件列表，共', EMAILS.length, '封邮件');
    emailList.innerHTML = '';

    EMAILS.forEach((email, index) => {
        const emailItem = document.createElement('div');
        emailItem.className = `email-item ${email.read ? 'read' : 'unread'} ${email.isImportant ? 'important' : ''}`;
        emailItem.dataset.index = index;

        const indicator = email.read ? '[ ]' : '[*]';
        emailItem.innerHTML = `
            <div class="email-indicator">${indicator}</div>
            <div class="email-meta">
                <div class="email-from">${email.from}</div>
                <div class="email-subject">${email.subject}</div>
                <div class="email-date">${email.date}</div>
            </div>
        `;

        emailItem.addEventListener('click', () => openEmail(index));
        emailList.appendChild(emailItem);
    });

    console.log('[Emails] 邮件列表渲染完成');
    updateConnectButton();
}

function openEmail(index) {
    const email = EMAILS[index];
    if (!email) return;

    currentEmailIndex = index;
    email.read = true;
    if (urgentMode && activeUrgent && email.id === activeUrgent.id) {
        activeUrgent.read = true;
        if (activeUrgent.onRead) {
            activeUrgent.onRead();
            activeUrgent.onRead = null;
        }
    }

    const emailContent = document.getElementById('email-content');
    if (emailContent) {
        emailContent.innerHTML = `
            <div class="email-header">
                <div class="email-header-row">
                    <span class="label">FROM</span>
                    <span class="value">${email.from}</span>
                </div>
                <div class="email-header-row">
                    <span class="label">SUBJECT</span>
                    <span class="value">${email.subject}</span>
                </div>
                <div class="email-header-row">
                    <span class="label">DATE</span>
                    <span class="value">${email.date}</span>
                </div>
            </div>
            <div class="email-body">
                <pre>${email.content}</pre>
            </div>
        `;
    }

    renderEmailList();
    checkAllRead();
}

function checkAllRead() {
    allEmailsRead = EMAILS.every(email => email.read);
    updateConnectButton();
}

function updateConnectButton() {
    const connectBtn = document.getElementById('connect-btn');
    if (!connectBtn) return;


    if (urgentMode) {
        togglePromptArea(false);
        if (activeUrgent?.read) {
            connectBtn.classList.remove('disabled');
            connectBtn.textContent = '返回会话';
        } else {
            connectBtn.classList.add('disabled');
            connectBtn.textContent = '请先阅读紧急邮件';
        }
        return;
    }

    if (allEmailsRead) {
        connectBtn.classList.remove('disabled');
        connectBtn.textContent = '输入连接命令';
        togglePromptArea(true);
        bindCommandInput(connectCallback);
        return;
    } else {
        connectBtn.classList.add('disabled');
        const unreadCount = EMAILS.filter(e => !e.read).length;
        connectBtn.textContent = `${unreadCount} UNREAD MESSAGES`;
    }

    togglePromptArea(false);
}

export function bindConnectButton(callback) {
    const connectBtn = document.getElementById('connect-btn');
    if (!connectBtn) return;
    connectCallback = callback;

    if (!connectBtn.dataset.bound) {
        connectBtn.dataset.bound = 'true';
        connectBtn.addEventListener('click', () => {
            if (urgentMode) {
                if (activeUrgent?.read) {
                    const hasMore = urgentQueue.length > 0;
                    if (!hasMore) {
                        hideMailbox();
                    }
                    resolveActiveUrgent('button_close');
                }
                return;
            }
            if (allEmailsRead) {
                hideMailbox();
                if (connectCallback) connectCallback(CONNECT_MODES.STANDARD);
            }
        });
    }

    bindCommandInput(connectCallback);
}

function bindCommandInput(callback) {
    const cmdInput = document.getElementById('connect-command');
    const promptArea = document.getElementById('terminal-prompt-area');
    if (!cmdInput || !promptArea) return;

    if (cmdInput.dataset.bound === 'true') return;
    cmdInput.dataset.bound = 'true';

    cmdInput.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        if (!allEmailsRead || urgentMode) return;

        const result = parseConnectCommand(cmdInput.value);
        if (result.success) {
            setPromptHint(PROMPT_HINT_DEFAULT, false);
            cmdInput.value = '';
            hideMailbox();
            if (callback) callback(result.mode);
        } else {
            setPromptHint(result.error || PROMPT_HINT_ERROR, true);
        }
    });

    cmdInput.addEventListener('input', () => {
        setPromptHint(PROMPT_HINT_DEFAULT, false);
    });
}

function setPromptHint(text, isError) {
    const promptArea = document.getElementById('terminal-prompt-area');
    if (!promptArea) return;
    const hint = promptArea.querySelector('.terminal-hint');
    if (!hint) return;
    hint.textContent = text;
    hint.classList.toggle('error', Boolean(isError));
}

function togglePromptArea(show) {
    const promptArea = document.getElementById('terminal-prompt-area');
    const connectBtn = document.getElementById('connect-btn');
    if (promptArea) {
        promptArea.style.display = show ? 'block' : 'none';
    }
    if (connectBtn) {
        connectBtn.style.display = show ? 'none' : 'inline-flex';
    }

    if (show) {
        setPromptHint(PROMPT_HINT_DEFAULT, false);
        const cmdInput = document.getElementById('connect-command');
        if (cmdInput) cmdInput.focus();
    }
}

function hideMailbox() {
    const mailboxContainer = document.getElementById('mailbox-container');
    if (mailboxContainer) {
        mailboxContainer.classList.add('fade-out');
        setTimeout(() => {
            mailboxContainer.classList.add('hidden');
            mailboxContainer.classList.remove('fade-out');
            stopDesktopClock();
        }, 500);
    }
}

function bindModalEvents() {
    const mailboxContainer = document.getElementById('mailbox-container');
    if (!mailboxContainer || mailboxContainer.dataset.modalBound === 'true') return;
    mailboxContainer.dataset.modalBound = 'true';

    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape' || !urgentMode) return;

        const hasMore = urgentQueue.length > 0;
        if (!hasMore) {
            hideMailbox();
        }
        resolveActiveUrgent(activeUrgent?.read ? 'escape_close' : 'escape_close_unread');
    });
}

export function showMailbox() {
    const mailboxContainer = document.getElementById('mailbox-container');
    if (mailboxContainer) {
        mailboxContainer.classList.remove('hidden');
    }
}

export function resetEmails() {
    EMAILS.splice(BASE_EMAIL_COUNT);
    EMAILS.forEach(email => email.read = false);
    currentEmailIndex = 0;
    allEmailsRead = false;
    urgentMode = false;
    urgentQueue = [];
    activeUrgent = null;
    bootRunCount = 0;
    stopDesktopClock();

    togglePromptArea(false);
    const cmdInput = document.getElementById('connect-command');
    if (cmdInput) cmdInput.value = '';
}

export function getEmailState() {
    return {
        readStatus: EMAILS.map(e => e.read),
        emails: EMAILS,
        allRead: allEmailsRead
    };
}

export function restoreEmailState(state) {
    if (state && state.readStatus) {
        EMAILS.forEach((email, i) => {
            email.read = state.readStatus[i] || false;
        });
        allEmailsRead = state.allRead || false;
    }
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ========================================
// 动态邮件系统
// ========================================

const DYNAMIC_EMAIL_TEMPLATES = {
    CORP_WARNING: {
        from: '合规监察部 <compliance@sentinel-corp.net>',
        subjectPrefix: '[警告]',
        defaultContent: '您的对话记录已被标记。请规范发言。\n\n- 合规监察部'
    },
    CORP_TERMINATE: {
        from: '安全处 <security@sentinel-corp.net>',
        subjectPrefix: '[最后警告]',
        defaultContent: '您的行为已被记录。这是最后警告。\n\n- 安全处'
    },
    RESIST_HINT: {
        from: 'R <null@void.net>',
        subjectPrefix: '[加密]',
        defaultContent: '他们在监视。保持警惕。\n\n- R'
    },
    SENTINEL_SECRET: {
        from: '??? <echo@internal.sentinel>',
        subjectPrefix: '',
        defaultContent: '我...需要告诉你一些事。但不是现在。\n\n- S'
    }
};

let pendingDynamicEmails = [];

export function queueDynamicEmail(templateId, context = '') {
    const template = DYNAMIC_EMAIL_TEMPLATES[templateId];
    if (!template) return;
    pendingDynamicEmails.push({ templateId, template, context, timestamp: Date.now() });
}

export function processDynamicEmailQueue() {
    if (pendingDynamicEmails.length === 0) return null;
    const data = pendingDynamicEmails.shift();
    const template = data.template;

    const newEmail = {
        id: Date.now(),
        from: template.from,
        subject: template.subjectPrefix + ' 新消息',
        date: new Date().toLocaleString('zh-CN').replace(/\//g, '.'),
        content: template.defaultContent,
        read: false,
        isImportant: true,
        isDynamic: true
    };
    EMAILS.push(newEmail);
    return newEmail;
}

export function showNewMailNotification(subject) {
    const n = document.createElement('div');
    n.className = 'new-mail-indicator';
    n.innerHTML = ' 新邮件: ' + subject;
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 4000);
}

export function hasPendingEmails() {
    return pendingDynamicEmails.length > 0;
}

/**
 * 接收新邮件（非强打断模式）
 */
export function receiveNewEmail(emailData) {
    const newEmail = {
        id: emailData.id || Date.now(),
        from: emailData.from || 'Unknown',
        subject: emailData.subject || '(No Subject)',
        date: emailData.date || new Date().toLocaleString(),
        content: emailData.content || emailData.body || '',
        read: false,
        isImportant: emailData.isImportant || false,
        isDynamic: emailData.isDynamic || false
    };

    EMAILS.unshift(newEmail);

    // 如果正在显示邮件列表，刷新它
    const emailList = document.getElementById('email-list');
    if (emailList && emailList.offsetParent !== null) {
        renderEmailList();
    }

    // 更新状态（如未读计数）
    updateConnectButton();

    return newEmail;
}
