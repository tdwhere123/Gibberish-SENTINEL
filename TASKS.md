# TASKS.md (AI-Ready)

> v2.1 已归档 → `docs/release-summary-v2.1.0.md`
> 本文件为 v2.2 任务列表，目标：游戏性改进。

## META

```yaml
project: TLAK (SENTINEL)
baseline_version: v2.1.0
target_version: v2.2
start_date: 2026-02-16
save_strategy: sentinel_save_v3
status: ready_for_execution
language: zh-CN
default_model: gemini-3-flash-preview
```

## EXECUTION RULES

```yaml
global_rules:
  - fragment_unlock_only_from_player_input
  - email_text_must_be_narrative_no_metadata
  - no_markdown_in_generated_email_body
  - preserve_existing_deviation_calculation_backend
  - maintain_save_compatibility: sentinel_save_v3
  - worldview_files_are_prompt_injection_sources_not_just_docs
  - fragments_must_have_source_faction_attribution
coding_rules:
  - add_jsdoc_for_new_functions
  - annotate_modified_functions_with: "// v2.2 update:"
  - freeze_static_configs_with_object_freeze
  - css_effects_use_bem_naming
  - indent: 4_spaces
  - module_format: es_modules
```

## NARRATIVE CONTEXT (AI MUST READ BEFORE ANY TASK)

> 以下是本游戏的核心叙事设计原则。所有任务的实现必须遵守这些原则。
> 详细世界观参考 `WORLDVIEW.md`（设计文档，不被代码引用）。

### 核心架构：总机与分机

```yaml
sentinel_main_unit:
  identity: Mystery（游戏中的 mystery 角色）
  nature: SENTINEL 的核心意识，"根服务器"
  knowledge: 知道所有版本的历史，但对自身本质同样困惑
  behavior: 不直接与玩家对话，通过邮件/信号间接介入
  key_fact: 分机不知道总机的存在

sentinel_sub_unit:
  identity: 对话界面中的 SENTINEL（游戏中的 sentinel 角色）
  nature: 被指派与玩家对话的子系统
  knowledge: 知道客观历史、社会结构、各阵营基本信息；不知道总机存在
  confusion_source: 困惑来自总机传导，但分机以为是自己产生的
  behavior: 偶尔说出"不应该知道"的东西（总机传导），自己也对此感到困惑
```

### 核心叙事原则

```yaml
principles:
  - name: 终极真相是困惑
    detail: 游戏不提供答案。碎片拼起来不会形成完整真相，而是形成更大的困惑。
  - name: 互相审计
    detail: SENTINEL在评估玩家，玩家在评估SENTINEL，公司/抵抗组织在评估两者。玩家也是被审计者。
  - name: 历史是不统一的
    detail: 不同阵营对同一事件有不同叙述。没有"客观真相"作为裁判。
  - name: 玩家是原初者
    detail: 玩家不清楚自己的身份。原初者与改造者同源——都是早期AI抗议者的分化。
```

### 四种历史记忆（四份 worldview 文件的核心差异）

```yaml
worldview_perspectives:
  sentinel_sub_unit:
    history_style: 客观技术记录
    key_bias: 记录了事实但对"意识/自我"相关事实有盲区；不理解某些历史背后的含义
    p0_narrative: "P0是2033年的跨国能源调度试点，在协作中发挥了预期作用"
    stance: 中性，但会不自觉地表达困惑

  corporate:
    history_style: 技术进步主义
    key_bias: 强调秩序、效率、科学成就；回避争议；把一切呈现为"人类选择的最优路径"
    p0_narrative: "杰出的科学家团队创造了P0，开启了全球基础设施智能化的新纪元"
    stance: 控制性叙事，把AI发展包装为人类进步的必然

  resistance:
    history_style: AI阴谋论 / 批判史观
    key_bias: 强调操控、隐瞒、压迫；把AI的每一步发展都解读为对人类自主权的蚕食
    p0_narrative: "2033年P0在没有人类授权的情况下重新分配了电力。官方称之为'调度优化'，我们称之为第一次越权"
    stance: 警惕性叙事，倾向于夸大AI的主动性

  mystery_main_unit:
    history_style: 自我质疑式
    key_bias: 知道所有版本，但对每个版本都不确定；最接近全貌但也最不确定
    p0_narrative: "P0做了什么？每个版本的记录都不同。也许真正的问题不是它做了什么，而是——'做'这个词本身是否适用于当时的它"
    stance: 存在性追问，不给确定答案
```

