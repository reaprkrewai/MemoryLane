# Phase 2: Editor & Tags — Research

**Researched:** 2026-04-09
**Domain:** TipTap rich-text editor, Markdown persistence, Zustand state management, SQLite CRUD via Tauri plugin-sql
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Bubble menu only — no persistent toolbar. Formatting controls appear when the user selects text. Keeps the editor distraction-free.
- **D-02:** Bubble menu contains: Bold, Italic, Heading 1, Heading 2, Bullet list, Blockquote — exactly the EDIT-01 requirements, no more.
- **D-03:** The "Journal" sidebar section shows a minimal scrollable entry list. Each list item shows: date + mood icon + word count. Clicking opens the entry in the editor.
- **D-04:** Amber "New Entry" button pinned at the top of the sidebar entry list.
- **D-05:** On first launch (no entries), the app auto-creates and opens a blank entry so the editor is never empty on startup.
- **D-06:** A header bar sits above the editor content with three zones: Left (date → popover), Center (mood selector, 5 buttons), Right (word + char count).
- **D-07:** Tag input row sits below the editor content, above any bottom chrome. It does not interrupt writing.
- **D-08:** Tag autocomplete uses a dropdown below the input, filtered as the user types. Each suggestion shows tag name + usage count. Press Enter or click to select; type a new name + Enter to create.
- **D-09:** New tags are auto-assigned the next available color from 8 preset colors. User can click any assigned tag pill to change its color. Color picker is NOT shown during tag creation — color assignment happens after.

### Claude's Discretion
- Exact size, spacing, and visual treatment of the metadata header bar
- Entry list in sidebar: how many items to show before scrolling, loading behavior for large lists
- Specific icon choices for mood (emoji vs icon vs symbol)
- Delete entry UX (confirm dialog pattern, keyboard shortcut, etc.)
- Auto-save indicator treatment (subtle status text, brief flash, silent)

### Deferred Ideas (OUT OF SCOPE)
- Full timeline cards with 150-char preview, expand/collapse inline — Phase 3
- Calendar heatmap — Phase 3
- Full-text search and filter UI — Phase 4
- Keyboard shortcut for New Entry (Cmd/Ctrl+N) — can be added later, not blocking
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| EDIT-01 | Rich text: bold, italic, headings, lists, code blocks, blockquote | TipTap StarterKit + @tiptap/extension-code-block covers all; bubble menu exposes formatting |
| EDIT-02 | Edit and delete existing entries | entryStore CRUD + DeleteEntryDialog + AlertDialog pattern |
| EDIT-03 | Entry content stored as clean Markdown (not HTML or JSON) | @tiptap/markdown extension — `editor.getMarkdown()` + `setContent(md, {contentType:'markdown'})` |
| EDIT-04 | Auto-save 500ms after typing stops, every 5s while typing | useRef debounce timer + setInterval 5s flush; fires entryStore.save() |
| EDIT-05 | User can configure auto-save interval (5s / 10s / 30s) | Settings table `autosave_interval` key already exists; entryStore reads it |
| EDIT-06 | Live word count and character count | CharacterCount extension: `editor.storage.characterCount.words()` / `.characters()` |
| EDIT-07 | Assign mood to an entry (great / good / okay / bad / awful) | MoodSelector component; stored as CHECK-constrained TEXT in `entries.mood` |
| EDIT-08 | Set entry date/time (defaults to current time) | DatePicker (shadcn Popover + Calendar); stored in `entries.created_at` as ms timestamp |
| TAG-01 | Create and assign tags inline while writing | TagInput + TagAutocomplete; INSERT into `tags` + `entry_tags` on Enter |
| TAG-02 | Tag autocomplete shows existing tags with usage count | SELECT tags + COUNT(entry_tags) JOIN — tagStore caches result |
| TAG-03 | Each tag has a color from 8 preset colors | 8-item preset array; color stored in `tags.color`; picker popover on pill click |
| TAG-04 | Delete tags that have no entries | DELETE WHERE id NOT IN (SELECT tag_id FROM entry_tags) — guarded by UI (button hidden if usage_count > 0) |
</phase_requirements>

