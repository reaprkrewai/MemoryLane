---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: MVP
status: planning
last_updated: "2026-04-17T11:56:35.109Z"
last_activity: 2026-04-16 — ROADMAP.md updated with v1.1 Daily Driver phases 7-11
progress:
  total_phases: 11
  completed_phases: 6
  total_plans: 21
  completed_plans: 23
  percent: 100
---

# Project State: Chronicle AI

## Current Position

Phase: 7 (Foundation & Derived State) — not started
Plan: —
Status: Roadmap complete; ready to plan Phase 7
Last activity: 2026-04-16 — ROADMAP.md updated with v1.1 Daily Driver phases 7-11

## Project Reference

See: .planning/PROJECT.md
**Core value:** A journaling app where you can eventually have AI understand your entries — and none of it ever touches the internet.

## Milestone v1.1 Scope

**Phases 7-11 (5 phases, 45 requirements):**

- [ ] **Phase 7: Foundation & Derived State** — FOUND-01..04 (derived selectors, getEntryStats SQL aggregate, local_date column, animations.css with reduced-motion stanza, ColorGrid primitive)
- [ ] **Phase 8: Home Dashboard & Widgets** — DASH-01..14 (Overview as default, 4 stat cards, mood trends, On This Day, recent feed, Quick-Write FAB with Ctrl/Cmd+N, writing prompts, AI insights)
- [ ] **Phase 9: First-Run Onboarding** — ONBRD-01..07 (3-step welcome, SQLite-persisted completion, auto-skip existing users, replay from Settings, data-onboarding attributes)
- [ ] **Phase 10: Auto-Tagging AI Pipeline** — AUTOTAG-01..07 (sparkle button, hybridAIService routing, JSON-Schema format constraint, ghost-chip accept/dismiss, off by default)
- [ ] **Phase 11: Microinteractions & Tag Management** — ANIM-01..06, TAGUX-01..07 (stagger-in, pop-in, scale, spring feedback, crossfade; 12-color dual-tone palette, Tag Management view)

## Phase Status

| Phase | Status | Plans |
|-------|--------|-------|
| 7. Foundation & Derived State | Not started | TBD |
| 8. Home Dashboard & Widgets | Not started | TBD |
| 9. First-Run Onboarding | Not started | TBD |
| 10. Auto-Tagging AI Pipeline | Not started | TBD |
| 11. Microinteractions & Tag Management | Not started | TBD |

## Performance Metrics

- v1.0 shipped: 6 phases, 21 plans, 45 requirements (archived)
- v1.1 phases: 5 (phases 7-11)
- v1.1 plans: TBD (pending per-phase planning)
- v1.1 requirements: 45 mapped, 0 orphaned

## Accumulated Context

### Decisions for v1.1 (from research)

**Stack (from STACK.md):**

- Zero new runtime deps preferred — Tailwind + `tailwindcss-animate` already present for all microinteractions
- Custom SVG (~30-50 lines) for mood trends chart — NOT Recharts (bundle bloat + React 19 friction)
- Radix Popover for onboarding tour — NOT react-joyride/shepherd (inline-style / DOM-coupling issues)
- `date-fns@4.1.0` already present — all needed helpers available
- Extend `src/lib/ollamaService.ts` with `generateTagSuggestions()` using Ollama `format` JSON Schema against `llama3.2:3b`
- `motion@12.x` (ex-Framer Motion) kept as optional fallback — only if CSS can't express a specific interaction

**Architecture (from ARCHITECTURE.md):**

- NO new stores for v1.1 — dashboard reads `entryStore.allEntries` via derived primitive selectors
- Auto-tagging is one-shot via `hybridAIService` — NEVER call `ollamaService` directly from new code
- Onboarding tri-state on `uiStore` (`isOnboardingCompleted: boolean | null`) — mirrors v1.0 `isPinSet` pattern
- OnboardingOverlay rendered at App.tsx level (above AppShell) — must overlay SettingsView too
- Tag `color` column + `TAG_COLORS` + `updateTagColor` + TagPill Popover picker ALREADY SHIPPED in v1.0 — v1.1 is polish + Tag Management surface
- OnThisDay backend already shipped — reuse component AS-IS on dashboard

**Pitfalls to prevent (from PITFALLS.md — must bake into Phase 7):**

- **C1 Dashboard re-render storm:** widgets must NOT subscribe to `allEntries` — use derived primitive selectors (prevent thrashing during 500ms auto-save)
- **C2 N+1 dashboard queries:** single view-level SQL aggregate via `getEntryStats()` — NOT per-widget useEffect fetches
- **C3 Streak TZ/DST bug:** `local_date TEXT` column written at entry creation + streak computed in SQL — NOT browser-local `startOfDay`
- **C4 Auto-tag hallucination:** JSON-Schema enum constraint + cap 3 suggestions + always preview + off by default
- **C5 Onboarding fragility:** persist in SQLite `settings` (NOT localStorage); auto-skip users with entries; `data-onboarding` attributes (NOT CSS selectors); "Replay tour" in Settings
- **I2 Motion a11y/battery:** `@media (prefers-reduced-motion: reduce)` stanza in animations.css — verified in FOUND-04

### Decisions carried over from v1.0

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

### Open Questions for Planner (from SUMMARY.md)

- Retain `MoodOverview.tsx` (30-day constellation) alongside new `MoodTrends.tsx`? — **Decided: keep both** (DASH-04 + DASH-05 require both as complementary lenses)
- AI insights summary shape — weekly/monthly/top-moods? — weekly (DASH-12 scope)
- Writing prompt library content — copywriting task, not technical
- Ollama version compat for `format` JSON-Schema (requires 0.5+) — UX for older installs; decide in Phase 10 planning
- `motion@12.x` trigger — default NO; re-evaluate at Phase 11 kickoff

### Todos

- Plan Phase 7 (Foundation & Derived State) — unblocks all downstream work
- Phase 10 flagged HIGH research — recommend `/gsd-research-phase` at planning time for prompt engineering
- Finalize writing prompt library copywriting (60+ prompts) during Phase 8 planning

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

Last action: ROADMAP.md updated with v1.1 Daily Driver milestone (phases 7-11, 45 requirements, 100% coverage) — 2026-04-16

Next action: `/gsd-plan-phase 7` to decompose Foundation & Derived State into executable plans

---

*Milestone v1.1 Daily Driver: roadmap complete. Phases 7-11 defined with dependency chain Foundation → Dashboard → {Onboarding, Auto-Tag} → Polish+Tag UX. Ready for phase planning.*
