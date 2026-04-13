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

**Coverage:**
- v1 requirements: 45 total
- Mapped to phases: 45
- Unmapped: 0

---
*Requirements defined: 2026-04-09*
*Last updated: 2026-04-09 after roadmap creation*
