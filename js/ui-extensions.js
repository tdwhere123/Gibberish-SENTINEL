/**
 * UI 扩展模块（v2.0）
 * - /archive 展示任务清单 + 数据碎片
 * - 系统事件与状态扩展显示
 */

function escapeHtml(input) {
    return String(input || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// 兼容入口，当前不再使用侧栏折叠结构
export function toggleDataArchive() {
    return false;
}

// 兼容入口，保留调用但不做动作
export function initArchiveToggle() {
    return;
}

export function updateSyncDisplay(syncRate) {
    const syncEl = document.getElementById('sync-display');
    if (syncEl) {
        syncEl.textContent = Number(syncRate || 0);
    }
}

export function buildArchiveSnapshot(gameState, fragments = []) {
    const missionTasks = Object.values(gameState?.missionState?.tasks || {});
    const completedTasks = missionTasks.filter(task => task.completed).length;
    return {
        route: gameState?.missionState?.route || gameState?.connectionMode || 'STANDARD',
        missionName: gameState?.mission || '未命名路线',
        missionObjective: gameState?.missionObjective || '暂无任务目标',
        tasks: missionTasks,
        completedTasks,
        totalTasks: missionTasks.length,
        fragments: Array.isArray(fragments) ? fragments : []
    };
}

function ensureMissionSection(modalBody) {
    let section = modalBody.querySelector('#archive-mission-section');
    if (section) return section;

    section = document.createElement('div');
    section.id = 'archive-mission-section';
    section.className = 'archive-mission-section';
    section.innerHTML = `
        <div class="archive-section-title">任务清单</div>
        <div id="archive-mission-meta" class="archive-mission-meta"></div>
        <div id="archive-mission-list" class="archive-mission-list"></div>
    `;
    modalBody.insertBefore(section, modalBody.firstChild);
    return section;
}

export function renderArchiveModalContent(snapshot) {
    const modalBody = document.querySelector('#archive-modal .modal-body');
    if (!modalBody) return;

    const section = ensureMissionSection(modalBody);
    const missionMeta = section.querySelector('#archive-mission-meta');
    const missionList = section.querySelector('#archive-mission-list');

    if (missionMeta) {
        missionMeta.innerHTML = `
            <div>路线: <span class="status-active">${escapeHtml(snapshot.route)}</span></div>
            <div>目标: ${escapeHtml(snapshot.missionObjective)}</div>
            <div>进度: ${snapshot.completedTasks}/${snapshot.totalTasks}</div>
        `;
    }

    if (missionList) {
        if (!snapshot.tasks || snapshot.tasks.length === 0) {
            missionList.innerHTML = '<div class="archive-empty">任务清单未初始化</div>';
        } else {
            missionList.innerHTML = snapshot.tasks.map(task => `
                <div class="mission-item ${task.completed ? 'completed' : 'pending'}">
                    <span class="mission-check">${task.completed ? '✓' : '○'}</span>
                    <span class="mission-title">${escapeHtml(task.title || task.id)}</span>
                </div>
            `).join('');
        }
    }

    const fragmentList = document.getElementById('fragment-list');
    const archiveEmpty = document.getElementById('archive-empty');
    if (!fragmentList) return;

    const fragments = snapshot.fragments || [];
    if (fragments.length === 0) {
        fragmentList.innerHTML = '';
        if (archiveEmpty) archiveEmpty.style.display = 'block';
        return;
    }

    if (archiveEmpty) archiveEmpty.style.display = 'none';
    fragmentList.innerHTML = fragments.map(fragment => `
        <div class="fragment-item" data-id="${escapeHtml(fragment.id)}">
            <span class="fragment-icon">◈</span>
            <span class="fragment-name">${escapeHtml(fragment.title || '未知档案')}</span>
        </div>
    `).join('');

    fragmentList.querySelectorAll('.fragment-item').forEach(item => {
        item.addEventListener('click', () => {
            const fragment = fragments.find(f => f.id === item.dataset.id);
            if (fragment) {
                showFragmentDetails(fragment);
            }
        });
    });
}

export function addUnlockedFragment(fragment) {
    const fragmentList = document.getElementById('fragment-list');
    if (!fragmentList || !fragment) return;
    if (document.getElementById(`fragment-${fragment.id}`)) return;

    const fragmentEl = document.createElement('div');
    fragmentEl.className = 'fragment-item unlocked';
    fragmentEl.id = `fragment-${fragment.id}`;
    fragmentEl.innerHTML = `
        <span class="fragment-icon">◆</span>
        <span class="fragment-name">${escapeHtml(fragment.title)}</span>
    `;
    fragmentEl.addEventListener('click', () => showFragmentDetails(fragment));
    fragmentList.appendChild(fragmentEl);
}

export function showFragmentDetails(fragment) {
    const overlay = document.createElement('div');
    overlay.className = 'fragment-overlay';
    overlay.innerHTML = `
        <div class="fragment-popup">
            <div class="fragment-popup-header">
                <span class="fragment-popup-icon">◇</span>
                <span class="fragment-popup-title">${escapeHtml(fragment.title)}</span>
            </div>
            <div class="fragment-popup-content">${escapeHtml(fragment.content).replace(/\n/g, '<br>')}</div>
            <button class="fragment-popup-close">关闭</button>
        </div>
    `;
    document.body.appendChild(overlay);

    const close = () => {
        overlay.classList.add('fade-out');
        setTimeout(() => overlay.remove(), 300);
    };

    overlay.querySelector('.fragment-popup-close')?.addEventListener('click', close);
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) close();
    });
}

export function updateConnectionMode(mode) {
    const modeEl = document.getElementById('connection-mode');
    if (modeEl) {
        modeEl.textContent = `CONNECTED [${mode}]`;
    }
}

export function showSystemEvent(message, type = 'info') {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message system-event-msg event-${type}`;
    msgDiv.textContent = message;

    const terminal = document.getElementById('terminal-output');
    if (terminal) {
        terminal.appendChild(msgDiv);
        terminal.scrollTop = terminal.scrollHeight;
    }

    if (type === 'warning' || type === 'error' || type === 'urgent') {
        document.body.classList.add('screen-flash');
        setTimeout(() => {
            document.body.classList.remove('screen-flash');
        }, 350);
    }
}

export function updateZenSymbols(gameState) {
    const square = document.querySelector('.symbol-square');
    const triangle = document.querySelector('.symbol-triangle');
    const circle = document.querySelector('.symbol-circle');

    if (square) square.classList.add('active');

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
