---
phase: 08-home-dashboard-widgets
plan: "04"
subsystem: utils+components/dashboard
tags: [dashboard, ai, ollama, hybrid-ai, llm, cache, settings-kv, xss-hardening]
dependency_graph:
  requires: [08-02-AIInsights-stub, 07-FOUND-01, hybridAIService, aiStore]
  provides: [insightService, AIInsights-widget-live]
  affects:
    - src/utils/insightService.ts
    - src/components/dashboard/AIInsights.tsx
tech_stack:
  added: []
  patterns: [hybridAI-routing, settings-kv-3col-insert, pagination-independent-sql, zustand-primitive-selector, react-children-xss-safe]
key_files:
  created:
    - src/utils/insightService.ts
  modified:
    - src/components/dashboard/AIInsights.tsx
decisions:
  - "LLM routed through hybridAI.askQuestion — never ollamaService directly (Phase 10 AUTOTAG-02 copies this pattern)"
  - "Settings KV write uses 3-column INSERT OR REPLACE matching db.ts DDL (aiSettingsService.ts 4-col form avoided)"
  - "No auto-generate on mount — waits for explicit Refresh click (D-17, respects battery + user agency)"
  - "Silent no-op on Refresh when Ollama unavailable — no toast, no dialog (D-18 graceful fallback)"
  - "Summary text rendered via React children — no dangerouslySetInnerHTML (T-08-04-02 XSS hardening)"
metrics:
  duration_minutes: 20
  completed: "2026-04-18"
  tasks_completed: 2
  files_changed: 2
requirements: [DASH-12, DASH-13, DASH-14]
---

# Phase 08 Plan 04: AI Insights Pipeline Summary

**One-liner:** `insightService.ts` provides a pagination-independent 7-day SQL read + `hybridAI.askQuestion` LLM call + 3-column `settings` KV cache; `AIInsights.tsx` widget drives 4 conditional states with manual Refresh gated on `aiStore.available`.

## Tasks Completed

| # | Name | Commit | Key Files |
|---|------|--------|-----------|
| 1 | Create insightService.ts — 7-day SQL + hybridAI call + settings cache | 77c5dc3 | src/utils/insightService.ts |
| 2 | Implement AIInsights widget — cache read + Refresh + 4 conditional states | a6b29bc | src/components/dashboard/AIInsights.tsx |

## insightService API

```typescript
export interface InsightCache {
  text: string | null;
  generatedAt: number | null;
}

export async function readInsightCache(): Promise<InsightCache>
export async function generateWeeklySummary(): Promise<string>
```

**`readInsightCache()`** — single `SELECT key, value FROM settings WHERE key IN (?, ?)` for keys `ai_insight_text` and `ai_insight_generated_at`. Returns `{ text: string|null, generatedAt: number|null }`. Never throws (cache miss returns nulls).

**`generateWeeklySummary()`** — queries last 7 days of entries, calls `hybridAI.askQuestion`, writes both cache rows, returns the summary string. Throws `Error("NOT_ENOUGH_ENTRIES")` when zero entries exist in the window.

## SQL Query Used

```sql
SELECT content FROM entries WHERE created_at >= ? ORDER BY created_at DESC
```

Parameter: `Date.now() - 7 * 86400 * 1000` (unix ms cutoff). Direct `db.select` call — never iterates the Zustand store (FOUND-02 pagination-independent contract).

## Cache Write Form (3-column — SCHEMA-CORRECT)

```typescript
await db.execute(
  "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)",
  [KEY_TEXT, answer, now]
);
await db.execute(
  "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)",
  [KEY_AT, String(now), now]
);
```

This is the 3-column form matching the `settings` DDL in `db.ts` (3 columns: `key`, `value`, `updated_at`). The 4-column form in `aiSettingsService.ts` (`created_at` is not a real column) was explicitly avoided.

## AIInsights Conditional States

