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
  critical: 2
  warning: 4
  info: 5
  total: 11
status: issues_found
---

# Phase 9: Code Review Report

**Reviewed:** 2026-04-18
**Depth:** standard
**Files Reviewed:** 9
**Status:** issues_found

## Summary

Phase 9 lands the first-run onboarding flow with thoughtful state machine design, a clean tri-state store mirror of `isPinSet`, and a good migration seed for v1.0 users. The SQL migration, store integration, and `useGlobalShortcuts` guard are correct and idempotent.

However, **two critical interaction bugs** prevent the onboarding flow from functioning as designed:

1. **Step transitions are short-circuited by `onOpenChange`.** Radix's `AlertDialogAction`/`AlertDialogCancel` close the dialog automatically when clicked, which fires `onOpenChange(false)`. The current handler unconditionally calls `handleSkip()` on every close — meaning clicking "Continue" on Step 1 advances state to 1, then immediately calls `handleSkip()` which marks onboarding completed and unmounts the overlay. **Users will never see Steps 2 or 3.** This is the highest-priority defect in the phase.

2. **Replay is silently broken after first completion.** `currentStep` is internal `useState` that persists across the `return null` guard — it stays at `"done"` after the first run. When Replay flips the store back to `false`, the overlay re-renders but every `AlertDialog` evaluates `open={currentStep === N}` to `false`, so nothing appears. SC #4 (Replay tour) does not work end-to-end.

Both bugs are mechanical to fix and surface only at runtime — they will not be caught by the type system or a static lint pass. Recommend addressing both before sign-off; after that, the warnings are quality-of-life improvements that can ship in a follow-up.

## Critical Issues

### CR-01: `onOpenChange` short-circuits Step 1 and Step 3 advances — users never reach Step 2 or finish the tour normally

**File:** `src/components/onboarding/OnboardingOverlay.tsx:165-168, 207, 261-264, 279-285`

**Issue:** Both AlertDialogs (Step 1 and Step 3) wire `onOpenChange={(open) => { if (!open) void handleSkip(); }}`. The intent (per the doc comment at L19-22) is to route the Escape-key dismiss path through `handleSkip`. But Radix's `AlertDialog.Action` and `AlertDialog.Cancel` (re-exported verbatim from `src/components/ui/alert-dialog.tsx`) auto-close the dialog when clicked, and that close fires `onOpenChange(false)` — same as Escape.

Walk-through for Step 1 → Step 2:

1. User clicks `<AlertDialogAction onClick={handleStep1Continue}>Continue</AlertDialogAction>`.
2. `handleStep1Continue` runs synchronously — `setCurrentStep(1)` is queued.
3. Radix's internal `Action` handler fires `onOpenChange(false)` (because the Action button always closes the dialog).
4. `onOpenChange` callback runs `handleSkip()` → `setCurrentStep("done")` AND `await markOnboardingCompleted()` → store flips to `true`.
5. App.tsx's `OnboardingOverlay` is still mounted, but the early return `if (isOnboardingCompleted !== false) return null` now hides it.

**Net effect:** clicking "Continue" on Step 1 silently dismisses the entire onboarding flow and writes the completion row. The user never sees Steps 2 or 3. The same race fires for Step 3's "Write your first entry" and "I'll explore first" — those buttons trigger `markOnboardingCompleted` twice (once in the handler, once in the spurious `handleSkip` from `onOpenChange`). For Step 3 the second write is harmless (idempotent), but for Step 1 the bug is fatal.

This is a runtime regression of SC #1 ("3-step welcome overlay") and SC #2 ("user can advance step-by-step").

**Fix:** Disambiguate Escape/click-outside dismissal from advance-button clicks. Either (a) move advance handlers off `AlertDialogAction` (use a regular `<button>` so no auto-close fires), or (b) gate `onOpenChange` so it only counts as Skip when not already advancing. Pattern (a) is cleaner:

```tsx
{/* Step 1 footer — replace AlertDialogAction with a plain button so the
    Action's auto-close doesn't fire onOpenChange(false). */}
<AlertDialogFooter className="flex items-center justify-between mt-2">
  <div className="flex items-center gap-3">
    <StepIndicator step={1} total={3} />
    <SkipLink onSkip={() => void handleSkip()} />
  </div>
  <button
    type="button"
    onClick={handleStep1Continue}
    className="px-4 py-2 text-label rounded-md bg-accent text-amber-950 dark:text-bg font-medium"
  >
    Continue
  </button>
</AlertDialogFooter>
```

Apply the same change to Step 3's `AlertDialogAction` and `AlertDialogCancel`. Keep `onOpenChange` wired to `handleSkip` only for Escape/click-outside (which only fire when the user did NOT press an advance button).

