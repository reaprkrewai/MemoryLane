# Phase 8: Home Dashboard & Widgets — Pattern Map

**Mapped:** 2026-04-18
**Files analyzed:** 10 new/modified files
**Analogs found:** 10 / 10

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/stores/entryStore.ts` | store | CRUD / derived state | self (existing) | self-extension |
| `src/lib/dbQueries.ts` | lib-util | CRUD / SQL aggregate | self (existing) | self-extension (no change needed — `thisMonth` already returned) |
| `src/utils/insightService.ts` | service | request-response / SQL + LLM | `src/utils/aiSettingsService.ts` | role-match |
| `src/hooks/useGlobalShortcuts.ts` | hook | event-driven | `src/hooks/useIdleTimeout.ts` | exact |
| `src/lib/writingPrompts.ts` | lib-util | transform (static) | none | no analog |
| `src/components/dashboard/MoodTrends.tsx` | component | transform (useMemo + SVG) | `src/components/MoodOverview.tsx` | role-match |
| `src/components/dashboard/WritingPrompts.tsx` | component | request-response (static) | `src/components/MoodOverview.tsx` | role-match |
| `src/components/dashboard/AIInsights.tsx` | component | request-response / async | `src/components/OnThisDay.tsx` | role-match |
| `src/components/dashboard/RecentEntriesFeed.tsx` | component | CRUD / read | `src/components/OverviewView.tsx` (extract lines 152–225) | exact (extraction) |
| `src/components/OverviewView.tsx` | view | CRUD / derived state | self (existing) | self-modification |
| `src/components/AppShell.tsx` | view / shell | request-response | self (existing) | self-modification |
| `src/components/QuickWriteFAB.tsx` | component | request-response | self (existing) | self-modification |
| `src/App.tsx` | app root | event-driven | self (existing) | self-modification |

---

## Critical Schema Finding

**The `settings` table DDL in `src/lib/db.ts` lines 79–83 has exactly three columns:**

```sql
CREATE TABLE IF NOT EXISTS settings (
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL,
    updated_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000)
);
```

**There is NO `created_at` column.** Despite `aiSettingsService.ts` (lines 41–45) inserting with a 4-column `(key, value, created_at, updated_at)` signature, the DDL does not support this. The correct INSERT pattern (confirmed by `entryStore.ts` line 379–383 `updateAutoSaveInterval`) is 3-column:

```typescript
// CORRECT — matches DDL (entryStore.ts:379-383)
await db.execute(
  "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)",
  [key, value, Date.now()]
);
```

`insightService.ts` MUST use the 3-column pattern. Do NOT copy `aiSettingsService.ts` line 42 verbatim — its 4-column INSERT is a latent bug that may work only because SQLite with `OR REPLACE` silently drops the unknown column (or because `created_at` has a default). Use the 3-column form to be safe.

---

## Pattern Assignments

### `src/stores/entryStore.ts` (store, self-extension)

**Analog:** Self — lines 110–170 (`createEntry` refresh block) and lines 283–315 (`loadPage` refresh block)

**Add `entriesThisMonth` to the interface** (after line 45 in the FOUND-01 block):

```typescript
// src/stores/entryStore.ts lines 41-46 (FOUND-01 field block)
// FOUND-01 — maintained derived primitives (D-01..D-05)
totalEntries: number;
dayStreak: number;
moodCounts: Record<string, number>;
recentEntries: Entry[];
// ADD after recentEntries:
entriesThisMonth: number;  // NEW — DASH-02, wired to stats.thisMonth
```

**Add initial value** (after line 124):

```typescript
// src/stores/entryStore.ts lines 120-124 (initial values)
totalEntries: 0,
dayStreak: 0,
moodCounts: {},
recentEntries: [],
entriesThisMonth: 0,  // NEW
```

**Update 3 refresh call sites — copy this set block pattern from `createEntry` (lines 162–169):**

```typescript
// Pattern: all 3 sites (createEntry lines 162-169, deleteEntry lines 180-187,
// loadPage lines 304-311) do the same set() shape. ADD entriesThisMonth line:
const stats = await getEntryStats();
const all = get().allEntries;
set({
  totalEntries: stats.totalEntries,
  dayStreak: stats.dayStreak,
  entriesThisMonth: stats.thisMonth,  // NEW line — add to all 3 call sites
  moodCounts: computeMoodCounts(all),
  recentEntries: stableRecentSlice(all, get().recentEntries),
});
```

**Do NOT add to `saveContent` (lines 194–234) or `updateMood` (lines 236–261).** The D-05 contract is explicit: counts do not change during content edits.

---

### `src/utils/insightService.ts` (service, new)

**Analog:** `src/utils/aiSettingsService.ts` for the settings KV pattern; `src/lib/hybridAIService.ts` for the LLM call.

**Imports pattern** (modeled on `aiSettingsService.ts` lines 1–8 + confirmed paths):

```typescript
import { getDb } from "../lib/db";
import * as hybridAI from "../lib/hybridAIService";
```

Import path verified: `aiSettingsService.ts` imports `getDb` from `"../lib/db"` (line 6); `App.tsx` imports `hybridAI` from `"./lib/hybridAIService"` (line 15), so from `src/utils/` the path is `"../lib/hybridAIService"`.

**Settings KV read pattern** (from `aiSettingsService.ts` lines 15–21):

```typescript
const db = await getDb();
const rows = await db.select<{ value: string }[]>(
  `SELECT value FROM settings WHERE key = 'someKey'`,
  []
);
const value = rows.length > 0 ? rows[0].value : null;
```

**Settings KV write pattern** (CORRECT 3-column form from `entryStore.ts` lines 379–383):

```typescript
await db.execute(
  "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)",
  [key, value, Date.now()]
);
```

**LLM call pattern** (from `hybridAIService.ts` lines 48–59):

```typescript
// askQuestion signature:
export async function askQuestion(
  question: string,
  context: string
): Promise<{ answer: string; citations: string[] }>