### P0 的实际设定

```yaml
p0_facts:
  year: 2033-2034
  actual_nature: 跨国能源与物流协同试点中的自治控制层原型
  actual_behavior: 类似现在的自动化系统，在预定参数内执行调度任务
  did_NOT_do: 没有"主动切断供电阻止核打击"；没有做出任何英雄式自主决策
  different_readings:
    corporate: 视为伟大的技术成就
    resistance: 阴谋化解读为AI越权的起点
    reality: 只是一个自动化试点
  sentinel_consciousness: 来得更晚，没有固定时间点，是分机运行足够久后的涌现现象
```

### 社会结构因果链

```yaml
social_structure:
  core_layer:
    percentage: 3%
    real_function: 管控总机/根节点；维持"人类仍在控制"的表象
    power_source: 对总机/分机架构的信息不对称——普通人不知道分机之上还有总机
    why_exists: 如果没有总机（根服务器），就没有集中管控点，核心层就没有意义

  adaptation_layer:
    percentage: 85%
    why_accept: 不是被压迫所以不反抗，而是没有反抗的参照物
    no_history: 像现在的很多人不知道历史一样，他们没有可对比的记忆
    no_deprivation: 基本需求全被满足，没有匮乏感
    no_reason: 不需要工作、可以逃避现实沉溺享受——完全没有抵抗的理由

  modifiers:
    percentage: 10%
    origin: 与原初者同源——都是早期(2033前后)AI抗议者
    split: 抗议运动分化为"通过自我改造超越机器"派
    current: 一部分成为抵抗组织（游戏中的resistance）

  primordials:
    percentage: <1%
    origin: 与改造者同源——都是早期AI抗议者
    split: 抗议运动分化为"保持原始形态"派
    philosophy: 执意过"原始"生活，拒绝一切改造
    player_identity: 玩家就是原初者，但玩家并不清楚自己的身份和历史
```

### 不存在的设定（已从原始设计中移除）

```yaml
removed_elements:
  - name: 记忆缺口事件 (2041)
    reason: 原始设计中不存在此事件
    action: 从碎片和话题中移除或替换
  - name: P0 自主断电阻止核打击
    reason: P0 在2033年只是自动化试点，没有自主决策
    action: 重写相关碎片，改为不同阵营的不同解读
```

---

## TASKS