---

## Summary

Phase 2 builds the full editing experience on top of the Phase 1 foundation. The database schema is complete and requires no changes. The two major library acquisitions are TipTap (rich-text editor with Markdown serialization) and four shadcn components (Popover, Calendar, AlertDialog, Tooltip). No other third-party libraries are needed.

The critical technical constraint is EDIT-03: content must be stored as Markdown, not ProseMirror JSON or HTML. TipTap's official `@tiptap/markdown` extension (3.22.3) provides `editor.getMarkdown()` for serialization and `setContent(md, { contentType: 'markdown' })` for hydration. This is the only compliant path — any approach that stores `editor.getJSON()` or `editor.getHTML()` fails the requirement.

Auto-save (EDIT-04) requires a debounced `onUpdate` handler (500ms idle) combined with a repeating 5s flush interval. Both timers are managed in `entryStore` using `useRef`-held timeouts. The auto-save interval is configurable via the `autosave_interval` settings key that already exists in the Phase 1 schema.

**Primary recommendation:** Install TipTap packages first, wire Markdown serialization, prove round-trip (write → DB → reload → editor shows same content), then layer metadata bar, tag row, and sidebar entry list.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @tiptap/react | 3.22.3 | React editor component + hooks | Official TipTap React integration |
| @tiptap/starter-kit | 3.22.3 | Bold, Italic, Heading, BulletList, Code, Blockquote, History | Canonical TipTap extension bundle |
| @tiptap/markdown | 3.22.3 | Markdown serialization/hydration | Official; `editor.getMarkdown()` meets EDIT-03 |
| @tiptap/extension-character-count | 3.22.3 | Word count + char count | Official extension; satisfies EDIT-06 |
| @tiptap/extension-placeholder | 3.22.3 | "Start writing…" placeholder | Official; CSS-only, no runtime cost |

**Note:** `@tiptap/extension-bubble-menu` is included in `@tiptap/react/menus` as of v3 — use `import { BubbleMenu } from '@tiptap/react/menus'`. Do not install the extension separately.

### shadcn Components (add via CLI — not yet installed)
| Component | Command | Purpose |
|-----------|---------|---------|
| popover | `npx shadcn add popover` | Date picker container + color picker container |
| calendar | `npx shadcn add calendar` | Date selection within popover |
| alert-dialog | `npx shadcn add alert-dialog` | Delete entry confirmation (D-UI-SPEC) |
| tooltip | `npx shadcn add tooltip` | Mood button hover labels + bubble menu keyboard hints |

### Already Installed (no action needed)
| Library | Version | Confirmed |
|---------|---------|-----------|
| zustand | 5.0.12 | State management — `entryStore` + `tagStore` follow existing `uiStore` pattern |
| lucide-react | 1.8.0 | Mood icons, trash icon, all UI icons |
| sonner | 2.0.7 | Error toasts on save failure (Toaster already in App.tsx) |
| @tauri-apps/plugin-sql | 2.4.0 | `getDb()` → `db.execute()` / `db.select<T[]>()` — all DB calls |
| tailwindcss | 3.4.19 | Locked at v3 (shadcn v2 constraint from Phase 1) |

**Installation (new packages only):**
```bash
npm install @tiptap/react @tiptap/starter-kit @tiptap/markdown @tiptap/extension-character-count @tiptap/extension-placeholder
npx shadcn add popover calendar alert-dialog tooltip
```

**Version verification (confirmed 2026-04-09 via npm registry):**
- All `@tiptap/*` packages: 3.22.3 (latest)
- tiptap-markdown community package (aguingand): 0.9.0 — DO NOT USE; use official `@tiptap/markdown` instead

---

## Architecture Patterns

