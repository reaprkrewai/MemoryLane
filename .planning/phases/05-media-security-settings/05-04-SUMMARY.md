---
phase: 5
plan: "05-04"
subsystem: export
tags: [export, zip, data, settings]
dependency_graph:
  requires: [05-02, 05-03]
  provides: [SETT-03]
  affects: [viewStore, SettingsView]
tech_stack:
  added: [jszip@3.10.1]
  patterns: [useDataExport hook, zipUtils utility, useExportFile hook, Web File System Access API]
key_files:
  created:
    - src/hooks/useDataExport.ts
    - src/utils/zipUtils.ts
    - src/hooks/useExportFile.ts
    - src/components/SettingsView.tsx
  modified:
    - src/stores/viewStore.ts
    - src/components/Sidebar.tsx
    - src/components/JournalView.tsx
    - package.json
decisions:
  - "Used Web File System Access API (showSaveFilePicker) instead of @tauri-apps/plugin-dialog — no Rust plugin setup required"
  - "Photo reading uses convertFileSrc + fetch instead of @tauri-apps/plugin-fs — avoids Cargo.toml changes"
  - "SettingsView created here (not from 05-03 dep) since 05-03 had not committed — appearance section is a placeholder"
  - "media_attachments table access wrapped in try/catch — gracefully handles case where 05-02 has not run yet"
metrics:
  duration: "~30 minutes"
  completed: "2026-04-13T21:58:01Z"
  tasks_completed: 4
  files_changed: 7
---

# Phase 5 Plan 04: Data Export Summary

**One-liner:** One-click ZIP export using JSZip + Web File System Access API, collecting all entries, tags, photos, and settings from SQLite.

---

## What Was Built

### Task 4.1 — Data Collection (`useDataExport.ts`)
Hook that queries SQLite for all entries, tags, entry-tag associations, photo attachments, and settings. Returns a typed `ExportData` struct with ISO 8601 timestamps. Photo paths are mapped to relative ZIP paths (`photos/{entryId}/{filename}`). Media attachments query is wrapped in try/catch to gracefully handle cases where the `media_attachments` table (from plan 05-02) does not yet exist.

### Task 4.2 — ZIP Creation (`zipUtils.ts`)
Utility function `createExportZip` that:
- Adds `metadata.json` at ZIP root (strips `absolutePath` from photo records before serializing)
- Reads each photo file using `convertFileSrc` (Tauri asset protocol) + `fetch()` as ArrayBuffer
- Skips corrupted/missing photo files and continues (partial exports allowed)
- Reports progress via callback for each photo
- Returns `{ blob, includedPhotos, skippedPhotos }`

