# Phase 11: Microinteractions & Tag Management - Pattern Map

**Mapped:** 2026-04-19
**Files analyzed:** 10 (9 modified, 1 new)
**Analogs found:** 10 / 10

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/styles/animations.css` | config/stylesheet | transform | `src/styles/animations.css` itself (extend) | exact (self-extension) |
| `tailwind.config.js` | config | transform | `tailwind.config.js` itself (extend) | exact (self-extension) |
| `src/stores/tagStore.ts` | store | CRUD | `src/stores/tagStore.ts` (extend existing actions) | exact (self-extension) |
| `src/lib/db.ts` | utility/migration | CRUD | `src/lib/db.ts` local_date migration block (lines 183-195) | exact (self-extension) |
| `src/components/TagPill.tsx` | component | event-driven | `src/components/TagPill.tsx` (add animation state) | exact (self-extension) |
| `src/components/MoodSelector.tsx` | component | event-driven | `src/components/MoodSelector.tsx` (add spring state) | exact (self-extension) |
| `src/components/OverviewView.tsx` | component | request-response | `src/components/StatCard.tsx` + `src/components/OverviewView.tsx` | exact |
| `src/components/JournalView.tsx` | component | request-response | `src/components/JournalView.tsx` (add crossfade state) | exact (self-extension) |
| `src/components/settings/TagManagementSection.tsx` | component | CRUD | `src/components/SettingsView.tsx` — DataSection / HelpSection sub-components | role-match |
| `src/components/SettingsView.tsx` | component | request-response | `src/components/SettingsView.tsx` itself (add import + render) | exact (self-extension) |

---

## Pattern Assignments

### `src/styles/animations.css` (config/stylesheet, add keyframes)

**Analog:** `src/styles/animations.css` lines 1-26 (existing keyframes)

**Existing structure pattern** (lines 1-26 — copy this comment + keyframe style):
```css
/* Phase 7 FOUND-04 — shared keyframes for v1.1 microinteractions.
 * Imported once from src/main.tsx after globals.css.
 * Tokens (--motion-fast/med/slow, --ease-*) live in globals.css :root.
 * Reduced-motion guard is in globals.css and covers everything below. */

@keyframes fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
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

**New keyframes to append** (from UI-SPEC animation contract):
```css
/* Phase 11 ANIM-02 — TagPill pop-in on add (0.8→1.0, 150ms ease-out) */
@keyframes tag-pop-in {
  from { opacity: 0; transform: scale(0.8); }
  to   { opacity: 1; transform: scale(1.0); }
}

/* Phase 11 ANIM-02 — TagPill scale-out on remove (1.0→0.8 + fade, 120ms ease-in) */
@keyframes tag-pop-out {
  from { opacity: 1; transform: scale(1.0); }
  to   { opacity: 0; transform: scale(0.8); }
}

/* Phase 11 ANIM-04 — MoodSelector spring feedback on click (1.0→0.9→1.0, 120ms) */
@keyframes mood-spring {
  0%   { transform: scale(1.0); }
  50%  { transform: scale(0.9); }
  100% { transform: scale(1.0); }
}

/* Phase 11 ANIM-03 — scale-in for non-Radix modal wrappers (opacity 0→1, scale 0.95→1.0) */
@keyframes scale-in {
  from { opacity: 0; transform: scale(0.95); }
  to   { opacity: 1; transform: scale(1.0); }
}
```

**Key constraint:** The existing `@media (prefers-reduced-motion: reduce)` stanza lives in `globals.css` (not in `animations.css`) and uses the blanket `*, *::before, *::after { animation-duration: 0.01ms !important; }` — all new keyframes are automatically covered. Do NOT add per-keyframe reduce-motion guards.

---

### `tailwind.config.js` (config, extend animation/keyframes blocks)

**Analog:** `tailwind.config.js` lines 75-91 (existing `keyframes` + `animation` blocks)

