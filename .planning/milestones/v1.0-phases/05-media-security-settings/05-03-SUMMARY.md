---
phase: 5
plan: "05-03"
subsystem: settings
tags: [settings, theme, font-size, ui-store, appearance]
dependency_graph:
  requires: [05-01 (idleTimeout shared), 01-foundation (CSS tokens)]
  provides: [SETT-01 theme toggle, SETT-02 font size selector, Settings page route]
  affects: [uiStore, viewStore, App.tsx, Sidebar, globals.css]
tech_stack:
  added: []
  patterns: [CSS custom properties for font scale, localStorage persistence, Zustand settings store]
key_files:
  created:
    - src/components/SettingsView.tsx
    - src/components/SettingRow.tsx
  modified:
    - src/stores/uiStore.ts
    - src/stores/viewStore.ts
    - src/App.tsx
    - src/components/Sidebar.tsx
    - src/styles/globals.css
decisions:
  - applyTheme() and applyFontScale() exported from uiStore as standalone DOM helpers, called both from setters and from App.tsx mount effect
  - SettingsView rendered at App.tsx level alongside JournalView (activeView === 'settings' branch)
  - Font scale uses CSS class on :root (.font-small, .font-medium, .font-large) rather than inline style to keep it declarative
  - OptionButton component used for all single-select groups for visual consistency
  - Change PIN and Export Data are stubbed with toast.info() placeholders pending 05-01 and 05-04 integration
metrics:
  duration: "~15 minutes"
  completed_date: "2026-04-13"
  tasks_completed: 4
  files_changed: 7
---

# Phase 5 Plan 03: Settings View Summary

**One-liner:** Full Settings page with theme toggle and font size selector — persistent light/dark mode and three-level font scale via CSS custom properties.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 3.1 | Extend uiStore with settings state | 3782d79 | uiStore.ts |
| 3.2 | CSS vars + App.tsx theme/font apply | 697c498 | globals.css, App.tsx |
| 3.3 | SettingsView + SettingRow components | c7c63ac | SettingsView.tsx, SettingRow.tsx |
| 3.4 | Wire Settings into Sidebar + viewStore | 8fdb16d | Sidebar.tsx, viewStore.ts |

## What Was Built

### uiStore Extensions (`src/stores/uiStore.ts`)
- Added `theme`, `fontSize`, `idleTimeout`, `lastActivityTime`, `isLocked` fields
- `setTheme()` updates state, persists to localStorage, calls `applyTheme()` (DOM)
- `setFontSize()` updates state, persists to localStorage, calls `applyFontScale()` (DOM)
- `setIdleTimeout()` persists to localStorage for Plan 05-01 integration
- Typed localStorage getters with fallback defaults (dark, medium, 5)

### CSS Custom Properties (`src/styles/globals.css`)
- `--font-scale` root variable (default 1)
- `.font-small` (0.875 / 14px), `.font-medium` (1 / 16px), `.font-large` (1.125 / 18px) on `:root`
- `.light` class with explicit Chronicle light tokens (mirrors default :root values)

### App.tsx Theme Bootstrap
- Reads `theme` and `fontSize` from uiStore on mount, applies to DOM immediately
- Separate `useEffect` hooks re-apply when store changes (no page reload needed)
- Routes `activeView === 'settings'` to `<SettingsView />`, all other views to `<JournalView />`

### SettingsView (`src/components/SettingsView.tsx`)
- **AppearanceSection**: Light/Dark theme toggle, Small/Medium/Large font size selector
- **SecuritySection**: 1/5/15/30/Never idle timeout selector, Change PIN stub
- **DataSection**: Export Data stub, app version footer
- `OptionButton` component for single-select groups with accent highlight on selected
- `SectionHeader` with Lucide icon + title

### SettingRow (`src/components/SettingRow.tsx`)
- Reusable label + optional description + right-side control layout
- Used across all setting rows for consistent spacing

### Navigation
- `ActiveView` type in `viewStore.ts` extended with `"settings"`
- `Sidebar.tsx` routes "Settings" nav click to `setView("settings")`
- Active highlight correctly shows Settings nav item when `activeView === 'settings'`

## Requirements Addressed

| Req | Title | Status |
|-----|-------|--------|
| SETT-01 | User can toggle between light mode and dark mode | Done |
| SETT-02 | User can select a font size (small / medium / large) | Done |

## Known Stubs

| Stub | File | Reason |
|------|------|--------|
| Change PIN button | SettingsView.tsx SecuritySection | Awaits PinEntryScreen/PinSetupScreen from Plan 05-01 |
| Export Data button | SettingsView.tsx DataSection | Awaits export logic from Plan 05-04 |

Both stubs show `toast.info()` placeholders — the Settings page goal (SETT-01, SETT-02) is fully achieved without them.

## Deviations from Plan

### Auto-fixed Issues

None.

### Scope Adjustments

1. **SettingsView rendered in App.tsx** (not JournalView.tsx) — JournalView handles journal-specific routing only. Settings is a top-level view alongside JournalView. This is cleaner than adding settings to JournalView's routing logic.

2. **`showEntryList` in Sidebar unchanged** — The plan mentioned ensuring settings doesn't break the sidebar layout. The existing `showEntryList = activeView === "editor"` condition already handles this correctly (settings is not "editor"), no change needed.

3. **ChangePinDialog deferred** — Plan 3.5 (ChangePinDialog) depends on Plan 05-01 PIN components that are being built in parallel. Stubbed with toast message; integration deferred to 05-01 plan.

## Self-Check: PASSED

All created files exist on disk. All 4 task commits verified in git log.
