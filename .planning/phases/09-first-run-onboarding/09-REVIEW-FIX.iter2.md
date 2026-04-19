---
phase: 09-first-run-onboarding
fixed_at: 2026-04-18T00:00:00Z
review_path: .planning/phases/09-first-run-onboarding/09-REVIEW.md
iteration: 1
findings_in_scope: 6
fixed: 6
skipped: 0
status: all_fixed
---

# Phase 9: Code Review Fix Report

**Fixed at:** 2026-04-18
**Source review:** `.planning/phases/09-first-run-onboarding/09-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope: 6 (2 Critical, 4 Warning)
- Fixed: 6
- Skipped: 0

All Critical and Warning findings from the Phase-9 review have been fixed,
each with its own atomic commit and a `npm run build` verification pass.
The two interaction bugs (CR-01, CR-02) that prevented the onboarding flow
from working are resolved; the four polish items (WR-01..WR-04) eliminate
edge cases the reviewer identified.

Info-tier findings (IN-01..IN-05) are out of scope for this iteration.
Note: IN-01 ("double markOnboardingCompleted write on Step 3") is implicitly
resolved by CR-01's button swap — the spurious onOpenChange-triggered Skip
no longer fires because the plain `<button>` doesn't auto-close the dialog.
The fix commit message for CR-01 references this side effect.

## Fixed Issues

### CR-01: AlertDialogAction/Cancel auto-close short-circuits Step 1 and Step 3

**Files modified:** `src/components/onboarding/OnboardingOverlay.tsx`
**Commit:** 91908e5
**Applied fix:** Replaced the Step 1 `AlertDialogAction` ("Continue"), the
Step 3 `AlertDialogCancel` ("I'll explore first"), and the Step 3
`AlertDialogAction` ("Write your first entry") with plain `<button
type="button">` elements. Removed the now-unused `AlertDialogAction` and
`AlertDialogCancel` imports. The `onOpenChange` Escape-key / click-outside
handler is preserved on both AlertDialogs and continues to route true
dismissal events through `handleSkip()`. This eliminates the bug where
clicking "Continue" advanced state to Step 2 then immediately fired
`onOpenChange(false)` -> `handleSkip()`, marking onboarding completed and
hiding the overlay before the user could see Steps 2 or 3. Added
inline comments explaining the Radix foot-gun so future editors don't
regress the fix.

### CR-02: Replay broken because currentStep persists at "done" across mount cycles

**Files modified:** `src/components/onboarding/OnboardingOverlay.tsx`
**Commit:** f1d3204
**Applied fix:** Added a `useEffect` that resets `currentStep` to `0`
whenever `isOnboardingCompleted === false`. The effect is declared BEFORE
the early-return-null guard so React's rules-of-hooks ordering is preserved
(effect always declared, regardless of whether the gate is open). Added
`useEffect` to the React imports. When the user clicks Settings -> Replay,
`replayOnboarding()` flips the store back to `false`, this effect fires,
and Step 1 renders correctly. SC #4 (Replay tour) now works end-to-end.
Verbose comment block explains why it must run before the early return and
references the SC it restores.

**Note — requires human verification:** This is a state-machine change
gated by an effect ordering constraint. Verify by:
1. Complete onboarding once (or skip).
2. Open Settings -> Help -> "Replay onboarding tour".
3. Confirm Step 1 ("Welcome to Chronicle AI") opens immediately, not a
   blank screen.

### WR-01: Replay shows broken Step 2 because QuickWriteFAB isn't in the DOM on Settings view

**Files modified:** `src/components/SettingsView.tsx`
**Commit:** 416d31a
**Applied fix:** In `HelpSection.handleReplay`, call
`useViewStore.getState().setView("overview")` BEFORE awaiting
`replayOnboarding()`. setView is synchronous so the AppShell switches view
immediately, mounting the QuickWriteFAB before the gate flip causes the
overlay to remount at Step 2. This eliminates the broken-screen UX where
`OnboardingSpotlight` queried for `[data-onboarding="quick-write-fab"]`
and got null because Settings doesn't render the FAB. Comment explains the
view-mount dependency and the synchronous-setView ordering.

### WR-02: Step 2 PopoverAnchor receives null fabRef on first render — positioning glitch

**Files modified:** `src/components/onboarding/OnboardingOverlay.tsx`
**Commit:** 034e7a0
**Applied fix:** Modified `handleStep1Continue` to capture the FAB element
into `fabRef.current` BEFORE calling `setCurrentStep(1)`. This front-loads
the DOM query so the Popover's first commit sees a populated ref instead
of null, eliminating the one-frame visual jump from origin (0,0) to the
FAB position. The existing `useLayoutEffect` on `[currentStep]` is
preserved as a defensive re-capture (e.g., FAB re-mount due to font-scale
change between Step 1 and Step 2). Comment explains the render-then-effect
ordering and why the ref needs to be populated synchronously before the
state transition.

### WR-03: Spotlight cutout misaligns on layout shifts that don't trigger resize/RO

**Files modified:** `src/components/onboarding/OnboardingSpotlight.tsx`
**Commit:** 46309b1
**Applied fix:** Added a per-frame `requestAnimationFrame` recompute loop
inside `OnboardingSpotlight`'s `useLayoutEffect`, with cleanup that calls
`cancelAnimationFrame(rafId)`. This catches layout shifts that don't fire
window resize or FAB ResizeObserver events (sidebar collapse/expand,
font-scale changes re-flowing the FAB's parent, lazy-loaded images above
the FAB, scroll inside non-body scroll containers). Step 2 is short-lived
so the rAF overhead is bounded; recompute is cheap (one
`getBoundingClientRect` + a `setRect` that React bails out of when values
are unchanged). Comment block explains the trigger gaps and the cost
trade-off.

### WR-04: splitSqlStatements BEGIN/END detection is fragile and undocumented

**Files modified:** `src/lib/db.ts`
**Commit:** 71b32df
**Applied fix:** Added a comprehensive `LIMITATION (WR-04)` section to the
`splitSqlStatements` JSDoc enumerating the three classes of input that
will mis-trigger the depth tracker:
1. String literals containing `BEGIN` / `END` substrings.
2. CASE expressions whose `END` appears outside a trigger body.
3. Trailing inline comments after `END;` on the same line.
The doc also tells future editors to swap in a real SQL tokenizer
(peggy / nearley / sqlite-parser) if any of those become legitimately
needed, and confirms the Phase-9 seed at L188+ is safe because it lives
outside `MIGRATION_SQL` and uses parameterized `db.execute`. No code
change was needed — only documentation, which is what the review
recommended as the cheap option.

---

_Fixed: 2026-04-18_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
