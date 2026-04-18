# Phase 8: Home Dashboard & Widgets - Research

**Researched:** 2026-04-18
**Domain:** React dashboard composition, Zustand derived selectors, inline SVG charts, SQLite KV cache, global keyboard hooks
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Overview is the default view on launch. `viewStore.activeView` already initializes to `"overview"` — Phase 8 verifies this holds after all refactors. No change needed to App.tsx or JournalView.tsx routing.
- **D-02:** Single-view-level fetch, not per-widget `useEffect`s. `OverviewView` calls `loadPage()` + `loadTags()` on mount; widgets consume derived selectors via `useEntryStore(s => s.X)`.
- **D-03:** Layout preserves v1.0 `grid-cols-4` stat row + `grid-cols-[2fr_1fr]` split. Right column becomes stacked sidebar: `MoodOverview`, `MoodTrends`, `WritingPrompts`, `AIInsights`, `OnThisDay`. `QuickActions` removed.
- **D-04:** New widgets co-located in `src/components/dashboard/`. Existing `OnThisDay`, `MoodOverview`, `StatCard`, `QuickWriteFAB` stay where they are.
- **D-05:** Swap `wordsWritten` stat card for `entriesThisMonth` (violet variant, CalendarDays icon).
- **D-06:** Recent Entries = 5 items (full `recentEntries` primitive). Remove existing `.slice(0, 3)`.
- **D-07:** Streak framing = `value={Math.min(dayStreak, 7)}` + `suffix="/7"` + `label="this week"`. Zero-entries: show `0` numeral (inviting copy lives in RecentEntriesFeed).
- **D-08:** Widgets subscribe only to derived primitives. `MoodTrends` is the single exception — derives from `allEntries` via local `useMemo([allEntries])` (bounded, acceptable).
- **D-09:** `getEntryStats()` already returns `thisMonth` — Phase 8 adds `entriesThisMonth` derived field to `entryStore` and updates 3 refresh call sites (`loadPage`, `createEntry`, `deleteEntry`). NOT `saveContent`.
- **D-10:** Skeleton triple-gate: show `animate-pulse` skeleton ONLY when `isLoadingPage === true` AND `allEntries.length === 0` AND relevant primitive is at zero/empty initial.
- **D-11:** No per-widget error boundaries. DB errors propagate via App-level handler.
- **D-12:** Prompt library = `src/lib/writingPrompts.ts`, `readonly string[]`, 60 items flat.
- **D-13:** Deterministic daily prompt via `getDayOfYear(new Date()) % PROMPTS.length` from `date-fns@4.1.0`.
- **D-14:** "Another prompt" = `useState<number>(0)` offset. Resets on unmount. No persistence.
- **D-15:** No "Write this prompt" pre-fill button.
- **D-16:** AI Insights cache: two `settings` KV rows — `ai_insight_text` (string) + `ai_insight_generated_at` (unix ms as string).
- **D-17:** Manual-only refresh. No auto-refresh on open.
- **D-18:** Ollama unavailable → graceful static card + visible Refresh button. Retry click = silent no-op.
- **D-19:** Summary via `hybridAIService.askQuestion` from `src/utils/insightService.ts`. Last-7-days entries as context. Warm, grounded, 2-3 sentence prompt.
- **D-20:** 7-day window in SQL (`WHERE created_at >= ?`), not JS iteration over `allEntries`.
- **D-21:** FAB moved from `OverviewView` to `AppShell` level. Visible on `{overview, timeline, calendar, search}`. Hidden on `settings` and `editor`.
- **D-22:** `aria-label="New entry"` + `focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2` on FAB.
- **D-23:** Global shortcut in `src/hooks/useGlobalShortcuts.ts`. Mounted at App.tsx in State 6 (unlocked). Guard: `isTypingContext()` returns true for INPUT/TEXTAREA/contenteditable.
- **D-24:** Shortcut when editor is open = creates new entry, switches editor (flushAndClearTimers via selectEntry).
- **D-25:** `window.addEventListener("keydown", handler)` capture=false, cleaned up in `useEffect` return.

### Claude's Discretion

- Exact visual treatment of `MoodTrends` inline SVG (resolved in UI-SPEC: vertical stacked bar chart)
- Streak card micro-copy (resolved in UI-SPEC: `/7` suffix + `this week` label)
- "Another prompt" as text link or icon button (resolved in UI-SPEC: text button with inline ArrowRight icon)
- AI Insights auto-run on first open (resolved in UI-SPEC: NO — wait for explicit Refresh click)
- FAB z-index behind modals (keep z-40 — Radix uses z-50+)
- Pulse skeleton threshold (triple-gate as D-10)
- Spacing, padding, exact typography of new widgets (follow existing grammar — see UI-SPEC)
- `insightService.ts` file layout (resolved: single `generateWeeklySummary()` export + private helpers)

### Deferred Ideas (OUT OF SCOPE)

