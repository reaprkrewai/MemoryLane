# Project Research Summary — Chronicle AI v1.1 Daily Driver

**Project:** Chronicle AI (MemoryLane)
**Domain:** Privacy-first desktop journaling app (Tauri + React + SQLite) — brownfield milestone
**Researched:** 2026-04-16
**Confidence:** HIGH

## Executive Summary

Chronicle AI v1.1 "Daily Driver" is a **polish + retention** milestone that turns a functional v1.0 MVP into a habit-forming app: rich home dashboard, smooth interactions, local AI that assists quietly while users write. Research converges on a consistent conclusion — **every v1.1 feature can be built with zero net-new runtime dependencies**, using idioms already in v1.0 (Tailwind transitions, Radix Popover, `date-fns`, `hybridAIService`, SQLite `settings` KV table). `motion@12.x` is optional, only if a specific interaction demands spring physics.

Dominant risk is **integration pitfalls against the shipped v1.0 base**, not technology selection: a latent pagination-count bug on the dashboard (stats derive from a 20-entry window), a timezone-naive streak calculation already in the WIP, re-render storm risk from widgets subscribing to `entryStore.allEntries`, and the classic LLM hallucination trap in auto-tagging. These are knowable, fixable, and each research doc flags the same prevention strategies independently.

Key technical decisions are effectively **locked before planning begins**:
- CSS-first animations with `prefers-reduced-motion` guard
- On-demand (not on-save) auto-tagging with explicit accept/reject UX
- Ollama JSON-Schema `format` against `llama3.2:3b` for tag extraction
- Static 60+ prompt JSON library with `day_of_year % N` deterministic rotation
- Capped weekly streak framing ("5/7 days this week") to avoid streak-anxiety anti-pattern
- Onboarding state in SQLite `settings` table (not localStorage)

Roadmap should structure phases around **foundation → dashboard → onboarding → AI → polish**, gated by re-render-storm prevention in Phase 1.

## Key Findings

### Recommended Stack

No new runtime deps preferred.

- **Tailwind v3 + `tailwindcss-animate`** (present) — all microinteractions. Pinned to v3 (shadcn/ui v2.3.0 blocks v4).
- **Radix Popover / AlertDialog** (present via shadcn) — reused for onboarding tour spotlight, tag color picker, auto-tag suggestion chips. No tour library needed.
- **`date-fns@4.1.0`** (present) — stats, streaks, On This Day, mood trends.
- **`hybridAIService`** (present) — auto-tagging MUST route here, NEVER call `ollamaService` directly.
- **SQLite `settings` KV table** (present) — `onboarding_completed` flag, cached AI insights timestamp.
- **Custom SVG (~30 lines) for mood chart** — not Recharts (~40KB + React 19 friction for one widget).
- **Ollama `format: <JSON Schema>` against `llama3.2:3b`** (requires Ollama 0.5+) — 2GB RAM vs 4GB for llama2:7b, sub-second warm latency.
- **Optional:** `motion@^12.38.0` with `LazyMotion + domAnimation` (~4.6KB gzip) only if needed.

### Features — Table Stakes vs Anti-Features

**P1 (must have):**
- Dashboard as default view: 4 stat cards, recent entries, On This Day (wire existing backend), quick-write FAB + Ctrl/Cmd+N
- First-run welcome + privacy statement (1–3 screens)
- Auto-tagging ghost-chip suggestions (accept/reject, off by default)
- CSS animations pass
- Tag color picker UX improvement (shared ColorGrid primitive)

**P2 (should have):**
- Mood trends chart (custom SVG)
- Writing prompts widget (static JSON library)
- AI insights summary (cached + manual refresh, graceful fallback)
- Capped weekly streak framing
- Progressive feature tour hooks

**Defer to v1.2+:**
- AI-generated personalized prompts, drag-drop customization, streak freezes, People tab

**Explicit anti-features:**
- Infinite streak guilt UX
- Automatic tag application
- Auto-refreshing AI insights
- Custom hex tag colors
- Onboarding >5 screens, account creation, goal questionnaires
- Auto-tag on every keystroke
- Push notifications, gamification badges, onboarding videos
- Sample seed entries (pollutes FTS5/embeddings/streak/mood — use empty states instead)

### Architecture Integration

v1.1 integrates cleanly into existing App.tsx state machine (`isDbReady → dbError → isPinSet → isLocked → isOnboardingCompleted → content`). **No new stores.** Dashboard stats subscribe to `entryStore.allEntries` via memoized derived selectors; auto-tagging is one-shot via `hybridAIService`; onboarding adds `isOnboardingCompleted: boolean | null` to `uiStore` matching the `isPinSet` tri-state pattern.

