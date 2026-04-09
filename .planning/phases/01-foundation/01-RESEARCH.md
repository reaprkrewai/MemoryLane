# Phase 1: Foundation - Research

**Researched:** 2026-04-09
**Domain:** Tauri v2 + React + SQLite scaffolding, AI-ready schema, offline desktop app
**Confidence:** HIGH

---

## Summary

Phase 1 is a pure scaffolding and schema phase. The output is a native Tauri desktop window that opens, initializes a SQLite database with the full production schema (including the `embeddings` table and UUID primary keys), and displays an empty state — with zero network calls under any condition.

The project has substantial prior research in `.planning/research/` (STACK.md, ARCHITECTURE.md, PITFALLS.md) that is directly applicable. The tech stack is fully locked: Tauri v2, React 19 + TypeScript, Zustand, shadcn/ui with Tailwind CSS v3, and SQLite via `tauri-plugin-sql`. The UI design contract is fully specified in `01-UI-SPEC.md`. Nothing in Phase 1 involves the editor, timeline, search, or AI — those ship in subsequent phases.

The critical environment gap is Rust/Cargo — it is not installed on this machine. Installing the Rust toolchain is a blocking prerequisite that must be Wave 0 task 1. All other prerequisites (Node v24, Visual Studio 2022, WebView2 Runtime) are confirmed present on the system.

**Primary recommendation:** Install Rust first, scaffold the Tauri project with `npm create tauri-app@latest`, initialize the full SQLite schema in a single migration file, wire up shadcn/ui with the amber override, then implement the app shell and empty state exactly per the UI-SPEC.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AI-01 | Database schema includes an `embeddings` table from initial migration (empty in v1, populated in v2) | Full schema in ARCHITECTURE.md includes `embeddings` table with `entry_id`, `model`, `dimensions`, `vector BLOB`, `chunk_index` columns and proper FK cascade |
| AI-02 | All entry primary keys are UUID TEXT (not auto-increment integers) | Schema uses `id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16))))` — native SQLite UUID generation, no external lib required |
| AI-03 | Entries table includes a `metadata` JSON column for future fields without schema migrations | `metadata TEXT NOT NULL DEFAULT '{}'` defined on `entries` table — absorbs future location, weather, etc. without ALTER TABLE |
| SETT-04 | App works 100% offline — no network calls, no telemetry, no analytics | Verified: Tauri v2 has no built-in telemetry; `tauri-plugin-sql` is pure local SQLite; no CDN fonts in config; Inter must be bundled or use system-stack fallback |
</phase_requirements>

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Tauri | 2.x (CLI: 2.10.1) | Native desktop shell, IPC, file system | Project decision; v2 stable since Oct 2024 |
| React | 19.2.5 | Frontend UI framework | Project decision |
| TypeScript | 6.0.2 | Type safety | Project decision |
| Vite | 8.0.8 | Dev server + bundler (comes with Tauri scaffold) | Ships with `npm create tauri-app` template |
| `tauri-plugin-sql` | 2.4.0 (npm) | SQLite access from frontend | Official Tauri plugin; wraps rusqlite |
| Zustand | 5.0.12 | UI state (theme, loading state) | Project decision; zero boilerplate |
| shadcn/ui | 4.2.0 | Component primitives | Project decision per UI-SPEC |
| Tailwind CSS | **v3 only** (latest: 3.4.19) | Utility CSS | shadcn/ui requires v3; do NOT use v4 |
| lucide-react | 1.8.0 | Icons | shadcn/ui default; specified in UI-SPEC |
| sonner | 2.0.7 | Toast notifications | Specified in UI-SPEC for DB init feedback |

### Rust Crates (src-tauri/Cargo.toml)

| Crate | Version | Purpose |
|-------|---------|---------|
| tauri | "2" | Core framework |
| tauri-plugin-sql | "2", features=["sqlite"] | SQLite backend |
| serde | "1", features=["derive"] | Struct serialization |
| serde_json | "1" | JSON for metadata column |
| uuid | "1", features=["v4"] | Optional — SQLite `randomblob` is sufficient for UUID PKs without extra crate |

