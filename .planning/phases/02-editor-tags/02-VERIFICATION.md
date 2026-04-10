---
phase: 02-editor-tags
verified: 2026-04-10T13:30:00Z
status: gaps_found
score: 10/12 must-haves verified
re_verification: false
gaps:
  - truth: "Tags with 0 entries can be deleted (via tag management or autocomplete)"
    status: failed
    reason: "deleteTag is implemented in tagStore with correct SQL guard (AND id NOT IN (SELECT tag_id FROM entry_tags)) but no UI component calls it. No trash icon, delete button, or menu in TagAutocomplete, TagPill, or TagRow triggers tag deletion."
    artifacts:
      - path: "src/stores/tagStore.ts"
        issue: "deleteTag method exists and is correct, but is never called from any component"
      - path: "src/components/TagAutocomplete.tsx"
        issue: "Missing delete affordance for zero-usage tags (no trash/delete option in dropdown rows)"
      - path: "src/components/TagRow.tsx"
        issue: "No tag deletion UI — only entry-tag removal (removeTagFromEntry)"
    missing:
      - "A delete affordance in TagAutocomplete for tags with usage_count === 0 (e.g., trash icon visible on rows where usage_count === 0)"
      - "OR a tag management popover/section that lists all tags with a delete action"
  - truth: "User can configure the auto-save interval (5s / 10s / 30s)"
    status: failed
    reason: "updateAutoSaveInterval is in the store, reads/writes the settings table, and is ready for a settings UI — but no settings UI exists. EDIT-05 requires a user-facing configuration action, not just an internal API. The plan deferred settings UI to Phase 5."
    artifacts:
      - path: "src/stores/entryStore.ts"
        issue: "updateAutoSaveInterval method exists and is correct, but no component exposes it to the user"
    missing:
      - "A settings UI with auto-save interval selector (5s / 10s / 30s options) — either in a settings panel, MetadataBar dropdown, or inline control"
human_verification:
  - test: "Markdown round-trip persistence"
    expected: "After typing '**bold**' text and closing/reopening the app, the entry DB column contains **bold** (Markdown), not <strong> or a ProseMirror JSON node"
    why_human: "Requires launching the Tauri app, writing, and inspecting the SQLite database with a SQL query"
  - test: "Auto-save fires after 500ms idle"
    expected: "Stop typing for 500ms — 'Saved' indicator flashes in MetadataBar within ~600ms of last keystroke"
    why_human: "Requires real-time interaction with the running app to observe timing"
  - test: "Bubble menu appears on text selection"
    expected: "Select text in the editor — a floating toolbar appears above the selection with Bold, Italic, H1, H2, List, Quote, Code buttons"
    why_human: "Requires visual interaction — cannot verify floating UI position programmatically"
  - test: "Tag autocomplete keyboard navigation"
    expected: "Type a partial tag name, press ArrowDown to navigate suggestions, Enter to select — tag pill appears"
    why_human: "Requires keyboard event interaction in a running browser/Tauri context"
---

# Phase 2: Editor & Tags Verification Report

