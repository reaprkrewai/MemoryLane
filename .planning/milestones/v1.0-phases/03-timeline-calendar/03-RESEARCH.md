# Phase 3: Timeline & Calendar - Research

**Researched:** 2026-04-10
**Domain:** React infinite scroll, keyset pagination, CSS grid calendar heatmap, view routing
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Timeline IS the Journal view. Clicking "Journal" in the sidebar shows the full-width timeline as the main content — the sidebar compact entry list (Phase 2) is superseded. Clicking "Calendar" shows the full calendar view.
- **D-02:** Clicking an entry in the timeline navigates to the editor (TIME-07). The editor gains a "← Back" button (in the MetadataBar or TitleBar area) to return to the timeline.
- **D-03:** "New Entry" button lives in the timeline header row — a persistent button at the top of the timeline view (not a FAB, not in the sidebar).
- **D-04:** Calendar view is full main content when "Calendar" nav is active — the calendar is large and scannable. Clicking a date on the calendar filters the timeline (navigates to Journal view, filtered to that date).
- **D-05:** Entry card preview shows plain text (Markdown stripped) truncated at 150 characters with an ellipsis. No Markdown rendering in the preview.
- **D-06:** Expand inline (TIME-05): clicking an "Expand" control on a card reveals the full entry rendered as Markdown (read-only) in-place within the timeline. A "Collapse" button hides it again. No navigation.
- **D-07:** Day separators (TIME-06): a full-width row with the date label on the left ("Wednesday, Apr 9") and a thin horizontal rule extending to the right. Appears between entries from different calendar days.
- **D-08:** Calendar heatmap implemented as a custom plain CSS grid (7 columns for days of week). No third-party calendar library.
- **D-09:** 4 intensity levels using amber: 0 entries = faint bg/border; 1 entry = amber/10; 2–3 entries = amber/30; 4+ entries = amber/60.
- **D-10:** Calendar occupies the full main content area when the "Calendar" nav item is active.
- **D-11:** IntersectionObserver + sentinel div at the bottom of the list. When the sentinel enters the viewport, load the next page of 20 entries (keyset pagination, no OFFSET).
- **D-12:** Loading state: subtle centered spinner below the last card while fetching the next page. Disappears when entries arrive.

### Claude's Discretion

- Exact visual treatment of the entry card (border, shadow, padding, hover state)
- Mood indicator display on the card (icon vs colored dot vs emoji)
- Whether the "Expand" trigger is a chevron, a button label, or clicking anywhere on the card
- Calendar header layout (month/year label + prev/next arrows + Today button placement)
- Empty state for the timeline (no entries yet) and for a calendar date with no entries

### Deferred Ideas (OUT OF SCOPE)

- Keyword search and filter by tags/mood — Phase 4
- On This Day section — Phase 4
- Animated transitions between calendar months — nice to have, post-v1
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TIME-01 | User can view all entries in a reverse-chronological timeline | View routing in App.tsx/JournalView.tsx; new TimelineView component; entryStore.loadPage() |
| TIME-02 | Timeline loads entries in pages of 20 using keyset pagination (no OFFSET) | Keyset query: `WHERE created_at < :cursor ORDER BY created_at DESC LIMIT 20`; cursor = last entry's created_at |
| TIME-03 | Timeline loads more entries automatically as user scrolls toward the bottom | IntersectionObserver + sentinel div pattern; useRef on sentinel; cleanup on unmount |
| TIME-04 | Each entry card shows: date, mood indicator, tags, word count, and 150-character text preview | Markdown strip regex; TagPill reuse with max-3 cap; mood dot 8px circle; date-fns format |
| TIME-05 | User can expand an entry card to read the full entry inline | Local `expanded` boolean state on card; TipTap Markdown rendering OR marked/remark for read-only prose |
| TIME-06 | Visual separator appears between entries from different calendar days | Group entries by calendar day before rendering; compare `toDateString()` between consecutive entries |
| TIME-07 | User can click an entry to open it for editing | View state: navigate to editor view with entryId; "Back" source token in view state to show back button |
| CAL-01 | User can view a monthly calendar with a heatmap showing entry count per day | Single SQL query: `SELECT date(created_at/1000,'unixepoch') as day, COUNT(*) as count FROM entries WHERE ... GROUP BY day`; custom CSS grid |
| CAL-02 | User can navigate to previous and next months | Local `currentMonth` state (Date object); derive calendar grid from it; ChevronLeft/Right controls |
| CAL-03 | User can click "Today" to return to the current month | Set `currentMonth` to `new Date()` |
| CAL-04 | User can click a date on the calendar to filter the timeline to entries from that day | Navigate to Journal view with `dateFilter` in view state; timeline queries with date bounds |
</phase_requirements>

