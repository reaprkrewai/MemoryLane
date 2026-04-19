# Requirements: Chronicle AI — v1.1 Daily Driver

**Defined:** 2026-04-16
**Active milestone:** v1.1 Daily Driver
**Prior milestone:** v1.0 MVP shipped 2026-04-18 — see [milestones/v1.0-REQUIREMENTS.md](milestones/v1.0-REQUIREMENTS.md)
**Core Value:** A journaling app where AI understands your entries — and none of it ever touches the internet.

## v1.1 Requirements — Daily Driver

Goal: turn the working MVP into a habit-forming daily driver — land users on a rich home dashboard, smooth every interaction, and make AI assist quietly while writing.

### Foundation (architectural primitives — unblock downstream widgets)

- [x] **FOUND-01**: `entryStore` exposes derived primitive selectors (`totalEntries`, `dayStreak`, `moodCounts`, `recentEntries`) that dashboard widgets subscribe to instead of `allEntries` — prevents re-render storms during auto-save
- [x] **FOUND-02**: `src/lib/dbQueries.ts` exposes `getEntryStats()` that returns entry aggregates (total, this-month, streak, total-tags) via single SQL query, independent of timeline pagination
- [x] **FOUND-03**: `entries.local_date TEXT` column stores the entry's local-date-at-creation (`YYYY-MM-DD`); new entries write it on insert; existing entries backfilled best-effort from UTC; streak calculations query this column
- [x] **FOUND-04**: `src/styles/animations.css` defines shared keyframes (fade-in, slide-up, pop-in, stagger-in) + motion tokens and a `@media (prefers-reduced-motion: reduce)` stanza that disables all animations

### Dashboard — Overview Landing View

- [ ] **DASH-01**: Overview is the default view on app launch (activeView initializes to `overview`)
- [ ] **DASH-02**: User sees 4 stat cards on Overview: current streak, total entries, entries this month, total tags — populated from `getEntryStats()` not `allEntries.length`
- [ ] **DASH-03**: Current streak displays as `N/7 days this week` (capped weekly framing) not an infinite counter
- [ ] **DASH-04**: User sees a 30-day MoodTrends time-series line/bar chart rendered as inline SVG (no charting library)
- [ ] **DASH-05**: User sees the 30-day MoodOverview emoji-constellation widget alongside MoodTrends — both kept as complementary lenses
- [ ] **DASH-06**: User sees an On This Day widget on Overview that surfaces entries from the same date in prior years (wires existing OnThisDay backend)
- [ ] **DASH-07**: User sees a Recent Entries feed of the 5 most recent entries (title/preview/date/mood); clicking one opens it for editing
- [ ] **DASH-08**: User sees a floating Quick-Write FAB in the bottom-right of Overview that creates a new entry and opens it in the editor
- [ ] **DASH-09**: `Ctrl/Cmd+N` creates a new entry from any top-level view (global keyboard shortcut) with `aria-label` and `focus-visible` ring on the FAB
- [ ] **DASH-10**: User sees a Writing Prompts widget that shows one prompt per day, chosen deterministically from a static library of 60+ prompts via `day_of_year % N`
- [ ] **DASH-11**: User can click "Another prompt" on the Writing Prompts widget to cycle to the next prompt in the library
- [ ] **DASH-12**: User sees an AI Insights widget that displays an LLM-generated summary of the last 7 days when available
- [ ] **DASH-13**: AI Insights has a manual "Refresh" button; generated summaries are cached in the `settings` KV table with an `ai_insight_generated_at` timestamp
- [ ] **DASH-14**: AI Insights shows a graceful empty state (no error dialog) when Ollama is unavailable; the refresh button is still visible so the user can retry once Ollama is up

### Onboarding — First-Run Experience

- [ ] **ONBRD-01**: On first launch with zero entries and no prior onboarding completion, user sees a welcome overlay before they can interact with the app
- [ ] **ONBRD-02**: Onboarding is a 3-step linear flow: (1) welcome + privacy promise, (2) dashboard tour pointer, (3) "Write your first entry" CTA
- [ ] **ONBRD-03**: User can skip onboarding at any step; completion/skip state persists in the SQLite `settings` table (not localStorage) so it survives reinstalls
- [ ] **ONBRD-04**: User can replay the onboarding tour from Settings → Help → "Replay tour"
- [ ] **ONBRD-05**: Existing v1.0 users (`COUNT(entries) > 0`) have `onboarding_completed` auto-set at migration so they do NOT see the flow on first v1.1 launch
- [ ] **ONBRD-06**: Tour targets use `data-onboarding="step-name"` attributes on the target elements; tour does not rely on CSS class selectors
- [ ] **ONBRD-07**: OnboardingOverlay is rendered at App.tsx level (above AppShell, alongside SettingsView) so it overlays every top-level view

### Auto-Tagging — Local LLM Tag Suggestions

- [ ] **AUTOTAG-01**: User sees a sparkle "Suggest tags" button in the TagRow of the entry editor (visible only when AI backend is available)
- [ ] **AUTOTAG-02**: Clicking the sparkle calls `hybridAIService.askQuestion` (never `ollamaService` directly) to request 1–3 tag suggestions grounded in the entry's current content
- [ ] **AUTOTAG-03**: The LLM call uses Ollama's `format` JSON-Schema constraint to bound output to a structured tag array with a maximum-length enum of existing tags + up to 2 new-tag proposals
- [ ] **AUTOTAG-04**: Suggestions render as ghost chips the user explicitly accepts (click to add) or dismisses (× to remove) — suggestions are never auto-applied to the entry
- [ ] **AUTOTAG-05**: When Ollama is unavailable, the sparkle button is hidden (consistent with v1.0 `aiStore.available` gating)
- [x] **AUTOTAG-06**: User can toggle "Tag suggestions" in Settings → AI Features; the setting defaults to **off**
- [ ] **AUTOTAG-07**: When Settings toggle is off, the sparkle button is hidden even if AI backend is available