**Existing keyframes block pattern** (lines 75-86 — match this exact object shape):
```js
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
```

**Existing animation block pattern** (lines 87-91 — match `'name': 'name duration token token both'` format):
```js
animation: {
  'fade-in':  'fade-in var(--motion-med) var(--ease-out-smooth) both',
  'slide-up': 'slide-up var(--motion-med) var(--ease-out-smooth) both',
  'pop-in':   'pop-in var(--motion-med) var(--ease-spring) both',
},
```

**New entries to add to `keyframes` block:**
```js
'tag-pop-in': {
  from: { opacity: '0', transform: 'scale(0.8)' },
  to:   { opacity: '1', transform: 'scale(1.0)' },
},
'tag-pop-out': {
  from: { opacity: '1', transform: 'scale(1.0)' },
  to:   { opacity: '0', transform: 'scale(0.8)' },
},
'mood-spring': {
  '0%':   { transform: 'scale(1.0)' },
  '50%':  { transform: 'scale(0.9)' },
  '100%': { transform: 'scale(1.0)' },
},
'scale-in': {
  from: { opacity: '0', transform: 'scale(0.95)' },
  to:   { opacity: '1', transform: 'scale(1.0)' },
},
'fade-out': { from: { opacity: '1' }, to: { opacity: '0' } },
```

**New entries to add to `animation` block:**
```js
'tag-pop-in':  'tag-pop-in 150ms ease-out both',
'tag-pop-out': 'tag-pop-out 120ms ease-in both',
'mood-spring': 'mood-spring 120ms cubic-bezier(0.34, 1.56, 0.64, 1) both',
'scale-in':    'scale-in 150ms var(--ease-out-smooth) both',
'fade-out':    'fade-out var(--motion-fast) var(--ease-out-smooth) both',
```

---

### `src/stores/tagStore.ts` (store, CRUD — replace TAG_COLORS + add renameTag)

**Analog:** `src/stores/tagStore.ts` full file (self-extension)

**Import pattern** (line 1-2 — unchanged):
```typescript
import { create } from "zustand";
import { getDb } from "../lib/db";
```

**TAG_COLORS replacement** (lines 4-13 — replace entire array with structured tokens):

Current (lines 4-13):
```typescript
export const TAG_COLORS = [
  "#EF4444",
  "#F97316",
  // ...8 plain hex strings
] as const;
```

Replace with (full 12-token structured array from UI-SPEC lines 107-120):
```typescript
export const TAG_COLORS = [
  { id: "red",    label: "Red",    base: "#DC2626", bg_light: "#FEE2E2", bg_dark: "#450A0A", text_light: "#991B1B", text_dark: "#FECACA" },
  { id: "orange", label: "Orange", base: "#EA580C", bg_light: "#FFEDD5", bg_dark: "#431407", text_light: "#9A3412", text_dark: "#FED7AA" },
  // ... all 12 tokens
] as const;
```

**Interface extension** (line 24 — add `last_used` to `TagWithCount`):
```typescript
interface TagWithCount extends Tag {
  usage_count: number;
  last_used?: number; // Unix timestamp ms — from MAX(et.created_at) in loadTags query
}
```

**createTag color selection pattern** (line 54 — update to use `.base`):

Current:
```typescript
const color = TAG_COLORS[get().tags.length % TAG_COLORS.length];
```

After TAG_COLORS becomes objects:
```typescript
const color = TAG_COLORS[get().tags.length % TAG_COLORS.length].base;
```

**New `renameTag` action** — copy the shape of `updateTagColor` (lines 73-79) exactly:
```typescript
// Analog: updateTagColor (lines 73-79) — same SQL pattern + optimistic store update
updateTagColor: async (id: string, color: string) => {
  const db = await getDb();
  await db.execute("UPDATE tags SET color = ? WHERE id = ?", [color, id]);
  set((state) => ({
    tags: state.tags.map((t) => (t.id === id ? { ...t, color } : t)),
  }));
},

// New renameTag — same pattern:
renameTag: async (id: string, newName: string) => {
  const db = await getDb();
  await db.execute("UPDATE tags SET name = ? WHERE id = ?", [newName, id]);
  set((state) => ({
    tags: state.tags.map((t) => (t.id === id ? { ...t, name: newName } : t)),
  }));
},
```