Alternative (less surgical): introduce a ref or state flag like `isAdvancingRef` that handlers set before they change `currentStep`, and check inside `onOpenChange` to suppress the spurious skip. The button-swap above is preferred because it removes the foot-gun rather than papering over it.

---

### CR-02: Replay is broken after the first completion — `currentStep` is stuck at `"done"` and no dialog opens

**File:** `src/components/onboarding/OnboardingOverlay.tsx:99, 117`

**Issue:** `currentStep` is a `useState<Step>(0)` local to `OnboardingOverlay`. After the user finishes (or skips) onboarding the first time, `currentStep` becomes `"done"` and `isOnboardingCompleted` flips to `true`. The component remains mounted (App.tsx mounts it whenever `isOnboardingCompleted !== null`, which includes `true`), and the early return `if (isOnboardingCompleted !== false) return null` hides the UI without unmounting the component. **`useState` is preserved across that null return.**

When the user later clicks Settings → Replay, `replayOnboarding()` flips the store back to `false`. The early return now lets the JSX render — but `currentStep` is still `"done"`. Every `<AlertDialog open={currentStep === N}>` evaluates to `open={false}`, the Step 2 `currentStep === 1 && ...` block is skipped, and the user sees nothing. SC #4 (Replay tour) silently fails.

This breaks the explicit doc-comment claim at SettingsView.tsx:597-600 ("re-mounts at Step 1 — no app restart needed").

**Fix:** Reset `currentStep` whenever `isOnboardingCompleted` transitions to `false`, OR mount/unmount the overlay only when the flag is exactly `false`. Two clean options:

Option A — reset the step when the gate opens (preferred — keeps App.tsx unchanged):

```tsx
// Inside OnboardingOverlay, after the existing useLayoutEffect:
useEffect(() => {
  if (isOnboardingCompleted === false) {
    setCurrentStep(0);
  }
}, [isOnboardingCompleted]);
```

Option B — mount only when the flag is exactly `false` (forces fresh state via component remount), edit `src/App.tsx:229`:

```tsx
{isOnboardingCompleted === false && <OnboardingOverlay />}
```

Either fix restores SC #4. Option A is slightly safer because it preserves the documented mount lifecycle in the OnboardingOverlay header comment ("Render gate: isOnboardingCompleted === false ... this component only mounts when the flow should actually render"). That comment is currently aspirational — the component is mounted earlier than the comment implies; Option A makes the runtime match the comment's intent.

## Warnings

### WR-01: `replayOnboarding` from Settings shows a broken Step 2 (FAB not in DOM)

**File:** `src/components/SettingsView.tsx:593-605`, `src/components/AppShell.tsx:7,16,33`

**Issue:** The QuickWriteFAB is only rendered when `activeView` is one of `overview, timeline, calendar, search` (AppShell.tsx:7,16). When the user clicks Replay from Settings, `activeView === "settings"` so the FAB is not in the DOM. After CR-02 is fixed and the flow restarts at Step 1 → Step 2, `OnboardingSpotlight` queries `document.querySelector('[data-onboarding="quick-write-fab"]')` and gets `null` → falls back to a fully-dimmed backdrop with no cutout, and the Step 2 Popover anchors to a null `fabRef.current` → either positions at the viewport origin (0,0) or no-ops, leaving the user with a dim screen and a stranded popover.

The doc comment at OnboardingSpotlight.tsx:16-18 anticipates this case ("if the FAB target is missing ... user can still escape via Skip tour or Esc") but the result is poor UX — the user has just clicked "Replay tour" and is rewarded with a broken screen.

**Fix:** Navigate the user to a FAB-visible view before the overlay renders. In `handleReplay` (SettingsView.tsx:593):

```tsx
const handleReplay = async () => {
  setIsReplaying(true);
  try {
    // Land on Overview so QuickWriteFAB is mounted before Step 2's spotlight
    // queries the DOM (D-12 spotlight target is the FAB).
    useViewStore.getState().setView("overview");
    await replayOnboarding();
  } finally {
    setIsReplaying(false);
  }
};
```

Alternative: have `OnboardingSpotlight` re-query on a short interval / `requestAnimationFrame` until the FAB appears, with a timeout. The view-switch is simpler and matches existing single-source-of-truth patterns.

---

### WR-02: Step 2 PopoverAnchor receives a null `fabRef.current` on the first render — brief positioning glitch

**File:** `src/components/onboarding/OnboardingOverlay.tsx:107-113, 227`

**Issue:** When `currentStep` transitions to `1`, the JSX block `currentStep === 1 && (...)` renders the Popover **before** the `useLayoutEffect` runs to populate `fabRef.current`. React's render-then-effect ordering means the first commit of `<PopoverAnchor virtualRef={fabRef as RefObject<...>}>` sees `fabRef.current === null`. Floating-ui's positioning math reads `getBoundingClientRect()` on the ref's current value and either returns `(0,0,0,0)` or skips positioning. After `useLayoutEffect` populates the ref, subsequent layout cycles correct the position, but a one-frame visual jump from origin to FAB is possible.

