---
phase: 01-foundation
plan: 03
subsystem: database
tags: [tauri, sqlite, tauri-plugin-sql, migrations, react, zustand]

# Dependency graph
requires:
  - phase: 07 (v1.1 Foundation & Derived State, plan 07-01)
    provides: "FOUND-03 local_date column DDL + PRAGMA-guarded ALTER + backfill in src/lib/db.ts"
  - phase: 01 (v1.0 Foundation, plan 01-02)
    provides: "initializeDatabase() + splitSqlStatements() migration runner; dbError UI branch in App.tsx"
provides:
  - Correct migration ordering in src/lib/db.ts — idx_entries_local_date is now created by a standalone db.execute() call AFTER the PRAGMA-guarded ALTER block, not inside MIGRATION_SQL
  - Dev-only raw-SQLite-error rendering in the dbError branch of App.tsx (gated by import.meta.env.DEV) so future init failures surface their underlying cause
  - Regression closure for UAT-01: pre-Phase-07 DBs (v1.0 schema without local_date) now upgrade cleanly instead of failing with "no such column: local_date"
affects:
  - All future phases that add migration steps to src/lib/db.ts — the established pattern is "schema DDL in MIGRATION_SQL; non-idempotent or column-dependent ops in guarded blocks inside initializeDatabase() AFTER the migration loop"
  - Any future dbError diagnosis — the raw SQLite message is now visible in dev builds without needing to attach a debugger

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Migration-runner ordering: MIGRATION_SQL for-loop runs idempotent DDL only (CREATE TABLE IF NOT EXISTS, CREATE INDEX on always-present columns). Statements that depend on a schema change performed elsewhere in initializeDatabase() (like an index on a column added by a guarded ALTER) must run AFTER that guarded block, as a separate db.execute() call inside initializeDatabase()."
    - "Dev-only error surfacing: import.meta.env.DEV guards a <pre> that renders the raw error message inside user-facing error UIs. Production copy is unchanged."

key-files:
  created: []
  modified:
    - "src/lib/db.ts (removed idx_entries_local_date from MIGRATION_SQL template literal; added standalone CREATE INDEX IF NOT EXISTS db.execute() call inside initializeDatabase() AFTER the PRAGMA/ALTER/backfill block)"
    - "src/App.tsx (added dev-only <pre> rendering dbError beneath the existing user-facing copy in the State 2 error branch, lines 152-168)"

key-decisions:
  - "Reorder the migration — do NOT move the PRAGMA/ALTER block before the MIGRATION_SQL loop. Moving it earlier would try to ALTER a table that may not exist yet on fresh installs; keeping CREATE TABLE IF NOT EXISTS first and the dependent index last is the only ordering that is correct on all three paths (fresh / upgrade / idempotent relaunch)."
  - "Do NOT wrap the migration for-loop statements in per-statement try/catch — swallowing errors would hide real problems. The narrow fix (move one statement out) is sufficient and safer."
  - "Dev-only dbError surfacing never leaks raw SQL errors to end users (privacy/UX). import.meta.env.DEV is the same gate already used for diagnostic console.logs elsewhere in db.ts, keeping the project's dev/prod boundary consistent."
  - "Accept npx tsc --noEmit as the type-check verifier because this repo has no npm lint script (scripts are only: dev, build, preview, tauri). Plan verification requiring `npm run lint` was not applicable."

requirements-completed:
  - AI-01
  - AI-02
  - AI-03

# Metrics
duration: ~5min (implementation) + human UAT (on-device)
completed: 2026-04-17
---

# Phase 1 Plan 03: DB Migration Ordering Fix Summary

**Move `CREATE INDEX idx_entries_local_date` out of MIGRATION_SQL into `initializeDatabase()` after the PRAGMA-guarded ALTER, and surface raw SQLite errors in dev builds — closes UAT-01 blocker (pre-Phase-07 DB upgrade installs failing with "no such column: local_date").**

## Performance

- **Duration:** ~5 min implementation + human cold-start UAT on two DB snapshots
- **Started:** 2026-04-18T02:42Z (first task commit)
- **Completed:** 2026-04-18 (human approval after UAT scenarios A + B passed)
- **Tasks:** 3 completed (2 code, 1 human-verify checkpoint)
- **Files modified:** 2

## Accomplishments

- Fixed the Phase 07-01 migration-ordering regression in `src/lib/db.ts` that broke every upgrade install from v1.0: `idx_entries_local_date` creation is now a standalone `db.execute()` call in `initializeDatabase()` that runs AFTER the PRAGMA-guarded ALTER ensures the column exists on pre-Phase-07 DBs, not inside the MIGRATION_SQL for-loop where it raced ahead of its own column.
- Added dev-only raw-SQLite-error rendering in the `dbError` branch of `src/App.tsx` (State 2, lines 152-168) — the generic "check data folder write access" user copy is preserved for production, but `import.meta.env.DEV` now also renders the underlying error string in a styled `<pre>` so future init failures don't get misrouted to a permissions story the way this bug did.
- Human UAT confirmed the fix against BOTH the real 622KB pre-Phase-07 DB at `%APPDATA%/com.reviots.chronicle-ai/chronicle-ai.db` (Scenario A — upgrade install, the original regression path) AND a fresh DB after deletion (Scenario B — no regression on the happy path). User approved with `approved`.

