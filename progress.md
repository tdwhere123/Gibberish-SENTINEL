# tasks.md (AI-Ready)

> v2.1 已完成并归档，详见 `docs/release-summary-v2.1.0.md`。
> 本文件已清空，用于 v2.2 任务规划。

## META

```yaml
project: TLAK
baseline_version: v2.1.0
target_version: v2.2
start_date: 2026-02-15
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
  - annotate_modified_functions_with: "// v2.2 update:"
  - freeze_static_configs_with_object_freeze
  - css_effects_use_bem_naming
```

## TASKS

```yaml
tasks: []
  # 待确认后填入
```

## DELIVERY ORDER

```yaml
parallel_groups: {}
recommended_sequence: []
```

## CHANGELOG

```yaml
- date: 2026-02-15
  version_target: v2.2
  change: archived_v2.1_and_initialized_v2.2_planning
  status: planning
```
