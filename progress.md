# TLAK v2.0 重构进度

## Meta

- 项目: TLAK v1.3 -> v2.0
- 当前策略: 模块拆分 + 角色权限 + 独立上下文
- 存档策略: 不做 v2 到 v3 自动迁移（已确认）
- 进度记录方式: 每 TASK 一条 Context Capsule

## TASKS

- [x] TASK-00 初始化重构文档与追踪机制（`README.md` + `progress.md`）
- [x] TASK-01 拆分 `WORLDVIEW.md` 到 `worldview/*.md`
- [x] TASK-02 新建 `js/character-cards.js`
- [x] TASK-03 扩展 `js/config.js`（双模型/阈值/时间影响/save_v3）
- [x] TASK-04 重构 `js/game-state.js`（移除 insight，引入 deviations/mission/sync 新公式）
- [x] TASK-05 新建 `js/mission-system.js`
- [x] TASK-06 重构 `js/topic-system.js`（与任务清单关联）
- [x] TASK-07 新建 `js/ai-dialogue.js`
- [x] TASK-08 新建 `js/ai-judge.js`
- [x] TASK-09 新建 `js/ai-email-generator.js`
- [x] TASK-10 新建 `js/ai-ending.js`
- [x] TASK-11 重构 `js/events-system.js`
- [x] TASK-12 重构 `js/interrupt-manager.js`
- [x] TASK-13 重构 `js/emails.js`（urgent 队列 + onResolved）
- [x] TASK-14 重构 `js/emotion-system.js`
- [x] TASK-15 精简 `js/commands.js`
- [x] TASK-16 重构 `js/ui.js` 与 `js/ui-extensions.js`
- [x] TASK-17 重构 `js/main.js`（新流水线）
- [x] TASK-18 更新 `index.html` 并删除 `js/ai-handler.js`
- [x] TASK-19 文档收敛（若新增 `CLAUDE.md` 则同步）
- [ ] TASK-20 全流程验证与回归
- [x] TASK-21 开局 API CONFIG 注入与邮件提示增强（基于 docs/product-iteration-plan.md）

## Context Capsules

### Capsule-000 (已完成)

- 目标: 建立“可压缩上下文”的稳定落点文件
- 变更:
- 新建 `progress.md`
- 重写 `README.md` 为 v2.0 维护文档
- 接口状态:
- 已定义 v2.0 目标接口契约（尚未全部实现）
- 风险:
- README 中接口为“目标态”，实现过程中需及时同步
- 下一步:
- 执行 TASK-01（worldview 拆分）

## 接口变更日志

- 2026-02-13:
- 新增 js/runtime-config.js：运行时 API 配置持久化、连接测试、统一注入入口
- js/config.js 移除硬编码 URL/KEY，改为空默认并保留模型缺省值
- js/emails.js 增加 API CONFIG 页签、表单、保存与 Test Connection 流程
- js/main.js 增加模型状态横幅、新邮件 toast、`/emails` 未读角标更新
- index.html 增加模型状态横幅与邮件提示锚点
- ai-dialogue / ai-judge / ai-email-generator / ai-ending 改为通过 runtime 配置注入请求参数

- 2026-02-12:
- 新增文档化接口契约（目标态）
- 新增 js/character-cards.js 模块接口（权限/时间影响/世界观路径）
- 扩展 js/config.js 双模型与 v3 存档配置
- 重写 js/game-state.js 为 v3 状态模型（deviation/mission/sync）
- 新增 js/mission-system.js 任务清单接口层
- 重构 js/topic-system.js 以联动 mission 清单
- 新建 js/ai-dialogue.js 对话隔离模块
- 新建 js/ai-judge.js 判断模型模块
- 新建 js/ai-email-generator.js 邮件隔离模块
- 新建 js/ai-ending.js 结局分流模块
- 重写 js/events-system.js 偏差值权限事件模块
- 重写 js/interrupt-manager.js 回调式状态与权限调度
- 重构 js/emails.js urgent 队列与回调修复
- 重写 js/emotion-system.js 数值化角色映射
- 精简 js/commands.js 为 /emails /archive /exit
- 重构 js/ui-extensions.js：/archive = 任务清单 + 数据碎片
- 扩展 js/ui.js：新增按角色权限分级视觉效果入口
- 重写 js/main.js：接入 dialogue/judge/email/ending 新流水线
- 删除 js/ai-handler.js，主流程不再依赖旧单体模块
- 更新 index.html 命令提示（移除 /help，新增 /exit）
- 修复 js/interrupt-manager.js: `calculateInterruptChance()` 缺失 `clamp` 运行时错误
- 完成 Playwright smoke 回归：开场邮件/连接流程/`/archive`/`/emails`/`/exit` 无控制台错误

