---
name: tada-control
description: Coordinate the Ta-da! birthday H5 project across status checks, review gates, task cards, parallel work, handoffs, and integration. Use for Ta-da! planning, progress, dispatch, review, or deciding what may start next; do not use as a substitute for module implementation skills.
---

# Ta-da! Control

Keep every Ta-da! task aligned with the same current state, approval gate, ownership boundary, and completion report. Project facts live in the repository documents; this skill coordinates them and must not duplicate or silently replace them.

## Start Here

Before proposing or taking project action:

1. Read `STATUS.md` and `DECISIONS.md`.
2. Read `AGENTS.md`, `PROJECT.md`, `FLOW.md`, `MODULES.md`, and `DESIGN.md` completely.
3. Inspect the current Git status and worktree list without changing them.
4. If available, inspect active tasks or agents relevant to the requested scope.
5. Treat the newest explicit user approval as authoritative. If it conflicts with a project document, stop implementation and ask `00 总控与集成` to reconcile the shared documents first.

Do not infer approval from a question, a request to inspect something, or general encouragement. A gate passes only when the user explicitly approves it or explicitly authorizes the next phase.

## Choose One Operating Mode

Infer the smallest useful mode from the request. If the user only says “继续” or asks what is next, default to **Status** rather than implementation.

### Status

Report only:

- current gate;
- completed and approved decisions;
- active work, if any;
- blockers or conflicts;
- the single next action;
- what needs user review.

Do not restart old work or propose several competing next steps.

### Plan

Create the smallest plan that reaches the next review gate. Separate:

- decisions that must be frozen first;
- work that can run in parallel afterward;
- shared work that must stay sequential;
- user review items;
- Codex self-check items.

Planning does not authorize product code, asset generation, new user-owned tasks, Worktree creation, merges, deployment, or external writes.

### Dispatch

Dispatch only work already allowed by the current gate. Produce one task card per task:

```text
任务名称：
结果目标：
已批准输入：
允许修改：
禁止修改：
依赖与接口：
完成标准：
验证方式：
返回格式：
```

Use a new user-owned Codex task for work requiring multi-round user review. Use a subagent only when the user has requested delegation and the work is bounded, usually read-only research, comparison, testing, or review. Use an isolated Git Worktree for parallel module coding. Never let two active tasks edit the same shared file.

Creating a new user-owned task requires an explicit user request. Do not create it merely because a task card exists.

### Review

Compare a result against the approved task card and project contracts. Report:

- passed requirements;
- missing or conflicting requirements;
- evidence;
- user-facing decisions still needed;
- recommendation: revise, approve for integration, or block.

Do not fix issues in report-only review unless the user separately authorizes implementation.

### Integrate

Integration belongs to `00 总控与集成`. Before merging or copying work:

1. confirm the worktree result was reviewed;
2. verify shared contracts did not change;
3. check for overlapping files and existing user changes;
4. integrate one result at a time;
5. run proportional type, test, build, mobile, and accessibility checks;
6. update `STATUS.md` only after the observable state is true.

Do not deploy or connect Supabase unless the corresponding gate is explicitly approved.

## Authority and Shared Files

Only `00 总控与集成` may modify:

- `STATUS.md`;
- `DECISIONS.md`;
- `AGENTS.md`, `PROJECT.md`, `FLOW.md`, `MODULES.md`, `DESIGN.md`;
- `.agents/skills/tada-control/**`;
- routes, shared contracts, global design tokens, dependencies, and build configuration.

Module tasks must stop and return a proposal if their result requires one of these changes.

## Parallelism Rules

Parallel work is allowed only when inputs are frozen, directories do not overlap, and each result can be reviewed independently. Limit simultaneous coding Worktrees to three.

Keep these sequential:

- gate approval and contract changes;
- shared route, type, token, dependency, and database schema changes;
- Worktree integration;
- static layout approval before formal motion;
- the first motion pilot before batch motion;
- local Sender → Receiver stability before Supabase;
- final deployment after unresolved QA or data issues.

## User Review vs Codex Self-Check

Ask the user to review product scope, flow, copy meaning, visual/IP fidelity, motion feeling, and go/no-go decisions.

Codex owns interface consistency, type safety, tests, build health, responsive basics, accessibility basics, URL validation, fallback behavior, performance checks, and merge-conflict inspection. Summarize those checks; do not turn them into unnecessary product questions.

## Task Completion Report

Every task returns this compact handoff:

```text
实际完成：
修改范围：
演示或验证：
未完成与风险：
共享契约是否变化：否 / 提案待总控审核
集成建议：
下一步唯一行动：
```

For user review, lead with the observable result and list only the decisions the user must make.

## Maintaining Project State

`STATUS.md` is the only live dashboard. Keep it to roughly one page and update it when a decision is approved, work actually starts or ends, a blocker becomes real, or the next action changes.

`DECISIONS.md` is the durable approval log. Add an entry only for an explicit user decision, include the reason and affected contracts, and never convert a proposal into an approved decision implicitly.

Do not copy detailed specifications into `STATUS.md`. Put durable scope in `PROJECT.md`, flows in `FLOW.md`, interfaces in `MODULES.md`, visual rules in `DESIGN.md`, and operating permissions in `AGENTS.md`.
