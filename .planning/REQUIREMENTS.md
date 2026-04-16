# Requirements: Chronicle AI

**Defined:** 2026-04-09
**Core Value:** A journaling app where you can eventually have AI understand your entries — and none of it ever touches the internet.

## v1 Requirements

### Editor

- [x] **EDIT-01**: User can create a journal entry with rich text (bold, italic, headings, lists, code blocks, blockquote)
- [x] **EDIT-02**: User can edit and delete existing entries
- [x] **EDIT-03**: Entry content is stored as clean Markdown (not HTML or ProseMirror JSON)
- [x] **EDIT-04**: Entry auto-saves 500ms after the user stops typing, and every 5 seconds while typing continues
- [x] **EDIT-05**: User can configure the auto-save interval (5s / 10s / 30s)
- [x] **EDIT-06**: User can see live word count and character count while writing
- [x] **EDIT-07**: User can assign a mood to an entry (great / good / okay / bad / awful)
- [x] **EDIT-08**: User can set the entry date/time (defaults to current time)

### Tags

- [x] **TAG-01**: User can create and assign tags to an entry while writing (on-the-fly creation)
- [x] **TAG-02**: Tag input shows autocomplete from existing tags with usage count
- [x] **TAG-03**: Each tag has a color selected from 8 preset colors
- [x] **TAG-04**: User can delete tags that have no entries

### Timeline

- [x] **TIME-01**: User can view all entries in a reverse-chronological timeline
- [x] **TIME-02**: Timeline loads entries in pages of 20 using keyset pagination (no OFFSET)
- [x] **TIME-03**: Timeline loads more entries automatically as user scrolls toward the bottom (infinite scroll)
- [x] **TIME-04**: Each entry card shows: date, mood indicator, tags, word count, and 150-character text preview
- [x] **TIME-05**: User can expand an entry card to read the full entry inline
- [x] **TIME-06**: Visual separator appears between entries from different calendar days
- [x] **TIME-07**: User can click an entry to open it for editing

### Calendar

- [x] **CAL-01**: User can view a monthly calendar with a heatmap showing entry count per day (color intensity = more entries)
- [x] **CAL-02**: User can navigate to previous and next months
- [x] **CAL-03**: User can click "Today" to return to the current month
- [x] **CAL-04**: User can click a date on the calendar to filter the timeline to entries from that day

### Search & Filter

- [x] **SRCH-01**: User can search all entry content by keyword using full-text search (FTS5)
- [x] **SRCH-02**: Matching text is highlighted in search results
- [x] **SRCH-03**: User can filter entries by date range (start date and end date)
- [x] **SRCH-04**: User can filter entries by one or more tags (multi-select)
- [x] **SRCH-05**: User can filter entries by one or more moods (multi-select)
- [x] **SRCH-06**: User can clear all active filters and search in one action

### On This Day

- [x] **OTD-01**: App surfaces entries written on this calendar date in prior years (implemented 2026-04-11 in 04-03-PLAN)
- [x] **OTD-02**: "On This Day" appears as a dedicated section or notification when past entries exist for today's date (implemented 2026-04-11 in 04-03-PLAN)

### Security

- [ ] **SEC-01**: User can set a PIN or password to lock the app
- [ ] **SEC-02**: Locked app requires PIN/password entry before content is visible
- [ ] **SEC-03**: App auto-locks after a configurable idle period

### Media

- [ ] **MEDIA-01**: User can attach one or more photos to an entry by selecting files from disk
- [ ] **MEDIA-02**: Photos are stored in the app data directory (not embedded in Markdown content)
- [ ] **MEDIA-03**: Attached photos are displayed within the entry view
- [ ] **MEDIA-04**: User can remove an attached photo from an entry

### Settings & Export

- [x] **SETT-01**: User can toggle between light mode and dark mode
- [x] **SETT-02**: User can select a font size (small / medium / large)
- [ ] **SETT-03**: User can export all journal data to a JSON file
- [x] **SETT-04**: App works 100% offline — no network calls, no telemetry, no analytics

### AI Readiness (schema-level, Phase 2 foundation)

- [x] **AI-01**: Database schema includes an `embeddings` table from initial migration (empty in v1, populated in v2)
- [x] **AI-02**: All entry primary keys are UUID TEXT (not auto-increment integers)
- [x] **AI-03**: Entries table includes a `metadata` JSON column for future fields without schema migrations