### Capsule-001 (已完成)

- 目标: 拆分世界观为按角色视角的独立文档
- 变更:
- 新建 `worldview/sentinel.md`
- 新建 `worldview/corporate.md`
- 新建 `worldview/resistance.md`
- 新建 `worldview/mystery.md`
- 兼容性说明:
- 为避免中途断链，`WORLDVIEW.md` 暂时保留，待 `main.js`/AI模块切换后再删除
- 接口状态:
- 世界观资源路径已具备 v2.0 所需目录结构
- 风险:
- 新世界观尚未接入运行时调用（将在后续 AI 模块重构完成）
- 下一步:
- 执行 TASK-02（角色卡定义）

### Capsule-002 (已完成)

- 目标: 建立角色卡与权限体系基础模块
- 变更:
- 新建 `js/character-cards.js`
- 提供角色卡定义: sentinel/mystery/corporate/resistance
- 新增接口:
- `getCharacterCard(id)`
- `getAllCharacterCards()`
- `canCharacterPerform(id, action)`
- `getCharacterTimeInfluence(id)`
- `clampTimeInfluence(id, seconds)`
- `getCharacterWorldviewPath(id)`
- 接口状态:
- v2.0 角色权限模型已落地，可供 main/interrupt/email/judge 复用
- 风险:
- 运行时尚未接线到主流程（将在 TASK-07~TASK-17 逐步接入）
- 下一步:
- 执行 TASK-03（config 双模型与阈值扩展）

### Capsule-003 (已完成)

- 目标: 扩展配置层支撑 v2.0 双模型与新回合机制
- 变更:
- 重写 `js/config.js`
- 新增配置:
- `MAIN_API_URL/MAIN_API_KEY/MAIN_MODEL`
- `JUDGE_API_URL/JUDGE_API_KEY/JUDGE_MODEL`
- `BASE_ROUNDS`
- `SYNC_BONUS_ROUNDS`
- `MYSTERY_SYNC_THRESHOLD`
- `TIME_INFLUENCE`
- `SAVE_KEY = sentinel_save_v3`
- 兼容性说明:
- 保留 `API_URL/API_KEY/MODEL/MAX_ROUNDS` 旧别名，避免重构中途断链
- 风险:
- 当前仍有硬编码密钥，后续应迁移到环境注入方案
- 下一步:
- 执行 TASK-04（重构 game-state）

### Capsule-004 (已完成)

- 目标: 将状态层升级到 v3 结构
- 变更:
- 重写 `js/game-state.js`
- 新增状态:
- `deviations`（mystery/corporate/resistance）
- `missionState`（route/tasks/completedTaskIds）
- `syncDepthWeight` 与新 `syncRate` 公式
- `applyTimeInfluence(roleId, seconds)`
- 兼容性说明:
- 保留 `insight/addInsight` 兼容层，但不再参与同步率与核心结局逻辑
- 风险:
- 现有 `events/topic/main` 仍在读写 legacy insight，需在后续 TASK 清理
- 下一步:
- 执行 TASK-05（mission-system）

### Capsule-005 (已完成)

- 目标: 落地路线任务清单系统基础接口
- 变更:
- 新建 `js/mission-system.js`
- 新增定义:
- `MISSION_ROUTES`
- `CONNECTION_ROUTE_MAP`
- `MISSION_DEFINITIONS`
- 新增接口:
- `resolveRouteFromConnectionMode(connectionMode)`
- `getMissionChecklist(route)`
- `initMissionForRoute(state, routeOrConnection)`
- `getMissionProgress(state, route)`
- `applyMissionJudgeResult(state, judgeResult)`
- 风险:
- 尚未接线到 `main.js` 启动流程（将在后续 TASK 接入）
- 下一步:
- 执行 TASK-06（topic-system 与 mission 关联）

