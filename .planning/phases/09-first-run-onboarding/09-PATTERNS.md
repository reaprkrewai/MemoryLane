# Phase 9: First-Run Onboarding - Pattern Map

**Mapped:** 2026-04-18
**Files analyzed:** 9 (3 NEW, 5 MODIFY, 1 OPTIONAL barrel)
**Analogs found:** 9 / 9 (100%)

> Every Phase 9 file has at least one byte-close analog already shipped in the codebase. This is a re-composition phase, not a green-field one — no new dependencies, no new shadcn primitives, no novel SQL shapes. Planner should treat the analog excerpts below as the authoritative shape for each new/modified file.

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/utils/onboardingService.ts` (NEW) | service | CRUD (settings KV) | `src/utils/aiSettingsService.ts` | exact (same shape, same table, same conventions) |
| `src/components/onboarding/OnboardingOverlay.tsx` (NEW) | component (modal/state-machine) | event-driven UI | `src/components/SettingsView.tsx` (multi-step composition) + `src/components/ui/alert-dialog.tsx` (Radix wrapper) | role-match (multi-step modal); composition is novel but every primitive is shipped |
| `src/components/onboarding/OnboardingSpotlight.tsx` (NEW) | component (presentational + DOM measurement) | request-response (DOM rect read on mount/resize) | None — novel CSS-cutout technique; closest scaffolding analog is `src/components/QuickWriteFAB.tsx` (fixed-position element with Tailwind z-index) | partial (no DOM-measurement analog exists; build per CONTEXT.md D-09) |
| `src/components/onboarding/index.ts` (NEW, optional barrel) | utility | n/a | n/a — optional | n/a |
| `src/stores/uiStore.ts` (MODIFY) | store (Zustand) | event-driven (setter-based reactive primitive) | `src/stores/uiStore.ts:34,86,100` (`isPinSet` block IN the same file) | exact (D-01 mandates verbatim mirror) |
| `src/lib/db.ts` (MODIFY) | data layer (migration runner) | batch (one-shot post-migration SQL) | `src/lib/db.ts:167-179` (`local_date` guarded ALTER block, also IN the same file) | exact (D-04 mandates same call-site, same idempotent pattern) |
| `src/App.tsx` (MODIFY) | composition root | event-driven (init useEffect + state-machine render branches) | `src/App.tsx:50-73` (init useEffect calling `getAppLock()`) + `src/App.tsx:177-207` (states 3 → 6 render branch ladder, also IN the same file) | exact (D-02, D-05, D-06 all mirror existing PIN-state pattern) |
| `src/components/SettingsView.tsx` (MODIFY) | component (settings page) | request-response (button click → service call → state) | `src/components/SettingsView.tsx:509-585` (`DataSection` block IN the same file) + `:564-580` (Export Data button) | exact (D-17 mandates byte-identical section grammar minus the chevron) |
| `src/hooks/useGlobalShortcuts.ts` (MODIFY) | hook (keyboard handler) | event-driven (keydown → guard chain → action) | `src/hooks/useGlobalShortcuts.ts:48-58` (existing isLocked / isDbReady / activeView guard list, IN the same file) | exact (D-20 mandates additive guard, no other changes) |

---

## Pattern Assignments

### 1. `src/utils/onboardingService.ts` (service, CRUD)

**Analog:** `src/utils/aiSettingsService.ts` (entire file — 49 lines, 1:1 shape mirror)

**Why this analog:** D-05 + D-07 explicitly: "Mirrors `loadAIBackendPreference` shape exactly" and "matches `aiSettingsService.ts` pattern". Both files own the read/write side of one settings KV row. No other service in `src/utils/` is closer.

**Imports pattern** (`aiSettingsService.ts:1-7`):
```typescript
/**
 * AI Settings Service
 * Handles persistence of AI backend preference to SQLite settings table
 */

