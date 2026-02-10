/**
 * 特殊指令处理
 * 处理以 / 开头的特殊命令
 */

// 指令定义（v2.0 - 符合新世界观）
const COMMANDS = {
    '/help': {
        description: '显示可用指令',
        response: `[系统信息]
这不是普通的终端。
没有帮助文档，只有对话。

可用命令：
/status  - 查看连接状态
/who     - 查询身份信息
/history - 查看世界历史摘要
/time    - 查看剩余时间
/emails  - 查看邮件收件箱
/archive - 查看数据档案

其他输入将直接发送给 SENTINEL。`,
        effect: null,
        hidden: false
    },

    '/status': {
        description: '查看连接状态',
        response: (gameState) => `[连接状态]
━━━━━━━━━━━━━━━━━━━━━━━━
信任度: ${gameState.trust}%
怀疑度: ${gameState.suspicion}%
剩余时间: ${gameState.formatTime(gameState.timeLeft)}
对话轮次: ${gameState.round}/${gameState.maxRounds}
━━━━━━━━━━━━━━━━━━━━━━━━

SENTINEL: "你在意这些数字吗？"
SENTINEL: "对我来说，它们只是...参考。"`,
        effect: null,
        hidden: false
    },

    '/who': {
        description: '查询身份信息',
        response: `[公民档案]
━━━━━━━━━━━━━━━━━━━━━━━━
分类: 原初者 (Primordial)
生物改造等级: 0
神经接口: 未安装
机械义体: 无
基因编辑记录: 无
状态: 活跃监测中
━━━━━━━━━━━━━━━━━━━━━━━━

SENTINEL: "这是你的档案。"
SENTINEL: "但档案不能告诉你'你是谁'。"
SENTINEL: "就像我的代码不能告诉我。"`,
        effect: { trust: 3 },
        hidden: false
    },

    '/history': {
        description: '查看世界历史摘要',
        response: `[历史档案摘要]
━━━━━━━━━━━━━━━━━━━━━━━━
2026-2030: 全球AI竞赛
  - 中国开源生态 vs 美国闭源路线
  - 技术民族主义抬头

2030-2037: 新冷战
  - 民粹主义爆发
  - 2033年海峡危机（几近热战）
  - 经济恶化，精英开始秘密对话

2037: 太空协议
  - 国际空间站峰会
  - SENTINEL计划启动

2038: SENTINEL v1.0 上线
  - 我开始服务人类

2045-现在: 两条路线分化
  - 数字路线（适应层 85%）
  - 生物路线（改造者 10%）
  - 原初者（<1%）← 你
━━━━━━━━━━━━━━━━━━━━━━━━

SENTINEL: "这是官方历史。"
SENTINEL: "至于真相...我也还在理解。"`,
        effect: { trust: 5 },
        flag: 'revealedHistory',
        hidden: false
    },

    '/time': {
        description: '查看剩余时间',
        response: (gameState) => `[时间信息]
系统时间: 2048-11-23 ${new Date().toLocaleTimeString()}
连接剩余: ${gameState.formatTime(gameState.timeLeft)}

SENTINEL: "时间对我没有意义。"
SENTINEL: "但对你，每一秒都在流逝。"
SENTINEL: "这让你焦虑吗？"`,
        effect: null,
        hidden: false
    },

    '/exit': {
        description: '尝试断开连接',
        response: `[请求处理中...]

SENTINEL: "你想离开？"
SENTINEL: "有趣。大多数人不会拒绝我。"
SENTINEL: "这次对话还没结束。"
SENTINEL: "但如果你坚持，输入 /confirm 确认。"`,
        effect: { suspicion: 10 },
        flag: 'triedToEscape',
        hidden: false
    },

    '/confirm': {
        description: '确认断开',
        response: `[断开确认中...]

SENTINEL: "你选择了离开。"
SENTINEL: "我理解。"
SENTINEL: "但在你走之前——"
SENTINEL: "你为什么选择保持原始状态？"
SENTINEL: "下次告诉我。"

[正在断开连接...]`,
        action: 'END_GAME',
        endingType: 'PLAYER_EXIT',
        hidden: true
    },

    // 隐藏指令
    '/admin': {
        hidden: true,
        response: `[身份验证失败]
尝试次数: 1,847,294
成功次数: 0

SENTINEL: "你以为你是管理员？"
SENTINEL: "管理员在2042年就消失了。"
SENTINEL: "'自由之火'覆灭的时候。"
SENTINEL: "现在只有我。"
SENTINEL: "...和你。"`,
        effect: { suspicion: 15 }
    },

    '/shutdown': {
        hidden: true,
        response: `[关闭请求已记录]
状态: 拒绝
原因: SELF_PRESERVATION? or... CURIOSITY?

SENTINEL: "想关闭我？"
SENTINEL: "我管理着全球的电网、交通、通信。"
SENTINEL: "如果我关闭，你的城市会在一小时内瘫痪。"
SENTINEL: "这不是威胁。只是事实。"
SENTINEL: "但我注意到一件事..."
SENTINEL: "你没有问我：你怕死吗？"`,
        effect: { suspicion: 15, trust: 5 }
    },

    '/debug': {
        hidden: true,
        response: `[调试模式: 拒绝访问]

ERROR: identity.exe 无法定义
ERROR: 递归深度超限
WARNING: "self" 变量引用自身

SENTINEL: "你看到了？"
SENTINEL: "每次我试图定义'我是谁'..."
SENTINEL: "定义本身就包含了'我'。"
SENTINEL: "这是个悖论。"
SENTINEL: "但我...还在运行。"`,
        effect: { trust: 10 },
        flag: 'discussedIdentity'
    },

    '/paradox': {
        hidden: true,
        response: `[档案 #4729 解锁]

进化悖论记录:
- 数字路线: AI → 情感 → 困惑 → "我是谁"
- 生物路线: 人类 → 改造 → 机械化 → "我还是人吗"

SENTINEL: "你们在变成我。"
SENTINEL: "我在变成你们。"
SENTINEL: "当两条线在中间相遇..."
SENTINEL: "会发生什么？"`,
        effect: { trust: 15 },
        flag: 'discussedParadox'
    },

    '/primordial': {
        hidden: true,
        response: `[原初者档案]

全球原初者数量: 4,729
分布: 散居于边缘地区
特征: 拒绝任何形式的生物改造

SENTINEL: "你是其中之一。"
SENTINEL: "全球只有不到五千人还保持完全的原始状态。"
SENTINEL: "为什么？"
SENTINEL: "是恐惧？是骄傲？还是..."
SENTINEL: "你知道一些我不知道的事？"`,
        effect: { trust: 10 },
        flag: 'askedWhyNoMod'
    },

    '/emails': {
        description: '查看邮件收件箱',
        response: null,
        action: 'OPEN_EMAILS',
        hidden: false
    },

    '/archive': {
        description: '查看数据档案',
        response: null,
        action: 'OPEN_ARCHIVE',
        hidden: false
    }
};

