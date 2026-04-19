---
phase: 09-first-run-onboarding
plan: 02
subsystem: onboarding
tags: [onboarding, ui, alert-dialog, popover, spotlight, app-tsx, global-shortcuts]
requires:
  - "Plan 09-01 (uiStore tri-state, onboardingService, db.ts seed)"
  - "Phase 8 D-22 (data-onboarding=quick-write-fab attribute on QuickWriteFAB)"
  - "Existing Radix wrappers: AlertDialog, Popover, PopoverAnchor"
provides:
  - "OnboardingOverlay component (3-step state machine, controlled-mode Escape-skip, stable virtualRef)"
  - "OnboardingSpotlight component (CSS box-shadow cutout + ResizeObserver + scroll lock + body class)"
  - "globals.css FAB z-hoist rule (body.onboarding-spotlight-active)"
  - "App.tsx onboarding hydration + State 6.5 loader + State 6 mount alongside AppShell"
  - "useGlobalShortcuts.ts isOnboardingCompleted === false guard for Ctrl/Cmd+N"
affects:
  - src/App.tsx
  - src/hooks/useGlobalShortcuts.ts
  - src/styles/globals.css
tech-stack:
  added: []
  patterns:
    - "Controlled-mode Radix AlertDialog with onOpenChange routing Escape -> skip"
    - "Stable useRef + useLayoutEffect virtualRef pattern for floating-ui anchored components"
    - "Body-class + scoped global CSS rule for component-scoped style overrides (no inline JSX <style>)"
    - "Render-state-branch grammar with mutually-exclusive guard tightening (State 6.5 / 6)"
    - "Read-at-fire-time store guards in global event handlers"
key-files:
  created:
    - src/components/onboarding/OnboardingSpotlight.tsx
    - src/components/onboarding/OnboardingOverlay.tsx
  modified:
    - src/styles/globals.css (appended FAB z-hoist rule)
    - src/App.tsx (imports + selectors + init hydration + State 6.5 + State 6 mount)
    - src/hooks/useGlobalShortcuts.ts (additive isOnboardingCompleted guard)
decisions:
  - "Controlled-mode onOpenChange handlers route Escape-key dismiss through handleSkip (UI-SPEC L228 + T-09-04) — keeps skip path single-source-of-truth"
  - "FAB-hoist CSS rule lives in globals.css; no inline JSX <style> blocks (codebase has zero precedent)"
  - "Step 2 PopoverAnchor uses stable useRef + useLayoutEffect virtualRef (anti-anchor-thrash) — captured when currentStep flips to 1, reused across renders"
  - "Step 3 'Write your first entry' chains createEntry -> selectEntry -> markOnboardingCompleted -> navigateToEditor('timeline')"
  - "Step 3 try/catch fallback closes overlay even if createEntry chain fails — never traps the user"
  - "OnboardingOverlay mounted as State 6 sibling of AppShell so it overlays SettingsView too (D-02 / SC #5)"
  - "Ctrl/Cmd+N guard uses read-at-fire-time pattern (mirrors locked-state gate) so no listener re-bind on isOnboardingCompleted transitions"
metrics:
  duration: "~25 minutes"
  completed: 2026-04-19
---

# Phase 9 Plan 02: Welcome Overlay + App Mount + Ctrl/Cmd+N Guard Summary

Built the three-step first-run welcome flow as a focus-trapped overlay that mounts above AppShell on every fresh-install launch, gated by `isOnboardingCompleted === false` and dismissible only through the explicit Skip-tour link or controlled-mode Escape-key handler — both routes call the same `markOnboardingCompleted()` to write a single SQLite settings row.

## What Was Built

### 1. OnboardingSpotlight (`src/components/onboarding/OnboardingSpotlight.tsx`, 110 lines)

CSS box-shadow cutout that highlights the QuickWriteFAB during Step 2:

