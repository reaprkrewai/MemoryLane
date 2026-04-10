# Phase 3: Timeline & Calendar - Context

**Gathered:** 2026-04-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can browse every entry they have ever written via two surfaces:
1. **Timeline** — infinite-scroll list of entries in reverse-chronological order, accessible via the "Journal" nav item
2. **Calendar** — monthly heatmap showing entry counts per day, accessible via the "Calendar" nav item

Clicking a calendar date filters the timeline to that day. Clicking an entry in the timeline either expands it inline or opens it in the editor.

This phase does NOT include search/filtering by keyword, tags, or mood (Phase 4), or On This Day (Phase 4).

</domain>

<decisions>
## Implementation Decisions

### App Layout & View Routing
- **D-01:** Timeline IS the Journal view. Clicking "Journal" in the sidebar shows the full-width timeline as the main content — the sidebar compact entry list (Phase 2) is superseded. Clicking "Calendar" shows the full calendar view.
- **D-02:** Clicking an entry in the timeline navigates to the editor (TIME-07). The editor gains a "← Back" button (in the MetadataBar or TitleBar area) to return to the timeline.
- **D-03:** "New Entry" button lives in the timeline header row — a persistent button at the top of the timeline view (not a FAB, not in the sidebar).
- **D-04:** Calendar view is full main content when "Calendar" nav is active — the calendar is large and scannable. Clicking a date on the calendar filters the timeline (navigates to Journal view, filtered to that date).

### Timeline Card Design
- **D-05:** Entry card preview shows plain text (Markdown stripped) truncated at 150 characters with an ellipsis. No Markdown rendering in the preview.
- **D-06:** Expand inline (TIME-05): clicking an "Expand" control on a card reveals the full entry rendered as Markdown (read-only) in-place within the timeline. A "Collapse" button hides it again. No navigation.
- **D-07:** Day separators (TIME-06): a full-width row with the date label on the left ("Wednesday, Apr 9") and a thin horizontal rule extending to the right. Appears between entries from different calendar days.

### Calendar Heatmap
- **D-08:** Implemented as a custom plain CSS grid (7 columns for days of week). No third-party calendar library.
- **D-09:** 4 intensity levels using amber: 0 entries = faint bg/border; 1 entry = amber/10; 2–3 entries = amber/30; 4+ entries = amber/60.
- **D-10:** Calendar occupies the full main content area when the "Calendar" nav item is active.

### Infinite Scroll
- **D-11:** IntersectionObserver + sentinel div at the bottom of the list. When the sentinel enters the viewport, load the next page of 20 entries (keyset pagination, no OFFSET).
- **D-12:** Loading state: subtle centered spinner below the last card while fetching the next page. Disappears when entries arrive.

### Claude's Discretion
- Exact visual treatment of the entry card (border, shadow, padding, hover state)
- Mood indicator display on the card (icon vs colored dot vs emoji)
- Whether the "Expand" trigger is a chevron, a button label, or clicking anywhere on the card
- Calendar header layout (month/year label + prev/next arrows + Today button placement)
- Empty state for the timeline (no entries yet) and for a calendar date with no entries

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — TIME-01 through TIME-07 and CAL-01 through CAL-04 are the complete Phase 3 scope

### Existing Code (must extend, not replace)
- `src/components/AppShell.tsx` — TitleBar + Sidebar + main layout. Phase 3 renders timeline or calendar as the main content.
- `src/components/Sidebar.tsx` — Has 4 nav stubs. Phase 3 wires up routing so Journal and Calendar nav items switch the main content view.
- `src/components/EntryList.tsx` + `src/components/EntryListItem.tsx` — Phase 2 sidebar compact list. Phase 3 adds a separate full-width timeline; the sidebar list may be hidden or removed when Journal view is active.
- `src/stores/entryStore.ts` — `loadEntries()` currently loads all entries. Phase 3 needs keyset pagination (add `loadPage()` or similar); must not break Phase 2 editor behavior.
- `src/styles/globals.css` — Design tokens: amber `#F59E0B`, warm stone palette, CSS custom properties. All new components use these tokens.

### Design System
- `src/styles/globals.css` — `--color-accent` (#F59E0B) is the amber used for heatmap intensity levels. Use opacity variants (amber/10, amber/30, amber/60) for the 4 heatmap levels.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `MoodIcon` pattern in `EntryListItem.tsx` — mood → lucide-react icon mapping already exists; extract as a shared utility or reuse directly in timeline cards
- `entryStore.useEntryStore` — Zustand store pattern established; add pagination state (`page`, `hasMore`, `loadPage`) following the same flat-state pattern
- `lucide-react` — already installed; use `ChevronDown/Up` for expand/collapse, `ArrowLeft` for back button, `ChevronLeft/Right` for calendar month navigation
- `sonner` Toaster — already in App.tsx for toast feedback

### Established Patterns
- State: Zustand with flat slices and explicit setter functions
- Styling: Tailwind utilities using `bg-bg`, `text-text`, `text-muted`, `border-border`, `bg-surface`, `text-accent`
- DB queries: `db.select<T[]>()` via `getDb()` from `src/lib/db.ts`
- Keyset pagination: query `WHERE created_at < :cursor ORDER BY created_at DESC LIMIT 20`

### Integration Points
- `App.tsx` or `JournalView.tsx`: Add routing state to switch between timeline, editor, and calendar views
- `Sidebar.tsx`: Wire up `onClick` on Journal and Calendar nav items to set active view
- `entryStore.ts`: Extend with `loadPage(cursor?)`, `hasMore`, `allEntries` accumulator for infinite scroll
- `src-tauri/`: No Rust changes needed — all queries go through `@tauri-apps/plugin-sql`

</code_context>

<specifics>
## Specific Ideas

- The timeline card should feel meaningfully different from the compact sidebar list item — more breathing room, preview text, tags visible
- Day separators ("Wednesday, Apr 9 ───") create a natural reading rhythm — scannable at a glance
- The calendar heatmap should feel satisfying: amber intensity immediately communicates active periods without needing to count
- "← Back" in the editor (from timeline navigation) should be subtle — not a full toolbar, just a small back affordance that doesn't disrupt the writing experience

</specifics>

<deferred>
## Deferred Ideas

- Keyword search and filter by tags/mood — Phase 4
- On This Day section — Phase 4
- Animated transitions between calendar months — nice to have, post-v1

</deferred>

---

*Phase: 03-timeline-calendar*
*Context gathered: 2026-04-10*
