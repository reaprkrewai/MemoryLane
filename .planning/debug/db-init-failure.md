---
status: diagnosed
trigger: "On `npm run tauri dev`, the app never reaches the journal empty state. Instead the window shows an error screen: \"Could not open your journal — The database failed to initialize. Check that the app has write access to your data folder, then restart.\""
created: 2026-04-17
updated: 2026-04-17
---

## Current Focus

reasoning_checkpoint:
  hypothesis: "Phase 07-01 introduced `CREATE INDEX IF NOT EXISTS idx_entries_local_date ON entries(local_date)` as statement #4 in MIGRATION_SQL, executed BEFORE the guarded `ALTER TABLE entries ADD COLUMN local_date` block. Against an existing (pre-Phase-07) database whose `entries` table has no `local_date` column, the CREATE INDEX throws `no such column: local_date`, initializeDatabase rejects, and App.tsx catch renders the 'Could not open your journal' error screen."
  confirming_evidence:
    - "File `%APPDATA%/com.reviots.chronicle-ai/chronicle-ai.db` exists (622KB, last modified Apr 16 15:31), predates Phase 07-01 commit 87bd845 (Apr 17 06:41)"
    - "sqlite3 inspection: `entries` table has 8 columns (id, content, mood, word_count, char_count, created_at, updated_at, metadata) — NO local_date"
    - "Reproduced the failing statement directly: `sqlite3 ... \"CREATE INDEX IF NOT EXISTS test_idx ON entries(local_date);\"` produces `Error: in prepare, no such column: local_date`"
    - "src/lib/db.ts line 32 contains exactly that CREATE INDEX statement, executed by splitSqlStatements+db.execute at line 162, which runs BEFORE the PRAGMA-guarded ALTER at line 168-180"
    - "src/App.tsx line 63-67 catches the throw in initApp and calls setDbError(message) — matches the rendered error UI on line 153-163"
  falsification_test: "Delete `%APPDATA%/com.reviots.chronicle-ai/chronicle-ai.db`, rerun `npm run tauri dev` — app should boot cleanly because a fresh install uses the CREATE TABLE DDL which already contains `local_date`. Conversely, if the error persists on a fresh DB, the hypothesis is wrong."
  fix_rationale: "Root cause is migration ordering: the idempotent CREATE INDEX on a new column must not run before the ALTER that adds the column. Fix direction: move the `idx_entries_local_date` index creation OUT of MIGRATION_SQL and INTO the PRAGMA-guarded block (create the index only after ensuring the column exists) — OR run the PRAGMA+ALTER block BEFORE the rest of MIGRATION_SQL executes. This addresses the mechanism, not a symptom."
  blind_spots: "Not verified at runtime in this worktree (would require npm install + tauri dev + Rust compile). Have not confirmed whether the user's UAT screenshot shows the 'Journal opened' toast or not — if it shows 'Journal opened' before the error, ordering would be different. Not confirmed whether getAppLock() also contributes; unlikely given app_lock table exists in the user's DB."

hypothesis: CREATE INDEX on local_date runs before PRAGMA-guarded ALTER adds the column; on pre-Phase-07 DBs this throws "no such column: local_date" → App.tsx catch renders the DB error screen
test: sqlite3 direct execution of the failing statement against the user's actual DB
expecting: Direct reproduction of the exact SQL error
next_action: Return ROOT CAUSE FOUND to orchestrator — mode is find_root_cause_only, do not fix

## Symptoms

expected: Run `npm run tauri dev` — native window opens with custom title bar, sidebar (Journal nav item highlighted), spinner then "Your journal is ready" empty state, "Journal opened" toast bottom-right
actual: Error screen rendered: title "Could not open your journal", subtitle "The database failed to initialize. Check that the app has write access to your data folder, then restart." The rest of the app never appears. App UI responsive, window minimum size enforced.
errors: None surfaced in user-visible UI beyond the rendered error message. SQLite error "no such column: local_date" would be captured by dbError state (currently not displayed to user).
reproduction: Test 1 in .planning/phases/01-foundation/01-HUMAN-UAT.md — launch `npm run tauri dev` on Windows 11
started: Discovered during Phase 01 human UAT on 2026-04-17. Regression introduced by Phase 07-01 commits 87bd845 (Apr 17 06:41, added `local_date` to CREATE TABLE DDL + CREATE INDEX) and 69547d1 (Apr 17 06:42, added guarded ALTER). The ALTER guard correctly handles the case, but runs AFTER the CREATE INDEX statement that depends on the new column.

## Eliminated

- hypothesis: Tauri SQL plugin cannot create the app data directory on Windows
  evidence: Directory `%APPDATA%/com.reviots.chronicle-ai/` exists and is writable; `chronicle-ai.db` (622KB) is inside it and was last modified normally
  timestamp: 2026-04-17

- hypothesis: App identifier mismatch between `com.chronicle.journal` (old) and `com.reviots.chronicle-ai` (new) caused path confusion
  evidence: Both dirs exist; the new one has the current database. The current-identifier DB opens successfully (Database.load succeeds — the error comes from schema migration, not connection)
  timestamp: 2026-04-17

- hypothesis: getAppLock() throws because app_lock table is missing
  evidence: User's DB already contains app_lock table (phase 05 was already applied previously)
  timestamp: 2026-04-17

