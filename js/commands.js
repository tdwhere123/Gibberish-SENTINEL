/**
 * 斜杠命令（v2.0）
 * 仅保留: /emails /archive /exit
 */

const COMMANDS = Object.freeze({
    '/emails': {
        description: '打开邮件弹窗',
        action: 'OPEN_EMAILS'
    },
    '/archive': {
        description: '打开档案与任务清单',
        action: 'OPEN_ARCHIVE'
    },
    '/exit': {
        description: '主动断开连接并进入结局',
        action: 'END_GAME',
        endingType: 'PLAYER_EXIT',
        response: '[CONNECTION CLOSING]\nSENTINEL: 你选择了主动断开。'
    }
});

const COMMAND_HINT = '可用命令: /emails, /archive, /exit';

export function isCommand(input) {
    const trimmed = String(input || '').trim();
    return trimmed.startsWith('/');
}

export function executeCommand(input, gameState) {
    const trimmed = String(input || '').trim().toLowerCase();
    const command = COMMANDS[trimmed];

    if (!command) {
        return {
            response: `[未知指令: ${trimmed}]\n${COMMAND_HINT}`,
            effect: { suspicion: 1 },
            action: null
        };
    }

    if (command.action === 'OPEN_EMAILS' || command.action === 'OPEN_ARCHIVE') {
        return {
            response: null,
            effect: null,
            action: command.action
        };
    }

    if (command.action === 'END_GAME') {
        if (gameState && typeof gameState.setFlag === 'function') {
            gameState.setFlag('triedToEscape', true);
        }
        return {
            response: command.response,
            effect: { suspicion: 5 },
            action: 'END_GAME',
            endingType: command.endingType
        };
    }

    return {
        response: null,
        effect: null,
        action: null
    };
}

export function getHelpText() {
    return Object.entries(COMMANDS)
        .map(([name, cmd]) => `${name.padEnd(10)} - ${cmd.description}`)
        .join('\n');
}