**`loadTags` query update** — add `last_used` via MAX(et.rowid) or a date column when querying. Extend the existing SELECT at lines 42-49:
```typescript
// Current query (line 43-46):
`SELECT t.id, t.name, t.color, t.created_at, COUNT(et.entry_id) AS usage_count
 FROM tags t
 LEFT JOIN entry_tags et ON et.tag_id = t.id
 GROUP BY t.id
 ORDER BY t.name COLLATE NOCASE ASC`

// Extended for Phase 11 (add MAX(e.created_at) AS last_used via entries join):
`SELECT t.id, t.name, t.color, t.created_at,
        COUNT(et.entry_id) AS usage_count,
        MAX(e.created_at) AS last_used
 FROM tags t
 LEFT JOIN entry_tags et ON et.tag_id = t.id
 LEFT JOIN entries e ON e.id = et.entry_id
 GROUP BY t.id
 ORDER BY t.name COLLATE NOCASE ASC`
```

**Interface declaration** (line 28-35 — add `renameTag` to `TagState`):
```typescript
interface TagState {
  tags: TagWithCount[];
  loadTags: () => Promise<void>;
  createTag: (name: string) => Promise<Tag>;
  deleteTag: (id: string) => Promise<void>;
  updateTagColor: (id: string, color: string) => Promise<void>;
  renameTag: (id: string, newName: string) => Promise<void>; // NEW
  addTagToEntry: (entryId: string, tagId: string) => Promise<void>;
  removeTagFromEntry: (entryId: string, tagId: string) => Promise<void>;
  getEntryTags: (entryId: string) => Promise<TagWithCount[]>;
}
```

---

### `src/lib/db.ts` (utility/migration, CRUD — add color normalization migration)

**Analog:** `src/lib/db.ts` lines 183-218 — the existing `local_date` PRAGMA-guarded migration block. Copy this pattern exactly.

**PRAGMA-guard pattern** (lines 183-195):
```typescript
// FOUND-03 D-08/D-09 — guarded ALTER for upgrade installs.
const cols = await db.select<{ name: string }[]>("PRAGMA table_info(entries)");
const hasLocalDate = cols.some((c) => c.name === "local_date");
if (!hasLocalDate) {
  await db.execute("ALTER TABLE entries ADD COLUMN local_date TEXT");
  await db.execute(
    "UPDATE entries SET local_date = strftime('%Y-%m-%d', created_at/1000, 'unixepoch') WHERE local_date IS NULL"
  );
  if (import.meta.env.DEV) {
    console.log("[db] Migrated entries.local_date column + backfilled existing rows");
  }
}
```

**New Phase 11 migration** (append after line 218, before the diagnostic block) — copy the PRAGMA-guard + JS mapping pattern:
```typescript
// Phase 11 — normalize tag colors to new 12-token palette (one-time backfill).
// PRAGMA-guard: check if normalization has already been applied by inspecting
// a known old color. If no tags still hold old values, this is a no-op.
// NOTE: Uses standalone db.execute() per UAT-01 pattern — NOT inside MIGRATION_SQL.
const OLD_TO_NEW: Record<string, string> = {
  "#EF4444": "#DC2626", // red
  "#F97316": "#EA580C", // orange
  "#EAB308": "#CA8A04", // yellow
  "#22C55E": "#16A34A", // green
  "#3B82F6": "#2563EB", // blue
  "#8B5CF6": "#7C3AED", // violet
  "#EC4899": "#DB2777", // pink
  "#6B7280": "#475569", // slate
};
for (const [oldHex, newHex] of Object.entries(OLD_TO_NEW)) {
  await db.execute(
    "UPDATE tags SET color = ? WHERE color = ?",
    [newHex, oldHex]
  );
}
if (import.meta.env.DEV) {
  console.log("[db] Phase 11: backfilled tag colors to new 12-token palette");
}
```

