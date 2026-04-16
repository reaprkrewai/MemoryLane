---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: Daily Driver
status: defining_requirements
last_updated: "2026-04-16T00:00:00Z"
progress:
  total_phases: 0
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State: Chronicle AI

## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Last activity: 2026-04-16 — Milestone v1.1 Daily Driver started

## Project Reference

See: .planning/PROJECT.md
**Core value:** A journaling app where you can eventually have AI understand your entries — and none of it ever touches the internet.

## Phase Status

(Phases will be created by the roadmapper for milestone v1.1.)

## Performance Metrics

- v1.0 shipped: 6 phases, 21 plans, 45 requirements (archived context below)
- v1.1 phases: pending roadmap
- v1.1 plans: pending

## Accumulated Context

### Decisions (carried over from v1.0)

- Granularity: Coarse (4-6 phases) — requirement clusters
- Tailwind v3 pinned (shadcn/ui v2.3.0 requires Tailwind v3; v4 breaks component compatibility)
- Amber accent override: `--color-accent #F59E0B` overrides shadcn default blue `--primary`
- Migration SQL inlined in db.ts — `?raw` import unreliable for files outside src/
- Multi-statement SQL splitter with BEGIN...END tracking handles FTS5 trigger bodies correctly
- Window controls placed outside `data-tauri-drag-region` to prevent mousedown interception
- TipTap v3 uses Floating UI for BubbleMenu (`options.placement`), not Tippy.js
- `editor.getMarkdown()` available on Editor directly via module augmentation
- Timer state stored as module-level variables outside Zustand — timers are not serializable
- `selectEntry` flushes pending saves before switching to prevent cross-entry data corruption
- TagRow placed outside scroll container — fixed at bottom as editor content grows
- Blur timeout 150ms on TagInput allows autocomplete onMouseDown to fire before input blur
- `onMouseDown + stopPropagation` prevents row onSelect from firing and blur race
- Native `<select>` used in MetadataBar for auto-save interval — fits 48px bar height
- CalendarCell uses native `disabled` for zero-count days (removes from tab order)
- TagPillReadOnly separate from TagPill — no Popover side effects on timeline cards
- Batch tag fetch via single SQL JOIN on allEntries change — avoids N+1 DB calls
- Phrase-wrap FTS5 MATCH input to prevent SQLite parse errors on special chars
- AND-semantics tag filter via `HAVING COUNT(DISTINCT tag_id)` — entries must have ALL selected tags
- Native HTML input in SearchFilterBar — follows TagInput.tsx pattern (no ui/input.tsx)
- `applyTheme()` and `applyFontScale()` as standalone DOM helpers from uiStore
- SettingsView rendered at App.tsx level alongside JournalView (not inside routing)
- PBKDF2-SHA256 (Web Crypto API, 310k iterations) for PIN — no argon2-browser needed
- `isPinSet` null guard in App.tsx prevents content flash during PIN state detection
- Web File System Access API (`showSaveFilePicker`) for data export — no Rust plugin setup
- Photo reading uses `convertFileSrc + fetch` instead of @tauri-apps/plugin-fs
- Ollama health check uses 3-second timeout; runs async at app startup, non-blocking
- Vector storage uses L2-normalized embeddings; cosine similarity via dot product
- Graceful fallback to keyword search when Ollama unavailable — no user-facing errors
- RAG pipeline retrieves top-K similar entries before LLM call; grounded system prompt
- Citation extraction uses UUID regex on `[Entry ID]` format; deduplicated before display
- Setup wizard triggered on AI mode selection when Ollama unavailable (non-blocking)

### Todos

- (none — v1.1 planning in progress)

### Blockers

- (none)

### Known UX Issue (carried from v1.0, non-blocking)

- Built-in AI download fails with os error 216 ("not compatible with Windows version") — llama-server.exe from ggml-org/llama.cpp/b3920 release may be corrupted on download or require VC++ Redistributables. Workaround: use External Ollama backend. See src-tauri/src/llama.rs:221 for binary URL.

### v1.0 Shipped Requirements (reference)

- EDIT-01 through EDIT-08, TAG-01 through TAG-04 — Editor & Tags
- TIME-01 through TIME-07, CAL-01 through CAL-04 — Timeline & Calendar
- SRCH-01 through SRCH-06, OTD-01, OTD-02 — Search & Discovery
- AI-01 through AI-03 — Schema AI-readiness
- MEDIA-01 through MEDIA-04, SEC-01 through SEC-03, SETT-01 through SETT-04 — Media, Security, Settings
- LLMAI-02 through LLMAI-04 — AI Features (semantic search, Q&A, setup wizard)

## Session Continuity

Last action: Milestone v1.1 "Daily Driver" started (2026-04-16)
- v1.0 MVP complete: 6 phases, 21 plans, 45 requirements shipped
- WIP dashboard components committed as checkpoint (commit b9af497)
- Phase 6 completion docs committed (commit 9636fbe)

Next action: Define v1.1 requirements → create roadmap

---

*Milestone v1.1 Daily Driver: scope gathered, PROJECT.md updated, STATE.md reset. Requirements next.*
