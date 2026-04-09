# Architecture Research: MemoryLane

**Project:** MemoryLane — privacy-first desktop journaling app
**Researched:** 2026-04-09
**Confidence:** HIGH for Tauri v2 IPC and SQLite FTS5; MEDIUM for tauri-plugin-sql specifics

---

## System Components

Clean two-process boundary: React WebView (UI) and Rust main process (data). Frontend never touches SQLite directly — all data flows through typed Tauri IPC commands.

```
React Frontend (WebView)
├── App Shell            — layout, sidebar nav, theme class on root
├── IPC Layer            — typed invoke() wrappers, error normalization
├── Zustand Stores       — editorStore, filterStore, uiStore
├── React Query Cache    — entries, tags, search results
├── Editor               — TipTap + auto-save + mood + TagInput
├── Timeline             — react-virtual list + infinite scroll + EntryCard
├── CalendarGrid         — heatmap render + date selection
└── SearchBar            — debounced query + filter UI

Rust Backend (main process)
├── AppState             — tokio::sync::Mutex<Database>
├── Command Handlers     — thin dispatch; #[tauri::command] functions
├── DB Module            — all SQL, migrations, prepared statements
└── Models               — serde-serializable structs

SQLite File
└── {appDataDir}/memorylane.db
```

**Component boundary rules:**
- Frontend never writes raw SQL — only calls named Rust commands
- Rust command handlers stay thin: validate input, call DB module, return result
- All business logic (query construction, FTS5, JSON serialization) lives in the DB module
- Use `sqlx`/`rusqlite` in Rust commands rather than exposing raw SQL to frontend

---

## Data Flow

**IPC pattern — Rust command:**
```rust
#[tauri::command]
pub async fn upsert_entry(
    state: State<'_, AppState>,
    input: UpdateEntryInput,
) -> Result<Entry, String> {
    let db = state.db.lock().await;
    db.upsert_entry(input).map_err(|e| e.to_string())
}
```

**Frontend IPC wrapper** (components never call `invoke()` directly):
```typescript
// src/lib/ipc/entries.ts
export const ipc = {
  upsertEntry: (input: UpdateEntryInput): Promise<Entry> =>
    invoke('upsert_entry', { input }),
  getEntries: (limit: number, offset: number): Promise<Entry[]> =>
    invoke('get_entries', { limit, offset }),
};
```

**Key IPC rules:**
- Use `tokio::sync::Mutex`, not `std::sync::Mutex` (sync mutex across `.await` causes deadlock)
- Rust structs must use `#[serde(rename_all = "camelCase")]` to match JS naming
- Errors: `Result<T, String>` minimum; richer errors via `Result<T, AppError>` where `AppError: Serialize`

**Auto-save data flow:**
```
User types → TipTap onChange → debounce 500ms
  → ipc.upsertEntry() → invoke('upsert_entry') [IPC]
  → Rust writes to SQLite → FTS5 trigger fires automatically
  → Returns updated Entry → editorStore.markSaved()
  → queryClient.invalidateQueries(['entries'])
```

**Search data flow:**
```
User types in SearchBar → debounce 300ms
  → ipc.searchEntries(query, filters)
  → Rust: FTS5 MATCH query + snippet()
  → Returns [{id, preview_html, mood, created_at}]
  → Timeline renders SearchResultsList
```

---

## Database Schema Design

**Core principles:**
1. FTS5 as external content table — triggers keep index in sync, no data duplication
2. Tags normalized (junction table) — enables efficient multi-tag filter queries
3. `metadata TEXT DEFAULT '{}'` on entries — JSON blob for future fields without migrations
4. `embeddings` table created now (empty) — populated in Phase 2, zero migration pain
5. All timestamps as `INTEGER` (Unix milliseconds) — fast comparison, unambiguous