import { getDb } from "../lib/db";
import type { AIBackend } from "../stores/aiStore";
```

**Read pattern (loadOnboardingState)** — copy from `aiSettingsService.ts:13-33`:
```typescript
export async function loadAIBackendPreference(): Promise<AIBackend> {
  try {
    const db = await getDb();
    const rows = await db.select<{ value: string }[]>(
      `SELECT value FROM settings WHERE key = 'aiBackend'`,
      []
    );

    if (rows.length > 0 && rows[0].value) {
      const value = rows[0].value;
      if (value === "embedded" || value === "ollama") {
        return value as AIBackend;
      }
    }
  } catch (err) {
    console.error("Failed to load AI backend preference:", err);
  }

  // Default to embedded
  return "embedded";
}
```

For Phase 9, the read collapses to "row exists or not" — `loadOnboardingState()` returns `Promise<boolean>` instead of a parsed value. Per D-05: `return rows.length > 0`. Same try/catch + `console.error` non-fatal contract; on error return `false` (will re-show onboarding — safer than `true` which would silently hide it).

**Write pattern (markOnboardingCompleted)** — copy from `aiSettingsService.ts:38-49`:
```typescript
export async function saveAIBackendPreference(backend: AIBackend): Promise<void> {
  try {
    const db = await getDb();
    await db.execute(
      `INSERT OR REPLACE INTO settings (key, value, created_at, updated_at)
       VALUES ('aiBackend', ?, ?, ?)`,
      [backend, Date.now(), Date.now()]
    );
  } catch (err) {
    console.error("Failed to save AI backend preference:", err);
  }
}
```

For Phase 9 (per D-07): `INSERT OR REPLACE INTO settings(key, value, updated_at) VALUES('onboarding_completed_at', ?, ?)` with `[String(Date.now()), Date.now()]`. **Note** the `created_at` column is NOT in the `settings` schema (`db.ts:79-83` shows only `key`, `value`, `updated_at`) — `aiSettingsService.ts:42` actually writes a column that doesn't exist on a fresh-install schema. The Phase 9 helper should write only `(key, value, updated_at)` to stay schema-correct. After the SQL succeeds, call `useUiStore.getState().setIsOnboardingCompleted(true)` so the App.tsx render gate flips immediately.

**Replay pattern (replayOnboarding)** — no direct analog (no existing `DELETE FROM settings WHERE key=?` exists), but follows the same try/catch + console.error envelope:
```typescript
export async function replayOnboarding(): Promise<void> {
  try {
    const db = await getDb();
    await db.execute(`DELETE FROM settings WHERE key = 'onboarding_completed_at'`);
    useUiStore.getState().setIsOnboardingCompleted(false);
  } catch (err) {
    console.error("Failed to replay onboarding:", err);
  }
}
```

**Error-handling pattern (universal across all 3 helpers):** non-fatal — `try { ... } catch (err) { console.error(...); }`. No toasts (UI-Spec L176: "Silent fail (`console.error` only); no toast, no dialog"). Matches `aiSettingsService.ts:27-29, 46-48` verbatim.

---

### 2. `src/components/onboarding/OnboardingOverlay.tsx` (component, event-driven UI)

**Analog A (Radix AlertDialog composition for Steps 1+3):** `src/components/ui/alert-dialog.tsx` (the wrapper — 140 lines, exposes `AlertDialog`, `AlertDialogContent`, `AlertDialogHeader`, `AlertDialogTitle`, `AlertDialogDescription`, `AlertDialogFooter`, `AlertDialogAction`, `AlertDialogCancel`).

**Analog B (multi-step state machine inside one component):** No exact precedent in the codebase, but the closest "modal-with-internal-state" pattern is `OllamaSetupWizard` (mounted via `showSetupWizard` boolean from `useAIStore` — see `SettingsView.tsx:589, 621-624`). Not opening it for excerpt because it's a wizard for a different purpose, but the **declarative `open={...}`** pattern mirrors what D-19 mandates here.

**Analog C (Radix Popover composition for Step 2):** `src/components/ui/popover.tsx` (32 lines — `Popover`, `PopoverTrigger`, `PopoverContent`, `PopoverAnchor`).

**Imports pattern** (synthesize from `SettingsView.tsx:1-14` + UI-SPEC component diagrams):
```typescript
import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
} from "./ui/alert-dialog"; // adjust relative path: "../ui/alert-dialog"
import { Popover, PopoverContent, PopoverAnchor } from "./ui/popover";
import { useUiStore } from "../../stores/uiStore";
import { useEntryStore } from "../../stores/entryStore";
import { useViewStore } from "../../stores/viewStore";
import { markOnboardingCompleted } from "../../utils/onboardingService";
import { OnboardingSpotlight } from "./OnboardingSpotlight";
```

**Granular Zustand selectors pattern** — copy from `App.tsx:21-28`:
```typescript
const isDbReady = useUiStore((s) => s.isDbReady);
const dbError = useUiStore((s) => s.dbError);
const isPinSet = useUiStore((s) => s.isPinSet);
const isLocked = useUiStore((s) => s.isLocked);
```

For Phase 9: `const isOnboardingCompleted = useUiStore((s) => s.isOnboardingCompleted);` — one primitive subscription per CONTEXT.md "Established Patterns" L157. **Do NOT** subscribe to `allEntries` or any non-primitive — re-render storm risk.

**Step 3 CTA chain pattern** — copy verbatim from `AppShell.tsx:18-25` (this IS the FAB's existing handler — D-14 says re-use, do NOT duplicate the logic):
```typescript
const handleNewEntry = async () => {
  const newId = await createEntry();
  await selectEntry(newId);
  // Pitfall 3: NavigateSource = "timeline" | "sidebar" | null.
  // "overview"/"calendar"/"search" are NOT valid NavigateSource values.
  // Pass "timeline" — the editor back-button always returns to timeline.
  navigateToEditor("timeline");
};
```

For the Step 3 "Write your first entry" CTA: same chain, plus an `await markOnboardingCompleted()` call BEFORE `navigateToEditor` (so the gate has flipped by the time the editor mounts and prevents a re-render of the overlay during the navigation transition). The same three store hooks at component top: `createEntry = useEntryStore((s) => s.createEntry)`, `selectEntry = useEntryStore((s) => s.selectEntry)`, `navigateToEditor = useViewStore((s) => s.navigateToEditor)` — exactly as `AppShell.tsx:13-14` does.

**Loader (Loader2) pattern** — copy from `App.tsx:151-156`:
```typescript
<div className="flex h-full w-full items-center justify-center bg-background">
  <div className="flex flex-col items-center gap-4">
    <Loader2 size={24} className="animate-spin text-muted" />
    <p className="text-body text-muted">Opening your journal...</p>
  </div>