**Key constraints from db.ts comments:**
- Run migration via standalone `db.execute()` calls AFTER the `for (const stmt of statements)` loop — never inside `MIGRATION_SQL` (see UAT-01 fix comment at line 214-218)
- `splitSqlStatements` has a `BEGIN/END` limitation (WR-04, lines 117-131) — the new migration uses only simple `UPDATE` statements so it is safe inside `MIGRATION_SQL` if needed, but standalone is preferred per established pattern

---

### `src/components/TagPill.tsx` (component, event-driven — add animation state)

**Analog:** `src/components/TagPill.tsx` full file (self-extension) + `src/components/MoodSelector.tsx` for the transient-state animation pattern

**Existing import pattern** (lines 1-9 — add `useEffect` or keep just `useState`):
```typescript
import { useState } from "react";
import { X } from "lucide-react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "./ui/popover";
import { ColorGrid } from "./ui/ColorGrid";
import { TAG_COLORS } from "../stores/tagStore";
```

**Key changes:**

1. `cols={5}` → `cols={6}` (line 66 in current file):
```typescript
// Current (line 62-68):
<ColorGrid
  colors={[...TAG_COLORS]}   // becomes TAG_COLORS.map(t => t.base)
  selected={tag.color}
  onSelect={handleColorSelect}
  ariaLabel={`Color for tag ${tag.name}`}
  cols={5}   // → cols={6}
/>
```

2. TAG_COLORS reference update (since TAG_COLORS is now array of objects):
```typescript
// Before: colors={[...TAG_COLORS]}
// After:
colors={TAG_COLORS.map(t => t.base)}
```

3. Pop-in: the pill wrapper gets `animate-tag-pop-in` unconditionally — since TagPill is always freshly mounted when added (React key = tag.id), the keyframe fires exactly once per element lifetime. No state needed for pop-in.
```typescript
// Outer div in return (line 29-43) — add className:
<div
  className="group inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-all hover:shadow-sm animate-tag-pop-in"
  // ... rest of props
>
```

4. Pop-out: requires deferred removal. Add `isRemoving` state and wrap `onRemove`:
```typescript
// Add state:
const [isRemoving, setIsRemoving] = useState(false);

// Replace onRemove handler on the X button (line 47-56):
onClick={(e) => {
  e.stopPropagation();
  setIsRemoving(true);
  setTimeout(() => onRemove(), 120); // match tag-pop-out duration
}}

// Conditionally apply pop-out class on wrapper div:
className={`group inline-flex cursor-pointer ... animate-tag-pop-in ${isRemoving ? "animate-tag-pop-out" : ""}`}
```

---

### `src/components/MoodSelector.tsx` (component, event-driven — add spring state)

**Analog:** `src/components/MoodSelector.tsx` full file (self-extension)

**Existing pattern** (lines 22-74 — copy the button structure, add `springing` state):

Current state (none — stateless beyond prop):
```typescript
export function MoodSelector({ mood, onMoodChange }: MoodSelectorProps) {
  const handleClick = (value: string) => {
    onMoodChange(mood === value ? null : value)
  }
```

**New pattern — add transient spring state:**
```typescript
export function MoodSelector({ mood, onMoodChange }: MoodSelectorProps) {
  const [springing, setSpringing] = useState<string | null>(null);

  const handleClick = (value: string) => {
    setSpringing(value);
    setTimeout(() => setSpringing(null), 120); // match mood-spring duration
    onMoodChange(mood === value ? null : value);
  }
```

