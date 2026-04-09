# Stack Research: MemoryLane

**Project:** MemoryLane — privacy-first desktop journaling app
**Researched:** 2026-04-09
**Research method:** Training knowledge (cutoff Aug 2025). Confidence levels noted per section.

---

## Recommended Stack

### Core

#### Tauri v2 (not v1)

Use Tauri 2.x. Tauri v2 reached stable release in October 2024. v1 is in maintenance mode only.

Key reasons to use v2:
- Redesigned plugin system with proper capability declarations
- Scoped filesystem and IPC permissions via `capabilities/` JSON — matches a privacy-first app's security model
- `@tauri-apps/api` v2 has a cleaner TypeScript surface
- Mobile-ready architecture future-proofs Phase 2+

**Breaking changes from v1 (do not reference v1 tutorials):**
- `tauri.conf.json` schema changed — `tauri.allowlist` is gone, replaced by `capabilities/` directory
- `@tauri-apps/api` split: plugins moved to `@tauri-apps/plugin-*` packages
- File system API moved from `@tauri-apps/api/fs` to `@tauri-apps/plugin-fs`
- `beforeDevCommand` / `beforeBuildCommand` moved under `build` in config

Scaffold with:
```bash
npm create tauri-app@latest memorylane -- --template react-ts
```

This gives: Vite 5.x + React 18 + TypeScript 5.x (strict mode).

---

### Key Libraries

#### Database: `tauri-plugin-sql` v2

Use the official `tauri-plugin-sql` v2 from `tauri-apps/plugins-workspace`. It wraps `sqlx`/`rusqlite` and provides a ready-made TypeScript client.

**`Cargo.toml`:**
```toml
[dependencies]
tauri = { version = "2", features = [] }
tauri-plugin-sql = { version = "2", features = ["sqlite"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
```

**`main.rs`:**
```rust
fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::default().build())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

**Frontend:**
```typescript
import Database from "@tauri-apps/plugin-sql";
const db = await Database.load("sqlite:memorylane.db");
```

**Database file location** — use Tauri's `appDataDir()`:
```typescript
import { appDataDir } from "@tauri-apps/api/path";
const dir = await appDataDir();
// → %APPDATA%\memorylane on Windows
// → ~/Library/Application Support/memorylane on macOS
// → ~/.local/share/memorylane on Linux
```

#### FTS5 Setup (pure SQL — no extra library)

FTS5 is built into SQLite. Implement via virtual table + triggers:

```sql
CREATE VIRTUAL TABLE IF NOT EXISTS entries_fts USING fts5(
  content,
  content='entries',
  content_rowid='id',
  tokenize='unicode61'
);

-- Sync triggers
CREATE TRIGGER entries_ai AFTER INSERT ON entries BEGIN
  INSERT INTO entries_fts(rowid, content) VALUES (new.id, new.content);
END;
CREATE TRIGGER entries_au AFTER UPDATE ON entries BEGIN
  INSERT INTO entries_fts(entries_fts, rowid, content) VALUES ('delete', old.id, old.content);
  INSERT INTO entries_fts(rowid, content) VALUES (new.id, new.content);
END;
CREATE TRIGGER entries_ad AFTER DELETE ON entries BEGIN
  INSERT INTO entries_fts(entries_fts, rowid, content) VALUES ('delete', old.id, old.content);
END;

