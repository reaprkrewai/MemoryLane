# Phase 2: Editor & Tags - Context

**Gathered:** 2026-04-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can write and edit journal entries with rich text, assign mood, set date/time, auto-save, see live word/char count, and manage tags inline. A minimal sidebar entry list allows accessing existing entries for editing and deletion.

This phase does NOT include the full timeline/calendar browsing experience (Phase 3) or search/filtering (Phase 4).

</domain>

<decisions>
## Implementation Decisions

### Editor Toolbar
- **D-01:** Bubble menu only — no persistent toolbar. Formatting controls appear when the user selects text. Keeps the editor distraction-free.
- **D-02:** Bubble menu contains: Bold, Italic, Heading 1, Heading 2, Bullet list, Blockquote — exactly the EDIT-01 requirements, no more.

### Entry Navigation (Phase 2)
- **D-03:** The "Journal" sidebar section shows a minimal scrollable entry list. Each list item shows: date + mood icon + word count. Clicking opens the entry in the editor.
- **D-04:** Amber "New Entry" button pinned at the top of the sidebar entry list.
- **D-05:** On first launch (no entries), the app auto-creates and opens a blank entry so the editor is never empty on startup.

### Metadata Bar Layout
- **D-06:** A header bar sits above the editor content with three zones:
  - Left: Entry date rendered as readable text (e.g. "Wednesday, Apr 9"). Clicking opens a date + time picker popover. Defaults to current date/time.
  - Center: Mood selector — 5 icon buttons in a row (great → awful). Selected mood highlights in amber.
  - Right: Live word count and character count.

### Tag Input
- **D-07:** Tag input row sits below the editor content, above any bottom chrome. It does not interrupt writing.
- **D-08:** Tag autocomplete uses a dropdown below the input, filtered as the user types. Each suggestion shows tag name + usage count. Press Enter or click to select; type a new name + Enter to create.
- **D-09:** New tags are auto-assigned the next available color from 8 preset colors. User can click any assigned tag pill to change its color. Color picker is NOT shown during tag creation — color assignment happens after.

### Claude's Discretion
- Exact size, spacing, and visual treatment of the metadata header bar
- Entry list in sidebar: how many items to show before scrolling, loading behavior for large lists
- Specific icon choices for mood (emoji vs icon vs symbol)
- Delete entry UX (confirm dialog pattern, keyboard shortcut, etc.)
- Auto-save indicator treatment (subtle status text, brief flash, silent)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — EDIT-01 through EDIT-08, TAG-01 through TAG-04 are the complete Phase 2 scope

### Existing Code (must extend, not replace)
- `src/lib/db.ts` — Full schema already exists: `entries`, `tags`, `entry_tags`, `entries_fts` (FTS5), `embeddings`, `settings`
- `src/components/AppShell.tsx` — TitleBar + Sidebar + main layout. Must extend, not replace.
- `src/components/Sidebar.tsx` — Currently static nav. Phase 2 wires it up with entry list and routing logic.
- `src/stores/uiStore.ts` — Zustand store. Phase 2 will need additional stores (entry store, tag store).
- `src/styles/globals.css` — Design tokens (amber accent `#F59E0B`, warm light/dark palette). All new components must use these tokens.

### Design System
- `src/styles/globals.css` — CSS custom properties: `--color-bg`, `--color-surface`, `--color-accent`, `--color-text`, `--color-text-muted`, `--color-border`, `--color-destructive`. Both light and dark mode defined.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `AppShell`: Already handles TitleBar + Sidebar + main layout — Phase 2 renders editor as the `children` of AppShell
- `Sidebar`: Has the 4 nav items stub (Journal, Calendar, Search, Settings). Phase 2 activates routing and renders entry list inside Journal section
- `uiStore` (Zustand): Pattern established — create `entryStore` and `tagStore` following the same `create()` pattern
- `initializeDatabase()` in `db.ts`: All tables and indexes already exist — no schema changes needed in Phase 2
- `sonner` (Toaster): Already in App.tsx — use for auto-save feedback toasts

### Established Patterns
- State: Zustand with flat state slices and explicit setter functions
- Styling: Tailwind utility classes using `bg-bg`, `text-text`, `text-muted`, `border-border`, `bg-surface`, `text-accent` custom utilities
- Icons: `lucide-react` (already installed, used in Sidebar and App.tsx)
- DB access: `getDb()` returns a `Database` instance; queries use `db.select<T[]>()` and `db.execute()`

### Integration Points
- `App.tsx`: Replace `{isDbReady && !dbError && <EmptyState />}` with the new `<JournalView />` (or similar) that renders the sidebar entry list + editor
- `Sidebar.tsx`: Extend to conditionally render entry list when Journal tab is active; wire up nav item click handlers
- `src-tauri/`: No Rust changes needed for Phase 2 — all DB operations go through `@tauri-apps/plugin-sql`

</code_context>

<specifics>
## Specific Ideas

- The bubble menu should feel native to the editor — positioned close to the selection, not anchored to the top of the page
- Mood icons should have a satisfying interaction (slight scale or color pop on selection)
- The sidebar entry list should feel like a lean, purposeful list — not a full-featured timeline (that's Phase 3)
- Auto-save should be silent by default; a brief "Saved" indicator is acceptable but should not be distracting
- Tag pills should use the assigned color as a tinted background (not just a colored dot)

</specifics>

<deferred>
## Deferred Ideas

- Full timeline cards with 150-char preview, expand/collapse inline — Phase 3
- Calendar heatmap — Phase 3
- Full-text search and filter UI — Phase 4
- Keyboard shortcut for New Entry (Cmd/Ctrl+N) — can be added later, not blocking

</deferred>

---

*Phase: 02-editor-tags*
*Context gathered: 2026-04-09*