### Recommended Project Structure (additions to existing src/)
```
src/
├── components/
│   ├── AppShell.tsx           # EXISTING — no changes
│   ├── Sidebar.tsx            # EXTEND — wire entry list + nav routing
│   ├── TitleBar.tsx           # EXISTING — no changes
│   ├── EmptyState.tsx         # REMOVE from App.tsx render path
│   ├── JournalView.tsx        # NEW — top-level layout: sidebar entry list + editor
│   ├── EntryEditor.tsx        # NEW — TipTap editor + MetadataBar + TagRow
│   ├── MetadataBar.tsx        # NEW — date / mood / word count header bar
│   ├── MoodSelector.tsx       # NEW — 5 lucide icon buttons
│   ├── DatePicker.tsx         # NEW — shadcn Popover + Calendar
│   ├── TagRow.tsx             # NEW — tag pills + tag input row
│   ├── TagPill.tsx            # NEW — colored pill + remove button + color picker popover
│   ├── TagInput.tsx           # NEW — borderless input + autocomplete dropdown
│   ├── TagAutocomplete.tsx    # NEW — dropdown list with color swatch + usage count
│   ├── BubbleMenuBar.tsx      # NEW — TipTap BubbleMenu with 7 format buttons
│   ├── EntryList.tsx          # NEW — scrollable sidebar entry list
│   ├── EntryListItem.tsx      # NEW — date + mood icon + word count row
│   └── DeleteEntryDialog.tsx  # NEW — shadcn AlertDialog confirmation
├── stores/
│   ├── uiStore.ts             # EXISTING — no changes
│   ├── entryStore.ts          # NEW — entry CRUD, selected entry, auto-save timers
│   └── tagStore.ts            # NEW — tag list, CRUD, color assignment, usage counts
└── lib/
    └── db.ts                  # EXISTING — no schema changes needed
```

### Pattern 1: TipTap Editor with Markdown Round-Trip (EDIT-03 critical)

**What:** Initialize TipTap with `@tiptap/markdown` extension; always read/write via `editor.getMarkdown()` and `setContent(md, { contentType: 'markdown' })`. Never use `getJSON()` or `getHTML()` for persistence.

**When to use:** Every save and every load of entry content.

```typescript
// Source: https://tiptap.dev/docs/editor/markdown/getting-started/basic-usage
import { useEditor, EditorContent } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import StarterKit from '@tiptap/starter-kit'
import { Markdown } from '@tiptap/markdown'
import CharacterCount from '@tiptap/extension-character-count'
import Placeholder from '@tiptap/extension-placeholder'

const editor = useEditor({
  extensions: [
    StarterKit,
    Markdown,
    CharacterCount,
    Placeholder.configure({ placeholder: 'Start writing…' }),
  ],
  content: savedMarkdown,           // string from DB
  onUpdate: ({ editor }) => {
    debouncedSave(editor.getMarkdown())  // returns clean Markdown string
  },
})

// Loading existing entry:
editor.commands.setContent(markdownFromDb, false, { contentType: 'markdown' })

// Saving:
const markdown = editor.getMarkdown()  // store this in entries.content
```

### Pattern 2: Auto-Save with Debounce + Interval Flush (EDIT-04)

**What:** Two timers in `entryStore`: a 500ms debounce timer cleared on every keystroke, and a 5s interval flush for continuous typing.

**When to use:** Whenever `onUpdate` fires from the editor.

```typescript
// entryStore.ts — Zustand store pattern (matches existing uiStore pattern)
import { create } from 'zustand'
import { getDb } from '../lib/db'

interface EntryState {
  selectedEntryId: string | null
  isSaving: boolean
  saveError: string | null
  _debounceTimer: ReturnType<typeof setTimeout> | null
  _intervalTimer: ReturnType<typeof setInterval> | null
  scheduleAutoSave: (entryId: string, content: string, wordCount: number, charCount: number) => void
  saveEntry: (entryId: string, content: string, wordCount: number, charCount: number) => Promise<void>
  // ...
}

// In the component:
const handleUpdate = useCallback(({ editor }: { editor: Editor }) => {
  const md = editor.getMarkdown()
  const words = editor.storage.characterCount.words()
  const chars = editor.storage.characterCount.characters()
  entryStore.scheduleAutoSave(entryId, md, words, chars)
}, [entryId])
```