## v1.1 Requirements — Daily Driver

Requirements for milestone v1.1. Goal: turn the working MVP into a habit-forming daily driver — land users on a rich home dashboard, smooth every interaction, and make AI assist quietly while writing.

### Foundation (architectural primitives — unblock downstream widgets)

- [ ] **FOUND-01**: `entryStore` exposes derived primitive selectors (`totalEntries`, `dayStreak`, `moodCounts`, `recentEntries`) that dashboard widgets subscribe to instead of `allEntries` — prevents re-render storms during auto-save
- [ ] **FOUND-02**: `src/lib/dbQueries.ts` exposes `getEntryStats()` that returns entry aggregates (total, this-month, streak, total-tags) via single SQL query, independent of timeline pagination
- [ ] **FOUND-03**: `entries.local_date TEXT` column stores the entry's local-date-at-creation (`YYYY-MM-DD`); new entries write it on insert; existing entries backfilled best-effort from UTC; streak calculations query this column
- [ ] **FOUND-04**: `src/styles/animations.css` defines shared keyframes (fade-in, slide-up, pop-in, stagger-in) + motion tokens and a `@media (prefers-reduced-motion: reduce)` stanza that disables all animations

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
- [ ] **AUTOTAG-06**: User can toggle "Tag suggestions" in Settings → AI Features; the setting defaults to **off**
- [ ] **AUTOTAG-07**: When Settings toggle is off, the sparkle button is hidden even if AI backend is available

### Microinteractions & Animations

- [ ] **ANIM-01**: Dashboard widgets stagger-in on Overview mount with 50ms-per-card delay (CSS keyframes from `animations.css`)
- [ ] **ANIM-02**: Tag pills scale pop-in on add (0.8→1.0) and scale-out on remove (1.0→0.8 + fade)
- [ ] **ANIM-03**: Modals, popovers, and AlertDialogs fade + scale (0.95→1.0) on open; reverse on close
- [ ] **ANIM-04**: Mood selector buttons provide a tactile spring-feedback animation on click (scale 1.0→0.9→1.0)
- [ ] **ANIM-05**: View transitions between Overview/Timeline/Calendar/Search use a 150ms crossfade
- [ ] **ANIM-06**: All animations honor `prefers-reduced-motion: reduce` — transitions become instant (verified via FOUND-04 stanza)

### Tag UX — Color Picker & Management

- [ ] **TAGUX-01**: `src/components/ui/ColorGrid.tsx` primitive renders the tag color palette as an accessible swatch grid; reused wherever a color is selected
- [ ] **TAGUX-02**: Tag color palette expands from 8 to 12 preset colors; each defined as a dual-tone token (`base`, `bg`, `text`) verified to pass WCAG AA contrast in both light and dark themes
- [ ] **TAGUX-03**: User can open a "Tag Management" view from Settings → Tag Management
- [ ] **TAGUX-04**: Tag Management lists all tags with color swatch, usage count, and last-used date; sortable by usage or recency
- [ ] **TAGUX-05**: User can rename a tag from Tag Management; rename propagates to all entries that reference it
- [ ] **TAGUX-06**: User can change a tag's color from Tag Management via the ColorGrid picker; change reflects everywhere (TagPill, autocomplete, timeline)
- [ ] **TAGUX-07**: User can delete a tag from Tag Management only if it has zero entries; delete button is disabled with tooltip otherwise

## v2 Requirements

### Local AI (Ollama integration)

- **LLMAI-01**: User can connect a local Ollama instance (running on their machine)
- **LLMAI-02**: App generates vector embeddings for entries using a local model (e.g., nomic-embed-text)
- **LLMAI-03**: User can perform semantic search ("find entries similar to this one")
- **LLMAI-04**: User can ask a natural language question about their journal ("when did I last feel stressed about work?")
- **LLMAI-05**: User can request an AI-generated summary of entries in a date range
- **LLMAI-06**: AI features work entirely offline — no entries or queries leave the device

### Sync (self-hosted only)

- **SYNC-01**: User can configure a self-hosted sync endpoint
- **SYNC-02**: Entries sync end-to-end encrypted across user's own devices

### Media (extended)

- **MEDIA-05**: User can record and attach audio notes to entries
- **MEDIA-06**: Optional: local Whisper.cpp transcription of audio to text

### Import

- **IMP-01**: User can import entries from Day One (JSON format)
- **IMP-02**: User can import entries from a standard Markdown folder structure

