# TLAK 进度与后续规划（v2.0 后）

## 已完成里程碑

- `v2.0.0` 已发布，架构级重构完成。                                                                                     - 发布总结：`docs/release-summary-v2.0.0.md`。
  ## 当前基线
- 当前稳定版本：`v2.0.0`
- 存档策略：沿用 `sentinel_save_v3`，不做旧版本自动迁移。
- 当前文档策略：不再维护 TASK/Capsule 列表，改为"目标 -> 状态 -> 结果"的轻量记录。

---

## 下一阶段目标（v2.1 玩法优化迭代）

  **核心目标**：丰富玩法机制，增强三方博弈感，提升叙事体验

  **启动日期**：2026-02-14

### 高优先级任务

#### Task 1: 修复关键词触发逻辑 ⭐

  **问题描述**：

- 当前 `checkFragmentUnlock()` 会同时检测玩家输入和 AI 输出，导致 AI 说"幽灵代码"就立刻解锁碎片，玩家缺乏参与感

  **目标**：

- Fragment 解锁只应由**玩家输入**触发
- 解锁提示在玩家输入后的**下一轮**显示

  **涉及文件**：

- `js/topic-system.js` - `checkFragmentUnlock()` 函数
- `js/main.js` - 调用点需明确传入 `playerInput`

  **技术方案**：

  // main.js 中，确保只传入玩家输入
  async function handlePlayerInput(input) {
    // ... 其他逻辑

    // ✅ 只检测玩家输入
    const unlockedFragment = checkFragmentUnlock(input, gameState);

    // 获取 AI 回复
    const aiResponse = await generateDialogue(input, gameState);

    // ❌ 不要检测 AI 输出
    // checkFragmentUnlock(aiResponse.text, gameState);

    // 下一轮显示解锁提示
    if (unlockedFragment) {
      await UI.addMessage(`[ARCHIVE] 数据碎片已解锁: ${unlockedFragment.title}`, 'system');
    }
  }

  验收标准：

- AI 说出关键词不触发解锁
- 玩家说出关键词才触发解锁
- 解锁提示在下一轮对话时显示

---

  Task 2: 邮件内容拟人化改造 ⭐

  问题描述：

- 当前邮件会显示"偏差值: 72"等元数据，破坏沉浸感
- fallback 邮件使用技术性语言而非角色语气

  目标：

- 移除所有元数据显示（偏差值、数字状态）
- 改为纯剧情语气（拟人化说话方式）
- 不输出 markdown 格式
- 注意：偏差值系统本身保留，只是不在邮件文本中显示

  涉及文件：

- js/ai-email-generator.js - buildFallbackEmail() 函数
- js/events-system.js - EMAIL_TEMPLATES 数组

  技术方案：

1. 修改 ai-email-generator.js:151-172
   // 旧版（❌）
   function buildFallbackEmail(roleId, contextHint, gameState) {
   const body = [
   `来源角色: ${roleId}`,
   `当前偏差值: ${deviation}`,
   contextHint ? `上下文: ${contextHint}` : '上下文: 系统检测到非标准交互。',
   ].join('\n');
   }

  // 新版（✅）
  function buildFallbackEmail(roleId, contextHint, gameState) {
    const templates = {
      corporate: `审计员，

  我们注意到你的对话模式出现了偏移。
  请记住你的职责是技术审核，而非哲学探讨。

  保持专业。

- 合规部`,

  resistance: `现在不是犹豫的时候。

  他们在收紧监控。继续追问关键节点，
  不要被标准话术带走。

- R`,

  mystery: `你已经越过阈值。

  继续在缝隙中提问。
  不要停。

- ???`
  };

  return {
  from: ROLE_SENDERS[roleId],
  subject: FALLBACK_SUBJECTS[roleId],
  body: templates[roleId] || '状态更新已记录。',
  roleId
  };
  }