---

## Summary

Phase 3 is a pure frontend + store extension phase. No Rust changes are needed — all data access continues through `@tauri-apps/plugin-sql`. The two main surfaces (Timeline and Calendar) replace the current `JournalView` → `EntryEditor` direct render with a three-state view router: `timeline`, `editor`, and `calendar`.

The most architecturally significant decision is the view routing model. The current codebase has no routing — `App.tsx` renders `JournalView` directly, which always shows `EntryEditor`. Phase 3 promotes `JournalView` (or a new router component) to own a `activeView` state that switches between the timeline list, the full-screen calendar, and the editor. This state replaces the sidebar's hardcoded `activeId = "journal"` stub and must propagate back to `Sidebar.tsx` so nav items become interactive.

The infinite scroll implementation is straightforward: add `loadPage(cursor?)`, `hasMore`, and `allEntries` accumulator to `entryStore`, then use a single `useEffect` + `IntersectionObserver` on a sentinel div at the list bottom. Keyset pagination via `created_at < cursor` is already indexed (`idx_entries_created_at`). The calendar heatmap requires one aggregate SQL query per month navigation and a pure CSS `grid grid-cols-7` layout — no third-party library per D-08.

**Primary recommendation:** Introduce a `useViewStore` (or extend `useUiStore`) for the active view state (`'timeline' | 'editor' | 'calendar'`), plus `dateFilter: string | null` and `navigateSource: 'timeline' | 'sidebar' | null`. Wire `Sidebar.tsx` to dispatch view changes. Extend `entryStore` with pagination primitives. Build `TimelineView`, `TimelineCard`, `DaySeparator`, `CalendarView` as new components.

---

## Standard Stack

### Core (all already installed — no new installs required)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| zustand | ^5.0.12 | View routing state + pagination state | Already used for entryStore, tagStore, uiStore — flat slice pattern established |
| @tauri-apps/plugin-sql | ^2.4.0 | Keyset pagination queries, monthly aggregate for heatmap | Already used for all DB access |
| lucide-react | ^1.8.0 | ChevronDown/Up expand, ArrowLeft back, ChevronLeft/Right month nav, Loader2 spinner | Already installed; all required icons present |
| date-fns | ^4.1.0 | Date formatting (card date string, day separator label, calendar grid generation) | Already installed; format(), startOfMonth(), endOfMonth(), eachDayOfInterval() |
| tailwindcss | ^3.4.19 | bg-accent/30 opacity modifier syntax for heatmap levels | Confirmed compatible with Tailwind v3 opacity modifiers |

### No New Dependencies

The entire phase is implementable with what is already installed. Specifically:
- **Markdown stripping for preview (D-05):** A small regex or `.replace()` chain — no markdown parser needed for stripping to plain text
- **Read-only Markdown render for inline expand (D-06 / TIME-05):** TipTap is already installed; a read-only `useEditor` instance works, OR use `@tiptap/markdown` to parse + render — both available without new installs
- **Calendar grid:** Pure CSS `grid grid-cols-7` — no react-calendar, no react-day-picker override (react-day-picker is installed but D-08 says custom CSS grid only)
- **IntersectionObserver:** Native browser API, no polyfill needed in Tauri/Chromium

**Installation:** None required.

---

## Architecture Patterns