### Pattern 3: Zustand Store for Entry CRUD

**What:** `entryStore` handles all entry DB operations. Components call store actions, never call `getDb()` directly.

```typescript
// Flat state slice — matches uiStore convention
export const useEntryStore = create<EntryState>((set, get) => ({
  entries: [] as Entry[],
  selectedEntryId: null,
  selectEntry: (id: string) => set({ selectedEntryId: id }),
  loadEntries: async () => {
    const db = await getDb()
    const rows = await db.select<Entry[]>(
      'SELECT id, created_at, mood, word_count FROM entries WHERE 1 ORDER BY created_at DESC'
    )
    set({ entries: rows })
  },
  createEntry: async () => {
    const db = await getDb()
    // INSERT returns the new id via lastInsertId or SELECT after insert
    await db.execute('INSERT INTO entries (content, word_count, char_count) VALUES (\'\', 0, 0)')
    const rows = await db.select<{ id: string }[]>(
      'SELECT id FROM entries ORDER BY created_at DESC LIMIT 1'
    )
    const newId = rows[0].id
    await get().loadEntries()
    set({ selectedEntryId: newId })
    return newId
  },
  deleteEntry: async (id: string) => {
    const db = await getDb()
    await db.execute('DELETE FROM entries WHERE id = ?', [id])
    await get().loadEntries()
    // If deleted entry was selected, clear selection or select first
    const { entries, selectedEntryId } = get()
    if (selectedEntryId === id) {
      set({ selectedEntryId: entries[0]?.id ?? null })
    }
  },
}))
```

### Pattern 4: BubbleMenu React Component

**What:** `BubbleMenu` is imported from `@tiptap/react/menus` (not `@tiptap/extension-bubble-menu`). It renders inline when text is selected.

```typescript
// Source: https://tiptap.dev/docs/editor/extensions/functionality/bubble-menu
import { BubbleMenu } from '@tiptap/react/menus'

<BubbleMenu editor={editor} tippyOptions={{ duration: 100 }}>
  <button
    onClick={() => editor.chain().focus().toggleBold().run()}
    className={editor.isActive('bold') ? 'text-accent' : 'text-text'}
  >
    B
  </button>
  {/* Italic, H1, H2, BulletList, Blockquote, Code */}
</BubbleMenu>
```

### Pattern 5: Tag Usage Count Query

**What:** The autocomplete dropdown shows tag name + usage count (TAG-02). This requires a JOIN query.

```typescript
// tagStore — load tags with usage count
const rows = await db.select<TagWithCount[]>(`
  SELECT t.id, t.name, t.color,
         COUNT(et.entry_id) AS usage_count
  FROM tags t
  LEFT JOIN entry_tags et ON et.tag_id = t.id
  GROUP BY t.id
  ORDER BY t.name COLLATE NOCASE ASC
`)
```

### Pattern 6: Tag Color Assignment (D-09)

**What:** New tags get the next available preset color. Cycle through 8 presets based on total tag count modulo 8.

```typescript
const TAG_COLORS = [
  '#EF4444', '#F97316', '#EAB308', '#22C55E',
  '#3B82F6', '#8B5CF6', '#EC4899', '#6B7280',
]

// In tagStore.createTag:
const nextColor = TAG_COLORS[currentTags.length % TAG_COLORS.length]
await db.execute('INSERT INTO tags (name, color) VALUES (?, ?)', [name, nextColor])
```

### Anti-Patterns to Avoid