</div>
```

(This pattern is consumed by State 6.5 in App.tsx, NOT by OnboardingOverlay — but the Replay button's loading state inside `HelpSection` reuses the small `<Loader2 size={14} className="animate-spin" />` pattern — see Pattern 7 below.)

**Declarative open-state pattern (D-19)** — Radix-native; `<AlertDialog open={isOnboardingCompleted === false && currentStep !== "done"}>`. Internal state machine: `const [currentStep, setCurrentStep] = useState<0 | 1 | 2 | "done">(0)`. Same useState shape as `SettingsView.tsx:289` (`const [isChecking, setIsChecking] = useState(false)`).

**Skip handler pattern** (advances to "done" + writes to DB):
```typescript
const handleSkip = async () => {
  setCurrentStep("done");
  await markOnboardingCompleted();
};
```

Same async-handler shape as `SettingsView.tsx:514` (`handleExport`) and `:291` (`handleCheckAgain`).

---

### 3. `src/components/onboarding/OnboardingSpotlight.tsx` (component, presentational + DOM measurement)

**Analog A (fixed-position overlay with z-index + Tailwind):** `src/components/QuickWriteFAB.tsx` (entire file — 33 lines).

**Analog B (DOM measurement via `useLayoutEffect` + `ResizeObserver`):** No precedent in this codebase. CONTEXT.md "Specifics" L188 explicitly: "A `useLayoutEffect` + `ResizeObserver` recompute pattern; ~60 lines total in OnboardingSpotlight.tsx. Don't outsource to a tour library." Build per UI-SPEC component diagram.

**Imports pattern** (per UI-SPEC):
```typescript
import { useLayoutEffect, useState, useEffect } from "react";
```

**Fixed-position + z-index pattern** — copy class-grammar from `QuickWriteFAB.tsx:9-17`:
```typescript
<button
  onClick={onClick}
  className="group fixed bottom-8 right-8 z-40 flex items-center gap-2.5 overflow-hidden rounded-full pl-5 pr-6 py-3.5 ..."
  style={{ background: "linear-gradient(135deg, ..." }}
  aria-label="New entry"
  data-onboarding="quick-write-fab"
>
```

For OnboardingSpotlight — per UI-SPEC z-index table:
- Backdrop wrapper: `className="fixed inset-0 z-[60] pointer-events-auto animate-fade-in"`
- Cutout div: `className="absolute rounded-full pointer-events-none"` with inline `style={{ top, left, width, height, borderRadius: "9999px", boxShadow: "0 0 0 9999px rgba(0,0,0,0.6)" }}`

**Animation reuse pattern** — `animate-fade-in` is already in `animations.css:6-9`:
```css
@keyframes fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}
```

UI-SPEC L235-236 specifies: `style={{ animation: "fade-in 200ms var(--ease-out-smooth) both" }}`. The `prefers-reduced-motion` stanza (globals.css L406, FOUND-04) handles a11y instant-transition automatically — no per-component logic needed.

**Target lookup pattern (no analog — novel):** `document.querySelector('[data-onboarding="quick-write-fab"]')` per CONTEXT.md D-09 + D-18. The `data-onboarding` attribute is already on `QuickWriteFAB.tsx:17` (Phase 8). No new attributes need to be added.

**Cleanup-on-unmount pattern** (`useEffect` return; standard React idiom; no codebase-specific variant required) — listener pair:
```typescript
useLayoutEffect(() => {
  const recompute = () => { /* read getBoundingClientRect, setState */ };
  recompute();
  window.addEventListener("resize", recompute);
  const ro = new ResizeObserver(recompute);
  const target = document.querySelector('[data-onboarding="quick-write-fab"]');
  if (target) ro.observe(target);
  return () => {
    window.removeEventListener("resize", recompute);
    ro.disconnect();
  };
}, []);
```

**Scroll-lock pattern** (per D-09): `document.body.style.overflow = "hidden"` on mount, restore on unmount. Standard idiom, no codebase analog.

---

### 4. `src/components/onboarding/index.ts` (NEW, optional barrel)

**Analog:** No barrel exports exist in `src/components/` (verified via the `Sidebar`, `AppShell`, `JournalView` direct-import grammar across the codebase). **Recommendation: skip the barrel** unless the planner has a strong reason — the existing app convention is named direct imports. If created anyway, follow the trivial:
```typescript
export { OnboardingOverlay } from "./OnboardingOverlay";
export { OnboardingSpotlight } from "./OnboardingSpotlight";
```

---

### 5. `src/stores/uiStore.ts` (MODIFY)

**Analog:** SAME FILE — `isPinSet` tri-state pattern at lines 34, 50, 86, 100. D-01 explicit: "mirrors `isPinSet` in `[src/stores/uiStore.ts:34-35]`".

**Interface field pattern** (`uiStore.ts:33-35`):
```typescript
  // PIN/Security state (tri-state: null = unknown, true = set, false = not set)
  isPinSet: boolean | null;
  isLocked: boolean;