**Button className update** — extend lines 39-46 to conditionally add spring class:
```typescript
className={[
  "flex h-8 w-8 items-center justify-center rounded-md",
  "transition-all duration-150",
  isSelected
    ? "bg-accent/20"
    : "hover:bg-surface",
  springing === value ? "animate-mood-spring" : "",  // ADD THIS
].join(" ")}
```

**Import addition:**
```typescript
import { useState } from "react"  // add useState
```

---

### `src/components/OverviewView.tsx` (component, CRUD — add stagger-in to stat cards)

**Analog:** `src/components/OverviewView.tsx` lines 104-134 (stat card grid) + `src/styles/animations.css` `.stagger-children` pattern (line 23-26)

**Existing stagger pattern in animations.css** (lines 23-26):
```css
.stagger-children > * {
  animation-delay: calc(var(--i, 0) * 50ms);
}
```

**Existing stat grid** (lines 105-134 — add stagger-children class + `--i` props):
```typescript
// Current (line 105-108):
<section
  className="mb-8 grid grid-cols-4 gap-4"
  data-onboarding="stat-cards"
>
  <StatCard icon={BookOpen} ... />
  ...
```

**Updated pattern — add `stagger-children` and `--i` index to each card:**
```typescript
<section
  className="mb-8 grid grid-cols-4 gap-4 stagger-children"
  data-onboarding="stat-cards"
>
  <div style={{ "--i": 0 } as React.CSSProperties} className="animate-fade-in">
    <StatCard icon={BookOpen} label="total entries" value={totalEntries} variant="blue" />
  </div>
  <div style={{ "--i": 1 } as React.CSSProperties} className="animate-fade-in">
    <StatCard icon={CalendarDays} label="this month" value={entriesThisMonth} variant="violet" />
  </div>
  <div style={{ "--i": 2 } as React.CSSProperties} className="animate-fade-in">
    <StatCard icon={Flame} label="this week" value={Math.min(dayStreak, 7)} variant="amber" suffix="/7" />
  </div>
  <div style={{ "--i": 3 } as React.CSSProperties} className="animate-fade-in">
    <StatCard icon={Tag} label="tags created" value={tagsCreated} variant="emerald" />
  </div>
</section>
```

**Key:** `style={{ "--i": index } as React.CSSProperties}` is the cast pattern required for custom CSS properties in TypeScript React — identical to the existing `src/components/OverviewView.tsx` inline style pattern already used at line 78 for `--stagger-index`.

---

### `src/components/JournalView.tsx` (component, request-response — add crossfade)

**Analog:** `src/components/JournalView.tsx` full file (self-extension)

**Existing view-switch pattern** (lines 23-27 — direct conditional returns):
```typescript
if (activeView === "overview") return <OverviewView />;
if (activeView === "search") return <SearchView />;
if (activeView === "calendar") return <CalendarView />;
if (activeView === "editor" && selectedEntryId) return <EntryEditor entryId={selectedEntryId} />;
return <TimelineView />;
```

**New crossfade pattern** — wrap the return in a keyed container:
```typescript
// Add state at top of component:
const [displayedView, setDisplayedView] = useState(activeView);
const [fading, setFading] = useState(false);

useEffect(() => {
  if (activeView === displayedView) return;
  setFading(true);
  const t = setTimeout(() => {
    setDisplayedView(activeView);
    setFading(false);
  }, 150); // match --motion-fast
  return () => clearTimeout(t);
}, [activeView, displayedView]);

// Wrap all returns in a single div with conditional fade class:
const viewToRender = fading ? displayedView : activeView;
return (
  <div className={fading ? "animate-fade-out" : "animate-fade-in"} key={displayedView}>
    {viewToRender === "overview" && <OverviewView />}
    {viewToRender === "search" && <SearchView />}
    {viewToRender === "calendar" && <CalendarView />}
    {viewToRender === "editor" && selectedEntryId && <EntryEditor entryId={selectedEntryId} />}
    {!["overview","search","calendar","editor"].includes(viewToRender) && <TimelineView />}
  </div>
);
```