-- Search query
SELECT e.* FROM entries e
JOIN entries_fts fts ON e.id = fts.rowid
WHERE entries_fts MATCH ? ORDER BY rank;
```

**Linux FTS5 gotcha:** System SQLite on some Linux distros is compiled without FTS5. Add to `Cargo.toml`:
```toml
rusqlite = { version = "0.31", features = ["bundled"] }
```

#### Rich Text Editor: TipTap v2

```bash
npm install @tiptap/react @tiptap/pm @tiptap/starter-kit
npm install @tiptap/extension-placeholder
npm install @tiptap/extension-character-count
npm install @tiptap/extension-markdown
```

- `extension-markdown` — `editor.storage.markdown.getMarkdown()` returns clean Markdown for SQLite storage and future AI parsing
- **Store Markdown strings in SQLite, not ProseMirror JSON** — satisfies AI-readability constraint

Do NOT install `@tiptap/extension-collaboration` — pulls in Yjs (~200KB) for real-time collab; not needed.

#### State Management: Zustand v4

```bash
npm install zustand
```

Key stores:
- `useEntryStore` — current entry, draft content, auto-save state
- `useFilterStore` — search query, active tags, date range, mood filters
- `useSettingsStore` — theme, font size, auto-save interval (persist via `zustand/middleware` `persist`)

#### UI: shadcn/ui + Tailwind CSS v3

```bash
npm install tailwindcss@3 @tailwindcss/typography
npx shadcn@latest init
```

**Use Tailwind v3, not v4.** shadcn/ui compatibility with Tailwind v4 was incomplete as of mid-2025. Verify at `ui.shadcn.com` before scaffolding.

#### Other

- **Icons:** `lucide-react` (shadcn default)
- **Dates:** `date-fns` v3 (treeshakeable, TypeScript-native; do NOT use Moment.js)
- **Toast notifications:** `sonner`
- **Calendar heatmap:** `react-calendar-heatmap` (SVG, GitHub-contribution style) — verify React 18 compatibility
- **Virtual scroll:** `react-window` for timeline if >1000 entries

---

### Build and Distribution

Tauri v2 `tauri build` produces native installers:

| Platform | Output | Requirement |
|----------|--------|-------------|
| Windows | `.msi` + NSIS `.exe` | Code signing removes SmartScreen warning |
| macOS | `.dmg` + `.app` | Notarization required for Gatekeeper |
| Linux | `.deb`, `.AppImage`, `.rpm` | AppImage most portable |

**CI/CD:** GitHub Actions `tauri-apps/tauri-action` handles cross-platform matrix builds.

**macOS notarization:** Required before first public release — not a Phase 2 concern. Apple Developer account needed.

---

## What NOT to Use

| Thing | Why Not |
|-------|---------|
| Tauri v1 | Maintenance mode; config/plugin APIs differ from v2 |
| Electron | Larger binary, no Rust safety — the reason this project chose Tauri |
| Raw `rusqlite` with manual commands | `tauri-plugin-sql` already wraps this |
| TipTap 3.x (beta/RC as of Aug 2025) | Breaking API changes; verify if now stable |
| Tailwind CSS v4 | shadcn/ui compatibility incomplete as of mid-2025 |
| ProseMirror JSON storage | Store Markdown strings for AI readability |
| `localStorage` for journal data | Lost if WebView cache clears; use SQLite |
| Prisma | ORM overkill; raw SQL gives direct FTS5 access |
| `@tiptap/extension-collaboration` | Pulls in Yjs; single-user app doesn't need it |
| `@tauri-apps/api/fs` (v1 import path) | Renamed in v2 to `@tauri-apps/plugin-fs` |

---

## Confidence Notes

| Area | Confidence | Notes |
|------|------------|-------|
| Tauri v2 stable | HIGH | Released Oct 2024 |
| `tauri-plugin-sql` v2 | HIGH | Official plugin |
| FTS5 SQL patterns | HIGH | Stable SQLite feature |
| Linux bundled SQLite fix | HIGH | Known issue with documented fix |
| TipTap 2.x | MEDIUM | v3 was in beta as of Aug 2025; verify at tiptap.dev |
| shadcn + Tailwind v3 | MEDIUM | v4 compat in progress; verify at ui.shadcn.com |
| `react-calendar-heatmap` | LOW | Verify maintenance and React 18 compat |

**Verify before first commit:**
1. shadcn/ui Tailwind version requirement: `https://ui.shadcn.com/docs/installation`
2. TipTap stable version: `https://tiptap.dev`
3. Whether `tauri-plugin-sql` v2 includes bundled SQLite with FTS5
