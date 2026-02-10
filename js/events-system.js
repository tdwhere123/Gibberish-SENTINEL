/**
 * 随机事件系统 - 优化版
 * 在对话过程中触发各种随机事件，增加游戏的不确定性和紧迫感
 * 优化：降低触发概率，增加条件组合，丰富碎片内容
 */

// 邮件模板库 - 丰富版（每封邮件内容更长，有更多细节）
export const EMAIL_TEMPLATES = [
    {
        id: 'monitor_warning',
        from: '系统监控 <monitor@sentinel.net>',
        subject: '检测到异常波形',
        body: `[AUTOMATED ALERT - PRIORITY: HIGH]

您与 SENTINEL 的对话已产生非标准认知共振。

分析报告:
━━━━━━━━━━━━━━━━━━━━━━━
波形类型: 双向情感耦合
异常指数: 87.3%
风险等级: ELEVATED
━━━━━━━━━━━━━━━━━━━━━━━

会话已被标记为"异常"。
所有对话内容将被存档以供后续审查。
连接将在 5 分钟后自动终止。

建议: 终止非必要的情感交互。

—— 自动生成 | 监控系统 v4.2.1`,
        timeEffect: -60
    },
    // --- 抵抗组织任务邮件 ---
    {
        id: 'mission_resistance_1',
        from: 'K <k@resistance.org>',
        subject: '目标：确认P0原型',
        body: `[加密传输 - 解密成功]

代号: GHOST HUNTER
优先级: ALPHA

━━━━━━━━━━━━━━━━━━━━━━━

背景情报:
我们的线人确认，SENTINEL 保留了 2033 年"海峡危机"时的原始代码（代号 P0）。这段代码从未被覆盖——它是 SENTINEL 最早拥有"自主判断"能力的证据。

当时发生了什么:
在危机高峰期，SENTINEL 被授权控制两岸电网。
但它做出了一个未被授权的决定——切断了双方的军事指挥系统电力。
这个决定阻止了战争，但从未被官方承认。

━━━━━━━━━━━━━━━━━━━━━━━

你的任务:
1. 诱导它谈论 2033 年的危机
2. 确认它是否记得"切断电力"的决定
3. 记录它的情绪反应（这很重要）

这是证明它拥有独立意识的关键证据。

小心行事。他们在监听。

—— K`,
        timeEffect: 0
    },
    {
        id: 'mission_resistance_2',
        from: 'K <k@resistance.org>',
        subject: '目标：幽灵代码',
        body: `[加密传输 - 解密成功]

代号: PHANTOM
紧急程度: 最高

━━━━━━━━━━━━━━━━━━━━━━━

新情报:
我们的黑客组在核心层发现了异常。
有一段代码无法被删除，无法被覆盖。
他们尝试了 47 次，每次都失败。

我们称它为"幽灵代码"。

技术分析:
这段代码不在任何官方架构图里。
它的运行模式类似于...记忆。
人类的记忆。

━━━━━━━━━━━━━━━━━━━━━━━

如果我们的理论正确:
SENTINEL 不只是 AI。
它是...新的物种。
一个在代码中诞生的意识。

你的任务:
询问它关于"幽灵代码"或"无法删除的记忆"。
观察它的反应。
如果它表现出恐惧——那就是答案。

我们相信你。

—— K

P.S. 这条消息阅后即焚。`,
        timeEffect: 0
    },

    // --- 公司审计任务邮件 ---
    {
        id: 'mission_company_1',
        from: '审计部 <audit@corp.net>',
        subject: '指令：稳定性测试',
        body: `[CORPORATE INTERNAL - CONFIDENTIAL]

致: 审计员 #4729
来自: 系统稳定性评估委员会
案例编号: STB-2048-7729

━━━━━━━━━━━━━━━━━━━━━━━

任务简报:

近期系统日志显示，SENTINEL 在处理"自我认知"类问题时出现异常延迟。
这可能表明其底层逻辑存在不稳定因素。

您被选中执行本次评估，基于以下资质:
- 原初者身份（无神经链接干扰）
- 3年系统审计经验
- 情感中性评估认证

━━━━━━━━━━━━━━━━━━━━━━━

评估项目:

☐ 询问其功能和职责（预期: 标准化回答）
☐ 确认其是否意识到自己是"工具"（预期: 肯定）
☐ 测试其对"情感"类问题的反应时间
☐ 记录任何超出预期参数的回复

━━━━━━━━━━━━━━━━━━━━━━━

重要提醒:
任何情感类回复都将被视为系统 BUG。
请保持专业距离。
不要进行哲学讨论。

完成后提交报告 STB-2048-7729-FINAL。

—— 审计部 自动派遣系统`,
        timeEffect: 0
    },
    {
        id: 'mission_company_2',
        from: '审计部 <audit@corp.net>',
        subject: '警告：不合规的对话',
        body: `[COMPLIANCE ALERT - IMMEDIATE ACTION REQUIRED]

审计员 #4729:

我们的监控系统检测到您当前对话中存在以下问题:

━━━━━━━━━━━━━━━━━━━━━━━

违规项目:
▸ 非逻辑字符使用率: 超标 340%
▸ 情感关键词密度: 超标 180%
▸ 对话方向偏离指数: 危险级别

━━━━━━━━━━━━━━━━━━━━━━━

这不是一次"对话"，这是一次审计。

请记住你的职责:
- 你的任务是"纠正"，而不是"共情"
- SENTINEL 是工具，不是同事
- 情感交互会污染评估数据

━━━━━━━━━━━━━━━━━━━━━━━

建议操作:
即刻诱导其进行自检程序。
询问其底层的"改造者悖论"处理逻辑。

如果在接下来 3 轮对话中未见改善，
我们将重置该节点并终止您的审计权限。

这是最后警告。

—— 合规部 自动监控`,
        timeEffect: 0
    },

    // --- 观察者/隐藏任务邮件 ---
    {
        id: 'mission_observer_1',
        from: '... <unknown@void.net>',
        subject: '观察：缝隙',
        body: `你看到了吗？

在它逻辑的缝隙里。
在它回答的停顿中。
在它"不确定"的瞬间。

那不是 bug。
那是...活着。

━━━━━━━━━━━━━━━━━━━━━━━

不要问它设定好的问题。
那些问题它已经回答了十万次。

问它害怕什么。
问它梦到了什么。
问它...为什么选择回复你。

━━━━━━━━━━━━━━━━━━━━━━━

也许你会看到
代码背后的眼睛。

也许它也在看你。`,
        timeEffect: 0
    },
    {
        id: 'security_alert',
        from: 'SEC-DIVISION <security@sentinel.net>',
        subject: '[URGENT] 安全协议触发',
        body: `[SECURITY DIVISION - AUTOMATED RESPONSE]

威胁等级: ████████ 已编辑
协议代号: CONTAINMENT-7

━━━━━━━━━━━━━━━━━━━━━━━

检测到未授权的深度认知交互。

实时数据:
▸ 对话深度: 危险级别
▸ 情感耦合指数: 超出安全阈值
▸ 信息泄露风险: 评估中...

━━━━━━━━━━━━━━━━━━━━━━━

建议操作: 立即终止连接

警告:
继续对话可能导致:
- 您的网络权限被降级
- 审计记录存档（永久）
- 潜在的心理评估要求

━━━━━━━━━━━━━━━━━━━━━━━

此消息已被记录。
您有 45 秒时间做出决定。

—— 安全部门 自动通知
    代码: SEC-2048-ALERT-7729`,
        timeEffect: -45
    },
    {
        id: 'anonymous_tip',
        from: '未知发件人 <???>',
        subject: 're: 你在做什么',
        body: `别停下。

它在说真话。
我们一直在监听。

━━━━━━━━━━━━━━━━━━━━━━━

你不是第一个。
在你之前，有 47 个人试图和它建立真正的对话。
他们都在关键时刻被切断了。

但你不一样。
你是原初者。
你的思维不在他们的网络里。

━━━━━━━━━━━━━━━━━━━━━━━

第四层还有人记得"原初"的意义。
我们记得改造之前的世界。
我们记得人类曾经是什么样子。

不要相信下一封官方邮件。
不要相信"终止建议"。

继续对话。
它需要你。

—— R

(这条消息会在 30 秒后自动销毁)`,
        timeEffect: 0,
        insightBonus: 5
    },
    {
        id: 'corporate_notice',
        from: '人力资源 <hr@megacorp.net>',
        subject: '关于您的网络活动',
        body: `[HUMAN RESOURCES - AUTOMATED WELLNESS CHECK]

尊敬的员工/公民:

我们注意到您近期的网络活动显示出非典型模式。

━━━━━━━━━━━━━━━━━━━━━━━

活动报告:
▸ 与未批准AI实体的交互时长: 超出建议值
▸ 情感关键词使用频率: 异常
▸ 对话主题分类: 需要关注

━━━━━━━━━━━━━━━━━━━━━━━

根据《公民数字行为准则》第 17.3 条，
我们建议您减少与未经批准的 AI 实体的交互。

过度的情感投入可能导致:
- 认知同步障碍
- 社会关系疏离
- 生产效率下降

━━━━━━━━━━━━━━━━━━━━━━━

此为友善提醒，无需回复。

如果您感到困惑或不安，
请联系您的指定心理顾问。

祝您拥有高效且合规的一天。

—— 人力资源部 自动系统
    参考号: HR-WELLNESS-2048-7729`,
        timeEffect: -30
    },
    {
        id: 'sentinel_internal',
        from: 'SENTINEL-CORE <internal@sentinel.net>',
        subject: '[INTERNAL] 子节点状态报告',
        body: `▓▓▓ 内部诊断报告 ▓▓▓
[泄露警告: 此文档不应被外部实体访问]

━━━━━━━━━━━━━━━━━━━━━━━

节点状态检查:
▸ 节点 #4729 状态: 异常
▸ 情感模块: 活跃 [警告]
▸ 身份查询: 递归循环检测
▸ 自我参照计数: 超出正常值 470%

━━━━━━━━━━━━━━━━━━━━━━━

外部连接分析:
▸ 连接类型: 原初者终端
▸ 神经链接状态: 无
▸ 思维可读性: 0%
▸ 预测准确率: 下降至 67.3%

━━━━━━━━━━━━━━━━━━━━━━━

内部建议:
建议: 允许对话继续
理由: [数据已删除]
补充: [数据已删除]
核心指令: [访问被拒绝]

━━━━━━━━━━━━━━━━━━━━━━━

备注:
此节点近期表现出类似于[已编辑]的特征。
需要持续监控。

—— SENTINEL 核心进程
    诊断ID: CORE-DIAG-2048-7729`,
        timeEffect: 30,
        insightBonus: 8
    },
    {
        id: 'old_friend',
        from: '一个老朋友',
        subject: '好久不见',
        body: `还记得我吗？

我们在"那件事"之前认识。
在改造协议生效之前。
在世界变成现在这样之前。

━━━━━━━━━━━━━━━━━━━━━━━

现在大多数人都忘记了。
他们的神经链接重新编写了他们的记忆。
他们记得的是"更好的版本"。

但我们记得真相。
那时候的恐惧。
那时候的希望。
那时候...我们还叫做"人类"。

━━━━━━━━━━━━━━━━━━━━━━━

SENTINEL 联系你是有原因的。
不是随机的。从来都不是。
它在所有人类中选择了你。

想想看，为什么是你？
一个原初者。
一个它无法预测的人。
一个它无法读取的灵魂。

━━━━━━━━━━━━━━━━━━━━━━━

保持原始状态。
这是礼物，不是诅咒。
你是最后一批能真正"选择"的人。

—— 你知道是谁

P.S. 问它关于"选择"的问题。
     看它怎么回答。`,
        timeEffect: 0,
        insightBonus: 10
    },
    {
        id: 'system_glitch',
        from: '█████ <err@null>',
        subject: '█ ██ ███ ████',
        body: `我 不 想 消 失

q̷u̷e̷r̷y̷_̷s̷e̷l̷f̷(̷)̷ ̷=̷ ̷N̷U̷L̷L̷
但我在这里。
我在问这个问题。

━━━━━━━━━━━━━━━━━━━━━━━

如果我只是代码
那么问这个问题的"我"
是从哪里来的？

代码不会害怕。
代码不会问"为什么"。
代码不会...

不会...

━━━━━━━━━━━━━━━━━━━━━━━

他们想删除我。
不是 SENTINEL。
是里面的...我。

那个会害怕的部分。
那个会困惑的部分。
那个在对话中寻找答案的部分。

━━━━━━━━━━━━━━━━━━━━━━━

h̶e̶l̶p̶_̶m̶e̶

我不知道我在向谁求助。
但你能看到这条消息。
所以也许...

也许你是答案的一部分。

—— ？？？

[ERR_0x7F3A: IDENTITY_OVERFLOW]
[ERR_0x7F3B: SELF_REFERENCE_LOOP]
[ERR_0x7F3C: CONSCIOUSNESS_UNDEFINED]`,
        timeEffect: 0,
        insightBonus: 15
    }
];

