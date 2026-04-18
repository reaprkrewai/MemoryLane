---
phase: 08-home-dashboard-widgets
plan: "03"
subsystem: components+dashboard
tags: [dashboard, widgets, svg, static-data, prompts, visualization]
dependency_graph:
  requires: [08-01-writing-prompts-library, 08-02-stub-widgets, 07-FOUND-01]
  provides: [MoodTrends-component, WritingPrompts-component]
  affects:
    - src/components/dashboard/MoodTrends.tsx
    - src/components/dashboard/WritingPrompts.tsx
tech_stack:
  added: []
  patterns: [inline-svg-chart, useMemo-bounded-allEntries, deterministic-day-of-year-index, local-useState-offset]
key_files:
  modified:
    - src/components/dashboard/MoodTrends.tsx
    - src/components/dashboard/WritingPrompts.tsx
decisions:
  - "MoodTrends uses useMemo([allEntries]) as the single D-08 approved allEntries exception — bounded to widget-local bucketing only"
  - "BAR_HEIGHT=80 SVG viewport; COL_WIDTH=8; SVG_WIDTH=240 (30 columns × 8 units)"
  - "30-day cutoff via subDays(new Date(), 30).getTime(); daysAgo bucketed as floor((todayMs - created_at) / 86400000)"
  - "WritingPrompts offset via useState<number>(0); setOffset((prev) => prev + 1) — resets on unmount, no persistence"
  - "No CSS animations on MoodTrends bars (ANIM-01 deferred to Phase 11)"
  - "Empty state renders inline SVG faint placeholder bars (not just text) to keep visual slot filled"
metrics:
  duration_minutes: 8
  completed: "2026-04-18"
  tasks_completed: 2
  files_changed: 2
requirements: [DASH-04, DASH-10, DASH-11]
---

# Phase 08 Plan 03: MoodTrends & WritingPrompts Widgets Summary

**One-liner:** MoodTrends 30-day stacked-bar inline SVG chart with `useMemo([allEntries])` bucketing and WritingPrompts deterministic `getDayOfYear % PROMPTS.length` daily prompt with local offset cycling.

## Tasks Completed

| # | Name | Commit | Key Files |
|---|------|--------|-----------|
| 1 | Implement MoodTrends 30-day stacked-bar SVG chart | d1ec7dc | src/components/dashboard/MoodTrends.tsx |
| 2 | Implement WritingPrompts deterministic daily prompt + cycling | 88ee304 | src/components/dashboard/WritingPrompts.tsx |

## MoodTrends Implementation Details

### SVG Viewport Dimensions

| Constant | Value | Purpose |
|----------|-------|---------|
| `BAR_HEIGHT` | `80` | SVG viewport height in SVG units |
| `COL_WIDTH` | `8` | Per-column width in SVG units |
| `SVG_WIDTH` | `240` (30 × 8) | Total SVG viewport width |
| `DAYS` | `30` | Number of columns (days) |

### Bucketing Logic

```typescript
const cutoff = subDays(new Date(), DAYS).getTime();
const daysAgo = Math.floor((todayMs - e.created_at) / 86400000);
const colIndex = DAYS - 1 - daysAgo; // rightmost = today
```

- 30-day window: `subDays(new Date(), 30).getTime()` cutoff
- Column 0 = 29 days ago; column 29 = today (rightmost)
- Entries with `created_at < cutoff` or `daysAgo >= DAYS` are skipped
- Only entries with a valid mood key in the 5-mood set are bucketed

### allEntries Subscription (D-08 Exception)

```typescript
const allEntries = useEntryStore((s) => s.allEntries);
// ...
const dayBuckets = useMemo(() => { /* bucketing */ }, [allEntries]);
```

Exactly one `useEntryStore((s) => s.allEntries)` call. Bucketing wrapped in `useMemo([allEntries])` — recomputes only when `allEntries` identity changes, not on other store primitive updates.

### Empty State

When `hasAnyMood === false` (zero mood entries in last 30 days):
- Inline SVG renders 30 faint placeholder bars (`fill="var(--color-border-subtle)"`, `opacity={0.3}`, height 6 units from bottom)
- Text copy: `"Your mood story unfolds here"` centered below the SVG

### Triple-Gate Skeleton

```typescript
const showSkeleton = isLoadingPage && allEntries.length === 0 && totalEntries === 0;
```

Skeleton = loading state (all three conditions true). Empty state = loaded with no mood data.

## WritingPrompts Implementation Details

### Offset Mechanism

```typescript
const [offset, setOffset] = useState<number>(0);
const todayIndex = useMemo(() => getDayOfYear(new Date()), []);
const displayIndex = (todayIndex + offset) % PROMPTS.length;
```

