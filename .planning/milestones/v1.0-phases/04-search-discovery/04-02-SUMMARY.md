---
phase: 04-search-discovery
plan: 02
subsystem: search
tags: [react, zustand, fts5, highlight, debounce, date-picker, mood-filter, tag-filter]
dependency_graph:
  requires:
    - useSearchStore (04-01)
    - SearchView stub (04-01)
    - TagPillReadOnly (03-02)
    - DatePicker (phase-02)
    - TimelineCard (03-02)
  provides:
    - SearchView full implementation (src/components/SearchView.tsx)
    - SearchFilterBar (src/components/SearchFilterBar.tsx)
    - TimelineCard searchQuery prop + injectHighlights (src/components/TimelineCard.tsx)
  affects:
    - src/components/SearchView.tsx
    - src/components/SearchFilterBar.tsx
    - src/components/TimelineCard.tsx
tech_stack:
  added: []
  patterns:
    - useRef debounce timer (300ms) for keyword input
    - Nullable DatePicker adapter (placeholder button when null, DatePicker when set)
    - Batch tag fetch via single SQL JOIN on results change (N+1 avoidance)
    - Client-side highlight injection via regex split + React mark elements
    - color-mix CSS for tag chip selected/unselected states
key_files:
  created:
    - src/components/SearchFilterBar.tsx
  modified:
    - src/components/SearchView.tsx
    - src/components/TimelineCard.tsx
decisions:
  - Use native HTML input instead of shadcn Input component — ui/input.tsx does not exist in this project; native input with Tailwind classes matches existing pattern (TagInput.tsx)
  - color-mix used directly in inline style for tag chips — consistent with TagPillReadOnly.tsx approach
  - React import added explicitly to TimelineCard for ReactNode return type from injectHighlights
metrics:
  duration: "169 seconds"
  completed: "2026-04-11T22:18:25Z"
  tasks: 2
  files: 3
---

# Phase 04 Plan 02: SearchView, SearchFilterBar, and Highlight Injection Summary

**One-liner:** Full SearchView page with 300ms-debounced keyword input, date/tag/mood filters, result cards with client-side highlight injection via injectHighlights + mark elements.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add searchQuery prop and injectHighlights to TimelineCard | c5046f6 | src/components/TimelineCard.tsx |
| 2 | Build SearchFilterBar and SearchView full implementation | 469674b | src/components/SearchFilterBar.tsx, src/components/SearchView.tsx |

## What Was Built

### TimelineCard.tsx (modified)
- Added optional `searchQuery?: string` prop to `TimelineCardProps`
- Added `injectHighlights(text, query)` helper function above component: splits preview text on query terms using regex, wraps matches in `<mark className="bg-accent/20 rounded-[2px] px-[2px]">`
- Preview `<p>` element conditionally uses `injectHighlights` when `searchQuery` is provided
- Fully backward compatible — all existing TimelineView.tsx usages unchanged (optional prop)

### SearchFilterBar.tsx (created)
Full filter panel component wired to `useSearchStore`:
- **Keyword input**: native `<input>` with `Search` icon left, `X` clear icon right (when value present), `aria-label="Clear search"`, 300ms `useRef` debounce timer
- **Date range**: nullable adapter pattern — placeholder button ("Start date" / "End date") when null, `<DatePicker>` + `×` clear button when date is set. End date < start date clears start date silently (per UI-SPEC)
- **Tag chips**: `useTagStore` loaded on mount, toggle behavior, `color-mix` CSS for unselected/selected states (25% vs 15% color blend, full color vs 40% border)
- **Mood pills**: locally-defined `MOODS` array, toggle behavior, `bg-accent/15 border-accent/50` selected state
- All filter changes call `void runSearch()` immediately (except keyword which debounces)

### SearchView.tsx (full implementation replacing stub)
- **Sticky header**: "Search" title + conditional "Clear all" button (appears only when `hasActiveFilters`)
- **`hasActiveFilters`**: computed from query, startDate, endDate, selectedTagIds, selectedMoods
- **SearchFilterBar**: rendered at top of body
- **Result count**: shown above results when `results.length > 0`
- **Results list**: `TimelineCard` per result with `searchQuery={query}` prop, local `expandedId` state, batch tag fetch via SQL JOIN on `results` change
- **`onOpen`**: calls `selectEntry(id).then(() => navigateToEditor("timeline"))`
- **Pre-search state**: Search icon + "Search your journal" + "Type a keyword or use the filters above."
- **No-results state**: Search icon + "No entries found" + "Try different keywords or fewer filters."

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking Issue] shadcn Input component not found**
- **Found during:** Task 2
- **Issue:** Plan specified `import { Input } from "./ui/input"` but `src/components/ui/input.tsx` does not exist in this project (only button.tsx, calendar.tsx, popover.tsx, tooltip.tsx, alert-dialog.tsx are present)
- **Fix:** Replaced with native `<input>` element styled with Tailwind classes, matching the existing pattern in `TagInput.tsx`. Behavior and visual output identical.
- **Files modified:** src/components/SearchFilterBar.tsx
- **Commit:** 469674b (included in Task 2 commit)

## Known Stubs

None — all components are fully implemented with live data from searchStore/tagStore.

## Self-Check: PASSED

Files exist:
- src/components/TimelineCard.tsx — FOUND (modified)
- src/components/SearchFilterBar.tsx — FOUND (created)
- src/components/SearchView.tsx — FOUND (full implementation)

Commits:
- c5046f6 — feat(04-02): add searchQuery prop and injectHighlights to TimelineCard — FOUND
- 469674b — feat(04-02): implement SearchFilterBar and full SearchView with highlight injection — FOUND

TypeScript: `npx tsc --noEmit` exits 0 — PASSED