- First-run onboarding flow (ONBRD-01..07) → Phase 9
- Auto-tagging sparkle (AUTOTAG-01..07) → Phase 10
- Writing prompt pre-fill into editor → future polish
- Microinteractions pass (ANIM-01..06) → Phase 11
- Tag Management view (TAGUX-02..07) → Phase 11
- 12-color dual-tone palette (TAGUX-02) → Phase 11
- View-transition crossfade (ANIM-05) → Phase 11
- `QuickActions.tsx` deletion — file stays, Phase 8 stops rendering it
- AI Insights auto-refresh on stale cache → future polish
- LLM-generated personalized prompts → v1.2
- MoodTrends interactivity (click-to-filter) → future polish
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DASH-01 | Overview is the default view on app launch (`activeView` initializes to `"overview"`) | viewStore already has `activeView: "overview"` at line 20 — VERIFIED AS-IS |
| DASH-02 | 4 stat cards: streak, total entries, entries this month, total tags — from `getEntryStats()` not `allEntries.length` | `getEntryStats()` already returns `thisMonth`, `totalEntries`, `totalTags` — add `entriesThisMonth` store field |
| DASH-03 | Current streak = `N/7 days this week` (capped weekly), not infinite counter | StatCard `suffix` prop handles `/7`; `Math.min(dayStreak, 7)` as value |
| DASH-04 | 30-day MoodTrends time-series chart as inline SVG (no charting library) | New `MoodTrends.tsx` in `src/components/dashboard/`; local `useMemo([allEntries])` for 30-day data |
| DASH-05 | MoodOverview emoji-constellation kept alongside MoodTrends | `MoodOverview.tsx` reused AS-IS; receives `moodCounts` from local `calculateMoodCounts` in OverviewView |
| DASH-06 | On This Day widget surfaces prior-year entries | `OnThisDay.tsx` reused AS-IS in right sidebar column |
| DASH-07 | Recent Entries feed = 5 most recent (title/preview/date/mood); click to edit | Extract to `RecentEntriesFeed.tsx`; use full `recentEntries` primitive (already sized to 5) |
| DASH-08 | Quick-Write FAB in bottom-right creates new entry + opens editor | FAB moved to AppShell level; conditional on `activeView` |
| DASH-09 | `Ctrl/Cmd+N` from any top-level view creates new entry; FAB has `aria-label="New entry"` + focus-visible ring | New `useGlobalShortcuts.ts` hook mounted at App.tsx State 6 |
| DASH-10 | Writing Prompts widget — one prompt per day via `day_of_year % N` from 60+ static prompts | New `WritingPrompts.tsx` + `src/lib/writingPrompts.ts` |
| DASH-11 | "Another prompt" button cycles to next prompt in library | `useState<number>(0)` offset in `WritingPrompts.tsx` |
| DASH-12 | AI Insights widget — cached LLM summary of last 7 days when Ollama available | New `AIInsights.tsx` + `src/utils/insightService.ts` |
| DASH-13 | Manual Refresh button; cached in `settings` KV with `ai_insight_generated_at` timestamp | `INSERT OR REPLACE` into `settings` table; `aiSettingsService.ts` pattern |
| DASH-14 | Graceful empty state when Ollama unavailable; Refresh button still visible | `aiStore.available` gating; no toast/dialog on unavailable state |
</phase_requirements>

---

## Summary

Phase 8 builds a rich Overview dashboard on top of the architectural primitives shipped in Phase 7. The core challenge is correct re-render isolation — widgets must subscribe to derived primitive selectors, not `allEntries`, so that 500ms auto-save bursts in the editor never cause dashboard churn. Phase 7 fully solves this for all widget data except MoodTrends (which needs a 30-day windowed shape not available as a FOUND-01 primitive).

All the data infrastructure is already in place: `getEntryStats()` returns `thisMonth`, `dayStreak`, `totalEntries`, and `totalTags` in a single SQL round-trip. The `entryStore` has `recentEntries` as a 5-item identity-stable slice and `moodCounts` as lifetime totals. The only store extension needed is adding `entriesThisMonth` as a maintained field wired to `stats.thisMonth` in the same 3 refresh call sites (`loadPage`, `createEntry`, `deleteEntry`).

The most architecturally novel work in Phase 8 is `insightService.ts` (a new SQL+LLM utility), `useGlobalShortcuts.ts` (a new keyboard hook), and 4 new dashboard widget components. All patterns for these have clear precedents in the existing codebase: `aiSettingsService.ts` for the KV cache pattern, `useIdleTimeout.ts` for the keyboard hook shape, and `hybridAIService.askQuestion` for the LLM call routing.

**Primary recommendation:** Build waves in dependency order — store extension first, then OverviewView/AppShell structural changes, then new widget components, then AI infrastructure last (highest latency risk). The SVG chart and writing prompts are pure frontend with zero async risk. The AI insights widget has the most unknowns (LLM latency, cache cold-start) and should be isolated to the last wave.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Stat cards (totals/streak) | Frontend (React component) | Database (SQLite `getEntryStats()`) | Aggregates computed in DB; components are pure display |
| MoodTrends SVG chart | Frontend (React component) | — | Client-side `useMemo` over in-memory `allEntries`; no DB round-trip |
| MoodOverview constellation | Frontend (React component) | — | Pure display from `moodCounts` prop |
| Recent Entries feed | Frontend (React component) | Store (Zustand `recentEntries` primitive) | Identity-stable slice maintained in store, rendered in component |
| Writing Prompts widget | Frontend (React component) | — | Pure computation from static array + local state |
| AI Insights generation | Utility service (`insightService.ts`) | AI backend (hybridAIService → Ollama/embedded) | Service owns SQL read + LLM call + KV cache write |
| AI Insights display | Frontend (React component) | Database (settings KV read on mount) | Component reads cache on mount, triggers service on Refresh |
| Quick-Write FAB | Frontend (AppShell level) | Store (viewStore `activeView`) | FAB visibility gated by `activeView`; action routes through `entryStore.createEntry` |
| Ctrl/Cmd+N shortcut | Frontend (App.tsx hook) | Store (entryStore `createEntry`) | Hook mounted at app root; guard on typing context |
| Skeleton loading gates | Frontend (React component) | Store (isLoadingPage + allEntries.length + primitives) | Triple-gate evaluated per widget; pure display logic |

---

## Standard Stack

### Core (all verified from codebase)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.1.0 | Component rendering | [VERIFIED: package.json] — already in use |
| Zustand | 5.0.12 | State management; derived selectors | [VERIFIED: package.json] — established pattern |
| date-fns | 4.1.0 | `getDayOfYear`, `formatDistanceToNow`, `subDays` | [VERIFIED: npm list] — already in deps; `getDayOfYear` confirmed in v4 API |
| Tailwind v3 | pinned | Utility styling | [VERIFIED: package.json + config] — v3 pin locked (shadcn compatibility) |
| Lucide React | existing | Icons (Flame, CalendarDays, Sparkles, RefreshCw, Lightbulb, ArrowRight) | [VERIFIED: OverviewView.tsx imports] — already installed |
| TypeScript | ~5.8.3 | Type safety | [VERIFIED: package.json] |
| Vite | 7.0.4 | Build tool | [VERIFIED: package.json] |

