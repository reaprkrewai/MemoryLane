---
phase: 02-editor-tags
plan: 01
subsystem: ui
tags: [tiptap, zustand, sqlite, markdown, react, tailwind, shadcn]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: SQLite database via @tauri-apps/plugin-sql, AppShell layout, globals.css design tokens, Zustand pattern via uiStore
provides:
  - TipTap rich text editor with Markdown round-trip persistence (entryStore + EntryEditor)
  - Zustand entryStore with full CRUD, mood, date operations, ensureFirstEntry auto-create
  - Zustand tagStore with CRUD, color assignment (8 preset colors), usage count tracking
  - Bubble menu with 7 formatting controls (bold, italic, H1, H2, list, blockquote, code)
  - Sidebar entry list with date, mood icon, word count — amber "New Entry" button
  - JournalView auto-creating blank entry on first launch (D-05)
  - shadcn popover, calendar, alert-dialog, tooltip components installed
affects:
  - 02-02 (MetadataBar, mood selector, auto-save — extends EntryEditor)
  - 02-03 (TagRow, tag autocomplete, color picker — extends EntryEditor + tagStore)

# Tech tracking
tech-stack:
  added:
    - "@tiptap/react 3.22.3 — editor core with useEditor hook"
    - "@tiptap/starter-kit — bold, italic, headings, lists, blockquote, code"
    - "@tiptap/markdown — Markdown serialization/deserialization (getMarkdown(), setContent with contentType: markdown)"
    - "@tiptap/extension-character-count — word and char count via editor.storage.characterCount"
    - "@tiptap/extension-placeholder — placeholder text support"
    - "shadcn popover, calendar, alert-dialog, tooltip (via npx shadcn@2.3.0 add)"
  patterns:
    - "TipTap v3 uses Floating UI (not Tippy.js) — BubbleMenu uses options.placement not tippyOptions"
    - "Markdown round-trip: getMarkdown() for saves, setContent(md, { contentType: 'markdown' }) for loads"
    - "entryStore local array updates for sidebar sync without full DB reload on saveContent"
    - "entryStore.ensureFirstEntry() called on JournalView mount for D-05 first-launch blank entry"

key-files:
  created:
    - src/stores/entryStore.ts
    - src/stores/tagStore.ts
    - src/components/BubbleMenuBar.tsx
    - src/components/EntryEditor.tsx
    - src/components/EntryList.tsx
    - src/components/EntryListItem.tsx
    - src/components/JournalView.tsx
    - src/components/ui/popover.tsx
    - src/components/ui/calendar.tsx
    - src/components/ui/alert-dialog.tsx
    - src/components/ui/tooltip.tsx
    - src/components/ui/button.tsx
  modified:
    - src/components/Sidebar.tsx (added EntryList below nav items)
    - src/App.tsx (replaced EmptyState with JournalView)
    - src/styles/globals.css (added TipTap prose styles)
    - package.json (TipTap + shadcn deps)

key-decisions:
  - "TipTap v3 BubbleMenu uses Floating UI (options.placement) not Tippy.js (tippyOptions) — API changed from plan docs"
  - "editor.getMarkdown() is on Editor directly (module augmentation) not editor.storage.markdown.getMarkdown()"
  - "setContent in TipTap v3 takes (content, options) not (content, emitUpdate, parseOptions) — old 3-arg API removed"
  - "saveContent on every editor update (not debounced) — debounce added in Plan 02 as specified"

patterns-established:
  - "Zustand stores follow uiStore.ts pattern: create<State>(set, get) with async DB methods"
  - "entryStore.saveContent optimistically updates local entries array to avoid full reload"
  - "TAG_COLORS exported from tagStore for reuse in Plan 03 color picker"
  - "TipTap prose styles scoped to .tiptap-editor .ProseMirror — no global style leakage"

requirements-completed:
  - EDIT-01
  - EDIT-02
  - EDIT-03
  - EDIT-06

# Metrics
duration: 35min
completed: 2026-04-10
---

# Phase 2 Plan 01: TipTap Editor Foundation Summary

**TipTap rich-text editor wired to SQLite via Markdown round-trip, Zustand entryStore/tagStore, bubble menu with 7 formatting controls, and sidebar entry list with auto-create first entry**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-04-10T12:19:38Z
- **Completed:** 2026-04-10T12:54:00Z
- **Tasks:** 2
- **Files modified:** 13

## Accomplishments

- Installed TipTap v3 packages and 4 shadcn components (popover, calendar, alert-dialog, tooltip)
- Created entryStore (full CRUD + mood + date ops + ensureFirstEntry) and tagStore (CRUD + 8-color assignment + usage counts) following Zustand uiStore pattern
- Built TipTap editor with Markdown round-trip persistence, CharacterCount, and bubble menu (7 formatting buttons)
- Created sidebar entry list (EntryListItem with date/mood icon/word count, EntryList with amber "New Entry" button)
- Wired JournalView into AppShell replacing EmptyState — app boots into a working editor with auto-created first entry