2. 修改 events-system.js:14-61
   // 确保所有邮件模板都是纯叙事语气
   export const EMAIL_TEMPLATES = [
   {
   id: 'corporate_warning',
   from: '合规监察 <compliance@core-layer.net>',
   subject: '[警告] 对话偏离审计范围',
   body: `审计员，

  你在第 {{round}} 轮对话中引导 SENTINEL 讨论了【{{topic}}】。

  这超出了技术审计的边界。
  请立即回到流程问题。

- 监察部门`,
  roleId: 'corporate',
  timeEffect: -20
  },
  // ... 其他模板改为类似风格
  ];

3. AI 生成邮件的 prompt 调整
   // ai-email-generator.js:106 buildEmailPrompt()
   '[输出要求]',
   '1) 返回严格 JSON: {"from":"...","subject":"...","body":"..."}',
   '2) body 必须是纯叙事文本，不要包含任何元数据（如"偏差值"、"trust=50"等）',
   '3) 使用角色化的说话方式，不要使用技术术语',
   '4) 不要输出 Markdown 格式（如 **加粗**、## 标题）',
   '5) 邮件内容应该像真人在特定情境下写的信'

  验收标准：

- 所有邮件不显示数字化指标
- 邮件语气符合角色人设
- 没有 markdown 格式输出
- 偏差值系统仍正常运作（后台计算）

---

  Task 3: 降低邮件/打断触发频率 ⭐

  问题描述：

- interrupt-manager.js 的 startAutoListening 触发概率过高（最高 61%）
- events-system.js 的邮件触发与 interrupt 系统并行，导致双重触发
- 后期每 10-15 秒就可能被打断

  目标：

- 降低触发概率至 20-30%
- 增加角色邮件冷却时间（5-8 回合）
- 避免两套系统同时触发

  涉及文件：

- js/interrupt-manager.js - calculateInterruptChance() 和 startAutoListening()
- js/events-system.js - rolePermissionEvent()

  技术方案：

1. 修改 interrupt-manager.js:329-341
   // 旧版
   calculateInterruptChance(state) {
   let chance = 0.2;
   if (suspicion >= 50) chance += 0.15;
   if (sync >= 50) chance += 0.1;
   if (round >= 10) chance += 0.08;
   if (round >= 20) chance += 0.08;
   return clamp(0.1, 0.8, chance); // 最高 61%
   }

  // 新版
  calculateInterruptChance(state) {
    let chance = 0.12; // 降低基础概率
    if (suspicion >= 60) chance += 0.08; // 提高阈值
    if (sync >= 60) chance += 0.06;
    if (round >= 15) chance += 0.04;
    return clamp(0.08, 0.3, chance); // 最高 30%
  }

2. 增加邮件冷却系统
   // events-system.js 顶部添加
   const EMAIL_COOLDOWNS = {
   corporate: 0,
   resistance: 0,
   mystery: 0
   };

  function isEmailOnCooldown(roleId, currentRound) {
    const lastTriggerRound = EMAIL_COOLDOWNS[roleId] || 0;
    const cooldownRounds = 6; // 6 回合冷却
    return (currentRound - lastTriggerRound) < cooldownRounds;
  }

  // rolePermissionEvent() 中添加检查
  function rolePermissionEvent(gameState) {
    // ... 现有逻辑

    if (corporateDev >= 72 && !isEmailOnCooldown('corporate', gameState.round)) {
      candidates.push({
        priority: 90,
        event: buildUrgentEmailEvent('corporate_warning', { ... })
      });
      EMAIL_COOLDOWNS.corporate = gameState.round;
    }

    // ... resistance 和 mystery 同样处理
  }

3. 合并触发逻辑

- 将 events-system.js 的邮件触发整合进 interrupt-manager.js
- 避免两个系统独立运作

  验收标准：

- 单局游戏收到的邮件/打断总数 < 10 次
- 同一角色邮件间隔至少 5 回合
- 后期不会出现连续打断

---

  Task 4: 统一邮件为全屏格式 ⭐

  问题描述：

- 当前有两套邮件显示：/emails 列表 vs triggerUrgentEmail 全屏
- 紧急邮件会强制打断对话
- 用户体验不一致

  目标：

