---
phase: 08-home-dashboard-widgets
plan: "02"
subsystem: components+dashboard
tags: [dashboard, overview, refactor, layout, stat-cards, extract, stubs]
dependency_graph:
  requires: [08-01-entriesThisMonth-primitive, 07-FOUND-01]
  provides: [RecentEntriesFeed-component, MoodTrends-stub, WritingPrompts-stub, AIInsights-stub, OverviewView-phase8-layout]
  affects:
    - src/components/OverviewView.tsx
    - src/components/dashboard/RecentEntriesFeed.tsx
    - src/components/dashboard/MoodTrends.tsx
    - src/components/dashboard/WritingPrompts.tsx
    - src/components/dashboard/AIInsights.tsx
tech_stack:
  added: []
  patterns: [extracted-dashboard-component, stub-widget, triple-gate-skeleton, primitive-selector-per-line]
key_files:
  modified:
    - src/components/OverviewView.tsx
  created:
    - src/components/dashboard/RecentEntriesFeed.tsx
    - src/components/dashboard/MoodTrends.tsx
    - src/components/dashboard/WritingPrompts.tsx
    - src/components/dashboard/AIInsights.tsx
decisions:
  - "entriesThisMonth wired via useEntryStore((s) => s.entriesThisMonth) from Plan 01 primitive"
  - "Streak capped at Math.min(dayStreak, 7) with suffix='/7' and label='this week' per D-07"
  - "RecentEntriesFeed extracted as self-contained component — reads own stores, no props"
  - "QuickActions and QuickWriteFAB removed from OverviewView (FAB moves to AppShell Plan 05)"
  - "allEntries subscription retained in OverviewView only for calculateMoodCounts (D-08 approved exception)"
  - "Three stub widgets ship with card shell + correct titles + TODO markers for Plans 03/04"
metrics:
  duration_minutes: 15
  completed: "2026-04-18"
  tasks_completed: 3
  files_changed: 5
requirements: [DASH-01, DASH-02, DASH-03, DASH-05, DASH-06, DASH-07]
---

# Phase 08 Plan 02: OverviewView Refactor & Dashboard Layout Summary

**One-liner:** OverviewView refactored to Phase 8 layout — 4 stat cards with `entriesThisMonth` and capped streak `/7`, `RecentEntriesFeed` extracted as standalone component, 5-widget right sidebar wired, three stub widgets created for Plans 03/04.

## Tasks Completed

| # | Name | Commit | Key Files |
|---|------|--------|-----------|
| 1 | Create RecentEntriesFeed component (extract from OverviewView) | 507a261 | src/components/dashboard/RecentEntriesFeed.tsx |
| 2 | Create stub widget files for Plans 03 & 04 | 72352ff | src/components/dashboard/MoodTrends.tsx, WritingPrompts.tsx, AIInsights.tsx |
| 3 | Refactor OverviewView — 4 stat cards, 5-item feed, 5-widget sidebar, remove FAB+QuickActions | 1d0ba07 | src/components/OverviewView.tsx |

## Stat Card Configuration

| # | Icon | Label | Value Source | Variant | Suffix |
|---|------|-------|-------------|---------|--------|
| 1 | `BookOpen` | `total entries` | `useEntryStore((s) => s.totalEntries)` | `blue` | none |
| 2 | `CalendarDays` | `this month` | `useEntryStore((s) => s.entriesThisMonth)` | `violet` | none |
| 3 | `Flame` | `this week` | `Math.min(dayStreak, 7)` | `amber` | `/7` |
| 4 | `Tag` | `tags created` | `tags.length` | `emerald` | none |

## Streak Capping Expression

```typescript
value={Math.min(dayStreak, 7)}
suffix="/7"
label="this week"
```

Streak card renders the lesser of the actual streak or 7, preventing infinite-counter anti-pattern per DASH-03 / D-07. Verified by `grep -c "Math.min(dayStreak, 7)" src/components/OverviewView.tsx` returning 1.

## RecentEntriesFeed Extraction

- **File:** `src/components/dashboard/RecentEntriesFeed.tsx`
- **Self-contained:** reads `recentEntries`, `isLoadingPage`, `totalEntries`, `allEntries.length`, `selectEntry`, `createEntry` from stores — zero props
- **5-item feed:** subscribes to full `recentEntries` primitive (no `.slice(0, 3)` — D-06)
- **Triple-gate skeleton:** `isLoadingPage && allEntriesLength === 0 && totalEntries === 0` (D-10)
- **Empty state:** Pencil icon + "No entries yet" + "Write your first entry" link
- **Preview:** `stripMarkdown(entry.content).slice(0, 140).trim()` with `line-clamp-2`
- **Click:** `selectEntry(id)` then `navigateToEditor("timeline")`

