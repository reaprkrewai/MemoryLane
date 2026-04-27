---
status: testing
phase: 09-first-run-onboarding
source:
  - 09-01-SUMMARY.md
  - 09-02-SUMMARY.md
  - 09-03-SUMMARY.md
started: 2026-04-19T00:00:00Z
updated: 2026-04-19T00:05:00Z
---

## Current Test
<!-- OVERWRITE each test - shows where we are -->

number: 4
name: Step 1 Escape Key Persists Skip
expected: |
  Press Escape while Step 1 is showing → overlay closes AND the skip persists (markOnboardingCompleted was called via onOpenChange → handleSkip). Restart the app → Welcome flow does NOT reappear.
awaiting: user response

## Tests

### 1. Cold Start Smoke Test
expected: Kill any running Tauri dev process. Clear ephemeral state (delete the `onboarding_completed_at` settings row, or use a fresh dev DB). Run `npm run tauri dev`. App boots without errors; SQLite migration + onboarding seed INSERT OR IGNORE runs cleanly; window opens to unlock → State 6.5 loader → Welcome overlay. No console errors, no uncaught promises.
result: pass

### 2. Welcome Overlay Appears on Fresh Install
expected: On fresh-install launch, after the brief "Preparing your journal..." loader (State 6.5), the Welcome AlertDialog mounts automatically on top of the AppShell. No manual navigation required.
result: pass

### 3. Step 1 Content & Focus Trap
expected: Step 1 dialog shows heading "Welcome to Chronicle AI" (serif/display font), italic subheading "Your life story, written for you.", three privacy bullets each with an amber Check icon ("Stays on your device" / "AI runs locally" / "No accounts, no tracking, no telemetry"), footer with "Step 1 of 3" + 3 dots (first dot amber/accent), "Skip tour" link on footer-left, "Continue" button on footer-right. Clicking outside the dialog does NOT close it (focus trap working).
result: pass

### 4. Step 1 Escape Key Persists Skip
expected: Press Escape while Step 1 is showing → overlay closes AND the skip persists (markOnboardingCompleted was called via onOpenChange → handleSkip). Restart the app → Welcome flow does NOT reappear.
result: [pending]

### 5. Step 2 Spotlight & Popover Target FAB
expected: Click Continue on Step 1. Screen dims with translucent dark backdrop EXCEPT for a circular cutout around the bottom-right Quick-Write "+" FAB. A Popover appears above the FAB with heading "Start writing anytime" and body text referencing the "+" button and "Ctrl/Cmd + N". Footer shows "Step 2 of 3" with second dot active. "Got it" button advances to Step 3.
result: [pending]

### 6. Step 2 Resize, Scroll Lock & FAB Clickable
expected: While Step 2 is active: resizing the window instantly repositions the cutout to follow the FAB (ResizeObserver) and the Popover stays anchored without flicker. The page is scroll-locked (mouse wheel on body does nothing). The FAB inside the cutout is clickable / shows hover styles (body.onboarding-spotlight-active hoists FAB to z-80 above the z-60 backdrop).
result: [pending]

### 7. Step 3 Write First Entry Flow
expected: Step 3 dialog shows "Ready to begin?" heading and body "Your first entry is the hardest. The next 365 are easier." Footer shows "Step 3 of 3" with third dot active. Two buttons footer-right: "I'll explore first" (outlined) and "Write your first entry" (solid amber). Clicking "Write your first entry" creates a new entry, opens the editor, dismisses the overlay, and the editor title is empty (no sample content inserted). Restart → flow does NOT reappear.
result: [pending]

### 8. Step 3 Escape Persists Skip
expected: Reset settings row, advance to Step 3, press Escape → overlay closes and skip persists. Restart confirms the flow does not reappear.
result: [pending]

### 9. Skip Tour Persists at Each Step
expected: On each step (1, 2, 3), clicking "Skip tour" closes the overlay, lands on Overview, and persists the skip across app restart. Also: on Step 3, clicking "I'll explore first" has the same effect (lands on Overview, persists).
result: [pending]

### 10. Ctrl/Cmd+N Gated During Onboarding
expected: While any onboarding step is showing, pressing Ctrl+N (Windows) or Cmd+N (Mac) does NOTHING — no new entry is created, overlay stays. After skip/complete, pressing Ctrl/Cmd+N from Overview DOES create a new entry (shortcut re-enables).
result: [pending]

### 11. Reduced Motion (a11y)
expected: Enable OS-level "Reduce motion" (Windows: Settings → Accessibility → Visual effects; macOS: Accessibility → Display → Reduce motion). Reset onboarding, restart. Welcome dialog appears INSTANTLY with no fade/zoom. Transitions to Step 2 and Step 3 are also instant. Flow still works end-to-end.
result: [pending]

### 12. Existing User Auto-Skip (Migration Seed)
expected: Start with a DB that already has journal entries (entries.count > 0) and no onboarding_completed_at row yet — simulating a v1.0 user upgrading. On launch, the db.ts migration seed runs `INSERT OR IGNORE INTO settings ... WHERE (SELECT COUNT(*) FROM entries) > 0`, auto-populating the row. loadOnboardingState returns true, Welcome overlay does NOT appear, app goes straight to Overview/Timeline.
result: [pending]

### 13. Settings Help Section Renders
expected: With onboarding already completed, navigate to Settings. Sections appear in order: Appearance → Security → AI Features → Data → Help (NEW). Help section header has a small amber-tinted tile with a HelpCircle (?) icon; header text "HELP" (uppercase). Single row: label "Replay onboarding tour", subtitle "Restart the welcome flow from the beginning", right-side outlined "Replay" button with NO chevron icon.
result: [pending]

### 14. Replay Reactivates Flow Over Settings
expected: From Settings → Help, click "Replay". Button briefly flashes spinner + "Resetting..." (may be too fast to see). The Welcome AlertDialog (Step 1) appears INSTANTLY, overlaying the Settings view (Settings dimmed behind the overlay — no navigation, no restart). Step through flow — completion returns to editor (if "Write your first entry") or Overview (if "I'll explore first"). Restart → flow does NOT reappear.
result: [pending]

### 15. No Confirmation Before Replay
expected: Clicking Replay does NOT show any AlertDialog asking "Are you sure?" — the welcome flow re-appears immediately (D-15 + UI-SPEC L184: replay is non-destructive, no confirmation prompt).
result: [pending]

### 16. Replay Button Visual Parity with Export Data
expected: Compare the Replay button (Help section) with the Export Data button (Data section) side-by-side. Same border, padding, typography, hover treatment (border tints accent on hover). Only difference: Replay has no trailing chevron icon; Export Data has one.
result: [pending]

## Summary

total: 16
passed: 3
issues: 0
pending: 13
skipped: 0
blocked: 0

## Gaps

[none yet]
