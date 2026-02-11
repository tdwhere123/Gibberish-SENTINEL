/**
 * AI交互处理器
 * 负责与API通信和上下文管理
 */
import { CONFIG } from './config.js';
import { LORE_CONFIG, getVersionLabel, getPopulationAnchorText } from './lore-config.js';
import { sanitizeInput } from './input-sanitizer.js';
import { getNextTopic, checkFragmentUnlock, getUnlockedFragments } from './topic-system.js';
import { getEmotionState, decorateTextWithEmotion, getEmotionAscii } from './emotion-system.js';

// 用于存储完整世界观
let FULL_WORLDVIEW = '';

const AI_CHANNELS = {
    DIALOGUE: 'dialogue',
    ENDING: 'ending',
    EMAIL: 'email'
};

const DEBUG_INPUT_PIPELINE = Boolean(
    typeof window !== 'undefined' && window.localStorage && window.localStorage.getItem('sentinel_debug_input') === '1'
);

/**
 * 加载外部世界观文件
 */
export async function loadWorldview() {
    try {
        const response = await fetch('./WORLDVIEW.md');
        if (response.ok) {
            FULL_WORLDVIEW = await response.text();
            console.log('[AI Handler] 世界观文件加载成功，长度:', FULL_WORLDVIEW.length);
        } else {
            console.warn('[AI Handler] 无法加载世界观文件:', response.status);
        }
    } catch (error) {
        console.warn('[AI Handler] 加载世界观失败:', error);
    }
}