**Installation (frontend):**
```bash
# 1. Install Rust toolchain (BLOCKING — must be first)
# https://rustup.rs — installs rustc, cargo, rustup
# Windows: download and run rustup-init.exe

# 2. Scaffold Tauri app
npm create tauri-app@latest memorylane -- --template react-ts
cd memorylane

# 3. Add Tauri SQL plugin
npm install @tauri-apps/plugin-sql
cargo add tauri-plugin-sql --features sqlite  # in src-tauri/

# 4. Add UI stack
npm install tailwindcss@3 @tailwindcss/typography autoprefixer postcss
npx shadcn@latest init
npm install lucide-react sonner zustand
```

**Version verification (confirmed 2026-04-09 against npm registry):**
- `tailwindcss` latest v3: 3.4.19
- `@tauri-apps/api`: 2.10.1
- `@tauri-apps/plugin-sql`: 2.4.0
- `zustand`: 5.0.12
- `sonner`: 2.0.7
- `lucide-react`: 1.8.0
- `shadcn` CLI: 4.2.0

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Tailwind v3 | Tailwind v4 | v4 breaks shadcn/ui; do not upgrade until shadcn officially supports it |
| `tauri-plugin-sql` | Raw rusqlite commands | Plugin is official + typed TS client; raw gives more control but requires more Rust boilerplate |
| shadcn/ui | Other UI libs | Locked by project decision and UI-SPEC |

---

## Architecture Patterns

### Recommended Project Structure

```
memorylane/
├── src/                          # React frontend
│   ├── App.tsx                   # Root: AppShell + router
│   ├── components/
│   │   ├── AppShell.tsx          # Two-column layout (sidebar + main)
│   │   ├── Sidebar.tsx           # Nav rail with 4 items
│   │   ├── TitleBar.tsx          # Custom drag region (40px)
│   │   └── EmptyState.tsx        # First-launch content
│   ├── lib/
│   │   ├── db.ts                 # Database.load() singleton
│   │   └── ipc/
│   │       └── settings.ts       # IPC wrappers (Phase 1: minimal)
│   ├── stores/
│   │   └── uiStore.ts            # theme, isDbReady, dbError
│   ├── styles/
│   │   └── globals.css           # CSS variables, Tailwind directives
│   └── main.tsx
├── src-tauri/
│   ├── src/
│   │   ├── main.rs               # AppState, builder, plugin registration
│   │   ├── state.rs              # AppState struct
│   │   ├── db/
│   │   │   └── mod.rs            # DB init, migration runner
│   │   └── migrations/
│   │       └── 001_initial.sql   # Full schema: all tables + FTS5 + embeddings
│   ├── capabilities/
│   │   └── default.json          # sql plugin permissions
│   └── tauri.conf.json
├── tailwind.config.js            # v3 config with custom tokens
└── components.json               # shadcn config
```

### Pattern 1: Database Initialization on App Start

**What:** Frontend loads DB via `tauri-plugin-sql`, runs migration SQL, signals ready via Zustand.
**When to use:** Every app launch — migration SQL uses `CREATE TABLE IF NOT EXISTS` so it is idempotent.

```typescript
// src/lib/db.ts
import Database from "@tauri-apps/plugin-sql";

let _db: Database | null = null;

export async function getDb(): Promise<Database> {
  if (_db) return _db;
  _db = await Database.load("sqlite:memorylane.db");
  return _db;
}

// src/App.tsx (simplified)
useEffect(() => {
  getDb()
    .then(() => uiStore.setDbReady(true))
    .catch((err) => uiStore.setDbError(String(err)));
}, []);
```

### Pattern 2: Tauri v2 Capability Declaration

**What:** Every plugin command must be explicitly allowed in capabilities JSON. Missing entries = silent "Not allowed" at runtime.
**When to use:** After every `cargo tauri add <plugin>`.

```json
// src-tauri/capabilities/default.json
{
  "identifier": "default",
  "description": "Default capability",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "sql:default",
    "sql:allow-execute",
    "sql:allow-select",
    "sql:allow-load"
  ]
}
```

