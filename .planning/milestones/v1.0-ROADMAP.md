# Roadmap: Chronicle AI

**Milestones:** v1.0 MVP (complete), v1.1 Daily Driver (active)
**Defined:** 2026-04-09 (v1.0), extended 2026-04-16 (v1.1)
**Granularity:** Coarse

---

## Milestone v1.0: MVP

## Phases

- [x] **Phase 1: Foundation** — Tauri project, SQLite schema, AI-ready data layer, offline guarantee (completed 2026-04-09)
- [x] **Phase 2: Editor & Tags** — Full journal entry creation, editing, mood, auto-save, and tag management (completed 2026-04-10)
- [x] **Phase 3: Timeline & Calendar** — Browsing all entries chronologically and by month (completed 2026-04-11)
- [x] **Phase 4: Search & Discovery** — Full-text search, multi-filter, and On This Day (completed 2026-04-11)
- [x] **Phase 5: Media, Security & Settings** — Photo attachments, app lock, theme/font, and export (completed 2026-04-14)
- [x] **Phase 6: AI Features** — Semantic search, Q&A, and Ollama setup (completed 2026-04-14)

---

## Phase Details

### Phase 1: Foundation
**Goal**: A runnable Tauri app with a production-ready SQLite schema that is AI-compatible from day one and makes zero network calls.
**Depends on**: Nothing
**Requirements**: AI-01, AI-02, AI-03, SETT-04
**Success Criteria** (what must be TRUE):
  1. The app launches as a native desktop window with no errors or network requests
  2. The SQLite database initializes with all tables on first launch, including an `embeddings` table and UUID primary keys on entries
  3. All entry primary keys are UUID TEXT — no auto-increment integer IDs anywhere in the schema
  4. A `metadata` JSON column exists on the entries table, confirmed by inspecting the schema
  5. The app runs fully offline — no network call is made under any condition, including first launch
**Plans:** 3/4 plans complete (gap-closure pass in progress — UAT-01 closed, UAT-02 pending)
Plans:
- [x] 01-01-PLAN.md — Scaffold Tauri v2 project with all dependencies, Tailwind v3 + shadcn/ui design system
- [x] 01-02-PLAN.md — SQLite schema (AI-ready), DB initialization, app shell UI, and empty state
- [x] 01-03-PLAN.md — UAT-01 fix: DB migration ordering (idx_entries_local_date moved after PRAGMA/ALTER guard) + dev-only raw SQLite error surfacing
- [x] 01-04-PLAN.md — UAT-02 fix: lift TitleBar to render in every app state (loading, dbError, PIN setup, PIN entry)
**UI hint**: yes

### Phase 2: Editor & Tags
**Goal**: Users can write, edit, and organize journal entries with rich text, mood, auto-save, and inline tag management.
**Depends on**: Phase 1
**Requirements**: EDIT-01, EDIT-02, EDIT-03, EDIT-04, EDIT-05, EDIT-06, EDIT-07, EDIT-08, TAG-01, TAG-02, TAG-03, TAG-04
**Success Criteria** (what must be TRUE):
  1. User can open a new entry, write rich text (bold, italic, headings, lists, code blocks, blockquotes), and the entry persists after closing and reopening the app
  2. Entry content is stored as clean Markdown — not HTML or ProseMirror JSON — verified by inspecting the database
  3. User can assign a mood (great / good / okay / bad / awful) and set a custom date/time on any entry
  4. Live word count and character count update in real time as the user types, and the entry auto-saves without manual action
  5. User can create a tag inline while writing, see autocomplete suggestions with usage counts, assign a color from 8 presets, and delete tags that have no entries
**Plans**: 3/3 plans complete
Plans:
- [x] 02-01-PLAN.md — TipTap editor integration, Markdown storage, content auto-save
- [x] 02-02-PLAN.md — Entry editing, delete, metadata bar (word/char count, mood selector, date/time picker)
- [x] 02-03-PLAN.md — Tag creation, autocomplete, color picker, inline tag management
**UI hint**: yes