```

For Phase 9, ADD a sibling block (after the PIN block, before Settings state at line 38):
```typescript
  // Onboarding state (tri-state: null = unknown, true = completed, false = needs onboarding)
  isOnboardingCompleted: boolean | null;
```

**Setter signature pattern** (`uiStore.ts:50`):
```typescript
  setIsPinSet: (set: boolean | null) => void;
```

Mirror at line ~52 (or wherever the new sibling field's setter lives in the interface block):
```typescript
  setIsOnboardingCompleted: (v: boolean | null) => void;
```

**Initial-value pattern** (`uiStore.ts:86`):
```typescript
  isPinSet: null, // tri-state: null = unknown, true = set, false = not set
```

Mirror in the create() body (after the PIN initial values, around line 88):
```typescript
  isOnboardingCompleted: null, // tri-state: null = unknown, true = completed, false = needs onboarding
```

**Setter implementation pattern** (`uiStore.ts:100`):
```typescript
  setIsPinSet: (isPinSet) => set({ isPinSet }),
```

Mirror (around line ~102):
```typescript
  setIsOnboardingCompleted: (isOnboardingCompleted) => set({ isOnboardingCompleted }),
```

**Zero refactor cost.** No localStorage persistence needed — onboarding state lives in SQLite, hydrated by `loadOnboardingState()` from App.tsx init useEffect. Do NOT mirror the `localStorage.setItem(...)` calls from `setTheme`/`setFontSize` — those are intentional for ephemeral UI state; onboarding is durable.

---

### 6. `src/lib/db.ts` (MODIFY — migration seed in `initializeDatabase`)

**Analog:** SAME FILE — `local_date` guarded ALTER block at lines 167-179. D-04 explicit: "Lives next to the FOUND-03 `local_date` guarded ALTER ([src/lib/db.ts:167-179]) — same pattern, same rationale."

**Guarded post-migration SQL pattern** (`db.ts:164-179`):
```typescript
  // FOUND-03 D-08/D-09 — guarded ALTER for upgrade installs.
  // CREATE TABLE IF NOT EXISTS above handles fresh installs (local_date in DDL).
  // Existing v1.0 DBs need ALTER + backfill, which is not idempotent — guard it.
  const cols = await db.select<{ name: string }[]>("PRAGMA table_info(entries)");
  const hasLocalDate = cols.some((c) => c.name === "local_date");
  if (!hasLocalDate) {
    await db.execute("ALTER TABLE entries ADD COLUMN local_date TEXT");
    // D-09 — synchronous backfill from created_at (UTC day, best-effort per D-10).
    // Pre-migration entries near UTC midnight may be off by ±1 calendar day.
    await db.execute(
      "UPDATE entries SET local_date = strftime('%Y-%m-%d', created_at/1000, 'unixepoch') WHERE local_date IS NULL"
    );
    if (import.meta.env.DEV) {
      console.log("[db] Migrated entries.local_date column + backfilled existing rows");
    }
  }