### Pattern 3: Custom Title Bar (Tauri v2)

**What:** Remove native title bar; use a `data-tauri-drag-region` div as the drag surface.
**When to use:** Required per UI-SPEC (40px custom title bar).

```json
// tauri.conf.json — under windows[0]
{
  "decorations": false,
  "titleBarStyle": "Overlay"
}
```

```tsx
// TitleBar.tsx
<div
  data-tauri-drag-region
  className="h-10 bg-surface flex items-center select-none"
>
  <span className="text-muted text-label px-4">Chronicle</span>
</div>
```

**Critical:** Never put buttons or inputs inside the drag region div. See Pitfall I4.

### Pattern 4: shadcn/ui Amber Override

**What:** Override shadcn's default blue accent with amber immediately after init.
**When to use:** First thing after `npx shadcn@latest init`.

```css
/* src/styles/globals.css — add immediately after @tailwind directives */
:root {
  --color-bg: #FAFAF9;
  --color-surface: #F0EFED;
  --color-accent: #F59E0B;
  --color-text: #1C1B1A;
  --color-text-muted: #6B7280;
  --color-border: #E5E3DF;
  --color-destructive: #DC2626;
  /* Override shadcn default blue */
  --primary: #F59E0B;
  --primary-foreground: #1C1B1A;
}

.dark {
  --color-bg: #111110;
  --color-surface: #1C1B1A;
  --color-accent: #F59E0B;
  --color-text: #FAFAF9;
  --color-text-muted: #9CA3AF;
  --color-border: #2A2927;
  --color-destructive: #EF4444;
}
```

### Pattern 5: SQLite Schema Migration (idempotent, single file)

**What:** One migration file containing the full Phase 1 schema. All tables created with `IF NOT EXISTS`. Loaded at app start.

See full schema in `## Code Examples` below.

### Anti-Patterns to Avoid

- **Auto-increment integer PKs on entries:** Breaks AI-readability and Phase 2 embedding compatibility. Use `TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16))))`.
- **Tailwind v4:** shadcn/ui requires v3. Install `tailwindcss@3` explicitly.
- **Interactive elements inside drag region:** Mouse events intercepted; buttons become non-functional.
- **Fetching fonts from Google Fonts or CDN:** Violates SETT-04 (offline guarantee). Use system font stack: `Inter, ui-sans-serif, system-ui, sans-serif` — or bundle Inter as a local font file.
- **Using `@tauri-apps/api/fs` (v1 path):** Renamed in v2. Use `@tauri-apps/plugin-fs` instead.
- **localStorage for any persistent data:** Cleared when WebView cache resets. Use SQLite.
- **Applying `data-tauri-drag-region` to a container that wraps buttons:** Buttons will only partially work. See I4.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SQLite access from frontend | Custom Rust commands exposing raw SQL | `tauri-plugin-sql` | Official plugin with typed TS client; handles connection management |
| UUID generation | Custom random string | `lower(hex(randomblob(16)))` in SQLite DEFAULT | Built into SQLite; no extra dependency |
| Toast notifications | Custom toast component | `sonner` | Specified in UI-SPEC; handles positioning, animation, accessibility |
| Icon set | Custom SVGs | `lucide-react` | shadcn default; consistent stroke weight; tree-shakeable |
| App data directory path | `process.env.APPDATA` string concat | `appDataDir()` from `@tauri-apps/api/path` | Cross-platform; handles Windows/macOS/Linux differences |

**Key insight:** Phase 1 is scaffolding — nearly every problem is already solved by the Tauri plugin ecosystem and shadcn/ui. Custom code should be minimal.

---

## Common Pitfalls

### Pitfall 1: Rust Not Installed (BLOCKING for this machine)
**What goes wrong:** `npm create tauri-app` scaffolds the project but `npm run tauri dev` fails immediately because `cargo` is not in PATH.
**Why it happens:** Rust is not installed on this machine (confirmed by environment audit).
**How to avoid:** Install Rust toolchain via `rustup-init.exe` from https://rustup.rs before any Tauri command. After install, restart the terminal/shell to get updated PATH.
**Warning signs:** `cargo: command not found` or `'cargo' is not recognized as an internal or external command`.