### Phase 3: Timeline & Calendar
**Goal**: Users can browse every entry they have ever written, either as an infinite scrolling list or by navigating a monthly calendar heatmap.
**Depends on**: Phase 2
**Requirements**: TIME-01, TIME-02, TIME-03, TIME-04, TIME-05, TIME-06, TIME-07, CAL-01, CAL-02, CAL-03, CAL-04
**Success Criteria** (what must be TRUE):
  1. User can scroll through all entries in reverse-chronological order and new entries load automatically as they approach the bottom of the list
  2. Each entry card shows date, mood indicator, tags, word count, and a 150-character text preview, with a visible day separator between entries from different dates
  3. User can expand any entry card to read the full text inline, and click it to open the editor
  4. User can view a monthly calendar where days with entries are shaded by intensity, navigate between months, and return to the current month with one click
  5. Clicking a date on the calendar filters the timeline to show only entries from that day
**Plans:** 3/3 plans complete
Plans:
- [x] 03-01-PLAN.md — viewStore + entryStore pagination + view router (JournalView/Sidebar/MetadataBar Back button)
- [x] 03-02-PLAN.md — TimelineView infinite scroll, cards, day separators, expand-in-place
- [x] 03-03-PLAN.md — CalendarView heatmap with month navigation and date-filter integration
**UI hint**: yes

### Phase 4: Search & Discovery
**Goal**: Users can find any past entry by keyword, date range, tag, or mood — and are reminded of memories from this date in prior years.
**Depends on**: Phase 3
**Requirements**: SRCH-01, SRCH-02, SRCH-03, SRCH-04, SRCH-05, SRCH-06, OTD-01, OTD-02
**Success Criteria** (what must be TRUE):
  1. User can type a keyword and see matching entries with the matching text visually highlighted in the results
  2. User can filter entries by date range, one or more tags, and one or more moods simultaneously — filters compose correctly
  3. User can clear all active search terms and filters in a single action and return to the unfiltered timeline
  4. When the user opens the app on a date that has entries from prior years, an "On This Day" section or notification surfaces those entries
**Plans:** 3/3 plans complete
Plans:
- [x] 04-01-PLAN.md — searchStore + search data layer (composable filters, OTD query, tag batch fetch)
- [x] 04-02-PLAN.md — SearchView + SearchFilterBar UI + highlight injection in TimelineCard
- [x] 04-03-PLAN.md — OnThisDay component and TimelineView integration
**UI hint**: yes

### Phase 5: Media, Security & Settings
**Goal**: Users can attach photos to entries, lock the app with a PIN, and control appearance and data export — completing the production-ready v1.
**Depends on**: Phase 4
**Requirements**: MEDIA-01, MEDIA-02, MEDIA-03, MEDIA-04, SEC-01, SEC-02, SEC-03, SETT-01, SETT-02, SETT-03
**Success Criteria** (what must be TRUE):
  1. User can attach one or more photos to an entry by selecting files from disk, view them within the entry, and remove individual photos — photos are stored in the app data directory, not embedded in Markdown
  2. User can set a PIN or password; the app requires it before any content is visible, and auto-locks after a configurable idle period
  3. User can toggle light/dark mode and change font size (small / medium / large) — preferences persist across app restarts
  4. User can export all journal data to a single JSON file that contains entries, tags, moods, and metadata
**Plans:** 4/4 plans complete
Plans:
- [x] 05-01-PLAN.md — PIN security, app lock, idle timeout
- [x] 05-02-PLAN.md — Photo attachments, storage in app data directory
- [x] 05-03-PLAN.md — Settings UI (theme, font size, auto-save interval)
- [x] 05-04-PLAN.md — Data export to JSON, settings persistence
**UI hint**: yes

### Phase 6: AI Features (Semantic Search + Q&A)
**Goal**: Users can find entries by meaning and ask natural language questions about their journal, powered by a local LLM (Ollama) running on their device. All inference stays local — zero network calls, zero data leaves the device.
**Depends on**: Phase 5
**Requirements**: LLMAI-02, LLMAI-03, LLMAI-04
**Success Criteria** (what must be TRUE):
  1. User can search by meaning ("find entries about career anxiety") and get results ranked by semantic similarity, not keyword matches — results are significantly better than keyword search for semantic queries
  2. User can ask natural language questions ("when did I last feel stressed?") and receive AI-generated answers grounded in relevant entries
  3. If Ollama is running on localhost:11434 → semantic search + Q&A are available; if not running → search gracefully falls back to keyword-only, Q&A disabled with helpful message
  4. On first semantic search attempt without Ollama, a guided setup wizard appears with clear, non-technical instructions for installing Ollama and the embedding model
  5. All inference is local (vector embeddings, LLM completion) — no entries, embeddings, or questions ever leave the device