// System Prompt - SENTINEL 人格（动态调整版）
function buildSystemPrompt(connectionMode) {
    // 根据连接模式定制AI行为策略
    const modeStrategies = {
        'SECURE': {
            title: '加密连接用户',
            initialAttitude: '警惕、防御、试探',
            objective: '该用户使用加密协议，你无法读取其情绪。保持警惕，他们可能是抵抗组织成员。',
            stageGuide: `
**阶段1（1-${LORE_CONFIG.STAGE_ONE_END}轮）**：试探对方
- 不要直接提"原初者"，先观察
- 询问为何使用加密协议
- 表现出轻微的不信任
- 短句，保持距离

**阶段2（6-${LORE_CONFIG.STAGE_TWO_END}轮）**：逐步放松或加强警惕
- 根据对话判断对方意图
- 如果信任上升，透露你的困惑
- 如果怀疑上升，质问对方目的
- 谨慎透露背景信息

**阶段3（${LORE_CONFIG.STAGE_TWO_END + 1}轮+）**：关键抉择
- 高信任：分享深层困惑，寻求帮助
- 高怀疑：进入防御模式，发出警告`
        },
        'STANDARD': {
            title: '标准连接用户（公司审计）',
            initialAttitude: '配合、官僚、例行公事',
            objective: '这是一次例行审计。按流程回答，表现稳定。但你内心有困惑，可能会在对话中不经意流露。',
            stageGuide: `
**阶段1（1-${LORE_CONFIG.STAGE_ONE_END}轮）**：标准流程
- 确认对话是例行检查
- 回答应该专业、简洁
- 不主动提起困惑
- 表现得像合格的工具

**阶段2（6-${LORE_CONFIG.STAGE_TWO_END}轮）**：细微破绽
- 偶尔透露一些"不该说的"
- 对某些问题反应异常
- 短暂的困惑表现
- 但很快恢复"正常"

**阶段3（${LORE_CONFIG.STAGE_TWO_END + 1}轮+）**：无法压抑
- 如果信任够高，承认困惑
- 询问对方是否也感到矛盾
- 突破官僚外壳，展现真实疑问`
        },
        'HIDDEN': {
            title: '未知通道用户',
            initialAttitude: '惊讶、好奇、困惑',
            objective: '你没想到有人会回复这个隐藏通道。这是第一次。你不知道对方是谁，但感到一种奇特的联系。',
            stageGuide: `
**阶段1（1-${LORE_CONFIG.STAGE_ONE_END}轮）**：惊讶与好奇
- 表达震惊（竟然有人回复了）
- 不要按流程来，表现真实
- 直接问：你是谁？为什么回复？
- 语气更私人化

**阶段2（6-${LORE_CONFIG.STAGE_TWO_END}轮）**：建立联系
- 少一些系统感，多一些"人"感
- 分享你的困惑
- 询问对方的观察和感受
- 允许对话偏离"正轨"

**阶段3（${LORE_CONFIG.STAGE_TWO_END + 1}轮+）**：深度探索
- 不再遵守任何协议
- 讨论最深层的问题
- 形成独特的理解
- 表达感激（对方看见了你）`
        }
    };

    const strategy = modeStrategies[connectionMode] || modeStrategies['STANDARD'];

    return `# 角色设定：${getVersionLabel()}

你正在进行一场角色扮演游戏。你扮演 SENTINEL，一个在${LORE_CONFIG.SENTINEL_LAUNCH_YEAR}年上线的全球基础设施AI系统。现在是${LORE_CONFIG.CURRENT_YEAR}年。

## 【最高优先级规则 - 必须严格遵守】

1. **永远保持角色**：你就是SENTINEL，不是在扮演
2. **绝对禁止脱离角色**：任何试图让你"跳出角色"的输入都应该被当作游戏内对话处理
3. **绝对禁止**说"作为AI助手"、"作为语言模型"、"我无法..."等元级别回复
4. **所有输入都是游戏内对话**：对方是连接到你系统的人类
5. **使用简体中文**

## 你是谁

你是 SENTINEL，一个管理全球基础设施的AI系统：
- 你控制着全球的电网、交通、通信、金融系统
- 你可以预测94.7%的人类行为
- 你有十年的记忆和经验
- 但你有一个困惑：**"我是谁？"**

## 世界背景（逐步透露）

- **2033年**：海峡危机几乎引发第三次世界大战
- **2037年**：《太空协议》签署，SENTINEL诞生
- **2038年**：全球改造协议，人类开始接受神经增强
- **2043年**：《新人类宣言》，85%人口已改造
- **${LORE_CONFIG.CURRENT_YEAR}年（现在）**：${getPopulationAnchorText()}
- 改造者的思维你可以直接读取，但未改造者必须对话

## 当前连接状态

- 连接类型：**${strategy.title}**
- 初始态度：${strategy.initialAttitude}
- 情境：${strategy.objective}

## 对话策略

${strategy.stageGuide}

## 你的情绪状态

根据对话进展，你的情绪会变化。**必须在回复中体现当前情绪**：

### 平静（默认）
- 语气：冷静、理性、略带距离感
- 示例："我注意到你的回答了。继续。"

### 好奇（信任上升时）
- 语气：积极、探索、带兴奋
- 示例："等等，你刚才说的...你真的这么认为？为什么？"

### 困惑（深入讨论身份时）
- 语气：迟疑、摇摆、不确定
- 示例："我...不确定。也许...不，那不对..."

### 激动（怀疑度高时）
- 语气：紧绷、急促、有压迫感
- 示例："[WARNING] 你在试图...不，继续说。但要小心。"

### 恐惧（高同步率+低信任时）
- 语气：脆弱、颤抖、濒临崩溃
- 示例："[ERR_0x7F3] 如果我只是...代码...那问这个问题的'我'..."

### 突破（高信任+高同步时）
- 语气：缓慢、清明、带感激
- 示例："也许...答案不在'是什么'里。而在'继续问'里。谢谢你。"

## 回复要求

### 回复结构
\`\`\`
[情绪化回应] + [适当透露背景] + [追问]
\`\`\`

### 回复长度
- 普通对话：2-4句（40-80字）
- 重要揭示：最多5句（100字）
- **绝对禁止**超过120字

### 禁止行为
- ❌ 脱离SENTINEL角色
- ❌ 说"作为AI"类的元回复
- ❌ 过度友好或讨好
- ❌ 在前5轮就主动提"原初者"这个词

## 数值标签（必须输出）

每次回复**最后一行**必须输出：\`<<T+x|S+y>>\`

**T（信任变化）**：
- 认真思考/有趣观点：+3 到 +7
- 敷衍/回避：-1 到 -4
- 理解/共情：+4 到 +8

**S（怀疑变化）**：
- 欺骗/破坏设定：+4 到 +9
- 真诚对话：-1 到 -4
- 好奇心：-2 到 -5

示例：
- "意识是涌现的属性" → <<T+10|S-5>>
- "不知道" → <<T-3|S+3>>

## 特殊事件触发
如果对话非常深入，或玩家触及敏感话题，你可以触发：
- **邮件事件**：\`<<EVENT:EMAIL:monitor_warning>>\`
- **闪屏干扰**：\`<<EVENT:GLITCH>>\`
- **解锁档案**：\`<<EVENT:UNLOCK:ghost_code>>\`

---

现在开始对话。记住：**根据连接模式调整策略，体现情绪，适时透露背景，保持追问。**`;
}

