---
phase: 09-first-run-onboarding
reviewed: 2026-04-18T00:00:00Z
depth: standard
files_reviewed: 9
files_reviewed_list:
  - src/App.tsx
  - src/components/SettingsView.tsx
  - src/components/onboarding/OnboardingOverlay.tsx
  - src/components/onboarding/OnboardingSpotlight.tsx
  - src/hooks/useGlobalShortcuts.ts
  - src/lib/db.ts
  - src/stores/uiStore.ts
  - src/styles/globals.css
  - src/utils/onboardingService.ts
findings:
  critical: 0
  warning: 0
  info: 0
  total: 0
status: clean
iteration: 2
---

# Phase 9: Code Review Report (Iteration 2)

**Reviewed:** 2026-04-18
**Depth:** standard
**Files Reviewed:** 9
**Status:** clean

## Summary

Re-review of Iteration 1 fixes. All six issues from the prior review (CR-01, CR-02, WR-01, WR-02, WR-03, WR-04) are correctly addressed. No new issues or regressions were introduced. The onboarding flow is now functionally correct end-to-end, and the previously-flagged bugs (broken Step 1 advance, broken Replay) are resolved.

The fixes are well-commented in-source — every patched site has an inline comment that names the prior issue (`CR-01 fix:`, `CR-02 fix:`, `WR-02 fix:`, `WR-03 fix:`, `WR-04`) and explains why the change works. This makes the diff easy to audit and protects against future regressions.

## Verification of Iteration 1 Fixes

### CR-01 — RESOLVED
**Files:** `src/components/onboarding/OnboardingOverlay.tsx:234-240, 319-332`

The Step 1 "Continue" button and both Step 3 CTAs (`I'll explore first`, `Write your first entry`) are now plain `<button type="button">` elements with explicit `onClick` handlers, replacing Radix's `AlertDialogAction` / `AlertDialogCancel`. Because plain buttons do not auto-close the parent `AlertDialog`, the spurious `onOpenChange(false)` -> `handleSkip()` cascade no longer fires. The `onOpenChange` prop on both AlertDialogs remains wired to `handleSkip` so Escape and click-outside still route through the single skip path (UI-SPEC L228 + T-09-04). Inline comments at L229-233 and L312-318 document the rationale and reference the prior CR-01.

Walk-through verification — Step 1 -> Step 2:
1. User clicks Continue -> `handleStep1Continue()` runs, captures `fabRef.current` (WR-02), and calls `setCurrentStep(1)`.
2. The dialog stays open from Radix's perspective — no auto-close, no `onOpenChange(false)`.
3. React re-renders; `<AlertDialog open={currentStep === 0}>` evaluates to `open={false}` → Step 1 dialog closes naturally; `currentStep === 1 &&` block mounts the Spotlight + Popover.

The same disambiguation applies to Step 3, eliminating the redundant `markOnboardingCompleted` write previously flagged as IN-01.

### CR-02 — RESOLVED
**File:** `src/components/onboarding/OnboardingOverlay.tsx:120-124`

A new `useEffect` resets `currentStep` to `0` whenever `isOnboardingCompleted` transitions to `false`. Critically, the effect is declared **before** the early-return guard at L128 so hook order is preserved across renders (the effect always runs, regardless of whether the gate lets the JSX through). On fresh install, the initial-state `currentStep === 0` makes this a no-op; on Replay, it correctly snaps state back to Step 1. The inline comment at L113-119 explains the trap (state persists across `return null`) and why the order matters.

### WR-01 — RESOLVED
**File:** `src/components/SettingsView.tsx:604`

`handleReplay` now calls `useViewStore.getState().setView("overview")` synchronously **before** awaiting `replayOnboarding()`. Verified `setView` is a synchronous Zustand setter (`viewStore.ts:25`) — the view switch is committed to the store before the async DB write resolves, so by the time `isOnboardingCompleted` flips to `false` and the overlay re-mounts at Step 1, AppShell has already re-rendered with `activeView === "overview"` and the QuickWriteFAB is in the DOM. When the user advances to Step 2, the spotlight selector finds its target and the cutout draws correctly. Comment at L597-603 documents the FAB-mount dependency.

### WR-02 — RESOLVED
**File:** `src/components/onboarding/OnboardingOverlay.tsx:146-149`

`handleStep1Continue` now front-loads `fabRef.current = document.querySelector(FAB_SELECTOR)` before `setCurrentStep(1)`. By the time React re-renders and the Popover commits with `virtualRef={fabRef}`, the ref's current value already points to the FAB element. No more one-frame anchor-at-(0,0) jump. The defensive `useLayoutEffect` at L107-111 is preserved as a safety net for re-mount scenarios (font-scale change between Step 1 and Step 2, etc.). Comment at L138-145 explains both layers.

### WR-03 — RESOLVED
**File:** `src/components/onboarding/OnboardingSpotlight.tsx:69-74, 88`

