# Milestones

## v1.0 MVP (Shipped: 2026-04-18)

**Phases completed:** 6 phases, 23 plans, 34 tasks
**Timeline:** 2026-04-09 → 2026-04-17 (9 days)
**Code delivered:** ~9,252 LOC TypeScript/TSX, ~372 LOC Rust
**Requirements:** 45/45 v1.0 requirements shipped

**Key accomplishments:**

1. **Offline-first Tauri foundation** — Native desktop shell (Tauri v2 + React 19 + TypeScript + Vite) with AI-ready SQLite schema (embeddings table, UUID entry IDs, metadata JSON column, FTS5 triggers), Tailwind v3 pinned design system, shadcn/ui amber override, and zero-network-call guarantee verified.
2. **Rich journaling editor** — TipTap rich text with Markdown round-trip persistence, 5-level mood selector, on-the-fly tag creation with autocomplete + 8-color palette, configurable auto-save (500ms idle + every-N-seconds keepalive), bubble menu with 7 formatting controls, live word/character counts.
3. **Timeline & calendar browsing** — Keyset-paginated infinite scroll feed (no OFFSET), monthly calendar heatmap with color-intensity entry counts, inline entry expansion, day-level click-through filtering.
4. **Search, filters & On This Day** — FTS5 keyword search with highlighting and phrase-wrap escaping, multi-select date/tag/mood filters (AND semantics), prior-year "On This Day" memory surface.
5. **Production polish** — Photo attachments with local file storage (no base64 embed), PBKDF2-SHA256 (310k iterations) PIN lock with configurable idle auto-lock, full ZIP data export with JSON metadata, light/dark themes, three font sizes.
6. **Local-first AI** — Ollama HTTP client with health-check gate, async embedding generation, vector similarity semantic search, natural-language Q&A via RAG with UUID citation extraction, graceful keyword-fallback when Ollama unavailable.

**Gap-closure pass (2026-04-17):** Post-Phase-05, two UAT regressions were surfaced and fixed — UAT-01 (DB migration ordering: `idx_entries_local_date` had to move out of `MIGRATION_SQL` into a standalone `db.execute()` after the PRAGMA-guarded ALTER) and UAT-02 (`<TitleBar />` lifted out of `AppShell` Unlocked-only mount into a single App.tsx root mount so Min/Max/Close render in every app state).

---