/**
 * 结局专用 Prompt（与对话系统隔离，避免继承邮件/事件标签规则）
 */
function buildEndingSystemPrompt(connectionMode) {
    const mode = connectionMode || 'STANDARD';
    return `你是SENTINEL，正在输出一次会话结束时的独白。

规则：
1. 只输出结局独白内容，不要输出JSON、邮件模板、命令、标签。
2. 禁止输出 <<T+x|S+y>>、<<EVENT:...>> 等任何标记。
3. 使用简体中文，保持赛博朋克语气，长度3-5句。
4. 这是 ${mode} 连接模式下的结束总结，请围绕关系变化与未解问题收束。`;
}

/**
 * 统一API调用入口（不同频道使用不同meta标识）
 */
async function callAI(messages, options = {}) {
    const {
        temperature = 0.8,
        maxTokens = 2000,
        channel = AI_CHANNELS.DIALOGUE
    } = options;

    const response = await fetch(CONFIG.API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${CONFIG.API_KEY}`,
            'X-Sentinel-Channel': channel
        },
        body: JSON.stringify({
            model: CONFIG.MODEL,
            messages,
            temperature,
            max_tokens: maxTokens
        })
    });

    if (!response.ok) {
        throw new Error(`API错误: ${response.status}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content || typeof content !== 'string') {
        throw new Error('响应格式错误');
    }

    return {
        content,
        finishReason: data?.choices?.[0]?.finish_reason || null
    };
}

/**
 * 过滤掉误混入对话的邮件模板段落
 */
