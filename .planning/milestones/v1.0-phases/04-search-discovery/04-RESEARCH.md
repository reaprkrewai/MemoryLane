# Phase 4: Search & Discovery - Research

**Researched:** 2026-04-11
**Domain:** SQLite FTS5 full-text search, composable filter UI, "On This Day" memory surfacing
**Confidence:** HIGH

## Summary

Phase 4 adds full-text search, composable multi-filter (date range, tags, moods), match highlighting, and "On This Day" memory surfacing. The SQLite FTS5 infrastructure is already in place: `entries_fts` virtual table with `unicode61` tokenizer, insert/update/delete triggers, and content table pointing to `entries`. No schema migration is needed.

The search view is a new full-page view slot in `JournalView.tsx` (consistent with the calendar swap pattern). A new `searchStore` manages search state in a dedicated Zustand slice. Filters always compose: keyword AND date range AND tags AND moods all apply simultaneously. Highlight injection is done client-side by splitting plain-text content on matched terms and wrapping in `<mark>` tags — this avoids the FTS5 `highlight()` auxiliary function's JOIN context restriction in Tauri's sql plugin.

"On This Day" is a collapsible banner inserted at the top of `TimelineView` body. It queries once on mount using a local-date SQL pattern matching today's month-day across all prior years.

**Primary recommendation:** Implement search as a new Zustand `searchStore` + `SearchView` component. Use client-side highlight injection (not FTS5 `highlight()`) to sidestep the auxiliary-function JOIN restriction. Persist On This Day collapsed state in `uiStore`.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Search UI Architecture**
- Search is a full-page view added to the existing viewStore routing (consistent with Phase 3 Timeline/Calendar swap pattern — sidebar "Search" nav item already exists as a no-op)
- Filters are always visible above search results when the search view is active (no hidden/collapsible filter panel)
- Search is live with 300ms debounce on each keystroke (consistent with TagAutocomplete pattern)
- "On This Day" is a collapsible banner section at the top of the Timeline view (not in Search) — appears only when past entries exist for today's calendar date

**Filter Controls**
- Date range: two separate date pickers (start date + end date), reusing the existing DatePicker component
- Tag filter: clickable tag chips loaded from all existing tags — click to toggle selected/deselected (reuse TagPillReadOnly styling)
- Mood filter: 5 clickable mood pills (same emoji set as MoodSelector) with toggle behavior
- All filters compose simultaneously: keyword search + date range + tag filter + mood filter all apply together