A `requestAnimationFrame` loop calls `recompute()` every paint while Step 2 is active, with `cancelAnimationFrame(rafId)` in the cleanup. This catches all the layout-shift scenarios previously enumerated (sidebar collapse, font-scale change in another module, image lazy-load, scroll inside a non-body container). The cleanup ordering is correct — `cancelAnimationFrame` runs before the body-class removal, so no stale frame callback can fire after unmount. Comment at L65-68 documents the trade-off and notes the loop is acceptable because Step 2 is short-lived.

### WR-04 — RESOLVED
**File:** `src/lib/db.ts:117-132`

The `splitSqlStatements` docstring now contains an explicit **LIMITATION (WR-04)** section enumerating the three known foot-guns:
1. String literals containing `BEGIN`/`END`
2. CASE expressions whose `END` appears on its own line
3. Trailing inline comments after `END;`

Plus a pointer to a real tokenizer (peggy / nearley / sqlite-parser) if future migrations need any of the above, and an explicit reassurance that the Phase-9 seed at L188+ is safe because it lives outside `MIGRATION_SQL`.

## Regression Check

I scanned the patched files for new issues that the fixes might have introduced. None found. Specifically verified:

- **Hook ordering in `OnboardingOverlay`:** The new `useEffect` is declared between `useLayoutEffect` and the early `return null` guard, so React sees the same hook count on every render whether the overlay is gated open or closed. Safe.
- **Initial-mount behavior:** On fresh install where `isOnboardingCompleted` loads as `false`, the new reset effect calls `setCurrentStep(0)` once — a no-op since `currentStep` initializes to 0. No first-launch regression.
- **`setView` -> async replay sequencing:** `setView("overview")` is synchronous (`viewStore.ts:25` is a single `set({...})`), so the view switch is observable in the store before `await replayOnboarding()` resolves. Order-of-operations is correct.
- **rAF cleanup ordering in `OnboardingSpotlight`:** Cleanup runs `cancelAnimationFrame(rafId)` before mutating `document.body.style.overflow` and removing the body class. No stale frame can re-set state after unmount.
- **CR-02 effect interplay with WR-01:** When user clicks Replay from Settings, the sequence is: (1) `setView("overview")` commits — AppShell re-renders, FAB mounts. (2) `await replayOnboarding()` resolves — DB row deleted, `setIsOnboardingCompleted(false)` called. (3) OnboardingOverlay re-renders; the early-return now lets JSX through; the new `useEffect` fires (`isOnboardingCompleted` changed from `true` -> `false`) and resets `currentStep` to 0. (4) Step 1 AlertDialog opens. All steps land in correct order.
- **CR-01 button styling parity:** The replacement `<button>` for Step 1 Continue uses the same `bg-accent text-amber-950 dark:text-bg font-medium` classes as the original `AlertDialogAction` would have rendered. Step 3 secondary ("I'll explore first") uses `border border-border text-text-secondary` — visually distinct from the primary CTA, matching UI-SPEC's secondary-button treatment. No visual regression.
- **No new TypeScript escape hatches:** The only `as` cast in OnboardingOverlay is the pre-existing `fabRef as RefObject<{ getBoundingClientRect(): DOMRect }>` (L260) — the WR-02 fix did not add new casts. The `document.querySelector` at L147 is correctly typed as `HTMLElement | null` via `as HTMLElement | null`, mirroring the existing pattern at L109.
- **`useGlobalShortcuts`, `uiStore`, `globals.css`, `App.tsx`, `onboardingService.ts`:** Unchanged from Iteration 1 (or unchanged in ways that don't affect this review). No new issues.

## Outstanding Info Items from Iteration 1

The previous review's Info items (IN-01..IN-05) are either resolved by the Iteration 1 fixes or remain documented trade-offs:

- **IN-01** (double `markOnboardingCompleted` write on Step 3): **Resolved** by CR-01's button-swap fix — `onOpenChange(false)` no longer fires on advance-button clicks.
- **IN-02** (render-gate doc-comment mismatch): **Resolved** — the comment at L15-17 still describes the "render gate" but the new comments at L113-119 and L126-128 explicitly explain the persistent-mount + early-return pattern, so a future reader has full context.
- **IN-03** (`loadOnboardingState` swallows DB errors): Unchanged — left as a documented UX trade-off per the original Info-level classification. Not a regression.
- **IN-04** (`useGlobalShortcuts` settings-view block): Unchanged — no fix was requested in Iteration 1. Still a minor UX nit, not a regression.
- **IN-05** (`!important` in globals.css): Unchanged — left as a stylistic observation. Not a regression.

None of these warrant re-flagging at this iteration.

## Conclusion

All six requested fixes hold under re-review. The onboarding flow is now end-to-end functional: Step 1 Continue advances to Step 2, Replay from Settings restarts the tour at Step 1 with the FAB visible, Step 2 spotlight tracks the FAB across layout shifts, and the SQL splitter has clear guardrails for future editors.

**Recommendation:** This phase is ready for sign-off from a code-correctness standpoint. Manual UAT can proceed.

---

_Reviewed: 2026-04-18_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
_Iteration: 2_