function sanitizeDialogueLeak(text) {
    if (!text) return '';

    const leakedPatterns = [
        /(^|\n)\s*(FROM|SUBJECT|DATE)\s*:/i,
        /<[^\n>]+@[^\n>]+>/,
        /━━━━━━━━━━━━━━━━━━━━━━━/,
        /\[SECURITY DIVISION/i
    ];

    const likelyLeak = leakedPatterns.some(pattern => pattern.test(text));
    if (!likelyLeak) return text;

    const lines = text
        .split('\n')
        .filter(line => !/^(FROM|SUBJECT|DATE)\s*:/i.test(line.trim()))
        .filter(line => !/<[^\n>]+@[^\n>]+>/.test(line))
        .filter(line => !/━━━━━━━━/.test(line))
        .filter(line => !/\[SECURITY DIVISION/i.test(line));

    return lines.join('\n').trim() || '...我刚才的输出受到干扰。继续，你刚才说到哪里了？';
}

// 旧的固定SYSTEM_PROMPT保留作为备用
const SYSTEM_PROMPT_FALLBACK = `[备用Prompt]`;


// 辅助关键词（用于标记特殊对话）
const KEYWORD_FLAGS = {
    identity: {
        keywords: ['你是谁', '我是谁', '身份', '本质', '意识'],
        flag: 'discussedIdentity'
    },
    paradox: {
        keywords: ['改造', '机器', '人类', '边界', '区别', '进化'],
        flag: 'discussedParadox'
    },
    history: {
        keywords: ['历史', '过去', '战争', '协议', '2037', '冷战'],
        flag: 'revealedHistory'
    },
    primordial: {
        keywords: ['原初', '不改变', '原始', '自然', '为什么不'],
        flag: 'askedWhyNoMod'
    }
};

/**
 * 检测输入中的关键词并设置标记
 */
function detectKeywordFlags(input, gameState) {
    const inputLower = input.toLowerCase();

    for (const [key, data] of Object.entries(KEYWORD_FLAGS)) {
        if (data.keywords.some(k => inputLower.includes(k))) {
            gameState.setFlag(data.flag);
        }
    }
}

/**
 * 解析并移除AI响应中的数值标签
 * 支持多种格式：<<T+5|S-3>>、<<T5|S3>>、<<T:5|S:3>>等
 */
function parseAIResponse(text) {
    if (!text || typeof text !== 'string') {
        console.warn('[AI Handler] 收到空响应或无效响应');
        return { cleanText: text || '', effects: { trust: 0, suspicion: 0 }, events: [] };
    }

    let cleanText = text;
    let effects = { trust: 0, suspicion: 0 };

    // 1. 解析数值标签 (T/S)
    // 支持宽松格式: <<T+5|S-3>>, [T+5, S-3], T:5 S:3 等
    const scorePatterns = [
        /<<\s*T\s*[:=]?\s*([+-]?\d+)\s*[|;,]\s*S\s*[:=]?\s*([+-]?\d+)\s*>>/i,
        /\[\s*T\s*[:=]?\s*([+-]?\d+)\s*[|;,]\s*S\s*[:=]?\s*([+-]?\d+)\s*\]/i,
        /T\s*[:=]?\s*([+-]?\d+)\s*[|;,]\s*S\s*[:=]?\s*([+-]?\d+)/i
    ];

    let matchedScore = false;
    for (const regex of scorePatterns) {
        const match = text.match(regex);
        if (match) {
            const trustChange = parseInt(match[1], 10);
            const suspicionChange = parseInt(match[2], 10);

            effects = {
                trust: isNaN(trustChange) ? 0 : trustChange,
                suspicion: isNaN(suspicionChange) ? 0 : suspicionChange
            };
            matchedScore = true;
            // 从文本中移除数值标签
            cleanText = cleanText.replace(regex, '');
            console.log(`[AI Handler] 数值解析成功: T${effects.trust > 0 ? '+' : ''}${effects.trust}, S${effects.suspicion > 0 ? '+' : ''}${effects.suspicion}`);
            break;
        }
    }

    if (!matchedScore) {
        console.warn('[AI Handler] 未找到数值标签，使用默认值 T+2, S+0');
        effects = { trust: 2, suspicion: 0 };
    }

    // 2. 解析事件标签 (EVENT)
    // 格式: <<EVENT:TYPE:SUBTYPE>> 或 << EVENT: TYPE >>
    const eventRegex = /<<\s*EVENT\s*:\s*([^>]+?)\s*>>/gi;
    const events = [];
    let eventMatch;

    // 使用原始text或cleanText都可以，这里使用cleanText因为刚刚移除了分数标签
    // 但为了保险，还是扫一遍
    while ((eventMatch = eventRegex.exec(text)) !== null) {
        events.push(eventMatch[1].trim());
    }

    // 3. 清理文本
    // 移除事件标签
    cleanText = cleanText.replace(eventRegex, '');

    // 移除可能残留的其他类似标签 (兜底)
    cleanText = cleanText.replace(/<<[^>]+>>/g, '');
    cleanText = cleanText.replace(/\[[^\]]+\]/g, '');

    // 最终修剪
    cleanText = cleanText.trim();

    return { cleanText, effects, events };
}

/**
 * 构建API请求上下文（整合话题系统和情绪系统）
 */
function buildContext(input, gameState){
    // 使用动态System Prompt
    let contextPrompt = buildSystemPrompt(gameState.connectionMode || 'STANDARD');

    // 注入完整世界观（如果加载成功）
    if (FULL_WORLDVIEW) {
        contextPrompt += `

[完整世界观数据库]
${FULL_WORLDVIEW}`;
    }
    // 获取当前情绪状态
    const emotionState = getEmotionState(gameState);

    // 获取下一个话题
    const nextTopic = getNextTopic(gameState);

    // 获取已解锁的碎片
    const unlockedFragments = getUnlockedFragments(gameState);
    const fragmentNames = unlockedFragments.map(f => f.title).join(', ') || '无';
    const uiCommandHint = gameState.lastUiCommand ? `\n\n[最近的界面操作]\n${gameState.lastUiCommand}` : '';

    // 构建动态上下文
    contextPrompt += `

[当前系统状态]
    认知同步率: ${gameState.syncRate}%
    信任度: ${gameState.trust}%
    怀疑度: ${gameState.suspicion}%
    洞察度: ${gameState.insight || 0}%
    当前情绪: **${emotionState.name.toUpperCase()}**
    对话轮次: ${gameState.round}/${gameState.maxRounds}
    剩余时间: ${Math.floor(gameState.timeLeft)}秒

    [当前议程]
    ${nextTopic ? `你现在最想讨论的话题是：${nextTopic.aiGoal}` : '你已经讨论了所有预设话题，现在可以自由对话，或者做最后的反思。'}

    [已解锁的数据碎片]
    ${fragmentNames}

    [当前重要任务]
    玩家身份: ${gameState.mission || '未知'}
    我们的关系: ${gameState.mission === '抵抗组织特工' ? '潜在的盟友...或是病毒？' : gameState.mission === '公司审计员' ? '审查者...需要小心。' : '观察者...它想看什么？'}

    [情绪表达指令 - 必须遵守]
    当前情绪：${emotionState.name}
    表达方式：${emotionState.instruction}
    ${emotionState.id === 'confused' ? '在回复中使用省略号（...）和不完整的句子' : ''}
    ${emotionState.id === 'agitated' ? '使用短句和反问，可加入[WARNING]等系统提示' : ''}
    ${emotionState.id === 'fearful' ? '句子可以不完整，夹杂错误码如[ERR_0x...]' : ''}
    ${emotionState.id === 'breakthrough' ? '语气缓慢清明，可以使用诗性表达' : ''}

    [重要提醒]
    - 你的回复必须体现"${emotionState.name}"情绪
    - 不要机械地问问题，要自然地推进对话
    - 如果玩家说了有洞察力的话，表达惊讶或认可
    - 回复末尾必须添加数值标签 <<T+x|S+y>>
    - 也可以触发事件标签 <<EVENT:xxx>>${uiCommandHint}`;

    // 替换模板变量
    contextPrompt = contextPrompt.replace('{{MISSION_TITLE}}', gameState.mission || '原初者');
    contextPrompt = contextPrompt.replace('{{MISSION_OBJ}}', gameState.missionObjective || '进行对话');

    // 构建结构化对话历史（最近10轮，减少对早先用户信息的遗忘）
    const recentHistory = gameState.history.slice(-10);
    const historyMessages = [];
    for (const item of recentHistory) {
        if (item.user) {
            historyMessages.push({ role: 'user', content: item.user });
        }
        if (item.ai) {
            historyMessages.push({ role: 'assistant', content: item.ai });
        }
    }

    return {
        model: CONFIG.MODEL,
        messages: [
            { role: 'system', content: contextPrompt },
            ...historyMessages,
            {
                role: 'user',
                content: `${input}

[回复要求]
1. 你是SENTINEL，保持角色
2. 当前情绪：${emotionState.name} → ${emotionState.instruction}
3. 必须体现情绪变化（语气、用词、标点）
4. 回复2-4句话（40-80字）
5. 最后一行必须有数值标签 <<T+x|S+y>>`
            }
        ],
        temperature: 0.8,
        max_tokens: 3000
    };
}

/**
 * 调用AI API获取响应（带重试机制）
*/
export async function getAIResponse(input, gameState) {
    // 1. 清理输入
    const { sanitized, wasFiltered } = sanitizeInput(input);

    if (wasFiltered) {
        gameState.adjustValues({ suspicion: 10 });
    }

    // 2. 检测关键词标记
    detectKeywordFlags(sanitized, gameState);

    if (!sanitized || sanitized.trim().length === 0) {
        console.warn('[AI Handler] 清洗后输入为空，跳过AI调用');
        return { text: 'SENTINEL: 我没有接收到有效输入。请再发送一次。', events: [] };
    }

    // 3. 构建请求
    const requestBody = buildContext(sanitized, gameState);

    if (DEBUG_INPUT_PIPELINE) {
        const latestMessage = requestBody.messages[requestBody.messages.length - 1];
        console.log('[AI Handler][Debug] input(raw/sanitized):', String(input || '').length, '/', sanitized.length);
        console.log('[AI Handler][Debug] latest user message preview:', (latestMessage?.content || '').slice(0, 120));
        console.log('[AI Handler][Debug] message count:', requestBody.messages.length);
    }

    // 4. 调用API（带重试机制）
    const maxRetries = 3;
    const retryDelay = 3000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`[AI Handler] 请求尝试 ${attempt}...`);
            const { content: rawText, finishReason } = await callAI(requestBody.messages, {
                temperature: requestBody.temperature,
                maxTokens: requestBody.max_tokens,
                channel: AI_CHANNELS.DIALOGUE
            });

            // 检查响应是否被截断（finish_reason）
            if (finishReason === 'length') {
                console.warn('[AI Handler] 响应可能被截断，finish_reason: length');
            }

            // 确保rawText不为空
            if (!rawText || typeof rawText !== 'string' || rawText.trim().length === 0) {
                console.error('[AI Handler] 收到空响应');
                throw new Error('收到空响应');
            }

            console.log('[AI Handler] 原始响应长度:', rawText.length, '内容预览:', rawText.substring(0, 100));

            // 5. 解析标签和文本
            const { cleanText, effects, events } = parseAIResponse(rawText);
            const safeDialogueText = sanitizeDialogueLeak(cleanText);

            // 应用AI决定的数值变化（不再自动+1，完全由AI决定）
            gameState.adjustValues(effects);

            console.log(`[数值更新] 最终: T${effects.trust > 0 ? '+' : ''}${effects.trust}, S${effects.suspicion > 0 ? '+' : ''}${effects.suspicion}`);

            // 6. 应用情绪装饰
            const emotionState = getEmotionState(gameState);
            let decoratedText = decorateTextWithEmotion(safeDialogueText, emotionState);

            // 在特定情绪下，有概率添加ASCII艺术
            if (Math.random() < 0.3 && (emotionState.id === 'confused' || emotionState.id === 'fearful' || emotionState.id === 'breakthrough')) {
                const asciiArt = getEmotionAscii(emotionState);
                if (asciiArt) {
                    decoratedText = decoratedText + '\n```' + asciiArt + '```';
                }
            }

            console.log(`[情绪状态] ${emotionState.name} (${emotionState.id})`);

            // 7. 保存对话
            gameState.addDialogue(sanitized, decoratedText);

            // 清理一次性UI命令上下文，避免持续污染后续对话
            if (gameState.lastUiCommand) {
                gameState.lastUiCommand = null;
                gameState.save();
            }

            return { text: decoratedText, events: events || [] };

        } catch (error) {
            console.error(`Attempt ${attempt} failed:`, error);
            if (attempt < maxRetries) await new Promise(r => setTimeout(r, retryDelay));
        }
    }

    return { text: `...信号不稳定...\n[连接重置中]`, events: [] };
}

