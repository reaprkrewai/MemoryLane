# Roadmap: Chronicle AI

**Milestone:** v1 MVP
**Defined:** 2026-04-09
**Granularity:** Coarse

---

## Phases

- [x] **Phase 1: Foundation** — Tauri project, SQLite schema, AI-ready data layer, offline guarantee (completed 2026-04-09)
- [x] **Phase 2: Editor & Tags** — Full journal entry creation, editing, mood, auto-save, and tag management (completed 2026-04-10)
- [x] **Phase 3: Timeline & Calendar** — Browsing all entries chronologically and by month (completed 2026-04-11)
- [x] **Phase 4: Search & Discovery** — Full-text search, multi-filter, and On This Day (completed 2026-04-11)
- [x] **Phase 5: Media, Security & Settings** — Photo attachments, app lock, theme/font, and export (completed 2026-04-14)
- [ ] **Phase 6: AI Features** — Semantic search, Q&A, and Ollama setup (ready to execute)

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
**Plans:** 2/2 plans complete
Plans:
- [x] 01-01-PLAN.md — Scaffold Tauri v2 project with all dependencies, Tailwind v3 + shadcn/ui design system
- [x] 01-02-PLAN.md — SQLite schema (AI-ready), DB initialization, app shell UI, and empty state
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
**Plans:** 4/4 plans created
Plans:
- [ ] 06-01-PLAN.md — Ollama service client, embedding generation, AI state store
- [ ] 06-02-PLAN.md — Vector search UI, semantic similarity ranking, graceful fallback
- [ ] 06-03-PLAN.md — Q&A engine with RAG pipeline, citation extraction, answer grounding
- [ ] 06-04-PLAN.md — Ollama setup wizard, settings integration, health check UI
**UI hint**: yes

---

## Coverage

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

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 2/2 | Complete | 2026-04-09 |
| 2. Editor & Tags | 3/3 | Complete | 2026-04-10 |
| 3. Timeline & Calendar | 3/3 | Complete | 2026-04-11 |
| 4. Search & Discovery | 3/3 | Complete | 2026-04-11 |
| 5. Media, Security & Settings | 4/4 | Complete | 2026-04-14 |
| 6. AI Features | 0/4 | Planned | — |

---

*Roadmap updated: 2026-04-14 — Phase 6 planning complete*