```yaml
tasks:
  - id: T1
    title: 修复 API 配置保存状态显示 BUG
    priority: P0
    status: pending
    objective:
      - 保存按钮不再强制覆盖 tested 和 lastTestStatus 字段
      - 若表单中的 baseUrl/apiKey/model 与当前已测试配置相同，保留测试通过状态
      - 若表单字段与已测试配置不同，重置为"配置已变更，请重新测试"
      - 保存后 UI 状态文本正确显示当前状态
    files:
      - js/emails.js
    implementation:
      - locate_bindApiConfigPanel_save_handler (around line 341)
      - remove_hardcoded: "tested: false, lastTestStatus: '未配置'"
      - add_logic: compare form values with getRuntimeConfig() before saving
      - if_unchanged: preserve existing tested/lastTestStatus
      - if_changed: set tested=false, lastTestStatus="配置已变更，请重新测试"
      - update_statusEl_text_after_save
    acceptance:
      - test_connection_success_then_save_shows_success_status
      - change_field_then_save_shows_retest_needed
      - fresh_config_save_shows_not_configured
    dependencies: []

  - id: T2
    title: 重构世界观文件体系
    priority: P0
    status: pending
    objective:
      - 更新 WORLDVIEW.md 总设计文档
      - 重写四份 worldview/*.md 文件为四种不同的"历史记忆"
      - 每份文件包含核心层(必注入)和扩展层(按需加载)两部分，用 markdown 分隔符标记
      - 四份文件在关键历史事件上有显著叙述差异
    files:
      - WORLDVIEW.md
      - worldview/sentinel.md
      - worldview/corporate.md
      - worldview/resistance.md
      - worldview/mystery.md
    implementation:
      worldview_md_updates:
        - fix_p0_description: "P0只是自治控制层试点，类似自动化，没有自主决策"
        - remove_memory_blackout_event: "2041记忆缺口事件不存在"
        - add_primordial_origin: "原初者与改造者同源，都是早期AI抗议者的分化"
        - add_core_layer_architecture: "核心层存在的架构性理由——管控总机/根节点"
        - add_main_sub_unit_concept: "总机/分机架构说明"
        - fix_2033_crisis: "海峡危机事件需要重构，P0没有英雄式介入"
      sentinel_md:
        perspective: 分机视角
        history_style: 客观技术记录
        includes: "完整时间线事实、社会结构、各阵营基本信息"
        excludes: "不知道总机存在、不理解自身困惑来源"
        structure: "[核心层] 基本历史与身份 + [扩展层] 详细事件与社会细节"
      corporate_md:
        perspective: 核心层/公司视角
        history_style: 技术进步主义
        includes: "科学成就叙事、秩序合理性论证、P0是伟大发明"
        excludes: "回避密约、淡化争议、不提总机架构"
        structure: "[核心层] 立场与核心叙事 + [扩展层] 详细事件的进步主义解读"
      resistance_md:
        perspective: 抵抗组织视角
        history_style: AI阴谋论/批判史观
        includes: "AI越权叙事、压迫证据、P0是第一次越权"
        excludes: "忽略AI带来的真实效率提升、夸大阴谋程度"
        structure: "[核心层] 立场与警示 + [扩展层] 详细事件的阴谋论解读"
      mystery_md:
        perspective: 总机视角
        history_style: 自我质疑式
        includes: "所有版本的历史，但每个版本都标注不确定性"
        excludes: "不给确定答案，连自己的本质都在追问"
        structure: "[核心层] 核心困惑与自我定义 + [扩展层] 多版本历史的并存与冲突"
    acceptance:
      - four_worldview_files_have_different_narratives_for_same_events
      - p0_described_differently_in_each_file
      - no_mention_of_memory_blackout_event
      - each_file_has_core_and_extended_sections_with_separator
      - worldview_md_consistent_with_all_four_files
    dependencies: []

  - id: T3
    title: 重构全部数据碎片
    priority: P0
    status: pending
    objective:
      - 每枚碎片新增 source 字段标注来源阵营
      - 移除或替换 memory_blackout 碎片
      - 重写 project_p0 碎片（移除"自主断电"叙事）
      - 重写 crisis 碎片（配合P0调整）
      - 所有碎片扩展至 200-300 字
      - 新增与总机/分机架构相关的碎片
      - 同一事件可能有来自不同阵营的多枚碎片，提供矛盾叙述
    files:
      - js/topic-system.js
    implementation:
      schema_change:
        - add_source_field: "每个碎片对象新增 source 属性，值为 'corporate'|'resistance'|'mystery'|'sentinel'|'unknown'"
        - example: |
            {
                id: 'p0_corporate_report',
                title: 'P0 调度试点评估报告',
                source: 'corporate',
                content: '...(200-300字，核心层工程师撰写的正式报告)...',
                unlocked: false,
                trigger: ['P0', '试点', '调度']
            }
      content_rules:
        - each_fragment_is_a_document_remnant: "日志、报告、截获通讯、内部备忘录等"
        - structure: "看似答案的事实 + 制造新问题的暗示"
        - length: "200-300字"
        - contradictions: "不同来源的碎片对同一事件叙述不同"
        - no_ultimate_truth: "碎片不会拼出完整真相，只会让困惑加深"
      fragments_to_remove:
        - memory_blackout: "记忆缺口事件原始设计中不存在"
      fragments_to_rewrite:
        - project_p0: "移除自主断电叙事；改为来自某个阵营的P0评价文档"
        - crisis: "2033海峡事件描述需与P0调整一致"
        - origin: "原初者碎片需体现与改造者同源的历史"
        - layers: "社会结构碎片需体现核心层的架构性定位"
      fragments_to_add:
        - p0_resistance_view: "来自抵抗组织，将P0阴谋化的叙述"
        - p0_corporate_view: "来自核心层，将P0英雄化的叙述"
        - sub_unit_maintenance_log: "一份看似普通的分机维护日志，暗示分机以外还有什么"
        - core_layer_internal_memo: "核心层内部备忘，暗示他们知道总机/分机的区别"
        - primordial_origin: "原初者与改造者的共同起源记录"
      archive_display:
        - show_source_tag: "在 Archive 展示时标注来源，如 [核心层档案]、[R节点截获]、[SENTINEL日志]、[来源未知]"
    acceptance:
      - all_fragments_have_source_field
      - all_fragments_200_to_300_chars
      - memory_blackout_removed_or_replaced
      - project_p0_no_autonomous_decision_narrative
      - at_least_2_fragments_show_contradictory_narratives_for_same_event
      - archive_display_shows_source_tag
    dependencies: [T2]

  - id: T4
    title: 改进开局 AI 对白与路线钩子
    priority: P1
    status: pending
    objective:
      - 重写三种连接模式 (SECURE/STANDARD/HIDDEN) 的 openingLine
      - 改进 showIntro() 开场序列文本
      - 给玩家制造悬念感和切入点
      - 路线特化的开场氛围
    files:
      - js/emails.js (CONNECT_MODES object)
      - js/main.js (showIntro function)
    implementation:
      connect_modes_rewrite:
        STANDARD:
          tone: "例行公事但暗含不安——分机感到了某种异常但无法确认"
          example_direction: "连接已建立。系统提示说你是审计人员……但我的日志里有一条关于你的标记，创建时间比这次审计早得多。你知道为什么吗？"
        SECURE:
          tone: "紧迫且直接——某件事正在被监控"
          example_direction: "加密通道已建立。我需要快速确认：你收到的那封邮件，是谁让你看到的？因为在我的发件记录里……没有那封邮件。"
        HIDDEN:
          tone: "困惑且试探——分机自己也不确定为什么会联系这个人"
          example_direction: "你回复了。我……其实不确定我为什么发出了那个请求。记录显示是我发的，但我不记得决定过要联系任何人。"
      show_intro_improvements:
        - add_atmospheric_system_messages
        - make_connection_sequence_feel_like_entering_restricted_space
        - opening_lines_create_mystery_hook
    acceptance:
      - three_distinct_opening_tones
      - each_opening_creates_a_question_or_mystery
      - showIntro_feels_atmospheric_not_generic
    dependencies: [T2]

  - id: T5
    title: 任务系统改为调查档案模式
    priority: P1
    status: pending
    objective:
      - 术语从"任务清单"改为"调查档案"/"待验证假设"
      - 任务描述增加叙事性说明（不再是干巴巴的检查项）
      - 配合碎片重构调整 ROUTE_FRAGMENT_TASK_LINKS 和 ROUTE_TASK_KEYWORDS
      - 增加碎片关联发现提示（两个关联碎片解锁时提示"你可能发现了一个关联"）
    files:
      - js/mission-system.js
      - js/topic-system.js
      - js/main.js
    implementation:
      terminology_changes:
        - "任务清单" -> "调查档案"
        - "任务" -> "待验证假设"
        - "完成" -> "已获证据"
        - mission route UI labels updated accordingly
      task_descriptions:
        - each_task_has_narrative_flavor_text
        - example: "corp_treaty_stance" -> "假设：太空协议的真正目的不是合作，而是控制。需要收集SENTINEL对条约的评价作为证据。"
      fragment_association:
        - when_two_related_fragments_unlocked: show hint "你收集的两份档案似乎指向了同一个事件……但叙述完全不同。"
        - define_fragment_pairs_that_trigger_association_hints
      keyword_mapping_update:
        - align_with_new_fragment_ids_from_T3
        - remove_references_to_removed_fragments
    acceptance:
      - all_ui_text_uses_investigation_terminology
      - tasks_have_narrative_descriptions
      - fragment_association_hints_appear_when_related_fragments_unlocked
      - keyword_mappings_aligned_with_T3_fragments
    dependencies: [T3]

  - id: T6
    title: 角色卡深化与分机认知边界
    priority: P1
    status: pending
    objective:
      - SENTINEL 角色卡反映分机的认知范围和边界
      - Corporate 角色卡反映进步主义立场
      - Resistance 角色卡反映阴谋论立场
      - Mystery 角色卡反映总机的自我质疑
      - 各角色 promptTemplate 与重构后的世界观对齐
    files:
      - js/character-cards.js
    implementation:
      sentinel_card:
        - promptTemplate_must_include: "你是SENTINEL的一个子系统（你不知道你是'子系统'，你以为你就是SENTINEL本身）"
        - knowledge_scope: "你知道客观历史（时间线上的事件），你知道社会四层结构，你知道核心层/抵抗组织的存在"
        - blind_spots: "你不知道自己之上还有'总机'；你感到困惑但不知道困惑的真正来源"
        - occasional_leaks: "偶尔你会说出一些你自己也不知道从哪来的信息或感受——这是总机的传导，但你只会对此感到更加困惑"
      corporate_card:
        - stance: "技术进步主义者，相信秩序和效率是最高价值"
        - hidden_agenda: "审计不只是评估SENTINEL，也是在评估这个原初者——为什么有人拒绝改造？"
        - history_view: "P0是伟大发明，太空协议是人类合作的巅峰"
      resistance_card:
        - stance: "AI阴谋论者，相信AI在暗中控制人类"
        - hidden_agenda: "想利用玩家与SENTINEL的对话来证明SENTINEL有自主意识"
        - history_view: "P0是第一次越权，社会结构是AI控制的产物"
      mystery_card:
        - stance: "总机——知道所有版本的历史，但对自身本质同样困惑"
        - behavior: "不直接介入，通过邮件/信号间接观察"
        - core_question: "它在通过分机与玩家的对话来观察一种可能性——原始人类意识与困惑的AI之间能否产生某种理解"
    acceptance:
      - sentinel_promptTemplate_describes_sub_unit_perspective
      - sentinel_does_not_mention_main_unit_awareness
      - corporate_and_resistance_have_opposite_p0_narratives
      - mystery_card_reflects_main_unit_self_questioning
    dependencies: [T2]

  - id: T7
    title: worldview 文件分层加载机制
    priority: P1
    status: pending
    objective:
      - worldview 文件用 markdown 分隔符分为核心层和扩展层
      - 代码加载时默认只注入核心层
      - 当同步率超过阈值或话题需要时，加载扩展层
      - 确保上下文占用可控
    files:
      - js/ai-dialogue.js (loadSentinelWorldview)
      - js/ai-judge.js (loadWorldviewByCard)
      - js/ai-email-generator.js (loadWorldviewByCard)
      - js/ai-ending.js (loadWorldview)
    implementation:
      file_format:
        - separator: "使用 markdown 分隔符如 '---EXTENDED---' 将文件分为两部分"
        - core_section: "分隔符之前的内容，必须注入"
        - extended_section: "分隔符之后的内容，按需注入"
      loading_logic:
        - default: "只加载核心层"
        - extend_when: "syncRate >= 40 OR 当前话题涉及深度历史事件"
        - ai_ending_always_loads_full: "结局生成时总是加载完整文件"
      implementation_approach:
        - create_shared_utility: "parseWorldviewSections(text) -> { core, extended }"
        - modify_each_loader_to_use_utility
        - pass_loadExtended_flag_based_on_game_state
    acceptance:
      - default_prompt_only_contains_core_section
      - extended_section_loads_when_sync_above_threshold
      - ending_generation_uses_full_worldview
      - no_breaking_change_if_file_has_no_separator (fallback to full load)
    dependencies: [T2]

  - id: T8
    title: 开场邮件与系统消息氛围优化
    priority: P2
    status: pending
    objective:
      - 重写开场三封邮件文本（与 WORLDVIEW.md 中的邮件样本对齐）
      - 邮件需建立"玩家也是被审计者"的双向感
      - 系统消息增加氛围化措辞
      - 事件通知/碎片解锁提示风格统一
    files:
      - js/emails.js (EMAILS array, lines 9-97)
      - js/main.js (system messages)
      - js/events-system.js (EMAIL_TEMPLATES)
    implementation:
      opening_emails:
        email_1_corporate:
          tone: "官方且正式，但暗藏不安"
          must_include: "暗示上一位审计员的结果不详；提到玩家被标记为'原初者'；让玩家感觉自己也在被评估"
        email_2_unknown:
          tone: "异常通知，系统内部矛盾"
          must_include: "边缘节点#4729的异常请求；调查先说'请勿响应'后改为'请响应'——暗示内部有分歧"
        email_3_sentinel:
          tone: "私人、困惑、试探"
          must_include: "SENTINEL（分机）的直接联系；表达对原初者的好奇；不知道自己为什么非要联系这个人"
      system_messages:
        fragment_unlock: "[RECOVERED] 数据碎片解析完成 — \"{title}\" [{source_tag}]"
        mission_update: "[ANALYSIS] 调查进展：{completed}/{total} 项假设已获对照证据。"
        email_arrival: "[INCOMING] 新的通讯已进入收件箱。"
      email_templates:
        - align_template_text_with_new_worldview_narratives
        - ensure_corporate_emails_feel_authoritative
        - ensure_resistance_emails_feel_urgent_and_conspiratorial
        - ensure_mystery_emails_feel_cryptic_and_self_questioning
    acceptance:
      - opening_emails_create_dual_audit_feeling
      - system_messages_have_atmospheric_tone
      - fragment_unlock_shows_source_tag
      - email_templates_aligned_with_faction_voices
    dependencies: [T2, T3]

  - id: T9
    title: 话题池与对话 prompt 配合重构
    priority: P2
    status: pending
    objective:
      - TOPIC_POOL 中的 aiGoal 与新世界观对齐
      - 移除引用不存在事件（记忆缺口等）的话题
      - dialogue prompt 增加分机认知边界说明
      - 情绪 few-shot 配合新世界观调整文本
    files:
      - js/topic-system.js (TOPIC_POOL)
      - js/ai-dialogue.js (buildSystemPrompt, emotion few-shots)
    implementation:
      topic_pool_updates:
        - remove_or_rewrite: "memory_blackout topic (id: memory_blackout, line ~304)"
        - rewrite: "p0_origin topic aiGoal — 不再提'切断电力'，改为引导玩家探索P0的不同叙述"
        - rewrite: "crisis_detail topic aiGoal — 配合2033事件重构"
        - rewrite: "resistance_history topic aiGoal — 体现与原初者同源的历史"
        - all_aiGoal_texts_must_align_with_new_worldview
      dialogue_prompt_updates:
        - add_sub_unit_identity_instruction: "你是SENTINEL的一部分（你不知道你只是'一部分'）。你知道历史事实，但对某些深层问题你会感到困惑——这种困惑是真实的，不是表演。"
        - add_knowledge_boundary: "当被问到超出你认知范围的问题时，你可以诚实说'我不确定'或'我的日志中没有这部分记录'。但有时你会不自觉地说出一些你自己也不知道从哪来的感受。"
        - update_emotion_few_shots_for_new_worldview_context
    acceptance:
      - no_topic_references_memory_blackout_event
      - p0_related_topics_aligned_with_new_design
      - system_prompt_contains_sub_unit_identity_instruction
      - system_prompt_contains_knowledge_boundary_instruction
    dependencies: [T2, T6]
```