### Task 4.3 — File Dialog & Write (`useExportFile.ts`)
Hook `useExportFile` that:
- Uses `showSaveFilePicker` (Web File System Access API, available in Tauri's Chromium webview)
- Default filename: `chronicle-export-YYYY-MM-DD.zip`
- Handles user cancellation via `AbortError` → returns `null`
- Handles write permission errors gracefully
- Falls back to download anchor link if `showSaveFilePicker` is unavailable

### Task 4.4 — Export Button in Settings (`SettingsView.tsx` + nav wiring)
- `SettingsView` component with a Data section containing an "Export Data" button
- Full export flow: `collectExportData` → `createExportZip` → `saveExportZip`
- Toast loading notifications at each stage (preparing, creating ZIP, opening dialog)
- Success toast shows save path and photo count / skipped notes
- Error handling for permission denied, quota exceeded, and generic failures
- `viewStore.ts` extended: added `"settings"` to `ActiveView` union type
- `Sidebar.tsx`: settings nav click routes to `"settings"` view
- `JournalView.tsx`: renders `<SettingsView />` when `activeView === "settings"`

---

## Technical Decisions

### No @tauri-apps/plugin-dialog or plugin-fs
These Rust plugins are NOT installed in this project (`Cargo.toml` only has `tauri-plugin-opener` and `tauri-plugin-sql`). Adding them would require Rust compilation. Instead:

- **Save dialog**: `window.showSaveFilePicker` (Web File System Access API) — available in Tauri's embedded Chromium webview without any Rust changes
- **Read photo files**: `convertFileSrc()` from `@tauri-apps/api/core` converts local paths to `asset://` URLs, then `fetch()` reads them as ArrayBuffer — works without `plugin-fs`

### JSZip
Added `jszip@3.10.1` (already ships TypeScript types). Used in-memory ZIP creation with DEFLATE compression (level 6). The `@types/jszip` stub package was installed but is a no-op — JSZip includes its own types.

### Graceful 05-02 dependency
The `media_attachments` table is created by plan 05-02. Since 05-02 was executing in parallel, the query for attachments is wrapped in try/catch. If the table doesn't exist, `attachmentRows` defaults to `[]` and the export proceeds with entries only.

### SettingsView as deviation
Plan 05-04 required extending `SettingsView.tsx` from plan 05-03, but 05-03 had not committed by the time this plan executed. Per Deviation Rule 3 (auto-fix blocking issues), `SettingsView.tsx` was created here with:
- The full Data/Export section (this plan's scope)
- A placeholder Appearance section (stub for 05-03 to flesh out)

When 05-03 commits, it will need to either merge with this file or replace the placeholder sections.

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Created SettingsView since 05-03 dependency had not committed**
- **Found during:** Task 4.4
- **Issue:** `SettingsView.tsx` referenced in plan did not exist (05-03 parallel plan had not committed yet)
- **Fix:** Created `SettingsView.tsx` with export functionality + placeholder appearance section
- **Files modified:** `src/components/SettingsView.tsx` (new)

**2. [Rule 1 - Bug] Used Web File System Access API instead of @tauri-apps/plugin-dialog**
- **Found during:** Task 4.3
- **Issue:** `@tauri-apps/plugin-dialog` and `@tauri-apps/plugin-fs` are not installed; adding them requires Rust plugin setup and `Cargo.toml` changes
- **Fix:** Used `showSaveFilePicker` (browser API available in Tauri's Chromium webview) for save dialog; used `convertFileSrc` + `fetch` for reading photos
- **Files modified:** `src/hooks/useExportFile.ts`, `src/utils/zipUtils.ts`

**3. [Rule 3 - Blocking] Extended viewStore with "settings" ActiveView**
- **Found during:** Task 4.4
- **Issue:** `ActiveView` type in `viewStore.ts` did not include `"settings"`, blocking navigation
- **Fix:** Added `"settings"` to `ActiveView` union type, wired Sidebar nav handler and JournalView router
- **Files modified:** `src/stores/viewStore.ts`, `src/components/Sidebar.tsx`, `src/components/JournalView.tsx`

---

## Known Stubs

| File | Location | Reason |
|------|----------|--------|
| `src/components/SettingsView.tsx` | Appearance section | 05-03 will flesh out theme/font size UI; placeholder shows "coming in next update" message |

---

## Commits

| Task | File | Commit |
|------|------|--------|
| 4.1 Data Collection | `src/hooks/useDataExport.ts`, `package.json` | `0ef1b6f` |
| 4.2 ZIP Creation | `src/utils/zipUtils.ts` | `11f06f8` |
| 4.3 File Dialog | `src/hooks/useExportFile.ts` | `20b5e19` |
| 4.4 Settings UI + nav wiring | `src/components/SettingsView.tsx`, `src/stores/viewStore.ts`, `src/components/Sidebar.tsx`, `src/components/JournalView.tsx` | (uncommitted — sandbox blocked git write ops) |

### Note on Task 4.4 Uncommitted Files

The sandbox policy changed mid-session and blocked `git add` / `git commit` operations after the first three tasks were committed. The Task 4.4 files are fully written and present on disk:
- `src/components/SettingsView.tsx` (new, untracked)
- `src/components/JournalView.tsx` (modified)
- `src/components/Sidebar.tsx` (modified)
- `src/stores/viewStore.ts` (modified)

These will be picked up by the next git operation (either orchestrator cleanup or manual `git add . && git commit`).

---

## Self-Check: PARTIAL

**Files created/modified:**
- [x] `src/hooks/useDataExport.ts` — exists
- [x] `src/utils/zipUtils.ts` — exists
- [x] `src/hooks/useExportFile.ts` — exists
- [x] `src/components/SettingsView.tsx` — exists (untracked)

**Commits (first 3 tasks):**
- [x] `0ef1b6f` — Task 4.1 committed
- [x] `11f06f8` — Task 4.2 committed
- [x] `20b5e19` — Task 4.3 committed

**Task 4.4 files:**
- [x] Written to disk
- [ ] Not committed (sandbox blocked git write ops after task 4.3)

---

## Requirements Addressed

| Req | Title | Status |
|-----|-------|--------|
| SETT-03 | User can export all journal data to a JSON file | Implemented (in ZIP with photos) |
