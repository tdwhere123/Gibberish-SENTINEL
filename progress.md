# tasks.md (AI-Ready)

> Source converted from previous `progress.md` narrative plan.
> Goal: provide a machine-readable task backlog for AI agents.

## META

```yaml
project: TLAK
baseline_version: v2.0.0
target_version: v2.1
start_date: 2026-02-14
save_strategy: sentinel_save_v3
status: planning
language: zh-CN
```

## EXECUTION RULES

```yaml
global_rules:
  - fragment_unlock_only_from_player_input
  - email_text_must_be_narrative_no_metadata
  - no_markdown_in_generated_email_body
  - preserve_existing_deviation_calculation_backend
  - maintain_save_compatibility: sentinel_save_v3
coding_rules:
  - add_jsdoc_for_new_functions
  - annotate_modified_functions_with: "// v2.1 update:"
  - freeze_static_configs_with_object_freeze
  - css_effects_use_bem_naming
```

## TASKS

```yaml
tasks:
  - id: T1
    title: 修复关键词触发逻辑
    priority: P0
    status: todo
    objective:
      - fragment 解锁仅由玩家输入触发
      - 解锁提示在下一轮显示
    files:
      - js/topic-system.js
      - js/main.js
    implementation:
      - ensure_checkFragmentUnlock_receives_player_input_only
      - remove_or_block_ai_output_unlock_path
      - queue_unlock_notice_for_next_turn
    acceptance:
      - ai_keyword_does_not_unlock_fragment
      - player_keyword_unlocks_fragment
      - unlock_notice_shows_next_turn
    dependencies: []

  - id: T2
    title: 邮件内容拟人化改造
    priority: P0
    status: todo
    objective:
      - 移除邮件中的偏差值/数值元数据显示
      - 统一角色化叙事语气
      - 禁止 markdown 格式
    files:
      - js/ai-email-generator.js
      - js/events-system.js
    implementation:
      - rewrite_buildFallbackEmail_as_role_narrative_templates
      - refactor_EMAIL_TEMPLATES_to_narrative_tone
      - strengthen_email_prompt_output_constraints
    acceptance:
      - emails_have_no_numeric_metadata
      - role_voice_is_consistent
      - markdown_not_present
      - deviation_system_backend_still_works
    dependencies: []

  - id: T3
    title: 降低邮件/打断触发频率
    priority: P0
    status: todo
    objective:
      - 总体触发概率收敛到 20-30%
      - 增加角色邮件冷却（5-8回合）
      - 避免两套系统并行双触发
    files:
      - js/interrupt-manager.js
      - js/events-system.js
    implementation:
      - rebalance_calculateInterruptChance
      - add_per_role_email_cooldown_state
      - unify_or_guard_event_trigger_paths
    acceptance:
      - total_interrupts_and_emails_per_run_less_than_10
      - same_role_email_interval_at_least_5_rounds
      - no_continuous_late_game_interrupt_spam
    dependencies: []

  - id: T4
    title: 统一邮件为全屏格式（但不强制打断）
    priority: P1
    status: todo
    objective:
      - 所有邮件进入统一 mailbox UI
      - 到达时仅提示，不强制弹窗
      - 玩家通过 /emails 主动打开
    files:
      - js/emails.js
      - js/main.js
      - js/commands.js
    implementation:
      - change_triggerUrgentEmail_to_inbox_insert_plus_notify
      - add_new_email_hint_and_unread_badge_update
      - execute_pending_callbacks_on_emails_command
      - enforce_sendEmail_permission_before_send
    acceptance:
      - unified_mail_ui_for_all_emails
      - no_forced_conversation_interrupt_on_arrival
      - terminal_hint_and_unread_indicator_visible
      - /emails_opens_mailbox
    dependencies: [T2]

  - id: T5
    title: 邮件触发与对话事件精确绑定
    priority: P1
    status: todo
    objective:
      - 玩家触发敏感词后延迟 1-2 回合触发对应邮件
      - 建立可感知的“因果链”
    files:
      - js/events-system.js
      - js/main.js
    implementation:
      - add_sensitive_topic_keyword_maps_by_route
      - schedule_delayed_email_events
      - process_scheduled_events_each_round
      - integrate_trigger_check_after_player_input
    acceptance:
      - keyword_to_email_delay_works_1_to_2_rounds
      - route_specific_role_emails_are_correct
      - mystery_cross_route_trigger_when_high_sync
      - email_content_related_to_trigger_context
    dependencies: [T3]

  - id: T6
    title: 强化 SENTINEL 回复风格差异
    priority: P0
    status: todo
    objective:
      - 不同情绪状态下语气差异显著可感知
    files:
      - js/ai-dialogue.js
      - js/emotion-system.js
    implementation:
      - enrich_prompt_emotion_section_with_strict_instructions
      - add_emotion_few_shot_examples
      - refine_emotion_instruction_fields_for_specificity
      - add_final_prompt_guardrail_for_style_compliance
    acceptance:
      - agitated_short_sentence_and_rhetorical_style
      - breakthrough_longer_emotional_expression
      - cryptic_sparse_metaphorical_style
      - calm_neutral_complete_sentence_style
    dependencies: []

  - id: T7
    title: 改进 Archive 碎片叙事文本
    priority: P0
    status: todo
    objective:
      - 提升 DATA_FRAGMENTS 文本叙事层次
      - 增加隐性追问引导
    files:
      - js/topic-system.js
    implementation:
      - rewrite_high_priority_fragments_first
      - apply_multiline_pacing_and_open_question_ending
      - preserve_mystery_without_direct_answers
    acceptance:
      - high_priority_fragments_rewritten
      - stronger_narrative_depth_and_tone_consistency
      - implicit_followup_hooks_present
    dependencies: []
    subtasks:
      - sentinel_fear
      - ghost_code
      - paradox
      - core_layer
      - project_p0

  - id: T8
    title: 角色权限与视觉特效系统
    priority: P2
    status: todo
    objective:
      - 根据角色行为触发差异化视觉效果
    files:
      - js/character-cards.js
      - js/ui.js
      - css/style.css
    implementation:
      - extend_visualEffects_config_by_role
      - implement_triggerCharacterEffect_ui_api
      - wire_effects_to_email_or_insertion_events
      - add_css_keyframes_for_surveillance_and_signal_styles
    acceptance:
      - corporate_email_shows_surveillance_flash
      - mystery_insertion_shows_signal_drift
      - resistance_related_effect_available
      - effects_are_readable_and_non_blocking
    dependencies: [T4]
```