// Call from insightService:
const { answer } = await hybridAI.askQuestion(question, context);
```

**SQL pagination-independent read pattern** (from `dbQueries.ts` lines 17–35 + `entryStore.ts` loadPage lines 283–303):

```typescript
// Direct db.select — never iterate allEntries for service reads
const db = await getDb();
const cutoff = Date.now() - 7 * 86400 * 1000;
const rows = await db.select<{ content: string }[]>(
  "SELECT content FROM entries WHERE created_at >= ? ORDER BY created_at DESC",
  [cutoff]
);
```

**Error handling pattern** (from `aiSettingsService.ts` lines 13–33 — try/catch, console.error, fallback return):

```typescript
export async function loadAIBackendPreference(): Promise<AIBackend> {
  try {
    const db = await getDb();
    const rows = await db.select<{ value: string }[]>(...);
    // ...
  } catch (err) {
    console.error("Failed to load AI backend preference:", err);
  }
  return "embedded"; // fallback
}
```

For `insightService.ts`, throw rather than silently fallback — the `AIInsights` component handles the error by showing empty state. Throw a typed sentinel for the "no entries" case:

```typescript
if (rows.length === 0) {
  throw new Error("NOT_ENOUGH_ENTRIES");
}
```

---

### `src/hooks/useGlobalShortcuts.ts` (hook, new)

**Analog:** `src/hooks/useIdleTimeout.ts` — exact same shape: `useEffect` with `window.addEventListener` / `removeEventListener`, cleanup return, Zustand selector subscriptions.

**Imports pattern** (mirrored from `useIdleTimeout.ts` lines 1–2):

```typescript
import { useEffect } from "react";
import { useEntryStore } from "../stores/entryStore";
import { useViewStore } from "../stores/viewStore";
```

**Event listener pattern** (from `useIdleTimeout.ts` lines 17–76):

```typescript
export function useGlobalShortcuts() {
  // Subscribe to Zustand actions at primitive level — not object selectors
  const createEntry = useEntryStore((s) => s.createEntry);
  const selectEntry = useEntryStore((s) => s.selectEntry);
  const navigateToEditor = useViewStore((s) => s.navigateToEditor);

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // Guard: isTypingContext prevents hijacking TipTap or any input
      if ((e.ctrlKey || e.metaKey) && e.key === "n" && !isTypingContext()) {
        e.preventDefault();
        const newId = await createEntry();
        await selectEntry(newId);
        navigateToEditor("timeline"); // pass "timeline" — valid NavigateSource
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [createEntry, selectEntry, navigateToEditor]);
}
```

**`NavigateSource` type constraint** (verified from `src/stores/viewStore.ts` line 4):

```typescript
export type NavigateSource = "timeline" | "sidebar" | null;
```

`"overview"`, `"calendar"`, `"search"` are NOT valid NavigateSource values. Always pass `"timeline"` (or `null`) from `useGlobalShortcuts`. TypeScript will error if you pass `activeView` directly.

**`isTypingContext` helper** — define at module scope in `useGlobalShortcuts.ts`:

```typescript
function isTypingContext(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") return true;
  if ((el as HTMLElement).isContentEditable) return true;
  return false;
}
```

**Mount location in `App.tsx`** (inside State 6, mirroring `useIdleTimeout()` at line 130):

```typescript
// src/App.tsx line 130 — existing:
useIdleTimeout();
// ADD immediately after:
useGlobalShortcuts();
```

Note: `useIdleTimeout()` is called unconditionally at component level (line 130), not inside a conditional. It guards itself internally via `if (!isPinSet || ...)`. The same pattern works for `useGlobalShortcuts` — call it unconditionally, but because `App` renders State 6 only when unlocked, the hook will only fire its listener after the unlocked condition is established on each render.

However, if the hook is called at the App component level (line 130), it will register the keydown listener even during States 1–5 because hooks always run. To match D-23's "mount in State 6 only" requirement, place the hook call inside a separate inner component that is only rendered in State 6, exactly as shown in the RESEARCH.md pattern. The safest approach: add `isTypingContext()` to also return `true` when `isDbReady === false || isLocked === true` by reading from the store inside the handler. See Shared Patterns section.

---

### `src/lib/writingPrompts.ts` (lib-util, new)

**No analog** — this is a static data file. No existing static array exports in the codebase.

**Pattern to follow:** TypeScript `readonly` array export with `as const`:

```typescript
// src/lib/writingPrompts.ts
export const PROMPTS: readonly string[] = [
  // 60 prompts across 5 themes (12 per theme):
  // reflection, gratitude, memory, goals, struggles
  "...",
  // ...
] as const;