| State | Trigger | Content |
|-------|---------|---------|
| isGenerating | `isGenerating === true` | Two skeleton pulse bars + "Generating…" caption |
| unavailable | `!available` (aiStore) | Sparkles icon (40% opacity) + "Insight unavailable" + "Start Ollama to generate your weekly summary." |
| notEnough | `available && notEnough` | "Not enough entries yet" + "Keep writing — your first weekly insight arrives after a few entries." |
| cached text | `available && text` | Summary paragraph + "Generated {relativeTime}" |
| no cache | `available && !text && !notEnough` | "No summary yet" + "Click Refresh insight to generate your weekly insight." |

The Refresh button ("Refresh insight" + `RefreshCw` icon) is **always visible** in the header row — outside all conditional branches — per DASH-14.

## Security / XSS Hardening Confirmations

- `dangerouslySetInnerHTML` — **ZERO occurrences** in `AIInsights.tsx` (verified by grep)
- Summary text rendered as `<p>{text}</p>` — React auto-escapes `<`, `>`, `&`, `"`, `'`
- `toast()`, `Dialog`, `alert(` — **ZERO occurrences** in `AIInsights.tsx` (D-18 silent fallback)
- `ollamaService` — **ZERO occurrences** in both new files (hybridAIService routing contract upheld)

## Relative Time Format

```typescript
formatDistanceToNow(new Date(generatedAt), { addSuffix: true })
// e.g. "Generated 2 hours ago", "Generated 3 days ago"
```

From `date-fns@4.1.0` (already in project deps). Rendered below the summary text only when `generatedAt !== null`.

## Refresh Flow (D-17 + D-18)

1. User clicks "Refresh insight"
2. `if (!available) return` — silent no-op when Ollama down (no toast, no dialog)
3. `if (isGenerating) return` — re-entrancy guard (T-08-04-07)
4. `setIsGenerating(true)` — spinner on icon, skeleton bars in body
5. `await generateWeeklySummary()` — SQL read → LLM call → cache write
6. On `"NOT_ENOUGH_ENTRIES"`: `setText(null); setNotEnough(true)` — inline empty state
7. On other error: `console.error(...)` only — no toast, no dialog (D-18)
8. `finally { setIsGenerating(false) }` — always clears spinner

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. The AIInsights stub from Plan 02 has been fully replaced with a working implementation. Both files are complete.

## Threat Surface Scan

No new network endpoints introduced. All LLM calls go to localhost only (hybridAIService invariant). No new auth paths, file access patterns, or schema changes.

- T-08-04-02 (XSS via LLM output): Mitigated — `{text}` renders as text-node via React children. Zero `dangerouslySetInnerHTML` in widget.
- T-08-04-06 (SQL injection in settings write): Mitigated — both INSERTs use parameterized queries; keys are compile-time constants.
- T-08-04-07 (Refresh spam): Mitigated — `isGenerating` guard + `disabled={isGenerating}` prevent concurrent calls.

## Self-Check: PASSED

- `src/utils/insightService.ts` exists: FOUND
- `src/components/dashboard/AIInsights.tsx` modified (stub replaced): FOUND
- Commit 77c5dc3 (Task 1) exists: FOUND
- Commit a6b29bc (Task 2) exists: FOUND
- `npx tsc --noEmit` exits 0: PASSED
- `npm run build` exits 0: PASSED
- `grep -c "dangerouslySetInnerHTML" src/components/dashboard/AIInsights.tsx` = 0: PASSED
- `grep -c "ollamaService" src/utils/insightService.ts` = 0: PASSED
- `grep -c "allEntries" src/utils/insightService.ts` = 0: PASSED
- `grep -c "INSERT OR REPLACE INTO settings (key, value, updated_at)" src/utils/insightService.ts` = 2: PASSED
- `grep -c "hybridAI.askQuestion(" src/utils/insightService.ts` = 1: PASSED
- `grep -c "NOT_ENOUGH_ENTRIES" src/utils/insightService.ts` = 2 (throw + JSDoc): PASSED
- `grep -c "WHERE created_at >= ?" src/utils/insightService.ts` = 1: PASSED
- `grep -c "useAIStore((s) => s.available)" src/components/dashboard/AIInsights.tsx` = 1: PASSED
- `grep -c 'data-onboarding="ai-insights"' src/components/dashboard/AIInsights.tsx` = 1: PASSED
