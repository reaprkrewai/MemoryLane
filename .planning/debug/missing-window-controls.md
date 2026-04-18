---
status: diagnosed
trigger: "missing-window-controls — The custom title bar in the Tauri desktop window does not render Minimize, Maximize, or Close buttons. Phase 01 spec required these to exist on the custom title bar and to invoke Tauri window API actions."
created: 2026-04-17T00:00:00Z
updated: 2026-04-17T00:00:00Z
---

## Current Focus

hypothesis: CONFIRMED — `<AppShell>` (which is the ONLY mount point for `<TitleBar />`) is rendered only in the "unlocked" branch of `src/App.tsx`. The loading, dbError, PIN-unknown, PIN-setup, and PIN-entry branches render raw `<div>`s with no title bar. Because `tauri.conf.json` sets `decorations: false`, those states have zero window controls of any kind. This is a regression introduced by Phase 05-01 (commit 40f6ea6) which restructured the App.tsx state machine.
test: Read App.tsx render tree + git history of App.tsx + verify TitleBar is only imported in AppShell.tsx
expecting: (confirmed) — TitleBar grep returns AppShell.tsx only; original Phase 01 commit wrapped ALL states in AppShell; Phase 05 commit 40f6ea6 pulled loading/error states OUT of AppShell.
next_action: Return diagnosis to caller (goal: find_root_cause_only — do not apply fix)

## Symptoms

expected: Minimize/Maximize/Close buttons in the custom title bar each perform their OS action via the Tauri window API (from .planning/phases/01-foundation/01-HUMAN-UAT.md test 3)
actual: "There are no minimize, maximize or close buttons visible in the title bar." Screenshot showed an error-state window (DB init failure); the top region had no control buttons either.
errors: None — visual absence.
reproduction: `npm run tauri dev`, inspect custom title bar region (Phase 01 UAT test 3).
started: Discovered during Phase 01 human UAT on 2026-04-17. Title bar likely introduced by Phase 01. Parallel investigation covers db-init-failure (test 1 blocker).

## Eliminated

(none yet)

## Evidence

- timestamp: 2026-04-17T00:00:00Z
  checked: .planning/STATE.md "Accumulated Context / Decisions carried over from v1.0"
  found: "Window controls placed outside `data-tauri-drag-region` to prevent mousedown interception"
  implication: Window controls component exists in the codebase (v1.0 shipped), is not a new Phase 01 thing being added — so the investigation is "where did they go" / "why aren't they rendering in the current state", not "were they built".

- timestamp: 2026-04-17T00:00:00Z
  checked: .planning/phases/01-foundation/01-VERIFICATION.md artifact table
  found: Phase 01 VERIFICATION confirmed `src/components/TitleBar.tsx` was shipped with `h-10` drag region and window controls (Minus, Square, X) in sibling div outside drag region. Artifact "Custom 40px title bar with data-tauri-drag-region ✓ VERIFIED".
  implication: TitleBar file and its three buttons exist correctly — the bug is not inside TitleBar; it is about WHERE/WHEN the TitleBar is mounted in the tree.

- timestamp: 2026-04-17T00:00:00Z
  checked: src-tauri/tauri.conf.json
  found: Line 21 `"decorations": false` — OS-provided title bar and controls are suppressed. Window has no min/max/close buttons unless the frontend draws them.
  implication: If frontend fails to render the custom TitleBar in any state, that state has literally zero window controls of any kind.

- timestamp: 2026-04-17T00:00:00Z
  checked: src/components/TitleBar.tsx
  found: Component renders three `<button>`s (Minimize, Maximize, Close) each wired via dynamic import of `@tauri-apps/api/window`'s `getCurrentWindow().minimize() / .toggleMaximize() / .close()`. The buttons sit in a `flex items-center gap-0.5 pr-2` div that is a SIBLING of the `data-tauri-drag-region` div — structurally correct and visible.
  implication: The component itself is correct. Bug is elsewhere.

- timestamp: 2026-04-17T00:00:00Z
  checked: src/components/AppShell.tsx
  found: Imports and renders `<TitleBar />` at the top of its flex column (line 7). This is the ONLY place TitleBar is mounted.
  implication: Title bar visibility is a function of whether AppShell is rendered.

