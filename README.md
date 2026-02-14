# TLAK v2.0（已发布）

本仓库已完成 v2.0 重构并进入后续迭代阶段。

## 当前状态

- 版本状态：`v2.0` 已完成并可作为稳定基线。
- 发布说明：见 `docs/release-summary-v2.0.0.md`。
- 后续规划记录：见 `progress.md`（已重置为新目标规划模板）。

## 快速入口

- 主入口：`js/main.js`
- 配置：`js/config.js`
- 运行时配置：`js/runtime-config.js`
- 状态核心：`js/game-state.js`
- 路线任务：`js/mission-system.js`
- 对话/判断/邮件/结局：
  - `js/ai-dialogue.js`
  - `js/ai-judge.js`
  - `js/ai-email-generator.js`
  - `js/ai-ending.js`
- UI 与命令：
  - `js/ui.js`
  - `js/ui-extensions.js`
  - `js/commands.js`

## 本地运行

```bash
python -m http.server 8000
# 打开 http://localhost:8000
```

## 维护约定（精简）

- 新迭代请优先更新 `progress.md` 的“下一阶段目标”。
- 重要发布变更请同步到 `docs/release-summary-*.md`。
- 避免在 README 维护阶段性任务清单，README 仅保留长期有效说明。