The cast to `RefObject<{ getBoundingClientRect(): DOMRect }>` (line 227) silently hides the null-current discrepancy from TypeScript.

**Fix:** Capture the FAB element BEFORE rendering the Popover. Two options:

Option A — do the query during `handleStep1Continue` so the ref is populated by the time the Popover mounts:

```tsx
const handleStep1Continue = () => {
  fabRef.current = document.querySelector(FAB_SELECTOR) as HTMLElement | null;
  setCurrentStep(1);
};
```

Option B — gate the Popover render on `fabRef.current` being populated:

```tsx
{currentStep === 1 && fabRef.current && (
  <>
    <OnboardingSpotlight />
    <Popover open>
      <PopoverAnchor virtualRef={fabRef as RefObject<...>} />
      ...
```

Option A is preferred — it preserves the unconditional render and just front-loads the DOM query.

---

### WR-03: Spotlight cutout misaligns on layout shifts that don't trigger window resize or FAB resize

**File:** `src/components/onboarding/OnboardingSpotlight.tsx:39-76`

**Issue:** `recompute()` is wired to two triggers — `window.addEventListener("resize", ...)` and `ResizeObserver(target)`. Neither fires for layout shifts that change the FAB's viewport position without resizing the window or the FAB itself. Examples: sidebar collapse/expand, font-scale change in another module that re-flows the FAB's parent, image lazy-load above the FAB on overview, or any scroll inside a non-`<body>` scrolling container (the body scroll-lock at L62-63 only locks `document.body`, not nested scrollers).

When that happens, the cutout points at the FAB's old viewport rect while the FAB has moved, leaving the user with a dimmed circle next to the FAB instead of around it.

**Fix:** Add `IntersectionObserver` or a scroll/`requestAnimationFrame` loop while Step 2 is active. Simplest:

```tsx
useLayoutEffect(() => {
  // ... existing setup ...

  // Re-measure on every paint while the spotlight is active, using rAF
  // to avoid runaway recomputes. Cleanup cancels the scheduled frame.
  let rafId: number | null = null;
  const tick = () => {
    recompute();
    rafId = requestAnimationFrame(tick);
  };
  rafId = requestAnimationFrame(tick);

  return () => {
    // ... existing cleanup ...
    if (rafId !== null) cancelAnimationFrame(rafId);
  };
}, []);
```

Alternative, lower-overhead: also listen on `scroll` (capture-phase, passive) and use `IntersectionObserver` with a sentinel near the FAB. The rAF loop is acceptable here because Step 2 is short-lived.

---

### WR-04: `splitSqlStatements` BEGIN/END detection is fragile and was never updated for the Phase-9 seed

**File:** `src/lib/db.ts:117-152, 188-193`

**Issue:** The Phase-9 seed (D-04, lines 188-193) is correctly placed *after* the `splitSqlStatements` loop and uses parameterized `db.execute(...)` — so this isn't a bug today. However, the SQL splitter in `splitSqlStatements` has an existing brittleness that anyone editing `MIGRATION_SQL` could trip on:

- L130-132 detects `BEGIN`/`END` via `trimmed.toUpperCase()` matching `"BEGIN"`, `endsWith(" BEGIN")`, `"END"`, `"END;"`. A trigger body that ends with `END;` followed by a trailing comment on the same line, or that uses `END WHEN`/`END IF` (SQLite-allowed in `CASE`), or a column literal containing the substring `BEGIN`, will throw the depth tracker off.
- The depth tracker has no awareness of string literals or comments — `INSERT INTO foo VALUES('BEGIN')` would increment depth.

Add a comment warning future editors. If a future migration adds a literal containing `BEGIN`/`END`, the splitter will silently produce malformed statements. The seed at L188-193 is safe today because it doesn't touch `MIGRATION_SQL`, but the splitter is one careless edit away from a hard-to-diagnose initialization failure.

**Fix:** Either (a) add a docstring noting the limitation and forbidding string literals containing `BEGIN`/`END` inside `MIGRATION_SQL`, or (b) replace the splitter with a tokenizer that respects single-quoted string literals and comments. (a) is cheaper:

```ts
/**
 * Splits a SQL migration string into individual statements.
 * ...
 *
 * LIMITATION: BEGIN/END detection is line-based and string-unaware. Do NOT
 * include single-quoted string literals containing the substrings 'BEGIN'
 * or 'END' inside MIGRATION_SQL — the depth tracker will mis-count and
 * produce malformed statements. If you need that, switch to a real SQL
 * tokenizer.
 */
function splitSqlStatements(sql: string): string[] { ... }
```

## Info

