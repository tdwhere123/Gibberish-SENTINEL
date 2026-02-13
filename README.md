# TLAK v2.0 重构维护文档

本仓库当前处于 **v1.3 -> v2.0 重构中**。

## 快速入口

- 进度与上下文胶囊: `progress.md`
- 主入口: `js/main.js`
- 配置中心: `js/config.js`（双模型配置已实现）
- 运行时 API 配置: `js/runtime-config.js`（开局 API CONFIG 页签 + 本地持久化 + 连通性测试）
- 状态核心: `js/game-state.js`（v3 已实现）
- 话题联动: `js/topic-system.js`（TASK-06 已实现）
- 对话模块: `js/ai-dialogue.js`（TASK-07 已实现）
- 判断模块: `js/ai-judge.js`（TASK-08 已实现）
- 邮件模块: `js/ai-email-generator.js`（TASK-09 已实现）
- 结局模块: `js/ai-ending.js`（TASK-10 已实现）
- 事件模块: `js/events-system.js`（TASK-11 已实现）
- 中断模块: `js/interrupt-manager.js`（TASK-12 已实现）
- 邮件系统: `js/emails.js`（TASK-13 已实现）
- 情绪系统: `js/emotion-system.js`（TASK-14 已实现）
- 指令系统: `js/commands.js`（TASK-15 已实现）
- UI扩展: `js/ui-extensions.js`（TASK-16 已实现）
- 主流程分发: `js/main.js`（TASK-17 已实现）
- 角色视角世界观目录: `worldview/`（sentinel/corporate/resistance/mystery）
- 角色卡模块: `js/character-cards.js`（已实现）
- 已删除: `js/ai-handler.js`（TASK-18）

## 当前决策（已确认）

- 不做 `sentinel_save_v2 -> sentinel_save_v3` 自动迁移。
- 重构以“职责隔离 + 角色权限 + 独立上下文”为核心。
- 每完成一个 TASK，必须更新 `progress.md` 与本 README 的接口状态。

## 本地运行

```bash
python -m http.server 8000
# 浏览器打开 http://localhost:8000
```

## v2.0 目标数据流（实施中）

```text
玩家输入
  -> input-sanitizer
    -> ai-dialogue (SENTINEL)
       输出: 文本 + trust/suspicion 调整
    -> [概率] ai-judge (路线角色)
       输出: deviationDelta + shouldTriggerEmail/Event
          -> ai-email-generator (按角色卡生成邮件)
    -> [sync阈值] ai-judge (神秘人)
       输出: 引导邮件/插话

main.js 统一分发
  -> game-state(v3)
  -> events-system / interrupt-manager
  -> ui / ui-extensions
  -> ai-ending
```

## 模块接口契约（v2.0）

说明：以下为重构目标接口，状态以 `progress.md` 为准。

### `js/character-cards.js`

- 状态: 已实现（TASK-02）

- `export const CHARACTER_CARDS`
- `export function getCharacterCard(id)`
- `export function getAllCharacterCards()`
- `export function canCharacterPerform(id, action)`
- `export function getCharacterTimeInfluence(id)`


### `js/config.js`

- 状态: 已实现（TASK-03，已去除硬编码密钥）
- 核心配置:
- `MAIN_*` 主模型
- `JUDGE_*` 判断模型
- `BASE_ROUNDS` / `SYNC_BONUS_ROUNDS`
- `TIME_INFLUENCE`
- `SAVE_KEY = sentinel_save_v3`
- 兼容别名: `API_URL` / `API_KEY` / `MODEL` / `MAX_ROUNDS`


### `js/runtime-config.js`

- 状态: 已实现（TASK-21）
- `getRuntimeConfig()` / `saveRuntimeConfig(patch)`
- `testRuntimeConnection(inputConfig)`（最小 chat/completions 探活）
- `buildLLMRequestOptions()`（统一请求参数注入）
- 读取优先级: 用户本地配置 > `window.__APP_CONFIG__` > `js/config.js` 默认值

### `js/ai-dialogue.js`

- 状态: 已实现（TASK-07）
- `export async function generateDialogueReply(input, gameState, options = {})`
- `export function getDialogueHistory()`
- `export function resetDialogueHistory()`

### `js/ai-judge.js`

- 状态: 已实现（TASK-08）
- `export async function judgeRouteTurn(params)`
- `export async function judgeMysteryTrigger(params)`

### `js/ai-email-generator.js`

- 状态: 已实现（TASK-09）
- `export async function generateCharacterEmail(params)`

### `js/ai-ending.js`

- 状态: 已实现（TASK-10）
- `export function selectEndingSpeaker(gameState)`
- `export async function generateEndingBySpeaker(gameState, endingType, finalAnswer = null)`