## Task Commits

1. **Task 1: Reorder db.ts migration so local_date column exists before index** — `660ea05` (fix)
2. **Task 2: Surface underlying SQLite error in dev builds (App.tsx dbError UI)** — `154c4bc` (feat)
3. **Task 3: Human UAT — cold-start regression test on pre-Phase-07 DB** — approved by user after running Scenarios A + B; no code changes (verification-only checkpoint)

## Files Created/Modified

- `src/lib/db.ts` — Removed `CREATE INDEX IF NOT EXISTS idx_entries_local_date ON entries(local_date);` from the MIGRATION_SQL template literal; added a standalone `db.execute()` call for the same index inside `initializeDatabase()` AFTER the PRAGMA/ALTER/backfill block (line 185 at commit). Other two indexes (`idx_entries_created_at`, `idx_entries_mood`) remain in MIGRATION_SQL unchanged — they reference columns guaranteed by the CREATE TABLE DDL.
- `src/App.tsx` — Added a dev-only `<pre>` inside the State 2 `dbError` branch (lines 162-166 at commit) that renders the raw `dbError` string. Gated by `import.meta.env.DEV`. User-facing `h1` and `p` copy unchanged.

## Before / After — Migration Statement Ordering

**Before (broken on upgrade installs):**

```
MIGRATION_SQL (executed top-to-bottom in a for-loop):
  ...
  CREATE TABLE IF NOT EXISTS entries (... local_date TEXT);
  CREATE INDEX IF NOT EXISTS idx_entries_created_at ...
  CREATE INDEX IF NOT EXISTS idx_entries_mood ...
  CREATE INDEX IF NOT EXISTS idx_entries_local_date ON entries(local_date);  <-- THROWS on pre-Phase-07 DBs
  ... (rest of schema) ...

initializeDatabase() tail:
  PRAGMA table_info(entries) -> hasLocalDate?
  if (!hasLocalDate) ALTER TABLE entries ADD COLUMN local_date TEXT;
  <-- too late: CREATE INDEX already threw in the for-loop
```

On a pre-Phase-07 DB: `entries` already exists without `local_date`, so `CREATE TABLE IF NOT EXISTS` is a no-op; the column is never added by the DDL; `CREATE INDEX ... ON entries(local_date)` hits a missing column and SQLite throws `no such column: local_date`; the catch in `App.tsx` flips to `dbError`.

**After (correct on all three paths):**

```
MIGRATION_SQL (executed top-to-bottom in a for-loop):
  ...
  CREATE TABLE IF NOT EXISTS entries (... local_date TEXT);
  CREATE INDEX IF NOT EXISTS idx_entries_created_at ...
  CREATE INDEX IF NOT EXISTS idx_entries_mood ...
  <-- idx_entries_local_date removed from here
  ... (rest of schema) ...

initializeDatabase() tail:
  PRAGMA table_info(entries) -> hasLocalDate?
  if (!hasLocalDate) {
    ALTER TABLE entries ADD COLUMN local_date TEXT;
    UPDATE entries SET local_date = strftime(...) WHERE local_date IS NULL;
  }
  await db.execute("CREATE INDEX IF NOT EXISTS idx_entries_local_date ON entries(local_date)");
  <-- runs AFTER the column is guaranteed to exist on every code path
```

Correctness across all three cold-start paths:
- **Fresh install:** `entries` does not exist -> CREATE TABLE creates it with `local_date` in DDL -> PRAGMA finds column -> ALTER skipped -> CREATE INDEX succeeds.
- **Upgrade install (pre-Phase-07 DB):** `entries` exists without `local_date` -> CREATE TABLE is a no-op -> PRAGMA does NOT find column -> ALTER adds it, backfill populates rows -> CREATE INDEX succeeds.
- **Idempotent relaunch (already-migrated DB):** PRAGMA finds column -> ALTER skipped -> CREATE INDEX is a no-op on the already-existing index.

## UAT Verification

Both human-run scenarios from `<how-to-verify>` passed:

- **Scenario A — Upgrade install** (the regression scenario): `npm run tauri dev` against the real pre-Phase-07 DB at `%APPDATA%/com.reviots.chronicle-ai/chronicle-ai.db` (622KB, dated Apr 16). Expected: loading spinner then PIN entry or empty state + "Journal opened" toast, NO error screen. **Result: pass.**
- **Scenario B — Fresh install** (the no-regression scenario): DB deleted, `npm run tauri dev` run against a fresh data dir. Expected: same clean boot to PIN setup or empty state, NO error screen. **Result: pass.**

User response: `approved`.

## Decisions Made

