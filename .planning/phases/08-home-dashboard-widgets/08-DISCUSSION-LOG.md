# Phase 8: Home Dashboard & Widgets - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in 08-CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-18
**Phase:** 08-home-dashboard-widgets
**Mode:** Auto — Claude picked recommended defaults (no interactive questions asked)
**Areas discussed:** Widget layout & OverviewView composition (DASH-01..07), Data flow & skeleton strategy (DASH-02/07/09), Writing Prompts library & cycling (DASH-10/11), AI Insights UX & cache (DASH-12..14), Quick-Write FAB & Ctrl/Cmd+N (DASH-08/09)

---

## Gray Area Selection (auto)

| Option | Description | Selected |
|--------|-------------|----------|
| Widget layout & OverviewView composition | How widgets arrange, which existing widgets stay/go, new subfolder, empty/loading states | ✓ |
| Data-flow pattern | Single `getEntryStats()` aggregate at view level vs per-widget fetches; skeleton strategy; error boundaries | ✓ |
| Writing Prompts library & cycling | Source/shape of 60+ library, `day_of_year % N` implementation, "Another prompt" persistence | ✓ |
| AI Insights UX | Cache shape (settings KV), refresh semantics, empty state when Ollama unavailable, LLM prompt strategy | ✓ |
| Quick-Write FAB & Ctrl/Cmd+N shortcut | FAB placement scope (overview-only vs multi-view), aria + focus ring, global keybinding + typing-context guard | ✓ |

**Auto-selected:** All five areas (any one could have been skipped, but all touch DASH-01..14 so all are in scope).

---

## Widget layout & OverviewView composition (DASH-01..07)

### Q1: Is Overview already the default view?

| Option | Description | Selected |
|--------|-------------|----------|
| Already default — verify + preserve | `viewStore.activeView` initializes to `"overview"`; JournalView routes it; no code change | ✓ |
| Re-assign default in Phase 8 as explicit DASH-01 work | Duplicates v1.0 wiring; no-op | |

**Picked:** Already default — verify + preserve.
**Rationale:** DASH-01 is already satisfied by v1.0 code; Phase 8 verifies it stays true after refactor.

### Q2: How do widgets get their data?

| Option | Description | Selected |
|--------|-------------|----------|
| Single-view-level fetch (loadPage triggers getEntryStats) | Phase-7 D-05 contract; widgets consume derived selectors only | ✓ |
| Per-widget useEffect with its own SQL call | Re-creates C2 N+1 pitfall; violates FOUND-02 intent | |
| Dashboard-level shared context | New pattern, no existing precedent, overkill | |

**Picked:** Single-view-level fetch (Recommended).
**Rationale:** Matches Phase-7 D-05 refresh-timing contract; C2 N+1 prevention.

### Q3: Layout shape

| Option | Description | Selected |
|--------|-------------|----------|
| Preserve v1.0 grid; stack new widgets in right column | 4-col stat row + 2fr/1fr split; right column stacks MoodOverview/MoodTrends/WritingPrompts/AIInsights/OnThisDay | ✓ |
| New 12-column bento grid (3x3 card mosaic) | Larger visual rework; risks Phase 11 polish creep | |
| Vertical single-column stack | Simpler but wastes horizontal space in Tauri desktop context | |

**Picked:** Preserve v1.0 grid + stacked right column (Recommended).
**Rationale:** Proven layout; new widgets slot in without a full visual rewrite.

### Q4: Where do new widget components live?

| Option | Description | Selected |
|--------|-------------|----------|
| `src/components/dashboard/` subfolder | Research/ARCHITECTURE.md §1 recommendation; co-locates dashboard-specific widgets | ✓ |
| Keep everything flat under `src/components/` | Current convention; will scale poorly past 3-4 new widgets | |
| Page-based routing folder | Overkill for a 7-widget dashboard | |

**Picked:** `src/components/dashboard/` subfolder (Recommended).

### Q5: Stat cards — which 4?

| Option | Description | Selected |
|--------|-------------|----------|
| Streak / Total entries / This month / Total tags | DASH-02 verbatim; replaces v1.0's "Words written" card | ✓ |
| Streak / Total / Words written / Tags (keep v1.0) | Deviates from DASH-02 | |
| 5 cards | DASH-02 specifies 4 | |

**Picked:** DASH-02 verbatim four-card shape (Recommended).

### Q6: Streak framing

| Option | Description | Selected |
|--------|-------------|----------|
| `N/7 days this week` — capped weekly framing | DASH-03 verbatim; research/FEATURES.md §7 mental-health rationale | ✓ |
| Infinite counter (current v1.0 behavior) | Known anti-pattern for wellness apps | |
| Separate card for weekly vs all-time streak | Expands to 5 cards; violates DASH-02 | |

**Picked:** `N/7 days this week` (Recommended).

### Q7: Recent Entries feed — how many items?

| Option | Description | Selected |
|--------|-------------|----------|
| 5 items | DASH-07 verbatim; matches store `recentEntries` stable slice | ✓ |
| 3 items (current v1.0) | Deviates from DASH-07 | |
| Configurable count | YAGNI | |