**Search Results Display**
- Matching text highlighted with amber/yellow `<mark>` background (matches #F59E0B accent color at low opacity, e.g., bg-accent/20)
- Reuse TimelineCard format with highlight injection (familiar to users; expand-in-place preserved)
- Results sorted date descending (most recent first — consistent with timeline behavior)
- Show all matching results (no pagination in search — user narrows with filters)

**On This Day**
- Section appears only when past entries exist for today's calendar date in prior years (no empty-state clutter)
- Collapsible — users can hide/expand it; collapsed state persisted in uiStore
- Looks back across all available years (no cap — journaling is long-term)
- Shows all matching entries (typically one per year — no cap needed)

### Claude's Discretion
- FTS5 query construction (exact phrase, tokenization handling, snippet extraction)
- SearchView component internal layout and spacing
- SearchStore shape vs extending viewStore/entryStore
- Tag chip selection state management (local state vs store)
- Exact debounce implementation (useRef timer vs lodash)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SRCH-01 | User can search all entry content by keyword using full-text search (FTS5) | FTS5 `entries_fts` already created with MATCH support; query pattern documented below |
| SRCH-02 | Matching text is highlighted in search results | Client-side highlight injection pattern documented; avoids FTS5 auxiliary function JOIN restriction |
| SRCH-03 | User can filter entries by date range (start date and end date) | SQL WHERE clause with ms-epoch range; DatePicker component reuse documented |
| SRCH-04 | User can filter entries by one or more tags (multi-select) | JOIN to `entry_tags` with IN clause; tag chip toggle pattern documented |
| SRCH-05 | User can filter entries by one or more moods (multi-select) | SQL WHERE mood IN (...) pattern; mood pill toggle reuses MOODS constant from MoodSelector |
| SRCH-06 | User can clear all active filters and search in one action | Single `resetSearch()` action in searchStore sets all filter fields to empty/null |
| OTD-01 | App surfaces entries written on this calendar date in prior years | SQL date() localtime pattern to match MM-DD across years documented below |
| OTD-02 | "On This Day" appears as a dedicated section or notification when past entries exist for today's date | Collapsible banner in TimelineView; conditional render on non-empty result; collapsed state in uiStore |
</phase_requirements>

---

## Standard Stack

### Core (all already in project — no new installs)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@tauri-apps/plugin-sql` | existing | SQLite queries via Rust/sqlx | Already wired; FTS5 queries pass through as raw SQL |
| `zustand` | existing | searchStore state | Same flat-slice pattern as entryStore/tagStore/viewStore |
| `date-fns` | existing | Date arithmetic for OTD query, display formatting | Already used in TimelineView/CalendarView |
| `lucide-react` | existing | Search icon, ChevronDown/Up for collapsible OTD | Already used throughout |

### Supporting (reused components, no new code)

| Component | File | Purpose | Reuse Pattern |
|-----------|------|---------|---------------|
| `DatePicker` | `src/components/DatePicker.tsx` | Start/end date filter inputs | Pass `date` + `onDateChange`; wrap in nullable adapter |
| `TagPillReadOnly` | `src/components/TagPillReadOnly.tsx` | Base for interactive tag filter chips | Clone or add `onClick` + `selected` prop variant |
| `TimelineCard` | `src/components/TimelineCard.tsx` | Search result card display | Add optional `highlights?: string[]` prop for mark injection |
| `MoodSelector` | `src/components/MoodSelector.tsx` | MOODS constant (emoji + label set) | Import MOODS array, render as toggle pills (don't use MoodSelector component — it sets a single mood, not multi-select) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Client-side highlight injection | FTS5 `highlight()` auxiliary fn | `highlight()` has JOIN context restriction; client-side is simpler and more flexible for mark styling |
| Client-side highlight injection | FTS5 `snippet()` auxiliary fn | `snippet()` truncates content; user decision requires full content with highlighting |
| New `searchStore` | Extending `entryStore` | `entryStore` already handles pagination state; mixing search state adds complexity and breaks separation of concerns |
| Separate `searchStore` | Local component state only | Search query + filter state benefits from persistence across view switches |

**Installation:** No new packages needed — all dependencies already installed.

---

## Architecture Patterns

### Recommended Project Structure (additions only)

```
src/
├── stores/
│   └── searchStore.ts        # NEW: search query, filters, results state
├── components/
│   ├── SearchView.tsx         # NEW: full-page search view
│   ├── SearchFilterBar.tsx    # NEW: keyword input + date range + tag/mood toggles
│   ├── OnThisDay.tsx          # NEW: collapsible OTD banner for TimelineView
│   └── TimelineCard.tsx       # MODIFY: add optional highlights prop
```

### Pattern 1: searchStore (Zustand flat slice)

Follow the exact pattern from `entryStore.ts` and `tagStore.ts`:

```typescript
// src/stores/searchStore.ts
import { create } from "zustand";
import { getDb } from "../lib/db";

interface SearchEntry {
  id: string;
  content: string;
  mood: string | null;
  word_count: number;
  created_at: number;
  updated_at: number;
  metadata: string;
}

interface SearchState {
  query: string;
  startDate: number | null;   // ms epoch, null = no filter
  endDate: number | null;     // ms epoch, null = no filter
  selectedTagIds: string[];
  selectedMoods: string[];
  results: SearchEntry[];
  isSearching: boolean;

  setQuery: (q: string) => void;
  setStartDate: (ts: number | null) => void;
  setEndDate: (ts: number | null) => void;
  toggleTag: (id: string) => void;
  toggleMood: (mood: string) => void;
  resetSearch: () => void;
  runSearch: () => Promise<void>;
}
```

### Pattern 2: Composable SQL search query

Build the WHERE clause dynamically based on which filters are active. FTS5 MATCH must use a JOIN when keyword is present; when no keyword, query `entries` directly.

**With keyword:**
```sql
-- Source: SQLite FTS5 docs + project db.ts schema
SELECT e.id, e.content, e.mood, e.word_count, e.created_at, e.updated_at, e.metadata
FROM entries e
JOIN entries_fts fts ON e.rowid = fts.rowid
WHERE entries_fts MATCH ?
  AND e.created_at >= ?          -- start date (only if set)
  AND e.created_at <= ?          -- end date (only if set)
  AND e.mood IN (?, ?, ...)      -- moods (only if any selected)
  AND e.id IN (                  -- tag filter (only if any selected)
    SELECT entry_id FROM entry_tags WHERE tag_id IN (?, ?, ...)
    GROUP BY entry_id HAVING COUNT(DISTINCT tag_id) = ?  -- ALL selected tags must match
  )
ORDER BY e.created_at DESC
```

**Without keyword (filters only):**
```sql
SELECT id, content, mood, word_count, created_at, updated_at, metadata
FROM entries
WHERE created_at >= ?
  AND created_at <= ?
  AND mood IN (...)
  AND id IN (SELECT entry_id FROM entry_tags WHERE tag_id IN (...) GROUP BY entry_id HAVING COUNT(DISTINCT tag_id) = ?)
ORDER BY created_at DESC
```

**Implementation note:** Build the SQL string and params array dynamically in `runSearch()`. Use the tauri plugin-sql parameterized query pattern: `db.select<T[]>(sql, params)`.

### Pattern 3: FTS5 MATCH query sanitization

FTS5 MATCH syntax uses special characters (`"`, `*`, `(`, `)`, `-`, `AND`, `OR`, `NOT`, `NEAR`). Unsanitized user input will throw a SQLite error if it contains these characters.

**Safe approach — wrap user input as a phrase query:**
```typescript
// Wrap in double quotes to treat as phrase search; escape internal double quotes
function toFtsQuery(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  // Escape internal double quotes, then wrap as phrase
  const escaped = trimmed.replace(/"/g, '""');
  return `"${escaped}"`;
}
```

This makes single-word queries match exactly (case-insensitive due to `unicode61` tokenizer) and multi-word queries match as phrases. Acceptable for Phase 4 — advanced query syntax (prefix, OR, NEAR) is Phase 2 AI territory.

### Pattern 4: Client-side highlight injection

Do NOT use FTS5 `highlight()` auxiliary function — it requires calling `highlight(entries_fts, 0, ...)` in a SELECT directly against the FTS table, and the JOIN pattern needed to retrieve full entry fields causes the "unable to use function highlight in the requested context" error documented in SQLite FTS5 issues.

**Client-side approach instead:**
```typescript
// Source: standard string-splitting approach
function injectHighlights(text: string, query: string): React.ReactNode[] {
  if (!query.trim()) return [text];
  // Extract raw terms (strip phrase quotes, split on whitespace)
  const terms = query
    .replace(/"/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")); // escape regex
  if (terms.length === 0) return [text];
  const pattern = new RegExp(`(${terms.join("|")})`, "gi");
  const parts = text.split(pattern);
  return parts.map((part, i) =>
    pattern.test(part)
      ? <mark key={i} className="bg-accent/20 text-text rounded-sm px-[1px]">{part}</mark>
      : part
  );
}
```

Pass the raw query string (before `toFtsQuery()` wrapping) to `injectHighlights()` for display purposes.

**Apply to TimelineCard:** Add `highlights?: string` prop (the raw query string). When present, replace the plain-text preview and expanded content display with highlighted versions.

### Pattern 5: On This Day SQL query

Match today's month and day across all prior years using SQLite's `date()` with `localtime` modifier — same pattern as CalendarView's count query:

```sql
-- Source: project CalendarView.tsx + SQLite date() docs
SELECT id, content, mood, word_count, created_at, updated_at, metadata
FROM entries
WHERE strftime('%m-%d', created_at / 1000, 'unixepoch', 'localtime') = ?
  AND date(created_at / 1000, 'unixepoch', 'localtime') < date('now', 'localtime')
ORDER BY created_at DESC
```

Parameter: today's `MM-DD` string, e.g. `"04-11"`.

The second condition `< date('now', 'localtime')` excludes today's entries (only show prior years).

**Call once on mount in `OnThisDay` component.** No need to rerun unless date changes (app is typically opened once per day).

### Pattern 6: uiStore extension for OTD collapsed state

Add to `uiStore.ts` following the existing flat slice pattern:

```typescript
// Add to UIState interface:
onThisDayCollapsed: boolean;
setOnThisDayCollapsed: (v: boolean) => void;

// Add to initial state:
onThisDayCollapsed: false,

// Add action:
setOnThisDayCollapsed: (v) => set({ onThisDayCollapsed: v }),
```

### Pattern 7: viewStore "search" view

Add `"search"` to the `ActiveView` union in `viewStore.ts`:

```typescript
// Current: export type ActiveView = "timeline" | "editor" | "calendar";
// New:
export type ActiveView = "timeline" | "editor" | "calendar" | "search";
```

Then wire in three places:
1. `Sidebar.tsx` `handleNavClick` — add `else if (id === "search") setView("search")`
2. `Sidebar.tsx` `activeId` computed — add `activeView === "search" ? "search" : ...`
3. `JournalView.tsx` — add `if (activeView === "search") return <SearchView />;` before the fallback `return <TimelineView />`

### Anti-Patterns to Avoid

- **Using FTS5 `highlight()` in a JOIN query:** Causes "unable to use function highlight in the requested context" SQLite error. Use client-side injection instead.
- **Using FTS5 `snippet()` for result display:** `snippet()` truncates to max 64 tokens and loses content context. The decision requires full content with highlights.
- **Unescaped FTS5 MATCH strings:** Passing raw user input to MATCH without phrase-quoting causes SQLite parse errors on special characters (`(`, `)`, `-`, `"`, `*`, `NOT`, `AND`, `OR`).
- **Running search on every state change without debounce:** FTS5 queries are fast but still hit the DB. Debounce at 300ms using `useRef` timer (same approach as `TagAutocomplete` — no lodash needed).
- **Querying OTD on every render:** Run once on component mount with a boolean guard or `useEffect` with `[]` dep.
- **Tag filter with OR semantics when user expects AND:** If user selects tags A and B, they likely mean "entries with BOTH A and B", not "entries with A or B". Use `HAVING COUNT(DISTINCT tag_id) = ?` to enforce AND semantics.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Full-text search index | Custom inverted index | FTS5 (already wired) | Handles tokenization, diacritics, triggers — it's production-grade and already exists in db.ts |
| Date formatting for OTD | Custom date string parser | `date-fns` `format()` (already installed) | Handles DST, locale edge cases |
| Debounce | Custom timer class | `useRef` + `setTimeout` (project pattern from TagAutocomplete) | Consistent with codebase, no new dep |
| Regex highlight | External library | Inline split-and-mark (10 lines) | Simple enough; external lib adds dependency for trivial problem |

**Key insight:** Every piece of infrastructure this phase needs already exists. The work is wiring — new store, new view component, SQL query construction, and small modifications to existing components.

---

## Common Pitfalls

### Pitfall 1: FTS5 auxiliary functions in JOIN context
**What goes wrong:** Using `SELECT highlight(entries_fts, 0, '<mark>', '</mark>') FROM entries JOIN entries_fts ON ...` throws "unable to use function highlight in the requested context".
**Why it happens:** FTS5 auxiliary functions (`highlight`, `snippet`, `bm25`) can only be called in a SELECT where the FROM clause directly references the FTS virtual table with a MATCH query. JOINs break this context.
**How to avoid:** Use client-side highlight injection (Pattern 4 above). Call `highlight()` only if querying `entries_fts` alone (no JOIN), then separately join to get full entry data if needed.
**Warning signs:** SQLite error message containing "unable to use function highlight in the requested context".

### Pitfall 2: Raw user input crashes FTS5 MATCH
**What goes wrong:** User types `(diary)` or `work-life` or `NOT` and the MATCH query throws a SQLite parse error, crashing the search.
**Why it happens:** FTS5 MATCH syntax treats `(`, `)`, `-`, `*`, `"`, `AND`, `OR`, `NOT`, `NEAR` as operators.
**How to avoid:** Always wrap user input as a phrase query: `'"' + raw.replace(/"/g, '""') + '"'`. This treats the entire input as a phrase search.
**Warning signs:** SQLite error on search; easy to miss in testing if you only test single English words.

### Pitfall 3: Unix milliseconds vs. seconds in date comparisons
**What goes wrong:** OTD query returns no results even though entries exist for today's date in prior years, OR returns all entries.
**Why it happens:** The `entries` table stores `created_at` as Unix **milliseconds** (`Date.now()`), but `unixepoch()` expects **seconds**. Must divide by 1000.
**How to avoid:** Use `created_at / 1000, 'unixepoch'` consistently — same pattern CalendarView already uses.
**Warning signs:** Query returns 0 rows when you know there are matches; test with a known entry from a prior year.

### Pitfall 4: Timezone-naive date comparisons in OTD
**What goes wrong:** An entry written "today" in the user's local timezone is counted as "yesterday" or "tomorrow" by the SQL query.
**Why it happens:** SQLite stores UTC timestamps; without `'localtime'` modifier, date() comparisons use UTC.
**How to avoid:** Always use `date(created_at / 1000, 'unixepoch', 'localtime')` and `strftime('%m-%d', created_at / 1000, 'unixepoch', 'localtime')`. This is already established in CalendarView.
**Warning signs:** Test with an entry created after UTC midnight but before local midnight (common in UTC+X timezones).

### Pitfall 5: Tag filter AND vs. OR confusion
**What goes wrong:** Selecting tags "Work" and "Ideas" returns entries with either tag (OR), but user expects only entries with both.
**Why it happens:** Simple `IN` query does OR semantics.
**How to avoid:** Use `GROUP BY entry_id HAVING COUNT(DISTINCT tag_id) = N` where N is the number of selected tags.
**Warning signs:** Noticeably too many results when multiple tags are selected.

### Pitfall 6: Empty FTS5 MATCH query
**What goes wrong:** Calling `entries_fts MATCH ""` or `entries_fts MATCH '""'` throws a SQLite FTS5 parse error ("fts5: syntax error near ''").
**Why it happens:** FTS5 does not accept empty MATCH strings.
**How to avoid:** In `runSearch()`, check `query.trim() === ""` before building the FTS5 path — fall back to the filter-only query (no MATCH clause).
**Warning signs:** Crash on first render of SearchView when query is empty; test with empty input.

### Pitfall 7: DatePicker component requires a Date, not null
**What goes wrong:** `DatePicker` prop `date: Date` is not nullable per its interface. Passing `null` causes a runtime crash.
**Why it happens:** The existing `DatePicker` was designed for the entry editor where a date is always present.
**How to avoid:** Wrap DatePicker in a nullable adapter: when `startDate` / `endDate` are null, render a placeholder button instead of DatePicker. Only render DatePicker when a date is set, and provide a "clear" button next to each.
**Warning signs:** TypeScript error on the `date` prop; null date crash on initial SearchView render.

---

## Code Examples

### Verified patterns from existing codebase and SQLite docs

### Query: FTS5 keyword + filters (composable)
```typescript
// Built dynamically in searchStore.runSearch()
// Source: project db.ts + SQLite FTS5 docs (https://www.sqlite.org/fts5.html)

async function runSearch() {
  const { query, startDate, endDate, selectedTagIds, selectedMoods } = get();
  const db = await getDb();

  const hasKeyword = query.trim().length > 0;
  const hasDates = startDate !== null || endDate !== null;
  const hasTags = selectedTagIds.length > 0;
  const hasMoods = selectedMoods.length > 0;

  // If all filters are empty: return all entries (or empty results)
  // Decision: show no results when all filters empty (user hasn't searched yet)
  if (!hasKeyword && !hasDates && !hasTags && !hasMoods) {
    set({ results: [], isSearching: false });
    return;
  }

  const conditions: string[] = [];
  const params: unknown[] = [];

  let fromClause: string;

  if (hasKeyword) {
    const ftsQuery = `"${query.trim().replace(/"/g, '""')}"`;
    fromClause = `entries e JOIN entries_fts ON e.rowid = entries_fts.rowid`;
    conditions.push(`entries_fts MATCH ?`);
    params.push(ftsQuery);
  } else {
    fromClause = `entries e`;
  }

  if (startDate !== null) {
    conditions.push(`e.created_at >= ?`);
    params.push(startDate);
  }
  if (endDate !== null) {
    // Include full end day: add 86400000ms (1 day) to end-of-day
    conditions.push(`e.created_at < ?`);
    params.push(endDate + 86400000);
  }
  if (hasMoods) {
    const placeholders = selectedMoods.map(() => "?").join(", ");
    conditions.push(`e.mood IN (${placeholders})`);
    params.push(...selectedMoods);
  }
  if (hasTags) {
    const placeholders = selectedTagIds.map(() => "?").join(", ");
    conditions.push(
      `e.id IN (SELECT entry_id FROM entry_tags WHERE tag_id IN (${placeholders}) GROUP BY entry_id HAVING COUNT(DISTINCT tag_id) = ?)`
    );
    params.push(...selectedTagIds, selectedTagIds.length);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const sql = `SELECT e.id, e.content, e.mood, e.word_count, e.created_at, e.updated_at, e.metadata
               FROM ${fromClause} ${where} ORDER BY e.created_at DESC`;

  const rows = await db.select<SearchEntry[]>(sql, params);
  set({ results: rows, isSearching: false });
}
```

### Query: On This Day
```sql
-- Source: project CalendarView.tsx pattern + SQLite date() docs
SELECT id, content, mood, word_count, created_at, updated_at, metadata
FROM entries
WHERE strftime('%m-%d', created_at / 1000, 'unixepoch', 'localtime') = ?
  AND date(created_at / 1000, 'unixepoch', 'localtime') < date('now', 'localtime')
