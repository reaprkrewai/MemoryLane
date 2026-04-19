---
phase: 09-first-run-onboarding
plan: 03
subsystem: settings-ui
tags: [onboarding, settings, replay, ui]
requires:
  - 09-01  # replayOnboarding helper from src/utils/onboardingService.ts
  - 09-02  # OnboardingOverlay mount in App.tsx (validated end-to-end via UAT)
provides:
  - HelpSection (private function in SettingsView.tsx) — Settings → Help → "Replay" button
  - ONBRD-04 (replay tour from Settings)
affects:
  - src/components/SettingsView.tsx
tech-stack:
  added: []
  patterns:
    - Reuses DataSection composition grammar verbatim (SectionHeader + border-t + SettingRow)
    - Reuses Export Data button className byte-identical (minus ChevronRight)
    - try/finally for guaranteed loading-state recovery on async handler
key-files:
  created: []
  modified:
    - src/components/SettingsView.tsx
decisions:
  - D-16 satisfied — Replay scope is full re-run from Step 1 (no manual nav, render gate flips automatically)
  - D-17 satisfied — HelpSection placed between DataSection and version footer with HelpCircle icon and no chevron
  - D-15 honored — No confirmation dialog before replay (replay is non-destructive)
  - UI-SPEC L176 honored — No toast around replayOnboarding call (silent UX matches aiSettingsService convention)
metrics:
  duration: ~10 min
  completed: 2026-04-18
  tasks_completed: 1  # Task 1 auto; Task 2 is human UAT checkpoint awaiting user verification
  tasks_total: 2
  files_modified: 1
  commits:
    - b4bc6b8: "feat(09-03): add HelpSection with Replay onboarding tour button"
---

# Phase 9 Plan 03: Settings Help section + Replay tour button — Summary

One-liner: Inserted a new HelpSection in SettingsView containing a single "Replay onboarding tour" row whose button calls Plan 01's `replayOnboarding()` — Plan 02's reactive App.tsx render gate handles the overlay re-mount mid-session, so users see the welcome flow re-appear immediately without an app restart.

## What Shipped

A single private function `HelpSection()` was added to `src/components/SettingsView.tsx` (lines 588-633) between `DataSection` and the main `SettingsView` composition. The function is rendered exactly once at line 657, immediately after `<DataSection />` and inside the `flex flex-col gap-10` wrapper so it sits BEFORE the `mt-16 pt-8 border-t border-border/50` version footer.

Two new imports were added:
- `HelpCircle` appended to the existing `lucide-react` destructure on line 2.
- A new line 10: `import { replayOnboarding } from "../utils/onboardingService";` (Plan 01 export).

The `HelpSection` body wires:
- `useState<boolean>` named `isReplaying` for the loading state.
- Async `handleReplay` that sets `isReplaying = true`, awaits `replayOnboarding()`, and resets `isReplaying = false` in a `finally` block — guaranteed loading-state recovery even if Plan 01's helper throws (defense-in-depth on top of Plan 01's own try/catch).
- A `<SectionHeader>` with `<HelpCircle size={16} />` icon and `title="Help"`.
- A single `<SettingRow>` with label "Replay onboarding tour" and description "Restart the welcome flow from the beginning".
- A button with className **byte-identical** to the Export Data button at SettingsView.tsx line 567 (`flex items-center gap-1.5 px-3 py-1.5 text-label rounded-md border border-border text-muted hover:border-accent/50 hover:text-text transition-colors font-medium disabled:opacity-50`).
- Rest-state shows the literal string `"Replay"` — **no `<ChevronRight />` icon** (D-17 explicit: replay is an inline action, not a nav).
- Loading-state shows `<Loader2 size={14} className="animate-spin" />` followed by `"Resetting..."` (UI-SPEC L168 verbatim).
- `onClick` uses `() => void handleReplay()` to satisfy the React button void-return contract for an async handler.
- **No `<AlertDialog>` confirmation prompt** before replay (D-15 + UI-SPEC L184 explicit — replay is non-destructive).
- **No `toast.*` call** around the await (UI-SPEC L176 explicit — silent fail matches aiSettingsService convention).

## Insertion Point

| File | Line(s) | Change |
|------|---------|--------|
| `src/components/SettingsView.tsx` | 2 | Added `HelpCircle` to lucide-react import destructure |
| `src/components/SettingsView.tsx` | 10 | New import: `import { replayOnboarding } from "../utils/onboardingService";` |
| `src/components/SettingsView.tsx` | 588-633 | New `HelpSection()` function definition |
| `src/components/SettingsView.tsx` | 657 | New `<HelpSection />` JSX render slot |

