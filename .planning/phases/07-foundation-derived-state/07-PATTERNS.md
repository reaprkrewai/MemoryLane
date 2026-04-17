# Phase 7: Foundation & Derived State - Pattern Map

**Mapped:** 2026-04-17
**Files analyzed:** 8 (3 new, 5 modified)
**Analogs found:** 8 / 8

---

## File Classification

| New/Modified File | Status | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|--------|------|-----------|----------------|---------------|
| `src/lib/dbQueries.ts` | NEW | service / aggregate-helper | request-response (read-only SQL) | `src/utils/embeddingService.ts` (named-exports + `getDb()` pattern) | role-match (no peer aggregate module exists yet — this is the first) |
| `src/styles/animations.css` | NEW | stylesheet (keyframes) | static asset | inline `transition-transform duration-1000` shimmer in `src/components/QuickWriteFAB.tsx:21` (only existing keyframe-ish motion) | role-match (no shared keyframe file exists yet) |
| `src/components/ui/ColorGrid.tsx` | NEW | UI primitive (controlled input) | event-driven (onSelect callback) | `src/components/TagPill.tsx:60-82` (the existing color grid being extracted); shape echoes `src/components/ui/button.tsx` (forwardRef-free functional component with cn-style className) | exact (this IS the extraction target) |
| `src/stores/entryStore.ts` | MODIFY | store (Zustand) | CRUD + maintained derived state | self — `entryStore.ts:135-170` `saveContent` is the inline-update pattern; FOUND-01 fields piggyback on the same `set((state) => ({ ... }))` blocks | exact (modifying the analog itself) |
| `src/lib/db.ts` | MODIFY | service (DB init + migrations) | batch (SQL execution) | self — `db.ts:153-173` `initializeDatabase` is the migration runner; FOUND-03 guarded ALTER lands in this same function | exact |
| `src/styles/globals.css` | MODIFY | stylesheet (theme tokens) | static asset | self — `globals.css:5-64` `:root` token block is the analog for the new motion tokens; `globals.css:352-359` global `transition: all 150ms cubic-bezier(...)` is the analog for the reduced-motion override | exact |
| `src/main.tsx` | MODIFY | bootstrap | static asset (import side-effect) | self — `main.tsx:14` `import "./styles/globals.css"` is the analog for the new `import "./styles/animations.css"` | exact |
| `tailwind.config.js` | MODIFY | config | static asset (build-time) | self — `tailwind.config.js:5-66` `theme.extend` block (existing `colors`, `fontSize`, `borderRadius` extensions) is the analog for new `transitionDuration` / `transitionTimingFunction` / `keyframes` / `animation` extensions | exact |
| `src/components/TagPill.tsx` | MODIFY | component (refactor) | event-driven | self — same component, swap inline grid for `<ColorGrid />` consumer | exact |
| `src/components/OverviewView.tsx` | MODIFY | component (deletion) | n/a (removing dead code) | self — `OverviewView.tsx:26-42` is the `calculateDayStreak` function being removed; line 77 is the call site | exact |

---

## Pattern Assignments

### `src/lib/dbQueries.ts` — NEW (service, request-response read aggregate)

**Analog:** `src/utils/embeddingService.ts` (closest peer service-layer module that exposes named async functions doing direct `getDb()` queries with try/catch graceful-degradation; no aggregate module exists yet, this is the first)

**Imports pattern** — copy from `embeddingService.ts:8`:
```typescript
import { getDb } from "../lib/db";
```

That's the only required import for FOUND-02. No type imports, no Zustand, no third-party deps. Mirror the leading file-doc comment style of `embeddingService.ts:1-6`:
```typescript
/**
 * SQL aggregate helpers for dashboard widgets.
 * Pagination-independent — returns true DB counts, not allEntries.length.
 * Streak query reads local_date (FOUND-03) for TZ-safe results.
 */
```

**Core SQL aggregate pattern** — adapt from `embeddingService.ts:90-101` (the `embeddingExists` shape: `getDb()` → `db.select<RowType[]>(...)` → return primitive). The streak loop adapts `OverviewView.tsx:26-42` `calculateDayStreak` (preserving the wrap-back-from-today algorithm) but reads `local_date` strings directly instead of formatting `created_at`:

