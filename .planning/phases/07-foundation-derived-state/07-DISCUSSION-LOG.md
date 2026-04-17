# Phase 7: Foundation & Derived State - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in 07-CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-17
**Phase:** 07-foundation-derived-state
**Areas discussed:** Derived selectors API (FOUND-01), local_date migration & backfill (FOUND-03), Animation tokens & file shape (FOUND-04), ColorGrid primitive scope & palette

---

## Gray Area Selection

| Option | Description | Selected |
|--------|-------------|----------|
| Derived selectors API (FOUND-01) | Shape of primitives, sync model, re-render prevention | ✓ |
| local_date migration & backfill (FOUND-03) | Column add strategy, backfill timing, index, index on insert | ✓ |
| Animation tokens & file shape (FOUND-04) | Where tokens/keyframes live, which keyframes ship, reduced-motion guard, component wiring | ✓ |
| ColorGrid primitive scope & palette | Whether TagPill is refactored, palette expansion timing, swatch design, keyboard model | ✓ |

**User's choice:** All four areas.

---

## Derived selectors API (FOUND-01)

### Q1: How should the derived primitives be kept in sync with allEntries?

| Option | Description | Selected |
|--------|-------------|----------|
| Maintained fields | Primitives as fields on entryStore; every write action sets them alongside allEntries; widgets subscribe via useEntryStore(s => s.totalEntries); === comparable | ✓ |
| Computed hooks with custom equality | Keep store as-is; ship useTotalEntries/useDayStreak hooks with custom equality; compute per subscriber | |
| Selector library (reselect / proxy-memoize) | Memoized selector layer; new runtime dep (violates STATE.md "zero new runtime deps preferred") | |

**User's choice:** Maintained fields (Recommended).
**Notes:** Matches v1.0 Zustand style, zero-dep, simplest invalidation model.

### Q2: What does recentEntries return for downstream widgets?

| Option | Description | Selected |
|--------|-------------|----------|
| Stable-ref slice of top 5 | Fresh array only when top 5 change by id+updated_at shallow compare | ✓ |
| Configurable count (top N) | getRecentEntries(n) — only one widget needs this | |
| allEntries.slice(0,5) at compute-time | Simple but new array every write — defeats re-render goal | |

**User's choice:** Stable-ref slice of top 5 (Recommended).
**Notes:** DASH-07 needs exactly 5; YAGNI on configurable count.

### Q3: Where should dayStreak actually be computed?

| Option | Description | Selected |
|--------|-------------|----------|
| SQL query via getEntryStats | DISTINCT local_date; ≤365 date strings; TZ-safe; cached into store field | ✓ |
| JS over allEntries | Keep current Set approach; broken when allEntries incomplete (pagination) | |
| Hybrid SQL-on-mount + JS-on-write | Nudge streak up/down in JS after writes; easy to drift | |

**User's choice:** SQL query via getEntryStats (Recommended).
**Notes:** Joins FOUND-02 and FOUND-03; is the C3 mitigation.

### Q4: moodCounts — lifetime total or windowed?

| Option | Description | Selected |
|--------|-------------|----------|
| Lifetime totals | Simple aggregate over all entries; widgets derive windowed shapes | ✓ |
| Last-30-day window | Tailored to MoodTrends; forces rebuild at midnight | |
| Both lifetime and 30-day | Two fields; violates "primitives only" spirit | |

**User's choice:** Lifetime totals (Recommended).
**Notes:** Keeps FOUND-01 minimal; widgets own their own windowing.

### Q5: When should the primitives refresh relative to store mutations?

| Option | Description | Selected |
|--------|-------------|----------|
| Refresh inside each write action | getEntryStats on loadPage/create/delete; moodCounts+recentEntries on every mutation; no getEntryStats on saveContent | ✓ |
| Separate effect subscribing to allEntries | Decoupled timing but double-write race; widgets may see stale primitives briefly | |
| Refresh on every mutation including saveContent | Simpler but getEntryStats every ~500ms while typing — re-creates C2 | |