**Import additions:**
```typescript
import { useEffect, useState } from "react";  // add useState, useEffect already present
```

---

### `src/components/settings/TagManagementSection.tsx` (component, CRUD — NEW file)

**Analog:** `src/components/SettingsView.tsx` — specifically the `DataSection` (lines 537-613) and `HelpSection` (lines 617-669) sub-components. Copy their exact structure.

**Section scaffold pattern** (copy from DataSection / HelpSection — lines 584-612):
```typescript
// All Settings sections follow: <section> → SectionHeader → <div className="border-t border-border"> → SettingRow children
function DataSection() {
  return (
    <section>
      <SectionHeader icon={<Database size={16} />} title="Data" />
      <div className="border-t border-border">
        <SettingRow label="..." description="...">
          {/* action controls */}
        </SettingRow>
      </div>
    </section>
  );
}
```

**SectionHeader component** (lines 41-55 — copy this exact JSX, do NOT re-implement):
```typescript
// Defined locally in SettingsView.tsx — re-export or co-locate in TagManagementSection.tsx
function SectionHeader({ icon, title }: SectionHeaderProps) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-accent/10">
        <span className="text-accent">{icon}</span>
      </div>
      <h2 className="text-sm font-bold uppercase tracking-wider text-text">{title}</h2>
    </div>
  );
}
```

**AlertDialog usage pattern** — copy from existing `deleteTag` dialog pattern. Reference `alert-dialog.tsx` lines 99-125 for `AlertDialogAction` with `buttonVariants({ variant: "destructive" })`:
```typescript
// From alert-dialog.tsx lines 99-108:
const AlertDialogAction = React.forwardRef<...>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Action
    ref={ref}
    className={cn(buttonVariants(), className)}  // pass variant: "destructive" from call site
    {...props}
  />
))

// Call site pattern (from UI-SPEC):
<AlertDialogAction
  className={buttonVariants({ variant: "destructive" })}
  onClick={confirmDelete}
>
  Delete tag
</AlertDialogAction>
```

**Popover + ColorGrid recolor pattern** — copy exactly from TagPill.tsx lines 26-69:
```typescript
// TagPill.tsx lines 26-69 — the Popover + ColorGrid wiring is the exact pattern to copy
<Popover open={open} onOpenChange={setOpen}>
  <PopoverTrigger asChild>
    {/* trigger element */}
  </PopoverTrigger>
  <PopoverContent className="w-auto p-3" onClick={(e) => e.stopPropagation()}>
    <ColorGrid
      colors={[...TAG_COLORS]}   // → TAG_COLORS.map(t => t.base) after Phase 11
      selected={tag.color}
      onSelect={handleColorSelect}
      ariaLabel={`Color for tag ${tag.name}`}
      cols={5}   // → cols={6} for Phase 11
    />
  </PopoverContent>
</Popover>
```

**Store action pattern** — copy `updateTagColor` (tagStore.ts lines 73-79) for inline state update after store call:
```typescript
// tagStore.ts updateTagColor (analog for all Tag Management store calls):
updateTagColor: async (id: string, color: string) => {
  const db = await getDb();
  await db.execute("UPDATE tags SET color = ? WHERE id = ?", [color, id]);
  set((state) => ({
    tags: state.tags.map((t) => (t.id === id ? { ...t, color } : t)),
  }));
},
```

**Toast error pattern** — copy from SettingsView.tsx lines 305-309:
```typescript
// Existing pattern for error toast:
toast.error("AI backend not detected. Please check your setup.");
// For Phase 11 rename conflict:
toast.error(`A tag named "${newName}" already exists`);
```