### Microinteractions & Animations

- [ ] **ANIM-01**: Dashboard widgets stagger-in on Overview mount with 50ms-per-card delay (CSS keyframes from `animations.css`)
- [ ] **ANIM-02**: Tag pills scale pop-in on add (0.8→1.0) and scale-out on remove (1.0→0.8 + fade)
- [ ] **ANIM-03**: Modals, popovers, and AlertDialogs fade + scale (0.95→1.0) on open; reverse on close
- [ ] **ANIM-04**: Mood selector buttons provide a tactile spring-feedback animation on click (scale 1.0→0.9→1.0)
- [ ] **ANIM-05**: View transitions between Overview/Timeline/Calendar/Search use a 150ms crossfade
- [ ] **ANIM-06**: All animations honor `prefers-reduced-motion: reduce` — transitions become instant (verified via FOUND-04 stanza)

### Tag UX — Color Picker & Management

- [x] **TAGUX-01**: `src/components/ui/ColorGrid.tsx` primitive renders the tag color palette as an accessible swatch grid; reused wherever a color is selected
- [ ] **TAGUX-02**: Tag color palette expands from 8 to 12 preset colors; each defined as a dual-tone token (`base`, `bg`, `text`) verified to pass WCAG AA contrast in both light and dark themes
- [ ] **TAGUX-03**: User can open a "Tag Management" view from Settings → Tag Management
- [ ] **TAGUX-04**: Tag Management lists all tags with color swatch, usage count, and last-used date; sortable by usage or recency
- [ ] **TAGUX-05**: User can rename a tag from Tag Management; rename propagates to all entries that reference it
- [ ] **TAGUX-06**: User can change a tag's color from Tag Management via the ColorGrid picker; change reflects everywhere (TagPill, autocomplete, timeline)
- [ ] **TAGUX-07**: User can delete a tag from Tag Management only if it has zero entries; delete button is disabled with tooltip otherwise

## Out of Scope

| Feature | Reason |
|---------|--------|
| Cloud sync | Core privacy constraint — data never leaves the device |
| Third-party AI APIs (OpenAI, Anthropic, etc.) | Conflicts with privacy guarantee — all AI must run locally |
| Mobile apps | Desktop-first; mobile is a future major milestone |
| Location / weather auto-tagging | Requires network or GPS access; conflicts with privacy |
| Real-time collaboration | Single-user app by design |
| Web app / browser version | Tauri desktop only |
| Subscriptions / payments | Exploring one-time pricing model; no subscription infra |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| FOUND-01 | Phase 7 | Complete |
| FOUND-02 | Phase 7 | Complete |
| FOUND-03 | Phase 7 | Complete |
| FOUND-04 | Phase 7 | Complete |
| DASH-01 | Phase 8 | Pending |
| DASH-02 | Phase 8 | Pending |
| DASH-03 | Phase 8 | Pending |
| DASH-04 | Phase 8 | Pending |
| DASH-05 | Phase 8 | Pending |
| DASH-06 | Phase 8 | Pending |
| DASH-07 | Phase 8 | Pending |
| DASH-08 | Phase 8 | Pending |
| DASH-09 | Phase 8 | Pending |
| DASH-10 | Phase 8 | Pending |
| DASH-11 | Phase 8 | Pending |
| DASH-12 | Phase 8 | Pending |
| DASH-13 | Phase 8 | Pending |
| DASH-14 | Phase 8 | Pending |
| ONBRD-01 | Phase 9 | Pending |
| ONBRD-02 | Phase 9 | Pending |
| ONBRD-03 | Phase 9 | Pending |
| ONBRD-04 | Phase 9 | Pending |
| ONBRD-05 | Phase 9 | Pending |
| ONBRD-06 | Phase 9 | Pending |
| ONBRD-07 | Phase 9 | Pending |
| AUTOTAG-01 | Phase 10 | Pending |
| AUTOTAG-02 | Phase 10 | Pending |
| AUTOTAG-03 | Phase 10 | Pending |
| AUTOTAG-04 | Phase 10 | Pending |
| AUTOTAG-05 | Phase 10 | Pending |
| AUTOTAG-06 | Phase 10 | Complete |
| AUTOTAG-07 | Phase 10 | Pending |
| ANIM-01 | Phase 11 | Pending |
| ANIM-02 | Phase 11 | Pending |
| ANIM-03 | Phase 11 | Pending |
| ANIM-04 | Phase 11 | Pending |
| ANIM-05 | Phase 11 | Pending |
| ANIM-06 | Phase 11 | Pending |
| TAGUX-01 | Phase 7 | Complete |
| TAGUX-02 | Phase 11 | Pending |
| TAGUX-03 | Phase 11 | Pending |
| TAGUX-04 | Phase 11 | Pending |
| TAGUX-05 | Phase 11 | Pending |
| TAGUX-06 | Phase 11 | Pending |
| TAGUX-07 | Phase 11 | Pending |

**Coverage:**
- v1.1 requirements: 45 total — mapped to phases: 45, unmapped: 0
- Complete: 5 (Phase 7 delivered FOUND-01..04 + TAGUX-01)

---
*Requirements narrowed to v1.1 scope: 2026-04-18 after v1.0 milestone close — v1.0 reqs archived to milestones/v1.0-REQUIREMENTS.md*