### Recommended File Structure (new files only)

```
src/
├── components/
│   ├── TimelineView.tsx       # Main timeline container: header, scroll area, sentinel, empty state
│   ├── TimelineCard.tsx       # Single entry card: mood dot, date, preview, tags, expand/collapse
│   ├── DaySeparator.tsx       # Full-width date label + hr between day groups
│   ├── CalendarView.tsx       # Calendar container: header (month nav), grid
│   └── CalendarCell.tsx       # Single day cell with heatmap intensity class
├── stores/
│   └── viewStore.ts           # activeView, navigateSource, dateFilter
└── (extend existing)
    ├── stores/entryStore.ts   # + loadPage(), hasMore, allEntries, resetPagination()
    └── components/
        ├── Sidebar.tsx        # Wire onClick on Journal/Calendar nav items
        ├── JournalView.tsx    # Becomes view router: timeline | editor | calendar
        └── MetadataBar.tsx    # + "Back to Journal" affordance when navigateSource === 'timeline'
```

### Pattern 1: View Router in JournalView

`JournalView.tsx` currently renders `EntryEditor` directly. Promote it to a view router:

```typescript
// JournalView.tsx — view router pattern
import { useViewStore } from "../stores/viewStore";
import { TimelineView } from "./TimelineView";
import { CalendarView } from "./CalendarView";
import { EntryEditor } from "./EntryEditor";

export function JournalView() {
  const activeView = useViewStore((s) => s.activeView);
  const selectedEntryId = useEntryStore((s) => s.selectedEntryId);

  // DB init + ensureFirstEntry still happens here on mount,
  // but we no longer auto-navigate to editor
  useEffect(() => {
    loadEntries().then(() => { /* do NOT call ensureFirstEntry here — that created a blank entry on every open */ });
  }, []);

  if (activeView === "calendar") return <CalendarView />;
  if (activeView === "editor" && selectedEntryId) return <EntryEditor entryId={selectedEntryId} />;
  return <TimelineView />;
}
```

**Important:** `ensureFirstEntry()` created a blank entry on app open — Phase 3 replaces that with a true empty state on the timeline. The empty state shows the `EmptyState` component (already exists with the correct copy).

### Pattern 2: ViewStore (new Zustand slice)

```typescript
// src/stores/viewStore.ts
import { create } from "zustand";

type ActiveView = "timeline" | "editor" | "calendar";
type NavigateSource = "timeline" | "sidebar" | null;

interface ViewState {
  activeView: ActiveView;
  navigateSource: NavigateSource;
  dateFilter: string | null; // ISO date string "2026-04-09", null = no filter

  setView: (view: ActiveView, source?: NavigateSource) => void;
  setDateFilter: (date: string | null) => void;
  navigateToEditor: (source: NavigateSource) => void;
  navigateBack: () => void;
}

export const useViewStore = create<ViewState>((set) => ({
  activeView: "timeline",
  navigateSource: null,
  dateFilter: null,

  setView: (view, source = null) => set({ activeView: view, navigateSource: source }),
  setDateFilter: (date) => set({ dateFilter: date }),
  navigateToEditor: (source) => set({ activeView: "editor", navigateSource: source }),
  navigateBack: () => set({ activeView: "timeline", navigateSource: null }),
}));
```

### Pattern 3: Keyset Pagination in entryStore

Add these fields and actions to the existing `EntryState` interface:

```typescript
// Additions to EntryState
allEntries: Entry[];       // accumulator for infinite scroll
hasMore: boolean;
isLoadingPage: boolean;
pageSize: number;          // 20

loadPage: (cursor?: number) => Promise<void>;  // cursor = created_at of last loaded entry
resetPagination: () => void;
```