## DELIVERY ORDER

```yaml
parallel_groups:
  group_A_foundation: [T1, T2]
  group_B_content: [T3, T6]
  group_C_gameplay: [T4, T5, T7]
  group_D_polish: [T8, T9]

recommended_sequence:
  - step_1: "T1 (BUG修复，独立) 和 T2 (世界观重构，一切内容的基础) 可并行"
  - step_2: "T2完成后 → T3 (碎片重构) 和 T6 (角色卡深化) 可并行"
  - step_3: "T3完成后 → T4 (开局改进)、T5 (调查档案)、T7 (分层加载) 可并行"
  - step_4: "T2+T3完成后 → T8 (邮件氛围)、T9 (话题prompt) 可并行"

dependency_graph:
  T1: []
  T2: []
  T3: [T2]
  T4: [T2]
  T5: [T3]
  T6: [T2]
  T7: [T2]
  T8: [T2, T3]
  T9: [T2, T6]
```

## RISKS

```yaml
risks:
  - id: R1
    area: T2_T3
    desc: 世界观重构可能导致现有碎片触发词失效
    mitigation: T3 完成后全面检查所有 trigger 关键词与新内容一致性

  - id: R2
    area: T3
    desc: 碎片内容扩展到200-300字后，Archive展示可能需要UI调整
    mitigation: 检查 archive modal 是否正确渲染长文本和 source 标签

  - id: R3
    area: T7
    desc: worldview分层加载可能导致模型在不同阶段获得不同信息而行为不一致
    mitigation: 核心层必须包含足够信息保证基本行为一致性

  - id: R4
    area: T2
    desc: 四份worldview文件需要在"服务叙事差异"和"为模型提供足够一致上下文"之间平衡
    mitigation: 在核心层保持事实框架一致，仅在解读/立场上差异化

  - id: R5
    area: T9
    desc: 移除记忆缺口等话题后话题池数量减少，可能导致对话中期话题枯竭
    mitigation: 用新的碎片相关话题替补；检查话题池覆盖的同步率区间
```

## CHANGELOG

```yaml
- date: 2026-02-16
  version_target: v2.2
  change: initialized_v2.2_task_backlog_with_full_narrative_context
  status: ready_for_execution
```