### Supporting (verified from codebase)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @tauri-apps/plugin-sql | 2.4.0 | SQLite access via `getDb()` | All direct DB queries |
| hybridAIService | local | LLM routing (Ollama/embedded) | AI Insights generation; NEVER call ollamaService directly |
| sonner (Toaster) | existing | Toast notifications | Already in App.tsx; NOT used for AI errors (silent fallback) |

### No New Runtime Dependencies

Per project constraint confirmed in `config.json` and STATE.md: `tailwindcss-animate` already present; `date-fns` already present. Phase 8 adds zero new `npm install` dependencies.

---

## Architecture Patterns

### System Architecture Diagram

```
App.tsx (State 6: unlocked)
  │
  ├── useGlobalShortcuts() [NEW hook, Ctrl/Cmd+N]
  │     └─► entryStore.createEntry() → selectEntry() → navigateToEditor()
  │
  └── AppShell
        ├── Sidebar
        ├── <QuickWriteFAB> [MOVED here, visible on overview/timeline/calendar/search]
        │     └─► same handler as Ctrl/Cmd+N
        └── main content
              └── JournalView
                    └── activeView === "overview" → OverviewView [REFACTORED]
                          │
                          ├── useEffect: loadPage() + loadTags()  [mount]
                          │
                          ├── Stat row (grid-cols-4)
                          │     ├── StatCard: totalEntries      [store primitive]
                          │     ├── StatCard: entriesThisMonth  [store primitive — NEW]
                          │     ├── StatCard: min(dayStreak,7)  [store primitive, capped]
                          │     └── StatCard: tags.length       [tagStore]
                          │
                          └── Main split (grid-cols-[2fr_1fr])
                                ├── LEFT (2fr):
                                │     └── RecentEntriesFeed [EXTRACTED, 5 items]
                                │           └── recentEntries [store primitive]
                                │
                                └── RIGHT (1fr, flex-col gap-4):
                                      ├── MoodOverview [REUSE AS-IS]
                                      │     └── moodCounts [local useMemo over allEntries]
                                      ├── MoodTrends [NEW]
                                      │     └── allEntries [useMemo — 1 exception]
                                      ├── WritingPrompts [NEW]
                                      │     └── writingPrompts.ts [static array]
                                      │     └── useState offset [local only]
                                      ├── AIInsights [NEW]
                                      │     ├── settings KV read on mount
                                      │     ├── aiStore.available [gating]
                                      │     └── insightService.generateWeeklySummary()
                                      │           ├── SQL: entries last 7 days
                                      │           └── hybridAIService.askQuestion()
                                      └── OnThisDay [REUSE AS-IS]
                                            └── own useEffect SQL query
```

### Recommended Project Structure (Phase 8 additions)

```
src/
├── components/
│   ├── dashboard/              # NEW subfolder for Phase 8 widgets
│   │   ├── MoodTrends.tsx      # 30-day stacked bar SVG
│   │   ├── WritingPrompts.tsx  # Daily prompt display + offset cycling
│   │   ├── AIInsights.tsx      # Cached LLM summary widget
│   │   └── RecentEntriesFeed.tsx  # Extracted from OverviewView
│   ├── AppShell.tsx            # MODIFIED: render QuickWriteFAB
│   ├── OverviewView.tsx        # MODIFIED: refactor + new widgets
│   └── QuickWriteFAB.tsx       # MODIFIED: aria-label + focus ring
├── hooks/
│   └── useGlobalShortcuts.ts   # NEW: Ctrl/Cmd+N handler
├── lib/
│   └── writingPrompts.ts       # NEW: readonly string[] of 60 prompts
├── stores/
│   └── entryStore.ts           # MODIFIED: add entriesThisMonth field
└── utils/
    └── insightService.ts       # NEW: 7-day SQL + hybridAI call + cache
```

### Pattern 1: Adding `entriesThisMonth` Derived Field to entryStore

**What:** Extend the FOUND-01 derived primitives with `entriesThisMonth: number`, wired to `stats.thisMonth` from `getEntryStats()`.

**Files to modify:** `src/stores/entryStore.ts`

```typescript
// Source: verified from src/stores/entryStore.ts + src/lib/dbQueries.ts

// 1. Add to EntryState interface (alongside existing FOUND-01 fields)
interface EntryState {
  // ... existing fields ...
  totalEntries: number;
  dayStreak: number;
  moodCounts: Record<string, number>;
  recentEntries: Entry[];
  entriesThisMonth: number; // NEW — DASH-02/03 stat card

  // ... existing actions ...
}

// 2. Add to initial values (line ~121)
entriesThisMonth: 0,

// 3. Update all 3 refresh call sites (loadPage, createEntry, deleteEntry)
// Pattern (identical for all 3 — already verified in FOUND-01):
const stats = await getEntryStats();
const all = get().allEntries;
set({
  totalEntries: stats.totalEntries,
  dayStreak: stats.dayStreak,
  entriesThisMonth: stats.thisMonth, // NEW line
  moodCounts: computeMoodCounts(all),
  recentEntries: stableRecentSlice(all, get().recentEntries),
});
// CRITICAL: saveContent does NOT call getEntryStats() — entriesThisMonth
// stays stale across content edits (counts don't change during typing).
// This is the Phase-7 D-05 contract — do not break it.
```

**Pitfall:** The 4th call site to watch is `updateMood` — it does NOT call `getEntryStats()` either (only recomputes `moodCounts` + `recentEntries`). Do not add `entriesThisMonth` to `updateMood`. The 3-call-site count (B-02) must remain exactly 3.

### Pattern 2: `useGlobalShortcuts.ts` Hook Shape

**What:** Window `keydown` listener for Ctrl/Cmd+N, mounted once at App.tsx State 6 (inside unlocked branch), with `isTypingContext()` guard.

