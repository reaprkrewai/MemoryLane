# Roadmap: Chronicle AI

**Milestones:** v1.0 MVP (shipped 2026-04-18), v1.1 Daily Driver (active)
**Defined:** 2026-04-09 (v1.0), extended 2026-04-16 (v1.1)
**Granularity:** Coarse

---

## Milestones

- ✅ **v1.0 MVP** — Phases 1-6 (shipped 2026-04-18) — see [milestones/v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md)
- 🚧 **v1.1 Daily Driver** — Phases 7-11 (active, Phase 7 complete)

---

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-6) — SHIPPED 2026-04-18</summary>

- [x] Phase 1: Foundation (4/4 plans) — completed 2026-04-09 (gap-closure 2026-04-17)
- [x] Phase 2: Editor & Tags (5/5 plans) — completed 2026-04-10
- [x] Phase 3: Timeline & Calendar (3/3 plans) — completed 2026-04-11
- [x] Phase 4: Search & Discovery (3/3 plans) — completed 2026-04-11
- [x] Phase 5: Media, Security & Settings (4/4 plans) — completed 2026-04-14
- [x] Phase 6: AI Features (4/4 plans) — completed 2026-04-14

Full phase details archived in [milestones/v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md).

</details>

### 🚧 v1.1 Daily Driver (In Progress)

- [x] **Phase 7: Foundation & Derived State** — Architectural primitives that unblock every downstream widget (derived selectors, SQL aggregates, `local_date` column, animations.css with reduced-motion guard, ColorGrid primitive)
- [ ] **Phase 8: Home Dashboard & Widgets** — Overview as default view with 7 widgets (stat cards, mood trends, On This Day, recent entries, writing prompts, AI insights, Quick-Write FAB)
- [ ] **Phase 9: First-Run Onboarding** — 3-step welcome flow with SQLite-persisted completion, auto-skip for existing users, replay from Settings
- [ ] **Phase 10: Auto-Tagging AI Pipeline** — Sparkle-triggered local LLM tag suggestions with JSON-Schema constraint, ghost-chip accept/dismiss UX, off by default
- [ ] **Phase 11: Microinteractions & Tag Management** — Dashboard stagger-in, tag-pill pop-in, modal scales, mood spring feedback; expanded 12-color palette + Tag Management settings view

---

## Milestone v1.1: Daily Driver

**Goal:** Turn Chronicle AI from a working MVP into a habit-forming daily driver — land users on a rich home dashboard, smooth every interaction, and make AI assist quietly while writing.

**Constraints preserved from v1.0:** zero network calls, Ollama-only AI, Tailwind v3 pin, no new runtime dependencies preferred.

---

## Phase Details

### Phase 7: Foundation & Derived State
**Goal**: Ship the architectural primitives v1.1 depends on — derived primitive selectors, a SQL aggregate for accurate stats, a timezone-safe local-date column, a shared animation stylesheet with a reduced-motion guard, and a reusable ColorGrid UI primitive. Nothing user-visible ships in this phase; everything downstream ships on top of it.
**Depends on**: Phase 6 (v1.0 complete)
**Requirements**: FOUND-01, FOUND-02, FOUND-03, FOUND-04
**Success Criteria** (what must be TRUE):
  1. `entryStore` exposes derived primitive selectors (`totalEntries`, `dayStreak`, `moodCounts`, `recentEntries`) that return primitives/stable references — subscribing to them does NOT re-render when an unrelated entry is auto-saved (verified via React DevTools Profiler)
  2. `src/lib/dbQueries.ts::getEntryStats()` returns entry aggregates via a single SQL query — the returned totals are correct regardless of how many pages the timeline has loaded (verified with a 500-entry test DB where `allEntries.length` is 20 but `getEntryStats().total` is 500)
  3. `entries.local_date TEXT` column exists; new entries write `YYYY-MM-DD` in the user's local TZ at creation time; existing entries are backfilled best-effort from UTC; streak queries read this column (no `startOfDay(new Date())` remaining in streak code)
  4. `src/styles/animations.css` defines shared keyframes (fade-in, slide-up, pop-in, stagger-in) plus motion tokens, and the file includes a `@media (prefers-reduced-motion: reduce)` stanza that disables all animations — verified by running the app with "Reduce motion" enabled in OS settings and seeing instant transitions
  5. `src/components/ui/ColorGrid.tsx` renders an accessible swatch grid usable by both TagPill and the future Tag Management view; keyboard-navigable with focus-visible rings
