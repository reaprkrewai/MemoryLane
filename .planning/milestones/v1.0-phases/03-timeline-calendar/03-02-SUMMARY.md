---
plan: 03-02
phase: 03-timeline-calendar
status: complete
completed: 2026-04-11
self_check: PASSED

subsystem: timeline-view
tags: [timeline, pagination, infinite-scroll, day-grouping, expand-collapse, tags]

dependency_graph:
  requires:
    - 03-01  # viewStore, entryStore pagination, stripMarkdown
  provides:
    - TimelineView (full implementation)
    - TimelineCard
    - DaySeparator
    - TagPillReadOnly
  affects:
    - src/components/TimelineView.tsx
    - src/components/TimelineCard.tsx
    - src/components/DaySeparator.tsx
    - src/components/TagPillReadOnly.tsx

tech_stack:
  added: []
  patterns:
    - IntersectionObserver for infinite scroll (sentinel div)
    - Keyset pagination via created_at cursor
    - Batch SQL join for tag fetch (N+1 avoidance)
    - Single-expand-at-a-time model (expandedEntryId state)
    - Read-only TipTap editor per expanded card (useEditor reset on [expanded])
    - Scroll position preservation via viewStore.timelineScrollY

key_files:
  created:
    - src/components/TagPillReadOnly.tsx
    - src/components/DaySeparator.tsx
    - src/components/TimelineCard.tsx
    - src/components/TimelineView.tsx
  modified: []

decisions:
  - Non-interactive TagPillReadOnly created separately from interactive TagPill to avoid Popover side effects on timeline cards
  - Read-only TipTap editor instance created per expanded card (useEditor with [expanded] dep) — editor is destroyed and recreated when card toggles
  - data-expand-control attribute on expand button and Collapse link for click delegation (prevents card navigation when interacting with expand controls)
  - Batch tag fetch via single SQL JOIN query on allEntries change — avoids N+1 DB calls per card

metrics:
  duration: ~25 minutes
  completed: 2026-04-11
  tasks: 2
  files_created: 4
  files_modified: 0
---

# Phase 3 Plan 02: Timeline View Implementation Summary

## One-liner
Full infinite-scroll timeline with mood dots, day separators, 150-char previews, expand-in-place Markdown render, and batch tag fetch via SQL JOIN.

## What Was Built

### New Files

- **src/components/TagPillReadOnly.tsx** — Non-interactive tag pill with `color-mix` CSS for background/border. No Popover, no remove button. Visually identical to TagPill but safe for timeline card density.

- **src/components/DaySeparator.tsx** — Full-width row with weekday + date label (`"Wednesday, Apr 9"`) and `<hr>` extending to right edge. 12px vertical margin (`my-3`) for reading rhythm.

- **src/components/TimelineCard.tsx** — Entry card with:
  - 8px mood dot (amber/emerald/stone/orange/rose per mood or hidden)
  - Date formatted as `"Apr 9, 2026"` + word count `"142w"` in meta row
  - 150-char plain-text preview via `stripMarkdown` + `truncatePreview`
  - Up to 3 `TagPillReadOnly` pills + `+N` overflow label
  - ChevronDown/ChevronUp expand toggle
  - Expanded state: read-only TipTap editor with `@tiptap/markdown`, "Collapse" link
  - `data-expand-control` attribute for click delegation (card click opens editor; expand controls don't)

- **src/components/TimelineView.tsx** — Full timeline container replacing Plan 01 stub:
  - Sticky header: "Journal" heading + amber "+ New Entry" button
  - `IntersectionObserver` on sentinel div (200px rootMargin) triggers `loadPage(cursor)` for infinite scroll
  - Day-grouped entries: `DaySeparator` + list of `TimelineCard` per group
  - Batch tag fetch: single SQL `JOIN` query on `allEntries` change (no N+1)
  - Single-expand model: `expandedEntryId` state, only one card expanded at a time
  - Scroll restoration: `timelineScrollY` from viewStore restored on mount
  - `dateFilter` integration: filtered-empty state with "Nothing here yet" + Clear affordance
  - `EmptyState` for all-empty (no dateFilter) case
  - `Loader2` spinner below last card while loading

## Success Criteria Met

- TIME-01: Reverse-chronological timeline renders from `allEntries` — YES
- TIME-02: Keyset pagination via `created_at` cursor — YES
- TIME-03: IntersectionObserver sentinel triggers next page — YES
- TIME-04: Cards show date, mood dot, tags (max 3 + overflow), word count, 150-char preview — YES
- TIME-05: Expand chevron reveals full read-only Markdown inline; single-expand enforced — YES
- TIME-06: DaySeparator rendered between calendar day groups — YES
- TIME-07: Card click opens editor with `navigateSource='timeline'` — YES
- Empty states: both all-empty (EmptyState) and filtered-empty (custom copy with Clear) — YES
- TypeScript + Vite build pass — YES

## Deviations from Plan

None — plan executed exactly as written, with one minor correction:

**Import path fix (Rule 1 — Bug):**
- Plan template used `@tiptap/extension-markdown` (doesn't exist)
- Corrected to `@tiptap/markdown` (matches EntryEditor.tsx and package.json)
- Fixed before first TypeScript check, no separate commit needed

## Known Stubs

None. All TimelineView functionality is wired to live store data (`allEntries`, `loadPage`, `createEntry`, `selectEntry`, `navigateToEditor`). Tag data is live from SQLite JOIN.

## Self-Check

### Files Exist
- src/components/TagPillReadOnly.tsx — FOUND
- src/components/DaySeparator.tsx — FOUND
- src/components/TimelineCard.tsx — FOUND
- src/components/TimelineView.tsx — FOUND

### Commits Exist
- edd51a6: feat(03-02): create TagPillReadOnly, DaySeparator, TimelineCard — FOUND
- 847c04d: feat(03-02): implement TimelineView — FOUND

## Self-Check: PASSED