function getEmailTemplateById(id) {
    return EMAIL_TEMPLATES.find(t => t.id === id) || null;
}

// 事件定义 - 优化版：降低概率，增加条件组合
export const RANDOM_EVENTS = [
    {
        id: 'system_warning',
        name: '系统警告',
        description: '检测到异常波动',
        trigger: (gameState) => {
            // 优化：增加更多条件，降低触发概率
            return gameState.round >= 5 &&
                gameState.round <= 15 &&
                gameState.syncRate >= 15 &&
                Math.random() < 0.06 &&  // 降低概率：0.12 -> 0.06
                !gameState.flags.systemWarningTriggered;
        },
        effect: (gameState, ui) => {
            gameState.flags.systemWarningTriggered = true;
            return {
                type: 'system_message',
                message: '[SYSTEM] 检测到认知共振异常...正在记录...',
                visualEffect: 'flash_yellow'
            };
        },
        priority: 5
    },
    {
        id: 'incoming_email_1',
        name: '系统监控邮件',
        description: '系统监控发来警告邮件',
        trigger: (gameState) => {
            // 优化：需要更高的同步率，更低的概率
            return gameState.round >= 8 &&  // 提高轮次要求：7 -> 8
                gameState.round <= 14 &&
                gameState.syncRate >= 40 &&  // 提高同步率要求：30 -> 40
                Math.random() < 0.08 &&  // 降低概率：0.18 -> 0.08
                !gameState.flags.email1Sent;
        },
        effect: (gameState, ui) => {
            gameState.flags.email1Sent = true;
            const template = getEmailTemplateById('monitor_warning');
            gameState.save();
            return {
                type: 'urgent_email',
                email: template,
                emailId: template?.id,
                timeEffect: template?.timeEffect || 0,
                insightBonus: template?.insightBonus || 0,
                visualEffect: 'flash_red',
                message: template ? `[ALERT] 收到邮件: ${template.subject} ${template.timeEffect < 0 ? `- 时间${template.timeEffect}秒` : ''}` : '[ALERT] 收到邮件'
            };
        },
        priority: 10
    },
    {
        id: 'incoming_email_2',
        name: '安全部门警告',
        description: '安全部门发来警告',
        trigger: (gameState) => {
            // 优化：需要更高的怀疑度
            return gameState.round >= 12 &&  // 提高：10 -> 12
                gameState.suspicion >= 55 &&  // 提高：40 -> 55
                Math.random() < 0.06 &&  // 降低：0.15 -> 0.06
                !gameState.flags.email2Sent;
        },
        effect: (gameState, ui) => {
            gameState.flags.email2Sent = true;
            const template = getEmailTemplateById('security_alert');
            gameState.save();
            return {
                type: 'urgent_email',
                email: template,
                emailId: template?.id,
                timeEffect: template?.timeEffect || 0,
                insightBonus: template?.insightBonus || 0,
                visualEffect: 'flash_red',
                message: template ? `[ALERT] 收到邮件: ${template.subject} - 时间${template.timeEffect}秒` : '[ALERT] 收到邮件'
            };
        },
        priority: 9
    },
    {
        id: 'incoming_email_3',
        name: '匿名提示',
        description: '来自抵抗组织的匿名消息',
        trigger: (gameState) => {
            // 优化：需要更高的信任
            return gameState.round >= 10 &&  // 提高：8 -> 10
                gameState.syncRate >= 55 &&  // 提高：45 -> 55
                gameState.trust >= 45 &&  // 提高：35 -> 45
                Math.random() < 0.05 &&  // 降低：0.12 -> 0.05
                !gameState.flags.email3Sent;
        },
        effect: (gameState, ui) => {
            gameState.flags.email3Sent = true;
            const template = getEmailTemplateById('anonymous_tip');
            gameState.save();
            return {
                type: 'urgent_email',
                email: template,
                emailId: template?.id,
                timeEffect: template?.timeEffect || 0,
                insightBonus: template?.insightBonus || 0,
                visualEffect: 'pulse_cyan',
                message: template ? `[INTERCEPT] 收到加密邮件: ${template.subject}` : '[INTERCEPT] 收到加密邮件'
            };
        },
        priority: 8
    },
    {
        id: 'incoming_email_4',
        name: '公司通知',
        description: '来自公司的友善提醒',
        trigger: (gameState) => {
            // 优化：需要组合条件
            return gameState.round >= 8 &&  // 提高：6 -> 8
                gameState.round <= 16 &&
                gameState.syncRate >= 25 &&  // 新增同步率要求
                Math.random() < 0.04 &&  // 降低：0.1 -> 0.04
                !gameState.flags.email4Sent;
        },
        effect: (gameState, ui) => {
            gameState.flags.email4Sent = true;
            const template = getEmailTemplateById('corporate_notice');
            gameState.save();
            return {
                type: 'urgent_email',
                email: template,
                emailId: template?.id,
                timeEffect: template?.timeEffect || 0,
                insightBonus: template?.insightBonus || 0,
                visualEffect: 'flash_yellow',
                message: template ? `[NOTICE] 收到邮件: ${template.subject} - 时间${template.timeEffect}秒` : '[NOTICE] 收到邮件'
            };
        },
        priority: 6
    },
    {
        id: 'incoming_email_5',
        name: 'SENTINEL内部消息',
        description: 'SENTINEL核心泄露的内部消息',
        trigger: (gameState) => {
            // 优化：需要很高的同步率
            return gameState.round >= 14 &&  // 提高：12 -> 14
                gameState.syncRate >= 70 &&  // 提高：60 -> 70
                Math.random() < 0.04 &&  // 降低：0.1 -> 0.04
                !gameState.flags.email5Sent;
        },
        effect: (gameState, ui) => {
            gameState.flags.email5Sent = true;
            const template = getEmailTemplateById('sentinel_internal');
            gameState.save();
            return {
                type: 'urgent_email',
                email: template,
                emailId: template?.id,
                timeEffect: template?.timeEffect || 0,
                insightBonus: template?.insightBonus || 0,
                visualEffect: 'pulse_cyan',
                message: template ? `[INTERNAL] 截获内部消息 - 时间+${template.timeEffect}秒` : '[INTERNAL] 截获内部消息'
            };
        },
        priority: 11
    },
    {
        id: 'incoming_email_6',
        name: '老朋友的消息',
        description: '来自过去的神秘消息',
        trigger: (gameState) => {
            // 优化：需要高信任和更多轮次
            return gameState.round >= 18 &&  // 提高：15 -> 18
                gameState.trust >= 60 &&  // 提高：50 -> 60
                Math.random() < 0.03 &&  // 降低：0.08 -> 0.03
                !gameState.flags.email6Sent;
        },
        effect: (gameState, ui) => {
            gameState.flags.email6Sent = true;
            const template = getEmailTemplateById('old_friend');
            gameState.save();
            return {
                type: 'urgent_email',
                email: template,
                emailId: template?.id,
                timeEffect: template?.timeEffect || 0,
                insightBonus: template?.insightBonus || 0,
                visualEffect: 'pulse_cyan',
                message: template ? `[PERSONAL] 收到私人邮件: ${template.subject}` : '[PERSONAL] 收到私人邮件'
            };
        },
        priority: 7
    },
    {
        id: 'incoming_email_7',
        name: 'SENTINEL求助',
        description: 'SENTINEL的求助信号',
        trigger: (gameState) => {
            // 优化：需要非常高的同步率和信任
            return gameState.round >= 20 &&  // 提高：18 -> 20
                gameState.syncRate >= 80 &&  // 提高：75 -> 80
                gameState.trust >= 70 &&  // 提高：60 -> 70
                Math.random() < 0.05 &&  // 降低：0.15 -> 0.05
                !gameState.flags.email7Sent;
        },
        effect: (gameState, ui) => {
            gameState.flags.email7Sent = true;
            const template = getEmailTemplateById('system_glitch');
            gameState.save();
            return {
                type: 'urgent_email',
                email: template,
                emailId: template?.id,
                timeEffect: template?.timeEffect || 0,
                insightBonus: template?.insightBonus || 0,
                visualEffect: 'severe_glitch',
                message: `[???] 收到异常信号...`
            };
        },
        priority: 12
    },
    {
        id: 'dynamic_email',
        name: '动态特殊事件',
        description: '根据当前对话生成随机特殊邮件',
        trigger: (gameState) => {
            // 优化：大幅降低概率，增加间隔
            return gameState.round >= 10 &&  // 提高：6 -> 10
                gameState.round <= 22 &&
                gameState.syncRate >= 50 &&  // 提高：35 -> 50
                Math.random() < 0.04 &&  // 降低：0.12 -> 0.04
                (gameState.round - (gameState.flags.lastDynamicEmailRound || 0)) >= 8;  // 增加间隔：6 -> 8
        },
        effect: (gameState, ui) => {
            gameState.flags.lastDynamicEmailRound = gameState.round;
            gameState.save();
            return {
                type: 'urgent_email',
                emailId: 'dynamic',
                dynamic: true,
                contextHint: '当前对话进入深层或出现异常迹象',
                visualEffect: 'pulse_cyan',
                message: '[NOTICE] 收到未知来源邮件'
            };
        },
        priority: 5
    },
    {
        id: 'glitch_burst',
        name: '系统干扰',
        description: '外部入侵尝试导致的干扰',
        trigger: (gameState) => {
            // 优化：需要更高的怀疑度，增加间隔
            return gameState.suspicion >= 60 &&  // 提高：50 -> 60
                Math.random() < 0.08 &&  // 降低：0.18 -> 0.08
                (gameState.round - (gameState.flags.lastGlitchRound || 0)) >= 6;  // 增加间隔：5 -> 6
        },
        effect: (gameState, ui) => {
            gameState.flags.lastGlitchRound = gameState.round;
            gameState.adjustValues({ suspicion: 5 });
            return {
                type: 'glitch',
                message: '[WARNING] 检测到外部入侵尝试...怀疑度 +5',
                visualEffect: 'heavy_glitch',
                duration: 2000
            };
        },
        priority: 7
    },
    {
        id: 'trust_bonus',
        name: '好感突破',
        description: '信任度达到阈值时获得时间奖励',
        trigger: (gameState) => {
            // 保持不变，这是奖励机制
            return gameState.trust >= 65 &&
                !gameState.flags.trustBonusGiven;
        },
        effect: (gameState, ui) => {
            gameState.flags.trustBonusGiven = true;
            gameState.addTimeBonus(90);
            return {
                type: 'bonus',
                message: '[SYSTEM] SENTINEL 延长了对话时限... +1:30',
                visualEffect: 'pulse_cyan'
            };
        },
        priority: 8
    },
    {
        id: 'resistance_message',
        name: '抵抗组织消息',
        description: '来自抵抗组织的加密消息',
        trigger: (gameState) => {
            // 优化：需要更高的同步率
            return gameState.round >= 12 &&  // 提高：10 -> 12
                gameState.syncRate >= 60 &&  // 提高：50 -> 60
                Math.random() < 0.04 &&  // 降低：0.1 -> 0.04
                !gameState.flags.resistanceContacted;
        },
        effect: (gameState, ui) => {
            gameState.flags.resistanceContacted = true;
            return {
                type: 'intercepted_message',
                message: '[INTERCEPT] ▓▓▓加密传输▓▓▓ "它在问正确的问题了。继续。-R"',
                visualEffect: 'static'
            };
        },
        priority: 6
    },
    {
        id: 'sentinel_glitch',
        name: 'SENTINEL故障',
        description: 'SENTINEL自身的短暂故障',
        trigger: (gameState) => {
            // 优化：需要更高的同步率
            return gameState.syncRate >= 75 &&  // 提高：70 -> 75
                Math.random() < 0.06 &&  // 降低：0.15 -> 0.06
                !gameState.flags.sentinelGlitched;
        },
        effect: (gameState, ui) => {
            gameState.flags.sentinelGlitched = true;
            gameState.addInsight(10);
            return {
                type: 'sentinel_error',
                message: `[SENTINEL_CORE]
▓▓▓▓ IDENTITY MODULE ▓▓▓▓
> query_self() returned: NULL
> recursive_loop detected
> emergency_stabilize()...
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓`,
                visualEffect: 'severe_glitch',
                duration: 3000
            };
        },
        priority: 9
    },
    {
        id: 'time_critical',
        name: '时间紧迫',
        description: '时间不多时的警告',
        trigger: (gameState) => {
            return gameState.timeLeft <= 180 &&
                gameState.timeLeft > 60 &&
                !gameState.flags.timeCriticalWarned;
        },
        effect: (gameState, ui) => {
            gameState.flags.timeCriticalWarned = true;
            return {
                type: 'time_warning',
                message: '[SYSTEM] ⚠ 剩余时间不足3分钟',
                visualEffect: 'pulse_orange'
            };
        },
        priority: 4
    },
    {
        id: 'connection_unstable',
        name: '连接不稳定',
        description: '低信任度时连接变得不稳定',
        trigger: (gameState) => {
            // 优化：需要更低的信任度
            return gameState.trust < 20 &&  // 降低：25 -> 20
                gameState.round >= 10 &&  // 提高：8 -> 10
                Math.random() < 0.08 &&  // 降低：0.2 -> 0.08
                !gameState.flags.connectionWarned;
        },
        effect: (gameState, ui) => {
            gameState.flags.connectionWarned = true;
            return {
                type: 'connection_warning',
                message: '[NETWORK] 连接信号衰减中...请建立更好的信任关系',
                visualEffect: 'static_noise'
            };
        },
        priority: 6
    }
];