## Stub Widgets Created

| File | Export | Title | TODO Marker | data-onboarding |
|------|--------|-------|-------------|-----------------|
| `src/components/dashboard/MoodTrends.tsx` | `MoodTrends` | `Mood trends` | `TODO(Plan 03)` | none |
| `src/components/dashboard/WritingPrompts.tsx` | `WritingPrompts` | `Today's prompt` | `TODO(Plan 03)` | `writing-prompts` |
| `src/components/dashboard/AIInsights.tsx` | `AIInsights` | `Weekly insight` | `TODO(Plan 04)` | `ai-insights` |

All stubs: zero imports, zero store subscriptions, zero `useEffect`/`useState`, zero side effects.

## QuickActions + QuickWriteFAB Removal

- `QuickActions` import and render: removed from OverviewView (superseded by FAB + sidebar per D-03)
- `QuickWriteFAB` import and render: removed from OverviewView (hoists to AppShell in Plan 05)
- `setView` selector: removed from OverviewView (no longer needed without QuickActions)
- `grep -c "QuickActions\|QuickWriteFAB" src/components/OverviewView.tsx` returns 0

## DASH-01 Verification

`src/stores/viewStore.ts` line 20: `activeView: "overview",` — unchanged. Plan 02 did not touch viewStore.

## Right Sidebar Widget Order (D-03)

```tsx
<MoodOverview moodCounts={moodCounts} />   {/* existing — unchanged */}
<MoodTrends />                              {/* stub — Plan 03 fills */}
<WritingPrompts />                          {/* stub — Plan 03 fills */}
<AIInsights />                              {/* stub — Plan 04 fills */}
<OnThisDay />                               {/* existing — unchanged */}
```

## Deviations from Plan

None — plan executed exactly as written. All acceptance criteria met.

## Known Stubs

| Stub | File | Reason |
|------|------|--------|
| `MoodTrends` body | `src/components/dashboard/MoodTrends.tsx` | Intentional — Plan 03 implements 30-day SVG bar chart |
| `WritingPrompts` body | `src/components/dashboard/WritingPrompts.tsx` | Intentional — Plan 03 implements day_of_year prompt cycling |
| `AIInsights` body | `src/components/dashboard/AIInsights.tsx` | Intentional — Plan 04 implements insightService + Ollama gating |

These stubs are by design — they establish the correct export signatures and card shell layout so Plans 03/04 can drop in real implementations without touching OverviewView.tsx.

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes introduced.

- `RecentEntriesFeed`: entry preview rendered via `{preview}` text-node (React auto-escapes). `stripMarkdown()` neutralizes Markdown/HTML. No `dangerouslySetInnerHTML`. T-08-02-01 mitigated.
- Stub widgets: no store subscriptions, no I/O, no rendering of user content. Zero threat surface.
- `OverviewView`: only change is import reorganization and layout restructuring. No new data access patterns.

## Self-Check: PASSED

- `src/components/dashboard/RecentEntriesFeed.tsx` exists: FOUND
- `src/components/dashboard/MoodTrends.tsx` exists: FOUND
- `src/components/dashboard/WritingPrompts.tsx` exists: FOUND
- `src/components/dashboard/AIInsights.tsx` exists: FOUND
- `src/components/OverviewView.tsx` modified: FOUND
- Commit 507a261 (Task 1) exists: FOUND
- Commit 72352ff (Task 2) exists: FOUND
- Commit 1d0ba07 (Task 3) exists: FOUND
- `npx tsc --noEmit` exits 0: PASSED
- `npm run build` exits 0: PASSED
- `QuickActions` in OverviewView count: 0 — PASSED
- `QuickWriteFAB` in OverviewView count: 0 — PASSED
- `wordsWritten` in OverviewView count: 0 — PASSED
- `entriesThisMonth` in OverviewView count: 2 (selector + StatCard prop) — PASSED
- `Math.min(dayStreak, 7)` in OverviewView count: 1 — PASSED
- `suffix="/7"` in OverviewView count: 1 — PASSED
- `.slice(0, 3)` in OverviewView count: 0 — PASSED
- `data-onboarding="stat-cards"` in OverviewView count: 1 — PASSED
- `viewStore.ts` activeView default still `"overview"` at line 20: PASSED
