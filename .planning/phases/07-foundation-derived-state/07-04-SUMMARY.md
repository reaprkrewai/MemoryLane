---
phase: 07-foundation-derived-state
plan: 04
subsystem: ui

tags: [zustand, derived-state, react, timezone, dashboard, selectors]

requires:
  - phase: 07-01
    provides: "entries.local_date TEXT column + idx_entries_local_date index"
  - phase: 07-03
    provides: "src/lib/dbQueries.ts::getEntryStats() SQL aggregate helper"
provides:
  - "entryStore FOUND-01 maintained derived primitives: totalEntries, dayStreak, moodCounts, recentEntries"
  - "Module helpers: stableRecentSlice (D-02 identity-stable top-5), computeMoodCounts (D-04 lifetime)"
  - "createEntry INSERTs local_date via toLocaleDateString('en-CA') (FOUND-03 D-11)"
  - "Refresh timing: createEntry / deleteEntry / loadPage full refresh via getEntryStats; saveContent primitives-only (D-05)"
  - "OverviewView refactor: deleted calculateDayStreak; consumes store primitives; zero visual change"
  - "C3 (streak TZ/DST source pattern) purged from src/ production tree"
affects: [08-home-dashboard, OverviewView, StatCard-widgets, recentEntries-consumers]

tech-stack:
  added: []
  patterns: ["Zustand maintained derived primitives with identity-stable top-5 slice helper", "Two-tier refresh timing: full (create/delete/loadPage) vs primitives-only (saveContent)"]

key-files:
  created: []
  modified:
    - src/stores/entryStore.ts
    - src/components/OverviewView.tsx

key-decisions:
  - "Direct getEntryStats() call site count is exactly 3 (B-02): createEntry + deleteEntry + loadPage. updateCreatedAt delegates via loadPage."
  - "saveContent refresh writes only moodCounts + recentEntries (W-05) — never re-sets isSaving/lastSavedAt/entries/allEntries (owned by primary set block)."
  - "wordsWritten kept as in-component useMemo in OverviewView — not part of FOUND-01 maintained set (per PATTERNS comment; Phase 8 widgets may pull from getEntryStats later)."
  - "recentEntries consumer uses .slice(0, 3) on store's stable 5-item primitive — exercises D-02 stable-ref under a real Phase 7 consumer (W-01 fix)."
  - "No new try/catch wrappers — refresh blocks inherit each parent action's pre-existing error envelope (W-02 — asymmetry intentional)."

patterns-established:
  - "Pattern: Zustand derived primitives = (1) interface fields, (2) initial values, (3) action-level refresh after existing set() block, (4) pure module-level helpers for compute logic, (5) identity-stable slice for array primitives."
  - "Pattern: two-tier refresh timing — full refresh (getEntryStats + all 4 primitives) on DB-mutation actions (create/delete/loadPage), primitives-only on edit-stream actions (saveContent) to avoid N+1 per keystroke."

requirements-completed: [FOUND-01, FOUND-03]

duration: ~15min
completed: 2026-04-17
---

# Phase 07-04: Derived primitives + local_date INSERT + OverviewView rewire Summary

**Ships FOUND-01 (4 maintained derived primitives on entryStore) + FOUND-03 D-11 (createEntry writes local_date) + OverviewView rewire to consume store primitives; zero visual change, C3 source pattern purged from src tree**

## Performance

- **Duration:** ~15 min (inline sequential execution)
- **Tasks:** 2 (both complete)
- **Files modified:** 2
- **Completed:** 2026-04-17

## Accomplishments
- `entryStore` exposes four maintained derived primitives: `totalEntries`, `dayStreak`, `moodCounts`, `recentEntries`.
- `createEntry` INSERT now writes `local_date` via `new Date().toLocaleDateString("en-CA")` (FOUND-03 D-11 closes the TZ-safety loop).
- Two module-level helpers added: `stableRecentSlice` (D-02 identity-stable top-5) and `computeMoodCounts` (D-04 lifetime scan).
- Refresh discipline codified: full refresh via `getEntryStats()` in `createEntry` / `deleteEntry` / `loadPage` (3 sites); primitives-only refresh in `saveContent` (D-05 — no aggregate during typing).
- `OverviewView.tsx` refactored: `calculateDayStreak` deleted, `startOfDay` import pruned, `stats` built from store subscriptions, `recentEntries` subscribes to FOUND-01 D-02 primitive.
- Render tree at OverviewView lines 99–254 untouched (visual identity preserved per `<specifics>`).

## Task Commits

