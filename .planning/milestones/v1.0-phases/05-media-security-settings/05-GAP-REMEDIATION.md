# Phase 5: Gap Remediation Plan

**Status:** Critical gaps identified in UAT  
**Date:** 2026-04-14  
**Priority:** BLOCKING

---

## Overview

UAT verification found **2 critical gaps** in Phase 5 execution:

1. **05-01 (PIN Security)** — Documented as complete but NOT implemented
2. **05-04 (Data Export)** — Documented as complete but NOT implemented

This remediation plan outlines steps to close these gaps and achieve true Phase 5 completion.

---

## Gap #1: PIN Security (05-01)

### Current State
- **Documented:** ✅ Full plan, summary, verification docs exist
- **Implemented:** ❌ Zero code exists
- **Commits:** Referenced commits (96efbe2, ba50aea, etc.) do NOT exist in git log
- **Impact:** App has no security; users cannot protect their journal

### Requirements Not Met
- SEC-01: PIN setup on first launch
- SEC-02: PIN entry screen + lock/unlock
- SEC-03: Auto-lock after idle timeout

### Files to Create

**1. src/lib/pinCrypto.ts** — PIN hashing utilities
```typescript
export async function generateSalt(): Promise<string>
export async function hashPin(pin: string, salt: string): Promise<string>
export async function verifyPin(pin: string, hash: string, salt: string): Promise<boolean>
```

**2. src/components/PinSetupScreen.tsx** — First-launch PIN setup
```typescript
export function PinSetupScreen(props: {
  onComplete: (pin: string) => Promise<void>;
}): JSX.Element
```

**3. src/components/PinEntryScreen.tsx** — Unlock PIN entry
```typescript
export function PinEntryScreen(props: {
  onUnlock: () => void;
  attemptCount?: number;
}): JSX.Element
```

**4. src/hooks/useIdleTimeout.ts** — Idle activity tracker
```typescript
export function useIdleTimeout(): void
```

### Database Changes

Add `app_lock` table to `src/lib/db.ts`:
```sql
CREATE TABLE IF NOT EXISTS app_lock (
  id TEXT PRIMARY KEY DEFAULT '1',
  pin_hash TEXT NOT NULL,
  pin_salt TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
```

Add helper functions:
- `getAppLock()`
- `setAppLock(hash, salt)`
- `clearAppLock()`
- `verifyStoredPin(pin)`

### Store Changes

Extend `src/stores/uiStore.ts`:
- `isPinSet: boolean | null` — tri-state to prevent content flash
- `isLocked: boolean` — app lock state
- `lastActivityTime: number` — for idle tracking
- `idleTimeout: 1 | 5 | 15 | 30 | 'never'` — already exists
- Methods: `setLocked()`, `setLastActivityTime()`, `lock()`, `unlock()`

### App.tsx Integration

Update render logic to 6-state waterfall:
1. DB not ready → spinner
2. DB error → error message
3. PIN state unknown → spinner
4. PIN not set → PinSetupScreen
5. PIN set & locked → PinEntryScreen
6. PIN unlocked OR no PIN → JournalView

### Commit Structure
- **Commit 1:** DB schema + pinCrypto utilities
- **Commit 2:** PinSetupScreen + PinEntryScreen components
- **Commit 3:** useIdleTimeout hook + uiStore extensions
- **Commit 4:** App.tsx integration + PIN state detection

---

## Gap #2: Data Export (05-04)

### Current State
- **Documented:** ✅ Full plan, summary, verification docs exist
- **Implemented:** ❌ Zero code exists
- **Dependencies:** jszip not installed
- **Impact:** Users cannot backup their journal data

### Requirements Not Met
- SETT-03: Export all entries + photos to ZIP

### Dependencies to Install

```bash
npm install jszip@3.10.1
```

### Files to Create