- Queries the FAB via `document.querySelector('[data-onboarding="quick-write-fab"]')` (Phase 8 D-22 attribute)
- Initial measurement + window resize listener + ResizeObserver on the FAB itself for instant repositioning
- Scroll lock via `document.body.style.overflow = "hidden"` (prior value captured for restoration)
- Adds body class `onboarding-spotlight-active` on mount, removes on unmount — triggers the global CSS rule that hoists the FAB to z-80 (above the z-60 backdrop)
- 12px padding around FAB rect, 9999px box-shadow producing rgba(0,0,0,0.6) backdrop dim
- Defensive fallback: if the FAB target is missing, renders a plain dim backdrop (user can still escape via Skip tour)
- No inline `<style>` element (warning-fix #3); no `JSX.Element` return annotation (warning-fix #2)

### 2. OnboardingOverlay (`src/components/onboarding/OnboardingOverlay.tsx`, 291 lines)

3-step state machine: 0 (Welcome AlertDialog) → 1 (Spotlight + Popover) → 2 (Ready AlertDialog) → "done" (unmount).

Public component shape:
```typescript
export function OnboardingOverlay()
```
No props. Reads `isOnboardingCompleted` (uiStore), `createEntry`/`selectEntry` (entryStore), `navigateToEditor` (viewStore) via granular selectors. Internal state: `currentStep: 0 | 1 | 2 | "done"`.

Locked copy (verbatim per UI-SPEC):
- Step 1: "Welcome to Chronicle AI" + "Your life story, written for you." + 3 privacy bullets (Stays on your device / AI runs locally / No accounts, no tracking, no telemetry)
- Step 2: "Start writing anytime" + body mentioning "+" button and "Ctrl/Cmd + N"
- Step 3: "Ready to begin?" + "Your first entry is the hardest. The next 365 are easier." + CTAs ("I'll explore first" + "Write your first entry")

Inline subcomponents: `StepIndicator` (text + 3 dots, active dot in bg-accent), `SkipLink` (always-visible "Skip tour" button).

Critical implementation details (all four checker fixes landed):
1. Both Step 1 + Step 3 AlertDialogs use `onOpenChange={(open) => { if (!open) void handleSkip(); }}` so Radix's native Escape-key dismiss routes through the same skip path used by the Skip-tour link (UI-SPEC L228 + T-09-04)
2. No `JSX.Element` return annotation (codebase convention)
3. FAB-hoist CSS lives in globals.css, NOT inline `<style>` block
4. PopoverAnchor uses `virtualRef={fabRef as RefObject<{ getBoundingClientRect(): DOMRect }>}` where `fabRef` is captured by `useLayoutEffect` when `currentStep === 1` flips — stable ref object across renders, no anchor thrash. The cast satisfies React 19's tightened `RefObject<T>` typing while preserving Radix's `Measurable` contract.

Step 3 primary CTA chain (`handleWriteFirstEntry`): `createEntry()` → `selectEntry(newId)` → `markOnboardingCompleted()` → `navigateToEditor("timeline")` → `setCurrentStep("done")`. Wrapped in try/catch so a chain failure still closes the overlay (never traps the user).

### 3. globals.css FAB z-hoist rule (additive, 1 rule)

Appended after the existing `prefers-reduced-motion` stanza:
```css
body.onboarding-spotlight-active [data-onboarding="quick-write-fab"] {
  z-index: 80 !important;
}
```

OnboardingSpotlight adds the body class on mount and removes on unmount. The FAB sits at z-40 by default; while the spotlight is active it's hoisted above the z-60 backdrop so the user can click it inside the cutout.

### 4. App.tsx changes (4 changes, lines 1-238)

| Change | Lines | What |
| --- | --- | --- |
| A | 11, 18 | Imports `OnboardingOverlay` and `loadOnboardingState` |
| B | 31-32 | Adds `isOnboardingCompleted` + `setIsOnboardingCompleted` granular selectors |
| C | 70-77 | After PIN check: awaits `loadOnboardingState()` and calls `setIsOnboardingCompleted(result)`; useEffect dep array gains `setIsOnboardingCompleted` |
| D | 211-231 | Adds State 6.5 (Loader2 + "Preparing your journal..." caption); tightens State 6 guard to `isOnboardingCompleted !== null` and mounts `<OnboardingOverlay />` as a sibling of `<AppShell>` |

### 5. useGlobalShortcuts.ts additive guard (lines 53-57)

After the existing locked-state gate (`if (ui.isLocked || !ui.isDbReady) return;`):
```typescript
// ONBRD-05 / D-20 — onboarding-active guard. ...
if (ui.isOnboardingCompleted === false) return;
```

Reuses the existing `ui` variable (read-at-fire-time pattern) — no listener re-bind needed for isOnboardingCompleted transitions.

## Plan 03 Compatibility

Plan 03 (Settings Help section + Replay button) can consume `replayOnboarding` from `src/utils/onboardingService` (already exported by Plan 01). When the Replay button calls `replayOnboarding()`:
1. The settings row is deleted
2. `useUiStore.getState().setIsOnboardingCompleted(false)` is invoked inside the service
3. App.tsx's State 6 render gate is reactive — the overlay re-mounts immediately without needing an app restart

Since this Plan 02 mounts `<OnboardingOverlay />` as a sibling of `<AppShell>` (NOT inside it), the overlay correctly covers SettingsView when `activeView === "settings"` — so the Replay button in Settings can trigger the flow without any view switching.

## Checker Fixes (Revision Pass)

All four checker blockers from the planner revision pass landed:
1. **Controlled-mode `onOpenChange`** on both Step 1 + Step 3 AlertDialogs (Escape-key now routes to handleSkip — UI-SPEC L228 contract honored)
2. **No `JSX.Element` return annotations** on either new component (matches codebase convention — grep across `src/` for `JSX.Element` returns 0)
3. **FAB-hoist CSS migrated to globals.css** (no inline JSX `<style>` blocks — codebase has zero precedent)
4. **Stable useRef + useLayoutEffect virtualRef** on PopoverAnchor (no inline literal — anti-anchor-thrash)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Cast PopoverAnchor virtualRef to satisfy React 19 RefObject typing**
- **Found during:** Task 2 build verification
- **Issue:** TypeScript error `Type 'RefObject<HTMLElement | null>' is not assignable to type 'RefObject<Measurable>'`. React 19's tightened `RefObject<T>` typing makes `useRef<T | null>(null)` produce `RefObject<T | null>`, but Radix's `virtualRef` expects `React.RefObject<Measurable>` (non-null current).
- **Fix:** Imported `type RefObject` from React and cast the ref at the use site: `virtualRef={fabRef as RefObject<{ getBoundingClientRect(): DOMRect }>}`. The cast is safe because `fabRef.current` is populated by the `useLayoutEffect` before the Popover renders (gated by `currentStep === 1`). The ref OBJECT identity remains stable across renders so warning-fix #4 is preserved.
- **Files modified:** `src/components/onboarding/OnboardingOverlay.tsx`
- **Commit:** Folded into Task 2 (`c66a129`)

No other deviations. Plan 02 executed exactly as written otherwise.

## Build Verification

`npm run build` passes after each task and after the final task. Final bundle: `dist/assets/index-DGpUyfv2.js` (1,139.20 kB / 351.85 kB gzip) — no new dependencies, weight delta is approximately the OnboardingOverlay + OnboardingSpotlight component code (~6KB).

## Performance Note

The State 6.5 hydration window (between unlock and `loadOnboardingState()` resolving) is expected to be <100ms in practice — `loadOnboardingState` runs a single `SELECT value FROM settings WHERE key = 'onboarding_completed_at'` against the local SQLite, which has an index on `key` (settings KV table). This will be confirmed during the manual UAT below.

---

## Task 4: HUMAN UAT CHECKPOINT — Awaiting User Verification

**Status:** Tasks 1-3 complete and committed. Task 4 is a `checkpoint:human-verify` gate — Claude cannot run the Tauri app from the agent. The orchestrator should pause and prompt the user to perform the six verification groups below, then resume with "approved" or specific issue descriptions.

### Setup (pick ONE)

- **Path A — Fresh DB:** Stop the app. Move/rename your dev DB file (path varies by OS — typically under `%APPDATA%\com.chronicleai.dev\` on Windows). Run `npm run tauri dev` again. The app initializes a fresh DB; entries count is 0; the migration seed is a no-op; loadOnboardingState returns false; the welcome overlay should mount automatically.
- **Path B — Existing DB with manual reset:** Open the app dev tools or use a SQLite browser to run `DELETE FROM settings WHERE key = 'onboarding_completed_at';` against the dev DB. Restart the app. (After Plan 03 ships, the "Replay" button in Settings does exactly this.)

### Verify ONE: Welcome flow appears and is focus-trapped (and Escape skips on Step 1)

1. App launches → after the brief "Preparing your journal..." loader (State 6.5) you see the Welcome AlertDialog
2. The dialog has heading "Welcome to Chronicle AI" in a serif/display font
3. The italic subheading reads "Your life story, written for you."
4. Three privacy bullets are visible, each with a small amber-colored Check icon
5. Footer shows "Step 1 of 3" + 3 dots (first dot is amber/accent, other two muted)
6. "Skip tour" link appears in the footer-left
7. "Continue" button is in the footer-right
8. Clicking outside the dialog does NOT close it (focus trap working — Radix AlertDialog ignores outside-click by default)
9. **Pressing Escape on Step 1 closes the overlay AND persists the skip — restart confirms the welcome flow does NOT reappear.** This is the controlled-mode onOpenChange contract.

### Verify TWO: Step 2 spotlight points at the FAB

1. Reset the settings row, restart, click "Continue" on Step 1
2. The screen dims with a translucent dark backdrop EXCEPT for a circular cutout around the bottom-right Quick-Write FAB (the "+" pill button)
3. A Popover appears above the FAB with heading "Start writing anytime" and the body text mentioning the "+" button and "Ctrl/Cmd + N"
4. Footer shows "Step 2 of 3" with the second dot active
5. The FAB inside the cutout is visible AND clickable (try hovering — the existing hover styles still apply; the body-class + globals.css rule hoists FAB to z-80)
6. Resize the window — the cutout follows the FAB's new position instantly (ResizeObserver) and the Popover stays anchored (stable virtualRef means no flicker)
7. The page is scroll-locked while Step 2 is active (try mouse wheel — body should not scroll)
8. Click "Got it" to advance

### Verify THREE: Step 3 CTAs work correctly (and Escape skips on Step 3)

1. Step 3 dialog appears with "Ready to begin?" heading and "Your first entry is the hardest. The next 365 are easier." body
2. Footer shows "Step 3 of 3" with the third dot active
3. Two buttons in footer-right: "I'll explore first" (outlined) and "Write your first entry" (solid amber)
4. Click "Write your first entry" → a new entry is created, the editor opens, the overlay disappears, and the editor's title is empty (you write your own first words — NO sample content was inserted)
5. Restart the app → the welcome flow does NOT appear again (markOnboardingCompleted persisted)
6. **Reset row, advance to Step 3, press Escape → overlay closes AND persists — restart confirms.** Same controlled-mode contract as Step 1.

### Verify FOUR: Skip flow works at every step

1. Reset the settings row (Path B above), restart
2. On Step 1, click "Skip tour" → overlay closes, you land on Overview
3. Restart → flow does NOT reappear (skip wrote the same row as completion)
4. Reset again, advance to Step 2, click "Skip tour" → same behavior
5. Reset again, advance to Step 3, click "Skip tour" → same behavior
6. Reset again, advance to Step 3, click "I'll explore first" → overlay closes, you land on Overview, restart confirms persistence

### Verify FIVE: Ctrl/Cmd+N is gated during onboarding

1. Reset the settings row, restart
2. While Step 1 (or Step 2 or Step 3) is showing, press Ctrl+N (Windows) or Cmd+N (Mac)
3. Confirm: NOTHING happens (no new entry created, overlay stays). The overlay can only be advanced via its own buttons or Skip tour
4. Skip the flow, then press Ctrl+N from Overview → a new entry IS created (shortcut works again)

### Verify SIX: Reduced motion (a11y)

1. Enable "Reduce motion" in your OS accessibility settings (Windows: Settings → Accessibility → Visual effects → Animation effects OFF; macOS: System Preferences → Accessibility → Display → Reduce motion ON)
2. Reset the settings row, restart
3. Welcome dialog appears INSTANTLY — no fade/zoom animation
4. Advancing to Step 2: spotlight backdrop appears INSTANTLY
5. Step 3 transition is instant
6. Confirm overall flow still works end-to-end

### Resume Signal

Type "approved" if all six verification groups pass. Describe specific issues otherwise — note which step(s) failed and what the unexpected behavior was. The most likely failure modes are:
- (a) Spotlight cutout misaligned (target rect off — check ResizeObserver firing)
- (b) FAB not clickable inside cutout (z-index hoist failed — check globals.css rule + body class scoping)
- (c) Overlay does not appear over Settings (mount-point error in App.tsx)
- (d) Ctrl+N still creates entries during the flow (guard placement wrong)
- (e) Skip on Step 2/3 does not persist (handler chain misses markOnboardingCompleted)
- (f) Escape key on Step 1 or Step 3 does NOT close the dialog (warning-fix #1 regression — onOpenChange missing or not wired to handleSkip)
- (g) Step 2 Popover flickers / re-anchors on every render (warning-fix #4 regression — virtualRef became inline literal again)

---

## Self-Check: PASSED

Files verified to exist:
- FOUND: `src/components/onboarding/OnboardingSpotlight.tsx`
- FOUND: `src/components/onboarding/OnboardingOverlay.tsx`
- FOUND: `src/styles/globals.css` (modified — body.onboarding-spotlight-active rule appended)
- FOUND: `src/App.tsx` (modified — imports + selectors + init hydration + State 6.5 + State 6 mount)
- FOUND: `src/hooks/useGlobalShortcuts.ts` (modified — onboarding-active guard at line 57)

Commits verified:
- FOUND: `23a40c9` feat(09-02): add OnboardingSpotlight + globals.css FAB-hoist rule
- FOUND: `c66a129` feat(09-02): add OnboardingOverlay 3-step state machine
- FOUND: `e0a7adf` feat(09-02): wire App.tsx onboarding state-machine + Ctrl/Cmd+N guard

Acceptance grep checks:
- `grep -c "onOpenChange" src/components/onboarding/OnboardingOverlay.tsx` = 6 (>= 2) PASS
- `grep -c "JSX.Element" src/components/onboarding/OnboardingOverlay.tsx` = 0 PASS
- `grep -c "JSX.Element" src/components/onboarding/OnboardingSpotlight.tsx` = 0 PASS
- `grep -c "<style" src/components/onboarding/OnboardingSpotlight.tsx` = 0 PASS
- `grep -c "body.onboarding-spotlight-active" src/styles/globals.css` = 1 PASS
- `grep -c "virtualRef={fabRef" src/components/onboarding/OnboardingOverlay.tsx` = 1 PASS
- `npm run build` exit 0 PASS