**User's choice:** Refresh inside each write action (Recommended).
**Notes:** Content edits don't change counts/streak — skip getEntryStats on saveContent.

---

## local_date migration & backfill (FOUND-03)

### Q1: How should local_date be added to a populated DB?

| Option | Description | Selected |
|--------|-------------|----------|
| Guarded ALTER in MIGRATION_SQL | PRAGMA table_info check; ALTER if missing; idempotent | ✓ |
| Rebuild-table migration | CREATE new + copy + drop — expensive, reconnects FKs | |
| Update CREATE TABLE only, no ALTER | Fresh installs get it; existing users never do — streak stays broken | |

**User's choice:** Guarded ALTER (Recommended).
**Notes:** Matches research/PITFALLS.md Anti-Pattern 6.

### Q2: When should backfill of existing entries run?

| Option | Description | Selected |
|--------|-------------|----------|
| Sync during migration, single UPDATE | Atomic; <100ms on typical DBs; startup blocks | ✓ |
| Async background after boot | Doesn't block startup; race on edits in-flight | |
| Lazy on-read | Defeats the purpose — puts TZ inference back in query path | |

**User's choice:** Sync during migration, single UPDATE (Recommended).
**Notes:** Matches research/PITFALLS.md C3 mitigation; release note covers ±1 day drift.

### Q3: How should new entries populate local_date at creation?

| Option | Description | Selected |
|--------|-------------|----------|
| Client-side in createEntry | new Date().toLocaleDateString('en-CA') in user's local TZ | ✓ |
| SQLite trigger AFTER INSERT | Uses UTC, defeats local-TZ purpose | |
| DEFAULT date('now') | Same UTC problem | |

**User's choice:** Client-side in createEntry (Recommended).
**Notes:** Browser TZ is authoritative; works offline by design.

### Q4: Index on local_date?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — CREATE INDEX IF NOT EXISTS idx_entries_local_date | Used by streak, OTD (Phase 8), date-filter; cheap | ✓ |
| No — add in Phase 8 | Deferred optimization; one-liner now is cheaper | |

**User's choice:** Yes — CREATE INDEX IF NOT EXISTS (Recommended).
**Notes:** Created in the same guarded block as the ALTER.

### Q5: Does created_at stay as-is?

| Option | Description | Selected |
|--------|-------------|----------|
| Keep both; created_at is ground truth, local_date is derived | Timeline still ORDER BY created_at DESC; streak/OTD use local_date | ✓ |
| Drop idx_entries_created, use idx_entries_local_date for everything | Date-level index breaks within-day sort order | |

**User's choice:** Keep both (Recommended).
**Notes:** No existing queries break.

---

## Animation tokens & file shape (FOUND-04)

### Q1: Where should motion tokens and keyframes live?

| Option | Description | Selected |
|--------|-------------|----------|
| Tokens in globals.css, keyframes in animations.css | Motion tokens alongside theme tokens; reduced-motion stanza in globals.css | ✓ |
| Everything in animations.css | Self-contained but separates motion from rest of design system | |
| Tokens in Tailwind config only (no CSS vars) | Loses CSS-var theming power; inline styles can't reference values | |

**User's choice:** Tokens in globals.css, keyframes in animations.css (Recommended).
**Notes:** Matches research/ARCHITECTURE.md §3 recommendation.

### Q2: Which exact keyframes ship in Phase 7?

| Option | Description | Selected |
|--------|-------------|----------|
| Exactly the 4 roadmap names: fade-in, slide-up, pop-in, stagger-in | Ships only what Phase 11 will consume; stagger-in is a delay container pattern | ✓ |
| The 4 + extras (shimmer, pulse-glow) extracted from QuickWriteFAB | Tidies codebase but drifts from Phase 7 scope | |
| Minimal set: fade-in + stagger pattern only | Phase 11 is already "later"; just ship what it will consume | |

**User's choice:** Exactly the 4 roadmap-named keyframes (Recommended).
**Notes:** Clean phase boundary.

### Q3: Should the reduced-motion guard be global or component-opt-in?