**Full schema:**
```sql
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
PRAGMA synchronous = NORMAL;

CREATE TABLE entries (
    id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    content     TEXT NOT NULL DEFAULT '',    -- Clean Markdown only
    mood        TEXT CHECK(mood IN ('great','good','okay','bad','awful')) NULL,
    word_count  INTEGER NOT NULL DEFAULT 0,
    char_count  INTEGER NOT NULL DEFAULT 0,
    created_at  INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
    updated_at  INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
    metadata    TEXT NOT NULL DEFAULT '{}'   -- JSON for future fields (location, weather, etc.)
);

CREATE INDEX idx_entries_created_at ON entries(created_at DESC);
CREATE INDEX idx_entries_mood ON entries(mood) WHERE mood IS NOT NULL;

CREATE TABLE tags (
    id         TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name       TEXT NOT NULL UNIQUE COLLATE NOCASE,
    color      TEXT NOT NULL DEFAULT '#6B7280',
    created_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000)
);

CREATE TABLE entry_tags (
    entry_id TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
    tag_id   TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (entry_id, tag_id)
);
CREATE INDEX idx_entry_tags_tag_id ON entry_tags(tag_id);

-- FTS5 external content table
CREATE VIRTUAL TABLE entries_fts USING fts5(
    content,
    content     = 'entries',
    content_rowid = 'rowid',
    tokenize    = 'unicode61 remove_diacritics 1'
);

CREATE TRIGGER entries_fts_ai AFTER INSERT ON entries BEGIN
    INSERT INTO entries_fts(rowid, content) VALUES (new.rowid, new.content);
END;
CREATE TRIGGER entries_fts_ad AFTER DELETE ON entries BEGIN
    INSERT INTO entries_fts(entries_fts, rowid, content)
    VALUES ('delete', old.rowid, old.content);
END;
CREATE TRIGGER entries_fts_au AFTER UPDATE OF content ON entries BEGIN
    INSERT INTO entries_fts(entries_fts, rowid, content)
    VALUES ('delete', old.rowid, old.content);
    INSERT INTO entries_fts(rowid, content) VALUES (new.rowid, new.content);
END;

-- AI Readiness: created now, populated in Phase 2
CREATE TABLE embeddings (
    id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    entry_id    TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
    model       TEXT NOT NULL,          -- e.g. 'nomic-embed-text:v1.5'
    dimensions  INTEGER NOT NULL,       -- e.g. 768
    vector      BLOB NOT NULL,          -- Float32Array as BLOB
    chunk_index INTEGER NOT NULL DEFAULT 0,
    created_at  INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
    UNIQUE(entry_id, model, chunk_index)
);
CREATE INDEX idx_embeddings_entry_id ON embeddings(entry_id);

CREATE TABLE settings (
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL,
    updated_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000)
);
INSERT OR IGNORE INTO settings(key, value) VALUES
    ('theme',             '"system"'),
    ('font_size',         '"medium"'),
    ('autosave_interval', '5000');
```

**Key query patterns:**

Timeline (cursor-based pagination — better than OFFSET for large datasets):
```sql
SELECT e.id, e.content, e.mood, e.word_count, e.created_at,
    json_group_array(
        CASE WHEN t.id IS NOT NULL
        THEN json_object('id', t.id, 'name', t.name, 'color', t.color)
        END
    ) FILTER (WHERE t.id IS NOT NULL) AS tags
FROM entries e
LEFT JOIN entry_tags et ON et.entry_id = e.id
LEFT JOIN tags t ON t.id = et.tag_id
WHERE e.created_at < ?    -- cursor, not OFFSET
GROUP BY e.id
ORDER BY e.created_at DESC
LIMIT 20;
```

Calendar heatmap:
```sql
SELECT date(created_at / 1000, 'unixepoch') AS day, COUNT(*) AS entry_count
FROM entries
WHERE created_at >= ? AND created_at < ?
GROUP BY day;
```

FTS5 search with highlighting:
```sql
SELECT e.id, e.mood, e.created_at,
    snippet(entries_fts, 0, '<mark>', '</mark>', '…', 20) AS preview
FROM entries e
JOIN entries_fts ON e.rowid = entries_fts.rowid
WHERE entries_fts MATCH ?
ORDER BY entries_fts.rank
LIMIT 50;
```

**AI-readiness decisions:**
- `content` is clean Markdown — LLMs parse Markdown natively
- `metadata` JSON column absorbs future fields without `ALTER TABLE`
- `embeddings` table supports multiple models simultaneously (entry-model-chunk triple)
- `chunk_index` handles long entries that exceed LLM context windows

---

## State Management Split

| State | Location | Reason |
|-------|----------|--------|
| Editor draft content | Zustand `editorStore` | Instant access every keystroke; not yet persisted |
| Is editor dirty | Zustand `editorStore` | Pure UI signal |
| Active entry ID | Zustand `editorStore` | Which entry is open |
| Active filters (tags, mood, date) | Zustand `filterStore` | Shared between SearchBar, Timeline, Calendar |
| Search query string | Zustand `filterStore` | Drives Timeline and SearchBar simultaneously |
| Theme, font size | Zustand `uiStore` | Must apply before DB loads |
| Timeline entries list | React Query cache | Server state — stale-while-revalidate |
| Tag list | React Query cache | Server state |
| Settings | SQLite → React Query | Persisted preferences |

