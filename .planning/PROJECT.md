# Chronicle AI

## What This Is

Chronicle AI is a privacy-first desktop journaling app built with Tauri (Rust + React). Everything stays local — no cloud, no network calls, no third-party services. v1.0 shipped a working MVP with full local-LLM support via Ollama: users can semantically search and ask natural-language questions of their journal without any content leaving their device.

## Core Value

A journaling app where AI understands your entries — and none of it ever touches the internet.

## Current State

**v1.0 MVP (shipped 2026-04-18):** 6 phases, 23 plans, 45 requirements delivered across 9 days. ~9,252 LOC TypeScript + ~372 LOC Rust. Full journaling loop (write → browse → search → AI query) working offline end-to-end. See [.planning/MILESTONES.md](MILESTONES.md) and [.planning/milestones/v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md).

**Known UX issue (carried forward, non-blocking):** Built-in AI (llama.cpp) download fails with Windows OS error 216 — workaround is External Ollama backend. See [src-tauri/src/llama.rs:221](../src-tauri/src/llama.rs#L221).

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
- First-run onboarding flow (3-step, SQLite-persisted, auto-skip for v1.0 users)
- Microinteractions pass (stagger-in, pop-in, scale, spring, crossfade — all honoring `prefers-reduced-motion`)

*AI*
- Auto-tagging suggestions (sparkle-triggered, JSON-Schema bounded, ghost-chip UX, off by default)

*Tag Management*
- Expanded 12-color dual-tone palette (WCAG AA)
- Dedicated Tag Management view (rename, recolor, delete when unused)

**Constraints preserved from v1.0:** zero network calls, Ollama-only AI, Tailwind v3 pin, no new runtime dependencies preferred.

**Progress:** Phase 7 (Foundation & Derived State) complete — architectural primitives shipped (derived selectors, `getEntryStats()` SQL aggregate, `local_date` column, animations.css with reduced-motion guard, ColorGrid primitive). Phase 8 (Home Dashboard) is next.

## Requirements

### Validated (v1.0)

**AI Readiness (Phase 1)**
- ✓ Schema includes `embeddings` table from initial migration (AI-01) — v1.0
- ✓ Entry PKs are UUID TEXT; `metadata` JSON column present (AI-02, AI-03) — v1.0
- ✓ Zero network calls enforced (SETT-04) — v1.0

**Core Journal (Phase 2)**
- ✓ Rich-text editor with Markdown round-trip (EDIT-01, EDIT-03) — v1.0
- ✓ Mood assignment, word/char count, date/time override (EDIT-06..08, EDIT-07) — v1.0
- ✓ Auto-save every 500ms + configurable keepalive (EDIT-04, EDIT-05) — v1.0
- ✓ Edit/delete entries (EDIT-02) — v1.0
- ✓ On-the-fly tag creation with autocomplete and 8-color palette (TAG-01..03) — v1.0
- ✓ Delete unused tags from autocomplete (TAG-04) — v1.0

**Timeline & Calendar (Phase 3)**
- ✓ Reverse-chronological timeline with keyset pagination + infinite scroll (TIME-01..03) — v1.0
- ✓ Entry cards with date/mood/tags/word-count/150-char preview (TIME-04) — v1.0
- ✓ Inline expansion and click-to-edit (TIME-05, TIME-07) — v1.0
- ✓ Visual day-separators (TIME-06) — v1.0
- ✓ Monthly calendar heatmap with day-click filtering (CAL-01..04) — v1.0

**Search & Discovery (Phase 4)**
- ✓ FTS5 keyword search with highlighting (SRCH-01, SRCH-02) — v1.0
- ✓ Multi-select date/tag/mood filters with AND semantics (SRCH-03..05) — v1.0
- ✓ Clear-all action (SRCH-06) — v1.0
- ✓ On This Day prior-year memories (OTD-01, OTD-02) — v1.0

**Media, Security & Settings (Phase 5)**
- ✓ Photo attachments with local file storage (MEDIA-01..04) — v1.0
- ✓ PBKDF2-SHA256 PIN lock with configurable idle auto-lock (SEC-01..03) — v1.0
- ✓ Light/dark theme + 3 font sizes (SETT-01, SETT-02) — v1.0
- ✓ Full ZIP data export (SETT-03) — v1.0

**AI Features (Phase 6)**
- ✓ Semantic search via local Ollama embeddings (LLMAI-02) — v1.0
- ✓ Natural-language Q&A with RAG + UUID citations (LLMAI-03) — v1.0
- ✓ Ollama setup wizard and settings panel with live status (LLMAI-04) — v1.0

### Active (v1.1)

See [.planning/REQUIREMENTS.md](REQUIREMENTS.md) (next milestone). Requirement IDs: FOUND-01..04, DASH-01..14, ONBRD-01..07, AUTOTAG-01..07, ANIM-01..06, TAGUX-01..07.

### Out of Scope

- Cloud sync — privacy constraint; local-only forever
- Mobile apps — future major milestone; desktop experience first
- External AI APIs (OpenAI, Anthropic) — never; conflicts with privacy guarantee
- Multi-device sync — requires cloud; out of scope by design
- Video and audio attachments — v1 scope is photos only
- Cloud LLM fallbacks — all inference stays local, even if Ollama unavailable

## Context

**The gap Chronicle AI fills:** No existing journaling app (Day One, Obsidian, Diarium) lets users run AI over their journal data without sending content to external APIs. v1.0 ships the full local-LLM loop; v1.1 turns that loop into a daily-use habit via dashboard-first UX and quiet AI assists.

**Target audience:** Privacy-conscious journalers who want AI assistance without cloud exposure. Public release planned (App Store + website distribution).

**Tech stack rationale (validated post-v1.0):**
- **Tauri v2** over Electron — smaller binary, Rust safety, sound for local data handling; React 19 friction exists but manageable
- **SQLite + FTS5** — proven, embedded, built-in full-text search; migration ordering required learning (PRAGMA-guarded ALTERs must finalize before referencing indexes)
- **TipTap v3** — Markdown WYSIWYG with clean AI-parseable output; Floating UI (not Tippy) for BubbleMenu placement
- **Ollama (external)** over built-in llama.cpp — built-in binary has Windows compat issue (os error 216); Ollama HTTP with health-check gate is the reliable path
- **Tailwind v3 pinned** — shadcn/ui v2.3.0 requires v3; v4 breaks component compatibility
- **Zustand** for UI state; module-level timers (not in store) for non-serializable state
- **Web Crypto PBKDF2-SHA256** (310k iterations) for PIN — no argon2-browser needed

## Constraints

- **Privacy**: No network calls in any feature — local-only, no analytics, no telemetry
- **Distribution**: Must package as installable desktop app (Windows, macOS, Linux via Tauri)
- **Tech Stack**: Tauri v2 + React 19 + TypeScript + SQLite — locked
- **AI Compatibility**: Entry content must be clean Markdown; schema accommodates embeddings table without breaking changes
- **AI Runtime**: Local-only (Ollama HTTP); graceful fallback to keyword search when unavailable, never cloud
- **Design**: Production-grade UI via frontend-design skill patterns — no generic AI aesthetics

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Tauri over Electron | Smaller binary, Rust safety, better perf for local-data app | ✓ Good — v1.0 ships as native desktop, ~9.6k LOC frontend stayed performant |
| SQLite FTS5 for search | Built-in, zero extra deps, handles journal-scale data | ✓ Good — FTS5 with phrase-wrap escaping handles special chars and scales |
| TipTap + Markdown storage | Clean Markdown future-proofs AI readability | ✓ Good — round-trip works; embeddings operate on clean text |
| Local LLM only (Ollama) | Core privacy guarantee — no content leaves device | ✓ Good — semantic search and Q&A both shipped fully local; graceful keyword fallback |
| No cloud sync (ever) | Privacy-first positioning; sync would compromise core value | ✓ Good — reinforced as core positioning; multi-device deferred to future milestone |
| Inline migrations in db.ts | `?raw` import unreliable for files outside `src/` | ✓ Good — multi-statement splitter handles BEGIN...END for FTS5 trigger bodies |
| PBKDF2-SHA256 Web Crypto | Native browser API, no argon2-browser runtime dep | ✓ Good — 310k iterations + Web Crypto avoids extra runtime weight |
| Window controls outside drag-region | Tauri drag-region intercepts mousedown | ✓ Good — but Phase 5 introduced a regression (TitleBar only mounted under Unlocked) fixed in gap-closure 01-04 |
| External Ollama over built-in llama.cpp | Built-in binary fails on Windows (os error 216) | ⚠️ Revisit — track ggml-org/llama.cpp releases for a working Windows build |
| Tailwind v3 pin | shadcn/ui v2 requires v3; v4 breaks components | ✓ Good — pin is stable until shadcn moves forward |
| Granularity: Coarse | 4-6 phases per milestone (requirement clusters) | ✓ Good — v1.0 shipped in 6 phases over 9 days |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition:**
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone (`/gsd-complete-milestone`):**
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-18 — v1.0 MVP shipped and archived; v1.1 Daily Driver active (Phase 7 complete, Phase 8 next)*
