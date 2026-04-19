---
phase: 04-search-discovery
plan: 01
subsystem: search
tags: [zustand, sqlite, fts5, routing, store]
dependency_graph:
  requires: []
  provides:
    - useSearchStore (src/stores/searchStore.ts)
    - ActiveView 'search' union member (src/stores/viewStore.ts)
    - onThisDayCollapsed state (src/stores/uiStore.ts)
    - Search nav routing in Sidebar
    - SearchView routing guard in JournalView
    - SearchView stub (src/components/SearchView.tsx)
  affects:
    - src/stores/viewStore.ts
    - src/stores/uiStore.ts
    - src/components/Sidebar.tsx
    - src/components/JournalView.tsx
tech_stack:
  added: []
  patterns:
    - Zustand flat slice (follows entryStore.ts pattern)
    - Composable SQL WHERE construction (FTS5 JOIN path + filter-only path)
    - Phrase-wrapped FTS5 MATCH input (prevents parse errors on special chars)
    - AND-semantics tag filter with HAVING COUNT(DISTINCT tag_id)
key_files:
  created:
    - src/stores/searchStore.ts
    - src/components/SearchView.tsx
  modified:
    - src/stores/viewStore.ts
    - src/stores/uiStore.ts
    - src/components/Sidebar.tsx
    - src/components/JournalView.tsx
decisions:
  - Phrase-wrap FTS5 MATCH input: wraps query in double quotes to treat as phrase search, preventing SQLite parse errors on special characters like '(', ')', '-', '*'
  - endDate includes full day via endDate + 86400000ms: correct for day-boundary date range filters where endDate is start of day epoch
  - Empty filter state returns no results (not all entries): consistent with search UX pattern — show results only after user interacts
  - SearchView stub intentional: Plan 02 implements the full UI; stub allows JournalView to compile and route correctly in Wave 1
metrics:
  duration: "99 seconds"
  completed: "2026-04-11T22:13:39Z"
  tasks: 2
  files: 6
---

# Phase 04 Plan 01: Search Data Layer & Routing Wires Summary

**One-liner:** Zustand searchStore with FTS5 composable runSearch + viewStore/uiStore/Sidebar/JournalView wired for search navigation.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create searchStore.ts with full search state and runSearch logic | 2434203 | src/stores/searchStore.ts |
| 2 | Wire viewStore + uiStore + Sidebar + JournalView for search routing | fe8e616 | src/stores/viewStore.ts, src/stores/uiStore.ts, src/components/Sidebar.tsx, src/components/SearchView.tsx, src/components/JournalView.tsx |

## What Was Built

### searchStore.ts
Full Zustand flat slice following the exact `entryStore.ts` pattern:
- 8 state fields: `query`, `startDate`, `endDate`, `selectedTagIds`, `selectedMoods`, `results`, `isSearching`
- 8 actions: `setQuery`, `setStartDate`, `setEndDate`, `toggleTag`, `toggleMood`, `resetSearch`, `runSearch`
- `runSearch` builds composable SQL dynamically: uses FTS5 JOIN path (`entries e JOIN entries_fts ON e.rowid = entries_fts.rowid`) when keyword present, falls back to direct `entries e` query for filters-only
- FTS5 MATCH input phrase-wrapped to prevent parse errors on special characters
- AND-semantics tag filter: `HAVING COUNT(DISTINCT tag_id) = ?`
- Full-day end date inclusion: `endDate + 86400000` milliseconds
- Empty state returns no results until at least one filter is active

### viewStore.ts
`ActiveView` union extended: `"timeline" | "editor" | "calendar" | "search"` — TypeScript now accepts `setView("search")` call.

### uiStore.ts
Added `onThisDayCollapsed: boolean` + `setOnThisDayCollapsed: (v: boolean) => void` — Plan 03 (OnThisDay component) will use this to persist collapsed state.

### Sidebar.tsx
- `handleNavClick` routes `id === "search"` to `setView("search")`
- `activeId` computation includes `activeView === "search" ? "search" : ...` so the Search nav item highlights correctly

### SearchView.tsx (stub)
Minimal placeholder component that renders a "Search coming soon..." message. Allows JournalView to compile and route correctly. Plan 02 replaces this with the full implementation.

### JournalView.tsx
Import `SearchView` added; routing guard `if (activeView === "search") return <SearchView />;` inserted before calendar guard — correct priority order: search, calendar, editor, timeline.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

**SearchView.tsx** — intentional stub, full implementation deferred to Plan 02. The stub renders a placeholder message. This is expected: the plan's goal is to establish routing wires, not the full UI. Plan 02 (Wave 2) will replace this stub with the complete SearchView including SearchFilterBar and result cards.

## Self-Check: PASSED

Files exist:
- src/stores/searchStore.ts — FOUND
- src/stores/viewStore.ts — FOUND (modified)
- src/stores/uiStore.ts — FOUND (modified)
- src/components/Sidebar.tsx — FOUND (modified)
- src/components/SearchView.tsx — FOUND
- src/components/JournalView.tsx — FOUND (modified)

Commits:
- 2434203 — feat(04-01): create searchStore with full search state and composable runSearch — FOUND
- fe8e616 — feat(04-01): wire search routing across viewStore, uiStore, Sidebar, JournalView — FOUND

TypeScript: `npx tsc --noEmit` exits 0 — PASSED