**Plans**: 5/5 plans complete
Plans:
- [x] 07-01-PLAN.md — FOUND-03 schema migration (local_date column DDL + PRAGMA-guarded ALTER + backfill + index)
- [x] 07-02-PLAN.md — FOUND-04 motion tokens + animations.css keyframes + global reduced-motion guard + tailwind utilities + main.tsx import
- [x] 07-03-PLAN.md — FOUND-02 dbQueries.ts::getEntryStats() SQL aggregate (TZ-safe streak via local_date)
- [x] 07-04-PLAN.md — FOUND-01 entryStore derived selectors + FOUND-03 D-11 createEntry local_date INSERT + OverviewView refactor
- [x] 07-05-PLAN.md — TAGUX-01 ColorGrid primitive + TagPill refactor (pure refactor, pixel-identical)
**UI hint**: yes

### Phase 8: Home Dashboard & Widgets
**Goal**: Users land on a rich Overview view that summarizes their journaling life at a glance — streak, totals, mood trends, memories from today, recent writing, today's prompt, weekly AI insight, and a one-click way to write. Every widget subscribes to Phase 7's derived selectors so typing in the editor never causes dashboard re-renders.
**Depends on**: Phase 7 (needs derived selectors, `getEntryStats()`, `local_date` column)
**Requirements**: DASH-01, DASH-02, DASH-03, DASH-04, DASH-05, DASH-06, DASH-07, DASH-08, DASH-09, DASH-10, DASH-11, DASH-12, DASH-13, DASH-14
**Success Criteria** (what must be TRUE):
  1. User launches the app and lands on the Overview view by default (not Timeline) — the view contains 4 stat cards (streak, total entries, entries this month, total tags), MoodTrends time-series chart, MoodOverview emoji constellation, On This Day widget, Recent Entries feed (5 items), Quick-Write FAB, Writing Prompts widget, and AI Insights widget
  2. Current streak is framed as `N/7 days this week` (capped weekly), not an infinite counter; zero entries renders an inviting empty state, not "0 day streak"
  3. Total entries stat reflects the true DB count (not `allEntries.length`) — confirmed by loading a 500-entry DB and seeing "500 entries" without scrolling the timeline first
  4. Writing Prompts widget shows one prompt per day chosen deterministically via `day_of_year % N` from a library of 60+ prompts; "Another prompt" button cycles to the next in the library
  5. AI Insights widget shows a cached LLM summary of the last 7 days when Ollama is available; when Ollama is unavailable, it renders a graceful empty state (no error dialog) and keeps the Refresh button visible so the user can retry; refresh writes `ai_insight_generated_at` to the `settings` KV table
  6. User can click the Quick-Write FAB or press `Ctrl/Cmd+N` from any top-level view to create a new entry and open it in the editor; FAB has `aria-label="New entry"` and visible `focus-visible` ring
**Plans**: 5/5 plans planned
Plans:
- [x] 08-01-PLAN.md — Store extension (entriesThisMonth derived primitive) + writingPrompts.ts 60-item library
- [ ] 08-02-PLAN.md — OverviewView refactor (4 stat cards, 5-item feed, 5-widget sidebar) + RecentEntriesFeed extraction + widget stubs
- [ ] 08-03-PLAN.md — MoodTrends 30-day stacked-bar SVG + WritingPrompts deterministic daily prompt cycling
- [ ] 08-04-PLAN.md — insightService (7-day SQL + hybridAI + settings cache) + AIInsights widget (Refresh + 4 states + graceful Ollama-down fallback)
- [ ] 08-05-PLAN.md — FAB hoist to AppShell + normalize aria-label + focus-visible ring + useGlobalShortcuts (Ctrl/Cmd+N global)
**UI hint**: yes