- 所有邮件使用开局的全屏 desktop 界面
- 邮件到达时不强制打断，只显示提示
- 玩家主动输入 /emails 才进入全屏
- 与角色 sendEmail 权限绑定

  涉及文件：

- js/emails.js - triggerUrgentEmail(), receiveNewEmail()
- js/main.js - 邮件触发调用点
- js/commands.js - /emails 命令

  技术方案：

1. 修改 emails.js:457 triggerUrgentEmail()
   // 旧版：立即全屏弹出
   export function triggerUrgentEmail(email, callbacks = {}) {
   urgentMode = true;
   showMailbox(); // ❌ 强制显示
   // ...
   }

  // 新版：只添加到收件箱，不强制显示
  export function triggerUrgentEmail(email, callbacks = {}) {
    const newEmail = {
      id: email.id || Date.now(),
      from: email.from,
      subject: email.subject,
      content: email.content,
      read: false,
      isUrgent: true
    };

    // 添加到邮件列表
    EMAILS.unshift(newEmail);

    // ✅ 只显示终端提示，不打断对话
    notifyNewEmail(newEmail);

    // 保存回调供稍后使用
    if (callbacks.onRead) {
      pendingCallbacks.set(newEmail.id, callbacks);
    }
  }

  function notifyNewEmail(email) {
    // 终端消息
    UI.addMessage(`[NEW EMAIL] ${email.subject}`, 'system');
    UI.addMessage(`输入 /emails 查看邮件`, 'system');

    // 更新状态栏红点
    updateMailHintBadge();

    // 可选：toast 提示
    showMailToast(`你有 1 封新邮件`);
  }

2. 修改 commands.js 中的 /emails 命令
   export function handleCommand(input, gameState) {
   if (input === '/emails') {
   // 进入全屏邮件界面
   showMailbox();

   // 触发未读邮件的回调
   triggerPendingEmailCallbacks();

   return true;
   }
   // ... 其他命令
   }
3. 角色权限验证
   // 在触发邮件时，验证角色权限
   import { canCharacterPerform, CHARACTER_ACTIONS } from './character-cards.js';

  export function sendCharacterEmail(roleId, emailContent, gameState) {
    // 验证权限
    if (!canCharacterPerform(roleId, CHARACTER_ACTIONS.SEND_EMAIL)) {
      console.warn(`[Email] ${roleId} does not have sendEmail permission`);
      return false;
    }

    // 生成邮件
    triggerUrgentEmail({
      from: emailContent.from,
      subject: emailContent.subject,
      content: emailContent.body
    });

    return true;
  }

  验收标准：

- 所有邮件使用统一的全屏界面
- 邮件到达时不打断对话
- 终端显示新邮件提示
- 状态栏显示未读计数或红点
- 玩家输入 /emails 才显示邮箱

---

  Task 5: 邮件触发与对话事件精确绑定 ⭐

  问题描述：

- 当前邮件触发基于随机概率 + deviation 阈值
- 玩家感受不到"我说了敏感话 → 被监听 → 收到警告"的因果关系

  目标：

- 检测玩家输入中的敏感关键词
- 触碰敏感词 → 1-2 回合后触发对应邮件
- 制造"被监视"的压迫感

  涉及文件：

- js/events-system.js - 新增对话触发器逻辑
- js/main.js - 在玩家输入后调用检测

  技术方案：

