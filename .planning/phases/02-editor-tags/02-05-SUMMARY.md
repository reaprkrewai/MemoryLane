---
phase: 02-editor-tags
plan: "05"
subsystem: editor
tags: [autosave, settings, metadata-bar, ui]
dependency_graph:
  requires: []
  provides: [EDIT-05]
  affects: [MetadataBar, entryStore]
tech_stack:
  added: []
  patterns: [native-select-inline-control, dynamic-import-getDb]
key_files:
  modified:
    - src/components/MetadataBar.tsx
decisions:
  - "Native <select> used over shadcn Select — zero new imports, no popover overlap risk, fits in 48px MetadataBar height"
  - "Dynamic import of getDb in useEffect — avoids adding a static import for a one-time mount read"
metrics:
  duration: "5m"
  completed_date: "2026-04-10"
  tasks_completed: 1
  tasks_total: 1
  files_changed: 1
---

# Phase 2 Plan 5: Auto-Save Interval Selector Summary

## One-Liner

Native `<select>` in MetadataBar right zone with Save 5s / 10s / 30s options, persisting choice to `settings` table and resetting the live interval timer via `updateAutoSaveInterval`.

## What Was Built

Added a minimal auto-save interval selector to the MetadataBar right zone (EDIT-05 gap closure). The selector renders as a native `<select>` placed after the word/char count with a middot separator. On mount it reads the persisted interval from the `settings` table. On change it calls `updateAutoSaveInterval(ms)` which writes to `settings` and resets the live `_intervalTimer`.

## Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add auto-save interval selector to MetadataBar right zone | 8cb6264 | src/components/MetadataBar.tsx |

## Decisions Made

1. **Native `<select>` not shadcn Select** — A shadcn `Select` opens a popover that could overlap the editor in the 48px MetadataBar. The native `<select>` with `bg-transparent border-none` blends into the bar visually and requires no new imports.

2. **Dynamic `getDb` import in useEffect** — The mount effect reads the persisted interval directly from the DB. A dynamic `import("../lib/db")` keeps the static import list unchanged and makes the intent (one-time read on mount) explicit.

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED

- [x] `src/components/MetadataBar.tsx` exists and modified
- [x] Commit 8cb6264 exists
- [x] TypeScript compiles with no errors
- [x] All acceptance criteria strings present in file