**Phase Goal:** Users can write, edit, and organize journal entries with rich text, mood, auto-save, and inline tag management.
**Verified:** 2026-04-10T13:30:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User can create a new entry and type rich text (bold, italic, headings, lists, code blocks, blockquote) | VERIFIED | EntryEditor.tsx: StarterKit extension, BubbleMenuBar.tsx: 7 format buttons (toggleBold, toggleItalic, toggleHeading x2, toggleBulletList, toggleBlockquote, toggleCode) |
| 2 | Entry content is stored as Markdown in SQLite — not HTML or ProseMirror JSON | VERIFIED | EntryEditor.tsx line 32: `e.getMarkdown()` via @tiptap/markdown; line 65: `setContent(entry.content, { contentType: "markdown" })` |
| 3 | Sidebar shows a scrollable list of entries with date, mood icon, and word count | VERIFIED | EntryListItem.tsx: dateLabel, MoodIcon switch, `{entry.word_count}w`; EntryList.tsx: maps entries array from entryStore |
| 4 | User can click an entry in the sidebar list to open it in the editor | VERIFIED | EntryList.tsx: `onClick={() => selectEntry(entry.id)}`; JournalView renders `<EntryEditor entryId={selectedEntryId} />` |
| 5 | On first launch with no entries, a blank entry is auto-created and opened | VERIFIED | JournalView.tsx lines 10-12: `loadEntries().then(() => ensureFirstEntry())`; entryStore.ensureFirstEntry creates entry if entries.length === 0 |
| 6 | User can select text and see a bubble menu with formatting controls | VERIFIED | BubbleMenuBar.tsx: `<BubbleMenu editor={editor} options={{ placement: "top" }}>` with 7 format buttons; uses Floating UI |
| 7 | Entry auto-saves 500ms after the user stops typing, and every 5s while typing continues | VERIFIED | entryStore.ts: _debounceTimer setTimeout(500), _intervalTimer setInterval(_autoSaveInterval=5000); EntryEditor.tsx: `scheduleAutoSave(entryId, md, words, chars)` in onUpdate |
| 8 | User can see live word count and character count that update in real time | VERIFIED | MetadataBar.tsx: `editor.storage.characterCount.words()` + `.characters()`; `editor.on('update')` listener forces re-render |
| 9 | User can assign a mood (great/good/okay/bad/awful) to an entry and it persists | VERIFIED | MoodSelector.tsx: 5 MOODS with Laugh/Smile/Meh/Frown/Angry icons; MetadataBar.tsx: `updateMood(entryId, mood)`; entryStore.updateMood → SQL UPDATE |
| 10 | User can click the date to open a calendar popover and change the entry date/time | VERIFIED | DatePicker.tsx: Popover + Calendar + `<input type="time">`; MetadataBar.tsx: `updateCreatedAt(entryId, newDate.getTime())` |
| 11 | User can type a tag name in the input below the editor and press Enter to create and assign it | VERIFIED | TagInput.tsx: handleKeyDown Enter → createTag + addTagToEntry; TagRow.tsx wired into EntryEditor below scroll area |
| 12 | Autocomplete dropdown shows existing tags with color swatch and usage count as user types | VERIFIED | TagAutocomplete.tsx: `{tag.usage_count}` right-aligned; 8px color swatch circle; `max-h-[200px]` scrollable |
| 13 | Each tag pill has a tinted background color from its assigned preset color | VERIFIED | TagPill.tsx: `color-mix(in srgb, ${tag.color} 15%, transparent)` background + `color-mix(in srgb, ${tag.color} 40%, transparent)` border |
| 14 | User can click a tag pill to open a color picker popover with 8 preset colors | VERIFIED | TagPill.tsx: Popover + 4x2 grid of TAG_COLORS swatches; Check icon on selected; `setOpen(false)` on swatch click |
| 15 | User can remove a tag from an entry by clicking the x on its pill | VERIFIED | TagPill.tsx: X button with `group-hover:opacity-100`; `e.stopPropagation(); onRemove()`; TagRow.tsx calls `removeTagFromEntry` |
| 16 | Tags with 0 entries can be deleted (via tag management or autocomplete) | FAILED | deleteTag exists in tagStore with correct SQL guard, but NO component calls it — no UI surface for tag deletion |
| 17 | User can delete an entry via the sidebar with a confirmation dialog | VERIFIED | EntryListItem.tsx: Trash2 icon with `group-hover:opacity-100` + stopPropagation; DeleteEntryDialog.tsx: AlertDialog, "Delete this entry?", "permanently deleted", bg-destructive action |
| 18 | Auto-save interval is configurable via settings table (5s default) | FAILED | updateAutoSaveInterval in store is correct and reads/writes settings table, but no UI exposes this to the user |