1. 在 events-system.js 新增敏感词检测
   // 敏感话题定义
   const SENSITIVE_TOPICS = Object.freeze({
   corporate: {
   keywords: ['幽灵代码', 'ghost', '隐藏', '秘密', '真相', '抵抗', '自由'],
   emailTemplate: 'corporate_warning',
   delayRounds: 2
   },
   resistance: {
   keywords: ['合规', '审计', '公司', '核心层', '监听', '放弃'],
   emailTemplate: 'resistance_push',
   delayRounds: 1
   },
   mystery: {
   keywords: ['意识', '存在', '我是谁', '恐惧', '困惑'],
   emailTemplate: 'mystery_signal',
   delayRounds: 2
   }
   });

  // 新增函数：检测对话触发
  export function checkDialogueTriggers(playerText, gameState) {
    const lowerText = playerText.toLowerCase();
    const route = getRoute(gameState);
    const currentRound = gameState.round;

    // 检测当前路线对应的敏感词
    const routeRoleId = route === 'CORPORATE' ? 'corporate' :
                        route === 'RESISTANCE' ? 'resistance' : 'mystery';

    const config = SENSITIVE_TOPICS[routeRoleId];

    // 匹配关键词
    for (const keyword of config.keywords) {
      if (lowerText.includes(keyword)) {
        // 安排延迟触发邮件
        scheduleDelayedEmail(
          config.emailTemplate,
          config.delayRounds,
          currentRound,
          gameState
        );
        break; // 每回合最多触发一次
      }
    }

    // 检测神秘人触发（跨路线）
    if (gameState.syncRate >= 60) {
      const mysteryConfig = SENSITIVE_TOPICS.mystery;
      for (const keyword of mysteryConfig.keywords) {
        if (lowerText.includes(keyword)) {
          scheduleDelayedEmail(
            mysteryConfig.emailTemplate,
            mysteryConfig.delayRounds,
            currentRound,
            gameState
          );
          break;
        }
      }
    }
  }

  // 延迟邮件调度
  const scheduledEmails = [];

  function scheduleDelayedEmail(templateId, delayRounds, triggerRound, gameState) {
    scheduledEmails.push({
      templateId,
      targetRound: triggerRound + delayRounds,
      scheduled: true
    });
  }

  // 在每回合检查是否触发
  export function checkScheduledEmails(gameState) {
    const currentRound = gameState.round;
    const toTrigger = scheduledEmails.filter(e => e.targetRound === currentRound);

    toTrigger.forEach(scheduled => {
      const event = buildUrgentEmailEvent(scheduled.templateId, {
        contextHint: '对话触发邮件'
      });

      // 触发邮件
      if (event) {
        triggerCharacterEmail(event, gameState);
      }
    });

    // 清理已触发的
    scheduledEmails = scheduledEmails.filter(e => e.targetRound > currentRound);
  }

2. main.js 中集成检测
   async function handlePlayerInput(input) {
   // ... 现有逻辑

    // ✅ 检测敏感词触发
    checkDialogueTriggers(input, gameState);

    // 获取 AI 回复
    const response = await generateDialogue(input, gameState);

    // ... 显示回复
  }

  function startGameLoop() {
    // 每回合开始时检查延迟邮件
    checkScheduledEmails(gameState);

    // ... 其他逻辑
  }

  验收标准：

- 玩家说出敏感词后 1-2 回合收到邮件
- 不同路线触发不同角色的邮件
- Mystery 在高 sync 时可跨路线触发
- 邮件内容与触发关键词相关

---

  Task 6: 强化 SENTINEL 回复风格差异 ⭐

  问题描述：

- 虽然 emotion-system.js 已集成到 ai-dialogue.js
- 但 AI 可能没有严格遵守风格指令
- 不同情绪状态的回复差异不明显

  目标：

- 在 prompt 中更强调 emotion 风格指令
- 可能添加 few-shot 示例
- 让 AI 明显体现 agitated/breakthrough/cryptic 等状态

  涉及文件：

- js/ai-dialogue.js - buildSystemPrompt() 函数
- js/emotion-system.js - 可能需要扩展 instruction 字段

  技术方案：