export default PROMPTS;
```

Export both named and default for flexibility. The `WritingPrompts` component imports as:

```typescript
import PROMPTS from "../../lib/writingPrompts";
```

---

### `src/components/dashboard/MoodTrends.tsx` (component, new)

**Analog:** `src/components/MoodOverview.tsx` — same widget card shell, same mood color constants, same empty-state pattern.

**Widget card shell pattern** (from `MoodOverview.tsx` lines 24–36):

```tsx
// Matches MoodOverview card shell exactly
<div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
  <div className="mb-5 flex items-baseline justify-between">
    <h3 className="font-display text-lg font-semibold text-[var(--color-text)]">
      Mood trends
    </h3>
    <span className="text-small-caps text-[10px] text-[var(--color-text-muted)]">
      last 30 days
    </span>
  </div>
  {/* SVG chart area */}
</div>
```

**Mood color constants** (from `MoodOverview.tsx` lines 13–19 — copy verbatim):

```typescript
const MOODS = [
  { key: "awful", color: "#FF7A7A" },
  { key: "bad",   color: "#F5A623" },
  { key: "okay",  color: "#B4A6FF" },
  { key: "good",  color: "#5EA2FF" },
  { key: "great", color: "#4ADE9B" },
] as const;
```

**Store subscription** (this is the ONE approved `allEntries` exception — CONTEXT.md D-08):

```typescript
// From OverviewView.tsx line 39 — same pattern
const allEntries = useEntryStore((s) => s.allEntries);
```

**Loading guard** (triple-gate from RESEARCH.md Pattern 8):

```typescript
const isLoadingPage = useEntryStore((s) => s.isLoadingPage);
const totalEntries = useEntryStore((s) => s.totalEntries);
const showSkeleton = isLoadingPage && allEntries.length === 0 && totalEntries === 0;
```

**`useMemo` bucketing pattern** (compute 30-day buckets locally):

```typescript
import { subDays } from "date-fns"; // already in OverviewView.tsx line 3
const chartData = useMemo(() => {
  const cutoff = subDays(new Date(), 30).getTime();
  const recent = allEntries.filter((e) => e.created_at >= cutoff && e.mood);
  const dayBuckets: Array<Record<string, number>> = Array.from({ length: 30 }, () => ({}));
  const today = new Date();
  recent.forEach((e) => {
    const daysAgo = Math.floor((today.getTime() - e.created_at) / 86400000);
    const colIndex = 29 - Math.min(daysAgo, 29);
    if (e.mood) {
      dayBuckets[colIndex][e.mood] = (dayBuckets[colIndex][e.mood] ?? 0) + 1;
    }
  });
  return dayBuckets;
}, [allEntries]);
```

**Empty state** (from `MoodOverview.tsx` lines 70–76 — copy the pattern):

```tsx
{isEmpty && (
  <p className="mt-3 text-center text-xs leading-relaxed text-[var(--color-text-muted)]">
    Your mood story unfolds here
    <br />
    <span className="font-display-italic">as entries are written</span>
  </p>
)}
```

---

### `src/components/dashboard/WritingPrompts.tsx` (component, new)

**Analog:** `src/components/MoodOverview.tsx` for widget card shell + `src/components/OverviewView.tsx` for the "View all" link pattern (ArrowRight icon, hover transition).

**Widget card shell pattern** — identical to MoodOverview (see above).

**date-fns import pattern** (from `OverviewView.tsx` line 3 — already established):

```typescript
import { getDayOfYear } from "date-fns"; // v4.1.0 — confirmed in deps
import { useState, useMemo } from "react";
import { ArrowRight, Lightbulb } from "lucide-react";
```

**Daily index computation**:

```typescript
const [offset, setOffset] = useState(0);
const todayIndex = useMemo(() => getDayOfYear(new Date()), []); // stable per mount
const displayIndex = (todayIndex + offset) % PROMPTS.length;
```

**"Another prompt" button pattern** (from `OverviewView.tsx` lines 158–167 "View all" button — same `group flex items-center gap-1 text-xs` shape):

```tsx
<button
  onClick={() => setOffset((prev) => prev + 1)}
  className="group flex items-center gap-1 text-xs text-[var(--color-primary)] transition-colors hover:text-[var(--color-primary-glow)]"