### Pitfall 2: Tauri v2 Capability System — Silent Denials
**What goes wrong:** `tauri-plugin-sql` commands return "Not allowed" at runtime even though the plugin is in `Cargo.toml`.
**Why it happens:** Tauri v2 requires explicit capability grants in `capabilities/*.json`. No grant = denied at IPC boundary without compile-time error.
**How to avoid:** After adding any plugin, immediately add its permissions to `capabilities/default.json` in the same commit. Use `cargo tauri add sql --features sqlite` — the CLI scaffolds both the dep and a starter capability file.
**Warning signs:** `invoke()` rejects with "Not allowed" or "IPC permission denied".

### Pitfall 3: Google Fonts / CDN Font Breaking Offline Guarantee
**What goes wrong:** The default Vite React template often includes a Google Fonts `<link>` in `index.html`. The app makes a network call on every launch, violating SETT-04.
**Why it happens:** Template boilerplate; not Tauri-specific.
**How to avoid:** Audit `index.html` immediately after scaffold. Remove any `<link rel="stylesheet" href="https://fonts.googleapis.com/...">`. Use the system-stack font: `Inter, ui-sans-serif, system-ui, sans-serif` — this works perfectly on Windows (has Segoe UI), macOS (has SF Pro), and Linux (has Noto). Optionally bundle Inter as a WOFF2 file in `src/assets/`.
**Warning signs:** Network tab shows any outbound request on app launch; dev tools "Offline" simulation breaks fonts.

### Pitfall 4: Integer Auto-Increment PKs Leaking into Schema
**What goes wrong:** Developer uses `INTEGER PRIMARY KEY AUTOINCREMENT` on `entries` table. Phase 2 AI embedding work requires stable, globally unique text IDs that survive import/export.
**Why it happens:** Auto-increment is the SQLite default many developers reach for.
**How to avoid:** All PKs in this schema use `TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16))))`. There is no `INTEGER PRIMARY KEY AUTOINCREMENT` anywhere. Verify by inspecting `.schema entries` after migration.
**Warning signs:** `PRAGMA table_info(entries)` shows `id INTEGER` instead of `id TEXT`.

### Pitfall 5: Data-Tauri-Drag-Region Eating Button Clicks
**What goes wrong:** A button placed inside or overlapping the `data-tauri-drag-region` div requires double-click or doesn't respond at all. On macOS the behavior differs from Windows.
**Why it happens:** The drag region intercepts `mousedown` events before the button sees them.
**How to avoid:** The drag region is a pure spacer `div` — no buttons, inputs, or links inside it. Layout: `[drag-region-spacer flex-1] [window-controls]`. The window controls (`-`, `□`, `×`) sit outside the drag region.
**Warning signs:** Buttons in the title bar feel unresponsive; require double-click on macOS.

### Pitfall 6: WAL Mode Not Enabled Before First Write
**What goes wrong:** Default SQLite journal mode (`DELETE`) causes `SQLITE_BUSY` errors when concurrent Tauri commands attempt to read and write simultaneously — even with a single user.
**Why it happens:** Tauri command handlers execute concurrently on the Tokio runtime.
**How to avoid:** First statement in the migration (before any `CREATE TABLE`) must be:
```sql
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 5000;
```
**Warning signs:** "database is locked" in Rust stderr; DB init works in isolation but fails under normal app use.

---

## Code Examples

Verified from `.planning/research/ARCHITECTURE.md` (internal project research):

### Full Phase 1 SQLite Schema (001_initial.sql)