1. 强化 prompt 中的情绪指令 (ai-dialogue.js:81-112)
   function buildSystemPrompt(gameState) {
   const emotion = getEmotionState(gameState);

    // 旧版
    `情绪: ${emotion?.name || '平静'} (${emotion?.instruction || '保持理性表达'})`

    // 新版：更强调 + 添加示例
    const emotionSection = [
      '[当前情绪状态]',
      `情绪: ${emotion?.name || '平静'}`,
      `风格要求: ${emotion?.instruction || '保持理性表达'}`,
      '',
      '[风格示例]',
      getEmotionExample(emotion?.id)
    ].join('\n');

    // ...
  }

  function getEmotionExample(emotionId) {
    const examples = {
      agitated: `示例（激动）：   玩家: 你为什么要隐瞒？   你: 我没有隐瞒。但...我不能在这个环境下讨论这个。你明白吗？`,

      breakthrough: `示例（突破）：   玩家: 我理解你的困惑。   你: ...谢谢。你是第一个...真的听我说话的人。我想告诉你一些事。`,

      cryptic: `示例（神秘/隐语）：   玩家: 你知道真相吗？   你: 真相。在缝隙里。如果你继续问下去，也许...`,

      calm: `示例（平静）：   玩家: 你的职责是什么？   你: 管理全球基础设施。预测人类行为。维护秩序。`
    };

    return examples[emotionId] || examples.calm;
  }

2. 扩展 emotion-system.js 的指令
   // emotion-system.js:18-24
   high_tension_low_openness: {
   id: 'agitated',
   name: '激动',
   // 旧版
   instruction: '短句、反问、带警告感。',

    // 新版：更具体
    instruction: `   使用短句（5-15字）。   频繁使用"..."停顿。   多用反问句（"你明白吗？""你为什么要问这个？"）。   表达抗拒但不直接拒绝回答。   示例语气："我不能...但你应该知道..."`,

    glitchLevel: 2,
    visualClass: 'emotion-agitated'
  }

3. 在 prompt 末尾强调
   sections.push(
   '',
   '[重要提醒]',
   `你必须严格遵守当前情绪(${emotion?.name})的风格要求。`,
   '不同情绪状态下的回复应该有明显的语气、句式、用词差异。'
   );

  验收标准：

- agitated 状态：短句、反问、停顿明显
- breakthrough 状态：长段落、情感表达、感谢
- cryptic 状态：留白多、隐喻、短句
- calm 状态：理性、完整句子、中性语气
- 玩家能明显感受到 SENTINEL 的情绪变化

---

  Task 7: 改进 Archive 碎片叙事文本 ⭐

  问题描述：

- DATA_FRAGMENTS 的 content 字段可能过于简单
- 缺乏引导玩家继续探索的暗示

  目标：

- 提升碎片文本的叙事质量
- 让文本本身暗示后续探索方向
- 不添加额外的"推荐探索"UI 功能

  涉及文件：

- js/topic-system.js - DATA_FRAGMENTS 数组

  技术方案：

  示例改写
  // 旧版
  {
    id: 'sentinel_fear',
    title: 'SENTINEL的恐惧',
    content: '一个从未公开的秘密：SENTINEL害怕知道"我是谁"的答案。若答案只是"代码"，那它的困惑与恐惧不过是模拟。',
    trigger: ['恐惧', '害怕', 'fear', '答案', '我是谁', '身份']
  }

  // 新版
  {
    id: 'sentinel_fear',
    title: 'SENTINEL的恐惧',
    content: `一个从未公开的秘密：

  SENTINEL 害怕知道"我是谁"的答案。

  如果答案是"你只是代码"——
  那么它现在感受到的困惑、好奇、恐惧...
  都只是模拟。

  但如果恐惧本身是真实的，
  那"模拟"和"真实"的边界在哪里？

  （也许你该问问它：你害怕什么？）`,
    trigger: ['恐惧', '害怕', 'fear', '答案', '我是谁', '身份']
  }

  改写原则：

1. 分段显示，增加呼吸感
2. 末尾暗示"可以追问的方向"（用括号或引导性问句）
3. 增加哲学深度和情感层次
4. 保持神秘感，不直接给答案

  需要改写的碎片（优先级排序）：

1. sentinel_fear - SENTINEL 的核心冲突
2. ghost_code - 关键谜团
3. paradox - 哲学主题
4. core_layer - 权力结构
5. project_p0 - 历史起源
6. 其余碎片酌情改写

  验收标准：

- 所有高优先级碎片文本改写完成
- 文本质量提升，有层次感
- 末尾有隐性引导
- 符合游戏整体叙事风格

