---
phase: 5
plan: 1
subsystem: security
tags: [pin, app-lock, idle-timeout, crypto, auth]
dependency_graph:
  requires: [01-01, 01-02]  # foundation DB schema + uiStore
  provides: [app-lock, pin-auth, idle-timeout]
  affects: [App.tsx, uiStore]
tech_stack:
  added: [Web Crypto API (PBKDF2-SHA256), useIdleTimeout hook]
  patterns: [PBKDF2 key derivation, constant-time comparison, idle polling]
key_files:
  created:
    - src/lib/pinCrypto.ts
    - src/components/PinSetupScreen.tsx
    - src/components/PinEntryScreen.tsx
    - src/hooks/useIdleTimeout.ts
  modified:
    - src/lib/db.ts
    - src/App.tsx
    - src/stores/uiStore.ts
decisions:
  - "Used PBKDF2-SHA256 (Web Crypto API) instead of argon2-browser — no npm dependency needed, built into Tauri WebView, 310k iterations per OWASP 2023"
  - "PIN state detection guarded with isPinSet=null check to prevent flash of content"
  - "Unlocking resets lastActivityTime to avoid immediate re-lock"
  - "setAppLock uses ON CONFLICT DO UPDATE for idempotent upsert"
metrics:
  duration_minutes: 25
  completed_date: "2026-04-13"
  tasks_completed: 5
  files_changed: 7
---

# Phase 5 Plan 1: PIN Security & App Lock Summary

**One-liner:** PBKDF2-SHA256 PIN-based app lock with auto-lock idle timeout using Web Crypto API — no external dependencies.

---

## What Was Built

Full PIN-based security layer for Chronicle AI:

1. **Database schema** — `app_lock` table stores PIN hash + salt, indexed by `id='1'` singleton row. Helper functions `getAppLock`, `setAppLock`, `clearAppLock` exported from `db.ts`.

2. **PIN crypto utilities** (`pinCrypto.ts`) — `generateSalt()` generates 32-byte random salt; `hashPin()` derives 256-bit key via PBKDF2-SHA256 (310k iterations); `verifyPin()` uses constant-time string comparison to prevent timing attacks. All runs locally in the Tauri WebView sandbox.

3. **PinSetupScreen** — Full-screen numeric keypad (4-6 digits), two-step enter/confirm flow, masked dot feedback, auto-submits on max digits, manual submit button for 4/5-digit PINs. Calls `hashPin` + `setAppLock` on confirm.

4. **PinEntryScreen** — Unlock screen with same keypad UX, keyboard support (digit keys + Backspace + Enter), `verifyPin` against DB hash, error message on failure with attempt count displayed after 3 misses. Unlocks app on correct PIN.

5. **useIdleTimeout hook** — Attaches at App root, polls every 1s, locks app after `idleTimeout` minutes of inactivity. Activity events (keydown, mousemove, click) reset the timer. No-op when `idleTimeout === 'never'` or app is already locked.

6. **App.tsx integration** — Six-state render waterfall: loading → DB error → PIN state detection → PIN setup → PIN entry → normal app. `isPinSet === null` state prevents content flash during PIN detection. `setLastActivityTime()` called on unlock/setup-complete to reset idle timer.

---

## Requirements Addressed

| Req | Title | Status |
|-----|-------|--------|
| SEC-01 | User can set a PIN to lock the app | Complete |
| SEC-02 | Locked app requires PIN entry before content visible | Complete |
| SEC-03 | App auto-locks after configurable idle period | Complete |

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Used Web Crypto API instead of argon2-browser**

- **Found during:** Task 1.2 (PinSetupScreen)
- **Issue:** `argon2-browser` is not in `package.json` and is not installed. Attempting to import it would cause a build failure.
- **Fix:** Used `crypto.subtle.deriveBits` (PBKDF2-SHA256, 310k iterations) — natively available in Chromium/WebKit used by Tauri with zero dependencies. Security profile is equivalent: PBKDF2-SHA256 at 310k iterations is the current OWASP recommendation.
- **Files modified:** `src/lib/pinCrypto.ts` (new file using Web Crypto API)
- **Commit:** ba50aea

**2. [Rule 2 - Missing] Added isPinSet null guard in App.tsx**

- **Found during:** Task 1.5 (App integration)
- **Issue:** Without a guard, the app would briefly flash content between DB-ready and PIN-check-complete states.
- **Fix:** Added `isPinSet: boolean | null` state — renders a spinner while `null`, preventing content flash.
- **Files modified:** `src/App.tsx`
- **Commit:** a84f971

**3. [Rule 2 - Missing] Added clearAppLock helper**

- **Found during:** Task 1.1 (DB schema)
- **Issue:** Plan only specified `setAppLock`; future settings plan (05-03) will need to disable PIN. Without this helper it would be a blocking gap.
- **Fix:** Added `clearAppLock()` to `db.ts` alongside the other helpers.
- **Files modified:** `src/lib/db.ts`
- **Commit:** 96efbe2

---

## Known Stubs

None — all PIN flows are fully wired with real PBKDF2 hashing, DB persistence, and idle timer.

---

## Commits

| Hash | Description |
|------|-------------|
| 96efbe2 | feat(05-01): add app_lock table schema and DB helper functions |
| ba50aea | feat(05-01): add PinSetupScreen, PinEntryScreen, and pinCrypto utilities |
| 2376872 | feat(05-01): add useIdleTimeout hook and extend uiStore with lock/idle state |
| a84f971 | feat(05-01): integrate PIN screens into App shell |

---

## Self-Check: PASSED

All created files verified present. All commits verified in git log.