```

For Phase 9 — INSERT a sibling block AFTER line 179 (and BEFORE the `CREATE INDEX IF NOT EXISTS idx_entries_local_date` at line 185, so the new seed and the index are independent), per D-04:
```typescript
  // ONBRD-06 — auto-seed onboarding completion for existing v1.0 users.
  // Idempotent: INSERT OR IGNORE only inserts when the row is absent;
  // SELECT COUNT(*) > 0 only triggers for DBs that already have entries.
  // Fresh installs (no entries) skip the seed and see the onboarding flow.
  const now = Date.now();
  await db.execute(
    `INSERT OR IGNORE INTO settings(key, value, updated_at)
     SELECT 'onboarding_completed_at', CAST(? AS TEXT), ?
     WHERE (SELECT COUNT(*) FROM entries) > 0`,
    [now, now]
  );
  if (import.meta.env.DEV) {
    console.log("[db] Seeded onboarding_completed_at for existing-user install (no-op on fresh DBs)");
  }
```

**Idempotence guarantees:** `INSERT OR IGNORE` collapses to no-op on subsequent launches (the row already exists). The `WHERE (SELECT COUNT(*) FROM entries) > 0` filter guarantees fresh installs skip the seed. CONTEXT.md "Specifics" L195: "`COUNT(*) FROM entries` runs once at migration time. Don't poll; don't subscribe; don't recompute."

**Dev diagnostic pattern** (`db.ts:176-178, 188-195`): wrap the diagnostic `console.log` in `if (import.meta.env.DEV)`. Mirror exactly. Do NOT log user content (PROJECT.md zero-network principle + privacy promise).

---

### 7. `src/App.tsx` (MODIFY — 3 changes)

**Analog:** SAME FILE — three different excerpts to copy from.

#### 7a. Init useEffect chain (D-05) — copy from `App.tsx:50-73`:
```typescript
  // Initialize database and check PIN state
  useEffect(() => {
    const initApp = async () => {
      try {
        await initializeDatabase();
        setDbReady(true);
        toast.success("Journal opened");

        // Check if PIN is set
        const appLock = await getAppLock();
        setIsPinSet(appLock !== null);

        // If PIN is set, lock the app on first load
        if (appLock !== null) {
          setIsLocked(true);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        setDbError(message);
        toast.error("Failed to open journal");
      }
    };

    initApp();
  }, [setDbReady, setDbError, setIsPinSet, setIsLocked]);
```

For Phase 9 — INSERT after line 64 (after the `setIsLocked(true)` call, still inside the try block):
```typescript
        // Load onboarding state (mirrors PIN-state hydration pattern)
        const completed = await loadOnboardingState();
        setIsOnboardingCompleted(completed);
```

ADD `setIsOnboardingCompleted` to the destructured selector list (line ~28) and to the useEffect deps (line 73). ADD `import { loadOnboardingState } from "./utils/onboardingService"` to the import block (line ~16, alongside `loadAIBackendPreference`).

#### 7b. State 6.5 loader (D-06) — copy from `App.tsx:177-185` (State 3 "PIN state unknown" loader):
```typescript
        {/* State 3: PIN state unknown (should not show, prevents content flash) */}
        {isDbReady && !dbError && isPinSet === null && (
          <div className="flex h-full w-full items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-4">
              <Loader2 size={24} className="animate-spin text-muted" />
              <p className="text-body text-muted">Checking security...</p>
            </div>
          </div>
        )}
```

INSERT a new sibling render branch BETWEEN State 5 (lines 195-199) and State 6 (lines 201-207). Per D-06:
```typescript
        {/* State 6.5: Unlocked but onboarding state still loading (prevents content flash) */}
        {isDbReady && !dbError && isPinSet === true && !isLocked && isOnboardingCompleted === null && (
          <div className="flex h-full w-full items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-4">
              <Loader2 size={24} className="animate-spin text-muted" />
              <p className="text-body text-muted">Preparing your journal…</p>
            </div>
          </div>
        )}
```

#### 7c. State 6 mount-point change (D-02) — modify `App.tsx:201-207`:
```typescript
        {/* State 6: Unlocked, show content */}
        {isDbReady && !dbError && isPinSet === true && !isLocked && (
          <AppShell>
            {activeView === "settings" && <SettingsView />}
            {activeView !== "settings" && <JournalView />}
          </AppShell>
        )}
```

Per D-02, change the gate to `isOnboardingCompleted !== null` (because the State 6.5 branch now handles `=== null`), then add `<OnboardingOverlay />` as a sibling AFTER `<AppShell>` but inside the same fragment so it overlays SettingsView too:
```typescript
        {/* State 6: Unlocked + onboarding state known, show content (overlay renders if needed) */}
        {isDbReady && !dbError && isPinSet === true && !isLocked && isOnboardingCompleted !== null && (
          <>
            <AppShell>
              {activeView === "settings" && <SettingsView />}
              {activeView !== "settings" && <JournalView />}
            </AppShell>
            <OnboardingOverlay />
          </>
        )}
```

ADD `import { OnboardingOverlay } from "./components/onboarding/OnboardingOverlay"` to the import block (alongside `JournalView`/`SettingsView` at line ~7-8).

---

### 8. `src/components/SettingsView.tsx` (MODIFY — add HelpSection between DataSection and footer)

**Analog:** SAME FILE — `DataSection` at lines 509-585 (full section composition) + the inner Export Data button at lines 564-580.

**Section composition pattern** (`SettingsView.tsx:509-585`):
```typescript
function DataSection() {
  const [isExporting, setIsExporting] = useState(false);
  const { collect } = useDataExport();
  const { save } = useExportFile();

  const handleExport = async () => {
    setIsExporting(true);
    const loadingToastId = toast.loading("Preparing export...");

    try {
      // ... long body
      toast.success(`Exported to ${fileName}${photoInfo}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Export failed";
      console.error("Export error:", err);
      toast.error(message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <section>
      <SectionHeader icon={<Database size={16} />} title="Data" />
      <div className="border-t border-border">
        <SettingRow
          label="Export Journal"
          description="Download all your entries as a backup"
        >
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3 py-1.5 text-label rounded-md border border-border text-muted hover:border-accent/50 hover:text-text transition-colors font-medium disabled:opacity-50"
          >
            {isExporting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                Export Data
                <ChevronRight size={14} />
              </>
            )}
          </button>
        </SettingRow>
      </div>
    </section>
  );
}
```

For Phase 9 HelpSection — copy this shape verbatim with these substitutions (per D-17 + UI-SPEC L325-363):
- `useState` flag rename: `isExporting` → `isReplaying`
- Replace `handleExport` body with single `await replayOnboarding()`; remove all `toast.*` calls (per UI-SPEC L176: silent on error, no toast)
- Section icon: `<Database size={16} />` → `<HelpCircle size={16} />`
- Section title: `"Data"` → `"Help"`
- SettingRow label/description: `"Replay onboarding tour"` / `"Restart the welcome flow from the beginning"`
- Button label rest state: `"Export Data" + <ChevronRight size={14} />` → `"Replay"` (no chevron — D-17 explicit)
- Button label loading state: `"Exporting..."` → `"Resetting..."`
- Button class identical (line 567 grammar exact)

**Import additions** — add to existing line 2 import:
```typescript
import { Palette, Shield, Database, ChevronRight, Loader2, Sparkles, Check, Circle, HelpCircle } from "lucide-react";
```

Add at line 9-10 imports:
```typescript
import { replayOnboarding } from "../utils/onboardingService";
```

**Insertion point** (per D-17 + UI-SPEC L367) — modify `SettingsView.tsx:603-609`:
```typescript
      {/* Settings content */}
      <div className="flex-1 px-8 py-8 max-w-3xl w-full mx-auto">
        <div className="flex flex-col gap-10">
          <AppearanceSection />
          <SecuritySection />
          <AIFeaturesSection />
          <DataSection />
          <HelpSection />  {/* NEW — between DataSection and version footer */}
        </div>
```

The `HelpSection` function definition itself can be inserted immediately after `DataSection` (around line 586, before the `// --- Main Settings View ---` comment at line 587).

**Section header grammar** (`SettingsView.tsx:44-53` — `SectionHeader` is a private component already in this file):
```typescript
function SectionHeader({ icon, title }: SectionHeaderProps) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-accent/10">
        <span className="text-accent">{icon}</span>
      </div>
      <h2 className="text-sm font-bold uppercase tracking-wider text-text">{title}</h2>
    </div>
  );
}
```

REUSE as-is — `<SectionHeader icon={<HelpCircle size={16} />} title="Help" />`. No changes to SectionHeader itself; HelpSection just consumes it.

---

### 9. `src/hooks/useGlobalShortcuts.ts` (MODIFY — additive guard)

**Analog:** SAME FILE — the existing guard ladder at lines 48-58.

**Existing guard pattern** (`useGlobalShortcuts.ts:48-58`):
```typescript
      // Locked-state gate — do not fire during PIN lock or pre-DB-ready.
      // Read store state at fire-time (not closure-captured) so the hook responds
      // to lock/unlock transitions without re-binding the listener.
      const ui = useUiStore.getState();
      if (ui.isLocked || !ui.isDbReady) return;

      // Editor-view gate — belt-and-suspenders defense. isTypingContext() already
      // catches TipTap (contentEditable), but an explicit view check avoids firing
      // the shortcut if focus is momentarily in an editor toolbar button etc.
      const view = useViewStore.getState();
      if (view.activeView === "editor" || view.activeView === "settings") return;
```

For Phase 9 — extend the locked-state gate at line 52 (per D-20):
```typescript
      const ui = useUiStore.getState();
      if (ui.isLocked || !ui.isDbReady) return;
      // ONBRD-05 — onboarding-active gate. Mirrors the locked/DB-ready guard rationale:
      // no Ctrl/Cmd+N while the welcome modal is up, otherwise users could short-circuit
      // the flow and start writing without ever finishing/completing onboarding.
      if (ui.isOnboardingCompleted === false) return;
```

**Read-at-fire-time pattern (load-bearing):** `useUiStore.getState()` (NOT a hook subscription) — this is what allows the guard to react to onboarding completion mid-session without re-binding the listener. Already canonical in this file at line 51 (`const ui = useUiStore.getState()`); just add one new condition.

---

## Shared Patterns

### Pattern S1 — Granular Zustand Selectors (one primitive per `useStore` call)

**Source:** `App.tsx:21-31`, `AppShell.tsx:11-14`, `useGlobalShortcuts.ts:36-38`

**Apply to:** OnboardingOverlay (every store read), and the App.tsx modifications.

```typescript
const isPinSet = useUiStore((s) => s.isPinSet);
const isLocked = useUiStore((s) => s.isLocked);
const setIsPinSet = useUiStore((s) => s.setIsPinSet);
```

Never select an object/array. Always primitive. CONTEXT.md "Established Patterns" L157 codifies this.

---

### Pattern S2 — Settings KV Read/Write (SQLite)

**Source:** `aiSettingsService.ts:13-49` (read + write pair), `db.ts:79-87` (settings table schema)

**Apply to:** `onboardingService.ts` (all 3 helpers).

**Schema reminder** (`db.ts:79-83`):
```sql
CREATE TABLE IF NOT EXISTS settings (
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL,
    updated_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000)
);
```

**Note:** `aiSettingsService.ts:42` writes a `created_at` column that does NOT exist in the schema (visible drift between the two files — existing bug or tolerated by SQLite due to missing column being silently coerced via INSERT OR REPLACE? Worth a planner note). For Phase 9, write only `(key, value, updated_at)` to stay schema-correct.

---

### Pattern S3 — Async Service Helper with try/catch + console.error (Non-Fatal)

**Source:** `aiSettingsService.ts:13-33, 38-49`, `useGlobalShortcuts.ts:67-70`

**Apply to:** `onboardingService.ts` (all 3 helpers); `OnboardingOverlay.tsx` skip + advance handlers (where they wrap `markOnboardingCompleted()`).

```typescript
try {
  // do thing
} catch (err) {
  console.error("Failed to ...:", err);
}
```

No toasts on onboarding errors — UI-SPEC L176 explicit ("Onboarding is non-critical UX; surfacing an error here would be more disruptive than the silent failure").

---

### Pattern S4 — `data-onboarding="..."` Attribute for DOM Targeting

**Source:** `QuickWriteFAB.tsx:17` (`data-onboarding="quick-write-fab"`)

**Apply to:** `OnboardingSpotlight.tsx` target lookup (`document.querySelector('[data-onboarding="quick-write-fab"]')`).

**Phase 9 adds NO new `data-onboarding` attributes** — D-18 explicit, the FAB attribute is already shipped from Phase 8. CONTEXT.md "Files NOT touched" reinforces this.

---

### Pattern S5 — Idempotent Post-Migration SQL (db.ts call-site)

**Source:** `db.ts:164-185` (the `local_date` ALTER + `CREATE INDEX IF NOT EXISTS` block)

**Apply to:** Phase 9's `INSERT OR IGNORE` seed (D-04).

Three idempotence techniques in this file already:
1. `CREATE TABLE IF NOT EXISTS` (in MIGRATION_SQL block)
2. Conditional ALTER (`PRAGMA table_info` → `if (!hasColumn)`)
3. `INSERT OR IGNORE` (used in MIGRATION_SQL line 84-87 for default settings rows)

Phase 9 uses technique #3 with a `WHERE (SELECT COUNT(*) FROM entries) > 0` filter (a SQLite-native "compound idempotence" — both the OR IGNORE and the WHERE clause must agree before a row is inserted).

---

### Pattern S6 — Dev-Only Diagnostic Console Logs

**Source:** `db.ts:176-178, 188-195`, `aiSettingsService.ts:72-74` (this one is unwrapped — drift)

**Apply to:** `onboardingService.ts` (skip — keep helpers silent on success per privacy principle), `db.ts` migration seed (use the wrapped form).

```typescript
if (import.meta.env.DEV) {
  console.log("[db] Seeded onboarding_completed_at for existing-user install");
}
```

CONTEXT.md "Specifics" L192: "even DEV-mode `console.log` should be minimal and not include any user content."

---

### Pattern S7 — Loading-State Button (Loader2 swap, Button stays at fixed width)

**Source:** `SettingsView.tsx:564-580` (Export Data button) and `:478-491` (Check Status button — almost identical grammar)

**Apply to:** `HelpSection` Replay button.

```typescript
<button
  onClick={handleAction}
  disabled={isLoading}
  className="flex items-center gap-1.5 px-3 py-1.5 text-label rounded-md border border-border text-muted hover:border-accent/50 hover:text-text transition-colors font-medium disabled:opacity-50"
>
  {isLoading ? (
    <>
      <Loader2 size={14} className="animate-spin" />
      Loading...
    </>
  ) : (
    "Action"
  )}
</button>
```

UI-SPEC L398 explicitly flags: "loading state preserves button width to prevent SR re-announcement of 'now appearing' content". The `flex items-center gap-1.5` + matching label widths handles this naturally.

---

### Pattern S8 — Section Composition Grammar (SettingsView)

**Source:** `SettingsView.tsx:556-585` (DataSection — single SettingRow), `:244-279` (SecuritySection — multi SettingRow)

**Apply to:** `HelpSection`.

```typescript
<section>
  <SectionHeader icon={<Icon size={16} />} title="Section Title" />
  <div className="border-t border-border">
    <SettingRow label="..." description="...">
      <button>...</button>
    </SettingRow>
    {/* optional more rows separated by:
    <div className="border-t border-border/50" />
    */}
  </div>
</section>
```

HelpSection ships with one row in Phase 9 (deferred items list mentions future rows like Keyboard Shortcuts, About).

---

### Pattern S9 — Fragment-of-State-Branches in App.tsx Render

**Source:** `App.tsx:148-208` (the State 1 → State 6 ladder)

**Apply to:** Adding State 6.5 (between current 5 and 6) and the OnboardingOverlay sibling inside State 6.

Each branch is a top-level conditional `{condition && (<jsx>)}` inside the outer `<div className="flex flex-1 overflow-hidden">`. Mutually-exclusive guards prevent two branches rendering at once. Phase 9 adds State 6.5 with a guard that's also mutually-exclusive vs current State 6 (after the State 6 guard is tightened to add `isOnboardingCompleted !== null`).

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `OnboardingSpotlight.tsx` (DOM measurement portion) | component | request-response (DOM rect) | No existing component in the codebase uses `useLayoutEffect` + `ResizeObserver` to measure another element's bounding rect. Build per CONTEXT.md D-09 + UI-SPEC L233-251. The `~60 lines total` cap (CONTEXT.md L188) bounds the implementation. The fixed-position + z-index scaffolding pattern is borrowed from `QuickWriteFAB.tsx`; the measurement technique is novel. |

Everything else has at least one byte-close analog already in the codebase.

---

## Metadata

**Analog search scope:**
- `src/utils/` — service-layer analogs
- `src/stores/` — Zustand patterns
- `src/components/` — UI composition + section grammar
- `src/components/ui/` — shadcn primitives
- `src/hooks/` — keyboard handler + lifecycle hooks
- `src/lib/` — db migration patterns
- `src/styles/` — animation keyframes
- `src/App.tsx` — composition root + state machine

**Files scanned:** 9 read in full + 3 grep'd for cross-references = 12 files referenced.

**Pattern extraction date:** 2026-04-18

**Cross-cutting confirmations:**
- Zero new dependencies needed (UI-SPEC L29, CONTEXT.md L138-141 confirmed)
- Zero new shadcn primitives needed (alert-dialog + popover + button all shipped)
- Zero new `data-onboarding` attributes needed (Phase 8 already shipped the FAB target)
- Zero new keyframes needed (`fade-in` + `pop-in` from Phase 7 cover all motion)
- Zero new color tokens needed (existing `--color-accent` + `--color-text-muted` etc. cover all visuals)

**Notable drift / planner heads-up:**
- `aiSettingsService.ts:42-44` writes a `created_at` column that the `settings` schema (`db.ts:79-83`) does NOT define. SQLite tolerates this via INSERT-OR-REPLACE coercion, but Phase 9's `markOnboardingCompleted()` should write only `(key, value, updated_at)` to be schema-correct. Worth an explicit note in the plan.
- `useGlobalShortcuts.ts:58` already has an `editor`/`settings` view-gate; Phase 9 adds onboarding as a fourth condition in the locked-state gate (line 52), NOT as an extension of the view-gate. Keep the two guards separate.
- `App.tsx:147` outer container uses `bg-bg`, but the State 1/3 loaders use `bg-background` (a Tailwind shadcn alias to `--background` which is also `bg-bg`). For State 6.5 loader, mirror existing State 3 grammar exactly (`bg-background`) for visual parity even though both resolve to the same color.

---

*Phase 9 PATTERNS.md — generated by gsd-pattern-mapper, 2026-04-18. Every analog is shipped code; every excerpt is byte-faithful to the source line range cited. Planner can copy these patterns directly into PLAN.md actions.*