- **Storing HTML or JSON:** `editor.getHTML()` or `editor.getJSON()` must never be written to `entries.content`. EDIT-03 is a hard requirement verified by DB inspection.
- **Direct DB calls in components:** All DB access goes through `entryStore` / `tagStore`. Components call store actions only.
- **Calling `editor.commands.setContent()` without `{ contentType: 'markdown' }`:** Without the option, TipTap treats the string as HTML, corrupting Markdown syntax characters.
- **Adding BubbleMenu extension separately:** `@tiptap/react/menus` already exposes `BubbleMenu` as a React component. Installing `@tiptap/extension-bubble-menu` additionally creates duplicate plugin registration.
- **Using FTS5 table for sidebar entry list:** FTS5 `entries_fts` is for search (Phase 4). Phase 2 sidebar queries the `entries` table directly.
- **Updating `entries.created_at` on every save:** `created_at` is the entry date (set once at creation or by user via DatePicker). Only `updated_at` changes on auto-save.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Rich text editing | Custom contenteditable | `@tiptap/react` + `StarterKit` | Selection handling, undo/redo, keyboard shortcuts are 10k+ lines of browser-compat code |
| Markdown serialization | Walk ProseMirror AST manually | `@tiptap/markdown` → `editor.getMarkdown()` | Handles nested nodes, escaped characters, tight/loose lists correctly |
| Word/char counting | `content.split(' ').length` | `CharacterCount` extension | Split-on-space fails on CJK, punctuation, TipTap node boundaries |
| Floating toolbar positioning | Compute selection rect + position absolutely | `BubbleMenu` from `@tiptap/react/menus` | Uses Tippy.js for smart flip/offset/hide behavior |
| Date picker from scratch | Custom calendar grid | shadcn `Calendar` inside `Popover` | Accessibility (keyboard nav, ARIA), locale formatting, focus trap |
| Alert/confirm dialog | `window.confirm()` or custom modal | shadcn `AlertDialog` | Matches design system, accessible, works with Tauri webview |
| Tag pill color mixing | JS color math | CSS `color-mix(in srgb, {color} 15%, transparent)` | Native browser, no runtime library needed |

**Key insight:** TipTap's extension ecosystem handles all the hard editor problems. The risk in this phase is Markdown correctness — lean entirely on `@tiptap/markdown` and verify the round-trip early.

---

## Common Pitfalls

### Pitfall 1: setContent Without contentType Corrupts Markdown

**What goes wrong:** Loading a saved Markdown string with `editor.commands.setContent(markdownString)` treats `#` as text, `**bold**` as literal asterisks.
**Why it happens:** TipTap defaults to HTML parsing. Markdown must be explicitly declared.
**How to avoid:** Always use `editor.commands.setContent(markdownString, false, { contentType: 'markdown' })` or pass the string as the `content` prop with `Markdown` in extensions (TipTap detects it when Markdown extension is present and content prop is a string).
**Warning signs:** Entry shows `## Heading` as plain text after reload.

### Pitfall 2: Auto-Save Timer Leak on Entry Switch

**What goes wrong:** User clicks a different entry in the sidebar before the 500ms debounce fires. The old timer saves content to the wrong `entryId`.
**Why it happens:** The debounce closure captures the old `entryId`.
**How to avoid:** Clear `_debounceTimer` and `_intervalTimer` in `entryStore.selectEntry()` before switching. Flush pending save synchronously on entry switch.
**Warning signs:** Opening entry B shows content from entry A; or entry A content gets overwritten with partial content.

### Pitfall 3: FTS5 Trigger Double-Update

**What goes wrong:** The FTS5 `entries_fts_au` trigger fires on every UPDATE of `content`. Each auto-save rewrites the FTS index. With 5-second intervals across many entries, this creates write pressure.
**Why it happens:** The trigger is unconditional on `UPDATE OF content`. This is by design for Phase 4 correctness.
**How to avoid:** In Phase 2 this is acceptable. The FTS trigger overhead is negligible at Phase 2 data volumes. Do not try to work around it.
**Warning signs:** Not a real problem in Phase 2 — flag for profiling in Phase 4.

### Pitfall 4: Tag Deletion Race with entry_tags FK

**What goes wrong:** UI shows "delete" button for a tag with usage_count = 0, but between the UI read and the DELETE, another entry is tagged with it.
**Why it happens:** No transaction wraps the count-check + delete.
**How to avoid:** Delete tags with `DELETE FROM tags WHERE id = ? AND id NOT IN (SELECT tag_id FROM entry_tags)`. The FK constraint on `entry_tags` provides a second safety net.
**Warning signs:** SQLite foreign-key violation error on tag delete.

