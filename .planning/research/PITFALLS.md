# Pitfalls Research: MemoryLane

**Project:** MemoryLane — Tauri + React + SQLite desktop journaling app
**Researched:** 2026-04-09
**Confidence:** MEDIUM — training knowledge through August 2025; web verification unavailable

---

## Critical (Will break you)

### C1: SQLite "database is locked" under concurrent async Tauri commands

**What goes wrong:** Tauri command handlers run concurrently by default. Auto-save fires while a search query is in flight → SQLite returns `SQLITE_BUSY`. Silent data loss if the save fails without propagating the error.

**Warning signs:** Intermittent save failures; "database is locked" in stderr during rapid typing; stale search results immediately after save.

**Prevention:**
1. Enable WAL mode at DB init: `PRAGMA journal_mode=WAL;`
2. Set busy timeout: `PRAGMA busy_timeout=5000;`
3. Serialize writes through a single Tokio `Mutex`-wrapped connection
4. Debounce saves at 500ms (already planned) and cancel in-flight saves before issuing new ones
5. Never silently swallow save errors — return them to the UI

**Phase to address:** Phase 1, day 1 — in DB initialization code.

---

### C2: Tauri v2 capability system — commands silently denied

**What goes wrong:** Tauri v2 replaced v1's `allowlist` with capability-based permissions. Every plugin command must be explicitly granted in `.tauri/capabilities/*.json`. Missing capabilities return "Not allowed" at runtime, not at compile time.

**Warning signs:** `invoke()` returns `"Not allowed"` or `"IPC permission denied"`; plugin works in simple test but fails from main window.

**Prevention:**
1. After adding any plugin, immediately add its capability entry in the same commit
2. Use `cargo tauri add <plugin>` — scaffolds both Rust dep and capability JSON
3. Checklist per plugin: Cargo.toml → `lib.rs` `.plugin()` call → capability JSON → integration test

**Phase to address:** Phase 1 — establish capability file structure before any feature commands.

---

### C3: TipTap ↔ Markdown round-trip data corruption

**What goes wrong:** TipTap's internal model is ProseMirror JSON, not Markdown. The Markdown extension conversion is lossy for nested lists, combined emphasis (`***bold italic***`), and custom node types. Round-trip bugs can slowly corrupt content across multiple saves.

**Warning signs:** Nested lists flatten after save/reload; `***bold italic***` loses formatting; custom nodes disappear.

**Prevention:**
1. Write a round-trip test at project start: serialize complex document → Markdown → parse back → serialize again → assert strings are identical
2. Store tags in `entry_tags` table, NOT embedded in Markdown — avoids custom node round-trip entirely
3. Consider storing both `content_markdown` (for AI) and `content_json` (for editor fidelity) with divergence check

**Phase to address:** Phase 1 — define and test the storage contract before writing the first save command.

---

### C4: macOS notarization blocking app launch entirely

**What goes wrong:** Un-notarized apps are quarantined by Gatekeeper. Users get "malicious software" warning and cannot open the app without a manual System Settings override.

**Warning signs:** "cannot be opened because it is from an unidentified developer" on test machines; `.dmg` works on dev machine but fails everywhere else.

**Prevention:**
1. Join Apple Developer Program and create Developer ID Application certificate before first distribution build
2. Configure `bundle.macOS.signingIdentity` and `bundle.macOS.notarization` in `tauri.conf.json`
3. Enable hardened runtime: `"hardened-runtime": true` in bundle config
4. Test on a clean macOS VM before any external distribution

**Phase to address:** Before first external distribution — not Phase 2.

---

### C5: Windows SmartScreen false positives

**What goes wrong:** New Tauri `.exe` installers without EV code signing trigger SmartScreen: "Windows protected your PC." For a privacy-focused app, this warning destroys trust before first launch.

**Prevention:**
1. Sign with minimum OV certificate; EV strongly recommended (builds reputation faster)
2. EV certificate issuance takes 1-2 weeks — purchase early
3. Consider winget submission after release to build reputation

**Phase to address:** Distribution phase — purchase certificate well before distribution milestone.

---

## Important (Will slow you down)

### I1: FTS5 special character escaping crashes search

**What goes wrong:** FTS5's `MATCH` operator interprets user input: `*`, `"`, `-`, `^`, `(`, `)` have special meaning. Common journal content (`c++`, `:(`, `*sigh*`) throws parse errors.

**Warning signs:** Search for `c++` throws `fts5: syntax error near "+"`.

**Prevention:**
1. Wrap user input in double quotes: `MATCH '"user input here"'`
2. For prefix/live search, strip FTS5 operators, then append `*` to last token only
3. Handle empty input explicitly — empty MATCH is a syntax error
4. Test suite for edge cases: empty string, only special chars, CJK, very long inputs

**Phase to address:** Before writing the first FTS query.

---

### I2: FTS5 tokenizer choice affects multilingual search

**What goes wrong:** Default `unicode61` tokenizer doesn't segment CJK text. Users writing in Chinese/Japanese/Korean get zero search results.

**Prevention:**
1. For v1 MVP, document this limitation explicitly
2. If CJK support needed, use `trigram` tokenizer (SQLite 3.34+): `tokenize='trigram'` — enables substring search for all scripts. Also improves English partial-word search.
3. Changing tokenizers requires dropping and recreating the FTS index — decide before initial schema migration

**Phase to address:** Schema design — choose tokenizer before creating the FTS virtual table.

---

### I3: Auto-save race condition — entry deleted while save is in-flight

**What goes wrong:** User opens entry, types (debounced save queued), deletes entry, then debounced save fires against now-invalid ID — either recreates a ghost entry or throws a foreign key error.

**Warning signs:** "Deleted" entries reappearing; foreign key constraint failures after delete.

