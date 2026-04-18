---
phase: 08-home-dashboard-widgets
plan: "05"
subsystem: app-shell / global-shortcuts / fab
tags: [fab, keyboard-shortcut, global-hook, app-shell, a11y, focus-visible, DASH-08, DASH-09]
dependency_graph:
  requires: [08-02]
  provides: [QuickWriteFAB-at-AppShell, useGlobalShortcuts, DASH-08, DASH-09]
  affects: [src/components/AppShell.tsx, src/components/QuickWriteFAB.tsx, src/hooks/useGlobalShortcuts.ts, src/App.tsx]
tech_stack:
  added: []
  patterns:
    - window.addEventListener keydown with useEffect cleanup (mirrors useIdleTimeout shape)
    - useUiStore.getState() fire-time gate (not closure-captured subscription)
    - NavigateSource "timeline" hardcoded (type constraint — overview/calendar/search invalid)
    - isTypingContext() module-level helper for INPUT/TEXTAREA/contentEditable guard
key_files:
  created:
    - src/hooks/useGlobalShortcuts.ts
  modified:
    - src/components/QuickWriteFAB.tsx
    - src/components/AppShell.tsx
    - src/App.tsx
decisions:
  - "NavigateSource is always 'timeline' (not activeView) — overview/calendar/search are not valid NavigateSource values per viewStore type"
  - "useGlobalShortcuts called unconditionally at App top level — guards itself via store state at fire-time, matching useIdleTimeout pattern"
  - "FAB rendered as last child of AppShell outer flex div — fixed CSS positioning means JSX placement doesn't affect layout"
  - "isTypingContext() defined at module scope for independent testability"
metrics:
  duration: "~15 minutes"
  completed: "2026-04-18"
  tasks_completed: 4
  tasks_total: 4
  files_changed: 4
---

# Phase 08 Plan 05: FAB Hoist + Global Keyboard Shortcut Summary

**One-liner:** QuickWriteFAB hoisted to AppShell with 4-view visibility gate; Ctrl/Cmd+N global shortcut wired via useGlobalShortcuts hook with isTypingContext + isLocked + isDbReady guards.

---

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Normalize FAB aria-label, add focus-visible ring, data-onboarding | cb3a1ec | src/components/QuickWriteFAB.tsx |
| 2 | Hoist QuickWriteFAB to AppShell with activeView visibility gate | cc760f6 | src/components/AppShell.tsx |
| 3 | Create useGlobalShortcuts hook | c629988 | src/hooks/useGlobalShortcuts.ts |
| 4 | Mount useGlobalShortcuts in App.tsx | 4c89bf4 | src/App.tsx |

---

## Implementation Details

### QuickWriteFAB changes (D-22)

Three targeted edits — no visual regression:

1. **aria-label**: `"Quick write new entry"` → `"New entry"` (DASH-09 verbatim)
2. **className appended**: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2`
3. **data-onboarding attribute added**: `data-onboarding="quick-write-fab"` (Phase 9 tour target)

Preserved unchanged: gradient style, shadow classes, shimmer span, Feather icon (size=16), hover/active classes, "Quick Write" label text, pill shape.

### FAB_VISIBLE_VIEWS array (D-21)

```typescript
const FAB_VISIBLE_VIEWS = ["overview", "timeline", "calendar", "search"] as const;
```

FAB hidden on `"editor"` and `"settings"`. Condition: `(FAB_VISIBLE_VIEWS as readonly string[]).includes(activeView)`.

### useGlobalShortcuts gate conditions (D-23, D-25)

Handler fires only when ALL conditions pass:

1. `(e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "n"` — key match
2. `!isTypingContext()` — INPUT, TEXTAREA, contentEditable (TipTap) blocked
3. `!ui.isLocked && ui.isDbReady` — read via `useUiStore.getState()` at fire-time
4. `view.activeView !== "editor" && view.activeView !== "settings"` — belt-and-suspenders

### addEventListener / removeEventListener counts

- `window.addEventListener("keydown", ...)`: **1** (in useEffect)
- `window.removeEventListener("keydown", ...)`: **1** (in useEffect cleanup return)

### App.tsx edits

- **Edit 1** (import, line 18): `import { useGlobalShortcuts } from "./hooks/useGlobalShortcuts";`
- **Edit 2** (call, line ~133): `useGlobalShortcuts();` immediately after `useIdleTimeout();`

Both hooks called unconditionally at component top level. Self-guarding via store state.

### NavigateSource constraint

`navigateToEditor("timeline")` — string literal hardcoded in both AppShell and useGlobalShortcuts. `"overview"`, `"calendar"`, `"search"` are NOT valid NavigateSource values (type is `"timeline" | "sidebar" | null`).

---

## Deviations from Plan

None — plan executed exactly as written. All D-21..D-25 constraints honored verbatim.

---

## Threat Mitigations Implemented

| Threat ID | Mitigation |
|-----------|-----------|
| T-08-05-01 | `useUiStore.getState().isLocked` checked at fire-time before any store mutation |
| T-08-05-02 | `isTypingContext()` + `activeView === "editor"` double guard |
| T-08-05-07 | `useEffect` cleanup returns `window.removeEventListener` |

---

## Known Stubs

None — all functionality is fully wired.

---

## Threat Flags

None — no new network endpoints, auth paths, or trust boundary changes introduced.

---

## Self-Check: PASSED

- `src/components/QuickWriteFAB.tsx` — FOUND, aria-label="New entry", focus-visible ring, data-onboarding present
- `src/components/AppShell.tsx` — FOUND, FAB_VISIBLE_VIEWS, showFAB conditional, navigateToEditor("timeline")
- `src/hooks/useGlobalShortcuts.ts` — FOUND, all gates present, addEventListener+removeEventListener=1 each
- `src/App.tsx` — FOUND, import + call after useIdleTimeout
- Commits cb3a1ec, cc760f6, c629988, 4c89bf4 — all present in git log
- `npx tsc --noEmit` — exits 0
- `npm run build` — exits 0 (chunk size warning is pre-existing, unrelated)
