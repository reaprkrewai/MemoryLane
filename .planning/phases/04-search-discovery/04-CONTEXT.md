# Phase 4: Search & Discovery - Context

**Gathered:** 2026-04-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 4 delivers full-text search across all entry content using SQLite FTS5, composable multi-filter (date range, tags, moods), match highlighting, and an "On This Day" memory surfacing feature — all within the existing full-page view architecture established in Phase 3.

</domain>

<decisions>
## Implementation Decisions

### Search UI Architecture
- Search is a full-page view added to the existing viewStore routing (consistent with Phase 3 Timeline/Calendar swap pattern — sidebar "Search" nav item already exists as a no-op)
- Filters are always visible above search results when the search view is active (no hidden/collapsible filter panel)
- Search is live with 300ms debounce on each keystroke (consistent with TagAutocomplete pattern)
- "On This Day" is a collapsible banner section at the top of the Timeline view (not in Search) — appears only when past entries exist for today's calendar date

### Filter Controls
- Date range: two separate date pickers (start date + end date), reusing the existing DatePicker component
- Tag filter: clickable tag chips loaded from all existing tags — click to toggle selected/deselected (reuse TagPillReadOnly styling)
- Mood filter: 5 clickable mood pills (same emoji set as MoodSelector) with toggle behavior
- All filters compose simultaneously: keyword search + date range + tag filter + mood filter all apply together

### Search Results Display
- Matching text highlighted with amber/yellow `<mark>` background (matches #F59E0B accent color at low opacity, e.g., bg-accent/20)
- Reuse TimelineCard format with highlight injection (familiar to users; expand-in-place preserved)
- Results sorted date descending (most recent first — consistent with timeline behavior)
- Show all matching results (no pagination in search — user narrows with filters)

### On This Day
- Section appears only when past entries exist for today's calendar date in prior years (no empty-state clutter)
- Collapsible — users can hide/expand it; collapsed state persisted in uiStore
- Looks back across all available years (no cap — journaling is long-term)
- Shows all matching entries (typically one per year — no cap needed)

### Claude's Discretion
- FTS5 query construction (exact phrase, tokenization handling, snippet extraction)
- SearchView component internal layout and spacing
- SearchStore shape vs extending viewStore/entryStore
- Tag chip selection state management (local state vs store)
- Exact debounce implementation (useRef timer vs lodash)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/db.ts` — FTS5 virtual table `entries_fts` already created with insert/delete/update triggers; use `SELECT entries.* FROM entries JOIN entries_fts ON entries.rowid = entries_fts.rowid WHERE entries_fts MATCH ?`
- `src/components/DatePicker.tsx` — existing date picker component, reuse for date range start/end
- `src/components/TagPillReadOnly.tsx` — non-interactive tag pill; extend or clone for interactive toggle variant
- `src/components/MoodSelector.tsx` — existing mood emoji + label set; reuse emoji/label constants for mood filter pills
- `src/components/TimelineCard.tsx` — reuse with an optional `highlights` prop for mark injection
- `src/stores/viewStore.ts` — add "search" to `ActiveView` union; `setView("search")` already handled by `handleNavClick` in Sidebar (currently no-op for "search")
- `src/stores/uiStore.ts` — persist On This Day collapsed state here (consistent with how other UI prefs are stored)

### Established Patterns
- Zustand flat slice pattern (`create<State>((set, get) => ({...}))`) — follow for any new searchStore
- `useEntryStore`, `useViewStore`, `useTagStore` all use same import pattern
- DB queries use `db.select<T[]>(sql, params)` directly
- Sidebar nav click → `setView(id)` → `JournalView` renders the appropriate view component
- All stores loaded via `get-shit-done` tools; no SSR/hydration concerns (Tauri desktop app)

### Integration Points
- `src/components/Sidebar.tsx` — `handleNavClick("search")` currently does nothing; change to `setView("search")`
- `src/components/JournalView.tsx` — add `if (activeView === "search") return <SearchView />;`
- `src/stores/viewStore.ts` — add `"search"` to `ActiveView` type union
- `src/components/TimelineView.tsx` — add On This Day collapsible banner at the top of the scrollable body

</code_context>

<specifics>
## Specific Ideas

No specific requirements — all implementation decisions captured in the Decisions section above. Open to standard approaches for FTS5 highlighting (snippet extraction or client-side mark injection).

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>
