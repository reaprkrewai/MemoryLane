---
phase: 08-home-dashboard-widgets
reviewed: 2026-04-18T00:00:00Z
depth: standard
files_reviewed: 12
files_reviewed_list:
  - src/stores/entryStore.ts
  - src/lib/writingPrompts.ts
  - src/components/OverviewView.tsx
  - src/components/dashboard/RecentEntriesFeed.tsx
  - src/components/dashboard/MoodTrends.tsx
  - src/components/dashboard/WritingPrompts.tsx
  - src/components/dashboard/AIInsights.tsx
  - src/utils/insightService.ts
  - src/components/QuickWriteFAB.tsx
  - src/components/AppShell.tsx
  - src/hooks/useGlobalShortcuts.ts
  - src/App.tsx
findings:
  critical: 0
  warning: 0
  info: 2
  total: 2
status: clean
---

# Phase 8: Code Review Report

**Reviewed:** 2026-04-18
**Depth:** standard
**Files Reviewed:** 12
**Status:** clean (2 informational notes, no actionable issues)

---

## Summary

All 12 Phase 8 source files were reviewed against the CONTEXT.md locked decisions (D-01..D-25), UI-SPEC visual contracts, and the 10 focus areas specified in the review brief. No critical issues, no warnings, and no code quality defects that warrant action were found.

The implementation is technically sound: the D-05 contract is intact (`saveContent` and `updateMood` do not call `getEntryStats()`), the `hybridAIService` routing is correct (zero direct `ollamaService` calls in `insightService.ts`), all SQL writes are parameterized, the FAB and shortcut guards match the spec, and XSS surface is zero (`dangerouslySetInnerHTML` absent from all dashboard components, LLM output rendered via React text-node children).

Two informational notes are recorded below. Neither represents a bug or a quality defect — they document accepted design trade-offs that are already acknowledged in the planning artifacts.

---

## Info

### IN-01: AIInsights.handleRefresh — no unmount cancellation guard

**File:** `src/components/dashboard/AIInsights.tsx:38-62`
**Issue:** `handleRefresh` is an async function that calls `await generateWeeklySummary()` and then calls `setText`, `setGeneratedAt`, and `setNotEnough` after the await resolves. If the component unmounts while the LLM call is in-flight (e.g., user navigates away mid-generation), those `setState` calls will execute on an unmounted component. React 18+ does not crash on this and suppressed the warning; however, the pattern diverges from the `readInsightCache` `useEffect` in the same file (lines 20-35), which correctly uses a `cancelled` flag to guard the `.then()` callbacks.

**Impact:** No crash, no data corruption. In React 19 (this project uses `react@^19.1.0`), state updates on unmounted components are silently dropped, so the functional impact is nil. Noted for consistency with the cancellation pattern already established in the same component.

**Fix (optional):** Add an `isMounted` ref guard matching the `useEffect` pattern already in the same file:
```typescript
const isMounted = useRef(true);
useEffect(() => () => { isMounted.current = false; }, []);

const handleRefresh = async () => {
  if (!available || isGenerating) return;
  setIsGenerating(true);
  setNotEnough(false);
  try {
    const summary = await generateWeeklySummary();
    if (!isMounted.current) return;
    setText(summary);
    setGeneratedAt(Date.now());
  } catch (err: unknown) {
    if (!isMounted.current) return;
    // ... existing error handling
  } finally {
    if (isMounted.current) setIsGenerating(false);
  }
};
```
Given the React 19 runtime this is a polish item, not a required fix.

---

### IN-02: insightService — two-write cache is not atomic; partial failure leaves text without timestamp

**File:** `src/utils/insightService.ts:81-89`
**Issue:** `generateWeeklySummary` writes `ai_insight_text` and `ai_insight_generated_at` as two sequential `db.execute` calls. If the process is interrupted (app crash, power loss, Tauri process kill) between the two writes, the cache will contain a summary string with no `generated_at` timestamp. On next mount, `readInsightCache` returns `{ text: "...", generatedAt: null }` — the summary renders correctly but the "Generated N ago" freshness label does not appear beneath it.

**Impact:** Visual-only: the freshness metadata is missing. The summary text itself is correct. User experience degradation is minor and self-healing on the next successful Refresh. This trade-off is explicitly acknowledged in the code comment at line 78-80: *"Two separate writes — acceptable per Pitfall 7 (stale cache on partial failure is low-severity: user re-clicks Refresh)."*

**Fix (optional, if atomic writes become a concern):** Wrap both INSERTs in a transaction using `db.execute("BEGIN")` / `db.execute("COMMIT")` / `db.execute("ROLLBACK")`. Given SQLite's durability guarantees on Tauri and the low probability of mid-write crashes on desktop, this is not required for v1.1.

---

## Verified Clean — Focus Area Checklist

The following Phase 8 specific checks all passed:

| Check | Result | Evidence |
|-------|--------|----------|
| D-05: `saveContent` does NOT call `getEntryStats()` | PASS | Lines 198-238: no `getEntryStats` call; only `computeMoodCounts` + `stableRecentSlice` |
| D-05: `updateMood` does NOT call `getEntryStats()` | PASS | Lines 240-265: comment at 258 is documentation, not a call; no live invocation |
| `getEntryStats` call sites = 3 (not in saveContent/updateMood) | PASS | Lines 164, 183, 308 — exactly `loadPage`, `createEntry`, `deleteEntry` |
| `hybridAIService` routing — no direct `ollamaService` import | PASS | `insightService.ts` imports `* as hybridAI from "../lib/hybridAIService"` only; grep count 0 for `ollamaService` |
| XSS — `dangerouslySetInnerHTML` count in dashboard components | PASS | 0 occurrences across all 4 dashboard components |
| SQL injection — settings writes parameterized | PASS | Both INSERTs use `(?, ?, ?)` with compile-time key constants |
| SQL injection — 7-day query parameterized | PASS | `WHERE created_at >= ?` with `[cutoff]` parameter |
| `allEntries` subscriptions outside approved exception | PASS | `MoodTrends` is the only new component subscribing to `allEntries`; bounded by `useMemo([allEntries])` |
| `RecentEntriesFeed` subscribes to `allEntries.length` (primitive) not `allEntries` | PASS | `useEntryStore((s) => s.allEntries.length)` returns a number — re-renders only on length change |
| FAB `aria-label="New entry"` | PASS | `QuickWriteFAB.tsx:16` |
| FAB `focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2` | PASS | `QuickWriteFAB.tsx:11` className |
| `useGlobalShortcuts` `isTypingContext()` guard | PASS | `useGlobalShortcuts.ts:46` — INPUT/TEXTAREA/contentEditable check |
| `useGlobalShortcuts` `isLocked` + `isDbReady` gate | PASS | `useGlobalShortcuts.ts:52` — fire-time store read via `useUiStore.getState()` |
| `useGlobalShortcuts` editor/settings view gate | PASS | `useGlobalShortcuts.ts:58` — belt-and-suspenders `activeView` check |
| `PROMPTS` is `readonly string[]` + `as const` | PASS | `writingPrompts.ts:11` — `export const PROMPTS: readonly string[] = [...] as const` |
| PROMPTS count = 60 | PASS | 12 per theme × 5 themes = 60 flat entries |
| `getDayOfYear` usage for prompt cycling | PASS | `WritingPrompts.tsx:13` — `getDayOfYear(new Date())` from `date-fns@4.1.0` |
| `date-fns` already in package.json | PASS | `"date-fns": "^4.1.0"` |
| No new runtime dependencies | PASS | All Phase 8 imports resolve to existing package.json entries |
| `entriesThisMonth` absent from `saveContent` | PASS | Lines 198-238: field not referenced |
| `entriesThisMonth` absent from `updateMood` | PASS | Lines 240-265: field not referenced |
| Triple-gate skeleton (`isLoadingPage && allEntries.length === 0 && totalEntries === 0`) | PASS | `RecentEntriesFeed.tsx:19`, `MoodTrends.tsx:57` |
| `AIInsights` renders LLM text as React text-node | PASS | `AIInsights.tsx:130` — `<p>{text}</p>` |
| `AIInsights` Refresh button always visible | PASS | Button at lines 87-99 is outside all conditional branches |
| `AIInsights` silent no-op when Ollama down | PASS | `handleRefresh` returns early on `!available` (line 40), no toast/dialog |
| `insightService` queries DB directly, not `allEntries` store | PASS | Uses `db.select()` directly; `allEntries` has 0 occurrences in the file |
| `useGlobalShortcuts` `addEventListener`/`removeEventListener` symmetric | PASS | One `addEventListener` at line 74, one `removeEventListener` at line 75 (cleanup) |
| `useGlobalShortcuts` mounted in App.tsx | PASS | `App.tsx:134` — called unconditionally at component top level; guards itself at fire-time (only valid pattern for hooks — cannot be inside a conditional branch) |
| FAB conditional on `activeView ∈ {overview, timeline, calendar, search}` | PASS | `AppShell.tsx:7,16` — `FAB_VISIBLE_VIEWS` + `.includes(activeView)` |
| `MoodTrends` `created_at` unit match (milliseconds) | PASS | Schema uses `unixepoch('now') * 1000`; `subDays(...).getTime()` and `86400000` divisor are also milliseconds |
| `AIInsights` 3-column settings INSERT (not 4-column) | PASS | `insightService.ts:83,87` — `(key, value, updated_at)` only |
| Streak capped at `Math.min(dayStreak, 7)` | PASS | `OverviewView.tsx:124` |
| `OverviewView` does not render `QuickWriteFAB` or `QuickActions` | PASS | Neither component imported or rendered in the refactored file |

---

_Reviewed: 2026-04-18_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