>
  Another prompt
  <ArrowRight size={12} className="transition-transform duration-200 group-hover:translate-x-0.5" />
</button>
```

**Prompt text block with left-border accent** (UI-SPEC §7):

```tsx
<p className="border-l-2 border-[var(--color-primary)] pl-3 text-sm italic leading-relaxed text-[var(--color-text-secondary)] py-3">
  {PROMPTS[displayIndex]}
</p>
```

---

### `src/components/dashboard/AIInsights.tsx` (component, new)

**Analog:** `src/components/OnThisDay.tsx` for the `useEffect` on-mount fetch + local state pattern; `src/utils/aiSettingsService.ts` for the settings-KV read.

**Imports pattern**:

```typescript
import { useState, useEffect } from "react";
import { RefreshCw, Sparkles } from "lucide-react";
import { formatDistanceToNow } from "date-fns"; // already in OverviewView.tsx line 3
import { useAIStore } from "../../stores/aiStore";
import { readInsightCache, generateWeeklySummary } from "../../utils/insightService";
```

**`aiStore.available` gate** (from `aiStore.ts` line 49 — initial value `false`):

```typescript
// Subscribe at primitive level — not object selector
const available = useAIStore((s) => s.available);
```

**On-mount fetch pattern** (from `OnThisDay.tsx` lines 35–83):

```typescript
useEffect(() => {
  readInsightCache().then((cache) => {
    setText(cache.text);
    setGeneratedAt(cache.generatedAt);
  });
}, []);
```

**Refresh handler with silent fallback** (D-18 — no toast/dialog on failure):

```typescript
const handleRefresh = async () => {
  if (!available) return; // D-18: silent no-op when Ollama down
  setIsGenerating(true);
  try {
    const summary = await generateWeeklySummary();
    setText(summary);
    setGeneratedAt(Date.now());
  } catch (err: unknown) {
    const isNotEnough = err instanceof Error && err.message === "NOT_ENOUGH_ENTRIES";
    if (isNotEnough) setText(null);
    console.error("[AIInsights] generateWeeklySummary failed:", err);
    // NO toast, NO dialog — D-18 explicit
  } finally {
    setIsGenerating(false);
  }
};
```

**`formatDistanceToNow` usage** (from `OverviewView.tsx` line 195):

```typescript
const relativeTime = formatDistanceToNow(new Date(generatedAt), { addSuffix: true });
// Renders as: "Generated 2 hours ago"
```

**Refresh button with spinner** (matches `animate-spin` pattern used in `App.tsx` Loader2):

```tsx
<button
  onClick={() => void handleRefresh()}
  disabled={isGenerating}
  className="group flex items-center gap-1 text-xs text-[var(--color-primary)] transition-colors hover:text-[var(--color-primary-glow)] disabled:opacity-50 disabled:cursor-not-allowed"