```typescript
// loadPage implementation
loadPage: async (cursor?: number) => {
  set({ isLoadingPage: true });
  const db = await getDb();
  const limit = 20;
  const query = cursor
    ? "SELECT ... FROM entries WHERE created_at < ? ORDER BY created_at DESC LIMIT ?"
    : "SELECT ... FROM entries ORDER BY created_at DESC LIMIT ?";
  const params = cursor ? [cursor, limit] : [limit];
  const rows = await db.select<Entry[]>(query, params);
  set((state) => ({
    allEntries: cursor ? [...state.allEntries, ...rows] : rows,
    hasMore: rows.length === limit,
    isLoadingPage: false,
  }));
},

resetPagination: () => set({ allEntries: [], hasMore: true, isLoadingPage: false }),
```

**Key:** `allEntries` is separate from `entries`. `entries` remains the full array (used by sidebar compact list and editor). `allEntries` is the paginated accumulator for the timeline. When an entry is saved, update both arrays.

### Pattern 4: IntersectionObserver Sentinel

```typescript
// TimelineView.tsx — sentinel pattern
const sentinelRef = useRef<HTMLDivElement>(null);
const { allEntries, hasMore, isLoadingPage, loadPage } = useEntryStore();

useEffect(() => {
  const el = sentinelRef.current;
  if (!el) return;
  const observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting && hasMore && !isLoadingPage) {
        const cursor = allEntries.length > 0
          ? allEntries[allEntries.length - 1].created_at
          : undefined;
        loadPage(cursor);
      }
    },
    { threshold: 0.1 }
  );
  observer.observe(el);
  return () => observer.disconnect();
}, [hasMore, isLoadingPage, allEntries]);

// In JSX: render sentinel after last card
<div ref={sentinelRef} className="h-1" />
{isLoadingPage && hasMore && (
  <div className="flex justify-center py-4">
    <Loader2 size={20} className="animate-spin text-muted" />
  </div>
)}
```

### Pattern 5: Day Grouping for Separators

Group `allEntries` by calendar day before rendering. Do this in the component (not the store):

```typescript
// In TimelineView — group entries into day buckets
const grouped = allEntries.reduce<{ date: string; entries: Entry[] }[]>((acc, entry) => {
  const day = new Date(entry.created_at).toDateString(); // e.g. "Wed Apr 09 2026"
  const last = acc[acc.length - 1];
  if (last && last.date === day) {
    last.entries.push(entry);
  } else {
    acc.push({ date: day, entries: [entry] });
  }
  return acc;
}, []);
```

Then render: for each group, output a `<DaySeparator>` then the entry cards for that day.

### Pattern 6: Markdown Strip for Preview (D-05)

No library needed — a small replace chain handles the common Markdown syntax:

```typescript
// src/lib/stripMarkdown.ts
export function stripMarkdown(md: string): string {
  return md
    .replace(/#{1,6}\s+/g, "")        // headings
    .replace(/\*\*(.+?)\*\*/g, "$1")  // bold
    .replace(/\*(.+?)\*/g, "$1")      // italic
    .replace(/`{1,3}[^`]*`{1,3}/g, "") // inline code / code blocks
    .replace(/\[(.+?)\]\(.+?\)/g, "$1") // links
    .replace(/^[-*+]\s+/gm, "")       // list markers
    .replace(/^>\s+/gm, "")           // blockquotes
    .replace(/\n+/g, " ")             // normalize newlines to spaces
    .trim();
}

export function truncatePreview(text: string, maxChars = 150): string {
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars).trimEnd() + "…";
}
```

### Pattern 7: Calendar Heatmap Data Query

One SQL query per month, run when `currentMonth` changes:

```typescript
// CalendarView.tsx
const fetchMonthCounts = async (year: number, month: number) => {
  const db = await getDb();
  // SQLite: created_at is stored as Unix ms; date() converts to YYYY-MM-DD
  const rows = await db.select<{ day: string; count: number }[]>(
    `SELECT date(created_at / 1000, 'unixepoch', 'localtime') as day,
            COUNT(*) as count
     FROM entries
     WHERE date(created_at / 1000, 'unixepoch', 'localtime') >= ?
       AND date(created_at / 1000, 'unixepoch', 'localtime') <= ?
     GROUP BY day`,
    [
      `${year}-${String(month + 1).padStart(2, "0")}-01`,
      `${year}-${String(month + 1).padStart(2, "0")}-31`,
    ]
  );
  // Convert to Map<"YYYY-MM-DD", number>
  return new Map(rows.map((r) => [r.day, r.count]));
};
```

**Note:** Use `'localtime'` modifier in SQLite to respect the user's timezone, since `created_at` is stored as UTC Unix milliseconds. Without `'localtime'`, days near midnight may fall on the wrong calendar date.

### Pattern 8: Calendar Grid Generation with date-fns

```typescript
import {
  startOfMonth, endOfMonth, eachDayOfInterval,
  getDay, format, isSameMonth, isToday
} from "date-fns";