**Picked:** 5 items (Recommended).

---

## Data-flow pattern (DASH-02/07/09)

### Q1: Does `getEntryStats()` need extending for Phase 8?

| Option | Description | Selected |
|--------|-------------|----------|
| No — already returns `thisMonth`; surface via new store field `entriesThisMonth` | All 4 DASH-02 stats covered in one query | ✓ |
| Extend with "entries this week" / other counts | Not required by DASH-02..14 | |
| Separate `getEntriesThisMonth()` helper | Duplicates work; violates single-aggregate principle | |

**Picked:** Already covered (Recommended).

### Q2: Skeleton / loading strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Lightweight per-widget skeletons gated on `isLoadingPage && totalEntries === 0 && allEntries.length === 0` | Distinguishes loading from empty | ✓ |
| Dashboard-level loading spinner | Coarse; blocks the whole view | |
| No skeletons; show `0` values during load | Shows stale zeros — bad UX | |

**Picked:** Per-widget skeletons with triple-guard (Recommended).

### Q3: Error boundaries per widget?

| Option | Description | Selected |
|--------|-------------|----------|
| No — let errors propagate; App-level handles | Matches Phase-7 `dbQueries.ts` error-propagation convention | ✓ |
| Wrap every widget in try/catch | Silent failures are worse than loud ones; widgets are presentational | |
| Per-widget error boundary component | Adds complexity without corresponding user value in v1.1 | |

**Picked:** No per-widget error boundaries (Recommended).

---

## Writing Prompts library & cycling (DASH-10, DASH-11)

### Q1: Library source & shape

| Option | Description | Selected |
|--------|-------------|----------|
| Static TS file `src/lib/writingPrompts.ts` exporting `readonly string[]` of 60 prompts | Matches research/SUMMARY.md; zero runtime deps; trivially versioned | ✓ |
| JSON file imported via `import promptsJSON from "./prompts.json"` | Extra Vite config; no benefit for static data | |
| DB-seeded `prompts` table | Overkill for immutable content; requires migration | |
| LLM-generated prompts | v1.2 upgrade path per research/FEATURES.md; out of scope | |

**Picked:** Static TS file (Recommended).

### Q2: Daily prompt selection

| Option | Description | Selected |
|--------|-------------|----------|
| `day_of_year % N` via `date-fns` `getDayOfYear` | DASH-10 verbatim; deterministic; zero state | ✓ |
| Hash of date string | Same result, reinvents wheel | |
| Random-with-seed + last-shown tracking | DASH-10 explicitly specifies deterministic mod | |

**Picked:** `day_of_year % N` (Recommended).

### Q3: "Another prompt" cycling persistence

| Option | Description | Selected |
|--------|-------------|----------|
| Local component `useState` offset — resets on unmount | Simple; no persistence; matches deterministic spirit | ✓ |
| Persist offset in `settings` KV | Over-engineered; "already seen today" UX not specified | |
| Persist "seen today" array across sessions | Adds complexity; DASH-11 only requires cycling, not tracking | |

**Picked:** Local component state (Recommended).

### Q4: Pre-fill prompt into new entry?

| Option | Description | Selected |
|--------|-------------|----------|
| No pre-fill — widget is read-only copy | DASH-10/11 don't require it; keeps scope tight | ✓ |
| "Use this prompt" → opens editor with prompt as blockquote | Nice-to-have; future polish | |

**Picked:** No pre-fill (Recommended).

---

## AI Insights UX (DASH-12, DASH-13, DASH-14)

### Q1: Cache shape

| Option | Description | Selected |
|--------|-------------|----------|
| Two `settings` KV rows: `ai_insight_text`, `ai_insight_generated_at` | DASH-13 verbatim; reuses existing `settings` table + aiSettingsService pattern | ✓ |
| JSON blob `{ text, generated_at }` in one row | Fine but adds parse step; prefer the two-row split for grep-ability | |
| Dedicated `ai_insights` table | Overkill for one cached value | |

**Picked:** Two settings KV rows (Recommended).

### Q2: Refresh semantics

| Option | Description | Selected |
|--------|-------------|----------|
| Manual-only (user clicks Refresh) | DASH-12/13 specify manual; avoids surprise LLM calls | ✓ |
| Auto-refresh on widget mount if >24h old | Nice polish; adds complexity; Phase 8 stays manual | |
| Auto-refresh daily via background scheduler | Over-engineered for v1.1 | |

**Picked:** Manual-only (Recommended).

### Q3: Empty state when Ollama unavailable

| Option | Description | Selected |
|--------|-------------|----------|
| Static placeholder + visible Refresh button (silent no-op on retry while still down) | DASH-14 verbatim | ✓ |
| Hide widget entirely when Ollama down | DASH-14 explicitly says Refresh stays visible | |
| Error toast / dialog | DASH-14 explicitly forbids | |

**Picked:** Static placeholder + Refresh visible (Recommended).

### Q4: LLM prompt strategy