## Out of Scope

| Feature | Reason |
|---------|--------|
| Cloud sync | Core privacy constraint — data never leaves the device |
| Third-party AI APIs (OpenAI, Anthropic, etc.) | Conflicts with privacy guarantee — all AI must run locally |
| Mobile apps | Desktop-first; mobile is Phase 3+ |
| Location / weather auto-tagging | Requires network or GPS access; out of scope for privacy reasons |
| Real-time collaboration | Single-user app by design |
| Web app / browser version | Tauri desktop only for v1 |
| Subscriptions / payments | Exploring one-time pricing model; no subscription infrastructure in v1 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| EDIT-01 | Phase 2 | Complete |
| EDIT-02 | Phase 2 | Complete |
| EDIT-03 | Phase 2 | Complete |
| EDIT-04 | Phase 2 | Complete |
| EDIT-05 | Phase 2 | Complete |
| EDIT-06 | Phase 2 | Complete |
| EDIT-07 | Phase 2 | Complete |
| EDIT-08 | Phase 2 | Complete |
| TAG-01 | Phase 2 | Complete |
| TAG-02 | Phase 2 | Complete |
| TAG-03 | Phase 2 | Complete |
| TAG-04 | Phase 2 | Complete |
| TIME-01 | Phase 3 | Complete |
| TIME-02 | Phase 3 | Complete |
| TIME-03 | Phase 3 | Complete |
| TIME-04 | Phase 3 | Complete |
| TIME-05 | Phase 3 | Complete |
| TIME-06 | Phase 3 | Complete |
| TIME-07 | Phase 3 | Complete |
| CAL-01 | Phase 3 | Complete |
| CAL-02 | Phase 3 | Complete |
| CAL-03 | Phase 3 | Complete |
| CAL-04 | Phase 3 | Complete |
| SRCH-01 | Phase 4 | Complete |
| SRCH-02 | Phase 4 | Complete |
| SRCH-03 | Phase 4 | Complete |
| SRCH-04 | Phase 4 | Complete |
| SRCH-05 | Phase 4 | Complete |
| SRCH-06 | Phase 4 | Complete |
| OTD-01 | Phase 4 | Complete |
| OTD-02 | Phase 4 | Complete |
| SEC-01 | Phase 5 | Pending |
| SEC-02 | Phase 5 | Pending |
| SEC-03 | Phase 5 | Pending |
| MEDIA-01 | Phase 5 | Pending |
| MEDIA-02 | Phase 5 | Pending |
| MEDIA-03 | Phase 5 | Pending |
| MEDIA-04 | Phase 5 | Pending |
| SETT-01 | Phase 5 | Complete |
| SETT-02 | Phase 5 | Complete |
| SETT-03 | Phase 5 | Pending |
| SETT-04 | Phase 1 | Complete |
| AI-01 | Phase 1 | Complete |
| AI-02 | Phase 1 | Complete |
| AI-03 | Phase 1 | Complete |
| FOUND-01 | Phase 7 | Pending |
| FOUND-02 | Phase 7 | Pending |
| FOUND-03 | Phase 7 | Pending |
| FOUND-04 | Phase 7 | Pending |
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
| AUTOTAG-06 | Phase 10 | Pending |
| AUTOTAG-07 | Phase 10 | Pending |
| ANIM-01 | Phase 11 | Pending |
| ANIM-02 | Phase 11 | Pending |
| ANIM-03 | Phase 11 | Pending |
| ANIM-04 | Phase 11 | Pending |
| ANIM-05 | Phase 11 | Pending |
| ANIM-06 | Phase 11 | Pending |
| TAGUX-01 | Phase 11 | Pending |
| TAGUX-02 | Phase 11 | Pending |
| TAGUX-03 | Phase 11 | Pending |
| TAGUX-04 | Phase 11 | Pending |
| TAGUX-05 | Phase 11 | Pending |
| TAGUX-06 | Phase 11 | Pending |
| TAGUX-07 | Phase 11 | Pending |

**Coverage:**
- v1 requirements: 45 total — mapped to phases: 45, unmapped: 0
- v1.1 requirements: 45 total — mapped to phases: 45, unmapped: 0

---
*Requirements defined: 2026-04-09*
*Last updated: 2026-04-16 after v1.1 Daily Driver roadmap creation (phases 7-11 added)*