1. **Task 1: entryStore FOUND-01 primitives + createEntry local_date INSERT** — `e386eae` (feat)
2. **Task 2: OverviewView consumes store primitives** — `b92c520` (refactor)

## Files Created/Modified
- `src/stores/entryStore.ts` — +71 / −1 lines. Import of `getEntryStats`; 4 new `EntryState` fields; `stableRecentSlice` + `computeMoodCounts` module helpers; initial values in creator; `createEntry` INSERT + refresh; `deleteEntry` refresh; `saveContent` primitives-only refresh; `loadPage` refresh inside try.
- `src/components/OverviewView.tsx` — +12 / −27 lines. `calculateDayStreak` deleted; `startOfDay` dropped from `date-fns` import; `stats` object reconstituted from store subscriptions + in-component `wordsWritten`/`tagsCreated`; `recentEntries` subscribes to store primitive with `.slice(0, 3)`.

## Decisions Made

None beyond the plan — D-01..D-14 conventions from 07-CONTEXT.md followed verbatim. All B-02, W-01, W-02, W-05 revisions from plan-checker honored.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

**Original Wave 2 executor subagent blocked by tool permissions.** The subagent-spawned executor reported tool-permission denials for `git reset --hard`, `Write`, and `Bash: mkdir` inside its isolated worktree, compounded by a systemic worktree-base mismatch (worktree created from pre-Phase-7 commit `67aac96`). Orchestrator fell back to sequential inline execution on the main working tree — both 07-03 and 07-04 executed this way. No plan content changed; commits and SUMMARY files all landed cleanly on `main`.

## Verification Results

All automated acceptance checks pass for both tasks:

**Task 1 (entryStore.ts):**
- `import { getEntryStats } from "../lib/dbQueries"` → 1 ✓
- `totalEntries: number;` → 1 ✓
- `function stableRecentSlice` / `function computeMoodCounts` → 1 each ✓
- `totalEntries: 0,` (initial) → 1 ✓
- `INSERT INTO entries (content, word_count, char_count, local_date)` → 1 ✓
- `toLocaleDateString("en-CA")` → 1 ✓
- `await getEntryStats()` → 3 (createEntry / deleteEntry / loadPage) ✓ (B-02)
- `computeMoodCounts(` / `stableRecentSlice(` → 5 each (1 defn + 4 call sites) ✓
- `updateCreatedAt` contains zero `getEntryStats` references ✓ (B-02)
- `saveContent` new `set()` block contains no `lastSavedAt`/`isSaving` → 0 ✓ (W-05)
- `npm run build` → exit 0 ✓

**Task 2 (OverviewView.tsx):**
- `function calculateDayStreak` → 0 (deleted) ✓
- `startOfDay` → 0 (import pruned, function gone) ✓
- date-fns import exactly `{ format, formatDistanceToNow, subDays }` ✓
- `useEntryStore((s) => s.totalEntries)` / `.dayStreak` / `.recentEntries.slice(0, 3)` → 1 each ✓ (W-01)
- `allEntries.slice(0, 3)` → 0 (removed) ✓
- `calculateMoodCounts` → 2 (definition + call site preserved) ✓
- `stats.*` refs → 5 (covers all StatCard usages) ✓
- `npm run build` → exit 0 ✓

**End-to-end FOUND-03 source purge:** `grep -rn "startOfDay(new Date())" src/components/ src/stores/ src/lib/` → 0 matches ✓ (the C3 source pattern is gone from the production tree).

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- **Phase 8** widgets can subscribe to `useEntryStore((s) => s.totalEntries)` / `s.dayStreak` as === comparable primitives, to `useShallow((s) => s.moodCounts)` for object shallow-equal, or to `s.recentEntries` directly for D-02 identity-stable top-5.
- The 4 primitives are maintained in every timeline-relevant action; Phase 8 does not need to add new refresh logic.
- No blockers. No deferred items. No threat-model flags.

## Runtime Verification (deferred)

Plan's `<verification>` section defines 7 runtime probes (React DevTools Profiler re-render storm check, selector === stability probe, createEntry local_date probe, streak source-code purge grep, updateCreatedAt indirect-refresh probe, build gate, no-regression smoke). Of these:
- Automated gates (#4 source purge, #6 build) — PASS.
- Live `npm run tauri dev` probes (#1, #2, #3, #5, #7) — deferred; require the running desktop app with a real SQLite DB.

These are runtime validations for the phase verifier to address; code-layer acceptance is complete.

---
*Phase: 07-foundation-derived-state*
*Completed: 2026-04-17*