| Option | Description | Selected |
|--------|-------------|----------|
| 7-day window, 2-3 sentence warm+grounded summary via `hybridAIService.askQuestion` | Matches DASH-12 + hybridAIService routing convention + RAG pattern from v1.0 | ✓ |
| Structured JSON summary (top mood, top tags, themes) | Adds JSON-schema complexity; Phase 10 is where JSON-Schema shines | |
| Summarize with direct `ollamaService` call | Violates hybridAIService routing convention | |

**Picked:** Free-form 2-3 sentence summary via hybridAIService (Recommended).

### Q5: Source of 7-day entries

| Option | Description | Selected |
|--------|-------------|----------|
| SQL query in new `insightService.ts` with 7-day `created_at` filter | Pagination-independent; matches dbQueries.ts contract | ✓ |
| Iterate `entryStore.allEntries` in JS | Pagination-dependent; would miss entries beyond page 1 | |
| Pull from `getEntryStats()` | Not the right shape; stats returns counts, not content | |

**Picked:** SQL query in insightService (Recommended).

---

## Quick-Write FAB & Ctrl/Cmd+N shortcut (DASH-08, DASH-09)

### Q1: FAB visibility scope

| Option | Description | Selected |
|--------|-------------|----------|
| Visible on Overview / Timeline / Calendar / Search (hoist to AppShell) | Pairs with global Ctrl/Cmd+N scope; consistent "new entry" surface | ✓ |
| Overview-only (current v1.0 behavior) | DASH-08 specifies Overview FAB; DASH-09 specifies global shortcut — asymmetric UX if FAB is only one place | |
| Every view including Editor/Settings | Editor IS new-entry; FAB would be visual noise | |

**Picked:** 4 top-level views, hoisted to AppShell (Recommended).

### Q2: Aria-label + focus ring

| Option | Description | Selected |
|--------|-------------|----------|
| `aria-label="New entry"` + `focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2` | DASH-09 verbatim; matches ColorGrid focus convention (Phase 7) | ✓ |
| Keep v1.0 `aria-label="Quick write new entry"` | Slightly off from DASH-09 phrasing; normalize for consistency | |

**Picked:** DASH-09 normalized labels + focus ring (Recommended).

### Q3: Global shortcut wiring

| Option | Description | Selected |
|--------|-------------|----------|
| New `src/hooks/useGlobalShortcuts.ts`, mounted in App.tsx (unlocked branch only) | Matches `useIdleTimeout` shape; gated on unlock state | ✓ |
| Add to an existing hook | No right existing home | |
| Third-party library (react-hotkeys-hook) | Violates zero-new-deps preference | |

**Picked:** New hook `useGlobalShortcuts` (Recommended).

### Q4: Behavior when editor is focused

| Option | Description | Selected |
|--------|-------------|----------|
| Gate on `isTypingContext()` — native editor Ctrl wins when TipTap focused | Preserves editor keybindings; global shortcut only outside editable elements | ✓ |
| Always fire — shortcut creates new entry even mid-typing | Disruptive; loses context | |
| Only fire on Overview | Violates DASH-09 ("from any top-level view") | |

**Picked:** `isTypingContext()` gate (Recommended).

### Q5: Shortcut creates entry mid-editor behavior

| Option | Description | Selected |
|--------|-------------|----------|
| `selectEntry` auto-flushes pending saves then switches — reuse existing contract | `selectEntry` already calls `flushAndClearTimers()` (entryStore.ts:134-137) | ✓ |
| Confirm dialog "Save current entry?" | Unnecessary; autosave is already unconditional | |

**Picked:** Reuse `selectEntry` flush contract (Recommended).

---

## Claude's Discretion

- Exact `MoodTrends` SVG visualization (line vs bar vs dot) — DASH-04 says "line/bar".
- Exact streak-card micro-copy for the `/7 this week` suffix.
- 60-prompt library copywriting (placeholders acceptable during implementation; polish before milestone close).
- Whether AIInsights auto-runs once on first-ever open with Ollama available.
- FAB z-index stacking vs modals.
- Skeleton pulse timing / shape.
- `insightService.ts` file layout (one export vs named helpers).

---

## Folded Todos (from STATE.md)

- "Finalize writing prompt library copywriting (60+ prompts)" → folded into D-12/D-13.
- "AI insights summary shape — weekly/monthly/top-moods?" → resolved as weekly (D-19).

## Deferred Ideas

- Onboarding (ONBRD-01..07) → Phase 9.
- Auto-tagging (AUTOTAG-01..07) → Phase 10.
- Writing-prompt pre-fill into editor → future polish.
- Microinteractions (ANIM-01..06) → Phase 11.
- Tag Management (TAGUX-02..07) → Phase 11.
- 12-color dual-tone palette (TAGUX-02) → Phase 11.
- View-transition crossfade (ANIM-05) → Phase 11.
- QuickActions.tsx deletion → anytime (trivial follow-up; not required).
- AI Insights auto-refresh on stale cache → future polish.
- LLM-personalized prompts → v1.2.
- MoodTrends click-to-filter interactivity → future polish.
- AI insight export/share → out of scope.

---

*Discussion log for audit trail only. Canonical decisions in 08-CONTEXT.md.*