### Phase 9: First-Run Onboarding
**Goal**: A brand-new user sees a welcome overlay that names the app, states the privacy promise, points at the dashboard, and invites them to write their first entry. Existing v1.0 users never see the flow. State persists in SQLite so it survives reinstalls, and users who skip can replay the tour from Settings.
**Depends on**: Phase 8 (tour targets the dashboard widgets via `data-onboarding` attributes)
**Requirements**: ONBRD-01, ONBRD-02, ONBRD-03, ONBRD-04, ONBRD-05, ONBRD-06, ONBRD-07
**Success Criteria** (what must be TRUE):
  1. On first launch with zero entries and no prior completion, user sees a welcome overlay before any interaction is possible; the flow is exactly 3 linear steps — welcome + privacy promise → dashboard tour pointer → "Write your first entry" CTA
  2. User can skip the flow at any step; completion or skip state is persisted in the SQLite `settings` table (not localStorage) under `onboarding_completed` so it survives reinstalls
  3. Existing v1.0 users (`COUNT(entries) > 0` at migration time) have `onboarding_completed` auto-seeded to `'true'` and never see the flow on first v1.1 launch
  4. User can replay the onboarding tour from Settings → Help → "Replay tour"; tour targets resolve to live DOM elements via `data-onboarding="step-name"` attributes (not CSS class selectors that churn on refactor)
  5. OnboardingOverlay renders at the App.tsx level (above AppShell, alongside SettingsView) so it overlays every top-level view including Settings
**Plans**: TBD
**UI hint**: yes

### Phase 10: Auto-Tagging AI Pipeline
**Goal**: Users who want help tagging can press a sparkle button next to the tag input and receive 1–3 grounded, on-demand tag suggestions from the local LLM. Suggestions render as ghost chips — never auto-applied — and the feature is off by default so new users are never surprised. When Ollama is down, the button is hidden silently.
**Depends on**: Phase 8 (integrates with the TagRow UX established in v1.0 + wires the AI Features toggle alongside the existing Settings → AI panel)
**Requirements**: AUTOTAG-01, AUTOTAG-02, AUTOTAG-03, AUTOTAG-04, AUTOTAG-05, AUTOTAG-06, AUTOTAG-07
**Success Criteria** (what must be TRUE):
  1. User sees a sparkle "Suggest tags" button in the TagRow of the entry editor only when (a) AI backend is available AND (b) Settings → "Tag suggestions" is enabled — the button is hidden (not disabled) in every other case
  2. Clicking the sparkle routes through `hybridAIService.askQuestion` (never `ollamaService` directly) and returns 1–3 tag suggestions grounded in the entry's current content; the LLM call uses Ollama's `format` JSON-Schema constraint to bound the response to a structured tag array with length-capped enum of existing tags plus up to 2 new-tag proposals
  3. Suggestions render as ghost chips inside the editor that the user explicitly accepts (click to add) or dismisses (× to remove); no suggestion is ever auto-applied to the entry
  4. The "Tag suggestions" toggle in Settings → AI Features defaults to **off**; users opt in consciously
  5. When Ollama is unavailable mid-session, the sparkle button disappears without any error toast (consistent with v1.0 `aiStore.available` gating)
**Plans**: TBD
**UI hint**: yes

### Phase 11: Microinteractions & Tag Management
**Goal**: Every interaction in the app feels polished and intentional — dashboard widgets stagger in on mount, tag pills pop when added, modals scale on open, the mood selector springs on click, and view transitions crossfade. All animations honor `prefers-reduced-motion`. Tag color palette expands to 12 WCAG-AA-verified dual-tone colors, and users get a dedicated Tag Management view in Settings to rename, recolor, and delete tags.
**Depends on**: Phase 7 (animations.css keyframes + reduced-motion stanza, ColorGrid primitive)
**Requirements**: ANIM-01, ANIM-02, ANIM-03, ANIM-04, ANIM-05, ANIM-06, TAGUX-01, TAGUX-02, TAGUX-03, TAGUX-04, TAGUX-05, TAGUX-06, TAGUX-07
**Success Criteria** (what must be TRUE):
  1. Dashboard widgets stagger-in on Overview mount with 50ms-per-card delay; tag pills scale pop-in on add (0.8→1.0) and scale-out on remove (1.0→0.8 + fade); modals, popovers, and AlertDialogs fade + scale (0.95→1.0) on open and reverse on close; mood selector buttons provide a tactile spring (1.0→0.9→1.0) on click; view transitions between Overview/Timeline/Calendar/Search use a 150ms crossfade
  2. With OS "Reduce motion" enabled, every animation above becomes instant — verified by the FOUND-04 stanza applied via `@media (prefers-reduced-motion: reduce)`
  3. Tag color palette is exactly 12 preset colors defined as dual-tone tokens (`base`, `bg`, `text`); every color passes WCAG AA contrast in both light and dark themes (verified by an automated or manual contrast check)
  4. TagPill renders the palette via the shared `ColorGrid` primitive (no duplicate swatch grid implementation); changing a tag's color updates TagPill, autocomplete, and timeline instantly
  5. User can open Tag Management from Settings → Tag Management; the view lists all tags with color swatch, usage count, and last-used date, sortable by usage or recency
  6. User can rename a tag and the change propagates to every entry that references it; user can change a tag's color via ColorGrid and the change reflects everywhere; user can delete a tag only when it has zero entries (delete button disabled with tooltip otherwise)