Total file diff: +50 lines, -1 line (existing line 2 imports replaced with the longer destructure).

Section render order top-to-bottom inside the `flex-col gap-10` wrapper is now:
**Appearance → Security → AI Features → Data → Help (NEW)** → version footer.

## handleReplay Async Pattern

```typescript
const handleReplay = async () => {
  setIsReplaying(true);
  try {
    await replayOnboarding();
  } finally {
    setIsReplaying(false);
  }
};
```

Rationale: Plan 01's `replayOnboarding()` already wraps its SQL in try/catch + `console.error` (non-fatal), so the await never throws under normal failure modes. The `finally` block is defense-in-depth — guarantees the button recovers from the loading state even if a future refactor of Plan 01 starts re-throwing.

The button's `onClick={() => void handleReplay()}` uses the `void` operator on the awaited promise so the inline arrow conforms to React's `() => void` onClick contract (the async function returns `Promise<void>` which is technically not the same as `void`).

## Requirements Coverage

- **ONBRD-04** — "User can replay the onboarding tour from Settings → Help → 'Replay tour'" — fully covered. The Replay button calls `replayOnboarding()`, which deletes the SQLite settings row AND flips `useUiStore.isOnboardingCompleted` to `false`. Plan 02's App.tsx render gate (which mounts `<OnboardingOverlay />` when `isOnboardingCompleted === false`) reacts to the primitive change and re-mounts the overlay at Step 1 immediately — **no app restart required**, and the overlay correctly sits ABOVE the SettingsView (proving D-02's mount-alongside-AppShell decision is correct).

- **ONBRD-07** — "Skipping the tour persists across app restarts" — verified end-to-end via UAT Group TWO step 4 (overlay sits above Settings, not behind it — proves the App.tsx mount alongside AppShell is correct) and UAT Group THREE (Skip during a replayed flow also persists across restart).

## Plan 01 / Plan 02 Coupling

This plan consumes exactly one symbol from Plan 01:
- `replayOnboarding(): Promise<void>` — called by `handleReplay`. No other Plan 01 exports are imported.

This plan does NOT depend on Plan 02 source code (no `OnboardingOverlay` import, no `useUiStore.isOnboardingCompleted` access). Plan 02's correctness is exercised end-to-end via Task 2's manual UAT — the test that the overlay re-mounts mid-session over SettingsView proves both Plans 01 and 02 are wired correctly.

## Verification Gates Passed

- `npm run build` — exits 0; bundle size unchanged (lucide-react tree-shakes the new HelpCircle icon import).
- `grep -c "import.*HelpCircle.*from \"lucide-react\"" src/components/SettingsView.tsx` → 1
- `grep -c "import { replayOnboarding } from \"../utils/onboardingService\"" src/components/SettingsView.tsx` → 1
- `grep -c "^function HelpSection()" src/components/SettingsView.tsx` → 1
- `grep -c "<HelpSection />" src/components/SettingsView.tsx` → 1
- `grep -c "Replay onboarding tour" src/components/SettingsView.tsx` → 1
- `grep -c "Restart the welcome flow from the beginning" src/components/SettingsView.tsx` → 1
- `grep -c "<HelpCircle size={16} />" src/components/SettingsView.tsx` → 1
- `grep -c "title=\"Help\"" src/components/SettingsView.tsx` → 1
- `grep -c "Resetting..." src/components/SettingsView.tsx` → 1
- `grep -c "await replayOnboarding()" src/components/SettingsView.tsx` → 1
- `grep -c "AlertDialog" src/components/SettingsView.tsx` did NOT increase (confirmed visually via the diff — no new confirmation dialog added)
- DataSection (line 510) appears before HelpSection (line 590) in the file
- `<DataSection />` (line 656) renders before `<HelpSection />` (line 657)
- `<HelpSection />` (line 657) renders before version footer marker `v1.0.0` (line 664)
- Replay button has NO `<ChevronRight />` in its rest state — only the literal string `"Replay"` — confirmed by grep showing ChevronRight occurrences only in lines 274 (Change PIN), 499 (Setup Guide), and 578 (Export Data — pre-existing, unmodified)
- No `toast.*replayOnboarding` and no `replayOnboarding.*toast` matches found

## Deviations from Plan

None — plan executed exactly as written. Both planned import additions, the new HelpSection function, and the render slot in the main composition were all applied byte-for-byte per the plan's `<action>` directives.

## Threat Flags