**Prevention:**
1. Cancel pending debounced save in the delete handler — clear the timer before issuing DELETE SQL
2. Cancel pending save in editor component's unmount cleanup
3. Use soft deletes (`deleted_at TIMESTAMP NULL`) — makes accidental resurrection recoverable
4. In Rust save command: `UPDATE ... WHERE id = ? AND deleted_at IS NULL` — save against soft-deleted entry is a no-op

**Phase to address:** Auto-save implementation — design the cancellation contract before wiring up debounce.

---

### I4: Tauri v2 window drag regions conflict with interactive components

**What goes wrong:** `data-tauri-drag-region` intercepts mousedown events for dragging. Buttons and inputs inside a drag region become partially or fully non-functional.

**Warning signs:** Buttons in title bar require double-clicks; dropdowns open then close immediately; text inputs can't be focused by clicking.

**Prevention:**
1. Never apply `data-tauri-drag-region` to elements that contain or overlap interactive controls
2. Structure: `[drag-region spacer | title] [button group]` — drag attribute only on spacer/title
3. Test on all three platforms — behavior differs between macOS/Windows/Linux webview

**Phase to address:** UI shell implementation — design window chrome before building header components.

---

### I5: Windows path separators in file system operations

**What goes wrong:** Manual path string construction on Windows fails with backslashes or spaces.

**Prevention:**
1. Always use Tauri's path plugin APIs — never manual string concatenation
2. Rust side: always `std::path::PathBuf` and `.join()` — never string interpolation
3. Test all file I/O on Windows specifically

**Phase to address:** Database initialization.

---

### I6: Infinite scroll OFFSET pagination degrades at scale

**What goes wrong:** `LIMIT N OFFSET M` forces SQLite to scan and discard M rows. For thousands of entries, scrolling deep into history becomes noticeably slow.

**Prevention:**
1. Use keyset pagination from day one: `WHERE created_at < ? ORDER BY created_at DESC LIMIT N`
2. Add index on `created_at` from day one
3. "Jump to date" (calendar click) issues a fresh keyset query anchored at that date
4. Add composite index `(created_at DESC, id)` to handle timestamp ties

**Phase to address:** Timeline view — use keyset pagination from the first query. Retrofitting later requires changing the React virtual list's data model.

---

### I7: Calendar heatmap re-querying on every navigation

**What goes wrong:** Querying entry counts per day on every month navigation adds visible lag on slower hardware.

**Prevention:**
1. Query full per-day count once at app start: `SELECT date(created_at/1000,'unixepoch') AS day, COUNT(*) AS count FROM entries GROUP BY day` — at most ~365 rows/year, safe to hold in memory
2. Cache in Zustand; update incrementally on new entry creation
3. Memoize month grid computation with `useMemo`

**Phase to address:** Calendar view implementation.

---

### I8: TipTap undo history leaking between entries

**What goes wrong:** Navigating between entries and calling `editor.commands.setContent()` on the same instance preserves undo history from the previous entry. Ctrl+Z in a new entry reverts previous entry's content.

**Prevention:**
1. After `setContent()`, call `editor.commands.clearHistory()`
2. Or use `setContent(newContent, false)` then `clearHistory()`

**Phase to address:** Editor implementation — test undo behavior across entry navigation before shipping.

---

## Nice to Know

### N1: Linux file dialog requires system dependencies
Tauri's file dialog on Linux requires `zenity` (GTK) or `kdialog` (KDE). Document the dependency; consider text input fallback for export.

### N2: FTS5 `bm25()` ranking — lower is better (counterintuitive)
`bm25()` returns negative numbers. More relevant = more negative. `ORDER BY bm25() ASC` (ascending) gives best-first — correct but looks wrong. Add a comment to every FTS query.

### N3: App version must stay in sync
Tauri v2 pulls version from `Cargo.toml`. Write a `version-bump` script that updates `Cargo.toml`, `package.json`, and `tauri.conf.json` atomically.

### N4: shadcn/ui Popover/DropdownMenu z-index in Tauri webview
Radix UI's portal mechanism can render behind window decorations. Add to global CSS on day one:
```css
[data-radix-popper-content-wrapper] { z-index: 9999; }
```
Test all dropdown/popover components on all three platforms.

### N5: UUID PKs for Phase 2 AI embedding compatibility
Auto-increment integer IDs create subtle bugs when an embeddings table arrives (ID collisions on export/reimport). Use `TEXT PRIMARY KEY` with UUID v4 from day one in the schema.

### N6: Tauri updater requires a hosted signed manifest
When auto-update is added, generate the keypair immediately and store the private key in both a password manager and a secrets manager. Losing it means users must manually reinstall.

---

## Phase-Specific Warnings Summary

| Phase | Likely Pitfall | Mitigation |
|-------|---------------|------------|
| DB initialization | SQLite locked, wrong Windows path, UUID PKs | WAL + busy_timeout + keyset schema + UUID PKs on day 1 |
| Auto-save | Race on delete, undo history leak | Cancel pending saves on delete; clear TipTap history on load |
| Search / FTS5 | Special char crashes, bm25 direction, CJK | Escape input; document CJK limit; `ORDER BY bm25() ASC` |
| UI shell | Drag region blocking buttons, popover z-index | Separate drag from interactive; global z-index CSS |
| Timeline | OFFSET pagination slowness at scale | Keyset pagination from day 1 |
| TipTap storage | Markdown round-trip corruption | Round-trip test before first auto-save |
| macOS distribution | Gatekeeper block | Apple Developer cert + hardened runtime before first build |
| Windows distribution | SmartScreen for privacy-focused users | OV/EV signing before public release |
| Phase 2 AI | INT PKs incompatible with embeddings | UUID TEXT PKs from Phase 1 |
