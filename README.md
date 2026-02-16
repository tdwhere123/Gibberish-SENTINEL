# TLAK v2.2（规划中）

本仓库是一个静态前端叙事对话游戏（SENTINEL），基于 AI 对话引擎与事件驱动架构构建。

## 当前状态

- **v2.0 基线**：架构级重构 → `docs/release-summary-v2.0.0.md`
- **v2.1 已发布**：体验强化与稳健性治理 → `docs/release-summary-v2.1.0.md`
- **v2.2 规划中**：游戏性深化、解谜/推理灵感融入、BUG 修复 → `TASKS.md`
- 存档策略：`sentinel_save_v3`

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

## 维护约定

- 任务状态与执行日志优先更新到 `TASKS.md`。
- 版本总结写入 `docs/release-summary-*.md`。
- README 保持长期有效信息，不记录临时任务拆解。