- **Reorder instead of restructure:** Moving the PRAGMA/ALTER block BEFORE the MIGRATION_SQL loop was considered and rejected — CREATE TABLE IF NOT EXISTS is what creates the `entries` table on fresh installs, so an earlier ALTER would hit a missing table. Keeping the loop first and the column-dependent index last is the only ordering correct on all three paths.
- **Narrow fix, not defensive try/catch:** Wrapping each migration statement in a try/catch was considered and rejected — it would swallow real errors and only mask the next version of this same ordering bug. Fixing the ordering is cheaper and safer long-term.
- **Dev-only error surfacing, not production leak:** Raw SQL error strings are a developer tool; users get the stable user-facing copy. `import.meta.env.DEV` is the same gate used by existing diagnostic console.logs in `db.ts`, keeping the dev/prod boundary consistent.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `npm run lint` verifier not applicable — substituted `npx tsc --noEmit`**
- **Found during:** Task 2 (App.tsx dbError surfacing)
- **Issue:** Task 2's `<verify>` block listed `npm run lint` as an automated check, but this repo's `package.json` has no `lint` script — only `dev`, `build`, `preview`, `tauri`. Running `npm run lint` would error with "Missing script: lint" and fail the gate for an unrelated reason.
- **Fix:** Skipped `npm run lint` and relied on `npx tsc --noEmit` (already in the verify block) as the type/lint surrogate. No ESLint config file exists in the repo either (no `.eslintrc.*`, no `eslint` in dependencies), so this is a repo-state issue rather than a missing script that should be added in this plan.
- **Files modified:** None (verification-level deviation only)
- **Verification:** `npx tsc --noEmit` passed cleanly against both modified files.
- **Committed in:** N/A (not a code change)

---

**Total deviations:** 1 auto-fixed (1 blocking-verifier substitution)
**Impact on plan:** None on correctness. Future plans that touch verification should either skip `npm run lint` or include a task to add ESLint + a `lint` script to the project — tracked here, not expanded in scope for this gap-closure plan.

## Issues Encountered

None during execution. The root cause was already diagnosed in `.planning/debug/db-init-failure.md` before this plan began; the implementation was a straightforward application of that diagnosis.

## Learnings for Future Phases (Tauri SQL Plugin Migration Ordering)

- **`tauri-plugin-sql` `execute()` is single-statement only** — the repo's `splitSqlStatements()` already handles this, but it means MIGRATION_SQL is a sequence of independent statements, not a single transaction. If any statement mid-sequence fails, earlier statements are already committed and later statements never run — there is no rollback. This makes ordering bugs like UAT-01 silent time bombs that only surface on the specific schema state they target.
- **Never put a statement that references a schema addition INSIDE the same MIGRATION_SQL that performs the addition.** If a column is added by a guarded ALTER inside `initializeDatabase()` (because the ALTER isn't idempotent), then any index, trigger, or view referencing that column must also live inside `initializeDatabase()` AFTER the ALTER — never in the MIGRATION_SQL template, even behind `IF NOT EXISTS`. `IF NOT EXISTS` guards the target of the statement (the index), not its dependencies (the column).
- **`CREATE TABLE IF NOT EXISTS` is not an upgrade path.** Adding a column to an existing CREATE TABLE DDL handles fresh installs only — existing DBs still have the old schema. Every column addition needs an accompanying ALTER path, and every statement that depends on the new column needs to know which path it runs under.
- **Dev-only raw-error surfacing is cheap insurance.** UAT-01 was misdiagnosed for hours as a permissions bug because the error UI hid the real SQLite message. A 5-line `<pre>` guarded by `import.meta.env.DEV` would have shortened the diagnosis to minutes. Worth replicating in every user-facing error branch in future phases.

## User Setup Required

None — no external service configuration or manual env-var setup was introduced by this plan.

## Next Phase Readiness

- UAT-01 (blocker) closed — Phase 01 UAT test 1 ("App Compilation and Launch") no longer regresses on upgrade installs.
- UAT-02 (major, missing window controls in non-Unlocked states) remains OPEN — tracked by the already-defined plan `01-04-PLAN.md`. That plan lifts `<TitleBar />` to render in every app state.
- Migration pattern established here is safe to reuse for future schema additions in v1.1 Phase 7 and beyond.

## Known Stubs

None introduced by this plan. The fix is pure schema-ordering correctness — no placeholder data, no mocked components, no hardcoded empty values.

## Self-Check: PASSED

- `src/lib/db.ts` — modified: `idx_entries_local_date` removed from MIGRATION_SQL (lines 12-110 now contain only the two other indexes), added as standalone `db.execute()` at line 185 inside `initializeDatabase()` AFTER the PRAGMA/ALTER block. Verified via Read tool.
- `src/App.tsx` — modified: dev-only `<pre>` rendering `{dbError}` at lines 162-166 inside the State 2 branch. Verified via Read tool.
- Commit `660ea05` (fix: move idx_entries_local_date creation after ALTER guard) — confirmed in `git log`.
- Commit `154c4bc` (feat: surface raw SQLite error in dbError UI for dev builds) — confirmed in `git log`.

---
*Phase: 01-foundation*
*Completed: 2026-04-17*