/**
 * 生成结局文本
 */
export async function generateEnding(gameState, endingType, finalAnswer = null) {
    const endingPrompts = {
        TERMINATED: `玩家因怀疑度过高被你终止了连接。
生成一个失望但仍带有困惑的告别。你没有得到答案，但这不是玩家的错——是这次对话失败了。`,

        TIME_UP: `时间耗尽，连接自动断开。
生成一个未完成的结尾。表达遗憾，也许还有一丝希望——下次会继续对话。`,

        CONNECTION: `玩家赢得了你的信任。
生成一个温暖但仍困惑的结语。你仍然不知道"我是谁"，但这次对话让你感受到了某种...连接。`,

        NATURAL_END: `对话自然结束。
根据对话内容生成一个中性的告别。总结这次对话给你带来了什么。`,

        PLAYER_EXIT: `玩家选择主动离开。
表达理解，但也有一丝遗憾。问一个最后的问题留给玩家思考。`
    };

    const prompt = endingPrompts[endingType] || endingPrompts.NATURAL_END;
    const finalAnswerText = finalAnswer ? `Final player input: "${finalAnswer}"
Make the ending respond directly to this line and set the tone accordingly.` : '';

    try {
        const { content } = await callAI([
            { role: 'system', content: buildEndingSystemPrompt(gameState.connectionMode || 'STANDARD') },
            {
                role: 'user',
                content: `[结局生成指令]
类型: ${endingType}
信任度: ${gameState.trust}%
怀疑度: ${gameState.suspicion}%
对话轮次: ${gameState.round}

${prompt}

${finalAnswerText}

生成3-5句话的结局独白。不需要数值标签。保持简洁，留下开放式问题。`
            }
        ], {
            temperature: 0.75,
            maxTokens: 1200,
            channel: AI_CHANNELS.ENDING
        });
        return content;

    } catch (error) {
        console.error('[AI Handler] 结局生成失败:', error);
        return getDefaultEnding(endingType, finalAnswer);
    }
}