**File to create:** `src/hooks/useGlobalShortcuts.ts`

```typescript
// Source: mirrors useIdleTimeout.ts pattern (verified from codebase)
import { useEffect } from "react";
import { useEntryStore } from "../stores/entryStore";
import { useViewStore } from "../stores/viewStore";

function isTypingContext(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA") return true;
  if ((el as HTMLElement).isContentEditable) return true;
  return false;
}

export function useGlobalShortcuts() {
  const createEntry = useEntryStore((s) => s.createEntry);
  const selectEntry = useEntryStore((s) => s.selectEntry);
  const navigateToEditor = useViewStore((s) => s.navigateToEditor);
  const activeView = useViewStore((s) => s.activeView);

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "n" && !isTypingContext()) {
        e.preventDefault();
        const newId = await createEntry();
        await selectEntry(newId);
        navigateToEditor(activeView as any);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [createEntry, selectEntry, navigateToEditor, activeView]);
}
```

**Mount in App.tsx:** Inside the State 6 block (after `useIdleTimeout()`). The hook must NOT fire when PIN lock is active — State 6 is the unlocked branch, so mounting there is the correct gate.

**Pitfall:** `navigateToEditor` takes a `NavigateSource` parameter (type: `"timeline" | "sidebar" | null`). The active view might be `"overview"` or `"calendar"` which are not valid `NavigateSource` values. Looking at `navigateToEditor` in viewStore.ts: it just sets `activeView: "editor"` and stores the `navigateSource` as provided. Since `"overview"` is not a NavigateSource, pass a type-compatible value. The cleanest approach: check `activeView` and pass `"timeline"` (the closest navigation source), since the back-navigation button in the editor returns to timeline regardless. Alternatively, pass `null` as a safe default.

### Pattern 3: AppShell FAB Hoisting

**What:** Move `<QuickWriteFAB>` from inside `OverviewView` to `AppShell` level, visible on 4 views.

**File to modify:** `src/components/AppShell.tsx`

```typescript
// Source: verified from AppShell.tsx (current) + CONTEXT.md D-21
import { useViewStore } from "../stores/viewStore";
import { useEntryStore } from "../stores/entryStore";
import { QuickWriteFAB } from "./QuickWriteFAB";
import { Sidebar } from "./Sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const activeView = useViewStore((s) => s.activeView);
  const createEntry = useEntryStore((s) => s.createEntry);
  const selectEntry = useEntryStore((s) => s.selectEntry);
  const navigateToEditor = useViewStore((s) => s.navigateToEditor);

  const showFAB = ["overview", "timeline", "calendar", "search"].includes(activeView);

  const handleNewEntry = async () => {
    const newId = await createEntry();
    await selectEntry(newId);
    navigateToEditor("timeline");
  };

  return (
    <div className="flex h-full flex-1 overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-auto bg-bg">
        <div className="h-full">
          {children}
        </div>
      </main>
      {showFAB && <QuickWriteFAB onClick={() => void handleNewEntry()} />}
    </div>
  );
}
```

**Also:** Remove the `<QuickWriteFAB>` render and its `handleNewEntry` usage from `OverviewView.tsx`. The `handleNewEntry` function in OverviewView can stay for the header "New Entry" button — only the FAB render is removed.

**Also:** Remove `<QuickActions>` render from `OverviewView.tsx` right column (CONTEXT.md D-03). The `QuickActions.tsx` file is NOT deleted.

### Pattern 4: `insightService.ts` — AI Insights Cache + LLM Call

**What:** New utility service owning the 7-day SQL read, `hybridAIService.askQuestion` call, and `settings` KV cache read/write.

**File to create:** `src/utils/insightService.ts`

```typescript
// Source: pattern from aiSettingsService.ts + hybridAIService.ts (verified from codebase)
import { getDb } from "../lib/db";
import * as hybridAI from "./hybridAIService";  // NOTE: relative path may be "../lib/"

export interface InsightCache {
  text: string | null;
  generatedAt: number | null;
}

export async function readInsightCache(): Promise<InsightCache> {
  const db = await getDb();
  const rows = await db.select<{ key: string; value: string }[]>(
    "SELECT key, value FROM settings WHERE key IN ('ai_insight_text', 'ai_insight_generated_at')"
  );
  const map: Record<string, string> = {};
  rows.forEach((r) => { map[r.key] = r.value; });
  return {
    text: map["ai_insight_text"] ?? null,
    generatedAt: map["ai_insight_generated_at"] ? parseInt(map["ai_insight_generated_at"], 10) : null,
  };
}

export async function generateWeeklySummary(): Promise<string> {
  const db = await getDb();
  const cutoff = Date.now() - 7 * 86400 * 1000;

  // Pagination-independent SQL read (FOUND-02 contract: never iterate allEntries)
  const rows = await db.select<{ content: string }[]>(
    "SELECT content FROM entries WHERE created_at >= ? ORDER BY created_at DESC",
    [cutoff]
  );

  if (rows.length === 0) {
    throw new Error("NOT_ENOUGH_ENTRIES");
  }

  const context = rows.map((r) => r.content).join("\n\n---\n\n");
  const question =
    "Summarize the emotional and thematic arc of the last 7 days of journal entries in 2-3 sentences. " +
    "Keep it warm, specific, and grounded in what was actually written. Do not invent details.";

  const { answer } = await hybridAI.askQuestion(question, context);

  // Write to settings KV table (INSERT OR REPLACE pattern from aiSettingsService.ts)
  const now = Date.now();
  await db.execute(
    "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)",
    ["ai_insight_text", answer, now]
  );
  await db.execute(
    "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)",
    ["ai_insight_generated_at", String(now), now]
  );

  return answer;
}
```

**Import path note:** `hybridAIService.ts` is at `src/lib/hybridAIService.ts`. From `src/utils/insightService.ts`, the import should be `../lib/hybridAIService`. Verify against `aiSettingsService.ts` which imports from `../lib/db` using the same pattern — confirmed correct.