```sql
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
PRAGMA synchronous = NORMAL;
PRAGMA busy_timeout = 5000;

CREATE TABLE IF NOT EXISTS entries (
    id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    content     TEXT NOT NULL DEFAULT '',
    mood        TEXT CHECK(mood IN ('great','good','okay','bad','awful')) NULL,
    word_count  INTEGER NOT NULL DEFAULT 0,
    char_count  INTEGER NOT NULL DEFAULT 0,
    created_at  INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
    updated_at  INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
    metadata    TEXT NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_entries_created_at ON entries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_entries_mood ON entries(mood) WHERE mood IS NOT NULL;

CREATE TABLE IF NOT EXISTS tags (
    id         TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name       TEXT NOT NULL UNIQUE COLLATE NOCASE,
    color      TEXT NOT NULL DEFAULT '#6B7280',
    created_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000)
);

CREATE TABLE IF NOT EXISTS entry_tags (
    entry_id TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
    tag_id   TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (entry_id, tag_id)
);
CREATE INDEX IF NOT EXISTS idx_entry_tags_tag_id ON entry_tags(tag_id);

CREATE VIRTUAL TABLE IF NOT EXISTS entries_fts USING fts5(
    content,
    content     = 'entries',
    content_rowid = 'rowid',
    tokenize    = 'unicode61 remove_diacritics 1'
);

CREATE TRIGGER IF NOT EXISTS entries_fts_ai AFTER INSERT ON entries BEGIN
    INSERT INTO entries_fts(rowid, content) VALUES (new.rowid, new.content);
END;
CREATE TRIGGER IF NOT EXISTS entries_fts_ad AFTER DELETE ON entries BEGIN
    INSERT INTO entries_fts(entries_fts, rowid, content)
    VALUES ('delete', old.rowid, old.content);
END;
CREATE TRIGGER IF NOT EXISTS entries_fts_au AFTER UPDATE OF content ON entries BEGIN
    INSERT INTO entries_fts(entries_fts, rowid, content)
    VALUES ('delete', old.rowid, old.content);
    INSERT INTO entries_fts(rowid, content) VALUES (new.rowid, new.content);
END;

-- AI Readiness: empty in v1, populated in v2
CREATE TABLE IF NOT EXISTS embeddings (
    id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    entry_id    TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
    model       TEXT NOT NULL,
    dimensions  INTEGER NOT NULL,
    vector      BLOB NOT NULL,
    chunk_index INTEGER NOT NULL DEFAULT 0,
    created_at  INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
    UNIQUE(entry_id, model, chunk_index)
);
CREATE INDEX IF NOT EXISTS idx_embeddings_entry_id ON embeddings(entry_id);

CREATE TABLE IF NOT EXISTS settings (
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL,
    updated_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000)
);
INSERT OR IGNORE INTO settings(key, value) VALUES
    ('theme',             '"system"'),
    ('font_size',         '"medium"'),
    ('autosave_interval', '5000');
```

### Tailwind v3 Config with Custom Tokens

```javascript
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg:          'var(--color-bg)',
        surface:     'var(--color-surface)',
        accent:      'var(--color-accent)',
        text:        'var(--color-text)',
        muted:       'var(--color-text-muted)',
        border:      'var(--color-border)',
        destructive: 'var(--color-destructive)',
      },
      fontSize: {
        label:   ['12px', { lineHeight: '1.4' }],
        body:    ['14px', { lineHeight: '1.5' }],
        heading: ['20px', { lineHeight: '1.2', fontWeight: '600' }],
        display: ['28px', { lineHeight: '1.15', fontWeight: '600' }],
      },
    },
  },
  plugins: [],
};
```

### App Shell Layout (AppShell.tsx)

```tsx
// Two-column layout per UI-SPEC
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-screen bg-bg text-text">
      <TitleBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto bg-bg">
          {children}
        </main>
      </div>
    </div>
  );
}
```

### uiStore (Zustand)

```typescript
// src/stores/uiStore.ts
import { create } from 'zustand';

interface UIState {
  isDbReady: boolean;
  dbError: string | null;
  setDbReady: (ready: boolean) => void;
  setDbError: (err: string) => void;
}

export const useUiStore = create<UIState>((set) => ({
  isDbReady: false,
  dbError: null,
  setDbReady: (ready) => set({ isDbReady: ready }),
  setDbError: (err) => set({ dbError: err }),
}));
```

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Vite dev server, npm | Yes | v24.13.1 | — |
| Rust / Cargo | Tauri compilation | **No** | — | **None — must install** |
| Visual Studio 2022 (MSVC) | Rust Windows target | Yes | 2022 | — |
| WebView2 Runtime | Tauri window rendering | Yes | Present | — |
| npm | Package management | Yes | (via Node 24) | — |