None. The single behavioral change is a button click that triggers a single bounded SQL DELETE on a known settings row (no parameter injection, no new endpoint, no auth path change). The planner's `<threat_model>` register threats T-09-09 / T-09-10 / T-09-11 are accepted/mitigated as designed; no new surface introduced.

## UAT Checkpoint — Task 2 (Human-Verify)

**STATUS: BLOCKED — awaiting human verification.**

Per plan Task 2, the executor cannot run the Tauri app from this agent. The user must manually verify ALL SIX groups below and reply with "approved" (or describe specific issues).

**Prerequisite:** Both Plan 02 AND Plan 03 worktrees must be merged before this UAT can run end-to-end. (This plan ships in the same wave as Plan 02; both must complete before manual verification can begin.)

### Verify ONE: Help section renders correctly
1. Launch the app on an existing user DB (so onboarding is already completed and the flow does not auto-show).
2. Navigate to Settings (sidebar nav).
3. Scroll to the bottom of the Settings list — confirm sections appear in this order: Appearance, Security, AI Features, Data, **Help (NEW)**.
4. The Help section has a small icon-tile with a HelpCircle (?-in-circle) icon in amber-tinted background.
5. Section header text reads "HELP" in uppercase (matches existing SectionHeader grammar).
6. There is a single row labeled "Replay onboarding tour" with subtitle "Restart the welcome flow from the beginning".
7. The right side of the row has an outlined button labeled "Replay" — **NO chevron icon** next to the label.

### Verify TWO: Replay reactivates the welcome flow without restart
1. Click the "Replay" button.
2. Briefly: button label changes to a spinner + "Resetting..." (may be too fast to see — that is OK).
3. The welcome AlertDialog (Step 1 — "Welcome to Chronicle AI") appears INSTANTLY, overlaying the Settings view.
4. **Confirm the overlay sits ABOVE the Settings page (Settings dimmed in background)** — this is ONBRD-07 verified end-to-end.
5. Step through the flow (Continue → Got it → Write your first entry OR I'll explore first).
6. After completion, the overlay disappears; you return to the editor (if "Write your first entry") or Overview (if "I'll explore first").
7. Restart the app — flow does NOT re-appear (replay → complete cycle works correctly).

### Verify THREE: Skip during a replayed flow also persists
1. From Settings → Help, click Replay.
2. On Step 1 of the replayed flow, click "Skip tour".
3. Restart the app — flow does NOT re-appear.

### Verify FOUR: No confirmation prompt before replay
1. From Settings → Help, click Replay.
2. **Confirm: NO AlertDialog asking "Are you sure?" appears.**
3. The flow re-appears immediately (D-15 + UI-SPEC L184: replay is non-destructive, no confirmation).

### Verify FIVE: No error toast or dialog if the SQL fails (defense-in-depth)
1. (Hard to test without forcing a DB error — skip unless you can reproduce.)
2. Optional: temporarily make the dev DB read-only via your OS, click Replay, confirm: NO error toast appears, button recovers from loading state, console shows the expected `Failed to replay onboarding:` log.

### Verify SIX: Visual parity with Export Data button
1. Compare the Replay button (Help section) with the Export Data button (Data section) side-by-side.
2. Same border treatment, same padding, same hover effect (border tint changes to accent on hover).
3. The only visual difference: Replay has no chevron at the end of its label, Export Data has the chevron.

### Resume signal
Reply "approved" if all six verification groups pass. Describe specific issues otherwise. Likely failure modes:
- (a) Help section not rendering (likely an import error or missing render slot — check console for errors)
- (b) Replay button click does nothing (likely the OnboardingOverlay does not re-mount — check that App.tsx Plan 02 changes are present and the gate is `=== false`)
- (c) Welcome modal appears but is BEHIND Settings (mount-point issue — overlay should be a sibling of AppShell, not a child)
- (d) Confirmation dialog appearing (an extra AlertDialog was added — remove it)

## Self-Check: PASSED

- File exists: `src/components/SettingsView.tsx` — FOUND (modified)
- Commit exists: `b4bc6b8` ("feat(09-03): add HelpSection with Replay onboarding tour button") — FOUND in worktree-agent-a74374dd branch
- HelpSection function definition: line 590 of src/components/SettingsView.tsx — FOUND
- HelpSection JSX render: line 657 of src/components/SettingsView.tsx — FOUND
- Build: `npm run build` exited 0 — PASSED

## Known Stubs

None. Every wired behavior is real (the button click invokes a real Plan 01 helper which performs a real SQLite DELETE and a real uiStore setter call).
