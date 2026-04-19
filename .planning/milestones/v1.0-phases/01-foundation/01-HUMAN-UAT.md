---
status: resolved
phase: 01-foundation
source: [01-VERIFICATION.md]
started: 2026-04-09T00:00:00Z
updated: 2026-04-17T00:00:00Z
resolved_by: [01-03-PLAN.md, 01-04-PLAN.md]
---

## Current Test

[testing complete]

## Tests

### 1. App Compilation and Launch
expected: Run `npm run tauri dev` — native window opens with custom title bar, sidebar (Journal nav item highlighted), spinner then "Your journal is ready" empty state, "Journal opened" toast bottom-right
result: issue
reported: "Screenshot shows error screen 'Could not open your journal — The database failed to initialize. Check that the app has write access to your data folder, then restart.' Application failed to start."
severity: blocker

### 2. Window Minimum Size Constraint
expected: Dragging window edges below 960×600 is resisted — window does not shrink below minimums
result: pass

### 3. Window Control Buttons
expected: Minimize/Maximize/Close buttons in the custom title bar each perform their OS action via Tauri API
result: issue
reported: "There are no minimize, maximize or close buttons visible in the title bar."
severity: major

### 4. Zero Network Calls
expected: Opening WebView devtools Network tab on launch shows zero requests to any external domain
result: pass

## Summary

total: 4
passed: 4
issues: 0
pending: 0
skipped: 0
blocked: 0
notes: "Tests 1 and 3 originally failed; resolved by 01-03 (UAT-01) and 01-04 (UAT-02) gap-closure plans, re-verified 2026-04-17."

## Gaps

- truth: "Running `npm run tauri dev` opens a working journal window with the empty-state UI and 'Journal opened' toast."
  status: resolved
  resolved_by: 01-03-PLAN.md
  reason: "User reported: Screenshot shows 'Could not open your journal — The database failed to initialize. Check that the app has write access to your data folder, then restart.' Application failed to start."
  severity: blocker
  test: 1
  root_cause: "Phase 07-01 migration-ordering bug in src/lib/db.ts. `CREATE INDEX IF NOT EXISTS idx_entries_local_date ON entries(local_date)` (line 32) runs inside the MIGRATION_SQL for-loop (lines 160-163) BEFORE the PRAGMA-guarded `ALTER TABLE entries ADD COLUMN local_date` (lines 168-180). On pre-Phase-07 databases, `CREATE TABLE IF NOT EXISTS entries` is a no-op so `local_date` is never added; the index statement then references a missing column, SQLite throws `no such column: local_date`, error propagates to App.tsx:63-67 which flips render to the `dbError` branch. Generic error copy in App.tsx:153-163 mis-attributed the failure to data-folder permissions. Fresh installs are unaffected because CREATE TABLE DDL already includes the column."
  artifacts:
    - path: "src/lib/db.ts"
      issue: "Line 32 creates idx_entries_local_date inside MIGRATION_SQL; this runs before the PRAGMA-guarded ALTER at lines 168-180 that adds the column on upgrade installs."
    - path: "src/lib/db.ts"
      issue: "Lines 160-163 execute MIGRATION_SQL statements top-to-bottom with no try/catch per statement, so the first failure aborts init."
    - path: "src/App.tsx"
      issue: "Lines 63-67 swallow the real SQLite error and line 153-163 renders a generic 'data folder write access' message that obscures the root cause."
  missing:
    - "Move idx_entries_local_date creation out of MIGRATION_SQL into the PRAGMA-guarded upgrade block, AFTER the ALTER ensures the column exists."
    - "Alternatively, run the PRAGMA/ALTER upgrade block before the MIGRATION_SQL loop so the column always exists before any index referencing it."
    - "In dev builds, surface the actual SQLite error message in the dbError UI so future diagnoses don't misroute to permissions."
    - "Add a regression UAT: run the app against a pre-Phase-07 DB snapshot and confirm clean upgrade → empty-state."
  debug_session: .planning/debug/db-init-failure.md

- truth: "Custom title bar exposes Minimize, Maximize, and Close controls that invoke the Tauri window API."
  status: resolved
  resolved_by: 01-04-PLAN.md
  reason: "User reported: There are no minimize, maximize or close buttons visible in the title bar."
  severity: major
  test: 3
  root_cause: "Regression introduced by commit 40f6ea6 (Phase 05-01 PIN security). `<AppShell>` is the only component that mounts `<TitleBar />` (AppShell.tsx:7), and App.tsx now renders `<AppShell>` only inside the State 6 (Unlocked) branch (line 187). States 1-5 (loading, dbError, PIN unknown, PIN setup, PIN locked — lines 143-183) render as raw siblings of the root fragment with no TitleBar wrapper. Combined with `decorations: false` in src-tauri/tauri.conf.json:21, the window has zero Min/Max/Close controls (neither OS-native nor custom-drawn) in any non-happy-path state. The user's UAT was stuck in the dbError state, which is why controls appeared missing. This is independent of the DB init bug — even on a clean DB init, the loading and PIN screens still lack the title bar."
  artifacts:
    - path: "src/App.tsx"
      issue: "Lines 140-195: <AppShell> wraps only the State 6 branch (line 187). States 1-5 render raw elements at the fragment root with no TitleBar."
    - path: "src/components/AppShell.tsx"
      issue: "Line 7: sole mount point for <TitleBar />. Correct internally; simply not reached from non-unlocked states."
    - path: "src-tauri/tauri.conf.json"
      issue: "Line 21: `decorations: false` is correct per Phase 01 spec, but it makes the custom TitleBar load-bearing for every window state."
    - path: "src/components/PinSetupScreen.tsx"
      issue: "Full-screen layout that does not include TitleBar."
    - path: "src/components/PinEntryScreen.tsx"
      issue: "Full-screen layout that does not include TitleBar."
  missing:
    - "Lift <TitleBar /> so it renders in every app state, not just Unlocked. Simplest: render it once at the top of App.tsx's returned tree, above the state switch, with each state filling the viewport below a 48px title bar."
    - "Alternative: extract a minimal 'chrome' component (TitleBar + children only, no Sidebar) and wrap loading/dbError/PIN states in it; keep full <AppShell> for Unlocked."
    - "Add regression UAT tests: visit each state (loading, dbError, PIN setup, PIN entry) and assert Min/Max/Close controls are present and clickable."
  debug_session: .planning/debug/missing-window-controls.md
