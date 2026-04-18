---
phase: 08-home-dashboard-widgets
plan: "01"
subsystem: store+lib
tags: [dashboard, store, zustand, derived-state, static-data]
dependency_graph:
  requires: [07-FOUND-01, 07-FOUND-02]
  provides: [entriesThisMonth-primitive, writing-prompts-library]
  affects: [src/stores/entryStore.ts, src/lib/writingPrompts.ts]
tech_stack:
  added: []
  patterns: [derived-primitive-selector, readonly-const-array]
key_files:
  modified:
    - src/stores/entryStore.ts
  created:
    - src/lib/writingPrompts.ts
decisions:
  - "entriesThisMonth wired to stats.thisMonth at exactly 3 call sites (D-09)"
  - "saveContent and updateMood untouched per D-05 contract"
  - "60 flat prompts as readonly string[] with as const per D-12"
metrics:
  duration_minutes: 12
  completed: "2026-04-18"
  tasks_completed: 2
  files_changed: 2
requirements: [DASH-02, DASH-10]
---

# Phase 08 Plan 01: Foundation Data Primitives Summary

**One-liner:** `entriesThisMonth` derived store primitive wired to `getEntryStats().thisMonth` at 3 call sites; 60-prompt flat `readonly string[]` library shipped as `src/lib/writingPrompts.ts`.

## Tasks Completed

| # | Name | Commit | Key Files |
|---|------|--------|-----------|
| 1 | Add entriesThisMonth derived primitive to entryStore | 75b5483 | src/stores/entryStore.ts |
| 2 | Create writing prompts library (60 prompts) | 5a271bc | src/lib/writingPrompts.ts |

## Fields Added to entryStore

| Field | Line | Type | Description |
|-------|------|------|-------------|
| Interface declaration | 46 | `entriesThisMonth: number;` | FOUND-01 extension per D-09 |
| Initial value | 126 | `entriesThisMonth: 0,` | Zero before first loadPage |
| createEntry set block | 169 | `entriesThisMonth: stats.thisMonth,` | Refresh site 1 |
| deleteEntry set block | 188 | `entriesThisMonth: statsDel.thisMonth,` | Refresh site 2 |
| loadPage set block | 313 | `entriesThisMonth: statsPage.thisMonth,` | Refresh site 3 |

**Total `entriesThisMonth` occurrences:** 5 (1 interface + 1 initial + 3 set-blocks)

## getEntryStats Call Site Count

`grep -n "getEntryStats(" src/stores/entryStore.ts` returns 4 lines — but line 258 is a **comment** (`// skip getEntryStats() to avoid`), not a call. Actual call sites: **exactly 3** (lines 164, 183, 308). B-02 invariant preserved. No new call sites added.

Note: The plan's verification command `grep -c "getEntryStats(" src/stores/entryStore.ts` returns 4 due to the pre-existing comment at line 258 (inside `updateMood`'s explanatory comment). This comment existed before Phase 8. The B-02 invariant — no new `getEntryStats()` calls — is fully satisfied.

## D-05 Contract Verification

- `saveContent` (lines 194-234): `entriesThisMonth` absent — PASS
- `updateMood` (lines 236-261): `entriesThisMonth` absent — PASS

## Writing Prompts Library

| Metric | Value |
|--------|-------|
| Total prompts | 60 |
| Unique prompts | 60 (all distinct) |
| Empty strings | 0 |
| Max prompt length | 66 chars ("Describe the last time you laughed until your stomach hurt.") |
| Themes (documentation only) | reflection (12), gratitude (12), memory (12), goals (12), struggles (12) |
| Export shape | `export const PROMPTS: readonly string[] = [...] as const; export default PROMPTS;` |

## Deviations from Plan

None — plan executed exactly as written. All acceptance criteria met.

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes introduced. Both files are:
- `entryStore.ts`: extends existing store with a read-only derived field wired to an existing SQL aggregate
- `writingPrompts.ts`: compile-time static literals — no runtime input, no I/O

T-08-01-03 mitigated: D-05 contract enforced — `saveContent` and `updateMood` do not call `getEntryStats()`. Verified by grep.

## Self-Check: PASSED

- `src/stores/entryStore.ts` exists and modified: FOUND
- `src/lib/writingPrompts.ts` exists and created: FOUND
- Commit 75b5483 (Task 1) exists: FOUND
- Commit 5a271bc (Task 2) exists: FOUND
- `npx tsc --noEmit` exits 0: PASSED
- `entriesThisMonth` on 5 lines: PASSED (count=5)
- 3 refresh sites: PASSED
- 60 prompt entries: PASSED
- saveContent D-05 check: PASSED (0 matches)
- updateMood D-05 check: PASSED (0 matches)