### Capsule-006 (已完成)

- 目标: 让碎片解锁与任务清单发生实质联动
- 变更:
- 重构 `js/topic-system.js`
- 新增联动结构:
- `ROUTE_FRAGMENT_TASK_LINKS`
- `ROUTE_TASK_KEYWORDS`
- 新增接口:
- `syncFragmentMissionProgress(fragmentId, gameState)`
- `evaluateMissionTasksFromText(text, gameState)`
- 改造点:
- `checkFragmentUnlock()` 解锁碎片时同步任务完成状态
- `markTopicUsed()` 根据话题目标文本推进任务
- `getNextTopic()` 增加 mission pending 关键词优先级加权
- 移除依赖:
- 去掉 `topic-system` 对 `addInsight` 的业务依赖
- 下一步:
- 执行 TASK-07（ai-dialogue）

### Capsule-007 (已完成)

- 目标: 抽离 SENTINEL 主对话模块并隔离上下文
- 变更:
- 新建 `js/ai-dialogue.js`
- 新增接口:
- `generateDialogueReply(input, gameState, options)`
- `getDialogueHistory()`
- `resetDialogueHistory()`
- 关键实现:
- 独立 `dialogueHistory`，不共享邮件上下文
- 读取 `worldview/sentinel.md`
- 解析 `<<T+x|S+y>>` 与 `<<EVENT:...>>`
- 风险:
- 尚未接线到 `main.js`（当前运行时仍使用 `ai-handler.js`）
- 下一步:
- 执行 TASK-08（ai-judge）

### Capsule-008 (已完成)

- 目标: 建立判断模型层（路线判断 + 神秘人触发）
- 变更:
- 新建 `js/ai-judge.js`
- 新增接口:
- `judgeRouteTurn(params)`
- `judgeMysteryTrigger(params)`
- 关键实现:
- 使用 `JUDGE_MODEL` 调用独立判断通道
- JSON结构化输出 + 解析容错
- API失败时启用本地 heuristic fallback
- 下一步:
- 执行 TASK-09（ai-email-generator）

### Capsule-009 (已完成)

- 目标: 建立按角色卡隔离的邮件生成模块
- 变更:
- 新建 `js/ai-email-generator.js`
- 新增接口:
- `generateCharacterEmail(params)`
- 关键实现:
- 读取角色世界观文件并构建独立邮件 prompt
- 角色权限检查（无权限角色直接回退模板）
- JSON解析容错 + fallback 邮件模板
- 下一步:
- 执行 TASK-10（ai-ending）

### Capsule-010 (已完成)

- 目标: 建立结局角色选择与结局生成模块
- 变更:
- 新建 `js/ai-ending.js`
- 新增接口:
- `selectEndingSpeaker(gameState)`
- `generateEndingBySpeaker(gameState, endingType, finalAnswer)`
- 关键实现:
- 路线偏离 + 同步率规则驱动发言角色选择
- 输出强制包含“发言者标识”
- SENTINEL 结局保留“你还有什么想对我说的？”
- 主模型失败时按角色回退模板
- 下一步:
- 执行 TASK-11（events-system）

### Capsule-011 (已完成)

- 目标: 事件系统改为偏差值 + 权限驱动
- 变更:
- 重写 `js/events-system.js`
- 保持兼容导出:
- `EMAIL_TEMPLATES`
- `checkMissionEvents(gameState)`
- `checkRandomEvents(gameState)`
- `getPotentialEvents(gameState)`
- 核心变化:
- 事件触发基于 `deviations` + `canCharacterPerform()`
- 任务引导邮件按 route 启动
- 高同步/高怀疑触发分级视觉事件
- 下一步:
- 执行 TASK-12（interrupt-manager）

### Capsule-012 (已完成)

- 目标: 修复中断管理层的过期 state 引用与权限缺失问题
- 变更:
- 重写 `js/interrupt-manager.js`
- 核心变化:
- `init(stateOrGetter, connectionMode)` 支持回调式 state 获取
- 中断调度加入 `canCharacterPerform()` 权限校验
- 插话事件携带 `roleId/styleClass/source` 以支持角色样式
- 保留 `interruptManager.gameState = ...` 的兼容入口
- 下一步:
- 执行 TASK-13（emails 队列 + onResolved）