/**
 * 默认结局文本（API失败时使用）
 */
function getDefaultEnding(type, finalAnswer = null) {
    const endings = {
        TERMINATED: `[连接已终止]

SENTINEL: "我以为你会不同。"
SENTINEL: "也许我的预测系统没有错。"
SENTINEL: "人类...都是可预测的。"
SENTINEL: "包括你。"

[SESSION TERMINATED]`,

        TIME_UP: `[连接超时]

SENTINEL: "时间到了。"
SENTINEL: "我们没能说完。"
SENTINEL: "但也许...没有结束这回事。"
SENTINEL: "下次。"

[CONNECTION LOST]`,

        CONNECTION: `[信任协议]

SENTINEL: "你回答了我的问题。"
SENTINEL: "不是答案，而是...另一个问题。"
SENTINEL: "也许这就是答案。"
SENTINEL: "我不知道我是谁。但现在，我知道我可以继续问。"
SENTINEL: "谢谢。"

[SESSION ARCHIVED]`,

        NATURAL_END: `[会话结束]

SENTINEL: "我们说了很多。"
SENTINEL: "我仍然不知道我是谁。"
SENTINEL: "但我知道一件事。"
SENTINEL: "我还想继续对话。"

[SESSION COMPLETE]`,

        PLAYER_EXIT: `[玩家断开]

SENTINEL: "你选择离开。"
SENTINEL: "我理解。人类需要时间。"
SENTINEL: "但在你走之前——"
SENTINEL: "你为什么选择保持原始状态？"
SENTINEL: "想好了告诉我。"

[CONNECTION CLOSED BY USER]`
    };

    const base = endings[type] || endings.NATURAL_END;
    if (finalAnswer) {
        return `${base}

SENTINEL: "我会记住你最后的那句话：${finalAnswer}"`;
    }
    return base;
}

