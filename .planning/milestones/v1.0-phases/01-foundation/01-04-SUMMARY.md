---
phase: 01-foundation
plan: 04
subsystem: ui
tags: [tauri, react, window-chrome, titlebar, app-shell, decorations-false]

# Dependency graph
requires:
  - phase: 01 (v1.0 Foundation, plan 01-01)
    provides: "Custom TitleBar component (48px h-12 drag region + Min/Max/Close buttons wired via @tauri-apps/api/window); tauri.conf.json decorations: false"
  - phase: 05 (v1.0 Media, Security & Settings, plan 05-01)
    provides: "Six-state App.tsx render switch (loading, dbError, PIN-unknown, PIN-setup, PIN-entry, Unlocked) — also the commit (40f6ea6) that introduced the UAT-02 regression by wrapping only the Unlocked branch in AppShell"
provides:
  - Single-mount invariant for `<TitleBar />` — rendered exactly once in App.tsx above the state switch, never inside AppShell
  - Full-window chrome wrapper (`flex h-screen flex-col bg-bg text-text`) around every state branch — every state inherits the 48px title bar and the Toaster mount
  - State-switch region container (`flex flex-1 overflow-hidden`) directly below TitleBar — any new top-level state branch must be added inside this container
  - Simplified AppShell: sidebar + main-content layout only, using `h-full flex-1 overflow-hidden` (inherits bounded height from App.tsx's flex column)
  - Regression closure for UAT-02: Min/Max/Close controls now visible + functional in states 1 (loading), 4 (PIN-setup), 5 (PIN-entry), 6 (Unlocked) — verified by user UAT
affects:
  - Any future top-level state branch added to App.tsx (onboarding overlays, error boundaries, splash screens, etc.) — MUST render inside the `<div className="flex flex-1 overflow-hidden">` container below `<TitleBar />`, NOT as a sibling above the state switch, or the TitleBar invariant breaks
  - Phase 9 OnboardingOverlay — ROADMAP specifies it renders "at App.tsx level (above AppShell, alongside SettingsView)"; this plan clarifies that means inside the state-switch container, not above TitleBar
  - Any future plan that modifies AppShell — it is now layout-only (sidebar + content), does NOT own window chrome, and assumes its parent provides a bounded flex child

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Window-chrome single-mount: the custom 48px TitleBar renders once at the App.tsx root, above the state switch — NEVER inside any state-specific wrapper. With `decorations: false` in tauri.conf.json the TitleBar is the only source of window controls, so any state that renders without it has no way to close/minimize/maximize the window."
    - "State-switch container pattern: every state branch lives inside a single `<div className=\"flex flex-1 overflow-hidden\">` sibling to TitleBar. This gives each state a bounded flex child so `h-full` on the state's root div resolves correctly to 'viewport minus 48px title bar'."
    - "AppShell as layout-only: AppShell is now responsible for sidebar + content layout only. Window chrome (TitleBar) lives at App.tsx; height is inherited from App.tsx's flex column via `h-full flex-1 overflow-hidden`."

key-files:
  created: []
  modified:
    - "src/App.tsx (added TitleBar import; replaced root <></> fragment with a `<div className=\"flex h-screen flex-col bg-bg text-text\">` wrapper; added single `<TitleBar />` mount; wrapped all six state branches in a `<div className=\"flex flex-1 overflow-hidden\">` sibling; wrapped PinSetupScreen and PinEntryScreen in `<div className=\"h-full w-full\">` parents; added `w-full` to every state div to fill horizontal space; Toaster moved inside the outer wrapper)"
    - "src/components/AppShell.tsx (removed TitleBar import + mount; collapsed outer wrapper from `flex h-screen flex-col bg-bg text-text` to `flex h-full flex-1 overflow-hidden` since App.tsx now owns the `h-screen`/`flex-col`/`bg-bg text-text` role)"

key-decisions:
  - "Lift TitleBar to App.tsx rather than duplicate it into each state's JSX. Alternatives considered: (a) keep TitleBar per-state — leaks implementation detail into five state branches, any new state forgets it; (b) render TitleBar at a higher HOC — no meaningful HOC exists here, App.tsx already IS the top-level component. The chosen invariant — one mount at App.tsx root — is the simplest guarantee that every state has window controls."
  - "Wrap PIN screens in a `<div className=\"h-full w-full\">` parent rather than relying on their own `h-full` alone. Task 2 discovered both PinSetupScreen and PinEntryScreen already used `h-full` internally, but their parent in the new layout is the `flex flex-1 overflow-hidden` row — a flex child needs an explicit `h-full w-full` wrapper to receive the full bounded height that its children's `h-full` then cascades from. Without the wrapper, the PIN screens would collapse to content height inside the flex row."
  - "Preserve Plan 01-03's dev-only `<pre>{dbError}</pre>` block during the restructure. Plan 01-03 shipped before 01-04, so the State 2 branch has a dev-only SQLite-error surface that would be easy to lose during the return-block rewrite — it was explicitly carried forward into the new structure (App.tsx lines 165-169)."
  - "Do NOT modify TitleBar.tsx or tauri.conf.json. TitleBar.tsx is correct per Phase 01-01 v1.0 decisions (three buttons outside `data-tauri-drag-region`). `decorations: false` is intentional — it's the reason the custom TitleBar exists. Changing either would re-open decisions that were deliberately closed and risk introducing new regressions."
  - "Accept `npx tsc --noEmit` + `npm run build` as verifier substitutes for the plan's `npm run lint` line. This repo has no ESLint config or `lint` npm script (same situation Plan 01-03 documented — running `npm run lint` errors with 'Missing script: lint'). Following Plan 01-03's precedent, the type-check + build pair is the effective verifier."

requirements-completed:
  - SETT-04

# Metrics
duration: ~7 min (code + verification) + human UAT
completed: 2026-04-17
---

# Phase 1 Plan 04: Window Controls In All App States Summary

**Lift `<TitleBar />` out of AppShell (Unlocked-only mount) into a single mount at the App.tsx root above the state switch — Min/Max/Close controls now render in every app state (loading, dbError, PIN-unknown, PIN-setup, PIN-entry, Unlocked), closing the UAT-02 regression introduced by Phase 05-01 commit 40f6ea6.**

## Performance

- **Duration:** ~7 min implementation + human cold-start UAT across states 1, 4, 5, 6
- **Started:** 2026-04-18T02:55Z (Task 1 commit)
- **Completed:** 2026-04-17 (human `approved` after exercising all reachable states)
- **Tasks:** 3 completed (1 code, 1 no-op verification, 1 human-verify checkpoint)
- **Files modified:** 2

## Accomplishments

- Fixed the Phase 05-01 regression (commit 40f6ea6) that left states 1-5 without window controls by introducing the six-state render switch without carrying `<TitleBar />` into the non-Unlocked branches. With `decorations: false` in tauri.conf.json, those five states had zero ways to close/minimize/maximize the window.
- Moved the 48px custom title bar to a single mount at the App.tsx root so it is always the topmost element of the window regardless of which state is active. Every state inherits the drag region, three buttons, and Tauri window API wiring automatically.
- Simplified `AppShell` to a pure layout component (sidebar + main content) — it no longer owns window chrome or the outer `h-screen flex-col` wrapper. This prevents any future double-render of TitleBar and makes the component's single responsibility obvious from its source.
- Confirmed via Task 2 no-op verification that `PinSetupScreen` and `PinEntryScreen` already use `h-full` (not `h-screen`) on their root divs — the correct pattern under the new parent. No PIN-screen changes were required; they were wrapped in `<div className="h-full w-full">` parents in App.tsx so the flex row gives them the full bounded height to cascade from.
- Human UAT confirmed: Min/Max/Close controls render and work in states 1 (loading), 4 (PIN-setup), 5 (PIN-entry), and 6 (Unlocked); no double title bar in state 6; drag region still drags the window; PIN-screen cards are not clipped. User response: `approved`.

## Task Commits

1. **Task 1: Lift TitleBar above state switch in App.tsx; remove TitleBar from AppShell** — `28a0a34` (fix)
2. **Task 2: Verify PinSetupScreen and PinEntryScreen fit correctly under 48px title bar** — no-op (both components already used `h-full` root divs per the pattern required; no code changes committed)
3. **Task 3: Human UAT — window controls present in every app state** — approved by user after exercising states 1, 4, 5, 6; no code changes (human-verify checkpoint)

## Files Created/Modified

- `src/App.tsx` — Added `import { TitleBar } from "./components/TitleBar";` alongside the other component imports. Replaced the root `<>` fragment in the return with `<div className="flex h-screen flex-col bg-bg text-text">`. Added a single `<TitleBar />` as the first child. Wrapped all six state branches in a `<div className="flex flex-1 overflow-hidden">` sibling to TitleBar. Added `w-full` to every state's root div so each state fills the horizontal space of the flex row. Wrapped `<PinSetupScreen />` and `<PinEntryScreen />` in `<div className="h-full w-full">` parents so their internal `h-full` roots resolve correctly. Preserved the dev-only `<pre>{dbError}</pre>` block from Plan 01-03 inside the State 2 branch. `<Toaster />` moved inside the outer wrapper.
- `src/components/AppShell.tsx` — Removed the `import { TitleBar } from "./TitleBar";` line and the `<TitleBar />` mount. Collapsed the outer wrapper from `flex h-screen flex-col bg-bg text-text` to `flex h-full flex-1 overflow-hidden` because the App.tsx wrapper now owns the `h-screen`/`flex-col`/`bg-bg text-text` role. Inner layout (Sidebar + main content) unchanged.

## Before / After — App.tsx Render Tree Structure

**Before (Phase 05-01 regression):**

```
<>  (React.Fragment root)
  {State 1 — loading}         <div h-full>...</div>         ← no TitleBar
  {State 2 — dbError}         <div h-full>...</div>         ← no TitleBar
  {State 3 — PIN unknown}     <div h-full>...</div>         ← no TitleBar
  {State 4 — PIN setup}       <PinSetupScreen />            ← no TitleBar
  {State 5 — PIN entry}       <PinEntryScreen />            ← no TitleBar
  {State 6 — Unlocked}        <AppShell>                    ← TitleBar mounted inside, Unlocked-only
                                <TitleBar />                   (40f6ea6 regression: only state with chrome)
                                <Sidebar /> + <main />
                              </AppShell>
  <Toaster />
</>
```

With `decorations: false`, states 1-5 rendered as fullscreen windows with zero visible window controls — user UAT was stuck in state 2 (dbError) which is why "missing window controls" was first reported. TitleBar was the only source of chrome and it only existed on the happy path.

**After (window-chrome invariant restored):**

```
<div flex h-screen flex-col bg-bg text-text>     ← full-window chrome wrapper
  <TitleBar />                                   ← ALWAYS rendered, topmost, single mount
  <div flex flex-1 overflow-hidden>              ← state-switch region below chrome
    {State 1 — loading}       <div h-full w-full>...</div>
    {State 2 — dbError}       <div h-full w-full>...</div>     (+ dev-only <pre> from 01-03)
    {State 3 — PIN unknown}   <div h-full w-full>...</div>
    {State 4 — PIN setup}     <div h-full w-full><PinSetupScreen /></div>
    {State 5 — PIN entry}     <div h-full w-full><PinEntryScreen /></div>
    {State 6 — Unlocked}      <AppShell>                       ← TitleBar NOT inside AppShell now
                                <Sidebar /> + <main />            (AppShell is layout-only)
                              </AppShell>
  </div>
  <Toaster />
</div>
```

Tree-diagram one-liner: `Fragment > state branches` → `flex-col wrapper > TitleBar + flex-1 state switch region`.

## UAT Verification

Human-run checkpoint exercised the reachable states per the plan's `<how-to-verify>`:

- **State 1 (loading):** Brief 48px title bar at top with three controls visible during the "Opening your journal..." spinner — controls visible and clickable (Minimize collapsed the window).
- **State 4 (PIN setup):** After deleting `%APPDATA%/com.reviots.chronicle-ai/chronicle-ai.db`, fresh launch shows 48px title bar atop the centered "Set a PIN" card. Card not clipped, title bar present with all three controls functional.
- **State 5 (PIN entry):** After completing PIN setup and relaunching, 48px title bar renders above the centered "Unlock Journal" card. Card not clipped, controls functional, drag region drags the window.
- **State 6 (Unlocked):** After PIN entry, standard AppShell layout renders — EXACTLY ONE title bar at top (no double-render), sidebar + content + toast below. All three window controls still functional.

States 2 (dbError) and 3 (PIN-unknown) are transient/unreachable on a healthy DB once Plan 01-03 shipped; user opted not to force them. The invariant established (`<TitleBar />` is always rendered) covers them structurally.

User response: `approved`.

## Decisions Made

- **Lift TitleBar to App.tsx, not duplicate per-state.** One mount is the simplest possible invariant. Duplication would leak chrome into every state's JSX and any new state (Phase 9 OnboardingOverlay, future error boundaries) would have to remember to mount it.
- **Wrap PIN screens in `<div className="h-full w-full">` parents.** Flex rows don't give children explicit dimensions — they distribute via `flex-1`. Without the wrapper, the PIN screens' `h-full` has no bounded parent and collapses to content height. The wrapper is a 10-character fix that keeps PinSetupScreen/PinEntryScreen source code completely unchanged (Task 2's no-op finding stays valid).
- **Preserve Plan 01-03's dev-only `<pre>{dbError}</pre>` block.** 01-03 shipped first (immediate predecessor commit `d143b76`), and its dev-only SQLite-error surface sits inside the State 2 branch that this plan rewrote. Carrying it forward into the new structure was explicit — the plan's interface block even called it out. Verified by reading App.tsx lines 165-169 after commit.
- **Do not modify TitleBar.tsx or tauri.conf.json.** The plan's `<action>` explicitly forbids both, because TitleBar is correct per v1.0 Phase 01-01 decisions and `decorations: false` is the reason the custom TitleBar exists.

## Note for Future Planners

**Any new top-level state branch must render inside the `<div className="flex flex-1 overflow-hidden">` container below `<TitleBar />` — do NOT add siblings above the state switch.**

Concretely, this means:

- Phase 9 OnboardingOverlay (ROADMAP lines 218-219: "renders at App.tsx level above AppShell") must render inside the state-switch container, NOT as a sibling above TitleBar. It can still overlay every top-level view including Settings — it just can't overlay the TitleBar, and shouldn't want to (window controls must remain accessible even during onboarding).
- Any future error boundary wrapping the top-level app must be added INSIDE the flex-col wrapper, below TitleBar — so the TitleBar survives a state-branch crash.
- Any future splash screen, loading overlay, or modal route must follow the same rule.

The invariant to preserve: `<TitleBar />` is the first rendered child of the App.tsx return and the topmost element of the window. Every other UI element is a sibling or descendant of the state-switch container below it.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `npm run lint` verifier not applicable — substituted `npx tsc --noEmit` + `npm run build`**
- **Found during:** Task 1 (verification stage)
- **Issue:** Task 1's `<verify>` block listed `npm run lint` as an automated check, but this repo's `package.json` has no `lint` script (same repo-state finding as Plan 01-03 — STATE.md accumulated-context already notes: "No `npm run lint` script or ESLint config exists in this repo yet — verifiers should use `npx tsc --noEmit` as the type/lint surrogate"). Running `npm run lint` would error with "Missing script: lint" and fail the gate for an unrelated reason.
- **Fix:** Skipped `npm run lint`; relied on the other verify-block commands (`npx tsc --noEmit` and `npm run build`) as the effective type/lint surrogate. This continues Plan 01-03's precedent rather than expanding scope to add ESLint in this gap-closure plan.
- **Files modified:** None (verification-level deviation only)
- **Verification:** `npx tsc --noEmit` passed cleanly with no output; the TitleBar-mount node script and PIN-screen `h-full` node script both emitted PASS.
- **Committed in:** N/A (not a code change)

---

**Total deviations:** 1 auto-fixed (1 blocking-verifier substitution — identical to Plan 01-03's precedent)
**Impact on plan:** None on correctness. Continuing to track "add ESLint + `lint` npm script as its own plan" in STATE.md todos — not expanded in scope for this gap-closure plan.

## Issues Encountered

None during execution. Task 2 was a no-op as the plan anticipated — PinSetupScreen.tsx:62 and PinEntryScreen.tsx:66 both already used `<div className="flex h-full items-center justify-center bg-background">` as their root, matching the expected pattern under the new parent. The plan's Task 2 action block explicitly allowed for "these files may require ZERO edits" and that is what happened.

## Known Stubs

None introduced by this plan. The fix is pure render-tree restructuring — no placeholder data, no mocked components, no hardcoded empty values, no new UI copy.

## User Setup Required

None — no external service configuration or manual env-var setup was introduced by this plan.

## Next Phase Readiness

- UAT-02 (major) closed — Phase 01 UAT test 3 ("Window Control Buttons") no longer regresses across state transitions. Combined with 01-03 closing UAT-01, Phase 01 gap-closure pass is complete.
- Phase 01 base (v1.0) remains architecturally complete; Milestone v1.0 has no remaining known UAT gaps.
- v1.1 planning can resume — Phase 7 (Foundation & Derived State) has all 5 plans defined and is unblocked. Suggested next commands: `/gsd-verify-work 01` (optional regression sweep across both gap-closure plans) then `/gsd-execute-phase 07` to begin v1.1.

## Self-Check: PASSED

- `src/App.tsx` — verified via Read tool: TitleBar imported once (line 6), rendered once at line 143, root `<div className="flex h-screen flex-col bg-bg text-text">` wrapper at line 142, state-switch `<div className="flex flex-1 overflow-hidden">` at line 144, PIN-screen wrappers at lines 185-187 and 192-194, Plan 01-03 dev-only `<pre>` preserved at lines 165-169.
- `src/components/AppShell.tsx` — verified via Read tool: TitleBar import and mount both removed; outer wrapper collapsed to `flex h-full flex-1 overflow-hidden`; sidebar + main-content layout unchanged.
- `src/components/PinSetupScreen.tsx` — verified via Read tool: root div uses `h-full` (line 62), not `h-screen`; no other changes.
- `src/components/PinEntryScreen.tsx` — verified via Read tool: root div uses `h-full` (line 66), not `h-screen`; no other changes.
- Commit `28a0a34` (fix(01-04): lift TitleBar above state switch in App.tsx) — confirmed in `git log --oneline -5`.
- Task 1 automated check (`node -e "..."` TitleBar mount script) — PASS: "TitleBar mounted only in App.tsx".
- Task 2 automated check (`node -e "..."` PIN-screen h-full script) — PASS for both PinSetupScreen.tsx and PinEntryScreen.tsx.
- `npx tsc --noEmit` — PASS (no output / no errors).

---
*Phase: 01-foundation*
*Completed: 2026-04-17*