ORDER BY created_at DESC
```
Parameter: `format(new Date(), "MM-dd")` — e.g. `"04-11"`.

### ViewStore "search" addition
```typescript
// src/stores/viewStore.ts
// Source: existing viewStore.ts
export type ActiveView = "timeline" | "editor" | "calendar" | "search";

// In Sidebar.tsx activeId computation:
const activeId =
  activeView === "calendar" ? "calendar"
  : activeView === "search" ? "search"
  : activeView === "timeline" || activeView === "editor" ? "journal"
  : "journal";

// In handleNavClick:
} else if (id === "search") {
  setView("search");
}
```

### JournalView routing
```typescript
// src/components/JournalView.tsx
// Source: existing JournalView.tsx pattern
if (activeView === "calendar") return <CalendarView />;
if (activeView === "search") return <SearchView />;   // ADD THIS
if (activeView === "editor" && selectedEntryId) return <EntryEditor entryId={selectedEntryId} />;
return <TimelineView />;
```

### TimelineCard highlights prop
```typescript
// src/components/TimelineCard.tsx — add optional prop
interface TimelineCardProps {
  entry: TimelineCardEntry;
  tags: TimelineCardTag[];
  expanded: boolean;
  onToggleExpand: () => void;
  onOpen: () => void;
  searchQuery?: string;  // ADD: raw query string for client-side highlight
}
// In the preview section, when searchQuery is present:
// replace: <p className="mt-2 text-body text-text">{preview}</p>
// with:    <p className="mt-2 text-body text-text">{injectHighlights(preview, searchQuery)}</p>
```

### Debounce in SearchView (useRef pattern — consistent with codebase)
```typescript
// Source: project entryStore.ts module-level timer pattern, adapted to component
const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