**1. src/hooks/useDataExport.ts** — Data collection
```typescript
export interface ExportData {
  timestamp: string;
  version: string;
  entries: Entry[];
  tags: Tag[];
  photos: PhotoExport[];
  settings: { theme: string; fontSize: string };
}

export function useDataExport(): {
  collect: () => Promise<ExportData>;
}
```

**2. src/utils/zipUtils.ts** — ZIP creation
```typescript
export function createExportZip(data: ExportData): Promise<{
  blob: Blob;
  includedPhotos: number;
  skippedPhotos: number;
}>
```

**3. src/hooks/useExportFile.ts** — File dialog + write
```typescript
export function useExportFile(): {
  save: (blob: Blob, defaultName: string) => Promise<string | null>;
}
```

### SettingsView Integration

Replace the placeholder Export Data button:
```typescript
const handleExport = async () => {
  try {
    toast.loading('Preparing export...');
    const data = await collectData();
    const zip = await createZip(data);
    const path = await saveFile(zip);
    toast.success(`Exported to ${path}`);
  } catch (err) {
    toast.error('Export failed: ' + err.message);
  }
};
```

### Commit Structure
- **Commit 1:** Install jszip, create useDataExport hook
- **Commit 2:** Create zipUtils and photo reading logic
- **Commit 3:** Create useExportFile for file dialog/write
- **Commit 4:** Wire export button into SettingsView + test

---

## Execution Plan

### Phase 5 Execution Order

```
↓
05-02: Photo Attachments (DONE ✅)
↓
05-03: Settings View (DONE ✅ — but stub Change PIN + Export)
↓
[NEW] 05-01 Redux: PIN Security (BLOCKING)
├─ DB schema + pinCrypto
├─ PIN screens
├─ useIdleTimeout hook
├─ App.tsx integration
└─ Verify all 3 SEC requirements
↓
[NEW] 05-04 Redux: Data Export (BLOCKING)
├─ Install jszip
├─ useDataExport hook
├─ zipUtils + file reading
├─ useExportFile for dialog
├─ Wire into SettingsView
└─ Verify SETT-03 requirement
↓
Update SettingsView to remove stubs
↓
Run Full UAT (05-UAT.md)
↓
Phase 5 Sign-Off
```

---

## Validation Checkpoints

After implementing Gap #1 (PIN):
- [ ] PinSetupScreen renders on fresh DB
- [ ] PIN hashing uses PBKDF2-SHA256 (310k iterations)
- [ ] PinEntryScreen blocks content until unlocked
- [ ] Idle timeout actually locks app
- [ ] Correct PIN unlocks app
- [ ] Multiple failed PINs show error (no lockout)
- [ ] SEC-01, SEC-02, SEC-03 all pass UAT

After implementing Gap #2 (Export):
- [ ] Export button visible in Settings
- [ ] File dialog opens on click
- [ ] ZIP created with metadata.json + photos/
- [ ] metadata.json contains all entries/tags/photos
- [ ] Photos readable after extract
- [ ] Works with 100+ entries
- [ ] SETT-03 passes UAT

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| PIN conflicts with idle timeout | Idle timeout only activates when PIN is enabled |
| Photo export data URIs too large | Only includes thumbnails + full images (not both) |
| Export blocks UI | Async ZIP generation with progress toasts |
| Forgetting PIN | Document "reinstall to reset" in help |

---

## Time Estimate

- **Gap #1 (PIN Security):** ~45-60 minutes
- **Gap #2 (Data Export):** ~30-45 minutes
- **Testing + UAT:** ~30 minutes
- **Total:** ~2-2.5 hours

---

## Success Criteria

Phase 5 is complete when:
✅ All 11 requirements fully implemented  
✅ All UAT tests pass (05-UAT.md)  
✅ No blocking issues remain  
✅ Documentation reflects reality (git matches plans)  

---

*Gap Remediation Plan*  
*Phase 5 — Media, Security & Settings*  
*Status: Ready for execution*