**`formatDistanceToNow` import pattern** — date-fns is already a dependency. Copy the import style from OverviewView.tsx line 3:
```typescript
import { format, subDays } from "date-fns";
// For TagManagementSection:
import { formatDistanceToNow } from "date-fns";
```

**Full imports for TagManagementSection.tsx:**
```typescript
import { useState, useMemo } from "react";
import { Tag, Pencil, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { useTagStore, TAG_COLORS } from "../../stores/tagStore";
import { ColorGrid } from "../ui/ColorGrid";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "../ui/popover";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "../ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { buttonVariants } from "../ui/button";
```

**Row density:** `px-4 py-3` per row (UI-SPEC locked). This is `py-3 = 12px` (deliberate exception to standard spacing scale for data table density — see UI-SPEC spacing section).

---

### `src/components/SettingsView.tsx` (component — add TagManagementSection import + render)

**Analog:** `src/components/SettingsView.tsx` lines 672-712 (SettingsView main function)

**Existing section insertion point** (lines 687-696 — insert between DataSection and HelpSection):
```typescript
// Current (lines 688-693):
<div className="flex flex-col gap-10">
  <AppearanceSection />
  <SecuritySection />
  <AIFeaturesSection />
  <DataSection />
  <HelpSection />
</div>

// After Phase 11:
<div className="flex flex-col gap-10">
  <AppearanceSection />
  <SecuritySection />
  <AIFeaturesSection />
  <DataSection />
  <TagManagementSection />   {/* NEW — between Data and Help */}
  <HelpSection />
</div>
```

**Import addition** — copy the existing local import style (line 14):
```typescript
import { SettingRow } from "./SettingRow";
// Add:
import { TagManagementSection } from "./settings/TagManagementSection";
```

**SectionHeader sharing consideration:** `SectionHeader` is currently defined locally in SettingsView.tsx (lines 41-55). `TagManagementSection` needs the same component. Options:
1. Re-define it locally in TagManagementSection.tsx (simplest — no refactor)
2. Export it from SettingsView.tsx and import it (cleaner but requires SettingsView modification)

Prefer option 1 (local re-definition) to avoid modifying SettingsView's internal API. The component is small (12 lines) and stable.

---

## Shared Patterns

### Animation Class Application (CSS-only, no runtime deps)

**Source:** `tailwind.config.js` lines 87-91 + `animations.css` lines 6-26
**Apply to:** TagPill, MoodSelector, OverviewView, JournalView

```typescript
// Pattern: conditional class string via array join (from MoodSelector.tsx lines 39-46)
className={[
  "base-classes",
  condition ? "animate-token-name" : "",
].join(" ")}

// Pattern: always-on animation (fires once on mount, from TagPill wrapper)
className="base-classes animate-tag-pop-in"

// Pattern: stagger via CSS custom property (from animations.css + OverviewView)
style={{ "--i": index } as React.CSSProperties}
className="animate-fade-in"  // parent has stagger-children class
```

### Store Action (Zustand, optimistic update)

**Source:** `src/stores/tagStore.ts` lines 73-79 (`updateTagColor`)
**Apply to:** `renameTag` in tagStore.ts, all store calls in TagManagementSection

```typescript
actionName: async (id: string, value: string) => {
  const db = await getDb();
  await db.execute("UPDATE table SET col = ? WHERE id = ?", [value, id]);
  set((state) => ({
    items: state.items.map((t) => (t.id === id ? { ...t, col: value } : t)),
  }));
},
```

### PRAGMA-Guarded Migration

**Source:** `src/lib/db.ts` lines 183-195 (local_date migration)
**Apply to:** Phase 11 tag color backfill migration

```typescript
// Pattern: check before altering; run as standalone db.execute() AFTER MIGRATION_SQL loop
const colCheck = await db.select<{ name: string }[]>("PRAGMA table_info(table_name)");
const hasColumn = colCheck.some((c) => c.name === "column_name");
if (!hasColumn) {
  await db.execute("ALTER TABLE table_name ADD COLUMN column_name TYPE");
  // backfill immediately after
  await db.execute("UPDATE table_name SET column_name = ... WHERE column_name IS NULL");
}
```