**Plans**: TBD
**UI hint**: yes

---

## Coverage (v1.1)

- v1.1 requirements: 45
- Mapped: 45
- Unmapped: 0

| Phase | Requirements |
|-------|-------------|
| 7 — Foundation & Derived State | FOUND-01, FOUND-02, FOUND-03, FOUND-04 |
| 8 — Home Dashboard & Widgets | DASH-01, DASH-02, DASH-03, DASH-04, DASH-05, DASH-06, DASH-07, DASH-08, DASH-09, DASH-10, DASH-11, DASH-12, DASH-13, DASH-14 |
| 9 — First-Run Onboarding | ONBRD-01, ONBRD-02, ONBRD-03, ONBRD-04, ONBRD-05, ONBRD-06, ONBRD-07 |
| 10 — Auto-Tagging AI Pipeline | AUTOTAG-01, AUTOTAG-02, AUTOTAG-03, AUTOTAG-04, AUTOTAG-05, AUTOTAG-06, AUTOTAG-07 |
| 11 — Microinteractions & Tag Management | ANIM-01, ANIM-02, ANIM-03, ANIM-04, ANIM-05, ANIM-06, TAGUX-01, TAGUX-02, TAGUX-03, TAGUX-04, TAGUX-05, TAGUX-06, TAGUX-07 |

---

## Dependency Graph (v1.1)

```
Phase 7: Foundation & Derived State ✅
    │
    ├──► Phase 8: Home Dashboard & Widgets
    │       │
    │       ├──► Phase 9: First-Run Onboarding
    │       │       (tour targets dashboard widgets via data-onboarding attrs)
    │       │
    │       └──► Phase 10: Auto-Tagging AI Pipeline
    │               (integrates with TagRow; wires alongside Settings AI panel)
    │
    └──► Phase 11: Microinteractions & Tag Management
            (uses animations.css keyframes + ColorGrid primitive)
```

Phases 9, 10, 11 can execute in parallel once Phase 8 is complete (11 only needs Phase 7's primitives, but is ordered last for value/risk sequencing — polish after AI).

---

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation | v1.0 | 4/4 | Complete | 2026-04-09 (gap-closure 2026-04-17) |
| 2. Editor & Tags | v1.0 | 5/5 | Complete | 2026-04-10 |
| 3. Timeline & Calendar | v1.0 | 3/3 | Complete | 2026-04-11 |
| 4. Search & Discovery | v1.0 | 3/3 | Complete | 2026-04-11 |
| 5. Media, Security & Settings | v1.0 | 4/4 | Complete | 2026-04-14 |
| 6. AI Features | v1.0 | 4/4 | Complete | 2026-04-14 |
| 7. Foundation & Derived State | v1.1 | 5/5 | Complete | 2026-04-18 |
| 8. Home Dashboard & Widgets | v1.1 | 0/5 | Not started | — |
| 9. First-Run Onboarding | v1.1 | 0/TBD | Not started | — |
| 10. Auto-Tagging AI Pipeline | v1.1 | 0/TBD | Not started | — |
| 11. Microinteractions & Tag Management | v1.1 | 0/TBD | Not started | — |

---

*Roadmap last updated: 2026-04-18 — v1.0 shipped and archived; v1.1 Phase 7 complete, Phase 8 planned (5 plans)*
