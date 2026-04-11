---
phase: 03-timeline-calendar
plan: 03
subsystem: calendar
tags: [calendar, heatmap, navigation, date-filter, sqlite]
dependency_graph:
  requires: [03-01, 03-02]
  provides: [calendar-view, calendar-cell, heatmap-intensity]
  affects: [JournalView, viewStore, TimelineView]
tech_stack:
  added: []
  patterns: [localtime-sql-aggregate, date-fns-grid-generation, css-grid-7-col, heatmap-intensity-classes]
key_files:
  created:
    - src/components/CalendarCell.tsx
  modified:
    - src/components/CalendarView.tsx
decisions:
  - CalendarCell disabled (not aria-disabled) for zero-count days — native button disabled prevents click and removes from tab order
  - toLocalYmd() helper avoids date-fns format() for YMD to stay free of locale edge cases
  - isSelected prop wired but always false — future plan can wire dateFilter selector to highlight the active day
metrics:
  duration: 8m
  completed: "2026-04-11"
  tasks_completed: 2
  tasks_total: 2
  files_created: 1
  files_modified: 1
---

# Phase 3 Plan 3: CalendarView Heatmap Summary

Monthly calendar heatmap with 4 intensity levels, prev/next navigation, Today button, and date-filter integration via viewStore click-through to timeline.

## What Was Built

**CalendarCell** (`src/components/CalendarCell.tsx`) — Single day cell component with:
- 4 heatmap intensity levels: empty surface/border, whisper amber (1 entry), accent/30 (2-3 entries), accent/60 (4+)
- Today circle: `bg-accent/20` rounded-full behind the day number
- Selected state: `ring-2 ring-accent`
- Out-of-month: dimmed `text-muted/40`, `aria-hidden`, not clickable
- Zero-count days: disabled button with "No entries on this day" tooltip

**CalendarView** (`src/components/CalendarView.tsx`) — Full monthly calendar container replacing the Plan 01 stub:
- 7-column CSS grid (Sun-Sat labels + day cells)
- SQL aggregate using `date(created_at / 1000, 'unixepoch', 'localtime')` to group by local calendar day (both WHERE clauses and projection use localtime to avoid off-by-one bugs in non-UTC timezones)
- Month navigation: ChevronLeft/ChevronRight with `subMonths`/`addMonths`
- Today button resets `currentMonth` to `new Date()`
- Leading/trailing cells from adjacent months fill the grid and render dimmed/non-clickable
- Cell click: `setDateFilter(ymd)` + `setView("timeline")` — integrates with Plan 02 timeline dateFilter
- `max-w-[640px]` layout container per UI-SPEC

## Verification

- `npx tsc --noEmit` exits 0
- `npm run build` exits 0 (pre-existing chunk-size and dynamic-import warnings, not caused by this plan)

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

- `isSelected` prop on CalendarCell is always `false` — the prop exists and the ring-2 ring-accent class is wired, but no plan currently reads `dateFilter` from viewStore to set the selected cell. This is intentional for this plan; a future plan can add `const dateFilter = useViewStore(s => s.dateFilter)` and pass `isSelected={dateFilter === ymd}` per cell.

## Self-Check: PASSED

- FOUND: src/components/CalendarCell.tsx
- FOUND: src/components/CalendarView.tsx
- FOUND commit 3c8d635: feat(03-03): create CalendarCell
- FOUND commit e036484: feat(03-03): replace CalendarView stub