```typescript
export interface EntryStats {
  totalEntries: number;
  totalWords: number;
  thisMonth: number;
  totalTags: number;
  dayStreak: number;
}

export async function getEntryStats(): Promise<EntryStats> {
  const db = await getDb();

  // Aggregate row — single query covers totals/words/this-month/tag-count
  // Pattern: COALESCE(SUM(...), 0) — same defensive default seen in embeddingService.ts:93
  const [agg] = await db.select<Array<{
    total: number;
    words: number;
    this_month: number;
    total_tags: number;
  }>>(`
    SELECT
      (SELECT COUNT(*) FROM entries)                                                AS total,
      (SELECT COALESCE(SUM(word_count), 0) FROM entries)                            AS words,
      (SELECT COUNT(*) FROM entries
         WHERE created_at >= (unixepoch('now', 'start of month') * 1000))           AS this_month,
      (SELECT COUNT(*) FROM tags)                                                   AS total_tags
  `);

  // Streak — separate query (D-06 allows 2 queries)
  // Reads local_date column (FOUND-03 D-07), iterates ≤365 strings in JS
  const dateRows = await db.select<Array<{ local_date: string }>>(
    "SELECT DISTINCT local_date FROM entries WHERE local_date IS NOT NULL ORDER BY local_date DESC LIMIT 365"
  );
  const dateSet = new Set(dateRows.map((r) => r.local_date));

  // Today key in user's local TZ — D-11 convention
  const today = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD
  let dayStreak = 0;
  let cursor = new Date();
  while (dateSet.has(cursor.toLocaleDateString("en-CA"))) {
    dayStreak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  // Edge: if today has no entry but yesterday does, streak still counts from yesterday.
  // Original calculateDayStreak (OverviewView.tsx:34-39) walks from today; preserve that.
  void today; // referenced for clarity; loop already handles cursor

  return {
    totalEntries: agg.total,
    totalWords: agg.words,
    thisMonth: agg.this_month,
    totalTags: agg.total_tags,
    dayStreak,
  };
}
```

**Error handling pattern** — `embeddingService.ts:78-82` shows the convention for non-critical AI work (log + swallow). `getEntryStats()` is **critical for the dashboard** — let errors propagate so the caller (`entryStore` in FOUND-01 D-05) sees the failure. **Do NOT wrap in try/catch.** Caller handles. This matches `entryStore.ts:142-169` `saveContent` style: try/catch only when state cleanup is needed (`isSaving: false`); pure reads bubble up.

**Why no analog for `dbVectorOps`:** the codebase doesn't have a `dbVectorOps.ts` — closest non-store DB module is `embeddingService.ts` (utils/) and the inline queries in `OnThisDay.tsx:36-50`. `dbQueries.ts` is the first dedicated `src/lib/` aggregate-helper module; establish the convention here.

---

### `src/styles/animations.css` — NEW (stylesheet, static)

**Analog:** None — no shared keyframe file exists. Closest motion in the codebase is the inline `bg-gradient-to-r ... transition-transform duration-1000 group-hover:translate-x-full` shimmer pattern in `src/components/QuickWriteFAB.tsx:18-22` (a CSS transition, not a `@keyframes` rule). Style/format this file like `globals.css` (4-space indent, `@layer` not used since these are global utilities).

**File scaffold to create** — implements D-15 / D-17 (3 keyframes + stagger utility):

```css
/* Phase 7 FOUND-04 — shared keyframes for v1.1 microinteractions.
 * Imported once from src/main.tsx after globals.css.
 * Tokens (--motion-fast/med/slow, --ease-*) live in globals.css :root.
 * Reduced-motion guard is in globals.css and covers everything below. */

@keyframes fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}

@keyframes slide-up {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes pop-in {
  0%   { opacity: 0; transform: scale(0.92); }
  60%  { opacity: 1; transform: scale(1.02); }
  100% { opacity: 1; transform: scale(1); }
}

/* Stagger utility — children opt in by setting --i: <index>.
 * Per D-17 this is a delay-container pattern, not its own keyframe. */
.stagger-children > * {
  animation-delay: calc(var(--i, 0) * 50ms);
}
```

No imports, no `@apply`, no Tailwind directives — pure CSS keeps the file consumable from any context (Tailwind utilities reference these names via the `tailwind.config.js` `animation` extend block).

---

### `src/components/ui/ColorGrid.tsx` — NEW (UI primitive)

**Analog:** `src/components/TagPill.tsx:60-82` — this IS the existing grid being extracted. Visual parity is the test (D-23: "Pure refactor — TagPill behavior is visually identical to v1.0").

**Imports pattern** — minimal, copying TagPill's style:
```typescript
import { Check } from "lucide-react";
import { useRef, useEffect } from "react";
```