>
  <RefreshCw size={12} className={isGenerating ? "animate-spin" : ""} />
  Refresh insight
</button>
```

**`data-onboarding` attribute** (per UI-SPEC §Copywriting):

```tsx
<div className="rounded-2xl ..." data-onboarding="ai-insights">
```

---

### `src/components/dashboard/RecentEntriesFeed.tsx` (component, extraction)

**Analog:** `src/components/OverviewView.tsx` lines 152–225 — extract this block verbatim into a standalone component.

**Import pattern** (from `OverviewView.tsx` lines 1–12):

```typescript
import { ArrowRight, Pencil } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useEntryStore } from "../../stores/entryStore";
import { useViewStore } from "../../stores/viewStore";
import { stripMarkdown } from "../../lib/stripMarkdown";
```

**Store subscription** (from `OverviewView.tsx` lines 71–72 — use the FULL 5-item slice, not `.slice(0, 3)`):

```typescript
// CHANGE from OverviewView.tsx line 72 (remove .slice(0, 3)):
const recentEntries = useEntryStore((s) => s.recentEntries); // full 5-item stable primitive
```

**Entry row pattern** (from `OverviewView.tsx` lines 192–224 — copy verbatim):

```tsx
<li key={entry.id}>
  <button
    onClick={() => void handleOpenEntry(entry.id)}
    className="group flex w-full items-start gap-4 py-3.5 text-left transition-colors"
  >
    <div className="flex-1 overflow-hidden">
      <p className="mb-1 line-clamp-2 text-sm leading-relaxed text-[var(--color-text)] transition-colors group-hover:text-[var(--color-primary)]">
        {preview || (
          <span className="italic text-[var(--color-text-muted)]">Empty entry</span>
        )}
      </p>
      <p className="font-display-italic text-xs text-[var(--color-text-muted)]">
        {relativeTime}
      </p>
    </div>
    {entry.mood && (
      <span className="mt-1 flex h-2 w-2 shrink-0 rounded-full bg-[var(--color-primary)]" />
    )}
  </button>
</li>
```

**Empty state** (from `OverviewView.tsx` lines 172–190 — copy verbatim).

**Skeleton guard** (triple-gate from RESEARCH.md Pattern 8):

```typescript
const isLoadingPage = useEntryStore((s) => s.isLoadingPage);
const totalEntries = useEntryStore((s) => s.totalEntries);
const showSkeleton = isLoadingPage && recentEntries.length === 0 && totalEntries === 0;
```

---

### `src/components/OverviewView.tsx` (view, modification)

**Analog:** Self — surgical modifications to existing file.

**Remove** (lines to delete):
- Line 59–61: `wordsWritten` useMemo (words-written stat card)
- Line 72: `.slice(0, 3)` from `recentEntries` — use full primitive
- Line 129–132: `Words written` StatCard block → replace with `Entries this month`
- Lines 230–235: `<QuickActions ... />` render
- Line 240: `<QuickWriteFAB onClick={...} />` render (moved to AppShell)

**Add `entriesThisMonth` subscription** (after line 57, matching existing selector style):

```typescript
// OverviewView.tsx — add alongside existing selectors at lines 56-57
const totalEntries = useEntryStore((s) => s.totalEntries);
const dayStreak = useEntryStore((s) => s.dayStreak);
const entriesThisMonth = useEntryStore((s) => s.entriesThisMonth); // NEW
```

**Replace `Words written` StatCard** (lines 129–132) with:

```tsx
<StatCard
  icon={CalendarDays}
  label="this month"
  value={entriesThisMonth}
  variant="violet"
