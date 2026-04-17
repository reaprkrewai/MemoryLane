# Phase 7: Foundation & Derived State - Context

**Gathered:** 2026-04-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Ship the five architectural primitives v1.1 depends on: derived primitive selectors on `entryStore`, a SQL aggregate helper (`getEntryStats()`), a timezone-safe `entries.local_date` column with backfill, a shared `animations.css` stylesheet with a global reduced-motion guard, and a reusable `ColorGrid` UI primitive. **Nothing user-visible ships in this phase.** Dashboard widgets, onboarding, auto-tagging, microinteractions, and Tag Management all ship on top of these primitives in Phases 8–11.

</domain>

<decisions>
## Implementation Decisions

### Derived selectors API (FOUND-01)
- **D-01:** Add `totalEntries`, `dayStreak`, `moodCounts`, `recentEntries` as **maintained fields** on `entryStore`. Every write action (saveContent / createEntry / deleteEntry / loadPage) recomputes and sets them alongside `allEntries`. Widgets subscribe with `useEntryStore(s => s.totalEntries)` — primitives are `===` comparable, zero re-render when unchanged. No new runtime deps, matches v1.0 Zustand style.
- **D-02:** `recentEntries` is maintained as a **stable-reference slice of the top 5** most recent entries. Updated only when the top 5 actually change (shallow compare on `id + updated_at`). Fixed at 5 items — downstream DASH-07 needs exactly 5; no `getRecentEntries(n)` API.
- **D-03:** `dayStreak` is **computed via SQL inside `getEntryStats()`**, not in JS over `allEntries`. Query pattern: `SELECT DISTINCT local_date FROM entries ORDER BY local_date DESC LIMIT 365`, then iterate at most 365 date strings. TZ-safe (reads `local_date`, not `created_at`), O(1) per widget render after cached into the store field.
- **D-04:** `moodCounts` is **lifetime totals only**: `{ great: N, good: N, okay: N, bad: N, awful: N }`. Cheap aggregate over `allEntries`. Phase 8 `MoodTrends` (30-day chart) derives its own windowed shape inside the widget — not a FOUND-01 concern.
- **D-05:** Refresh timing per write action:
  - `loadPage` / `createEntry` / `deleteEntry` → call `getEntryStats()` and update `totalEntries` + `dayStreak`; recompute `moodCounts` + `recentEntries` from `allEntries`.
  - `saveContent` (typing / auto-save) → recompute **only** `moodCounts` + `recentEntries` from `allEntries` if it matters; **do NOT call `getEntryStats()`** (avoids C2 N+1 / busy-lock during typing; counts/streak don't change on content edits).
  - No separate effect-driven refresh — primitives update synchronously with `allEntries` set, no double-write race.

### `getEntryStats()` SQL aggregate (FOUND-02)
- **D-06:** New file `src/lib/dbQueries.ts` exposes `getEntryStats(): Promise<{ totalEntries: number; totalWords: number; thisMonth: number; totalTags: number; dayStreak: number }>`. Single SQL query (or at most 2 — stats + streak set) returning all aggregates needed by the Phase 8 stat cards. Pagination-independent: returns true DB counts, not `allEntries.length`.
- **D-07:** Streak query inside `getEntryStats()` reads `local_date` (FOUND-03 column) — not `strftime` over `created_at/1000`.

### `local_date` column & migration (FOUND-03)
- **D-08:** Column addition uses a **guarded ALTER** in `initializeDatabase()` (db.ts). Before running ALTER, check `PRAGMA table_info(entries)`; if `local_date` is missing, run `ALTER TABLE entries ADD COLUMN local_date TEXT`. `ALTER TABLE ADD COLUMN` is not idempotent in SQLite, so the PRAGMA guard makes the whole block safe to re-run. The `CREATE TABLE entries (...)` clause in `MIGRATION_SQL` is also updated so fresh installs get the column natively.
- **D-09:** Backfill runs **synchronously during migration**, immediately after the ALTER, in a single statement: `UPDATE entries SET local_date = strftime('%Y-%m-%d', created_at/1000, 'unixepoch') WHERE local_date IS NULL;`. App startup blocks until complete. On typical user DBs (<10k entries) this is <100ms.
- **D-10:** **Documented caveat:** pre-migration entries created near UTC midnight may have a `local_date` that is off by one calendar day in the user's local TZ. This is a one-time best-effort — acceptable for v1.0 data. Release note should mention that prior streaks may shift ±1 day for those edge entries.
- **D-11:** New entries populate `local_date` **client-side in `entryStore.createEntry`** using `new Date().toLocaleDateString('en-CA')` (returns `YYYY-MM-DD` in the user's local TZ). Every code path that inserts into `entries` must include `local_date` in the INSERT. Browser TZ is authoritative.
- **D-12:** **Index created in the same guarded block**: `CREATE INDEX IF NOT EXISTS idx_entries_local_date ON entries(local_date)`. Accelerates streak query and Phase 8 On This Day / date-filter queries.
- **D-13:** `created_at` (ms UTC) **stays as ground truth** for timeline ordering and within-day sort. `idx_entries_created` is kept unchanged. `local_date` is a derived date-boundary accelerator, not a replacement. Timeline queries still `ORDER BY created_at DESC`; only streak and date-filter queries use `local_date`.
- **D-14:** All `startOfDay(new Date())` usage in streak code (currently in [`OverviewView.tsx:26`](src/components/OverviewView.tsx#L26)) is removed after FOUND-03 lands. `calculateDayStreak` either moves to `dbQueries.ts` (SQL) or is deleted entirely.

### Animations & motion tokens (FOUND-04)
- **D-15:** **Motion tokens live in `src/styles/globals.css`** alongside existing theme tokens. Keyframes live in a new `src/styles/animations.css` imported by `main.tsx`. Reduced-motion stanza lives in `globals.css` so one guard covers everything (app code, third-party Radix transitions, future components).
- **D-16:** Tokens:
  ```css
  --motion-fast: 150ms;
  --motion-med:  300ms;
  --motion-slow: 500ms;
  --ease-out-smooth: cubic-bezier(0.22, 1, 0.36, 1);
  --ease-spring:     cubic-bezier(0.34, 1.56, 0.64, 1);
  ```
  Exact values flex during planning/implementation if needed, but these are the recommended defaults.
- **D-17:** **Exactly 4 keyframes** ship in Phase 7 — matching roadmap SC#4: `fade-in`, `slide-up`, `pop-in`, `stagger-in`. `stagger-in` is implemented as a delay container pattern where children use `animation-delay: calc(var(--i) * 50ms)` (a utility, not its own keyframe) — so strictly 3 keyframes + the stagger utility. No extras (no shimmer/pulse-glow extraction from QuickWriteFAB) — those are Phase 11 when microinteractions actually land.
- **D-18:** **Global universal-selector reduced-motion guard** in globals.css:
  ```css
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
  ```
  One stanza covers every animation including third-party components. Roadmap SC#4 verification (OS "Reduce motion" enabled → instant transitions) passes unconditionally.
- **D-19:** Tailwind config (`tailwind.config.js`) extends `theme.extend.transitionDuration`, `theme.extend.transitionTimingFunction`, `theme.extend.keyframes`, and `theme.extend.animation` to reference the CSS vars. Downstream components can use either Tailwind utilities (`duration-[var(--motion-med)]`) or raw CSS.
- **D-20:** **No existing component is rewired in Phase 7.** Existing v1.0 code (StatCard, QuickWriteFAB, TagPill, OverviewView) keeps its current `transition-all duration-300` utilities. Phase 11 standardizes usages when microinteractions land and components are being touched anyway.

### ColorGrid primitive
- **D-21:** Create `src/components/ui/ColorGrid.tsx`. API:
  ```ts
  interface ColorGridProps {
    colors: string[];
    selected?: string;
    onSelect: (color: string) => void;
    ariaLabel: string;
    cols?: number; // default 5
  }
  ```
  Consumers pass their own palette — ColorGrid is palette-agnostic.
- **D-22:** **Phase 7 refactors `TagPill` to consume `ColorGrid`**. Validates the primitive's API under a real consumer before Phase 11 adds Tag Management as the second consumer. Palette stays at the existing 8 `TAG_COLORS` values — Phase 11 owns the 12-color dual-tone expansion. Pure refactor — TagPill behavior is visually identical to v1.0 after the change.
- **D-23:** Visual design matches the existing [`TagPill.tsx:59-82`](src/components/TagPill.tsx#L59-L82) grid: 5-column grid of 24×24px rounded-md buttons, background is the color, `Check` icon when selected. **Add `focus-visible:ring-2 focus-visible:ring-primary`** for keyboard users — roadmap SC#5 explicitly requires focus-visible rings.
- **D-24:** Keyboard model: **ARIA radio-group pattern**. Tab enters the grid (single tab stop), arrow keys (Left/Right for in-row, Up/Down for cross-row, wrap at edges), Enter/Space selects the focused swatch. Plain React `onKeyDown` handlers — no new deps.
- **D-25:** **`TAG_COLORS` stays exported from `src/stores/tagStore.ts`** in Phase 7. Phase 11 extracts to `src/lib/tagColors.ts` as part of the dual-tone restructure. Not pre-moved in Phase 7.

### Claude's Discretion
- Exact file layout of `src/lib/dbQueries.ts` (single `getEntryStats()` vs multiple named exports) — planner decides based on what Phase 8 needs.
- Whether `moodCounts`/`recentEntries` live on `entryStore` directly or in a selectors file that augments the store — both satisfy D-01.
- Unit test coverage shape (Vitest for dbQueries, React DevTools Profiler smoke for selector non-re-render claim).
- Exact cubic-bezier values for easings if planning surfaces better defaults.
- Exact arrow-key wrapping behavior on ColorGrid (wrap vs clamp) — roadmap doesn't specify.
- Whether `moodCounts` keys are lowercased literals or string-indexed by the existing mood enum.

### Folded Todos
*(none — no v1.1 todos matched Phase 7 scope at discussion time)*

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### v1.1 research (authoritative for v1.1 integration)
- `.planning/research/ARCHITECTURE.md` — Full v1.0 architecture snapshot + v1.1 integration verdicts. §1 covers dashboard widgets / derived selectors, §3 covers animation system, §5 covers tag color picker.
- `.planning/research/PITFALLS.md` — **Critical prevention targets** for Phase 7: §C1 (dashboard re-render storm → FOUND-01), §C2 (N+1 queries → FOUND-02), §C3 (streak TZ/DST → FOUND-03), §I2 (motion a11y/battery → FOUND-04), Anti-Pattern 6 (SQLite ALTER TABLE idempotency → FOUND-03 migration).
- `.planning/research/STACK.md` — Zero-new-runtime-deps preference; Tailwind v3 pin; `tailwindcss-animate` already present; `date-fns@4.1.0` available.
- `.planning/research/SUMMARY.md` — v1.1 scope, open questions.

### Product / roadmap
- `.planning/REQUIREMENTS.md` §Foundation — FOUND-01..04 requirement text.
- `.planning/ROADMAP.md` §Phase 7: Foundation & Derived State — Goal, Depends on, Success Criteria (5 items), Requirements mapping.
- `.planning/PROJECT.md` — Core value (privacy-first, zero network, local-only).
- `.planning/STATE.md` — v1.1 carried decisions (especially "Decisions for v1.1" + "Decisions carried over from v1.0" sections).

### Prior phase context (pattern references)
- `.planning/phases/06-ai-features-semantic-search-q-a/06-CONTEXT.md` — Graceful fallback pattern; `hybridAIService` routing (not directly relevant to Phase 7 but establishes the AI-gating convention downstream phases build on).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- [`src/stores/entryStore.ts`](src/stores/entryStore.ts) — `allEntries` array + `saveContent` mutation pattern (line 156: `allEntries: state.allEntries.map(...)` produces a new reference every save; widgets subscribing to `allEntries` are the re-render storm source FOUND-01 prevents).
- [`src/lib/db.ts`](src/lib/db.ts) — `MIGRATION_SQL` split-and-run pattern + `splitSqlStatements` helper + `initializeDatabase`. FOUND-03 guarded ALTER lands here.
- [`src/stores/tagStore.ts`](src/stores/tagStore.ts) — `TAG_COLORS` constant (8 values, line 4), `updateTagColor` action (line 73). Stays as palette source through Phase 7.
- [`src/components/TagPill.tsx`](src/components/TagPill.tsx) — Current color picker grid (lines 59–82). Phase 7 refactors this to consume `ColorGrid`.
- [`src/components/ui/popover.tsx`](src/components/ui/popover.tsx) — Existing shadcn popover wrapping the color picker; ColorGrid sits inside the existing `PopoverContent`.
- [`src/components/OverviewView.tsx:26`](src/components/OverviewView.tsx#L26) — `calculateDayStreak` using browser-local `startOfDay`; FOUND-03 replaces this call site.
- [`src/styles/globals.css`](src/styles/globals.css) — Existing theme tokens (colors). Motion tokens extend this file.
- [`tailwind.config.js`](tailwind.config.js) — Extended for keyframe/animation tokens.

### Established Patterns
- **Module-level timers outside Zustand** (entryStore.ts:74-77) — timers aren't serializable; do not move these into state when adding derived fields.
- **Idempotent `CREATE TABLE IF NOT EXISTS`** in `MIGRATION_SQL` — fresh installs re-run safely. `ALTER TABLE` breaks this convention unless guarded by `PRAGMA table_info()` check (FOUND-03 D-08 respects this).
- **Zustand granular selectors** — `useEntryStore((s) => s.allEntries)` prevents over-renders. FOUND-01 primitives follow the same pattern with `===`-comparable values.
- **`selectEntry` flushes pending saves before switching** (entryStore.ts:97-100) — any new mutation helper in FOUND-01 must not bypass this.
- **L2-normalized embeddings; cosine via dot product** — not relevant to Phase 7 but do not regress when altering `entries` schema.

### Integration Points
- `src/main.tsx` — imports `globals.css`; Phase 7 adds `import "./styles/animations.css"` here.
- `src/App.tsx` — state machine (`isDbReady` gate etc.). Phase 7 does not touch App.tsx; migration runs inside existing `initializeDatabase()` flow.
- `src/stores/entryStore.ts` — FOUND-01 adds maintained fields here; FOUND-03 D-11 adds `local_date` to the INSERT inside `createEntry`.
- `src/components/ui/` — ColorGrid goes here (directory already hosts shadcn wrappers like `popover.tsx`, `button.tsx`).

</code_context>

<specifics>
## Specific Ideas

- The re-render storm C1 is the single highest-risk pitfall for v1.1 — Phase 7 exists largely to pre-empt it. React DevTools Profiler evidence ("`OverviewView` does not commit during editor typing with the dashboard mounted") is the de-facto verification gate even though nothing ships user-visibly.
- Pre-migration streak drift of ±1 day for entries near UTC midnight is acceptable. Don't try to recover original local TZ — we don't have it.
- ColorGrid refactor of TagPill must be a **pure refactor** — no visual change visible to v1.0 users. That's the test.

</specifics>

<deferred>
## Deferred Ideas

- **12-color dual-tone palette** with WCAG AA-verified light/dark contrast tokens — Phase 11 (TAGUX-02).
- **Tag Management settings view** (second ColorGrid consumer; list/rename/recolor/delete) — Phase 11 (TAGUX-03..07).
- **Standardizing existing v1.0 `transition-all duration-300` utilities to use `--motion-med`** — Phase 11 alongside microinteractions.
- **Extracting `shimmer` / `pulse-glow` keyframes from [`QuickWriteFAB.tsx`](src/components/QuickWriteFAB.tsx)** — Phase 11.
- **Moving `TAG_COLORS` to `src/lib/tagColors.ts`** — Phase 11 during dual-tone restructure.
- **`tz_offset_min INTEGER` column** (originally suggested in research/PITFALLS.md C3) — not needed; `local_date` alone is sufficient for streak, OTD, and date-filter queries.

### Reviewed Todos (not folded)
*(none — no existing v1.1 todos matched Phase 7)*

</deferred>

---

*Phase: 07-foundation-derived-state*
*Context gathered: 2026-04-17*