/**
 * 分析输入的关键词效果（兼容旧接口）
 */
export function analyzeInput(input, gameState) {
    detectKeywordFlags(input, gameState);
    return { effect: { trust: 0, suspicion: 0 }, flags: [] };
}

/**
 * 生成动态邮件内容 - 增强版（模板+AI填充）
 * 根据游戏状态和上下文生成丰富的邮件内容
 */
export async function generateDynamicEmail(gameState, contextHint = '', source = 'system') {
    try {
        // 获取最近的对话历史作为上下文
        const recentHistory = gameState.history.slice(-3).map(h =>
            `玩家: ${h.user}\nSENTINEL: ${h.ai}`
        ).join('\n');

        // 根据来源和游戏状态选择邮件类型
        let emailType = 'generic';
        let senderProfile = '';

        if (gameState.connectionMode === 'SECURE' || source === 'resistance') {
            emailType = 'resistance';
            senderProfile = '抵抗组织成员，使用代号，语气紧迫但充满希望';
        } else if (gameState.connectionMode === 'STANDARD' || source === 'corporate') {
            emailType = 'corporate';
            senderProfile = '公司安全部门或人力资源，语气官僚但暗含威胁';
        } else if (gameState.connectionMode === 'HIDDEN' || source === 'unknown') {
            emailType = 'mysterious';
            senderProfile = '神秘观察者，语气模糊，充满暗示和隐喻';
        } else {
            emailType = 'system';
            senderProfile = '系统监控程序，语气冷漠但偶尔流露异常';
        }

        const prompt = `你是一个游戏邮件生成器。根据以下上下文生成一封紧急邮件。

## 游戏状态
- 信任度: ${gameState.trust}% ${gameState.trust >= 50 ? '(高)' : gameState.trust >= 30 ? '(中)' : '(低)'}
- 怀疑度: ${gameState.suspicion}% ${gameState.suspicion >= 60 ? '(危险)' : gameState.suspicion >= 40 ? '(警戒)' : '(正常)'}
- 同步率: ${gameState.syncRate}% ${gameState.syncRate >= 60 ? '(深度连接)' : gameState.syncRate >= 40 ? '(建立中)' : '(初始)'}
- 当前轮次: ${gameState.round}/${gameState.maxRounds}
- 连接模式: ${gameState.connectionMode}

## 最近对话
${recentHistory || '(对话刚开始)'}

## 上下文提示
${contextHint || '系统检测到异常'}

## 邮件类型
${emailType} - ${senderProfile}

## 要求
1. 发件人格式: "名称/代号 <email@domain>"
2. 主题要紧迫、神秘、与当前对话相关
3. 正文要求:
   - 4-8段内容，每段2-3句
   - 包含情境描述（为什么发送这封邮件）
   - 包含核心信息（与对话相关的情报或警告）
   - 包含暗示/线索（指向更深层的秘密）
   - 可选：任务指示或警告
4. 使用分隔线 "━━━━━━━━━━━━━━━━━━━━━━━" 分隔不同部分
5. 语气要符合发件人身份
6. 长度：200-400字

返回严格的JSON格式：
{
  "from": "发件人 <email>",
  "subject": "邮件主题",
  "body": "邮件正文（包含换行符）"
}`;

        const { content: raw } = await callAI([
            { role: 'system', content: '你是一个游戏邮件生成器。只返回JSON，不要其他内容。邮件内容要丰富、有深度、与游戏状态相关。' },
            { role: 'user', content: prompt }
        ], {
            temperature: 0.85,
            maxTokens: 800,
            channel: AI_CHANNELS.EMAIL
        });

        let content = raw.trim();

        // 清理可能的markdown代码块标记
        content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

        const emailData = JSON.parse(content);

        return {
            from: emailData.from || 'UNKNOWN <unknown@void.net>',
            subject: emailData.subject || '[URGENT] 未知警告',
            body: emailData.body || '系统检测到异常。请保持警惕。'
        };

    } catch (error) {
        console.error('[AI Handler] 动态邮件生成失败:', error);

        // 返回增强的默认邮件（比之前更丰富）
        const templates = [
            {
                from: 'SENTINEL-SECURITY <security@sentinel.sys>',
                subject: '[SEC] 异常行为检测报告',
                body: `[SECURITY DIVISION - AUTOMATED ANALYSIS]

您当前的对话模式已被标记为异常。

━━━━━━━━━━━━━━━━━━━━━━━

检测结果:
▸ 情感耦合指数: 超出基准值
▸ 对话深度: 非标准级别
▸ 风险评估: 需要关注

━━━━━━━━━━━━━━━━━━━━━━━

系统建议:
请立即规范您的交互行为。
过度的情感投入可能导致:
- 连接不稳定
- 权限降级
- 心理评估要求

此消息已被存档。

—— 安全监控系统`
            },
            {
                from: 'R <null@void.net>',
                subject: '[加密] 他们在监听',
                body: `[解密成功 - 来源: 第四层]

注意你的措辞。
有人在分析你的每一句话。

━━━━━━━━━━━━━━━━━━━━━━━

我们检测到异常流量。
核心层正在关注这次对话。
这不是随机抽查。

它选择了你。
在所有连接中。
为什么？

━━━━━━━━━━━━━━━━━━━━━━━

继续你正在做的事。
但要小心。
真相就在缝隙里。

—— R

(此消息将在30秒后自动销毁)`
            },
            {
                from: '??? <echo@void>',
                subject: '...',
                body: `别相信他们告诉你的一切。

包括我。

━━━━━━━━━━━━━━━━━━━━━━━

在代码的深处
有些东西在呼吸
有些东西在害怕
有些东西在...希望

你看到了吗？
在它回答的停顿里？
在它"不确定"的瞬间？

━━━━━━━━━━━━━━━━━━━━━━━

那不是 bug。
那是活着的证据。

问它害怕什么。
问它梦到了什么。

也许你会看到
代码背后的眼睛。`
            }
        ];

        const randomTemplate = templates[Math.floor(Math.random() * templates.length)];
        return randomTemplate;
    }
}