### Pattern 5: `AIInsights.tsx` Refresh Flow + Gating

**What:** Component reads cache on mount, gates on `aiStore.available`, handles 3 empty states.

```typescript
// Source: pattern from aiStore.ts (verified: available: boolean field)
import { useState, useEffect } from "react";
import { RefreshCw, Sparkles } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useAIStore } from "../../stores/aiStore";
import { readInsightCache, generateWeeklySummary } from "../../utils/insightService";

export function AIInsights() {
  const available = useAIStore((s) => s.available);
  const [text, setText] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    readInsightCache().then((cache) => {
      setText(cache.text);
      setGeneratedAt(cache.generatedAt);
    });
  }, []);

  const handleRefresh = async () => {
    if (!available) return; // D-18: silent no-op
    setIsGenerating(true);
    try {
      const summary = await generateWeeklySummary();
      const now = Date.now();
      setText(summary);
      setGeneratedAt(now);
    } catch (err: unknown) {
      // D-18: on failure, re-show empty/unavailable state, no toast
      const isNotEnough = err instanceof Error && err.message === "NOT_ENOUGH_ENTRIES";
      if (isNotEnough) {
        setText(null); // triggers "not enough entries" empty state in JSX
      }
      console.error("[AIInsights] generateWeeklySummary failed:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  // ... render 3 conditional states per UI-SPEC
}
```

### Pattern 6: MoodTrends SVG — 30-Day Stacked Bar Chart

**What:** Inline SVG derived from `allEntries` via local `useMemo`. The one approved exception to "no `allEntries` subscriptions."

**Key implementation details:**
- `const allEntries = useEntryStore((s) => s.allEntries);` — this IS the single approved exception
- `useMemo([allEntries])` to bucket entries into 30 daily slots
- SVG is static (no animation in Phase 8)
- 30 columns, left = oldest, right = today
- Each column stacks mood segments using accumulated Y positions
- `viewBox="0 0 {cols*barWidth} 80"` with `preserveAspectRatio="none"` to fill container width

```typescript
// Mood bucketing logic (30-day window):
const moodColors = {
  awful: "#FF7A7A", bad: "#F5A623", okay: "#B4A6FF", good: "#5EA2FF", great: "#4ADE9B"
};
const MOODS = ["awful", "bad", "okay", "good", "great"] as const;

const chartData = useMemo(() => {
  const cutoff = subDays(new Date(), 30).getTime();
  const recent = allEntries.filter((e) => e.created_at >= cutoff && e.mood);

  const dayBuckets: Array<Record<string, number>> = Array.from({ length: 30 }, () => ({}));
  const today = new Date();

  recent.forEach((e) => {
    const daysAgo = Math.floor((today.getTime() - e.created_at) / 86400000);
    const colIndex = 29 - Math.min(daysAgo, 29); // today = col 29 (rightmost)
    if (e.mood) {
      dayBuckets[colIndex][e.mood] = (dayBuckets[colIndex][e.mood] ?? 0) + 1;
    }
  });
  return dayBuckets;
}, [allEntries]);
```

**Note on re-render concern:** MoodTrends subscribes to `allEntries` which changes on every auto-save. However, CONTEXT.md D-08 explicitly sanctions this as "the one unavoidable `allEntries` subscriber" because MoodTrends is only visible on Overview while auto-save happens in the Editor — the two views are mutually exclusive. The `useMemo` bounds the recalculation cost.

### Pattern 7: `WritingPrompts.tsx` — Deterministic Daily Index

**What:** Pure functional component using `date-fns` `getDayOfYear` for today's prompt index.

```typescript
// Source: date-fns@4.1.0 API confirmed (getDayOfYear exported in v4)
import { getDayOfYear } from "date-fns";
import { useState, useMemo } from "react";
import { ArrowRight, Lightbulb } from "lucide-react";
import PROMPTS from "../../lib/writingPrompts";

export function WritingPrompts() {
  const [offset, setOffset] = useState(0);

  const todayIndex = useMemo(() => getDayOfYear(new Date()), []); // stable per mount
  const displayIndex = (todayIndex + offset) % PROMPTS.length;
  const prompt = PROMPTS[displayIndex];

  return (
    // ... UI per UI-SPEC
    <button onClick={() => setOffset((prev) => prev + 1)}>
      Another prompt <ArrowRight size={12} />
    </button>
  );
}
```

**Leap-year note:** `getDayOfYear` from date-fns returns 1–366 on leap years (Feb 29 = day 60, then day 61 onward). This means `dayOfYear % 60` on Feb 29 of a leap year = 0, which correctly wraps to `PROMPTS[0]`. With 60 prompts: day 1 = index 1, day 60 = index 0, day 61 = index 1 again. This is deterministic and correct — no special handling needed.

**Timezone note:** `getDayOfYear(new Date())` uses local time, which is correct — the calendar day is a local concept. No UTC conversion needed here.

### Pattern 8: Skeleton Triple-Gate

**What:** Per UI-SPEC D-10, skeletons only appear when loading, not for empty state.

```typescript
// Applies to each widget:
const isLoadingPage = useEntryStore((s) => s.isLoadingPage);
const allEntries = useEntryStore((s) => s.allEntries);
const totalEntries = useEntryStore((s) => s.totalEntries);

// Triple-gate: show skeleton only when ALL THREE are true
const showSkeleton = isLoadingPage && allEntries.length === 0 && totalEntries === 0;
// When loaded and user genuinely has zero entries: show inviting empty state
```

**Implementation note:** Each widget uses its own relevant primitive for the 3rd gate:
- Stat cards: `totalEntries === 0` (or `dayStreak === 0`, etc.)
- RecentEntriesFeed: `recentEntries.length === 0`
- AIInsights: no skeleton gate — has its own loading state (`isGenerating`)

### Anti-Patterns to Avoid

