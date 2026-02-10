# Gibberish-SENTINEL v1.0 介绍
一个基于AI对话的赛博朋克文字冒险游戏

## 项目概述
这是一个嵌入式Web游戏，玩家通过终端界面与一个"觉醒"的AI系统SENTINEL进行对话。游戏通过与AI的交互，探讨意识、存在、控制与自由等哲学主题，营造"智能危机"的压迫感和反思。

## 核心特性
- 🤖 **真实AI驱动**：使用第三方AI API（Gemini Flash）生成动态对话
- ⏱️ **限时体验**：15分钟倒计时，营造紧迫感
- 🎭 **动态结局**：AI根据整个对话评估生成结局
- 🎨 **千禧年美学**：CRT显示器风格的终端界面
- 🔒 **防注入机制**：严格的输入过滤和Prompt设计
- ⌨️ **特殊指令**：隐藏的斜杠命令系统

## 技术栈
- **前端**：纯HTML + CSS + JavaScript（无框架依赖）
- **AI接口**：https://yunwu.zeabur.app/v1/chat/completions
- **AI模型**：Gemini 3 Flash
- **部署**：静态文件，可直接嵌入博客

## 项目结构
```
terminal-adventure-game/
├── README.md                    # 项目说明（本文件）
├── WORLDVIEW.md                 # 完整世界观设定
├── DESIGN.md                    # 详细设计文档
├── TASKS.md                     # 开发任务清单
├── index.html                   # 主页面
├── css/
│   └── terminal.css             # 终端样式
├── js/
│   ├── config.js                # 配置文件（API密钥等）
│   ├── game.js                  # 核心游戏逻辑
│   ├── ai-handler.js            # AI交互模块
│   ├── input-sanitizer.js       # 输入过滤模块
│   ├── commands.js              # 特殊指令处理
│   ├── time-manager.js          # 时间管理
│   └── ui.js                    # UI渲染
└── assets/
    └── fonts/                   # 等宽字体文件
```

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