const handleQueryChange = (value: string) => {
  setQuery(value); // update store immediately for UI
  if (debounceRef.current) clearTimeout(debounceRef.current);
  debounceRef.current = setTimeout(() => {
    void runSearch();
  }, 300);
};

// Cleanup on unmount:
useEffect(() => () => {
  if (debounceRef.current) clearTimeout(debounceRef.current);
}, []);
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| LIKE '%keyword%' full-text search | FTS5 virtual table with MATCH | SQLite 3.9+ (2015) | Orders-of-magnitude faster; tokenization-aware; already in this project |
| Manual highlight inject via dangerouslySetInnerHTML | React node array with inline `<mark>` elements | React 16+ | Avoids XSS; safe for user content |

**Deprecated/outdated:**
- FTS4: superseded by FTS5 (this project already uses FTS5)
- `OFFSET`-based pagination for search: the decision to show all results (user narrows with filters) avoids this entirely

---

## Open Questions

1. **Should search results show count / "X results" label?**
   - What we know: Not mentioned in requirements or decisions
   - What's unclear: Whether a count label helps UX
   - Recommendation: Add simple `{results.length} result{results.length !== 1 ? 's' : ''}` label below filter bar — low effort, high value, does not conflict with any decision

2. **What should SearchView show before any input?**
   - What we know: Decision says "no pagination" and "show all matching results" — implies results only appear after search
   - What's unclear: Empty state message (prompting user to search) vs. showing recent entries
   - Recommendation: Show an empty state prompt ("Type to search your journal...") when all filters are empty — consistent with the query returning no results when nothing is set

