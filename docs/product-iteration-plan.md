# TLAK 产品迭代方案（按反馈再修订：开局邮件页 + API 注入 + 对话稳健性）

> 本版针对你的最新反馈进行收敛：
> 1) 开局邮件页把 `LOGS` 改成 API 写入入口；
> 2) 去掉“迭代执行顺序/Sprint”表述，改为可直接执行的 TASKS 清单；
> 3) 从“稳健性 + 后续可扩展丰富度”两条线重构方案；
> 4) 邮件不主动插入主对话，但有新邮件时必须出现明显提示。

---

## 1. 现状问题复盘（聚焦你点名的问题）

### 1.1 开局界面与配置入口割裂
- 当前开局邮件页存在 `LOGS` 标签，但用户最需要的是“先把 API URL/KEY 配好再开局”。
- API 配置虽有设计，但缺少与开局流程强关联的入口，导致“知道要配，但不知道在哪配”。

### 1.2 对话链路存在串线与漏输入风险
- 对话、邮件、系统事件缺少硬隔离，异步回调可能抢占同一渲染流。
- 玩家输入到模型请求之间缺少“快照可追溯”，导致“UI 输入了但模型没吃到”难排查。

### 1.3 邮件机制与主对话边界不够硬
- 目标应该是：**邮件独立于主对话，不主动插入主聊天流**。
- 同时必须保证“有新邮件时玩家可感知”（角标/toast/命令提示），否则会漏看关键剧情信息。

---

## 2. 开局邮件页改造（UI 与交互）

## 2.1 标签改造
将开局桌面标签：
- `MAIL`（保留）
- `LOGS` → `API CONFIG`（改名）
- `SYS`（保留）

`API CONFIG` 页签职责：
- 填写并保存 OpenAI 兼容配置：`Base URL / API Key / Model / temperature / max_tokens`
- 提供 `Test Connection` 按钮（最小 chat/completions 请求）
- 显示连接状态：`未配置 / 验证成功 / 验证失败(错误码)`

## 2.2 配置注入规则（OpenAI-compatible）
- 统一使用 `openai-compatible` 协议。
- 读取优先级：
  1. 用户运行时配置（localStorage/session）
  2. `window.__APP_CONFIG__`
  3. 默认值（不含真实 key）
- 必须支持用户自行填写 URL 与 KEY，不再依赖代码内硬编码。

## 2.3 开局可用性约束
- 若 API 未通过连接测试：允许进入剧情，但在输入框上方持续提示“当前模型不可用，回复可能失败”。
- 若 API 已通过测试：显示“模型已连接（model/baseURL）”状态标签。

---

## 3. 对话系统技术方案（稳健性优先）

## 3.1 单轮事务编排（Turn Orchestrator）
每次玩家输入都创建唯一 `turnId`，且只有一个 `inFlightTurn`。

标准阶段：
1. `INPUT_ACCEPTED`
2. `INPUT_SANITIZED`
3. `PROMPT_BUILT`
4. `LLM_REQUEST_SENT`
5. `LLM_RESPONSE_VALIDATED`
6. `STATE_COMMITTED`
7. `SIDE_EFFECT_SCHEDULED`
8. `TURN_FINISHED`

硬约束：
- 晚到响应若 `turnId` 不匹配，直接丢弃并记录。
- 新轮开始可取消旧请求（AbortController）。
- Side Effect（邮件/事件）只能在 `STATE_COMMITTED` 之后调度。

## 3.2 通道隔离（杜绝串线）
- `dialogue-channel`：仅玩家与 SENTINEL 主对话。
- `mail-channel`：仅邮件列表与邮件详情。
- `system-channel`：系统提示、错误、连接状态。

规则：任何模块都不能跨通道直写 UI。

## 3.3 防漏输入机制（可观测性）
每轮记录 `turn trace`：
- `playerRawInput`
- `playerSanitizedInput`
- `finalPromptHash`
- `requestPayloadSnapshot`
- `responseRaw`
- `validationResult`