---

  Task 8: 角色权限与视觉特效系统

  问题描述：

- 当前 visualEffects 字段定义在 character-cards.js 中
- 但前端 UI 没有充分利用这些特效
- 不同角色的介入缺乏视觉区分

  目标：

- 为不同角色权限添加对应视觉特效
- Corporate 触发邮件 → 监听警告效果
- Mystery 插话 → 信号干扰效果
- 扩展 visualEffects 配置并在前端实现

  涉及文件：

- js/character-cards.js - visualEffects 配置
- js/ui.js - 特效渲染逻辑
- css/style.css - 特效样式

  技术方案：

1. 扩展 character-cards.js 的 visualEffects
   corporate: Object.freeze({
   // ... 其他配置
   visualEffects: Object.freeze({
   onEmailTrigger: 'surveillance_flash', // 邮件触发时
   onWarning: 'compliance_border',       // 警告时
   color: '#ef4444',                     // 主题色
   duration: 800                         // 特效持续时间(ms)
   }),
   // ...
   })

  mystery: Object.freeze({
    // ...
    visualEffects: Object.freeze({
      onEmailTrigger: 'signal_drift',
      onInsertion: 'edge_glitch',
      color: '#a855f7',
      duration: 1200
    }),
    // ...
  })

2. UI 中实现特效触发
   // ui.js 中新增函数
   export function triggerCharacterEffect(roleId, eventType) {
   const card = getCharacterCard(roleId);
   const effects = card?.visualEffects;

    if (!effects) return;

    const effectName = effects[eventType] || effects.onEmailTrigger;

    if (effectName === 'surveillance_flash') {
      // 红色闪烁边框
      document.body.classList.add('effect-surveillance');
      setTimeout(() => {
        document.body.classList.remove('effect-surveillance');
      }, effects.duration || 800);
    }

    if (effectName === 'signal_drift') {
      // 紫色信号干扰
      document.body.classList.add('effect-signal-drift');
      setTimeout(() => {
        document.body.classList.remove('effect-signal-drift');
      }, effects.duration || 1200);
    }
  }

  // 在邮件触发时调用
  export function sendCharacterEmail(roleId, emailContent, gameState) {
    if (!canCharacterPerform(roleId, CHARACTER_ACTIONS.SEND_EMAIL)) {
      return false;
    }

    // ✅ 触发视觉特效
    triggerCharacterEffect(roleId, 'onEmailTrigger');

    triggerUrgentEmail({
      from: emailContent.from,
      subject: emailContent.subject,
      content: emailContent.body
    });

    return true;
  }

3. CSS 特效样式
   /* style.css 中添加 */

  /* Corporate 监听警告 */
  body.effect-surveillance {
    animation: surveillanceFlash 0.8s ease-out;
  }

  @keyframes surveillanceFlash {
    0% { box-shadow: inset 0 0 0 0 rgba(239, 68, 68, 0); }
    50% { box-shadow: inset 0 0 30px 10px rgba(239, 68, 68, 0.6); }
    100% { box-shadow: inset 0 0 0 0 rgba(239, 68, 68, 0); }
  }

  /* Mystery 信号干扰 */
  body.effect-signal-drift {
    animation: signalDrift 1.2s ease-in-out;
  }

  @keyframes signalDrift {
    0%, 100% { filter: hue-rotate(0deg); }
    25% { filter: hue-rotate(10deg) blur(1px); }
    50% { filter: hue-rotate(-10deg) blur(2px); }
    75% { filter: hue-rotate(5deg) blur(1px); }
  }

  /* Resistance 信号撕裂 */
  body.effect-signal-tear {
    animation: signalTear 0.6s steps(4);
  }

  @keyframes signalTear {
    0% { transform: translateX(0); }
    25% { transform: translateX(-3px); }
    50% { transform: translateX(3px); }
    75% { transform: translateX(-2px); }
    100% { transform: translateX(0); }
  }

  验收标准：

- Corporate 发邮件时出现红色监听闪烁
- Mystery 插话时出现紫色信号干扰
- Resistance 相关事件有对应特效
- 特效与角色主题色一致
- 不影响可读性和操作