- hypothesis: splitSqlStatements mis-parses BEGIN...END trigger blocks
  evidence: Traced each statement boundary; BEGIN/END depth tracking handles the three FTS triggers correctly. Also, the user's DB already has all three fts triggers, so they executed successfully in a past run
  timestamp: 2026-04-17

## Evidence

- timestamp: 2026-04-17T20:30:00Z
  checked: src/App.tsx lines 48-71 — the initApp catch block
  found: "setDbError(message)" triggers State 2 (dbError branch) in the render, which shows "Could not open your journal" heading + "The database failed to initialize..." body
  implication: The user-visible error originates from ANY throw inside initializeDatabase() or getAppLock(). Must trace which one throws.

- timestamp: 2026-04-17T20:33:00Z
  checked: src/lib/db.ts — MIGRATION_SQL content and splitSqlStatements flow
  found: Line 30-32 contains 3 CREATE INDEX statements including `CREATE INDEX IF NOT EXISTS idx_entries_local_date ON entries(local_date);`. These are executed BEFORE the guarded ALTER block at line 168-180.
  implication: For any DB whose entries table lacks local_date, the CREATE INDEX will throw before the ALTER can add the column.

- timestamp: 2026-04-17T20:36:00Z
  checked: git log --oneline --all -- src/lib/db.ts
  found: Commits 87bd845 (add local_date to DDL + CREATE INDEX) and 69547d1 (add PRAGMA-guarded ALTER) are both from 2026-04-17 — Phase 07-01. Before these, local_date did not exist.
  implication: This is a Phase 07 regression against installs that had Phase 01-06 databases.

- timestamp: 2026-04-17T20:38:00Z
  checked: $APPDATA directory listing
  found: Two app data dirs exist — `com.chronicle.journal` (old identifier, contains memorylane.db 86KB from Apr 9) and `com.reviots.chronicle-ai` (current identifier, contains chronicle-ai.db 622KB from Apr 16 15:31).
  implication: Current install uses com.reviots.chronicle-ai. The 622KB size + Apr 16 mtime confirms heavy prior use across Phases 2-6 before Phase 07 commits landed today.

- timestamp: 2026-04-17T20:40:00Z
  checked: sqlite3 "$APPDATA/com.reviots.chronicle-ai/chronicle-ai.db" "PRAGMA table_info(entries);"
  found: entries table has 8 columns (0-7): id, content, mood, word_count, char_count, created_at, updated_at, metadata. NO local_date column.
  implication: Pre-Phase-07 schema. The guarded ALTER (db.ts line 170) would correctly add the column — but only if execution reaches line 170.

- timestamp: 2026-04-17T20:41:00Z
  checked: sqlite3 "$APPDATA/com.reviots.chronicle-ai/chronicle-ai.db" "CREATE INDEX IF NOT EXISTS test_idx ON entries(local_date);"
  found: "Error: in prepare, no such column: local_date" — exactly the failing statement from db.ts line 32
  implication: Direct reproduction of the root cause. When initializeDatabase iterates statements, statement #4 (CREATE INDEX on local_date) will throw. The throw propagates to App.tsx catch, setDbError fires, error screen renders.

- timestamp: 2026-04-17T20:42:00Z
  checked: src/lib/db.ts line 160-180 — execution order
  found: for loop at line 160 executes ALL MIGRATION_SQL statements sequentially via await db.execute(stmt); the PRAGMA table_info guard + ALTER runs at line 168-180, strictly AFTER the for loop completes. No try/catch around individual statements.
  implication: The fix is ordering-based. The guarded ALTER+backfill block must run BEFORE the CREATE INDEX IF NOT EXISTS idx_entries_local_date ON entries(local_date), either by splitting MIGRATION_SQL into two halves (pre-upgrade DDL and post-upgrade indexes) or by moving the local_date index creation INTO the guarded block (only created after ALTER succeeds OR alongside the CREATE TABLE when hasLocalDate is already true on fresh installs — making the index creation idempotent via CREATE INDEX IF NOT EXISTS after the column is guaranteed to exist).

## Resolution

root_cause: |
  Phase 07-01 (commits 87bd845 + 69547d1) added `local_date` to the entries schema via two mechanisms:
  (1) a new column in the CREATE TABLE DDL, (2) a CREATE INDEX IF NOT EXISTS on that column in MIGRATION_SQL, and (3) a PRAGMA-guarded ALTER TABLE + backfill for existing DBs.

  The CREATE INDEX (db.ts line 32) executes as part of the MIGRATION_SQL for-loop, BEFORE the guarded ALTER at line 168-180. For any DB that predates Phase 07 (i.e. the user's current %APPDATA%/com.reviots.chronicle-ai/chronicle-ai.db — confirmed schema-missing local_date), CREATE TABLE IF NOT EXISTS is a no-op (table already exists without the new column), so the new column never gets added before the CREATE INDEX tries to reference it.

  SQLite rejects the index creation with `no such column: local_date` — reproduced directly against the user's database file. The error propagates from db.execute() through initializeDatabase() to the catch in App.tsx initApp (line 63-67), which calls setDbError(message), switching the render to State 2 ("Could not open your journal — The database failed to initialize…").

  Fresh installs do NOT hit this because the CREATE TABLE actually runs and includes local_date. The bug is specific to the upgrade path, which is precisely why Phase 07-01 added the ALTER guard — but the guard runs too late.

fix: (not applied — diagnose-only mode. See "Suggested Fix Direction" in returned diagnosis.)
verification: (not applied — diagnose-only mode)
files_changed: []
