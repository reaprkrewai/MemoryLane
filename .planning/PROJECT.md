# MemoryLane

## What This Is

MemoryLane is a privacy-first desktop journaling app built with Tauri (Rust + React). Everything stays local — no cloud, no network calls, no third-party services. It's a rock-solid journaling foundation designed to eventually support local LLM integration (Ollama/llama.cpp), letting users run AI over their private journal data without their thoughts ever leaving their device.

## Core Value

A journaling app where you can eventually have AI understand your entries — and none of it ever touches the internet.

## Requirements

### Validated

**AI Readiness (schema-level) — Validated in Phase 1: Foundation**
- [x] Schema structured to support future embeddings table without migration pain (AI-01)
- [x] Entry content stored with UUID TEXT PKs and metadata JSON column (AI-02, AI-03)
- [x] Zero network calls enforced at capability level — SETT-04 verified

### Active

**Core Journal**
- [ ] User can create entries with rich text (TipTap/Markdown WYSIWYG)
- [ ] User can assign a mood to each entry (great / good / okay / bad / awful)
- [ ] User can add/remove tags on entries with autocomplete
- [ ] Entries auto-save every 5 seconds (debounced 500ms on change)
- [ ] User can edit and delete existing entries
- [ ] Word count and character count display while writing

**Timeline View**
- [ ] User can view entries in reverse-chronological timeline with infinite scroll
- [ ] Each entry card shows date, mood, tags, word count, and 150-char preview
- [ ] User can expand/collapse full entry inline
- [ ] Visual separator between days

**Calendar View**
- [ ] User can view a monthly calendar heatmap (color intensity = entry count)
- [ ] Clicking a date filters the timeline to entries on that day
- [ ] Month/year navigation with "Today" shortcut

**Search & Filter**
- [ ] Full-text search across all entry content (SQLite FTS5)
- [ ] Filter by date range, tags (multi-select), mood (multi-select)
- [ ] Matching text highlighted in search results
- [ ] Clear all filters in one action

**Tag Management**
- [ ] Tags created inline while writing (on-the-fly)
- [ ] Tag color picker (8 preset colors)
- [ ] Tag usage count shown in autocomplete
- [ ] User can delete unused tags

**Settings**
- [ ] Light / dark mode toggle
- [ ] Font size: small / medium / large
- [ ] Auto-save interval: 5s / 10s / 30s
- [ ] Export all data to JSON backup

**AI Readiness (schema-level)**
- [ ] Entry content stored as clean Markdown (AI-parseable)
- [ ] Schema structured to support future embeddings table without migration pain

### Out of Scope

- Cloud sync — privacy constraint; local-only forever
- Mobile apps — Phase 2; desktop experience first
- AI features (chat, summarization, insights) — Phase 2; local LLM via Ollama
- Photo/file attachments — Phase 2
- Location/weather metadata — Phase 2
- External AI APIs (OpenAI, Anthropic) — never; conflicts with privacy guarantee
- Multi-device sync — requires cloud; out of scope by design

## Context

**The gap MemoryLane fills:** No existing journaling app (Day One, Obsidian, Diarium) lets users run AI over their journal data without sending content to external APIs. MemoryLane's Phase 1 MVP builds the foundation; Phase 2 adds local LLM (Ollama/llama.cpp) so users can query, summarize, and get insights from their journal privately.

**Target audience:** Privacy-conscious journalers who want AI assistance without cloud exposure. Public release planned (App Store + website distribution).

**Tech stack rationale:**
- Tauri over Electron: smaller binary, better performance, Rust safety for local data handling
- SQLite: proven, embedded, zero-dependency, FTS5 built-in for full-text search
- TipTap: Markdown WYSIWYG that produces clean, AI-parseable content
- Tauri plugins for SQLite access from Rust side

## Constraints

- **Privacy**: No network calls in any feature — local-only, no analytics, no telemetry
- **Distribution**: Must package as installable desktop app (Windows, macOS, Linux via Tauri)
- **Tech Stack**: Tauri + React + TypeScript + SQLite — locked in by spec
- **AI Compatibility**: Entry content must be clean Markdown; schema must accommodate embeddings table in Phase 2 without breaking changes
- **Design**: Production-grade UI via frontend-design skill patterns — no generic AI aesthetics

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Tauri over Electron | Smaller binary, Rust safety, better perf for local data app | — Pending |
| SQLite FTS5 for search | Built-in to SQLite, zero extra deps, handles journal-scale data well | — Pending |
| TipTap + Markdown storage | Clean Markdown output future-proofs AI readability | — Pending |
| Local LLM only (Phase 2) | Core privacy guarantee — no content leaves device, ever | — Pending |
| No cloud sync (ever) | Privacy-first positioning; sync would compromise core value | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-09 — Phase 1 (Foundation) complete*