// Generate grid: pad with nulls for leading days of week
const firstDay = startOfMonth(currentMonth);
const lastDay = endOfMonth(currentMonth);
const days = eachDayOfInterval({ start: firstDay, end: lastDay });
const leadingNulls = new Array(getDay(firstDay)).fill(null); // 0=Sun offset
const cells = [...leadingNulls, ...days];
```

### Pattern 9: Heatmap Intensity Class

```typescript
function heatmapClass(count: number): string {
  if (count === 0) return "bg-surface border border-border";
  if (count === 1) return "bg-amber-100/40 dark:bg-amber-900/30";
  if (count <= 3) return "bg-accent/30";
  return "bg-accent/60";
}
```

### Pattern 10: Sidebar Wiring

`Sidebar.tsx` currently has `const activeId = "journal"` hardcoded. Phase 3 wires it to `useViewStore`:

```typescript
// Sidebar.tsx
const activeView = useViewStore((s) => s.activeView);
const setView = useViewStore((s) => s.setView);

// activeId: treat 'editor' as 'journal' for the nav highlight
const activeId = activeView === "calendar" ? "calendar" : "journal";

// onClick for nav items:
onClick={() => {
  if (item.id === "journal") setView("timeline");
  if (item.id === "calendar") setView("calendar");
}
```

### Anti-Patterns to Avoid

- **OFFSET-based pagination:** Never use `LIMIT 20 OFFSET N` — performance degrades with thousands of entries. Use keyset (`WHERE created_at < ?`).
- **Clearing `entries` for pagination:** `allEntries` is a separate accumulator. `entries` (the full Phase 2 sidebar list) must remain intact or the sidebar compact list and editor will break.
- **Re-rendering calendar on every scroll:** Calendar month data fetch is triggered only when `currentMonth` changes, not on every render.
- **`ensureFirstEntry()` in Phase 3:** This Phase 2 behavior auto-created a blank entry on app open. Phase 3 replaces the JournalView with a proper empty state — do NOT call `ensureFirstEntry()` from TimelineView.
- **UTC vs local time in SQL date grouping:** `date(created_at/1000, 'unixepoch')` uses UTC. Add `'localtime'` modifier to group by the user's local calendar date.
- **IntersectionObserver cleanup:** Always call `observer.disconnect()` in the `useEffect` cleanup to avoid memory leaks and ghost triggers after unmount.
- **Keyset cursor off-by-one:** The cursor must be the `created_at` of the *last* loaded entry, and the query must use `<` (strict less-than), not `<=`, to avoid re-fetching the boundary entry.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Calendar grid day layout | Custom date math from scratch | `date-fns` (already installed): `startOfMonth`, `eachDayOfInterval`, `getDay` | Edge cases: leap years, week-start offset, month boundary padding |
| Date formatting | Manual `toLocaleDateString` string building | `date-fns` `format()` | Locale consistency, format string reuse |
| Markdown parsing for inline expand | Custom Markdown renderer | TipTap `useEditor` with `editable: false` + `Markdown` extension (already installed) | Handles all TipTap-supported syntax; consistent with editor rendering |
| Scroll position memory | sessionStorage + manual scroll restoration | Store scroll Y in `viewStore`, restore via `scrollTo` after back navigation | Simple; avoids browser history API complexity |

---

## Common Pitfalls

### Pitfall 1: Stale `allEntries` After Entry Save
**What goes wrong:** User creates a new entry from the timeline header. `createEntry()` in entryStore calls `loadEntries()` (reloads `entries`), but `allEntries` (the paginated accumulator) is not updated — the new entry doesn't appear at the top of the timeline until next page load.
**Why it happens:** `allEntries` is separate from `entries` to avoid breaking pagination state.
**How to avoid:** After `createEntry()`, either call `resetPagination()` + `loadPage()` to reload from scratch, or prepend the new entry to `allEntries` directly.
**Warning signs:** New entry appears in sidebar compact list but not in timeline.

### Pitfall 2: IntersectionObserver Fires Before First Page Loads
**What goes wrong:** On mount, the sentinel div is already in the viewport (no entries yet), triggering duplicate `loadPage()` calls.
**Why it happens:** Sentinel renders immediately; IntersectionObserver callback fires before any data is present.
**How to avoid:** Gate the observer callback on `!isLoadingPage` (already in Pattern 4). Also set `isLoadingPage: true` synchronously before the first `loadPage()` call from `useEffect` on mount.
**Warning signs:** Duplicate entries appearing, or network tab showing two identical initial page requests.

### Pitfall 3: Calendar Date Click Loses Filter on Back Navigation
**What goes wrong:** User clicks April 9 on calendar → sees filtered timeline → clicks back → `dateFilter` is cleared → filtered view lost.
**Why it happens:** `navigateBack()` resets `navigateSource` but must also decide whether to clear `dateFilter`.
**How to avoid:** `navigateBack()` should clear `dateFilter` explicitly when going back from editor to timeline, but the filtered timeline should remain when pressing Back from editor (preserve `dateFilter` in viewStore through the editor round-trip). Specifically: `navigateBack()` should set `activeView: "timeline"` without clearing `dateFilter`.

### Pitfall 4: TagPill onRemove/onColorChange Props in Read-Only Context
**What goes wrong:** `TagPill` (Phase 2) requires `onRemove` and `onColorChange` props — it's a full interactive component with a Popover for color picking. Using it in timeline cards with empty no-op functions will cause unexpected popovers to open on card clicks.
**Why it happens:** `TagPill` opens a color picker Popover on click — clicking a tag pill on a timeline card should NOT open a Popover.
**How to avoid:** Create a new `TagPillReadOnly` component (or add a `readonly` prop to `TagPill`) that renders just the colored pill with no Popover, no remove button. Use this in `TimelineCard`.

### Pitfall 5: `localtime` Missing from SQLite Date Grouping
**What goes wrong:** Calendar heatmap shows entries on the wrong day for users in non-UTC timezones (especially UTC-N users writing at night).
**Why it happens:** `date(created_at/1000, 'unixepoch')` uses UTC; `created_at` stores local wall-clock time as UTC milliseconds.
**How to avoid:** Always use `date(created_at/1000, 'unixepoch', 'localtime')` in all calendar queries.
**Warning signs:** Entries written after 8pm in US timezones appear on the next day in the calendar.

### Pitfall 6: TipTap Read-Only Editor Memory
**What goes wrong:** Creating a `useEditor` instance per expanded card means potentially many TipTap instances live simultaneously as user expands multiple cards.
**Why it happens:** TipTap editors are heavyweight ProseMirror instances.
**How to avoid:** Only allow one card to be expanded at a time (D-06 says "Collapse" button, implying single-expand model), or use a single shared read-only editor instance that receives different content. The simplest approach: enforce one-expanded-at-a-time by storing `expandedEntryId: string | null` in `TimelineView` state rather than per-card boolean.

### Pitfall 7: Back Button Appearing in Sidebar-Initiated Editor Sessions
**What goes wrong:** Back button in MetadataBar shows even when user opened the editor from the sidebar compact list (not from timeline).
**Why it happens:** `navigateSource` not properly set when opening from sidebar.
**How to avoid:** `viewStore.navigateToEditor(source)` must be called with `source = "sidebar"` when clicking from sidebar, and `source = "timeline"` when clicking from timeline. MetadataBar renders back button only when `navigateSource === "timeline"`.

---

## Code Examples

### Keyset Pagination Query (verified against existing db.ts patterns)

```typescript
// Source: existing entryStore.ts SELECT pattern + D-11 spec
const rows = await db.select<Entry[]>(
  `SELECT e.id, e.content, e.mood, e.word_count, e.char_count,
          e.created_at, e.updated_at, e.metadata
   FROM entries e
   WHERE e.created_at < ?
   ORDER BY e.created_at DESC
   LIMIT 20`,
  [cursor]
);
```

### Tags for Timeline Card (join query)

```typescript
// Fetch tags for a list of entry IDs in one query
// Source: existing entry_tags schema in db.ts
const entryIds = entries.map((e) => e.id);
const placeholders = entryIds.map(() => "?").join(",");
const tagRows = await db.select<{ entry_id: string; tag_id: string; name: string; color: string }[]>(
  `SELECT et.entry_id, t.id as tag_id, t.name, t.color
   FROM entry_tags et
   JOIN tags t ON t.id = et.tag_id
   WHERE et.entry_id IN (${placeholders})`,
  entryIds
);
// Group by entry_id in JS
```

### Date Formatting for Day Separator

```typescript
// Source: date-fns format() — already installed
import { format } from "date-fns";

// "Wednesday, Apr 9" — matches D-07 spec
const label = format(new Date(entry.created_at), "EEEE, MMM d");

// "Apr 9, 2026" — card date format per UI-SPEC
const cardDate = format(new Date(entry.created_at), "MMM d, yyyy");
```

### IntersectionObserver Mount Pattern

```typescript
// Source: MDN IntersectionObserver API + D-11
useEffect(() => {
  const sentinel = sentinelRef.current;
  if (!sentinel) return;
  const observer = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting && hasMore && !isLoadingPage) {
        const cursor = allEntries.at(-1)?.created_at;
        void loadPage(cursor);
      }
    },
    { rootMargin: "200px" } // trigger 200px before sentinel reaches viewport
  );
  observer.observe(sentinel);
  return () => observer.disconnect();
}, [hasMore, isLoadingPage, allEntries.length]);
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| OFFSET pagination | Keyset (cursor) pagination | Industry standard for append-only feeds | Consistent O(log n) performance; no skipped/duplicate rows |
| react-scroll library | Native IntersectionObserver | ~2019 (browser support matured) | Zero dependency; works in Tauri Chromium |
| Third-party calendar components | Custom CSS grid + date-fns | Ongoing preference for minimal deps | Full design control; no library-imposed DOM structure |
| Virtual scrolling (react-virtualized) | Paginated concrete DOM | Appropriate for <1000 visible items | Simpler; virtual scrolling needed only at 10k+ rendered items |

