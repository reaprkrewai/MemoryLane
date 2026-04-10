---
phase: 02-editor-tags
plan: "02"
subsystem: editor
tags: [metadata-bar, mood-selector, date-picker, auto-save, debounce]
dependency_graph:
  requires: ["02-01"]
  provides: ["MetadataBar", "MoodSelector", "DatePicker", "scheduleAutoSave", "flushAndClearTimers"]
  affects: ["EntryEditor", "entryStore"]
tech_stack:
  added: []
  patterns: ["debounced auto-save with module-level timer state", "Zustand store with non-serializable timer refs", "TipTap editor.on('update') for live counts"]
key_files:
  created:
    - src/components/MoodSelector.tsx
    - src/components/DatePicker.tsx
    - src/components/MetadataBar.tsx
  modified:
    - src/stores/entryStore.ts
    - src/components/EntryEditor.tsx
decisions:
  - "Timer state (_debounceTimer, _intervalTimer, _pendingSave, _autoSaveInterval) stored as module-level variables outside Zustand — timers are not serializable and should not be in store state"
  - "selectEntry flushes pending saves before switching to prevent cross-entry data corruption"
  - "Auto-save uses 500ms debounce (per-keystroke reset) + configurable interval flush (default 5s from settings table)"
  - "MetadataBar uses editor.on('update') listener + local state tick to force re-render for live word/char count"
  - "Saved indicator replaces word/char count for 1500ms then reverts — no persistent status UI"
metrics:
  duration: "~10 minutes"
  completed_date: "2026-04-10"
  tasks_completed: 2
  files_changed: 5
requirements_shipped: [EDIT-04, EDIT-05, EDIT-07, EDIT-08]
---

# Phase 2 Plan 02: Metadata Bar & Auto-Save Summary

**One-liner:** MetadataBar with shadcn Popover date picker, 5-icon mood selector with amber highlight, live word/char count, and 500ms debounced auto-save with 5s interval flush using module-level timers in Zustand.

## What Was Built

**MoodSelector** (`src/components/MoodSelector.tsx`): Five lucide icon buttons (Laugh, Smile, Meh, Frown, Angry) in a flex row. Selected mood shows amber icon + `bg-amber-50` tint. Toggle behavior: clicking selected mood deselects it. Tooltip on each button (500ms delay). 36×36px touch targets.

**DatePicker** (`src/components/DatePicker.tsx`): Clickable date text formatted as "Wednesday, Apr 9". Opens shadcn Popover with Calendar (react-day-picker) for date selection and a time input below. Combines selected date + time into a single timestamp on change.

**MetadataBar** (`src/components/MetadataBar.tsx`): 48px header bar with three zones — DatePicker (left), MoodSelector (center), word/char count (right). "Saved" indicator replaces counts for 1500ms after each save using `useEffect` watching `lastSavedAt`. Live counts via `editor.on('update')` listener.

**Auto-save in entryStore** (`src/stores/entryStore.ts`): `scheduleAutoSave` method with 500ms debounce timer (reset per keystroke) and configurable interval flush (default 5s from `settings.autosave_interval`). Module-level timer vars (`_debounceTimer`, `_intervalTimer`, `_pendingSave`, `_autoSaveInterval`) avoid Zustand serialization issues. `flushAndClearTimers` prevents cross-entry data corruption on entry switch. `loadAutoSaveInterval` reads interval from SQLite settings. `updateAutoSaveInterval` persists new value and resets active timer.

**EntryEditor** (`src/components/EntryEditor.tsx`): Replaced direct `saveContent` call with `scheduleAutoSave`. MetadataBar rendered above editor content area. Temporary word/char count display removed (lives in MetadataBar). Auto-save interval loaded on mount. Timers flushed on unmount.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create MoodSelector, DatePicker, MetadataBar | d22e3d0 | src/components/MoodSelector.tsx, DatePicker.tsx, MetadataBar.tsx (created) |
| 2 | Implement auto-save and wire MetadataBar | 1a0c2d0 | src/stores/entryStore.ts, src/components/EntryEditor.tsx (modified) |

## Decisions Made

- **Timer state as module-level vars:** Zustand state must be serializable. `setTimeout`/`setInterval` handles are not — stored as module-level variables alongside the store definition. This is the standard Zustand pattern for non-serializable side effects.
- **selectEntry flushes before switching:** Prevents scenario where user types in Entry A, immediately clicks Entry B, and the debounced save fires with Entry A content but Entry B's ID.
- **500ms debounce + 5s interval flush:** Debounce covers normal typing pace (user pauses between words). Interval flush covers fast/continuous typing where the debounce would delay too long. Both fire `saveContent` — no duplicate saves if debounce fires within interval window (pending is cleared after each save).
- **Saved indicator over counts:** Brief replacement is less visually disruptive than an overlay or toast. 1500ms gives user time to notice without interfering with writing.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all data is wired to the store and SQLite backend. No placeholder values flow to UI rendering.

## Verification

- `npx tsc --noEmit`: EXIT 0 (zero errors)
- `npm run build`: EXIT 0 (builds successfully)

## Self-Check: PASSED

Files exist:
- FOUND: src/components/MoodSelector.tsx
- FOUND: src/components/DatePicker.tsx
- FOUND: src/components/MetadataBar.tsx

Commits exist:
- d22e3d0: feat(02-02): create MoodSelector, DatePicker, and MetadataBar components
- 1a0c2d0: feat(02-02): implement debounced auto-save and wire MetadataBar into EntryEditor