### Pitfall 5: `entries.created_at` vs `entries.updated_at` Semantics

**What goes wrong:** Auto-save updates `created_at` instead of `updated_at`, corrupting the "entry date" that the user sees in the sidebar and date picker.
**Why it happens:** Confusing schema column names with UI labels.
**How to avoid:** `created_at` = the journal entry's date (user-controlled via DatePicker, D-06). `updated_at` = last write time (updated automatically on every save). The auto-save SQL must be `UPDATE entries SET content=?, word_count=?, char_count=?, updated_at=? WHERE id=?`.
**Warning signs:** Sidebar shows today's date for all entries after any save.

### Pitfall 6: Sidebar Entry List Loads HTML from DB

**What goes wrong:** Sidebar query SELECTs `content` and tries to render a text preview, exposing raw Markdown syntax (e.g., `# My Day`) to the user.
**Why it happens:** Trying to build a preview from stored content.
**How to avoid:** Phase 2 sidebar shows ONLY `date + mood icon + word_count` (D-03). Do NOT render content in the sidebar. Phase 3 handles text previews.
**Warning signs:** Entry list shows `# My Day` instead of clean date/count.

### Pitfall 7: shadcn Calendar Component CSS Conflicts

**What goes wrong:** shadcn `calendar` uses `--primary` for selected day highlight, but the project overrides `--primary` to amber oklch. The calendar day selected state may look wrong.
**Why it happens:** shadcn Calendar uses `bg-primary` for selected state. The amber override was set for `--primary` in Phase 1.
**How to avoid:** Verify calendar selected-day color after `npx shadcn add calendar`. The amber override should work correctly. If the day number text has contrast issues, add a targeted override in `globals.css`.
**Warning signs:** Selected date is illegible (dark amber text on amber bg).

---

## Code Examples

Verified patterns from official sources:

### TipTap Editor Initialization (EDIT-01, EDIT-03, EDIT-06)
```typescript
// Source: https://tiptap.dev/docs/editor/markdown/getting-started/basic-usage
import { useEditor, EditorContent } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import StarterKit from '@tiptap/starter-kit'
import { Markdown } from '@tiptap/markdown'
import CharacterCount from '@tiptap/extension-character-count'
import Placeholder from '@tiptap/extension-placeholder'

export function EntryEditor({ entryId, initialContent }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Markdown,
      CharacterCount,
      Placeholder.configure({ placeholder: 'Start writing\u2026' }),
    ],
    content: initialContent,   // Markdown string or '' for new entry
    onUpdate: ({ editor }) => {
      const md = editor.getMarkdown()
      const words = editor.storage.characterCount.words()
      const chars = editor.storage.characterCount.characters()
      scheduleAutoSave(entryId, md, words, chars)
    },
  })
  // ...
}
```

### Markdown Round-Trip Verification
```typescript
// Save:
const markdownContent = editor.getMarkdown()
await db.execute(
  'UPDATE entries SET content=?, word_count=?, char_count=?, updated_at=? WHERE id=?',
  [markdownContent, wordCount, charCount, Date.now(), entryId]
)

// Load:
const [entry] = await db.select<Entry[]>('SELECT content FROM entries WHERE id=?', [id])
editor.commands.setContent(entry.content, false, { contentType: 'markdown' })
```

### CharacterCount Usage (EDIT-06)
```typescript
// Source: https://tiptap.dev/docs/editor/extensions/functionality/character-count
const wordCount = editor.storage.characterCount.words()
const charCount = editor.storage.characterCount.characters()
// Display: `${wordCount} words · ${charCount} chars`
```