**Plans:** 4/4 plans complete
Plans:
- [x] 06-01-PLAN.md — Ollama service client, embedding generation, AI state store
- [x] 06-02-PLAN.md — Vector search UI, semantic similarity ranking, graceful fallback
- [x] 06-03-PLAN.md — Q&A engine with RAG pipeline, citation extraction, answer grounding
- [x] 06-04-PLAN.md — Ollama setup wizard, settings integration, health check UI
**UI hint**: yes

---

## Coverage (v1.0)

- v1 requirements: 45
- Mapped: 45
- Unmapped: 0

| Phase | Requirements |
|-------|-------------|
| 1 — Foundation | AI-01, AI-02, AI-03, SETT-04 |
| 2 — Editor & Tags | EDIT-01, EDIT-02, EDIT-03, EDIT-04, EDIT-05, EDIT-06, EDIT-07, EDIT-08, TAG-01, TAG-02, TAG-03, TAG-04 |
| 3 — Timeline & Calendar | TIME-01, TIME-02, TIME-03, TIME-04, TIME-05, TIME-06, TIME-07, CAL-01, CAL-02, CAL-03, CAL-04 |
| 4 — Search & Discovery | SRCH-01, SRCH-02, SRCH-03, SRCH-04, SRCH-05, SRCH-06, OTD-01, OTD-02 |
| 5 — Media, Security & Settings | MEDIA-01, MEDIA-02, MEDIA-03, MEDIA-04, SEC-01, SEC-02, SEC-03, SETT-01, SETT-02, SETT-03 |
| 6 — AI Features | LLMAI-02, LLMAI-03, LLMAI-04 |

---

## Progress (v1.0)

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 3/4 | Gap-closure (UAT-01 fixed 2026-04-17; 01-04 UAT-02 pending) | 2026-04-09 (v1.0 base) |
| 2. Editor & Tags | 3/3 | Complete | 2026-04-10 |
| 3. Timeline & Calendar | 3/3 | Complete | 2026-04-11 |
| 4. Search & Discovery | 3/3 | Complete | 2026-04-11 |
| 5. Media, Security & Settings | 4/4 | Complete | 2026-04-14 |
| 6. AI Features | 4/4 | Complete | 2026-04-14 |

---

## Milestone v1.1: Daily Driver

**Goal:** Turn Chronicle AI from a working MVP into a habit-forming daily driver — land users on a rich home dashboard, smooth every interaction, and make AI assist quietly while writing.

**Constraints preserved from v1.0:** zero network calls, Ollama-only AI, Tailwind v3 pin, no new runtime dependencies preferred.

## Phases

- [ ] **Phase 7: Foundation & Derived State** — Architectural primitives that unblock every downstream widget (derived selectors, SQL aggregates, `local_date` column, animations.css with reduced-motion guard, ColorGrid primitive)
- [ ] **Phase 8: Home Dashboard & Widgets** — Overview as default view with 7 widgets (stat cards, mood trends, On This Day, recent entries, writing prompts, AI insights, Quick-Write FAB)
- [ ] **Phase 9: First-Run Onboarding** — 3-step welcome flow with SQLite-persisted completion, auto-skip for existing users, replay from Settings
- [ ] **Phase 10: Auto-Tagging AI Pipeline** — Sparkle-triggered local LLM tag suggestions with JSON-Schema constraint, ghost-chip accept/dismiss UX, off by default
- [ ] **Phase 11: Microinteractions & Tag Management** — Dashboard stagger-in, tag-pill pop-in, modal scales, mood spring feedback; expanded 12-color palette + Tag Management settings view

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
**Plans**: 5/5 plans defined
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
**Plans**: TBD
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
Phase 7: Foundation & Derived State
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

## Progress (v1.1)

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 7. Foundation & Derived State | 0/5 | Plans defined | — |
| 8. Home Dashboard & Widgets | 0/TBD | Not started | — |
| 9. First-Run Onboarding | 0/TBD | Not started | — |
| 10. Auto-Tagging AI Pipeline | 0/TBD | Not started | — |
| 11. Microinteractions & Tag Management | 0/TBD | Not started | — |

---

*Roadmap last updated: 2026-04-17 — Phase 7 decomposed into 5 plans (2 waves)*