For the tag color migration specifically (no ALTER needed — column exists, just updating values):
```typescript
// Run a series of standalone UPDATE statements — each is idempotent
for (const [oldHex, newHex] of Object.entries(OLD_TO_NEW)) {
  await db.execute("UPDATE tags SET color = ? WHERE color = ?", [newHex, oldHex]);
}
```

### Settings Section Structure

**Source:** `src/components/SettingsView.tsx` — DataSection (lines 537-613), HelpSection (lines 617-669)
**Apply to:** TagManagementSection.tsx

```typescript
// Every section follows this skeleton exactly:
function XSection() {
  return (
    <section>
      <SectionHeader icon={<IconName size={16} />} title="Section Title" />
      <div className="border-t border-border">
        {/* content — rows, tables, or custom layout */}
      </div>
    </section>
  );
}
```

### AlertDialog Destructive Confirmation

**Source:** `src/components/ui/alert-dialog.tsx` (full file) — used by existing "Delete Entry" pattern elsewhere in the codebase
**Apply to:** TagManagementSection delete confirmation

```typescript
// Radix AlertDialog already provides: zoom-in-95 + fade-in-0 on open (ANIM-03 free)
// AlertDialogContent className in alert-dialog.tsx line 37:
// "... duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out
//  data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0
//  data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 ..."
// No animation changes needed — ANIM-03 compliance is automatic.
```

### Popover + ColorGrid Wiring

**Source:** `src/components/TagPill.tsx` lines 26-69
**Apply to:** TagManagementSection recolor Popover

```typescript
// PopoverContent already provides: zoom-in-95 + fade-in-0 on open (ANIM-03 free)
// PopoverContent className in popover.tsx line 22:
// "... data-[state=open]:animate-in data-[state=closed]:animate-out
//  data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0
//  data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 ..."
// No animation changes needed — ANIM-03 compliance is automatic.
```

---

## No Analog Found

All files in Phase 11 have direct analogs or are self-extensions of existing files. No files require RESEARCH.md patterns as a substitute.

| File | Notes |
|------|-------|
| `src/components/settings/TagManagementSection.tsx` | Closest is DataSection/HelpSection in SettingsView.tsx — role-match (same section pattern, different content). The table/rename/recolor sub-structure is novel but fully specified in UI-SPEC. |

---

## Metadata

**Analog search scope:** `src/styles/`, `src/stores/`, `src/lib/`, `src/components/`, `src/components/ui/`, `src/components/settings/`, `tailwind.config.js`
**Files read:** 14
**Pattern extraction date:** 2026-04-19

**Critical line references for planner:**
- `animations.css` full file (26 lines) — append after line 26
- `tailwind.config.js` keyframes block lines 75-86, animation block lines 87-91 — extend both
- `tagStore.ts` TAG_COLORS lines 4-13 — replace; updateTagColor lines 73-79 — clone for renameTag
- `db.ts` migration pattern lines 183-195 — copy PRAGMA-guard shape; append after line 218
- `TagPill.tsx` ColorGrid call line 62-68 — update cols + colors; wrapper div line 29 — add animation class
- `MoodSelector.tsx` button className lines 39-46 — add spring class; handleClick lines 23-25 — add state
- `OverviewView.tsx` stat grid section lines 105-134 — wrap cards with `--i` props
- `JournalView.tsx` view-switch lines 23-27 — wrap in keyed crossfade container
- `SettingsView.tsx` section list lines 688-693 — insert TagManagementSection between DataSection and HelpSection
- `alert-dialog.tsx` line 37 — ANIM-03 already present (zoom-in-95, fade-in-0); no changes needed
- `popover.tsx` line 22 — ANIM-03 already present (zoom-in-95, fade-in-0); no changes needed