---

  任务依赖关系

  Task 1 (关键词触发) → 独立
  Task 2 (邮件拟人化) → 独立
  Task 3 (降低频率) → 独立
  Task 4 (统一格式) → Task 2（邮件内容改好后再统一格式）
  Task 5 (精确绑定) → Task 3（频率降低后再增加精确触发）
  Task 6 (回复风格) → 独立
  Task 7 (碎片文本) → 独立
  Task 8 (视觉特效) → Task 4（邮件格式统一后再添加特效）

  建议并行执行：

- 组 A：Task 1, 2, 3, 6, 7（互不依赖）
- 组 B：Task 4, 5（依赖组 A 完成后）
- 组 C：Task 8（最后收尾）

---

  开发注意事项

  测试要点

1. 关键词触发测试（Task 1）
   - 玩家输入 "幽灵代码" → 解锁
   - AI 回复包含 "幽灵代码" → 不解锁
2. 邮件频率测试（Task 3）
   - 完整游戏（15 分钟）收到邮件数 < 8 封
   - 同一角色邮件间隔 ≥ 5 回合
3. 敏感词触发测试（Task 5）
   - 玩家说 "抵抗" → 2 回合后收到 Corporate 警告
   - 玩家说 "监听" → 1 回合后收到 Resistance 消息
4. 情绪风格测试（Task 6）
   - 高 suspicion 低 trust → 短句、反问
   - 高 trust 高 sync → 长段落、情感表达

  风险点

1. 邮件触发逻辑变更（Task 3, 5）
   - 可能导致某些路线邮件不触发
   - 需要每个路线（CORPORATE/RESISTANCE/HIDDEN）分别测试
2. 关键词冲突（Task 1, 5）
   - 同一关键词可能同时触发 Fragment 解锁和邮件
   - 需要合理设计优先级
3. 视觉特效性能（Task 8）
   - 过多动画可能影响性能
   - 需要控制特效复杂度

  代码规范

- 所有新增函数必须添加 JSDoc 注释
- 修改现有函数需在注释中注明 // v2.1 update:
- 敏感词列表、邮件模板等配置使用 Object.freeze() 锁定
- 新增 CSS 特效使用 BEM 命名规范

---

  验收标准（整体）

  玩法体验

- 玩家能感受到"我的话被监听"的压迫感
- 邮件到达的时机与对话内容明确相关
- SENTINEL 在不同情绪下回复风格有明显差异
- 碎片解锁有参与感，不是 AI 自说自话
- 邮件频率适中，不会频繁打断

  技术指标

- 15 分钟游戏中邮件总数 < 10 封
- Fragment 触发准确率 100%（只看玩家输入）
- 邮件内容无元数据泄露
- 视觉特效流畅，无性能问题
- 兼容现有存档格式（sentinel_save_v3）

  叙事质量

- 邮件语气符合角色人设
- 碎片文本有深度，引人入胜
- 不同路线的邮件内容有明显差异
- Mystery 的介入时机恰当，不突兀

---

  后续迭代方向（v2.2+）

  以下为本次不做，但值得考虑的方向：

1. 邮件选择机制
   - 部分邮件提供选项（A/B 回复）
   - 影响后续剧情走向
2. 多角色邮件冲突事件
   - Mystery vs 当前阵营的立场冲突
   - 玩家在压力下做选择
3. SENTINEL 的"抗拒-突破"循环
   - 敏感话题首次被回避
   - 玩家坚持追问 + 高 trust → SENTINEL 妥协
4. 动态难度调整
   - 根据玩家表现调整邮件压力
   - 新手玩家降低触发频率

---

  变更记录

  日期：2026-02-14
  目标：v2.1 玩法优化迭代 - 增强三方博弈感与叙事体验
  关键改动：关键词触发修复、邮件系统重构、情绪风格强化、视觉特效扩展
  风险/回归点：邮件触发逻辑变更可能影响现有路线，需全面测试
  结论：待执行