- `todayIndex` captured once per mount (empty deps — midnight crossing is documented Pitfall 4, out-of-scope Phase 8)
- `offset` starts at 0, increments by 1 on each "Another prompt" click
- `displayIndex` wraps around via modulo so offset can grow indefinitely without bounds errors
- Offset resets to 0 on component unmount (default React useState behavior)

### Prompt Import

```typescript
import PROMPTS from "../../lib/writingPrompts";
```

Default import of `readonly string[]` from Plan 01's 60-item library. No defensive null-check needed — Plan 01 acceptance criterion guarantees 60 items.

## Security Verification

| Threat | Check | Result |
|--------|-------|--------|
| XSS via prompt strings | `grep -c "dangerouslySetInnerHTML" WritingPrompts.tsx` | 0 — prompts rendered via React children text-node |
| XSS via SVG content | All SVG attribute values are numeric (colIdx, segHeight, yOffset) or hardcoded hex colors | No user strings injected into SVG |
| Network calls | `grep -c "fetch(" MoodTrends.tsx WritingPrompts.tsx` | 0 |
| DB writes | `grep -c "db.execute\|INSERT OR REPLACE" MoodTrends.tsx WritingPrompts.tsx` | 0 |
| localStorage | `grep -c "localStorage" WritingPrompts.tsx` | 0 |

## Deviations from Plan

None — plan executed exactly as written. Both widgets implement the full specification from UI-SPEC §3 and §7 respectively.

## Deviations from UI-SPEC §3 (MoodTrends)

None. The x-axis anchor labels (`30d`, `15d`, `today`) mentioned as optional in UI-SPEC §3 were omitted — the spec says "minimal x-axis labels: show only..." but the plan's action block and acceptance criteria do not include them, and they are not referenced in the must_haves. The legend of 5 inline dots with mood-key labels is present per Test 10.

## Deviations from UI-SPEC §7 (WritingPrompts)

None — all spec requirements implemented exactly.

## Known Stubs

None — both widgets are fully implemented. The `TODO(Plan 03)` markers have been removed from both files (verified by grep returning 0).

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes introduced.

- `MoodTrends`: derives data from in-memory `allEntries` (read-only); renders pure SVG markup. No I/O surface.
- `WritingPrompts`: renders compile-time string literal from bundled array. No I/O surface.

T-08-03-01 mitigated: `{prompt}` rendered via React children — auto-escaped.
T-08-03-02 mitigated: SVG rect attributes are numeric computed values and hardcoded hex strings.
T-08-03-03 mitigated: `useMemo([allEntries])` bounds recomputation.

## Self-Check: PASSED

- `src/components/dashboard/MoodTrends.tsx` exists: FOUND
- `src/components/dashboard/WritingPrompts.tsx` exists: FOUND
- Commit d1ec7dc (Task 1 — MoodTrends) exists: FOUND
- Commit 88ee304 (Task 2 — WritingPrompts) exists: FOUND
- `npx tsc --noEmit` exits 0: PASSED
- `npm run build` exits 0: PASSED
- `useEntryStore((s) => s.allEntries)` count in MoodTrends: 1 — PASSED
- `useMemo(` count in MoodTrends: 4 (dayBuckets, hasAnyMood, and 2 derived memos) — PASSED (≥2)
- `[allEntries]` dependency present in MoodTrends: PASSED
- All 5 mood hex colors in MoodTrends: PASSED (grep count 5)
- `<svg` with `viewBox=` in MoodTrends: PASSED
- `BAR_HEIGHT` constant in MoodTrends: PASSED
- `role="img"` on SVG in MoodTrends: PASSED
- `TODO(Plan 03)` in MoodTrends: 0 — PASSED
- `fetch(` in MoodTrends: 0 — PASSED
- `animate-` in MoodTrends: 0 — PASSED
- Card shell classes in MoodTrends: `rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5` — PASSED
- `getDayOfYear` in WritingPrompts: 3 (import + useMemo call + comment) — PASSED
- `import PROMPTS from` in WritingPrompts: 1 — PASSED
- `useState<number>(0)` in WritingPrompts: 1 — PASSED
- `setOffset((prev) => prev + 1)` in WritingPrompts: 1 — PASSED
- `TODO(Plan 03)` in WritingPrompts: 0 — PASSED
- `dangerouslySetInnerHTML\|localStorage\|db.execute\|INSERT OR REPLACE` in WritingPrompts: 0 — PASSED
- `data-onboarding="writing-prompts"` in WritingPrompts: PASSED
- `border-l-2 border-[var(--color-primary)]` in WritingPrompts: PASSED
- `Another prompt` literal in WritingPrompts: PASSED
- `Today's prompt` literal in WritingPrompts: PASSED