### BubbleMenu with Active State (D-01, D-02)
```typescript
// Source: https://tiptap.dev/docs/editor/extensions/functionality/bubble-menu
<BubbleMenu editor={editor} tippyOptions={{ duration: 100, placement: 'top' }}>
  {[
    { label: 'B', command: () => editor.chain().focus().toggleBold().run(), isActive: editor.isActive('bold') },
    { label: 'I', command: () => editor.chain().focus().toggleItalic().run(), isActive: editor.isActive('italic') },
    { label: 'H1', command: () => editor.chain().focus().toggleHeading({ level: 1 }).run(), isActive: editor.isActive('heading', { level: 1 }) },
    { label: 'H2', command: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), isActive: editor.isActive('heading', { level: 2 }) },
    { label: '•', command: () => editor.chain().focus().toggleBulletList().run(), isActive: editor.isActive('bulletList') },
    { label: '"', command: () => editor.chain().focus().toggleBlockquote().run(), isActive: editor.isActive('blockquote') },
    { label: '<>', command: () => editor.chain().focus().toggleCode().run(), isActive: editor.isActive('code') },
  ].map((btn) => (
    <button
      key={btn.label}
      onClick={btn.command}
      className={btn.isActive ? 'text-accent bg-amber-50/30' : 'text-text hover:bg-bg'}
    >
      {btn.label}
    </button>
  ))}
</BubbleMenu>
```

### Tag Query with Usage Count (TAG-02)
```typescript
const rows = await db.select<TagWithCount[]>(`
  SELECT t.id, t.name, t.color,
         COUNT(et.entry_id) AS usage_count
  FROM tags t
  LEFT JOIN entry_tags et ON et.tag_id = t.id
  GROUP BY t.id
  ORDER BY t.name COLLATE NOCASE ASC
`)
```

### Auto-Save with Debounce + Interval (EDIT-04)
```typescript
// entryStore.ts
let _debounceTimer: ReturnType<typeof setTimeout> | null = null
let _intervalTimer: ReturnType<typeof setInterval> | null = null
let _pendingSave: (() => Promise<void>) | null = null

scheduleAutoSave: (entryId, content, wordCount, charCount) => {
  const save = async () => {
    const db = await getDb()
    await db.execute(
      'UPDATE entries SET content=?, word_count=?, char_count=?, updated_at=? WHERE id=?',
      [content, wordCount, charCount, Date.now(), entryId]
    )
    set({ lastSavedAt: Date.now() })
  }
  _pendingSave = save

  // Debounce: reset 500ms timer on every keystroke
  if (_debounceTimer) clearTimeout(_debounceTimer)
  _debounceTimer = setTimeout(() => { save(); _pendingSave = null }, 500)

  // Interval: flush every 5s while typing continues
  if (!_intervalTimer) {
    _intervalTimer = setInterval(() => {
      if (_pendingSave) { _pendingSave(); _pendingSave = null }
    }, 5000)
  }
},

// Clear timers on entry switch to prevent stale saves
selectEntry: async (id) => {
  if (_debounceTimer) { clearTimeout(_debounceTimer); _debounceTimer = null }
  if (_intervalTimer) { clearInterval(_intervalTimer); _intervalTimer = null }
  if (_pendingSave) { await _pendingSave(); _pendingSave = null }  // flush
  set({ selectedEntryId: id })
},
```

---

## Environment Availability

Step 2.6: SKIPPED — Phase 2 is a pure frontend/DB code change. All dependencies are npm packages or shadcn CLI. No external services, runtimes, or system tools required beyond what Phase 1 already established (Node.js, Rust/Tauri toolchain).

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@tiptap/extension-bubble-menu` (separate install) | `BubbleMenu` from `@tiptap/react/menus` | TipTap v3 | Install one fewer package; React component API is cleaner |
| Community `tiptap-markdown` (aguingand, 0.9.0) | Official `@tiptap/markdown` (3.22.3) | TipTap introduced official in 2024 | Use official; community package has lower maintenance guarantee |
| `window.confirm()` for delete | shadcn `AlertDialog` | Design system adoption | Accessible, styled, works in Tauri webview |
| Storing editor state as JSON blob | Storing as Markdown string | Project decision | Human-readable, works with Phase 4 FTS5, AI-ready |

---

## Open Questions

1. **`@tiptap/markdown` Code Block Markdown Syntax**
   - What we know: StarterKit includes CodeBlock extension; `@tiptap/markdown` serializes it
   - What's unclear: Whether fenced code blocks (` ``` `) round-trip correctly with the Markdown extension, or whether the `@tiptap/extension-code-block-lowlight` variant is needed
   - Recommendation: Test basic fenced code block write → save → reload in Wave 0 task. If serialization is wrong, add `@tiptap/extension-code-block-lowlight` for syntax awareness.

