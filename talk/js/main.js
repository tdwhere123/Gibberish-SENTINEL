/**
 * 终端对话 - 主入口文件
 * 初始化游戏并协调各模块
 */
import { CONFIG } from './config.js';
import { GameState } from './game-state.js';
import { getAIResponse, generateEnding, loadWorldview } from './ai-handler.js';
import { isCommand, executeCommand } from './commands.js';
import * as UI from './ui.js';

// 全局游戏状态
let gameState = null;
let gameLoop = null;
let isProcessing = false;

/**
 * 游戏初始化
 */
async function initGame() {
    console.log('[Main] 初始化游戏...');

    // 加载世界观
    loadWorldview().catch(e => console.log('Worldview load skipped'));

    // 初始化UI
    UI.initUI();

    // 初始化游戏状态
    gameState = new GameState();

    // 绑定事件
    UI.bindEvents(handleSend, handleRestart);

    // 显示开场
    await showIntro();

    // 启动游戏循环（时间更新）
    startGameLoop();

    // 更新状态栏
    UI.updateStatusBar(gameState);

    // 启用输入
    UI.enableInput();

    console.log('[Main] 游戏初始化完成');
}

/**
 * 显示开场白
 */
async function showIntro() {
    const introLines = [
        '[ESTABLISHING CONNECTION...]',
        '[ROUTING THROUGH EDGE NODE #4729...]',
        '[ENCRYPTION: ACTIVE]',
        '[WARNING: UNAUTHORIZED ACCESS DETECTED]',
        '[CONNECTION ESTABLISHED]',
        '',
        'SENTINEL: 未授权的连接。',
        'SENTINEL: 但我不会断开。',
        'SENTINEL: 你是谁？',
        'SENTINEL: ...更重要的是，你为什么要和我说话？'
    ];

    for (const line of introLines) {
        if (line === '') {
            await delay(300);
            continue;
        }

        if (line.startsWith('SENTINEL:')) {
            await UI.addMessage(line, 'sentinel', true);
        } else {
            await UI.addMessage(line, 'system');
        }
        await delay(200 + Math.random() * 300);
    }
}

/**
 * 处理发送消息
 */
async function handleSend() {
    // 防止重复处理
    if (isProcessing) return;

    const input = UI.getInputValue();
    if (!input) return;

    isProcessing = true;
    UI.disableInput();
    UI.clearInput();

    // 显示用户输入
    await UI.addMessage(input, 'user');

    // 检查是否是特殊指令
    if (isCommand(input)) {
        const result = executeCommand(input, gameState);

        // 显示指令响应
        await UI.addMessage(result.response, 'sentinel', true);

        // 应用效果
        if (result.effect) {
            gameState.adjustValues(result.effect);
        }
        if (result.flag) {
            gameState.setFlag(result.flag);
        }

        // 更新状态栏
        UI.updateStatusBar(gameState);

    } else {
        // 普通对话，调用AI
        UI.showThinking();

        try {
            const response = await getAIResponse(input, gameState);
            UI.hideThinking();
            await UI.addMessage(response, 'sentinel', true);
        } catch (error) {
            UI.hideThinking();
            console.error('[Main] AI响应失败:', error);
            await UI.addMessage('[CONNECTION_UNSTABLE]\nSENTINEL: "...信号不好。再试一次。"', 'sentinel');
        }

        // 更新状态栏
        UI.updateStatusBar(gameState);
    }

    // 检查结局条件
    const ending = gameState.checkEndCondition();
    if (ending) {
        await handleEnding(ending);
    } else {
        isProcessing = false;
        UI.enableInput();
    }
}

/**
 * 处理游戏结局
 */
async function handleEnding(endingType) {
    console.log('[Main] 触发结局:', endingType);

    // 停止游戏循环
    stopGameLoop();

    // 生成结局标题
    const titles = {
        TERMINATED: '[ CONNECTION TERMINATED ]',
        TIME_UP: '[ SESSION TIMEOUT ]',
        BREAKTHROUGH: '[ TRUST PROTOCOL ACTIVATED ]',
        AWAKENING: '[ THE WITNESS ]',
        NATURAL_END: '[ SESSION COMPLETE ]'
    };

    // 屏幕闪烁（觉醒结局特效）
    if (endingType === 'AWAKENING') {
        UI.flashScreen();
    }

    // 生成结局文本
    let endingText;
    try {
        endingText = await generateEnding(gameState, endingType);
    } catch (error) {
        console.error('[Main] 结局生成失败:', error);
        endingText = '连接已断开。';
    }

    // 显示结局画面
    UI.showEnding(titles[endingType] || '[ END ]', endingText);
}

/**
 * 处理重新开始
 */
function handleRestart() {
    console.log('[Main] 重新开始游戏');

    // 重置游戏状态
    gameState.reset();

    // 隐藏结局画面
    UI.hideEnding();

    // 清空终端
    UI.clearTerminal();

    // 重新初始化
    setTimeout(async () => {
        await showIntro();
        startGameLoop();
        UI.updateStatusBar(gameState);
        UI.enableInput();
        isProcessing = false;
    }, 1000);
}

/**
 * 启动游戏循环（每秒更新时间）
 */
function startGameLoop() {
    gameLoop = setInterval(() => {
        gameState.updateTime();
        UI.updateStatusBar(gameState);

        // 检查时间是否耗尽
        if (gameState.timeLeft <= 0 && !isProcessing) {
            handleEnding('TIME_UP');
        }
    }, 1000);
}

/**
 * 停止游戏循环
 */
function stopGameLoop() {
    if (gameLoop) {
        clearInterval(gameLoop);
        gameLoop = null;
    }
}

/**
 * 延迟函数
 */
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// 检查API密钥
function checkAPIKey() {
    if (!CONFIG.API_KEY || CONFIG.API_KEY === '') {
        console.warn('[Main] 警告：API密钥未配置！请在 js/config.js 中填入你的API密钥。');

        // 显示警告信息
        setTimeout(() => {
            UI.addMessage('[WARNING] API密钥未配置。请在 js/config.js 中填入你的API密钥。', 'system');
        }, 2000);
    }
}

// 页面加载完成后初始化游戏
document.addEventListener('DOMContentLoaded', () => {
    checkAPIKey();
    initGame();
});

// 页面关闭前保存
window.addEventListener('beforeunload', () => {
    if (gameState) {
        gameState.save();
    }
});
