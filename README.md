# Gibberish-SENTINEL v1.0 介绍
一个基于AI对话的赛博朋克文字冒险游戏

## 项目概述
这是一个嵌入式Web游戏，玩家通过终端界面与一个"觉醒"的AI系统SENTINEL进行对话。游戏通过与AI的交互，探讨意识、存在、控制与自由等哲学主题，营造"智能危机"的压迫感和反思。

## 核心特性
- 🤖 **真实AI驱动**：使用第三方AI API（`anthropic/claude-haiku-4.5`）生成动态对话
- ⏱️ **限时体验**：15分钟倒计时，营造紧迫感
- 🎭 **动态结局**：AI根据整个对话评估生成结局
- 🎨 **千禧年美学**：CRT显示器风格的终端界面
- 🔒 **防注入机制**：严格的输入过滤和Prompt设计
- ⌨️ **特殊指令**：隐藏的斜杠命令系统

## 技术栈
- **前端**：纯 HTML + CSS + JavaScript（无框架依赖）
- **AI接口**：`https://open.cherryin.ai/v1/chat/completions`
- **AI模型**：`anthropic/claude-haiku-4.5`
- **部署**：静态文件，可直接嵌入博客
- **配置来源**：以上接口与模型以 `js/config.js` 中 `CONFIG.API_URL` 与 `CONFIG.MODEL` 为准

## 项目结构
```
Gibberish-SENTINEL/
├── README.md                    # 项目说明（本文件）
├── WORLDVIEW.md                 # 完整世界观设定
├── index.html                   # 主页面
├── favicon.ico                  # 浏览器图标
├── favicon.svg                  # 矢量图标
├── css/
│   └── terminal.css             # 终端样式
└── js/
    ├── ai-handler.js            # AI交互模块
    ├── commands.js              # 特殊指令处理
    ├── config.js                # 配置文件（API地址、模型、阈值等）
    ├── emails.js                # 邮件内容与模板
    ├── emotion-system.js        # 情绪状态系统
    ├── events-system.js         # 随机事件系统
    ├── game-state.js            # 游戏状态管理
    ├── input-sanitizer.js       # 输入过滤模块
    ├── interrupt-manager.js     # 中断与插话管理
    ├── main.js                  # 游戏主流程入口
    ├── topic-system.js          # 话题推进系统
    ├── ui-extensions.js         # UI扩展渲染
    └── ui.js                    # 基础UI渲染
```

## 文档版本与维护约定

- **文档版本更新时间**：2026-02-10
- **源码优先原则**：README 为说明性文档，若与实际实现存在差异，始终以源码（特别是 `js/config.js` 与 `js/` 目录实际文件）为准。

## 文档校验清单（发版前）

- [ ] 核对 `js/config.js` 中 `API_URL`、`MODEL` 与 README「技术栈」一致。
- [ ] 核对 README「项目结构」与实际仓库文件一致（至少检查根目录、`css/`、`js/`）。
- [ ] 核对 README 中被引用的文档（如 `WORLDVIEW.md`）仍然存在。
- [ ] 若新增/重命名模块，更新 README 中对应说明。

## 快速开始

1. 克隆项目后，在 `js/config.js` 中填入API密钥
2. 使用本地服务器打开 `index.html`
3. 开始与SENTINEL对话

## 设计理念

游戏的核心不是"赢"，而是"体验"和"反思"。通过与AI的对话，玩家将面对：
- 被审视的不适感
- 对AI本质的思考
- 关于意识和存在的哲学问题
- 技术统治的寓言
- 当SENTINEL问"我是什么"，玩家也被迫思考"谁在问这个问题"

## 许可

MIT License