提供 debug 导出（按 `turnId`），用于复盘“为什么没收到输入/为什么串线”。

---

## 4. 邮件系统策略（不串主对话 + 有提示）

## 4.1 主原则
- 邮件**不主动插入**主对话消息流。
- 新邮件到达时，只在 `mail-channel + system-channel` 发通知。

## 4.2 提示机制（必须实现）
至少包含两种提示：
1. 顶栏未读计数角标（`Mail (n)`）
2. 非侵入 toast：`你收到 1 封新邮件，输入 /emails 查看`

可选增强：
- 输入区轻提示（不抢焦点）
- 声音/闪烁开关（可在设置中关闭）

## 4.3 与回合系统联动
- 若新邮件在回合中产生：先入 `pendingMailQueue`，在 `TURN_FINISHED` 后展示提示。
- 若玩家正在查看邮件：仅刷新列表，不打断其正在阅读的内容。

---

## 5. 角色卡与记忆层（为后续丰富度扩展预留）

## 5.1 角色卡拆层
每个角色卡拆为：
- `persona`（语气/价值观/禁忌）
- `objective`（阶段目标）
- `capabilities`（可触发行为）
- `constraints`（绝对不能做）
- `memoryPolicy`（可读写的记忆槽）

## 5.2 记忆三层
- `STM`：最近对话原文（短窗口）
- `WM`：当前任务与冲突摘要
- `LTM`：结构化长期事实（可冲突并存）

## 5.3 可扩展丰富度设计
- 引入“剧情钩子（story hooks）”与“语气模板（style packs）”插件位。
- 事件触发不直接写文本，而是写结构化 `eventHints`，由渲染层决定展示策略。
- 允许后续扩展多角色并发，但仍遵循单轮编排与通道隔离。

---

## 6. TASKS 清单（替代迭代顺序）

> 以下是直接可开工的任务池，不强制顺序；建议先做稳健性底座。

### A. 开局 UI / API 配置
- [ ] 开局邮件桌面标签 `LOGS` 改为 `API CONFIG`。
- [ ] 增加 API 配置表单组件（Base URL / API Key / Model / 参数）。
- [ ] 增加连接测试按钮与错误态展示。
- [ ] 增加配置持久化与安全提示。

### B. 调用与配置底座
- [ ] 新增统一 LLM 客户端（OpenAI 兼容）。
- [ ] 配置读取统一入口（用户设置 > `window.__APP_CONFIG__` > 默认）。
- [ ] 移除硬编码 key，全部改为运行时注入。

### C. 对话稳健性
- [ ] 引入 `turn-orchestrator`（单轮互斥、取消、晚到包丢弃）。
- [ ] 对话响应改结构化 JSON + schema 校验。
- [ ] 增加 turn trace 日志与导出功能。

### D. 邮件与主对话隔离
- [ ] 建立 `dialogue/mail/system` 三通道渲染约束。
- [ ] 邮件仅进入 `mail-channel`，禁止直接写入主对话。
- [ ] 新邮件提示（角标 + toast + `/emails` 指令提示）。
- [ ] 回合中邮件延后展示，回合结束统一通知。

### E. 角色卡与记忆扩展
- [ ] 角色卡改为分层 schema。
- [ ] 引入 STM/WM/LTM 与 Memory Arbiter。
- [ ] 增加剧情钩子与风格包扩展点。

---

## 7. 验收标准（面向你关心的结果）

### 7.1 稳健性验收
- 连续 100 轮对话中：无“邮件文本插入主对话”问题。
- 任一玩家输入都能在 turn trace 中定位到 payload 快照。
- 晚到响应被正确丢弃且有日志记录。

### 7.2 体验验收
- 新邮件到达时，玩家在 1 秒内可见提示（角标或 toast）。
- API 配置从开局页可直接完成，且连接测试可得到明确结果。

### 7.3 可扩展验收
- 新增角色卡字段不需要改主流程控制代码。
- 新剧情事件可通过 `eventHints` 接入，不破坏通道隔离规则。