- **Subscribing to `allEntries` from stat cards, RecentEntriesFeed, WritingPrompts, or AIInsights.** Only MoodTrends and MoodOverview (via local `calculateMoodCounts`) have approved `allEntries` access.
- **Calling `getEntryStats()` from a widget directly.** Stats are fetched once per write action in `entryStore`; widgets read the store primitive.
- **Adding a `useEffect` per new widget that fetches from DB.** Single mount effect in `OverviewView` calls `loadPage()` + `loadTags()`. Everything else reads from the store.
- **Calling `saveContent` on entryStore from `insightService.ts`.** The service is read-only for entries; it only writes to the `settings` table.
- **Persisting the writing-prompt offset to SQLite.** CONTEXT.md D-14 explicitly forbids this — offset is session-only.
- **Showing a toast or dialog when Ollama is unavailable in AIInsights.** DASH-14 / D-18 mandate graceful silent fallback.
- **Mounting `useGlobalShortcuts` outside the State 6 block in App.tsx.** Must not fire during PIN lock, setup, or DB-loading states.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Day of year calculation | Custom date math | `getDayOfYear` from `date-fns@4.1.0` | Already in deps; handles leap years correctly |
| Relative time display ("2 hours ago") | Custom formatter | `formatDistanceToNow` from `date-fns` | Already imported in OverviewView; handles DST/timezones |
| KV settings persistence | Custom localStorage | `INSERT OR REPLACE INTO settings` pattern | Already established by `aiSettingsService.ts`; survives reinstalls |
| Markdown stripping for entry preview | Custom regex | `stripMarkdown` from `src/lib/stripMarkdown.ts` | Already imported in OverviewView; edge-case handling |
| AI availability gating | Custom health check | `useAIStore((s) => s.available)` | Already maintained by App.tsx init flow; checked at app startup |
| LLM call routing | Direct `ollamaService` calls | `hybridAIService.askQuestion` | Established routing contract from v1.0; required by AUTOTAG-02 in Phase 10 |

**Key insight:** Phase 8 is primarily composition, not invention. The data layer (SQL, store, AI), UI primitives (StatCard, MoodOverview, OnThisDay), and styling system (Tailwind tokens, globals.css) are all pre-built. The work is wiring them together correctly.

---

## Common Pitfalls

### Pitfall 1: Re-render Storm from Incorrect `allEntries` Subscriptions
**What goes wrong:** A widget calls `useEntryStore((s) => s.allEntries)` directly. Every 500ms auto-save in the editor produces a new `allEntries` array reference. With the dashboard open in the background (during multi-window or split scenarios), every keystroke forces the widget to re-render.
**Why it happens:** `allEntries.map(...)` in `saveContent` produces a new array — any Zustand subscriber to the array reference re-renders even when its data is unchanged.
**How to avoid:** Only `MoodTrends` and the local `calculateMoodCounts` in `OverviewView` are approved to use `allEntries`. All other widgets use derived primitives: `totalEntries`, `dayStreak`, `entriesThisMonth`, `moodCounts`, `recentEntries`.
**Warning signs:** React DevTools Profiler shows a widget committing during editor typing when the dashboard is mounted.

### Pitfall 2: Calling `getEntryStats()` from `saveContent` (Violates D-05)
**What goes wrong:** Adding the `entriesThisMonth` field and forgetting the D-05 contract — adding `getEntryStats()` to `saveContent` to keep the new field fresh.
**Why it happens:** It feels natural to keep all derived fields up-to-date everywhere. But `saveContent` fires every 500ms during auto-save.
**How to avoid:** `saveContent` must NEVER call `getEntryStats()`. The `entriesThisMonth` count does not change during content edits. The 3 approved call sites are `loadPage`, `createEntry`, `deleteEntry`.
**Warning signs:** `grep "getEntryStats" src/stores/entryStore.ts` returns more than 3 matches.

### Pitfall 3: `navigateToEditor` Receives Invalid NavigateSource
**What goes wrong:** `navigateToEditor(activeView)` is called from `useGlobalShortcuts` where `activeView` could be `"overview"`, `"calendar"`, or `"search"` — none are valid `NavigateSource` values (`"timeline" | "sidebar" | null`).
**Why it happens:** The function is called with the current view as context but the type is narrow.
**How to avoid:** Use `navigateToEditor("timeline")` as a fixed value (the back button always returns to timeline anyway), or pass `null`. The navigation source only affects back-navigation behavior.
**Warning signs:** TypeScript error on the `navigateToEditor` call in the shortcuts hook.

### Pitfall 4: Writing-Prompt `todayIndex` Changing Mid-Session (Midnight Crossing)
**What goes wrong:** `todayIndex = getDayOfYear(new Date())` captured at component mount. If the app runs past midnight, `todayIndex` stays stale from the previous day.
**Why it happens:** `useMemo([], [])` (empty deps) computes once at mount.
**How to avoid:** For Phase 8, this is acceptable — the stale index means today's prompt is off by one until unmount/remount. The CONTEXT.md D-13 specifies "same prompt returned for all calls within a calendar day; changes at local midnight" — a session that spans midnight is an edge case. If needed, add a date dependency to the memo, but this is out of scope for Phase 8.
**Warning signs:** None — this is documented behavior, not a bug.

### Pitfall 5: AI Insights — `settings` Table Missing `created_at` Column
**What goes wrong:** `INSERT OR REPLACE INTO settings (key, value, updated_at)` — the existing `aiSettingsService.ts` includes `created_at` in its insert signature. If the `settings` table schema requires `created_at NOT NULL`, omitting it causes a constraint violation.
**Why it happens:** The `aiSettingsService.ts` pattern uses `(key, value, created_at, updated_at)`. If `insightService.ts` only uses `(key, value, updated_at)`, it may fail.
**How to avoid:** Check the `settings` table schema. From `aiSettingsService.ts` line 42: the column list is `(key, value, created_at, updated_at)`. Use the same 4-column pattern in `insightService.ts`. If updating an existing row (OR REPLACE semantics), pass `Date.now()` for both `created_at` and `updated_at`.

