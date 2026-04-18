---
phase: 07-foundation-derived-state
fixed_at: 2026-04-17T00:00:00Z
review_path: .planning/phases/07-foundation-derived-state/07-REVIEW.md
iteration: 1
findings_in_scope: 3
fixed: 3
skipped: 0
status: all_fixed
---

# Phase 7: Code Review Fix Report

**Fixed at:** 2026-04-17
**Source review:** `.planning/phases/07-foundation-derived-state/07-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope: 3 (warnings only; info findings deferred per `fix_scope = critical_warning`)
- Fixed: 3
- Skipped: 0

All three warning-level findings from the Phase 7 review were applied cleanly. Each fix
was committed atomically with a `fix(07): {ID} ...` message. Project-wide `tsc --noEmit`
passed after every commit. Five info findings (IN-01..IN-05) remain open by design and
should be triaged by the developer or rolled into a follow-up phase if desired.

## Fixed Issues

### WR-01: `recentEntries.slice(0, 3)` in selector defeats D-02 stable-ref optimization

**Files modified:** `src/components/OverviewView.tsx`
**Commit:** `f58ab80`
**Applied fix:** Replaced the `useEntryStore((s) => s.recentEntries.slice(0, 3))` selector
with a two-step pattern that subscribes to the identity-stable `recentEntries` reference
and derives the top-3 via `useMemo`. The store-level D-02 stable-ref optimization is now
honored on this subscriber: unrelated mutations no longer trigger re-renders of the
overview's recent-entries list. Updated the inline comment to explain why `.slice()`
inside the selector breaks the contract. Used Option A from REVIEW.md (preferred — pairs
with D-02 contract; `useMemo` was already imported in the file).

### WR-02: `updateMood` does not refresh derived `moodCounts`

**Files modified:** `src/stores/entryStore.ts`
**Commit:** `13de2c0`
**Applied fix:** Added a post-write recomputation block at the end of `updateMood` that
mirrors the `saveContent` pattern (entryStore.ts:221-225). Now recomputes `moodCounts`
via `computeMoodCounts(allEntries)` and refreshes `recentEntries` via
`stableRecentSlice` (the `updated_at` bump can rotate the leading slice). Skipped the
`getEntryStats()` round-trip since `totalEntries` and `dayStreak` are unaffected by
mood-only mutations — matches the `saveContent` treatment. Added a comment citing D-01
"every write action recomputes derived primitives" and explaining the selective skip.
Note: the logic is straightforward maintenance code that matches the existing pattern,
so no human verification flag is needed.

### WR-03: `createEntry` uses racy `ORDER BY created_at DESC LIMIT 1` to recover new row's id

**Files modified:** `src/stores/entryStore.ts`
**Commit:** `e63aa23`
**Applied fix:** Used Option B (client-side id generation) per orchestrator guidance.
Generated `newId` via `crypto.randomUUID().replace(/-/g, "")` before the INSERT,
producing a 32-lowercase-hex string that exactly matches the schema default
(`lower(hex(randomblob(16)))`). The INSERT now passes `id` explicitly, and the
follow-up `SELECT id FROM entries ORDER BY created_at DESC LIMIT 1` recovery query was
removed entirely. Downstream `selectedEntryId` assignment, `WHERE id = ?` row lookup,
and the `return newId` value all reference the deterministic client-generated id, so
two `createEntry` calls in the same millisecond can no longer cross-wire ids. Added a
comment explaining the race scenarios (bulk seed, double-click, batch import) and the
D-11 `local_date` coupling that motivated upgrading the pattern.

**Why Option B and not Option A (`RETURNING`):** tauri-plugin-sql v2.4.0 dispatches
`db.execute` and `db.select` to two separate Rust handlers (`plugin:sql|execute` and
`plugin:sql|select`). Issuing an `INSERT ... RETURNING` through `db.select` is
undocumented behavior in this plugin, and the codebase has no existing usage to confirm
it works against the SQLite backend. Per the orchestrator instruction "if uncertain,
use Option B," client-side id generation was chosen as the known-safe path that
preserves the schema's id format.

## Verification

For each fix:
- **Tier 1:** Re-read modified file region; confirmed fix text present and surrounding code intact.
- **Tier 2:** Ran `npx tsc --noEmit` across the project; zero errors after every commit.
- **Tier 3:** N/A — TypeScript covers all three files.

No rollbacks were required. The working tree contains no uncommitted changes attributable to this fix run (only the pre-existing untracked `.claude/worktrees/*` directories remain, which are out of scope).

---

_Fixed: 2026-04-17_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
