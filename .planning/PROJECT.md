# Chronicle AI

## What This Is

Chronicle AI is a privacy-first desktop journaling app built with Tauri (Rust + React). Everything stays local — no cloud, no network calls, no third-party services. It's a rock-solid journaling foundation designed to eventually support local LLM integration (Ollama/llama.cpp), letting users run AI over their private journal data without their thoughts ever leaving their device.

## Core Value

A journaling app where you can eventually have AI understand your entries — and none of it ever touches the internet.

## Current Milestone: v1.1 Daily Driver

**Goal:** Turn Chronicle AI from a working MVP into a habit-forming daily driver — land users on a rich home dashboard, smooth every interaction, and make AI assist quietly while writing.

**Target features:**

*Home Dashboard (Overview view)*
- Stat cards: streak, total entries, entries this month
- Mood trends visualization over time
- On This Day — memories from this date in prior years
- Recent entries feed
- Quick-write FAB (floating action button)
- Writing prompts widget
- AI insights summary panel

*UX Polish*
- First-run onboarding flow
- Animations + microinteractions pass

*AI*
- Auto-tagging suggestions (local LLM suggests tags for new entries)

*Tag Management*
- Color picker per tag (preset palette)

**Key context:**
- Same privacy / local-only constraints as v1.0 — zero network calls, Ollama-only AI
- WIP scaffolding for OverviewView + widget components already committed as starting point (commit `b9af497`)
- Inter + Fraunces fonts already wired via @fontsource

## Requirements

### Validated

**AI Readiness (schema-level) — Validated in Phase 1: Foundation**
- [x] Schema structured to support future embeddings table without migration pain (AI-01)
- [x] Entry content stored with UUID TEXT PKs and metadata JSON column (AI-02, AI-03)
- [x] Zero network calls enforced at capability level — SETT-04 verified

### Validated

**Core Journal — Validated in Phase 2: Editor & Tags**
- [x] User can create entries with rich text (TipTap/Markdown WYSIWYG) — EDIT-01
- [x] User can assign a mood to each entry (great / good / okay / bad / awful) — EDIT-02
- [x] User can add/remove tags on entries with autocomplete — TAG-01, TAG-02, TAG-03
- [x] Entries auto-save every 5 seconds (debounced 500ms on change) — EDIT-03, EDIT-04
- [x] User can edit and delete existing entries — EDIT-06, EDIT-07
- [x] Word count and character count display while writing — EDIT-08
- [x] User can delete unused tags via trash icon in autocomplete dropdown — TAG-04
- [x] User can configure auto-save interval (5s / 10s / 30s) — EDIT-05

### Validated

**Timeline & Calendar — Validated in Phase 3: Timeline & Calendar**
- [x] User can view entries in reverse-chronological timeline with infinite scroll — TIME-01, TIME-02
- [x] Each entry card shows date, mood, tags, word count, and 150-char preview — TIME-03, TIME-04
- [x] User can expand/collapse full entry inline — TIME-05
- [x] Visual separator between days — TIME-06
- [x] Back to Journal button returns from editor to timeline — TIME-07
- [x] User can view a monthly calendar heatmap (color intensity = entry count) — CAL-01, CAL-02
- [x] Clicking a date filters the timeline to entries on that day — CAL-04
- [x] Month/year navigation with "Today" shortcut — CAL-03

### Validated

**Search & Discovery — Validated in Phase 4: Search & Discovery**
- [x] Full-text search across all entry content (SQLite FTS5) — SRCH-01
- [x] Filter by date range, tags (multi-select), mood (multi-select) — SRCH-02, SRCH-03, SRCH-04
- [x] Matching text highlighted in search results — SRCH-05
- [x] Clear all filters in one action — SRCH-06
- [x] On This Day resurfaces entries from prior years — OTD-01, OTD-02

### Validated

**Media, Security & Settings — Validated in Phase 5**
- [x] User can attach photos to entries — MEDIA-01 through MEDIA-04
- [x] App lock via PIN (PBKDF2-SHA256) — SEC-01, SEC-02, SEC-03
- [x] Light/dark theme + font scale settings — SETT-01, SETT-02
- [x] Auto-save interval configurable (5s / 10s / 30s) — SETT-03 / EDIT-05
- [x] Export all data to JSON backup — SETT-04

### Validated

**AI Features — Validated in Phase 6: AI Features**
- [x] Semantic search over entries via local embeddings (Ollama) — LLMAI-02
- [x] Natural-language Q&A with RAG + citations over journal — LLMAI-03
- [x] Ollama setup wizard + settings page live status — LLMAI-04
- [x] All inference is local — no entries, embeddings, or questions ever leave the device

### Active

**v1.1 Daily Driver requirements** — see `.planning/REQUIREMENTS.md` for REQ-IDs and details.

### Out of Scope

- Cloud sync — privacy constraint; local-only forever
- Mobile apps — future major milestone; desktop experience first
- External AI APIs (OpenAI, Anthropic) — never; conflicts with privacy guarantee
- Multi-device sync — requires cloud; out of scope by design
- Video and audio attachments — v1 scope is photos only
- Cloud LLM fallbacks — all inference stays local, even if Ollama unavailable

## Context

**The gap Chronicle AI fills:** No existing journaling app (Day One, Obsidian, Diarium) lets users run AI over their journal data without sending content to external APIs. Chronicle AI's Phase 1 MVP builds the foundation; Phase 2 adds local LLM (Ollama/llama.cpp) so users can query, summarize, and get insights from their journal privately.

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
*Last updated: 2026-04-16 — v1.0 MVP complete (6 phases shipped); v1.1 Daily Driver milestone started*