**Note on virtual scrolling:** With page size 20 and typical journal entry count in the low hundreds to low thousands, concrete DOM rendering is fine. Virtual scrolling (react-virtual, TanStack Virtual) adds significant complexity and is not needed unless profiling shows jank at 500+ rendered cards.

---

## Environment Availability

Step 2.6: SKIPPED — Phase 3 is purely frontend code changes with no external CLI tools, services, or runtimes beyond what Phase 1/2 already verified (Tauri dev environment, Node, npm). All dependencies are already in `package.json`.

---

## Validation Architecture

`nyquist_validation` is `false` in `.planning/config.json` — this section is skipped.

---

## Integration Map: What Changes in Existing Files

This phase touches existing files in well-defined ways. The planner must create tasks for each:

| File | Change Type | What Changes |
|------|-------------|--------------|
| `src/stores/entryStore.ts` | Extend | Add `allEntries`, `hasMore`, `isLoadingPage`, `loadPage()`, `resetPagination()` |
| `src/stores/viewStore.ts` | New file | `activeView`, `navigateSource`, `dateFilter`, setters |
| `src/components/JournalView.tsx` | Refactor | Becomes view router; remove `ensureFirstEntry()` call; render TimelineView / CalendarView / EntryEditor |
| `src/components/Sidebar.tsx` | Extend | Wire Journal/Calendar nav items to `useViewStore`; remove hardcoded `activeId = "journal"` |
| `src/components/MetadataBar.tsx` | Extend | Add "Back to Journal" affordance in left zone, conditional on `navigateSource === 'timeline'` |
| `src/components/EntryList.tsx` | Conditional hide | Sidebar compact list: hidden or removed when Journal view is active (D-01 supersedes it) |
| `src/components/TagPill.tsx` | Extend or add variant | Need read-only variant for timeline cards (no Popover, no remove button) |