**Score:** 16/18 truths verified (10/12 must-have artifact groups pass; 2 truths about user-facing actions fail due to missing UI)

### Required Artifacts

| Artifact | Min Lines | Actual | Status | Details |
|----------|-----------|--------|--------|---------|
| `src/stores/entryStore.ts` | — | 221 | VERIFIED | Full CRUD, scheduleAutoSave, flushAndClearTimers, loadAutoSaveInterval, updateAutoSaveInterval, ensureFirstEntry |
| `src/stores/tagStore.ts` | — | 113 | VERIFIED | TAG_COLORS (8 colors), loadTags, createTag, deleteTag, updateTagColor, addTagToEntry, removeTagFromEntry, getEntryTags |
| `src/components/EntryEditor.tsx` | 40 | 90 | VERIFIED | TipTap + Markdown + CharacterCount + Placeholder; scheduleAutoSave; MetadataBar + BubbleMenuBar + TagRow wired |
| `src/components/BubbleMenuBar.tsx` | 20 | 88 | VERIFIED | 7 format buttons (B, I, H1, H2, List, Quote, Code); Floating UI BubbleMenu |
| `src/components/EntryList.tsx` | 15 | 35 | VERIFIED | Maps entries, amber "New Entry" button (bg-accent, hover:bg-[#D97706], active:scale-[0.97]) |
| `src/components/JournalView.tsx` | 15 | 26 | VERIFIED | loadEntries + ensureFirstEntry on mount; renders EntryEditor or empty state |
| `src/components/MetadataBar.tsx` | 40 | 90 | VERIFIED | Three zones: DatePicker, MoodSelector, word/char count; "Saved" flash 1500ms; live update via editor.on('update') |
| `src/components/MoodSelector.tsx` | 25 | 74 | VERIFIED | 5 MOODS with lucide icons; amber selected state; Tooltip per button; toggle deselect |
| `src/components/DatePicker.tsx` | 30 | 79 | VERIFIED | Popover + Calendar + time input; combines date+time into single timestamp |
| `src/components/TagRow.tsx` | 20 | 62 | VERIFIED | border-t, px-8, flex-wrap; getEntryTags on mount; TagPill + TagInput |
| `src/components/TagPill.tsx` | 25 | 87 | VERIFIED | color-mix backgrounds; rounded-full; group-hover x button; Popover color picker 4x2 grid; Check icon |
| `src/components/TagInput.tsx` | 20 | 151 | VERIFIED | Borderless input; "Add tag..." placeholder; Enter/Arrow/Escape keyboard nav; 150ms blur timeout |
| `src/components/TagAutocomplete.tsx` | 30 | 97 | VERIFIED | max-h-[200px]; color swatch + name + usage_count; "Create tag '{name}'" row; onMouseDown prevents blur race |
| `src/components/DeleteEntryDialog.tsx` | 20 | 50 | VERIFIED | AlertDialog; "Delete this entry?"; "permanently deleted"; bg-destructive confirm button; deleteEntry on confirm |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| EntryEditor.tsx | entryStore.ts | useEntryStore, scheduleAutoSave | WIRED | Line 19: `const scheduleAutoSave = useEntryStore((s) => s.scheduleAutoSave)` |
| EntryEditor.tsx | editor.getMarkdown() | TipTap Markdown extension | WIRED | Line 32: `const md = e.getMarkdown()` |
| EntryList.tsx | entryStore.ts | useEntryStore for entries + selectEntry | WIRED | Lines 5-8: entries, selectedEntryId, selectEntry, createEntry from store |
| App.tsx | JournalView.tsx | replaces EmptyState when DB ready | WIRED | App.tsx line 50: `{isDbReady && !dbError && <JournalView />}` — EmptyState not present |
| MetadataBar.tsx | entryStore.ts | useEntryStore for mood, date, save state | WIRED | Lines 13-16: entries, lastSavedAt, updateMood, updateCreatedAt |
| EntryEditor.tsx | entryStore.ts | scheduleAutoSave replaces direct saveContent | WIRED | Line 35: `scheduleAutoSave(entryId, md, words, chars)` in onUpdate |
| TagRow.tsx | tagStore.ts | useTagStore for entry tags and CRUD | WIRED | Lines 20-23: getEntryTags, loadTags, removeTagFromEntry, updateTagColor |
| TagAutocomplete.tsx | tagStore.ts | useTagStore for all tags with usage counts | WIRED | allTags prop passed from TagInput which reads `useTagStore((s) => s.tags)` |
| DeleteEntryDialog.tsx | entryStore.ts | useEntryStore.deleteEntry | WIRED | Line 25: `await useEntryStore.getState().deleteEntry(entryId)` |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|--------------------|--------|
| EntryList.tsx | entries | entryStore.loadEntries → SQL SELECT | Yes — DB query with ORDER BY created_at DESC | FLOWING |
| EntryEditor.tsx | entry.content | entryStore.entries[id].content → SQL UPDATE via saveContent | Yes — Markdown string from DB | FLOWING |
| MetadataBar.tsx | words/chars | editor.storage.characterCount.words/characters() | Yes — TipTap live computation | FLOWING |
| MetadataBar.tsx | entry.mood/created_at | entryStore.entries array (updated via updateMood/updateCreatedAt → SQL) | Yes — DB-backed | FLOWING |
| TagRow.tsx | entryTags | tagStore.getEntryTags(entryId) → SQL JOIN query | Yes — DB query | FLOWING |
| TagAutocomplete.tsx | allTags | tagStore.tags → loadTags() → SQL LEFT JOIN COUNT | Yes — DB query with usage counts | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| TypeScript compiles | `npx tsc --noEmit` | Exit 0, no output | PASS |
| entryStore exports useEntryStore | `node -e "..."` (checked via grep) | export found line 51 | PASS |
| tagStore exports TAG_COLORS | grep in tagStore.ts | 8 hex values confirmed | PASS |
| scheduleAutoSave uses 500ms debounce | grep entryStore.ts | setTimeout(..., 500) on line 169 | PASS |
| autosave_interval read from settings | grep entryStore.ts | SQL SELECT from settings table | PASS |
| shadcn components installed | `ls src/components/ui/` | alert-dialog, calendar, popover, tooltip | PASS |
| deleteTag has no UI caller | `grep -rn deleteTag src/components/` | No matches | FAIL |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| EDIT-01 | 02-01 | Rich text creation (bold, italic, headings, lists, code, blockquote) | SATISFIED | StarterKit + BubbleMenuBar 7 format buttons |
| EDIT-02 | 02-01 | Edit and delete existing entries | SATISFIED | EntryEditor (edit); DeleteEntryDialog via Trash2 in EntryListItem (delete) |
| EDIT-03 | 02-01 | Content stored as clean Markdown | SATISFIED | getMarkdown() on save, setContent with contentType:'markdown' on load |
| EDIT-04 | 02-02 | Auto-saves 500ms after typing stops, every 5s during continuous typing | SATISFIED | scheduleAutoSave: _debounceTimer(500ms) + _intervalTimer(_autoSaveInterval) |
| EDIT-05 | 02-02 | User can configure auto-save interval (5s/10s/30s) | BLOCKED | updateAutoSaveInterval method exists and works, but no settings UI exposes it to users |
| EDIT-06 | 02-01, 02-02 | Live word count and character count | SATISFIED | MetadataBar reads editor.storage.characterCount.words/characters() with editor.on('update') |
| EDIT-07 | 02-02 | Assign mood (great/good/okay/bad/awful) | SATISFIED | MoodSelector 5-icon row; updateMood → SQL UPDATE entries SET mood |
| EDIT-08 | 02-02 | Set entry date/time | SATISFIED | DatePicker: Calendar + time input → updateCreatedAt(entryId, timestamp) |
| TAG-01 | 02-03 | Create and assign tags inline | SATISFIED | TagInput: createTag + addTagToEntry on Enter |
| TAG-02 | 02-03 | Autocomplete with usage count | SATISFIED | TagAutocomplete: usage_count column, color swatch, case-insensitive filter |
| TAG-03 | 02-03 | Tag has color from 8 presets | SATISFIED | TagPill color-mix background; color picker Popover with TAG_COLORS grid |
| TAG-04 | 02-03 | User can delete tags with no entries | BLOCKED | deleteTag store method is correct and guarded, but no UI component calls it |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| MoodSelector.tsx | 43 | `scale-[1.0]` on selected state instead of `scale-[1.2]` + `scale-100` animation sequence | INFO | Selection animation absent — button doesn't pop on click. Functional but cosmetically incomplete per plan spec. |

No TODO/FIXME/placeholder comments found in any phase 2 components. No empty return null stubs. No hardcoded empty arrays passed to rendering paths.

### Human Verification Required

#### 1. Markdown Round-Trip Persistence

**Test:** Open app, create a new entry, type some **bold** text using the bubble menu, close and reopen the app. Using a SQLite browser (e.g., DB Browser for SQLite), inspect the content column of the entries table.
**Expected:** Content contains `**bold text**` in Markdown syntax — not `<strong>bold text</strong>` (HTML) and not a ProseMirror JSON object.
**Why human:** Requires launching the Tauri app and inspecting the database file on disk.

#### 2. Auto-Save 500ms Debounce

**Test:** Open app, start typing in the editor, then stop. Watch the MetadataBar right zone.
**Expected:** Within ~600ms of stopping typing, the word/char count briefly shows "Saved" in amber, then reverts to the count display.
**Why human:** Requires real-time interaction with the running app to observe timing behavior.

#### 3. Bubble Menu Positioning

**Test:** Select text in the editor (click and drag to highlight a word or phrase).
**Expected:** A floating toolbar appears above (or near) the selection showing B, I, H1, H2, list, quote, code buttons. Clicking B makes the text bold.
**Why human:** Floating UI positioning requires visual verification in the running app.

#### 4. Tag Autocomplete Flow

**Test:** Click in the "Add tag..." input below the editor. Type "w".
**Expected:** Dropdown appears listing any existing tags containing "w" with color swatch and usage count. If no match exists, shows "Create tag 'w'" in italic. Press ArrowDown then Enter to select. Tag pill appears below the input.
**Why human:** Keyboard event + DOM interaction in running browser context.

### Gaps Summary

Two requirements are blocked due to missing user-facing UI:

**TAG-04 (Critical):** The `deleteTag` store method exists and is correctly guarded against deletion of tags with active entries. However, no component in the UI calls it. The truth "Tags with 0 entries can be deleted" from the plan's must_haves and the ROADMAP Success Criterion 5 is not achievable by a user. The plan's manual verification step (#3) references "Delete tag: usage_count 0 tags can be deleted" — this step would fail. A delete affordance needs to be added to `TagAutocomplete.tsx` (e.g., a trash icon visible only on rows where `usage_count === 0`) or a similar surface.

**EDIT-05 (Moderate):** The requirement says "User can configure the auto-save interval (5s / 10s / 30s)". The store method `updateAutoSaveInterval` is implemented and reads/writes the `settings` table. But there is no UI control — no dropdown, no toggle, no settings panel. The plan explicitly deferred the settings UI to Phase 5, and the REQUIREMENTS.md marks EDIT-05 as complete. Since Phase 5 is where the settings panel will be built, this may be intentional scope deferral — but it means EDIT-05 cannot be verified as user-facing in Phase 2.

Both gaps share a root cause: the store/data layer was implemented but the corresponding UI affordance was not. They require targeted additions to `TagAutocomplete.tsx` (or a new tag management component) and a settings control somewhere in the app.

---

_Verified: 2026-04-10T13:30:00Z_
_Verifier: Claude (gsd-verifier)_