- timestamp: 2026-04-17T00:00:00Z
  checked: `grep -r TitleBar src/` across all components
  found: Only 2 files reference TitleBar: src/components/TitleBar.tsx (definition) and src/components/AppShell.tsx (consumer). No other component mounts TitleBar.
  implication: If AppShell is not rendered, there is no title bar anywhere.

- timestamp: 2026-04-17T00:00:00Z
  checked: src/App.tsx render tree (lines 140-194)
  found: Six mutually exclusive state branches, all siblings of a root React Fragment. Only the LAST branch ("State 6: Unlocked, show content", lines 186-191) wraps children in `<AppShell>`. The other five — State 1 loading (lines 143-150), State 2 dbError (lines 153-163), State 3 PIN unknown (lines 166-173), State 4 PIN setup (lines 176-178), State 5 PIN locked (lines 181-183) — render bare `<div>` / `<PinSetupScreen />` / `<PinEntryScreen />` with no AppShell wrapper, and therefore no TitleBar.
  implication: In any non-happy-path state, the custom title bar is structurally absent. Combined with `decorations: false`, the window has zero controls in those states. User's UAT screenshot was the dbError state (test 1 failed with "The database failed to initialize" message) — which matches State 2 exactly, explaining why the top of the window had no controls.

- timestamp: 2026-04-17T00:00:00Z
  checked: src/components/PinSetupScreen.tsx and src/components/PinEntryScreen.tsx
  found: Neither component imports or renders TitleBar. They render their own full-screen layouts directly.
  implication: The PIN screens (States 4 and 5) also lack window controls — a secondary regression even when DB init succeeds.

- timestamp: 2026-04-17T00:00:00Z
  checked: git log of src/App.tsx and `git show 57d97f4:src/App.tsx` (original Phase 01 commit)
  found: Original Phase 01 App.tsx wrapped EVERY state (loading, dbError, empty) as children INSIDE `<AppShell>`, so TitleBar was always mounted regardless of state.
  implication: Phase 01 was correctly structured. The current state is a regression.

- timestamp: 2026-04-17T00:00:00Z
  checked: `git show 40f6ea6 -- src/App.tsx` (Phase 05-01 PIN security commit)
  found: Commit 40f6ea6 "feat(05-01): implement PIN security" restructured App.tsx from "single AppShell wrapping state-conditional children" to "sibling state branches at the fragment root". The diff shows `<AppShell>` was closed around the loading/error divs and those were moved out as bare siblings. Commit message confirms: "Integrate 6-state waterfall in App.tsx: loading → DB error → PIN check → setup → locked → unlocked". Only the final "unlocked" state retained the AppShell wrapper.
  implication: This is a clear, git-bisect-confirmable regression introduced by Phase 05-01. The PIN refactor did not carry the TitleBar into the five non-unlocked branches.

## Resolution

root_cause: |
  `<AppShell>` — which is the only component that renders `<TitleBar />` — is only mounted in the "unlocked" state branch of src/App.tsx (lines 186-191). The five other state branches (loading, dbError, PIN unknown, PIN setup, PIN locked) render raw divs / PIN screens as siblings of the fragment root, with no title bar. Combined with `tauri.conf.json`'s `decorations: false`, this produces a window with zero window controls in any non-happy-path state. The user's UAT screenshot was the dbError state (per test 1 failure) which lacks the title bar entirely.

  This is a regression introduced by commit 40f6ea6 (feat(05-01): implement PIN security). The original Phase 01 App.tsx (commit 57d97f4) wrapped ALL states inside `<AppShell>`, so the title bar was always visible. The Phase 05 PIN refactor restructured App.tsx into a six-state waterfall at the fragment root without carrying the title bar into the non-unlocked branches.

fix: |
  Not applied (diagnose-only mode). Fix direction: render the custom title bar in every state, not just the unlocked one. Easiest options:
  1. Render `<TitleBar />` as a sibling of the state switch at the top of App.tsx's return — so it always mounts regardless of which state branch is active. Each state-branch `<div>` would then need to drop its `h-full` in favor of filling the remaining viewport below the 48px title bar.
  2. OR: extract a minimal shell component that renders TitleBar + children (without sidebar) and wrap the loading, dbError, and PIN branches in it.
  Either path restores the Phase 01 guarantee that the custom title bar is present in every render state.

verification: (not applied — diagnose-only)
files_changed: []
