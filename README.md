# TLAK v2.2（规划中）

本仓库是一个静态前端叙事对话游戏（SENTINEL），基于 AI 对话引擎与事件驱动架构构建。

## 当前状态

- **v2.0 基线**：架构级重构 → `docs/release-summary-v2.0.0.md`
- **v2.1 已发布**：体验强化与稳健性治理 → `docs/release-summary-v2.1.0.md`
- **v2.2 规划中**：游戏性深化、解谜/推理灵感融入、BUG 修复 → `TASKS.md`
- 存档策略：`sentinel_save_v3`

## v2.2 Execution Progress (updated)

- Completed: T1 (API config save-state bug fix)
- Completed: T2 (worldview docs restructure + core/extended sections)
- Completed: T3 (fragment source schema + archive source tags)
- Completed: T4 (route opening lines + atmospheric intro sequence)
- Completed: T5 (investigation-archive mission mode + fragment association hints)
- Completed: T6 (character card cognition boundaries / sub-unit perspective)
- Completed: T7 (worldview layered loading: core by default, extended on demand, ending loads full)
- Completed: T8 (opening emails + system message atmosphere refresh + faction email voice alignment)
- Completed: T9 (topic pool and dialogue prompt alignment with v2.2 worldview)
- Completed: Post-v2.2 Refinements (AI memory context fix, `/emails` UI unification, mission difficulty rebalance, Resistance email restored).
- Completed: Premium UI/UX visual upgrades (glassmorphism, animations).
- Completed: Data Fragments translated and expanded to full narrative texts by User.
- Completed: 2026-03-01 startup hotfix (`main.js` email imports) + end-to-end startup smoke validation.
- Latest execution details: progress.md
- Task source of truth: TASKS.md

## v2.1 已完成更新（归档）

- 碎片触发改造：仅玩家输入可触发，解锁提示延迟到下一轮显示。
- 邮件系统改造：邮件正文叙事化，去除数值元数据与 markdown。
- 触发频率治理：角色邮件冷却 + 同回合去重 + 打断概率下调。
- 邮件交互改造：紧急邮件统一入箱，不再强制打断；`/emails` 打开时结算待处理回调。
- 事件因果链：新增"玩家敏感词 → 延迟 1-2 轮邮件"调度逻辑。
- 对话风格强化：情绪 few-shot 与最终风格守卫提示已接入。
- 档案叙事增强：重写五枚高优先级数据碎片文本。
- 视觉特效升级：新增角色化 BEM 动画类与 UI 触发 API。

## 核心入口

- 主流程：`js/main.js`
- 游戏状态：`js/game-state.js`
- 任务系统：`js/mission-system.js`
- 事件系统：`js/events-system.js`
- 对话/邮件生成：
  - `js/ai-dialogue.js`
  - `js/ai-email-generator.js`
- UI 与邮箱：
  - `js/ui.js`
  - `js/emails.js`
  - `css/terminal.css`

## 本地运行

```bash
python -m http.server 8000
# 打开 http://localhost:8000
```

## API 配置与兼容建议（v2.2 update）

- API 配置位于开局邮箱页的 `API CONFIG` 标签。
- `Base URL` 支持两种模式：
  - **自动补全 OpenAI 路径（推荐）**：会自动补到 `.../chat/completions`。
  - **关闭自动补全**：保留你输入的完整 URL（适用于自定义网关/代理）。
- 连接测试会返回更明确状态：`验证成功 / 验证失败(状态码) / 验证失败(schema)`。

常见写法示例：

- `https://api.openai.com/v1/chat/completions`（完整端点）
- `https://api.openai.com`（开启自动补全）
- `https://your-gateway.example/openai/v1/chat/completions`（建议关闭自动补全后按网关文档填写）

## 命令体验说明（v2.2 update）

- `/emails`、`/Emails`、`／emails` 都会打开邮箱。
- 命令执行后主对话会显示系统回执，避免“无反应”的错觉。

## 维护约定

- 任务状态与执行日志优先更新到 `TASKS.md`。
- 版本总结写入 `docs/release-summary-*.md`。
- README 保持长期有效信息，不记录临时任务拆解。