3. **DatePicker for filter: date only (no time picker)?**
   - What we know: Existing `DatePicker` component includes a time picker and is designed for setting entry date
   - What's unclear: Whether the time picker should appear in search filter context
   - Recommendation: Build a simplified `DateFilterPicker` that reuses the shadcn `Calendar` component directly (without the time input) — start-of-day / end-of-day is correct semantics for date range filters

---

## Environment Availability

Step 2.6: SKIPPED — Phase 4 is purely code changes using already-installed dependencies. No new external tools, runtimes, services, or CLI utilities are required.

---

## Sources

### Primary (HIGH confidence)
- SQLite FTS5 official documentation (https://www.sqlite.org/fts5.html) — MATCH syntax, highlight(), snippet(), content table behavior, query restrictions
- Project source: `src/lib/db.ts` — verified FTS5 virtual table definition, tokenizer, triggers
- Project source: `src/stores/viewStore.ts`, `entryStore.ts`, `tagStore.ts`, `uiStore.ts` — verified store patterns
- Project source: `src/components/CalendarView.tsx` — verified `localtime` date query pattern
- Project source: `src/components/TimelineCard.tsx`, `DatePicker.tsx`, `TagPillReadOnly.tsx`, `MoodSelector.tsx` — verified reusable component interfaces

### Secondary (MEDIUM confidence)
- SQLite FTS5 highlight() JOIN context restriction — documented in SQLite forum post + GitHub gist (lemon24/49b0a999b26f7a40ba23d8d4fab4a828) cross-referenced with official FTS5 docs

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all dependencies verified present in project; no new installs
- Architecture: HIGH — all integration points verified by reading actual source files
- SQL query patterns: HIGH — FTS5 docs + existing project patterns confirmed
- Pitfalls: HIGH (FTS5 auxiliary restriction, timezone, empty MATCH) — verified via official docs and community sources

**Research date:** 2026-04-11
**Valid until:** 2026-05-11 (stable domain — SQLite FTS5 API is unchanged for years; Zustand patterns stable)