## Task Commits

1. **Task 1: Install dependencies, create entryStore and tagStore, add TipTap editor styles** - `7720ea1` (feat)
2. **Task 2: Build TipTap editor, bubble menu, sidebar entry list, and wire into AppShell** - `d46a359` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified

- `src/stores/entryStore.ts` — Entry CRUD, selectedEntryId, saveContent, updateMood, updateCreatedAt, ensureFirstEntry
- `src/stores/tagStore.ts` — Tag CRUD, TAG_COLORS, addTagToEntry, removeTagFromEntry, getEntryTags
- `src/components/BubbleMenuBar.tsx` — TipTap BubbleMenu with 7 formatting buttons using Floating UI
- `src/components/EntryEditor.tsx` — TipTap editor with Markdown round-trip, CharacterCount, Placeholder
- `src/components/EntryList.tsx` — Scrollable entry list with amber "New Entry" button
- `src/components/EntryListItem.tsx` — Row with date label, Laugh/Smile/Meh/Frown/Angry mood icon, word count
- `src/components/JournalView.tsx` — Top-level view with loadEntries + ensureFirstEntry on mount
- `src/components/Sidebar.tsx` — Extended with EntryList below nav separator
- `src/App.tsx` — Replaced EmptyState with JournalView
- `src/styles/globals.css` — TipTap prose styles (headings, blockquote, code, placeholder)
- `package.json` — TipTap + shadcn deps added

## Decisions Made

- **TipTap v3 BubbleMenu API changed:** Plan docs referenced `tippyOptions` but TipTap v3 uses Floating UI (`options.placement`) — fixed automatically
- **getMarkdown() location:** Plan specified `editor.storage.markdown.getMarkdown()` but it's actually `editor.getMarkdown()` (module augmentation on Editor type) — fixed automatically
- **setContent signature changed:** TipTap v3 dropped the 3-arg `(content, emitUpdate, parseOptions)` form — now `(content, options)` where options includes `contentType: 'markdown'` — fixed automatically
- **Save on every update:** Debounced auto-save deferred to Plan 02 as specified; current implementation saves on every `onUpdate` event

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TipTap v3 BubbleMenu uses Floating UI, not Tippy.js**
- **Found during:** Task 2 (TypeScript compilation)
- **Issue:** Plan specified `tippyOptions={{ duration: 100, placement: 'top' }}` but TipTap v3 replaced Tippy.js with Floating UI — prop doesn't exist
- **Fix:** Changed to `options={{ placement: "top" }}` which maps to Floating UI placement
- **Files modified:** src/components/BubbleMenuBar.tsx
- **Verification:** `npx tsc --noEmit` passes
- **Committed in:** d46a359

**2. [Rule 1 - Bug] editor.getMarkdown() is on Editor not storage**
- **Found during:** Task 2 (TypeScript compilation)
- **Issue:** Plan specified `editor.storage.markdown.getMarkdown()` but @tiptap/markdown adds `getMarkdown()` directly to Editor via module augmentation — `storage.markdown.getMarkdown` does not exist on the type
- **Fix:** Changed to `editor.getMarkdown()` per actual TipTap v3 API
- **Files modified:** src/components/EntryEditor.tsx
- **Verification:** `npx tsc --noEmit` passes
- **Committed in:** d46a359

**3. [Rule 1 - Bug] setContent 3-arg form removed in TipTap v3**
- **Found during:** Task 2 (TypeScript compilation)
- **Issue:** Plan's `editor.commands.setContent(content, false, { contentType: 'markdown' })` uses old 3-arg API — v3 signature is `(content, options?)`
- **Fix:** Changed to `editor.commands.setContent(entry.content, { contentType: "markdown" })`
- **Files modified:** src/components/EntryEditor.tsx
- **Verification:** `npx tsc --noEmit` passes, build succeeds
- **Committed in:** d46a359

---

**Total deviations:** 3 auto-fixed (all Rule 1 — TipTap v3 API changes from what plan documented)
**Impact on plan:** All fixes required to match TipTap v3 actual API. No scope creep. All plan objectives achieved.

## Issues Encountered

TipTap v3 has significantly updated APIs compared to v2 (used Floating UI instead of Tippy.js, changed markdown extension method locations, simplified setContent signature). All three issues were TypeScript compile errors caught before runtime and fixed in one pass.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 02-02 (MetadataBar, mood selector, auto-save) can now extend EntryEditor — MetadataBar placeholder div is in place
- Plan 02-03 (TagRow, tag autocomplete, color picker) can now use tagStore — TagRow placeholder div is in place and TAG_COLORS is exported
- shadcn popover + calendar + alert-dialog + tooltip installed, ready for use in Plans 02 and 03
- TypeScript compiles cleanly, `npm run build` succeeds

## Self-Check: PASSED

All files exist on disk. Both task commits (7720ea1, d46a359) found in git log.

---
*Phase: 02-editor-tags*
*Completed: 2026-04-10*