No `forwardRef`, no `cn()` helper needed (component is self-contained, doesn't compose). Mirrors `popover.tsx`-style functional export but **without** `React.forwardRef` since ColorGrid doesn't need to forward a ref — palette grid is a leaf interactive primitive.

**Component shape and visual layout** — direct lift of `TagPill.tsx:60-79` with parameterization for D-21 / D-23:

```typescript
interface ColorGridProps {
  colors: string[];
  selected?: string;
  onSelect: (color: string) => void;
  ariaLabel: string;
  cols?: number; // default 5
}

export function ColorGrid({
  colors,
  selected,
  onSelect,
  ariaLabel,
  cols = 5,
}: ColorGridProps) {
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  // ARIA radio-group keyboard model (D-24): arrow keys move focus, Enter/Space selects
  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, idx: number) => {
    let nextIdx = idx;
    if (e.key === "ArrowRight") nextIdx = (idx + 1) % colors.length;
    else if (e.key === "ArrowLeft") nextIdx = (idx - 1 + colors.length) % colors.length;
    else if (e.key === "ArrowDown") nextIdx = Math.min(idx + cols, colors.length - 1);
    else if (e.key === "ArrowUp") nextIdx = Math.max(idx - cols, 0);
    else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect(colors[idx]);
      return;
    } else {
      return;
    }
    e.preventDefault();
    buttonRefs.current[nextIdx]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="grid gap-2"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {colors.map((color, idx) => {
        const isSelected = selected === color;
        return (
          <button
            key={color}
            ref={(el) => { buttonRefs.current[idx] = el; }}
            type="button"
            role="radio"
            aria-checked={isSelected}
            tabIndex={isSelected || (!selected && idx === 0) ? 0 : -1}
            className="relative flex h-6 w-6 items-center justify-center rounded-md transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            style={{ backgroundColor: color }}
            onClick={() => onSelect(color)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            aria-label={`Select color ${color}`}
          >
            {isSelected && (
              <Check
                size={14}
                style={{ color: "#ffffff", strokeWidth: 3 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
```

**Critical preservation points (lifted verbatim from `TagPill.tsx:60-79`):**
- `h-6 w-6 rounded-md` — exact 24×24 swatch dimensions
- `transition-transform hover:scale-110` — exact hover lift
- `Check` icon at `size={14}` with `color: #ffffff, strokeWidth: 3` — pixel-identical selected state
- `style={{ backgroundColor: color }}` (inline style, NOT Tailwind class) — required because palette colors are user data, not design tokens
- `gap-2` — preserved gap spacing

**New per D-23 / D-24 (additions on top of v1.0 grid):**
- `focus-visible:ring-2 focus-visible:ring-primary` — explicit focus ring (roadmap SC#5)
- `role="radiogroup"` + per-button `role="radio"` + `aria-checked` — single tab-stop semantics
- Roving `tabIndex` (only selected swatch is `0`, others `-1`)
- Arrow-key navigation handler with wrap (D-24 leaves wrap vs clamp to discretion — implementation here wraps Left/Right, clamps Up/Down)

---

### `src/stores/entryStore.ts` — MODIFY (FOUND-01 maintained derived fields + FOUND-03 D-11 local_date insert)

**Analog:** Self. The existing inline-update pattern is the model — see `entryStore.ts:150-163` for the `set((state) => ({ ... }))` shape used in `saveContent`.

**Type addition pattern** — copy the style of `EntryState` field declarations at `entryStore.ts:28-71`. New fields go at the top of the interface alongside `entries` / `selectedEntryId`:

```typescript
interface EntryState {
  entries: Entry[];
  selectedEntryId: string | null;
  isSaving: boolean;
  lastSavedAt: number | null;

  allEntries: Entry[];
  hasMore: boolean;
  isLoadingPage: boolean;
  pageSize: number;

  // FOUND-01 — maintained derived primitives (D-01..D-05)
  totalEntries: number;
  dayStreak: number;
  moodCounts: Record<string, number>;
  recentEntries: Entry[];

  // ... existing actions
}
```

**Initial values** — copy the literal-defaults pattern at `entryStore.ts:80-87`:
```typescript
totalEntries: 0,
dayStreak: 0,
moodCounts: {},
recentEntries: [],
```

**Maintained-update pattern (D-05 refresh timing)** — for `loadPage` / `createEntry` / `deleteEntry`, after the existing `set({ allEntries: ... })` call, add a follow-up that pulls from `getEntryStats()` and recomputes `moodCounts` + `recentEntries`. Pattern copied from `entryStore.ts:225-229`:

```typescript
// Inside loadPage, after the existing set({ allEntries: ..., hasMore, isLoadingPage }):
const { getEntryStats } = await import("../lib/dbQueries");
const stats = await getEntryStats();
const allEntries = get().allEntries;
set({
  totalEntries: stats.totalEntries,
  dayStreak: stats.dayStreak,
  moodCounts: computeMoodCounts(allEntries),  // local helper, lifetime totals
  recentEntries: stableRecentSlice(allEntries, get().recentEntries), // D-02 stable-ref
});
```

For `saveContent` (D-05: do NOT call `getEntryStats()` during typing) — only update `moodCounts` + `recentEntries` from the in-memory `allEntries`:

```typescript
// Inside saveContent, after the existing set({ entries, allEntries, isSaving, lastSavedAt }):
const after = get().allEntries;
set({
  moodCounts: computeMoodCounts(after),
  recentEntries: stableRecentSlice(after, get().recentEntries),
});
```

**Stable-reference helper for `recentEntries` (D-02)** — module-level utility, declared near the top with the other module-level helpers (mirror the `let _debounceTimer ...` block at `entryStore.ts:73-77`):

```typescript
function stableRecentSlice(all: Entry[], prev: Entry[]): Entry[] {
  const next = all.slice(0, 5);
  if (next.length !== prev.length) return next;
  for (let i = 0; i < next.length; i++) {
    if (next[i].id !== prev[i].id || next[i].updated_at !== prev[i].updated_at) {
      return next;
    }
  }
  return prev; // identity-stable: avoid re-render
}

function computeMoodCounts(all: Entry[]): Record<string, number> {
  const counts: Record<string, number> = { great: 0, good: 0, okay: 0, bad: 0, awful: 0 };
  for (const e of all) {
    if (e.mood && e.mood in counts) counts[e.mood] += 1;
  }
  return counts;
}
```

**FOUND-03 D-11: `local_date` in `createEntry` INSERT** — current `createEntry` at `entryStore.ts:102-120` does `INSERT INTO entries (content, word_count, char_count) VALUES ('', 0, 0)`. Update to:

```typescript
createEntry: async () => {
  const db = await getDb();
  const localDate = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD in user TZ (D-11)
  await db.execute(
    "INSERT INTO entries (content, word_count, char_count, local_date) VALUES ('', 0, 0, ?)",
    [localDate]
  );
  // ... rest unchanged
}
```

**Integration constraints to preserve (per CONTEXT `<code_context>`):**
- Module-level timers stay outside Zustand state (`entryStore.ts:73-77`) — do NOT add timer-driven recompute.
- `selectEntry` flush contract (`entryStore.ts:97-100`) — any new mutation helper must not bypass the existing `await get().flushAndClearTimers()`.
- All `set((state) => ({ allEntries: state.allEntries.map(...) }))` blocks must continue producing new array refs only on actual change (matches `entryStore.ts:150-160` discipline).

---

### `src/lib/db.ts` — MODIFY (FOUND-03 guarded ALTER + index + backfill)

**Analog:** Self. The existing `initializeDatabase` at `db.ts:153-173` is the migration runner; the guarded ALTER block lands inside it, immediately after the `splitSqlStatements` loop.

**MIGRATION_SQL update (FOUND-03 D-08)** — modify the `CREATE TABLE entries` clause at `db.ts:18-27` to include `local_date` natively for fresh installs:

```sql
CREATE TABLE IF NOT EXISTS entries (
    id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    content     TEXT NOT NULL DEFAULT '',
    mood        TEXT CHECK(mood IN ('great','good','okay','bad','awful')) NULL,
    word_count  INTEGER NOT NULL DEFAULT 0,
    char_count  INTEGER NOT NULL DEFAULT 0,
    created_at  INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
    updated_at  INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
    metadata    TEXT NOT NULL DEFAULT '{}',
    local_date  TEXT
);
```

(`local_date` stays nullable — backfill populates existing rows; `createEntry` populates new rows per D-11.)

**Add index to MIGRATION_SQL (D-12)** — append next to the existing `idx_entries_created_at` index at `db.ts:29-30`:

```sql
CREATE INDEX IF NOT EXISTS idx_entries_local_date ON entries(local_date);
```

This is idempotent (`IF NOT EXISTS`) so it co-runs safely with the guarded ALTER below.

**Guarded ALTER + backfill block — NEW code in `initializeDatabase`** — lands AFTER the `for (const stmt of statements)` loop at `db.ts:158-161` and BEFORE the dev diagnostic at `db.ts:163-172`. Pattern: `PRAGMA table_info()` check (the canonical SQLite idempotency guard, called out as Anti-Pattern 6 in PITFALLS):

```typescript
// FOUND-03 D-08/D-09 — guarded ALTER for upgrade installs.
// CREATE TABLE IF NOT EXISTS above handles fresh installs (local_date in DDL).
// Existing v1.0 DBs need ALTER + backfill, which is not idempotent — guard it.
const cols = await db.select<{ name: string }[]>("PRAGMA table_info(entries)");
const hasLocalDate = cols.some((c) => c.name === "local_date");
if (!hasLocalDate) {
  await db.execute("ALTER TABLE entries ADD COLUMN local_date TEXT");
  // D-09 — synchronous backfill from created_at (UTC day, best-effort per D-10).
  // Pre-migration entries near UTC midnight may be off by ±1 calendar day.
  await db.execute(
    "UPDATE entries SET local_date = strftime('%Y-%m-%d', created_at/1000, 'unixepoch') WHERE local_date IS NULL"
  );
  if (import.meta.env.DEV) {
    console.log("[db] Migrated entries.local_date column + backfilled existing rows");
  }
}
```

**Critical preservation points:**
- The existing `splitSqlStatements` helper (`db.ts:116-151`) handles BEGIN/END trigger blocks — do not perturb it. New `CREATE INDEX IF NOT EXISTS idx_entries_local_date` is a single-line statement, parses fine.
- `getDb()` singleton pattern (`db.ts:5-9`) is reused — no new connection.
- Dev diagnostic at `db.ts:164-172` is the precedent for the optional `console.log` after backfill.

**Anti-pattern to avoid (PITFALLS Anti-Pattern 6):** Don't `ALTER TABLE` blindly inside `MIGRATION_SQL` — `ALTER TABLE ADD COLUMN` is non-idempotent and would crash on second run. The PRAGMA-guarded block above is the only correct shape.

---

### `src/styles/globals.css` — MODIFY (FOUND-04 motion tokens + reduced-motion guard)

**Analog:** Self. The existing `:root` token block at `globals.css:6-64` is the analog for new motion tokens; the existing global `transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1)` rule at `globals.css:352-359` shows the convention for app-wide motion declarations.

**Token addition (D-16)** — append inside the existing `@layer base { :root { ... } }` block at `globals.css:6-64`, immediately after the shadow tokens at line 29:

```css
/* FOUND-04 — motion tokens (D-16). Consumed by tailwind.config.js + raw CSS. */
--motion-fast: 150ms;
--motion-med:  300ms;
--motion-slow: 500ms;
--ease-out-smooth: cubic-bezier(0.22, 1, 0.36, 1);
--ease-spring:     cubic-bezier(0.34, 1.56, 0.64, 1);
```

These can stay token-only inside `:root` — the dark mode block at `globals.css:66-141` does NOT need to redeclare them (motion is theme-agnostic).

**Reduced-motion guard (D-18)** — append at the end of the file (after the Firefox scrollbar rules at `globals.css:387-394`). Verbatim from D-18 / PITFALLS I2:

```css
/* FOUND-04 D-18 — global reduced-motion override. Universal selector covers
 * app code, third-party Radix transitions, and any future components.
 * Roadmap SC#4 verification: OS "Reduce motion" → instant transitions. */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

**Critical preservation points:**
- Do NOT modify the `html { scroll-behavior: smooth }` rule at `globals.css:148-150` — the reduced-motion stanza overrides it cleanly with the `!important` `scroll-behavior: auto`.
- Do NOT touch the existing `transition: all 150ms cubic-bezier(...)` rule at `globals.css:354-359` — Phase 7 D-20 explicitly defers standardizing existing v1.0 utilities to Phase 11.
- The OKLCH theme tokens (`globals.css:32-63`) and Chronicle Night dark tokens (`globals.css:67-141`) are untouched.

---

### `src/main.tsx` — MODIFY (FOUND-04 import animations.css)

**Analog:** Self — `main.tsx:14` `import "./styles/globals.css"` is the existing pattern.

**Single-line addition** — after `globals.css` import:
```typescript
import "./styles/globals.css";
import "./styles/animations.css";  // FOUND-04 — shared keyframes
```

Order matters: tokens (`globals.css`) must load before keyframes that may reference them via Tailwind utilities downstream. No other changes to `main.tsx`.

---

### `tailwind.config.js` — MODIFY (FOUND-04 D-19 motion utility extensions)

**Analog:** Self — `tailwind.config.js:6-66` `theme.extend` block. Existing `colors`, `fontSize`, `borderRadius` extensions are the analog for the new motion-related extensions.

**Extension pattern** — add inside `theme.extend` (alongside `borderRadius` at line 61-65):

```javascript
transitionDuration: {
  fast: 'var(--motion-fast)',
  med:  'var(--motion-med)',
  slow: 'var(--motion-slow)',
},
transitionTimingFunction: {
  'out-smooth': 'var(--ease-out-smooth)',
  spring:       'var(--ease-spring)',
},
keyframes: {
  'fade-in':  { from: { opacity: '0' }, to: { opacity: '1' } },
  'slide-up': {
    from: { opacity: '0', transform: 'translateY(8px)' },
    to:   { opacity: '1', transform: 'translateY(0)' },
  },
  'pop-in': {
    '0%':   { opacity: '0', transform: 'scale(0.92)' },
    '60%':  { opacity: '1', transform: 'scale(1.02)' },
    '100%': { opacity: '1', transform: 'scale(1)' },
  },
},
animation: {
  'fade-in':  'fade-in var(--motion-med) var(--ease-out-smooth) both',
  'slide-up': 'slide-up var(--motion-med) var(--ease-out-smooth) both',
  'pop-in':   'pop-in var(--motion-med) var(--ease-spring) both',
},
```

**Critical preservation points:**
- Keep `darkMode: ['class']` at line 3 unchanged.
- Keep `tailwindcss-animate` plugin import at line 68 — Phase 7 keyframes coexist with shadcn's `data-[state=open]:animate-in` utilities.
- Mirror the existing single-quote string style (`'var(--color-bg)'` at line 9) — do NOT mix double quotes.

**Note on D-17:** Phase 7 ships exactly 3 keyframes (`fade-in`, `slide-up`, `pop-in`) plus the `.stagger-children` delay container in `animations.css`. Do NOT add `shimmer` / `pulse-glow` here — those are deferred to Phase 11 per CONTEXT `<deferred>`.

---

### `src/components/TagPill.tsx` — MODIFY (refactor to consume ColorGrid, D-22)

**Analog:** Self. Replace the inline grid (`TagPill.tsx:60-81`) with a single `<ColorGrid />` element.

**Imports change** — drop `Check` (now lives in ColorGrid), add ColorGrid:
```typescript
import { useState } from "react";
import { X } from "lucide-react";  // Check removed
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "./ui/popover";
import { ColorGrid } from "./ui/ColorGrid";
import { TAG_COLORS } from "../stores/tagStore";
```

**Replace `TagPill.tsx:59-82`** — current `<PopoverContent>` body becomes:
```tsx
<PopoverContent className="w-auto p-3" onClick={(e) => e.stopPropagation()}>
  <ColorGrid
    colors={[...TAG_COLORS]}
    selected={tag.color}
    onSelect={handleColorSelect}
    ariaLabel={`Color for tag ${tag.name}`}
    cols={5}
  />
</PopoverContent>
```

`TAG_COLORS` is `as const` (a readonly tuple) — spread to a plain array (`[...TAG_COLORS]`) so it satisfies `colors: string[]`.

**Preservation requirement (D-22 + `<specifics>`):** This is a **pure refactor** — visual output must be pixel-identical to v1.0. The existing trigger button (`TagPill.tsx:26-58`), popover wrapper (`PopoverContent` props), and `handleColorSelect` callback (`TagPill.tsx:19-22`) are untouched. Only the grid markup inside `PopoverContent` swaps.

**TAG_COLORS source (D-25):** Stays exported from `src/stores/tagStore.ts:4-13`. Phase 7 does NOT move it to `src/lib/tagColors.ts` — that's Phase 11 work.

---

### `src/components/OverviewView.tsx` — MODIFY (FOUND-03 D-14 remove startOfDay streak code)

**Analog:** Self.

**Deletion targets:**
1. `OverviewView.tsx:26-42` — the entire `calculateDayStreak` function. Per D-14 it is "deleted entirely" (the SQL version lives in `dbQueries.ts`).
2. `OverviewView.tsx:77` — the `dayStreak` field in the `stats` `useMemo` becomes a store subscription instead:
   ```typescript
   const dayStreak = useEntryStore((s) => s.dayStreak);
   ```
3. Remove `startOfDay` and `subDays` from the `date-fns` import at `OverviewView.tsx:3` IF they are no longer used after deleting `calculateDayStreak` and `calculateMoodCounts`. (Re-check `OverviewView.tsx:47` — `subDays` is also used by `calculateMoodCounts`; that helper might also become a store subscription via FOUND-01 `moodCounts`. Confirm usage before pruning imports.)
4. `OverviewView.tsx:74-80` `stats` `useMemo` — the in-component derivations become store subscriptions per FOUND-01 D-01:
   ```typescript
   const totalEntries = useEntryStore((s) => s.totalEntries);
   const wordsWritten = useMemo(
     () => allEntries.reduce((sum, e) => sum + (e.word_count ?? 0), 0),
     [allEntries]
   );  // wordsWritten not in FOUND-01 maintained set; stays in-component until DASH widgets need it
   const dayStreak = useEntryStore((s) => s.dayStreak);
   const tagsCreated = tags.length;
   ```

**Scope discipline (per CONTEXT `<domain>`):** "Nothing user-visible ships in this phase." After these edits, OverviewView still renders the same dashboard — it just sources `totalEntries` and `dayStreak` from the store instead of computing them locally. No new widgets, no visual change. The point is establishing the FOUND-01 wiring so DASH-* phases plug in cleanly.

**Do NOT change:**
- `useEffect(() => { loadPage(); loadTags(); }, [loadPage, loadTags])` at `OverviewView.tsx:66-69` — FOUND-01 D-05 hangs the recompute off `loadPage` itself, no extra effect needed.
- The render tree (`OverviewView.tsx:99-254`) — visual identity preserved.
- `recentEntries` consumption at line 84 — D-02 stable-ref slice means the existing `allEntries.slice(0, 3)` can either stay (3 items, fine) or migrate to the store's `recentEntries.slice(0, 3)` (5-item store slice, take first 3). Planner decides.

---

## Shared Patterns

### Pattern 1: Zustand granular selector (consumed by FOUND-01 widgets downstream)

**Source:** `entryStore.ts:84` (`allEntries: []` field) + every consumer like `OverviewView.tsx:57` (`useEntryStore((s) => s.allEntries)`).

**Apply to:** Every widget that reads a FOUND-01 derived primitive in Phases 8+:
```typescript
// Primitive — === comparable, zero re-render when value unchanged
const totalEntries = useEntryStore((s) => s.totalEntries);
const dayStreak    = useEntryStore((s) => s.dayStreak);

// Object/array — needs shallow compare via zustand/react/shallow if downstream cares
import { useShallow } from "zustand/react/shallow";
const moodCounts = useEntryStore(useShallow((s) => s.moodCounts));
```

This is the established v1.0 pattern (`OverviewView.tsx:57-64`). Phase 7 establishes the maintained primitives; widgets in Phases 8+ subscribe to the primitives, not `allEntries`.

---

### Pattern 2: `getDb()` singleton + parameterized SQL

**Source:** `db.ts:5-9` (singleton), used in every store/service. Concrete examples:
- `entryStore.ts:103-104` — `INSERT` with positional params.
- `embeddingService.ts:65-77` — `INSERT OR REPLACE` with positional params.
- `OnThisDay.tsx:36-50` — `select<T[]>` with positional params.
- `tagStore.ts:42-49` — `select<T[]>` with no params.

**Apply to:** `src/lib/dbQueries.ts` `getEntryStats()`. Use `db.select<RowType[]>(sql, [params])` — never string-concat user data. SQLite param syntax is `?` positional.

```typescript
const db = await getDb();
const rows = await db.select<{ count: number }[]>(
  "SELECT COUNT(*) AS count FROM entries WHERE created_at > ?",
  [cutoffMs]
);
```

---

### Pattern 3: Idempotent migration (`CREATE ... IF NOT EXISTS` + PRAGMA-guarded ALTER)

**Source:** `db.ts:18-99` — every `CREATE TABLE`, `CREATE INDEX`, `CREATE TRIGGER`, `CREATE VIRTUAL TABLE` uses `IF NOT EXISTS`. PITFALLS Anti-Pattern 6 calls out the `ALTER TABLE` exception explicitly.

**Apply to:** FOUND-03 work in `db.ts`. New columns on existing tables follow the dual approach:
1. **Update the `CREATE TABLE` clause in `MIGRATION_SQL`** (handles fresh installs).
2. **Add a `PRAGMA table_info(...)` check + `ALTER` + backfill** inside `initializeDatabase` after the migration loop (handles upgrade installs).

Code shape — see the `src/lib/db.ts` Pattern Assignment above for the literal block.

---

### Pattern 4: CSS variable tokens consumed by both raw CSS and Tailwind

**Source:** `globals.css:11-23` (`--color-bg` etc. defined as plain CSS vars) consumed by `tailwind.config.js:9-15` (`bg: 'var(--color-bg)'` mapped into Tailwind color names).

**Apply to:** Motion tokens. CSS vars in `globals.css :root` (D-16), referenced in `tailwind.config.js` via `transitionDuration` / `transitionTimingFunction` / `animation` extends (D-19). Downstream components can use either:
- Tailwind: `className="duration-med ease-out-smooth animate-fade-in"`
- Raw CSS: `style={{ transitionDuration: 'var(--motion-med)' }}`

D-19 explicitly enables both consumption paths.

---

### Pattern 5: Module-level imports inside Zustand actions (lazy-coupling for cycle avoidance)

**Source:** `entryStore.ts:3` imports `generateEmbeddingAsync` directly at module scope; the call at line 165 is fire-and-forget.

**Apply to:** FOUND-01 D-05 calls to `getEntryStats()` from `entryStore`. **Decision point for planner:** the planner can either (a) static-import `getEntryStats` at the top of `entryStore.ts` (clean, no circular risk because `dbQueries.ts` only imports from `lib/db`, not from any store), or (b) dynamic `await import("../lib/dbQueries")` inside the action body. Option (a) matches existing convention (`entryStore.ts:1-3`); option (b) is justified only if a circular-import surprise emerges. **Recommend (a).**

---

### Pattern 6: ARIA + focus-visible ring (consumed by ColorGrid)

**Source:**
- `button.tsx:8` — `focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring` (shadcn Button default).
- PITFALLS I7 — "`focus-visible:ring-2 focus-visible:ring-primary`" (recommendation for FAB-class interactive primitives).
- Roadmap SC#5 explicitly requires focus-visible rings on ColorGrid swatches.

**Apply to:** `ColorGrid.tsx` button elements — `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2`. Note: D-23 specifies `ring-2` (not `ring-1` like Button); this is the "interactive primitive" tier, not a shadcn default.

---

### Pattern 7: Stable-reference slicing (zero-re-render derived state)

**Source:** New convention — no exact analog in v1.0 code. Closest precedent is `OverviewView.tsx:84` `useMemo(() => allEntries.slice(0, 3), [allEntries])` which produces a NEW array reference on every `allEntries` change (re-render storm trigger per PITFALLS C1).

**Apply to:** FOUND-01 D-02 `recentEntries` field. The `stableRecentSlice` helper shown in the entryStore Pattern Assignment is the canonical implementation: returns `prev` if shallow-compared `id + updated_at` is unchanged, returns `next` otherwise. This is what makes the primitive `===` comparable across mutations that don't touch the top 5.

---

## No Analog Found

None — every Phase 7 file has at least a role-match analog in the existing codebase. The two "first of their kind" cases (`dbQueries.ts` as the first dedicated `lib/` aggregate module, and `animations.css` as the first shared keyframe stylesheet) lean on adjacent conventions (`embeddingService.ts` style and `globals.css` style respectively) and are flagged inline in their Pattern Assignments.

---

## Metadata

**Analog search scope:**
- `src/stores/` (entryStore, tagStore — both reviewed)
- `src/lib/` (db, hybridAIService, ollamaService, paletteData, pinCrypto, stripMarkdown, utils — listed; db + tag-related read in full)
- `src/utils/` (embeddingService used as service-layer analog; aiSettingsService, qaService, vectorSearchService, zipUtils noted not relevant)
- `src/components/ui/` (popover, button reviewed in full; alert-dialog, calendar, tooltip noted not relevant)
- `src/components/` (TagPill, OverviewView, OnThisDay, QuickWriteFAB read in full; full directory listing taken)
- `src/styles/` (globals.css read in full — only stylesheet present)
- `src/main.tsx`, `tailwind.config.js` (read in full)

**Files scanned:** ~14 source files read in full; full directory listings of `src/lib/`, `src/utils/`, `src/components/`, `src/components/ui/`, `src/styles/`.

**Project skills loaded:** `.claude/skills/` and `.agents/skills/` directories do not exist; no skills to load.

**Pattern extraction date:** 2026-04-17