| Option | Description | Selected |
|--------|-------------|----------|
| Global universal selector (*, *::before, *::after) | One stanza covers everything including third-party Radix | ✓ |
| Token-only (RM sets --motion-med: 0ms) | Hardcoded durations in third-party components slip through | |
| Component-level @media queries | Verbose, error-prone, needs test coverage per component | |

**User's choice:** Global universal selector (Recommended).
**Notes:** Roadmap SC#4 verification (OS reduce-motion → instant) passes unconditionally.

### Q4: Does Phase 7 wire animations into existing components?

| Option | Description | Selected |
|--------|-------------|----------|
| Pure stylesheet + Tailwind config, no component changes | Phase 7 keeps "nothing user-visible" boundary clean; Phase 11 wires | ✓ |
| Also migrate existing transition-all duration-300 to use --motion-med | Touches StatCard, QuickWriteFAB, TagPill; regresses shipped components for unshipped work | |

**User's choice:** Pure stylesheet + Tailwind config (Recommended).
**Notes:** Phase 11 standardizes during microinteractions work.

---

## ColorGrid primitive scope & palette

### Q1: Scope in Phase 7 — does it also refactor TagPill?

| Option | Description | Selected |
|--------|-------------|----------|
| Ship primitive + refactor TagPill to use it | API validated under a real consumer; palette stays 8 colors | ✓ |
| Ship primitive only; TagPill refactor in Phase 11 | Primitive API not validated in Phase 7; violates roadmap SC#5 spirit | |
| Ship primitive + expand palette to 12 here | Pulls TAGUX-02 forward; loses Phase 11 dual-tone design pass | |

**User's choice:** Ship primitive + refactor TagPill (Recommended).
**Notes:** Pure refactor — TagPill visually identical to v1.0.

### Q2: Visual design of swatches

| Option | Description | Selected |
|--------|-------------|----------|
| Match existing TagPill grid + add focus-visible ring | 5-col grid of 24×24px rounded-md buttons + Check icon + focus ring | ✓ |
| Redesign to circles with ring selection | Two visual changes in two phases is worse than one | |
| Skeleton only, style in Phase 11 | Roadmap SC#5 requires focus-visible rings — is a visual spec | |

**User's choice:** Match existing TagPill grid + focus-visible ring (Recommended).

### Q3: Keyboard navigation model

| Option | Description | Selected |
|--------|-------------|----------|
| Arrow keys within grid + focus-visible ring | ARIA radio-group pattern; single tab stop; Left/Right + Up/Down; Enter/Space | ✓ |
| Tab between every swatch | 8–12 tab stops per picker is noisy | |
| Roving tabindex (headless-ui style) | Overkill for small grid | |

**User's choice:** Arrow keys within grid + focus-visible ring (Recommended).

### Q4: Ready for context?

User chose: **I'm ready for context** — proceed to write CONTEXT.md.

---

## Claude's Discretion

- Exact file layout of `src/lib/dbQueries.ts` (single `getEntryStats()` vs multiple named exports).
- Whether maintained fields live directly on `entryStore` or in a selectors file that augments it.
- Unit test coverage shape (Vitest for dbQueries, React DevTools Profiler smoke for non-re-render claim).
- Exact cubic-bezier values for `--ease-out-smooth` / `--ease-spring`.
- Exact arrow-key wrapping behavior on ColorGrid (wrap at edges vs clamp).
- Whether `moodCounts` keys are lowercased literals or the existing mood enum.

## Deferred Ideas

- 12-color dual-tone palette with WCAG AA verification → Phase 11 (TAGUX-02).
- Tag Management settings view (second ColorGrid consumer) → Phase 11 (TAGUX-03..07).
- Standardizing existing `transition-all duration-300` usages to `--motion-med` → Phase 11.
- Extracting `shimmer`/`pulse-glow` keyframes from `QuickWriteFAB` → Phase 11.
- Moving `TAG_COLORS` to `src/lib/tagColors.ts` → Phase 11 dual-tone restructure.
- `tz_offset_min INTEGER` column — not needed; `local_date` alone is sufficient.

---

*Discussion log for audit trail only. Canonical decisions in 07-CONTEXT.md.*
