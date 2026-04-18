# Phase 8: Home Dashboard & Widgets - Context

**Gathered:** 2026-04-18
**Status:** Ready for planning
**Mode:** Auto (smart discuss — Claude picked recommended defaults per autonomous workflow)

<domain>
## Phase Boundary

Users land on a rich Overview view that summarizes their journaling life at a glance — **streak (N/7 days this week), totals, mood trends, memories from today, recent writing, today's prompt, weekly AI insight, and a one-click way to write**. Every widget subscribes to Phase 7's derived selectors (`totalEntries`, `dayStreak`, `moodCounts`, `recentEntries`) and the single `getEntryStats()` aggregate — NOT `allEntries` — so typing in the editor never causes dashboard re-renders. Overview becomes the default view on launch; `Ctrl/Cmd+N` becomes a global new-entry shortcut wired alongside the Quick-Write FAB. **Ships user-visible DASH-01..14 only** — no onboarding (Phase 9), no auto-tagging sparkle (Phase 10), no microinteractions pass or Tag Management (Phase 11). The existing 30-day `MoodOverview` constellation stays as-is; a new 30-day `MoodTrends` time-series SVG lands beside it as a complementary lens. The writing prompts library, AI insights cache semantics, and FAB/shortcut ergonomics are the load-bearing grey areas resolved here.

</domain>

<decisions>
## Implementation Decisions

### Widget layout & OverviewView composition (DASH-01..07)