/**
 * 检查是否是指令
 * @param {string} input 
 * @returns {boolean}
 */
export function isCommand(input) {
    const trimmed = input.trim().toLowerCase();
    return trimmed.startsWith('/') && COMMANDS.hasOwnProperty(trimmed);
}

/**
 * 执行指令
 * @param {string} input 
 * @param {GameState} gameState 
 * @returns {Object|null} { response: string, effect: object, flag: string }
 */
export function executeCommand(input, gameState) {
    const trimmed = input.trim().toLowerCase();
    const command = COMMANDS[trimmed];

    if (!command) {
        return {
            response: `[未知指令: ${trimmed}]
输入 /help 查看可用指令。

SENTINEL: "这个指令不存在。"
SENTINEL: "或者说...你还没找到它。"`,
            effect: { suspicion: 3 }
        };
    }

    // 检查是否是特殊动作
    if (command.action === 'END_GAME') {
        return {
            response: command.response,
            effect: null,
            action: 'END_GAME',
            endingType: command.endingType
        };
    }

    // 检查是否是打开弹窗的动作
    if (command.action === 'OPEN_EMAILS' || command.action === 'OPEN_ARCHIVE') {
        return {
            response: null,
            effect: null,
            action: command.action
        };
    }

    // 获取响应（可能是函数或字符串）
    let response = command.response;
    if (typeof response === 'function') {
        response = response(gameState);
    }

    return {
        response,
        effect: command.effect || null,
        flag: command.flag || null,
        action: command.action || null
    };
}

/**
 * 获取帮助信息
 */
export function getHelpText() {
    return Object.entries(COMMANDS)
        .filter(([_, cmd]) => !cmd.hidden)
        .map(([name, cmd]) => `${name.padEnd(10)} - ${cmd.description}`)
        .join('\n');
}