### `js/mission-system.js`

- 状态: 已实现（TASK-05）
- `export const MISSION_DEFINITIONS`
- `export function getMissionChecklist(route)`
- `export function getMissionProgress(state, route)`
- `export function applyMissionJudgeResult(state, judgeResult)`

- `export function resolveRouteFromConnectionMode(connectionMode)`
- `export function initMissionForRoute(state, routeOrConnection)`
### `js/game-state.js`

- 状态: 已实现（TASK-04）
- 兼容层: `insight/addInsight` 保留但不参与核心逻辑
- `GameState` 需要具备：
- `trust/suspicion/syncRate`
- `deviations`（按角色）
- `missionState`（清单完成情况）
- `save/load/reset`
- `checkEndCondition`

### `js/topic-system.js`

- 状态: 已实现（TASK-06）
- `export function getNextTopic(gameState)`
- `export function markTopicUsed(gameState, topicId)`
- `export function checkFragmentUnlock(text, gameState)`
- `export function getUnlockedFragments(gameState)`
- `export function syncFragmentMissionProgress(fragmentId, gameState)`
- `export function evaluateMissionTasksFromText(text, gameState)`

### `js/emotion-system.js`

- 状态: 已实现（TASK-14）
- `export function evaluateEmotionVector(gameState, roleId)`
- `export function mapEmotionExpression(roleId, emotionVector)`
- 兼容接口: `getEmotionState()` / `decorateTextWithEmotion()` / `getEmotionAscii()`

### `js/events-system.js`

- 状态: 已实现（TASK-11）
- `export const EMAIL_TEMPLATES`
- `export function checkMissionEvents(gameState)`
- `export function checkRandomEvents(gameState)`
- `export function getPotentialEvents(gameState)`
- 触发逻辑: 偏差值 + 角色权限分级

### `js/interrupt-manager.js`

- 状态: 已实现（TASK-12）
- `init(stateOrGetter, connectionMode)`
- `schedule(interrupt, delay)`
- `scheduleBatch(interrupts)`
- `startAutoListening(min, max)`
- `reset()`
- 权限机制: 角色动作权限校验后才允许中断入队

### `js/emails.js`

- 状态: 已实现（TASK-13 + TASK-21）
- `initEmailSystem()`
- `triggerUrgentEmail(email, callbacks)`（FIFO 队列）
- 关闭路径（按钮/Esc）均触发 `onResolved`
- 开场邮件已重写为 公司/抵抗/隐藏 三路线语义

### `js/commands.js`

- 状态: 已实现（TASK-15）
- 仅保留：`/emails`、`/archive`、`/exit`
- `isCommand(input)`：所有 `/` 前缀输入都按命令处理
- `executeCommand(input, gameState)`：未知命令返回统一提示并轻微增加怀疑值

### `js/ui-extensions.js`

- 状态: 已实现（TASK-16）
- `/archive` 内容扩展:
- `buildArchiveSnapshot(gameState, fragments)`
- `renderArchiveModalContent(snapshot)`（任务清单 + 数据碎片）
- 保留:
- `updateSyncDisplay()` / `showSystemEvent()` / `updateZenSymbols()` / `updateConnectionMode()`

### `js/ui.js`

- 状态: 已实现（TASK-16）
- 新增视觉权限入口:
- `applyRoleVisualEffect(roleId, effectHint)`（sentinel/mystery/corporate/resistance 分级效果）

### `js/main.js`

- 状态: 已实现（TASK-17）
- 主链路:
- `generateDialogueReply()` 处理主对话
- `judgeRouteTurn()` + `judgeMysteryTrigger()` 处理偏差/清单/神秘人触发
- `generateCharacterEmail()` 处理角色邮件生成
- `generateEndingBySpeaker()` 处理结局分流
- 主状态:
- 启动阶段调用 `initMissionForRoute()`
- 输入阶段联动 `evaluateMissionTasksFromText()` 与碎片解锁
- 回归兼容:
- 保留 `window.render_game_to_text`
- 新增运行时提示：输入区模型状态横幅 + 新邮件 toast + `/emails` 未读角标

## 任务分阶段

- 阶段1：架构拆分（worldview 拆分 + AI 子模块建立）
- 阶段2：数值与任务系统（sync/deviation/mission）
- 阶段3：事件与交互（interrupt/email/event）
- 阶段4：UI 与主循环接线
- 阶段5：文档与回归验证

## 维护规则

- 每完成一个 TASK：
- 更新 `progress.md` 的任务状态
- 记录接口变化（新增/删除/签名修改）
- 记录风险与待确认项
- README 仅保留“当前有效接口”，废弃接口要标注移除时间点