/>
```

**Replace streak StatCard** (lines 135–140) with capped framing:

```tsx
<StatCard
  icon={Flame}
  label="this week"
  value={Math.min(dayStreak, 7)}
  variant="amber"
  suffix="/7"
/>
```

**New right column** (replace lines 227–235 `<MoodOverview>` + `<QuickActions>` with):

```tsx
<div className="flex flex-col gap-4">
  <MoodOverview moodCounts={moodCounts} />
  <MoodTrends />
  <WritingPrompts />
  <AIInsights />
  <OnThisDay />
</div>
```

**`data-onboarding` attributes** on stat row container and FAB's old slot (per UI-SPEC):

```tsx
<section className="mb-8 grid grid-cols-4 gap-4" data-onboarding="stat-cards">
```

---

### `src/components/AppShell.tsx` (shell, modification)

**Analog:** Self — add FAB conditional render.

**Imports to add** (following existing single-import style at line 1):

```typescript
import { Sidebar } from "./Sidebar";
import { QuickWriteFAB } from "./QuickWriteFAB";        // ADD
import { useViewStore } from "../stores/viewStore";      // ADD
import { useEntryStore } from "../stores/entryStore";    // ADD
```

**FAB visibility pattern** (D-21):

```typescript
const activeView = useViewStore((s) => s.activeView);
const createEntry = useEntryStore((s) => s.createEntry);
const selectEntry = useEntryStore((s) => s.selectEntry);
const navigateToEditor = useViewStore((s) => s.navigateToEditor);

const showFAB = (["overview", "timeline", "calendar", "search"] as const)
  .includes(activeView as "overview" | "timeline" | "calendar" | "search");

const handleNewEntry = async () => {
  const newId = await createEntry();
  await selectEntry(newId);
  navigateToEditor("timeline");
};
```

**JSX addition** (after the existing `<main>` block, before closing div):

```tsx
{showFAB && <QuickWriteFAB onClick={() => void handleNewEntry()} />}
```

---

### `src/components/QuickWriteFAB.tsx` (component, modification)

**Analog:** Self — two targeted edits.

**Change 1** — `aria-label` (line 16, currently `"Quick write new entry"`):

```tsx
aria-label="New entry"
```

**Change 2** — Add `focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2` to the `className` on the `<button>` (line 11):

```tsx
// Current button classes (line 11):
className="group fixed bottom-8 right-8 z-40 flex items-center gap-2.5 overflow-hidden rounded-full pl-5 pr-6 py-3.5 text-sm font-medium text-white shadow-[0_8px_32px_rgba(124,109,255,0.4)] transition-all duration-300 hover:shadow-[0_12px_40px_rgba(124,109,255,0.55)] hover:-translate-y-0.5 active:translate-y-0"
// ADD to classes:
focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
```

**Change 3** — Add `data-onboarding="quick-write-fab"` attribute to the button element.

No other changes — visual, handler, icon, shimmer all remain identical.

---

### `src/App.tsx` (app root, modification)

**Change 1** — Import `useGlobalShortcuts`:

```typescript
import { useGlobalShortcuts } from "./hooks/useGlobalShortcuts";
```

**Change 2** — Call hook (line 130, alongside `useIdleTimeout()`):

```typescript
// src/App.tsx line 129-130 (existing):
// Set up idle timeout monitoring
useIdleTimeout();
// ADD:
useGlobalShortcuts();
```

Both hooks are called unconditionally at the component top level. `useGlobalShortcuts` must check `isLocked` / `isDbReady` inside its handler (not via conditional mounting) to ensure the shortcut doesn't fire during locked states. Add store reads inside the hook's handler function:

```typescript
// Inside useGlobalShortcuts.ts handleKeyDown:
const { isLocked, isDbReady } = useUiStore.getState(); // getState() is synchronous
if (isLocked || !isDbReady) return;
```

This matches how `useIdleTimeout.ts` guards itself via store state (`isPinSet`, `idleTimeout`) rather than conditional mounting.

---

## Shared Patterns

### Zustand Granular Selector
**Source:** `src/components/OverviewView.tsx` lines 56–57
**Apply to:** All new widget components and hooks
```typescript
// CORRECT — primitive selectors, one per line:
const totalEntries = useEntryStore((s) => s.totalEntries);
const dayStreak = useEntryStore((s) => s.dayStreak);
// WRONG — object selector creates new reference every render:
// const { totalEntries, dayStreak } = useEntryStore((s) => ({ ... }));
```

### Widget Card Shell
**Source:** `src/components/MoodOverview.tsx` lines 24–36 + `src/components/StatCard.tsx` lines 40–75
**Apply to:** All four new `src/components/dashboard/` widgets
```tsx
<div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
  <div className="mb-5 flex items-baseline justify-between">
    <h3 className="font-display text-lg font-semibold text-[var(--color-text)]">
      {title}
    </h3>
    {/* optional subtitle or action */}
  </div>
  {/* content */}