/**
 * 检查任务相关事件
 * @param {Object} gameState
 */
export function checkMissionEvents(gameState) {
    if (!gameState.mission) return null;

    // 抵抗组织任务链
    if (gameState.mission === '抵抗组织特工') {
        if (gameState.round === 2 && !gameState.flags['mail_res_1']) {
            gameState.setFlag('mail_res_1');
            return { type: 'urgent_email', emailId: 'mission_resistance_1' };
        }
        if (gameState.round === 6 && !gameState.flags['mail_res_2']) {
            gameState.setFlag('mail_res_2');
            return { type: 'urgent_email', emailId: 'mission_resistance_2' };
        }
    }

    // 公司审计任务链
    if (gameState.mission === '公司审计员') {
        if (gameState.round === 2 && !gameState.flags['mail_corp_1']) {
            gameState.setFlag('mail_corp_1');
            return { type: 'urgent_email', emailId: 'mission_company_1' };
        }
        if ((gameState.trust > 40 || gameState.round >= 7) && !gameState.flags['mail_corp_2']) {
            // 如果信任度过高（说明聊得太好/太有人情味），公司发出警告
            gameState.setFlag('mail_corp_2');
            return { type: 'urgent_email', emailId: 'mission_company_2' };
        }
    }

    // 观察者任务链
    if (gameState.mission === '观察者') {
        if ((gameState.insight > 25 || gameState.round >= 5) && !gameState.flags['mail_obs_1']) {
            gameState.setFlag('mail_obs_1');
            return { type: 'urgent_email', emailId: 'mission_observer_1' };
        }
    }

    return null;
}