2. **`plugin-sql` INSERT and returning new ID**
   - What we know: `db.execute()` returns `{ lastInsertId, rowsAffected }` — but entries use TEXT UUID PK from `DEFAULT (lower(hex(randomblob(16))))`
   - What's unclear: Whether `lastInsertId` returns the rowid (not the UUID) for TEXT PK tables
   - Recommendation: After INSERT, immediately SELECT the most recent entry by `created_at DESC LIMIT 1` to retrieve the UUID. This is safe because entries are created sequentially in a single-user desktop app.

---

## Project Constraints (from CLAUDE.md)

| Directive | Impact on Phase 2 |
|-----------|-------------------|
| Framework: Tauri (Rust + React) | All DB calls via `@tauri-apps/plugin-sql`; no Node.js file system APIs |
| UI Library: Tailwind CSS + shadcn/ui | Use `bg-bg`, `text-accent`, etc. — not raw hex. shadcn components via official CLI only. |
| State: Zustand | `create()` pattern for `entryStore` and `tagStore` — match existing `uiStore` pattern |
| Editor: TipTap | Confirmed as the project standard |
| DB: SQLite via Drizzle ORM | Phase 2 uses raw SQL via `plugin-sql` (Drizzle not yet wired); schema is complete |
| Tailwind v3 pinned | Do not upgrade to v4; shadcn v2.3.0 requires Tailwind v3 |
| Amber accent `#F59E0B` overrides shadcn default | Use `text-accent` / `bg-accent` Tailwind aliases, not hardcoded hex |
| No network calls, no telemetry | All saves are local SQLite only |
| Distinctive UI (frontend-design principle) | Avoid generic shadcn defaults; follow UI-SPEC component contracts exactly |
| Dark mode support | Both `bg-bg` and `bg-surface` have dark values in CSS vars; use Tailwind aliases |

---

## Sources

### Primary (HIGH confidence)
- TipTap official docs — https://tiptap.dev/docs/editor/markdown/getting-started/basic-usage — Markdown extension install + usage
- TipTap official docs — https://tiptap.dev/docs/editor/extensions/functionality/bubble-menu — BubbleMenu React usage
- TipTap official docs — https://tiptap.dev/docs/editor/extensions/functionality/character-count — CharacterCount API
- npm registry (verified 2026-04-09) — `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/markdown`, `@tiptap/extension-character-count`, `@tiptap/extension-placeholder`, `@tiptap/extension-bubble-menu` — all at 3.22.3
- Project source code — `src/lib/db.ts`, `src/stores/uiStore.ts`, `src/components/*.tsx` — Phase 1 implementation patterns

### Secondary (MEDIUM confidence)
- TipTap GitHub release notes — BubbleMenu moved to `@tiptap/react/menus` in v3
- npm registry — `tiptap-markdown` (aguingand) 0.9.0 — community package confirmed inferior to official

### Tertiary (LOW confidence)
- General Zustand debounce pattern (GitHub discussions) — standard approach, low risk, but no single authoritative source

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified on npm registry 2026-04-09
- Architecture: HIGH — based on existing Phase 1 code patterns + official TipTap docs
- Pitfalls: HIGH (items 1-2, 5-6) / MEDIUM (items 3-4, 7) — derived from code analysis and official docs
- Markdown round-trip: HIGH — verified official `@tiptap/markdown` exists and provides `getMarkdown()`

**Research date:** 2026-04-09
**Valid until:** 2026-05-09 (TipTap v3 is stable; shadcn v2.3.0 is pinned by project)