### IN-01: Step transitions write `markOnboardingCompleted` twice in the Step 3 path

**File:** `src/components/onboarding/OnboardingOverlay.tsx:133-136, 142-158, 263`

**Issue:** Both `handleStep3Explore` (L133) and `handleWriteFirstEntry` (L142) call `markOnboardingCompleted()`. After CR-01 is fixed, these still fire `onOpenChange(false)` → `handleSkip` → `markOnboardingCompleted()` a second time. The settings write is `INSERT OR REPLACE` (idempotent) so functionally harmless, but it means two SQL writes per completion plus an extra store-set call. Once CR-01's button-swap fix lands, this disappears too. No action needed if CR-01 is fixed via the button-swap; flagged here for cross-reference.

**Fix:** Resolved by CR-01's recommended fix (replace `AlertDialogAction`/`AlertDialogCancel` with plain buttons so `onOpenChange(false)` only fires for true dismissal events).

---

### IN-02: `OnboardingOverlay`'s render-gate doc comment doesn't match runtime behavior

**File:** `src/components/onboarding/OnboardingOverlay.tsx:15-17`

**Issue:** The header comment claims "Render gate: isOnboardingCompleted === false (loading and completed states are handled in App.tsx — this component only mounts when the flow should actually render)." But `src/App.tsx:223` mounts the overlay whenever `isOnboardingCompleted !== null`, including `true`. The component then uses an early `return null` (L117) to hide itself — which is what enables CR-02's stale-state bug.

**Fix:** Either align App.tsx to the doc (mount only when `=== false` — see CR-02 Option B), or update the comment to match reality:

```tsx
 * Render gate: this component is mounted whenever isOnboardingCompleted !== null
 * (App.tsx state-6 fragment). It returns null when the flag is true so the UI
 * is hidden but state is preserved across completion / replay cycles. Internal
 * currentStep state is reset by the useEffect on isOnboardingCompleted below.
```

---

### IN-03: `loadOnboardingState` swallows DB errors and returns `false`, which renders the overlay over a broken DB

**File:** `src/utils/onboardingService.ts:24-36`

**Issue:** On any SQL failure, `loadOnboardingState()` logs and returns `false`. The doc comment justifies this ("safer than silently hiding it forever after a transient glitch"). But App.tsx already shows a "Could not open your journal" error screen for `dbError` from `initializeDatabase()`. If `loadOnboardingState` fails (which is downstream of a successful `initializeDatabase`), returning `false` causes the welcome overlay to render on top of an app whose settings table is broken — and any user action through the overlay (`markOnboardingCompleted`) will silently fail too, leaving the user trapped in onboarding on every launch.

**Fix:** This is a genuine UX trade-off, not a clear bug. Two options:

- Keep current behavior but surface a `toast.error` so the user knows something went wrong before they hit Skip.
- Return `null` (or throw) and let App.tsx decide — if the settings table is unreadable, that's actionable info worth showing rather than silently re-onboarding.

If shipping as-is, suppress this Info item by tightening the doc-comment justification.

---

### IN-04: `useGlobalShortcuts` has redundant `editor`/`settings` view check

**File:** `src/hooks/useGlobalShortcuts.ts:62-63`

**Issue:** The "belt-and-suspenders" check `if (view.activeView === "editor" || view.activeView === "settings") return;` is well-intentioned but partially incorrect. On the Settings view, no editable element has focus by default, and the user has every reason to want Ctrl/Cmd+N to fire (jump from Settings into a new entry). Blocking it on Settings is a UX regression vs. the documented rationale, which only justifies blocking the editor view (where focus is in TipTap, but `isTypingContext()` already catches that).

**Fix:** Either remove the check entirely (rely on `isTypingContext()`), or block only `editor`:

```ts
// Editor-view gate — isTypingContext() handles the contentEditable case;
// this is just a safety net for the brief window between view-switch and
// focus settling into TipTap. Settings has no editor — allow Ctrl/Cmd+N.
if (view.activeView === "editor") return;
```

---

### IN-05: `globals.css` `body.onboarding-spotlight-active` rule uses `!important` — note for future overrides

**File:** `src/styles/globals.css:421-423`

**Issue:** The `z-index: 80 !important;` override is justified for beating the FAB's inline `z-40` Tailwind class, and the comment explains why. Flagging for awareness only — `!important` in a global stylesheet can complicate future z-index work (e.g., if a modal needs to overlay the spotlight FAB). Consider promoting the FAB's z-index to a CSS variable so the override doesn't need `!important`:

```css
/* In QuickWriteFAB component or globals.css */
.quick-write-fab { z-index: var(--fab-z, 40); }
body.onboarding-spotlight-active { --fab-z: 80; }
```

Not a bug, just a cleaner pattern when more z-index orchestration ships in later phases.

---

_Reviewed: 2026-04-18_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