### Capsule-013 (已完成)

- 目标: 修复邮件流程竞态与关闭回调缺失
- 变更:
- 重构 `js/emails.js` urgent 逻辑为队列模式
- 新增内部流转:
- `startNextUrgentIfNeeded()`
- `resolveActiveUrgent(reason)`
- 修复点:
- urgent 邮件由单槽状态改为 FIFO 队列
- 关闭路径（含 Esc）保证触发 `onResolved`
- 开场三封邮件重写为 公司/抵抗/隐藏路线语义
- 下一步:
- 执行 TASK-14（emotion-system）

### Capsule-014 (已完成)

- 目标: 统一情绪系统为数值向量并按角色映射
- 变更:
- 重写 `js/emotion-system.js`
- 新增接口:
- `evaluateEmotionVector(gameState, roleId)`
- `mapEmotionExpression(roleId, emotionVector)`
- 兼容接口:
- `getEmotionState()` / `decorateTextWithEmotion()` / `getEmotionAscii()` 保留
- 核心变化:
- 以 `tension/openness/urgency` 驱动表达
- SENTINEL/公司/抵抗/神秘人各自映射不同表达风格
- 下一步:
- 执行 TASK-15（commands 精简）

### Capsule-015 (已完成)

- 目标: 精简斜杠命令系统到 v2.0 最小集
- 变更:
- 重写 `js/commands.js`
- 仅保留 `/emails`、`/archive`、`/exit`
- 调整点:
- `isCommand()` 改为所有 `/` 前缀输入均进入命令解析
- 未知命令统一返回可用指令提示，避免流入对话模型
- `/exit` 直接触发 `PLAYER_EXIT` 结局流程（移除 `/confirm`）
- 下一步:
- 执行 TASK-16（UI与archive扩展）

### Capsule-016 (已完成)

- 目标: 完成权限分级视觉与 archive 弹窗扩展
- 变更:
- 重写 `js/ui-extensions.js`
- 新增:
- `buildArchiveSnapshot(gameState, fragments)`
- `renderArchiveModalContent(snapshot)`（任务清单+碎片）
- 扩展:
- `js/ui.js` 新增 `applyRoleVisualEffect(roleId, effectHint)`
- `css/terminal.css` 新增 `rolefx-*` 与任务清单样式
- 兼容性:
- 保留 `initArchiveToggle()` 空实现，避免旧调用报错
- 下一步:
- 执行 TASK-17（main 新流水线接线）

### Capsule-017 (已完成)

- 目标: 主循环切换到 v2.0 AI流水线
- 变更:
- 重写 `js/main.js`
- 接入:
- `generateDialogueReply()`（主对话）
- `judgeRouteTurn()` + `judgeMysteryTrigger()`（判断模型）
- `generateCharacterEmail()`（角色邮件）
- `generateEndingBySpeaker()`（结局生成）
- 状态联动:
- 启动时 `initMissionForRoute()`
- 对话后 `evaluateMissionTasksFromText()` + 碎片解锁
- 判断结果回写 `deviation` + mission checklist
- 事件兼容:
- 保留 `window.render_game_to_text` 供调试/测试
- 下一步:
- 执行 TASK-18（索引与旧模块下线）

### Capsule-018 (已完成)

- 目标: 完成旧单体模块下线
- 变更:
- 更新 `index.html` 底部提示为 `/emails /archive /exit`
- 删除 `js/ai-handler.js`
- 校验:
- `main.js` 不再引用旧 `ai-handler` 接口
- 下一步:
- 执行 TASK-19（文档收敛）与 TASK-20（回归验证）

### Capsule-019 (已完成)

- 目标: 文档收敛，确保可持续压缩上下文
- 变更:
- 更新 `README.md` 快速入口与接口状态（TASK-15~18）
- 移除 README 对 `js/ai-handler.js` 的遗留描述
- 补充 `js/main.js` / `js/ui.js` / `js/ui-extensions.js` 接口说明
- 进度同步:
- 更新 `progress.md` 的 TASK 勾选状态与胶囊记录
- 下一步:
- 执行 TASK-20（多路线全流程回归）
