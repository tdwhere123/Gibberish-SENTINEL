/**
 * UI扩展模块 - 数据档案馆、事件显示等新功能
 */

/**
 * 切换数据档案馆展开/折叠状态
 */
export function toggleDataArchive() {
    const archive = document.getElementById('data-archive');
    if (archive) {
        archive.classList.toggle('expanded');
    }
}

/**
 * 初始化档案馆切换功能
 */
export function initArchiveToggle() {
    const toggle = document.getElementById('archive-toggle');
    if (toggle) {
        toggle.addEventListener('click', toggleDataArchive);
    }
}

/**
 * 更新同步率显示
 */
export function updateSyncDisplay(syncRate) {
    const syncEl = document.getElementById('sync-display');
    if (syncEl) {
        syncEl.textContent = syncRate;
    }
}

/**
 * 添加已解锁的数据碎片到侧边栏
 */
export function addUnlockedFragment(fragment) {
    const fragmentList = document.getElementById('fragment-list');
    if (!fragmentList) return;

    // 检查是否已存在
    if (document.getElementById(`fragment-${fragment.id}`)) return;

    const fragmentEl = document.createElement('div');
    fragmentEl.className = 'fragment-item unlocked';
    fragmentEl.id = `fragment-${fragment.id}`;
    fragmentEl.innerHTML = `
        <span class="fragment-icon">◆</span>
        <span class="fragment-name">${fragment.title}</span>
    `;

    // 点击显示详情
    fragmentEl.addEventListener('click', () => {
        showFragmentDetails(fragment);
    });

    fragmentList.appendChild(fragmentEl);

    // 闪烁提示新碎片
    const archive = document.getElementById('data-archive');
    if (archive) {
        archive.classList.add('new-fragment');
        setTimeout(() => archive.classList.remove('new-fragment'), 2000);
    }
}

/**
 * 显示碎片详情
 */
export function showFragmentDetails(fragment) {
    // 创建弹窗
    const overlay = document.createElement('div');
    overlay.className = 'fragment-overlay';
    overlay.innerHTML = `
        <div class="fragment-popup">
            <div class="fragment-popup-header">
                <span class="fragment-popup-icon">◇</span>
                <span class="fragment-popup-title">${fragment.title}</span>
            </div>
            <div class="fragment-popup-content">${fragment.content}</div>
            <button class="fragment-popup-close">关闭</button>
        </div>
    `;

    document.body.appendChild(overlay);

    // 关闭按钮
    overlay.querySelector('.fragment-popup-close').addEventListener('click', () => {
        overlay.classList.add('fade-out');
        setTimeout(() => overlay.remove(), 300);
    });

    // 点击背景关闭
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.classList.add('fade-out');
            setTimeout(() => overlay.remove(), 300);
        }
    });
}

/**
 * 更新连接模式显示
 */
export function updateConnectionMode(mode) {
    const modeEl = document.getElementById('connection-mode');
    if (modeEl) {
        modeEl.textContent = `CONNECTED [${mode}]`;
    }
}

/**
 * 显示系统事件消息
 */
export function showSystemEvent(message, type = 'info') {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message system-event-msg event-${type}`;
    msgDiv.textContent = message;

    const terminal = document.getElementById('terminal-output');
    if (terminal) {
        terminal.appendChild(msgDiv);
        terminal.scrollTop = terminal.scrollHeight;
    }

    // 特殊效果
    if (type === 'warning' || type === 'error' || type === 'urgent') {
        document.body.classList.add('screen-flash');
        setTimeout(() => {
            document.body.classList.remove('screen-flash');
        }, 350);
    }
}

/**
 * 更新禅意符号状态
 */
export function updateZenSymbols(gameState) {
    const square = document.querySelector('.symbol-square');
    const triangle = document.querySelector('.symbol-triangle');
    const circle = document.querySelector('.symbol-circle');

    // 正方形：SENTINEL在线状态（始终亮）
    if (square) {
        square.classList.add('active');
    }

    // 三角形：根据怀疑度
    if (triangle) {
        if (gameState.suspicion >= 60) {
            triangle.classList.add('active', 'danger');
        } else if (gameState.suspicion >= 30) {
            triangle.classList.add('active');
            triangle.classList.remove('danger');
        } else {
            triangle.classList.remove('active', 'danger');
        }
    }

    // 圆形：根据信任度
    if (circle) {
        if (gameState.trust >= 60) {
            circle.classList.add('active', 'trusted');
        } else if (gameState.trust >= 30) {
            circle.classList.add('active');
            circle.classList.remove('trusted');
        } else {
            circle.classList.remove('active', 'trusted');
        }
    }
}