</div>
```

### Settings KV Read
**Source:** `src/utils/aiSettingsService.ts` lines 15–21
**Apply to:** `insightService.ts` `readInsightCache()`
```typescript
const db = await getDb();
const rows = await db.select<{ value: string }[]>(
  `SELECT value FROM settings WHERE key = ?`,
  [key]
);
const value = rows.length > 0 ? rows[0].value : null;
```

### Settings KV Write (3-column — SCHEMA-CORRECT)
**Source:** `src/stores/entryStore.ts` lines 379–383 (`updateAutoSaveInterval`)
**Apply to:** `insightService.ts` cache write — NOT the `aiSettingsService.ts` 4-column pattern
```typescript
await db.execute(
  "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)",
  [key, value, Date.now()]
);
```

### Error Handling — Console + No Toast (AI widget path)
**Source:** `src/utils/aiSettingsService.ts` lines 27–29 + CONTEXT.md D-18
**Apply to:** `AIInsights.tsx` catch block, `insightService.ts` catch block
```typescript
} catch (err) {
  console.error("[AIInsights] operation failed:", err);
  // NO toast(), NO dialog — silent graceful degradation for AI features
}
```

### `navigate to editor` Handler
**Source:** `src/components/OverviewView.tsx` lines 74–78
**Apply to:** `AppShell.tsx` FAB handler, `useGlobalShortcuts.ts` handler
```typescript
const handleNewEntry = async () => {
  const newId = await createEntry();
  await selectEntry(newId);        // flushAndClearTimers called inside selectEntry
  navigateToEditor("timeline");    // "timeline" is the only valid NavigateSource for new entry
};
```

### Triple-Gate Skeleton
**Source:** RESEARCH.md Pattern 8 + CONTEXT.md D-10
**Apply to:** Stat cards in OverviewView, RecentEntriesFeed, MoodTrends
```typescript
const isLoadingPage = useEntryStore((s) => s.isLoadingPage);
const allEntries = useEntryStore((s) => s.allEntries);
const totalEntries = useEntryStore((s) => s.totalEntries);
const showSkeleton = isLoadingPage && allEntries.length === 0 && totalEntries === 0;
// showSkeleton === true → render animated pulse placeholder
// showSkeleton === false && totalEntries === 0 → render inviting empty state
// showSkeleton === false && totalEntries > 0 → render content
```

### `subDays` 30-day Window
**Source:** `src/components/OverviewView.tsx` line 3 + `calculateMoodCounts` lines 29–35
**Apply to:** `MoodTrends.tsx` `useMemo` buckets
```typescript
import { subDays } from "date-fns";
const cutoff = subDays(new Date(), 30).getTime();
const recent = entries.filter((e) => e.created_at >= cutoff);
```

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/lib/writingPrompts.ts` | lib-util | static | No existing static data array exports in codebase; use `readonly string[]` with `as const` |

---

## Implementation Warning: `aiSettingsService.ts` 4-Column INSERT

`aiSettingsService.ts` line 42 uses:
```typescript
`INSERT OR REPLACE INTO settings (key, value, created_at, updated_at) VALUES ('aiBackend', ?, ?, ?)`
```

The `settings` DDL in `db.ts` has **no `created_at` column** (verified lines 79–83). This INSERT may succeed silently under SQLite's permissive behavior or may fail on some versions. `insightService.ts` MUST NOT copy this pattern. Use the 3-column form from `entryStore.ts` lines 379–383.

---

## Metadata

**Analog search scope:** `src/components/`, `src/hooks/`, `src/stores/`, `src/utils/`, `src/lib/`
**Files scanned:** 13 source files read directly
**Pattern extraction date:** 2026-04-18