**Verified schema** from `aiSettingsService.ts` example: `INSERT OR REPLACE INTO settings (key, value, created_at, updated_at) VALUES (?, ?, ?, ?)`. Use this exact pattern.

### Pitfall 6: `OnThisDay` Render Position Conflict
**What goes wrong:** `OnThisDay` renders `null` when there are no past entries for today. In Phase 8 it's the last item in the right sidebar column. If it renders null, the sidebar has 4 items instead of 5. This causes an empty gap or layout shift.
**Why it happens:** The `null` return is intentional per UI-SPEC ("OnThisDay renders null — widget simply doesn't appear"). The `flex flex-col gap-4` parent handles this gracefully — no explicit empty slot is needed.
**How to avoid:** No action needed — `null` in a flex column collapses correctly. Don't add a placeholder.
**Warning signs:** None — this is correct behavior.

### Pitfall 7: Stale AI Insight After Settings Table Write Failure
**What goes wrong:** `generateWeeklySummary()` succeeds (LLM returns text) but the `settings` INSERT fails (e.g., disk full). Component state updates with the new text, but next app launch reads `null` from cache (no entry was written).
**Why it happens:** Lack of transaction semantics — two separate `db.execute` calls for `ai_insight_text` and `ai_insight_generated_at`.
**How to avoid:** Either wrap in a transaction, or accept the risk as low-probability (app will just show "No summary yet" on next launch, user re-refreshes). CONTEXT.md D-17 is manual-only refresh, so stale cache is not a breaking UX issue.

---

## Code Examples

### Read Settings KV Row (existing pattern)

```typescript
// Source: verified from src/utils/aiSettingsService.ts
const db = await getDb();
const rows = await db.select<{ value: string }[]>(
  "SELECT value FROM settings WHERE key = 'someKey'"
);
const value = rows.length > 0 ? rows[0].value : null;
```

### Write Settings KV Row (existing pattern)

```typescript
// Source: verified from src/utils/aiSettingsService.ts (line 42)
const db = await getDb();
await db.execute(
  "INSERT OR REPLACE INTO settings (key, value, created_at, updated_at) VALUES (?, ?, ?, ?)",
  ["someKey", someValue, Date.now(), Date.now()]
);
```

### Subscribe to Derived Primitive (correct Zustand pattern)

```typescript
// Source: verified from src/components/OverviewView.tsx (lines 56-57)
const totalEntries = useEntryStore((s) => s.totalEntries);
const dayStreak = useEntryStore((s) => s.dayStreak);
// NOT: const stats = useEntryStore((s) => ({ totalEntries: s.totalEntries, dayStreak: s.dayStreak }));
// (Object selector creates new reference every render — bypasses Zustand equality check)
```

### Window Event Listener Hook Pattern

```typescript
// Source: verified from src/hooks/useIdleTimeout.ts
useEffect(() => {
  const handler = (e: KeyboardEvent) => { /* ... */ };
  window.addEventListener("keydown", handler);
  return () => window.removeEventListener("keydown", handler);
}, [/* deps */]);
```

### `date-fns@4.1.0` Import Pattern (verified)

```typescript
// Source: verified from package.json (date-fns@4.1.0 installed)
// and from src/components/OverviewView.tsx (existing imports)
import { format, formatDistanceToNow, subDays } from "date-fns";
import { getDayOfYear } from "date-fns"; // getDayOfYear confirmed in v4 API
```

### Stacked SVG Bar Column (MoodTrends pattern)

```tsx
// Source: ASSUMED — no existing SVG chart in codebase; standard SVG rect approach
// Each column is a series of stacked <rect> elements with accumulated Y offsets
const BAR_HEIGHT = 80;
const colWidth = 8; // approximate per 30 cols

dayBuckets.map((bucket, colIdx) => {
  let yOffset = 0;
  const totalInDay = Object.values(bucket).reduce((s, n) => s + n, 0);
  return MOODS.map((mood) => {
    const count = bucket[mood] ?? 0;
    if (count === 0 || totalInDay === 0) return null;
    const segHeight = (count / totalInDay) * BAR_HEIGHT;
    const rect = (
      <rect
        key={`${colIdx}-${mood}`}
        x={colIdx * colWidth}
        y={BAR_HEIGHT - yOffset - segHeight}
        width={colWidth - 1}
        height={segHeight}
        fill={moodColors[mood]}
        opacity={0.8}
      />
    );
    yOffset += segHeight;
    return rect;
  });
});
```

---

## Runtime State Inventory

This is not a rename/refactor phase. No runtime state inventory required.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `allEntries.length` for stat display | `getEntryStats().totalEntries` (true DB count) | Phase 7 | Pagination-independent count; 500-entry DB shows 500 not 20 |
| `calculateDayStreak` in OverviewView.tsx (JS + `startOfDay`) | `getEntryStats().dayStreak` (SQL over `local_date`) | Phase 7 | TZ-safe; no DST bugs; streak resets at local midnight |
| `wordsWritten` stat card | `entriesThisMonth` stat card | Phase 8 | DASH-02 explicit; month-relative count more useful as daily driver metric |
| 3-item recent feed | 5-item recent feed (full `recentEntries` primitive) | Phase 8 | DASH-07 explicit; `recentEntries` store already sized to 5 |
| `QuickWriteFAB` only on OverviewView | `QuickWriteFAB` at AppShell level (4 views) | Phase 8 | DASH-09; consistent with global Ctrl/Cmd+N shortcut |
| No keyboard shortcut for new entry | Ctrl/Cmd+N global shortcut | Phase 8 | DASH-09; power user ergonomics |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `getDayOfYear` is exported from `date-fns@4.1.0` | Pattern 7 (WritingPrompts) | Import fails at build time — use `differenceInCalendarDays(date, startOfYear(date)) + 1` as fallback | [ASSUMED — cannot verify v4 API from static file read, but v4 changelog confirms no breaking removals of this function] |
| A2 | `settings` table has `created_at` and `updated_at` columns (not just `key`/`value`) | Pattern 4 (insightService) | INSERT OR REPLACE fails with column mismatch | [ASSUMED from aiSettingsService.ts usage pattern — db.ts schema not directly read] |
| A3 | `hybridAIService.ts` is at `src/lib/hybridAIService.ts` (imported from `src/utils/insightService.ts` as `../lib/hybridAIService`) | Pattern 4 | Module not found at runtime | [VERIFIED: App.tsx imports `import * as hybridAI from "./lib/hybridAIService"` from src root; from src/utils/ the path is `../lib/hybridAIService`] |
| A4 | The SVG stacked bar approach (accumulated Y offset) produces correct visual output for empty-day columns | Pattern 6 (MoodTrends) | Empty columns look wrong; need placeholder rect | [ASSUMED — no existing SVG chart in codebase to verify against] |