**Auto-save implementation (dual-timer):**
```typescript
// Debounce catches pauses, interval catches long typing sessions
useEffect(() => {
  if (!isDirty) return;
  const timer = setTimeout(save, DEBOUNCE_MS); // 500ms after last keystroke
  return () => clearTimeout(timer);
}, [content]);

useEffect(() => {
  if (!isDirty) return;
  const interval = setInterval(save, autosaveInterval); // 5s fallback
  return () => clearInterval(interval);
}, [isDirty]);
```

Conflict resolution: single-user, single-window, local-only — last write wins.

---

## Component Architecture

**Timeline:**
```
TimelineView
├── FilterBar (reads filterStore, emits changes)
├── VirtualList (@tanstack/react-virtual, overscan=5)
│   ├── DaySeparator (injected as list items when date changes)
│   └── EntryCard
│       ├── EntryCardHeader (date, mood icon, tags)
│       ├── EntryCardPreview (150-char Markdown preview)
│       └── EntryCardExpanded (conditionally mounted)
└── InfiniteScrollTrigger (IntersectionObserver sentinel div)
```

Day separators are injected into the flat array before virtualizing — do not use sticky headers (complex with virtual lists).

**Calendar heatmap:** Entry count → intensity tier: `0=none, 1=light, 2-3=medium, 4+=dark`. Use CSS custom properties for colors (light/dark mode without JS logic).

**Editor — Markdown output (critical for AI readiness):**
```typescript
const editor = useEditor({
  extensions: [
    StarterKit,
    Markdown.configure({ html: false, transformPastedText: true }),
    Placeholder.configure({ placeholder: 'Start writing…' }),
    CharacterCount,
  ],
  onUpdate: ({ editor }) => {
    const markdown = editor.storage.markdown.getMarkdown();
    editorStore.setContent(markdown);
  },
});
```

**Rust project structure:**
```
src-tauri/src/
├── main.rs              (AppState init, tauri builder, handler registration)
├── state.rs             (AppState: tokio::sync::Mutex<Database>)
├── models/              (Entry, Tag, SearchResult — serde structs)
├── commands/            (thin #[tauri::command] handlers per domain)
├── db/                  (all SQL logic: entries, tags, search)
└── migrations/          (001_initial.sql — includes FTS5 + embeddings table)
```

---

## Build Order

**Phase 1 — Foundation**
1. Rust scaffold (project structure, models, AppState)
2. Database migrations (full schema — FTS5 triggers + embeddings table from day 1)
3. One IPC round-trip proof: `create_entry` + `get_entries` working
4. App Shell + routing skeleton

_Rationale: Schema mistakes are expensive to fix after data exists. FTS5 triggers must fire from entry #1._

**Phase 2 — Editor Core**
1. TipTap + tiptap-markdown extension
2. Auto-save (debounce + interval) + editorStore
3. Mood selector
4. TagInput (combobox) + tag creation inline
5. Word/char count

_Rationale: All views display what the editor produces. Get the save loop correct before building readers._

**Phase 3 — Timeline**
1. EntryCard (static)
2. Non-virtual timeline (validate data flow)
3. Swap to react-virtual
4. Infinite scroll (IntersectionObserver + React Query `fetchNextPage`)
5. Expand/collapse + day separators

**Phase 4 — Calendar View**
1. CalendarGrid render (static month)
2. Heatmap query (entry count per day) + intensity CSS
3. Month navigation
4. Date click → filterStore → timeline responds

**Phase 5 — Search and Filter**
1. Rust FTS5 search command
2. SearchBar + debounce
3. Search result rendering
4. Multi-select tag filter, mood filter, date range filter
5. Clear all filters

**Phase 6 — Settings and Export**
1. Settings persistence + startup read
2. Theme toggle, font size, autosave interval
3. JSON export (Rust serialization + Tauri save dialog)

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Tauri v2 IPC patterns | HIGH | v2 stable; tokio::Mutex pattern well-documented |
| SQLite FTS5 schema | HIGH | Official docs verified; external content + triggers confirmed |
| Zustand + React Query split | HIGH | Standard pattern |
| @tanstack/react-virtual for Timeline | HIGH | v3 is the standard |
| Auto-save conflict handling | HIGH | Single-user local — last-write-wins is correct |

**Key open question:** Validate Tauri v2 IPC serialization for nested structs (`Vec<Entry>` with embedded `Vec<Tag>`) early in Phase 1 before building on top of it.