**Already shipped in v1.0 (reuse, don't rebuild):**
- `tags.color` column + `TAG_COLORS` palette + `updateTagColor` action + TagPill Popover color picker
- `OnThisDay` backend
- WIP `OverviewView` scaffold (fix the bugs, extend widgets)

**New files:**
- `src/components/dashboard/*` — MoodTrends, RecentEntriesFeed (extract), WritingPrompts, AIInsightSummary
- `src/components/onboarding/*` — OnboardingOverlay, OnboardingStep, onboardingSteps
- `src/components/ui/ColorGrid.tsx` — shared primitive
- `src/components/TagSuggestButton.tsx` — sparkle button + suggestion popover
- `src/lib/dbQueries.ts` — `getEntryStats()` aggregate (fixes pagination-count bug)
- `src/lib/writingPrompts.ts` — static 60+ prompt JSON
- `src/utils/tagSuggestionService.ts` — `suggestTagsForEntry(content, existingTags)`
- `src/utils/insightService.ts` — cached weekly summary
- `src/styles/animations.css` — keyframes + motion tokens + `prefers-reduced-motion` guard

**Optional schema change:** `entries.local_date TEXT` column for TZ-safe streak/OTD queries.

### Critical Pitfalls

1. **Dashboard re-render storm** — widgets subscribing to `allEntries` thrash on every 500ms auto-save. Prevent via derived primitive selectors on `entryStore`; gate dashboard on `activeView === 'overview'`. **Must establish in Phase 1.**
2. **Pagination-count bug** — `OverviewView.tsx:74-76` derives `totalEntries` from 20-entry window; ships visibly broken at 500+ entries. Fix: `getEntryStats()` SQL aggregate.
3. **Streak TZ/DST bug** — current `calculateDayStreak()` uses browser-local `startOfDay`, breaks on travel/DST. Fix: `local_date TEXT` column written at entry creation; streak in SQL.
4. **Auto-tag hallucination + overwhelm** — pass current tag list in prompt, JSON-Schema enum constraint, cap 3 suggestions, always preview, trigger on save-idle (not keystroke), off by default.
5. **Onboarding fragility** — localStorage resets on reinstall; CSS-selector targets break on refactor. Fix: persist in SQLite `settings`; auto-skip users with entries; `data-onboarding` attributes; "Replay tour" in Settings.

Also important: Recharts NOT chosen (re-render loops); battery + a11y (global reduced-motion stanza, pause on visibility-hidden); tag color contrast (dual-tone tokens, WCAG AA); On This Day empty state for year-1 users; FAB a11y (Ctrl/Cmd+N, aria-label, focus-visible ring).

## Implications for Roadmap

All four research docs converge on a 5-phase structure with clear dependencies.

### Phase 1: Foundation & Derived State
**Delivers:** Derived primitive selectors on `entryStore`; `src/lib/dbQueries.ts::getEntryStats()`; `entries.local_date TEXT` column + backfill migration; `src/styles/animations.css` with tokens + reduced-motion guard; shared `ColorGrid.tsx`.
**Avoids:** re-render storm, pagination bug, TZ streak bug, battery/a11y, font bloat.
**Research flag:** LOW.

### Phase 2: Home Dashboard & Widgets
**Delivers:** OverviewView as default route with 7 widgets (4 stat cards, mood trends, On This Day, RecentEntriesFeed, writing prompts, AI insights, QuickWriteFAB with Ctrl/Cmd+N); capped weekly streak; 60+ prompt library.
**Research flag:** LOW.

### Phase 3: First-Run Onboarding
**Delivers:** `isOnboardingCompleted` tri-state on uiStore; `onboarding_completed` seeded in settings; OnboardingOverlay at App.tsx level; 3–5 step flow; auto-skip for existing users; "Replay tour" in Settings; `data-onboarding` targets.
**Research flag:** MEDIUM — custom Radix Popover recommended over tour libraries.

### Phase 4: Auto-Tagging AI Pipeline
**Delivers:** `tagSuggestionService` via `hybridAIService`; Ollama JSON-Schema format; TagSuggestButton sparkle UX; Settings toggle (off by default); graceful Ollama-unavailable fallback.
**Research flag:** HIGH — prompt engineering iterative, Ollama 0.5+ required. Recommend `/gsd-research-phase` at planning time.

### Phase 5: Microinteractions Polish & Tag Color Picker
**Delivers:** Expanded palette 8→12 with WCAG AA; TagPill refactored to use ColorGrid; `src/components/settings/TagManagement.tsx`; stagger-in dashboard, tag-pill pop-in, modal scale, mood selector spring, view-transition fades; visibility-API pause; verified reduced-motion.
**Research flag:** LOW.

**Ordering rationale:** Dependency-driven (Phase 1 primitives unblock 2, tour needs Phase 2 targets, auto-tag stable `TagRow`). Risk-ordered (foundation → UI → state machine → AI → polish). Value-per-hour (Phase 1 fixes latent bug; Phase 2 is headline feature; 3–5 compound retention).

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Every rec grounded in current `package.json`; zero new runtime deps in preferred path |
| Features | HIGH | Competitive patterns well-documented; MEDIUM for auto-tagging UX (emerging — LLM4Tag 2025 paper as base) |
| Architecture | HIGH | Grounded in actual file inspection |
| Pitfalls | HIGH | Critical pitfalls observed in current code or grounded in external sources |

**Overall:** HIGH — unusually convergent across all 4 docs; zero contradictions; brownfield constraints fully mapped.

### Open Questions for Planner

- `local_date` column: add in Phase 1 or defer? (research: add)
- Retain `MoodOverview.tsx` (30-day constellation) alongside new `MoodTrends.tsx`, or replace? (product decision)
- AI insights summary shape — weekly, monthly, top-moods+narrative? (Phase 2 planning)
- Writing prompt library content — copywriting work (not technical)
- Ollama version compat: `format` requires 0.5+; UX for older installs? (Phase 4 decision)
- `motion@12.x` trigger: default NO; Phase 5 kickoff re-evaluates

## Ready for Requirements

Research synthesis complete. Four research docs mutually reinforcing with zero contradictions and converged 5-phase structure. Requirements-writing can proceed directly; roadmapping has enough signal for Phases 1, 2, 3, 5 without further research. Flag Phase 4 (auto-tagging) for deeper prompt-engineering research during its planning stage.