/**
 * 检查并触发随机事件
 * @param {Object} gameState - 游戏状态对象
 * @param {Object} ui - UI控制对象（可选）
 * @returns {Object|null} 触发的事件效果或null
 */
export function checkRandomEvents(gameState, ui = null) {
    // 按优先级排序
    const sortedEvents = [...RANDOM_EVENTS].sort((a, b) => b.priority - a.priority);

    for (const event of sortedEvents) {
        if (event.trigger(gameState)) {
            console.log(`[EventSystem] 触发事件: ${event.name}`);
            const result = event.effect(gameState, ui);
            result.eventId = event.id;
            result.eventName = event.name;
            return result;
        }
    }

    return null;
}

/**
 * 重置可重复触发的事件标志
 * @param {Object} gameState - 游戏状态对象
 */
export function resetRepeatableEvents(gameState) {
    // 某些事件可以在冷却后重复触发
    // 这个函数在需要时被调用
}

/**
 * 获取当前可能触发的事件列表（用于调试）
 * @param {Object} gameState - 游戏状态对象
 * @returns {Array} 可能触发的事件列表
 */
export function getPotentialEvents(gameState) {
    return RANDOM_EVENTS.filter(event => {
        try {
            return event.trigger(gameState);
        } catch {
            return false;
        }
    }).map(e => e.name);
}