## DELIVERY ORDER

```yaml
parallel_groups:
  group_A: [T1, T2, T3, T6, T7]
  group_B: [T4, T5]
  group_C: [T8]
recommended_sequence:
  - complete: group_A
  - then: group_B
  - finally: group_C
```

## TEST PLAN (AI EXECUTABLE CHECKLIST)

```yaml
test_cases:
  - id: TC-T1-01
    for_task: T1
    steps:
      - player_input_contains: "幽灵代码"
      - assert_fragment_unlocked: true
  - id: TC-T1-02
    for_task: T1
    steps:
      - ai_output_contains: "幽灵代码"
      - assert_fragment_unlocked: false

  - id: TC-T3-01
    for_task: T3
    steps:
      - run_duration_minutes: 15
      - assert_total_email_count_less_than: 10
      - assert_same_role_min_interval_rounds: 5

  - id: TC-T5-01
    for_task: T5
    steps:
      - player_input_contains: "抵抗"
      - assert_email_received_after_rounds: 2
      - assert_email_role: corporate

  - id: TC-T5-02
    for_task: T5
    steps:
      - player_input_contains: "监听"
      - assert_email_received_after_rounds: 1
      - assert_email_role: resistance

  - id: TC-T6-01
    for_task: T6
    steps:
      - state: high_suspicion_low_trust
      - assert_style_features: [short_sentence, rhetorical_question, pauses]

  - id: TC-T6-02
    for_task: T6
    steps:
      - state: high_trust_high_sync
      - assert_style_features: [longer_paragraph, emotional_expression]
```

## RISKS

```yaml
risks:
  - id: R1
    area: T3_T5
    desc: 邮件触发逻辑重构可能导致部分路线邮件缺失
    mitigation: route_based_regression_test_for_corporate_resistance_hidden
  - id: R2
    area: T1_T5
    desc: 关键词重叠可能导致碎片和邮件同时触发冲突
    mitigation: define_trigger_priority_and_dedup_strategy
  - id: R3
    area: T8
    desc: 动画特效可能影响性能与可读性
    mitigation: cap_animation_duration_and_frequency
```

## CHANGELOG

```yaml
- date: 2026-02-14
  version_target: v2.1
  change: converted_legacy_progress_to_ai_ready_tasks
  status: ready_for_execution
```