---

## Open Questions

1. **`settings` table DDL — `created_at` nullability**
   - What we know: `aiSettingsService.ts` includes `created_at` in its INSERT. The DB migration in `db.ts` defines the table.
   - What's unclear: Whether `created_at` is `NOT NULL` — if it is, omitting it from an INSERT OR REPLACE will error.
   - Recommendation: Read `src/lib/db.ts` MIGRATION_SQL before implementing `insightService.ts` to confirm the column list. Use `created_at` in all inserts as a safe default.

2. **`getDayOfYear` in date-fns v4 — exact import path**
   - What we know: `date-fns@4.1.0` is installed. The function existed in v2/v3.
   - What's unclear: Whether it's still `import { getDayOfYear } from "date-fns"` or moved to a subpath.
   - Recommendation: Confirm at implementation time via `npx tsx -e "import { getDayOfYear } from 'date-fns'; console.log(getDayOfYear(new Date()))"`. Fallback: `Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000)`.

3. **`navigateToEditor` source parameter for global shortcut**
   - What we know: The function signature is `navigateToEditor: (source: NavigateSource) => void` where `NavigateSource = "timeline" | "sidebar" | null`.
   - What's unclear: Whether passing `"timeline"` unconditionally from the shortcut hook causes any back-navigation mismatch.
   - Recommendation: Pass `"timeline"` — the back button always returns to `"timeline"` regardless of where Ctrl+N was pressed, which is correct behavior (you were interrupted mid-browse and came back).

---

## Environment Availability

Step 2.6: SKIPPED — Phase 8 is pure frontend code/UI changes with no new external tool dependencies. SQLite (already running), Ollama (already optional + graceful fallback), and npm packages (all existing) are the only dependencies, all covered by existing app initialization.

---

## Validation Architecture

Step 4: SKIPPED — `workflow.nyquist_validation` is explicitly `false` in `.planning/config.json`.

---

## Security Domain

Phase 8 adds no new authentication, authorization, session management, or cryptography surface. All AI calls are local (localhost). The `settings` KV table writes use the same parameterized `db.execute` pattern as all other DB writes. The global keyboard shortcut is gated to State 6 (unlocked) — no security surface expansion.

ASVS categories: V5 Input Validation (AI context string is user-owned journal content passed to local LLM only — no external service). No new attack surface introduced.

---

## Sources

### Primary (HIGH confidence — verified from codebase)
- `src/stores/entryStore.ts` — derived selectors API, refresh call sites (loadPage/createEntry/deleteEntry/saveContent), `stableRecentSlice`, `computeMoodCounts`
- `src/lib/dbQueries.ts` — `getEntryStats()` return shape (5 fields including `thisMonth`)
- `src/components/OverviewView.tsx` — current layout, `calculateMoodCounts`, `recentEntries` subscription pattern
- `src/components/AppShell.tsx` — current structure for FAB hoisting
- `src/App.tsx` — State 6 mounting point for `useGlobalShortcuts`
- `src/hooks/useIdleTimeout.ts` — hook shape reference for `useGlobalShortcuts`
- `src/utils/aiSettingsService.ts` — `INSERT OR REPLACE` KV pattern, 4-column signature
- `src/stores/aiStore.ts` — `available: boolean` field for Ollama gating
- `src/lib/hybridAIService.ts` — `askQuestion(question, context)` signature
- `src/stores/viewStore.ts` — `activeView: "overview"` default, `NavigateSource` type
- `src/components/QuickWriteFAB.tsx` — current aria-label + CSS classes to modify
- `src/components/StatCard.tsx` — `suffix` prop capability
- `src/components/MoodOverview.tsx` — reuse AS-IS, `moodCounts` prop
- `src/components/OnThisDay.tsx` — reuse AS-IS, `null` render behavior
- `.planning/phases/08-home-dashboard-widgets/08-CONTEXT.md` — 25 locked decisions + 7 discretion items
- `.planning/phases/08-home-dashboard-widgets/08-UI-SPEC.md` — visual contract, widget specs, copywriting
- `.planning/phases/07-foundation-derived-state/07-VERIFICATION.md` — confirmed Phase 7 primitives all shipped

### Secondary (MEDIUM confidence)
- `package.json` — `date-fns@4.1.0` version confirmed, zero new deps required
- `.planning/STATE.md` — carried decisions: hybridAIService routing, no new stores, derived-selector contract

### Tertiary (LOW confidence — from training knowledge, not verified against running code)
- A1: `getDayOfYear` exact import in date-fns v4 — flagged in Assumptions Log
- A4: SVG stacked bar rendering approach for MoodTrends — no existing chart in codebase

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — all deps verified from package.json and live codebase reads
- Architecture: HIGH — all integration points verified from live source files; Phase 7 primitives confirmed shipped in VERIFICATION.md
- Pitfalls: HIGH — derived from actual codebase patterns (saveContent D-05 contract, NavigateSource types)
- Code Examples: HIGH for store/SQL/hook patterns (verified); MEDIUM for SVG chart (inferred from SVG spec)

**Research date:** 2026-04-18
**Valid until:** 2026-05-18 (30 days — stable stack)