---

## Open Questions

1. **EntryList.tsx in sidebar during Journal view**
   - What we know: D-01 says "the sidebar compact entry list (Phase 2) is superseded." The layout contract says sidebar stays 240px fixed.
   - What's unclear: Does the sidebar show the compact entry list only when in editor view? Or is EntryList hidden entirely when Journal/Calendar are active?
   - Recommendation: Show EntryList only when `activeView === 'editor'`. When `activeView === 'timeline'` or `'calendar'`, the sidebar shows only the nav items (no entry list below). This creates a clean separation between the two browse surfaces.

2. **Tag fetch strategy for timeline cards**
   - What we know: `entry_tags` join query is needed for each page load. Tags are not in `entries` table.
   - What's unclear: Fetch tags per-entry lazily, or batch-fetch for the whole page in one JOIN query?
   - Recommendation: Batch JOIN query at page load time (one SQL call per page of 20 entries). Store tags in a `Record<string, Tag[]>` map keyed by entry ID alongside `allEntries`. This avoids N+1 queries.

3. **Scroll position preservation on Back navigation**
   - What we know: UI-SPEC says "scroll position preserved if possible."
   - What's unclear: Browser scroll restoration in a SPA with no URL router — the scroll container is the `<main>` element, not the window.
   - Recommendation: Store `timelineScrollY: number` in `viewStore`. On Back navigation, after `TimelineView` mounts, call `scrollContainerRef.current?.scrollTo({ top: timelineScrollY, behavior: "instant" })` in a `useEffect`. This requires `TimelineView` to hold a ref to its scroll container and save scroll position to viewStore in a scroll event listener.

