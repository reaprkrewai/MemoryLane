---
plan: 03-01
phase: 03-timeline-calendar
status: complete
completed: 2026-04-11
self_check: PASSED
---

# 03-01: Foundation — View Routing, Pagination, Back Button

## Objective
Lay the foundation for Phase 3 by introducing view routing, keyset pagination, and the editor Back button. Plans 02 and 03 depend on this foundation.

## What Was Built

### New Files
- **src/stores/viewStore.ts** — Zustand slice for view routing: `activeView` (timeline/editor/calendar), `navigateSource`, `dateFilter`, `timelineScrollY`, and setters
- **src/lib/stripMarkdown.ts** — `stripMarkdown()` regex chain for plain-text previews; `truncatePreview()` 150-char truncation utility
- **src/components/TimelineView.tsx** — Stub (full implementation in Plan 02)
- **src/components/CalendarView.tsx** — Stub (full implementation in Plan 03)

### Modified Files
- **src/stores/entryStore.ts** — Extended with keyset pagination: `allEntries`, `hasMore`, `isLoadingPage`, `pageSize`, `loadPage(cursor?)`, `resetPagination()`, `prependToTimeline()`. createEntry/saveContent/updateMood/deleteEntry/updateCreatedAt all mirror into `allEntries`
- **src/components/JournalView.tsx** — Refactored from entry creator into view router (timeline → editor → calendar). Calls `loadPage()` on mount; no longer calls `ensureFirstEntry()`
- **src/components/Sidebar.tsx** — Nav items wired through `useViewStore.setView`; active highlight derived from `activeView`; compact EntryList only visible when `activeView === 'editor'`
- **src/components/EntryList.tsx** — Sidebar clicks call `navigateToEditor("sidebar")` to set navigateSource
- **src/components/MetadataBar.tsx** — Back to Journal button rendered in left zone when `navigateSource === 'timeline'`

## Key Decisions
- `allEntries` accumulator is parallel to existing `entries` array (sidebar list must remain intact)
- `ensureFirstEntry()` removed from JournalView mount — empty state now handled by TimelineView
- `showEntryList` in Sidebar derived from `activeView === 'editor'`

## Deviations
- Stub files `TimelineView.tsx` and `CalendarView.tsx` were created in a follow-up commit after the initial executor run was interrupted by a rate limit

## Self-Check Results
- `npx tsc --noEmit` ✓
- `npm run build` ✓ (build passes with expected chunk size warning)

## key-files
created:
  - src/stores/viewStore.ts
  - src/lib/stripMarkdown.ts
  - src/components/TimelineView.tsx
  - src/components/CalendarView.tsx
modified:
  - src/stores/entryStore.ts
  - src/components/JournalView.tsx
  - src/components/Sidebar.tsx
  - src/components/EntryList.tsx
  - src/components/MetadataBar.tsx