**Missing dependencies with no fallback:**
- **Rust / Cargo:** Tauri requires Rust to compile `src-tauri`. No workaround exists. Install via `rustup-init.exe` from https://rustup.rs before any `tauri dev` or `tauri build` command. This is Wave 0 task 1.

**Missing dependencies with fallback:**
- None beyond Rust.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Tauri v1 allowlist | Tauri v2 capabilities JSON | Oct 2024 | All v1 tutorials are wrong; `allowlist` key is gone |
| `@tauri-apps/api/fs` | `@tauri-apps/plugin-fs` | Tauri v2 | Different import path; v1 code breaks |
| INTEGER PK auto-increment | TEXT PRIMARY KEY UUID | Phase 1 requirement | Required for AI embedding compatibility (AI-02) |
| Google Fonts CDN | System font stack / bundled | SETT-04 requirement | No network calls allowed |
| Tailwind v4 | Tailwind v3 (intentionally pinned) | — | shadcn/ui requires v3; do not upgrade |

**Deprecated/outdated:**
- Tauri v1 `tauri.conf.json` `allowlist` section: removed in v2; replaced by `capabilities/`
- `@tauri-apps/api/fs` import path: use `@tauri-apps/plugin-fs` in v2

---

## Open Questions

1. **Inter font bundling vs system stack**
   - What we know: SETT-04 forbids network calls. Google Fonts CDN would violate this. UI-SPEC specifies `Inter, ui-sans-serif, system-ui, sans-serif`.
   - What's unclear: Whether the system font stack looks acceptable enough on Windows (Segoe UI fallback) or if Inter WOFF2 should be bundled in `src/assets/`.
   - Recommendation: Start with the system-stack fallback (zero work, zero network calls). Bundle Inter only if the visual difference is noticeable in review. Both approaches are offline-safe.

2. **Tauri `randomblob(16)` UUID format**
   - What we know: `lower(hex(randomblob(16)))` produces 32 hex chars (e.g., `a1b2c3d4e5f6...`). This is not RFC 4122 UUID format.
   - What's unclear: Whether Phase 2 AI tooling will expect hyphenated UUID v4 format or accept any unique text ID.
   - Recommendation: The current schema is fine for v1. If Phase 2 requires standard UUID format, the entries can be migrated. Do not add a `uuid` Rust crate dependency for Phase 1 — it is unnecessary complexity.

---

## Validation Architecture

`nyquist_validation` is set to `false` in `.planning/config.json`. This section is skipped per configuration.

---

## Sources

### Primary (HIGH confidence)
- `.planning/research/STACK.md` — full stack research from 2026-04-09, training knowledge Aug 2025
- `.planning/research/ARCHITECTURE.md` — full schema + IPC patterns, project-internal
- `.planning/research/PITFALLS.md` — critical pitfalls catalogue, project-internal
- `.planning/phases/01-foundation/01-UI-SPEC.md` — UI design contract, fully specified
- npm registry (live, 2026-04-09) — package versions for tailwindcss@3, zustand, sonner, lucide-react, @tauri-apps/api, @tauri-apps/plugin-sql, shadcn

### Secondary (MEDIUM confidence)
- Environment probe (live, 2026-04-09) — Node v24.13.1 present, Rust absent, VS 2022 present, WebView2 present

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — package versions verified against npm registry live
- Architecture: HIGH — patterns pulled from existing project research (ARCHITECTURE.md) which traced Tauri v2 IPC and SQLite schema patterns
- Pitfalls: HIGH — environment audit confirmed blocking Rust gap; pitfalls from PITFALLS.md are internally consistent with Tauri v2 docs

**Research date:** 2026-04-09
**Valid until:** 2026-05-09 (Tauri and shadcn move fast; re-verify if more than 30 days pass)