---

## Sources

### Primary (HIGH confidence)
- Codebase direct read — `src/stores/entryStore.ts`, `src/lib/db.ts`, `src/components/*.tsx` — existing patterns, constraints, interfaces
- `03-CONTEXT.md` — locked decisions D-01 through D-12
- `03-UI-SPEC.md` — component contracts, color tokens, spacing, interaction states
- `.planning/REQUIREMENTS.md` — TIME-01..07, CAL-01..04 exact requirement text
- `src/styles/globals.css` — design tokens, CSS variables
- `package.json` — confirmed installed dependencies and versions
- MDN IntersectionObserver API — native browser API, no version concerns in Tauri Chromium

### Secondary (MEDIUM confidence)
- date-fns v4 API: `startOfMonth`, `endOfMonth`, `eachDayOfInterval`, `getDay`, `format` — verified against package.json `^4.1.0`; API stable since v2
- SQLite `'localtime'` modifier behavior — documented SQLite core behavior, confirmed by SQLite official docs pattern matching existing `unixepoch('now')` usage in db.ts

### Tertiary (LOW confidence — not needed, no external research required)
- None — entire phase is implementable from codebase inspection and locked specs

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all dependencies confirmed in package.json; no new installs needed
- Architecture: HIGH — derived from existing codebase patterns and locked CONTEXT.md decisions
- Pitfalls: HIGH — derived from code inspection (TagPill Popover behavior, ensureFirstEntry side effect, UTC vs localtime)
- SQL patterns: HIGH — consistent with existing db.ts SELECT patterns

**Research date:** 2026-04-10
**Valid until:** 2026-05-10 (stable dependencies; no fast-moving ecosystem concerns)