- **D-01:** **Overview becomes the default view on launch.** `viewStore.activeView` already initializes to `"overview"` ([src/stores/viewStore.ts:20](src/stores/viewStore.ts#L20)) — Phase 8 verifies this holds after all refactors. No change needed to App.tsx's view-switch — `JournalView.tsx` already routes `"overview"` → `<OverviewView />`. *Rationale: DASH-01 is already satisfied by v1.0 wiring; Phase 8 just needs to keep it true.*

- **D-02:** **Single-view-level fetch, not per-widget `useEffect`s.** `OverviewView` calls `loadPage()` + `loadTags()` on mount (already does — [OverviewView.tsx:48-51](src/components/OverviewView.tsx#L48-L51)); `loadPage` already triggers `getEntryStats()` inside `entryStore` per Phase-7 D-05. Widgets consume **derived selectors** (`totalEntries`, `dayStreak`, `moodCounts`, `recentEntries`) via `useEntryStore(s => s.X)`. No per-widget `useEffect` that re-fetches aggregates. *Rationale: prevents C2 N+1 pitfall; matches Phase-7 D-05 timing contract.*

- **D-03:** **Layout preserves v1.0 grid; adds three new sections.** Keep the existing `grid-cols-4` stat row + `grid-cols-[2fr_1fr]` main split. Replace the current right column (`MoodOverview` + `QuickActions`) with a **stacked sidebar column** containing `MoodOverview`, `MoodTrends`, `WritingPrompts`, `AIInsights`, `OnThisDay`. Recent Entries stays in the 2fr left column (expanded to 5 items per DASH-07). `QuickActions` is removed — its actions are redundant with FAB + sidebar. *Rationale: preserves visual rhythm; new widgets slot into proven layout; keeps a single-column reading flow on the left.*

- **D-04:** **Co-locate new widgets in `src/components/dashboard/`** (a new subfolder). Files: `MoodTrends.tsx`, `WritingPrompts.tsx`, `AIInsights.tsx`, `RecentEntriesFeed.tsx`. Existing `OnThisDay.tsx`, `MoodOverview.tsx`, `StatCard.tsx`, `QuickWriteFAB.tsx` stay where they are (reused AS-IS). *Rationale: research/ARCHITECTURE.md §1 recommends this subfolder convention; keeps existing paths stable.*

- **D-05:** **Stat cards: swap `Words written` → `Entries this month`.** DASH-02 specifies streak / total / this-month / total-tags. v1.0 currently shows streak / total / words / tags (OverviewView.tsx:122-148). Replace `wordsWritten` card with `thisMonth` card, variant stays `violet`, icon `CalendarDays`. *Rationale: DASH-02 acceptance criterion is literal — four specified cards, not five.*

- **D-06:** **Recent Entries feed = 5 items (per DASH-07), not 3.** Remove `allEntries.slice(0, 3)` ([OverviewView.tsx:72](src/components/OverviewView.tsx#L72)); render the full store `recentEntries` (D-02 stable slice already capped at 5). Click opens entry for editing (existing `handleOpenEntry` flow). Empty-state copy stays. *Rationale: DASH-07 explicit; stable-ref primitive already sized correctly.*

- **D-07:** **Streak framing = `N/7 days this week`** (DASH-03). The StatCard `suffix` prop is re-purposed: when streak ≥ 1, render `value={min(streak, 7)}` and `suffix="/7 this week"` (or similar compact micro-copy — Claude's discretion). Zero entries → render the empty state already used for Recent Entries on the streak card (inviting copy, not `0`). *Rationale: research/FEATURES.md §7 flags infinite streaks as an anti-pattern; DASH-03 specifies the capped framing.*

- **D-08:** **Widgets subscribe only to primitives, never to `allEntries`.** `MoodTrends` needs windowed mood data → derives locally from `allEntries` **once** via `useMemo([allEntries])` inside the widget (unavoidable — the 30-day shape is widget-local per Phase-7 D-04). All other widgets use `totalEntries`, `dayStreak`, `thisMonth`, `moodCounts`, `recentEntries`. *Rationale: C1 re-render storm is the single highest-risk pitfall for v1.1; MoodTrends's local derivation is the one exception and is bounded to a `useMemo`.*

### Data flow — `getEntryStats()` extension & skeleton strategy

- **D-09:** **`getEntryStats()` already returns `{ totalEntries, totalWords, thisMonth, totalTags, dayStreak }`** ([src/lib/dbQueries.ts](src/lib/dbQueries.ts)) — no extension needed. Phase 8 reads `thisMonth` into a new derived selector `entriesThisMonth` on `entryStore` and surfaces it alongside the other FOUND-01 primitives. Update the four FOUND-01 refresh call sites (`loadPage`, `createEntry`, `deleteEntry`; NOT `saveContent`) to also set `entriesThisMonth: stats.thisMonth`. *Rationale: stats are already aggregated in one query; adding a store field is trivial and keeps the derived-selector contract consistent. `totalWords` stays unused (latent but harmless).*

- **D-10:** **Skeleton / loading shape = "never show a stale zero."** On initial load, `entryStore` initial values are `0`/`{}`/`[]`. Each widget renders a **lightweight skeleton** (animated pulse via Tailwind `animate-pulse` on placeholder bars/cards) when the relevant primitive is still `0` AND `allEntries.length === 0` AND `isLoadingPage === true` (all three must be true). Once `loadPage` resolves, primitives update and skeletons swap to content. Empty states (user has no entries at all) show inviting copy, not skeletons. *Rationale: skeletons should represent "loading" not "empty"; the triple-guard distinguishes the two.*

- **D-11:** **No per-widget error boundaries.** If `getEntryStats()` throws, the error propagates through `entryStore` action and the existing App-level error handling surfaces it. Individual widgets don't try/catch. *Rationale: matches Phase-7 convention (`dbQueries.ts` error-propagation pattern); widgets are presentational.*

### Writing Prompts widget (DASH-10, DASH-11)

- **D-12:** **Prompt library = static JSON at `src/lib/writingPrompts.ts` as a `readonly string[]` export.** Exactly **60 prompts** (meeting "60+" lower bound cleanly). Curated across five themes (reflection, gratitude, memory, goals, struggles) but stored as a flat array — theme grouping is invisible to the user. No categories, no tags, no weight. The file is versioned in source control; bumping the list is a normal PR. *Rationale: matches research/SUMMARY.md +PITFALLS.md §"Rotate deterministically"; simplest correct shape; zero new deps.*

- **D-13:** **Deterministic daily prompt via `day_of_year % N`.** Today's prompt index = `dayOfYear(new Date()) % PROMPTS.length`. `dayOfYear` uses `date-fns@4.1.0` (already in deps: `import { getDayOfYear } from "date-fns"`). Same prompt returned for all calls within a calendar day; changes at local midnight. No persistence needed. *Rationale: DASH-10 verbatim; zero-state UX (no "already seen today" tracking needed).*

- **D-14:** **"Another prompt" = local component state.** A `useState<number>(0)` offset cycles: displayed index = `(dayIndex + offset) % PROMPTS.length`. Offset **resets on unmount** (navigating away and back returns to today's prompt). No SQLite persistence, no "seen-today" tracking. *Rationale: DASH-11 specifies cycling behavior but doesn't require persistence; keeping it session-local is simpler and matches the "deterministic per day" spirit — tomorrow they get a fresh prompt regardless.*

- **D-15:** **No "Write this prompt" button that pre-fills the editor.** The widget is copy-only. User reads the prompt, clicks the FAB / Ctrl+N if inspired. *Rationale: DASH-10/11 don't require pre-fill; keeps Phase 8 scope tight. Pre-fill can be added in a future polish phase if demand emerges.*

### AI Insights widget (DASH-12, DASH-13, DASH-14)

- **D-16:** **Cache key in `settings` KV table** with two rows: `ai_insight_text` (the LLM summary, raw string) and `ai_insight_generated_at` (unix ms timestamp as stringified int). Read on widget mount; write on successful refresh. *Rationale: DASH-13 verbatim; `settings` table already exists in v1.0 ([db.ts:79-83](src/lib/db.ts#L79-L83)); `aiSettingsService.ts` establishes the INSERT OR REPLACE pattern.*

- **D-17:** **Refresh semantics = manual only for Phase 8.** Widget does NOT auto-refresh on open or on time-elapsed. Cached summary shows indefinitely until user clicks Refresh. Display "Generated <relative time>" beneath the summary so freshness is transparent. *Rationale: DASH-12/13 specify manual Refresh only; avoids surprising users with LLM calls; respects battery/perf; retries are user-driven when Ollama comes back per DASH-14.*

- **D-18:** **Empty state when Ollama unavailable = "Ask your journal" placeholder + visible Refresh button.** When `aiStore.available === false`, widget renders a graceful static card (short copy, no error dialog, no toast), and the Refresh button stays enabled so user can retry once Ollama is up. On retry with Ollama still down, no-op silently (do not raise an error). *Rationale: DASH-14 verbatim; matches v1.0 `aiStore.available` gating convention (PATTERNS.md pattern #1 for graceful fallback).*

- **D-19:** **Summary generation = `hybridAIService.askQuestion` call** with the last 7 days of entries (`created_at >= 7-days-ago`) joined into a single context string. Prompt: `"Summarize the emotional and thematic arc of the last 7 days of journal entries in 2-3 sentences. Keep it warm, specific, and grounded in what was actually written. Do not invent details."` Wire via a new `src/utils/insightService.ts` that handles the fetch, joining, and the `hybridAI.askQuestion(question, context)` call. *Rationale: AUTOTAG-02 downstream mandates `hybridAIService` routing — establish the pattern here; prompt keeps summary short to control latency and avoid hallucination.*

- **D-20:** **Last-7-days window in SQL, not JS.** `insightService.ts` queries `SELECT content FROM entries WHERE created_at >= ? ORDER BY created_at DESC` with cutoff `Date.now() - 7*86400*1000`. Don't iterate `allEntries` — this is a pagination-independent read (matching `dbQueries.ts` contract). If result set is empty, widget shows "Not enough entries yet" and does NOT call the LLM. *Rationale: pagination-independence is the Phase-7 contract; skip LLM when there's no content to summarize.*

### Quick-Write FAB & Ctrl/Cmd+N global shortcut (DASH-08, DASH-09)

- **D-21:** **FAB stays in its current location** (`fixed bottom-8 right-8` on `OverviewView`) but moves from being rendered inside `<OverviewView>` to being rendered **at the AppShell level alongside the main content** — so it's visible on Timeline, Calendar, Search, AND Overview (not Settings, not Editor). Placement is conditional on `activeView ∈ {"overview", "timeline", "calendar", "search"}`. *Rationale: DASH-09 wires Ctrl/Cmd+N as a global shortcut from any top-level view; the FAB being visible on those same views is the consistent UX. Settings + Editor are focus-work surfaces where a new-entry FAB would be a distraction (editor IS new-entry already).*

- **D-22:** **`aria-label="New entry"` + visible `focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2`** — DASH-09 verbatim. Current FAB has `aria-label="Quick write new entry"` which is fine but Phase 8 normalizes to `"New entry"` to match the shortcut's semantic and the DASH-09 wording. Add focus ring (not present in v1.0 FAB). *Rationale: DASH-09 explicit; ColorGrid primitive already set the focus-visible pattern in Phase 7 — reuse.*

- **D-23:** **Global keyboard shortcut wired in a new `src/hooks/useGlobalShortcuts.ts`** mounted once at App.tsx (inside the existing unlocked branch — do NOT fire when PIN lock is active). Handler: `(e.ctrlKey || e.metaKey) && e.key === "n" && !isTypingContext()` → `createEntry()` → `selectEntry(newId)` → `navigateToEditor(activeView)`. `isTypingContext()` returns true when `document.activeElement` is an editable element (input/textarea/contenteditable) — prevents hijacking native Ctrl+N in the TipTap editor or any future text input. *Rationale: mirrors `useIdleTimeout.ts` shape (existing pattern); gated to non-typing contexts so the editor's own keybindings still work; locked-app gate preserves security model.*

- **D-24:** **Shortcut behavior when editor is open** = creates a new entry and switches the editor to it (preserves the flush-pending-saves contract via `selectEntry`'s existing `flushAndClearTimers()` call). User doesn't lose work. *Rationale: `selectEntry` already guarantees the flush (entryStore.ts:134-137); chaining through it is safe.*

- **D-25:** **Shortcut registered via `window.addEventListener("keydown", ...)`** with capture=false. No new deps. Clean-up in hook's `useEffect` return. *Rationale: no third-party key-handling library needed; matches zero-new-runtime-deps preference.*

### Claude's Discretion

- Exact visual treatment of `MoodTrends` inline SVG (line / bar / dot plot) — DASH-04 says "line/bar" so planner picks which renders cleanest.
- Exact micro-copy on the streak card's `/7 this week` suffix — could be `/7 days`, `days / 7`, or short-caps variant.
- Whether `WritingPrompts` renders the "Another prompt" as a text link or an icon button.
- Whether `AIInsights` auto-runs on first-ever open if Ollama is available, OR waits for explicit first Refresh click — both fit DASH-13; planner picks based on UX polish preference.
- Exact copywriting of the 60-prompt library — delegated to planner / a later copywriting pass.
- Whether the FAB hides behind modals/popovers (z-index stacking) or stays visible — current z-40 is likely fine.
- Exact threshold / animation for the pulse skeleton on stat cards.
- Spacing, padding, exact typography of new widgets — follow existing `MoodOverview` / `StatCard` visual grammar.
- `insightService.ts` file layout (single `generateWeeklySummary` export vs named helpers).

### Folded Todos

- From STATE.md "Finalize writing prompt library copywriting (60+ prompts) during Phase 8 planning" → folded into D-12/D-13 as a D-12 planner-owned copywriting task. The library lives at `src/lib/writingPrompts.ts`.
- From STATE.md "AI insights summary shape — weekly/monthly/top-moods?" → resolved as **weekly** (7-day) per DASH-12 scope (D-19).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 8 scope
- `.planning/REQUIREMENTS.md` §Dashboard — DASH-01..14 acceptance criteria
- `.planning/ROADMAP.md` §Phase 8: Home Dashboard & Widgets — Goal, Depends on, Success Criteria (6 items), Requirements mapping

### Phase 7 primitives this phase builds on
- `.planning/phases/07-foundation-derived-state/07-CONTEXT.md` — canonical decisions for `entryStore` derived selectors (D-01..D-05), `getEntryStats()` shape (D-06, D-07), `local_date` column (D-08..D-14), `animations.css` + reduced-motion (D-15..D-20), `ColorGrid` primitive (D-21..D-25)
- `.planning/phases/07-foundation-derived-state/07-VERIFICATION.md` — what's verified shipped (FOUND-01..04 + TAGUX-01 all complete)
- `.planning/phases/07-foundation-derived-state/07-PATTERNS.md` — canonical code patterns for `dbQueries.ts`, derived selectors in `entryStore`, `getDb()` singleton, stable-reference slicing
- `src/lib/dbQueries.ts` — `getEntryStats()` live API (read before extending)
- `src/stores/entryStore.ts` — live derived primitive wiring (lines 86-108, 120-124, plus refresh call sites in `loadPage`/`createEntry`/`deleteEntry`)

### Chronicle AI principles
- `.planning/PROJECT.md` — privacy (zero network), local-only AI (Ollama only, no cloud), one-time pricing model, no new runtime deps preferred
- `.planning/STATE.md` — v1.1 carried decisions (especially "Decisions carried into v1.1" → Architecture bullets about derived selectors, `hybridAIService` routing, re-render storm prevention)

### Research context (v1.1 authoritative)
- `.planning/research/FEATURES.md` §6 "Writing Prompts Widget" — static library + `day_of_year % N` pattern
- `.planning/research/FEATURES.md` §7 "Streak Counter (With a Warning)" — capped weekly framing rationale
- `.planning/research/ARCHITECTURE.md` §1 — dashboard widget co-location, `getEntryStats()` rationale, reuse-as-is map for `OnThisDay` / `QuickWriteFAB` / `MoodOverview`
- `.planning/research/PITFALLS.md` §C1 (re-render storm — mitigated by FOUND-01), §C2 (N+1 queries — mitigated by FOUND-02), §"Rotate deterministically" (prompts)
- `.planning/research/SUMMARY.md` — v1.1 scope pointer + open questions list

### Prior phase context (pattern references)
- `.planning/phases/06-ai-features-semantic-search-q-a/06-CONTEXT.md` — `hybridAIService` routing convention; graceful fallback when Ollama unavailable; RAG context-join pattern reused by `insightService.ts` (D-19)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- [`src/components/OverviewView.tsx`](src/components/OverviewView.tsx) — existing dashboard scaffold; Phase 8 MODIFIES this to use the new widgets + 5-item recent feed + `thisMonth` stat + capped streak framing. Keeps greeting/header/layout.
- [`src/components/StatCard.tsx`](src/components/StatCard.tsx) — 4 variants (blue/violet/amber/emerald), `suffix` prop already supports the `/7 this week` streak framing. REUSE AS-IS.
- [`src/components/QuickWriteFAB.tsx`](src/components/QuickWriteFAB.tsx) — existing FAB, Phase 8 hoists it from inside `OverviewView` to `AppShell` level for multi-view visibility (D-21) and normalizes `aria-label` + adds focus ring (D-22).
- [`src/components/OnThisDay.tsx`](src/components/OnThisDay.tsx) — full widget already works (queries `strftime('%m-%d', created_at)` on mount). REUSE AS-IS on OverviewView per research/ARCHITECTURE.md §1.
- [`src/components/MoodOverview.tsx`](src/components/MoodOverview.tsx) — 30-day emoji-constellation. REUSE AS-IS alongside new `MoodTrends` (DASH-05 — both kept as complementary lenses).
- [`src/lib/dbQueries.ts::getEntryStats()`](src/lib/dbQueries.ts) — already returns `thisMonth`; Phase 8 surfaces it via a new `entriesThisMonth` store field (D-09).
- [`src/stores/entryStore.ts`](src/stores/entryStore.ts) — derived selectors (`totalEntries`, `dayStreak`, `moodCounts`, `recentEntries`) already wired per FOUND-01. Phase 8 ADDS `entriesThisMonth` field + updates the four refresh call sites.
- [`src/utils/aiSettingsService.ts`](src/utils/aiSettingsService.ts) — `INSERT OR REPLACE INTO settings(key, value, ...)` pattern. REUSE convention for `ai_insight_text` + `ai_insight_generated_at` rows (D-16).
- [`src/lib/hybridAIService.ts::askQuestion`](src/lib/hybridAIService.ts) — existing graceful-fallback LLM entry point. CALL from `insightService.ts` (D-19).
- [`src/stores/aiStore.ts`](src/stores/aiStore.ts) — `available` flag drives the DASH-14 gating. SUBSCRIBE in `AIInsights.tsx`.
- [`src/hooks/useIdleTimeout.ts`](src/hooks/useIdleTimeout.ts) — shape reference for `useGlobalShortcuts.ts` (window event listener + cleanup).

### Established Patterns
- **Zustand granular selectors** — `useEntryStore((s) => s.X)` returns primitive or stable reference; widgets MUST subscribe at primitive-level (Phase-7 Pattern 1).
- **`getDb()` + parameterized `db.select<T[]>` / `db.execute`** — every new SQL call in `insightService.ts` uses this pattern (Phase-7 Pattern 2).
- **`settings` KV table as SQLite's `localStorage`** — `INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)` is the canonical write; AI insight cache follows this (D-16).
- **Graceful fallback on Ollama unavailable** — v1.0 convention: render a static empty state, do not toast, do not dialog (v1.0 PATTERNS.md).
- **Module-level timers, NOT in Zustand state** — if `useGlobalShortcuts` needs any debounce, declare at module scope (precedent: `entryStore.ts:81-84`).
- **`hybridAIService` routing** — v1.0 established; AUTOTAG-02 reinforces in Phase 10; Phase 8 uses it from `insightService.ts`.

### Integration Points
- `src/App.tsx` — mount `useGlobalShortcuts()` inside the State 6 (unlocked) branch, alongside `useIdleTimeout()`. Do NOT mount for locked state.
- `src/components/AppShell.tsx` — render `<QuickWriteFAB />` conditionally based on `activeView` (D-21).
- `src/components/JournalView.tsx` — no change; `activeView === "overview"` already routes to `<OverviewView />`.
- `src/components/OverviewView.tsx` — significant refactor: swap stat card, expand recent feed, add new widget slots, remove `QuickActions`, move FAB rendering up to AppShell.
- `src/lib/writingPrompts.ts` — NEW file, `readonly string[]` export, 60 items (D-12).
- `src/utils/insightService.ts` — NEW file, owns the 7-day SQL query + `hybridAI.askQuestion` call + cache read/write (D-19, D-20).
- `src/components/dashboard/MoodTrends.tsx` — NEW; inline SVG over 30-day mood distribution from `allEntries` (localized `useMemo`).
- `src/components/dashboard/WritingPrompts.tsx` — NEW; reads `writingPrompts.ts`, computes daily index + local offset (D-13, D-14).
- `src/components/dashboard/AIInsights.tsx` — NEW; reads cache from `settings`, Refresh button calls `insightService.generateWeeklySummary()`, gates on `aiStore.available`.
- `src/components/dashboard/RecentEntriesFeed.tsx` — NEW; extracted from current `OverviewView.tsx:152-225` to standalone component consuming `recentEntries` store slice.
- `src/hooks/useGlobalShortcuts.ts` — NEW; mounts Ctrl/Cmd+N handler.

</code_context>

<specifics>
## Specific Ideas

- **Streak framing is load-bearing UX.** Research/FEATURES.md §7 explicitly flags infinite streaks as a mental-health anti-pattern for wellness-adjacent apps; DASH-03 codifies the capped-weekly framing. Don't let planning regress to an infinite counter.
- **Prompt library is a copywriting task, not a technical one.** 60 prompts, categorized mentally into reflection / gratitude / memory / goals / struggles, flat array. Default prompts during implementation can be placeholders — copy polish is low-risk and can happen anytime before milestone close.
- **AI Insights empty state is critical.** DASH-14 explicitly requires NO error dialog when Ollama is down — this is a graceful-degradation UX, not an error UX. Refresh button stays visible and live.
- **`saveContent` must never call `getEntryStats()`.** Phase-7 D-05 contract — counts/streak don't change on content edits; a 500ms auto-save burst would re-query the DB once per keystroke. Widgets subscribing to derived selectors must never drive a DB roundtrip from a render.
- **FAB hoisting is architectural, not cosmetic.** Moving the FAB to AppShell level is the cleanest way to wire Ctrl/Cmd+N + FAB as a single conceptual "new entry" surface across 4 views. Don't duplicate FABs per view.
- **The existing `QuickActions` component is superseded.** Its four actions (Start Writing, Ask AI, View Insights, Search) map 1:1 to sidebar nav + FAB. Remove from OverviewView; file stays in codebase for now (no dead-code cleanup required for Phase 8).
- **Ctrl/Cmd+N in the editor** — must be a no-op OR delegate to the editor's own keybindings. Current decision (D-23): gate on `isTypingContext()` so native editor Ctrl behavior wins when TipTap is focused. Global shortcut only fires outside editable contexts.
- **MoodTrends is the one unavoidable `allEntries` subscriber.** 30-day time-series needs per-day bucketing which isn't a FOUND-01 primitive. Local `useMemo` bounded to `[allEntries]` is the canonical pattern — this is the single narrow exception to "no `allEntries` subscriptions" and it's OK because the MoodTrends widget is not visible during auto-save bursts (auto-save happens in the editor, MoodTrends is on Overview).

</specifics>

<deferred>
## Deferred Ideas

- **First-run onboarding flow** (ONBRD-01..07) → Phase 9. Tour targets dashboard widgets via `data-onboarding` attributes — Phase 8 will add those attributes opportunistically on stat cards, FAB, and OTD during widget build-out to make Phase 9's life easier, but NO onboarding overlay or flow logic ships in Phase 8.
- **Auto-tagging sparkle in the editor** (AUTOTAG-01..07) → Phase 10. `insightService.ts` established in Phase 8 is the shape Phase 10 copies for `tagSuggestionService.ts`.
- **Writing prompt pre-fill into editor** — not in DASH-10/11. Could ship as a later polish phase (write "Use this prompt" button → opens editor with prompt as a Tiptap-rendered blockquote). Out of scope for v1.1 Phase 8.
- **Microinteractions pass** (ANIM-01..06) → Phase 11. Phase 8 widgets use existing v1.0 `transition-all duration-300` utilities; no stagger-in, no pop-in, no crossfade. Phase 11 wires `animations.css` keyframes into new widgets as part of its standardization work.
- **Tag Management view** (TAGUX-02..07) → Phase 11. Orthogonal to dashboard.
- **12-color dual-tone palette** (TAGUX-02) → Phase 11.
- **View-transition crossfade** (ANIM-05) → Phase 11. Phase 8 view switch (Overview ↔ Timeline etc.) is instant, matching v1.0.
- **`QuickActions.tsx` deletion** — file stays; Phase 8 stops rendering it. Cleanup can happen anytime (trivial follow-up).
- **AI Insights auto-refresh on stale cache (e.g., >24h)** — Phase 8 is manual-only (D-17). A future polish phase could add a "Summary last updated N days ago — refresh?" nudge.
- **LLM-generated personalized prompts** — mentioned in research/FEATURES.md as v1.2 upgrade path; out of scope for v1.1.
- **Entry-count empty state for a brand-new user** — the global first-run empty state is Phase 9's onboarding flow. Phase 8 widgets render their own inviting per-widget empty states (e.g., "Your mood story unfolds here"), but no orchestrated "you have 0 entries" dashboard takeover.
- **MoodTrends interactivity** (click a day → filter timeline) — not required by DASH-04; defer to future polish.
- **Exporting / sharing the AI insight** — out of scope; summary is read-only.

### Reviewed Todos (not folded)
- "Consider adding ESLint + `lint` npm script as its own plan" (STATE.md) — orthogonal to Phase 8; remains in todos.
- "Phase 10 flagged HIGH research" (STATE.md) — Phase 10 concern, not Phase 8.

</deferred>

---

*Phase: 08-home-dashboard-widgets*
*Context gathered: 2026-04-18*
