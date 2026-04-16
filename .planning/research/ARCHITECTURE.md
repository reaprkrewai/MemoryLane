# Architecture Research — Chronicle AI v1.1 Daily Driver Integration

**Domain:** Tauri + React desktop journaling app, extending existing MVP architecture
**Researched:** 2026-04-16
**Confidence:** HIGH (grounded in actual file inspection of the repo)

---

## Existing Architecture Snapshot (v1.0 MVP, already shipped)

### Layer Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                             main.tsx                                  │
│                   (fonts + globals.css + <App/>)                      │
├──────────────────────────────────────────────────────────────────────┤
│                              App.tsx                                  │
│   gates: isDbReady → dbError → isPinSet → isLocked → content          │
│   wires: initializeDatabase, getAppLock, initAI, useIdleTimeout       │
│   renders: <AppShell>{ settings | <JournalView/> }</AppShell>         │
├──────────────────────────────────────────────────────────────────────┤
│          AppShell  ─→  Sidebar  |  JournalView / SettingsView         │
│                                    │                                   │
│                        JournalView.tsx (activeView router)            │
│  overview → <OverviewView/>      calendar → <CalendarView/>           │
│  search   → <SearchView/>        editor   → <EntryEditor/>            │
│  (default)→ <TimelineView/>                                           │
├──────────────────────────────────────────────────────────────────────┤
│                         Zustand stores (in-memory)                    │
│   entryStore  tagStore  viewStore  uiStore  aiStore  searchStore      │
├──────────────────────────────────────────────────────────────────────┤
│                          Service layer (src/)                         │
│   lib/db.ts                      lib/hybridAIService.ts               │
│   lib/ollamaService.ts           lib/pinCrypto.ts                     │
│   utils/embeddingService.ts      utils/vectorSearchService.ts         │
│   utils/qaService.ts             utils/aiSettingsService.ts           │
├──────────────────────────────────────────────────────────────────────┤
│                            Data layer                                 │
│    SQLite (@tauri-apps/plugin-sql, "sqlite:chronicle-ai.db")          │
│    localStorage (theme, fontSize, idleTimeout, paletteId)             │
└──────────────────────────────────────────────────────────────────────┘
```

### Key observations confirmed from source

| Fact | Source | Implication for v1.1 |
|------|--------|----------------------|
| `tags` table already has `color TEXT NOT NULL DEFAULT '#6B7280'` | `src/lib/db.ts:35` | No schema migration needed for tag colors |
| `tagStore.updateTagColor(id, color)` already exists | `src/stores/tagStore.ts:73-79` | Backend plumbing done |
| `TagPill` already renders a color picker via Popover | `src/components/TagPill.tsx:59-82` | Color picker UX exists — v1.1 just polishes |
| `TAG_COLORS` palette (8 colors) exported from tagStore | `src/stores/tagStore.ts:4-13` | Palette source already singular |
| `OnThisDay` query already implemented | `src/components/OnThisDay.tsx:41-47` | Reuse as-is on dashboard, don't rewrite |
| `allEntries` array on entryStore is the single source for timeline stats | `src/stores/entryStore.ts:84-87, 209-229` | Dashboard stats subscribe here, no new store needed |
| `OverviewView` already computes `totalEntries`, `wordsWritten`, `dayStreak`, `tagsCreated`, `moodCounts` in-component via `useMemo` | `src/components/OverviewView.tsx:74-82` | Stays in-component unless we need reuse — extract to a hook only when third consumer appears |
| Migration SQL is a single inlined string split by `splitSqlStatements` | `src/lib/db.ts:12-109, 116-151` | Any new schema additions append to `MIGRATION_SQL` (idempotent `CREATE ... IF NOT EXISTS`) |
| `generateEmbeddingAsync` is called fire-and-forget from `saveContent` | `src/stores/entryStore.ts:164-165` | Same pattern applies for auto-tagging |
| AI backend is already hybrid (embedded llama.cpp on :8189 OR Ollama on :11434) | `src/lib/hybridAIService.ts:22-59` | Auto-tagging must route through `hybridAIService`, NOT `ollamaService` directly |
| `aiStore` tracks runtime availability + setup wizard state | `src/stores/aiStore.ts:11-44` | Auto-tagging UI gates on `useAIStore((s) => s.llm && s.available)` |
| `SettingsView` is rendered at App.tsx level, not inside JournalView router | `src/App.tsx:187-190` | Onboarding overlay must also live at App.tsx level so it can cover any view |
| `isPinSet` null guard prevents content flash before PIN state resolved | `src/App.tsx:166-173` | Onboarding first-run check follows the same tri-state gating pattern |
| Animations in existing code are Tailwind utility classes only (`transition-all`, `duration-300`, `hover:-translate-y-0.5`) | `OverviewView.tsx`, `StatCard.tsx`, `QuickWriteFAB.tsx` | No animation library installed. v1.1 animation system stays CSS-first — no framer-motion dependency |

---

## v1.1 Feature Integration

### 1. Dashboard Widgets (7 widgets)

**Question:** Where do stats / streak / On-This-Day queries live? New aggregate functions in a DB module? New stats store? How do widgets subscribe to entry changes?

**Verdict — no new store, no new aggregate module. Compose from `entryStore.allEntries` + reuse existing `OnThisDay.tsx` query, co-locate memoized derivations in `OverviewView`.**

**Rationale:**
- Stats (`totalEntries`, `wordsWritten`, `dayStreak`, `tagsCreated`, `moodCounts`) are already cheap in-memory derivations over `allEntries`. A new `statsStore` would duplicate the source of truth and need its own invalidation on every `saveContent` / `createEntry` / `deleteEntry`.
- The existing pattern (`entryStore.saveContent` → updates `allEntries` inline → `useMemo` in consumers recomputes) is reactive by construction. Adding a store breaks this.
- OTD already has a working DB query in `OnThisDay.tsx:36-83`. Dashboard "On This Day" widget **reuses the `OnThisDay` component directly** — don't re-query.

**Widget → data source map:**

| Widget | Data source | Subscribe to | File state |
|--------|-------------|--------------|------------|
| StatCard × 4 (entries / words / streak / tags) | Existing `useMemo(allEntries, tags)` in `OverviewView` | `entryStore.allEntries`, `tagStore.tags` | MODIFY `OverviewView.tsx` (pull into child components only if third consumer appears) |
| Mood trends visualization | Extract moodCounts derivation; chart is NEW | `entryStore.allEntries` | NEW `src/components/dashboard/MoodTrends.tsx`. Decide: keep `MoodOverview.tsx` (30-day constellation) vs. replace with time-series — they answer different questions |
| On This Day (dashboard) | Existing `OnThisDay` component | DB query on mount (already memoized by component) | REUSE `src/components/OnThisDay.tsx` AS-IS; MODIFY `OverviewView.tsx` to render it |
| Recent entries feed | `allEntries.slice(0, 3)` already present | `entryStore.allEntries` | Already in `OverviewView.tsx:84` — extract to `RecentEntriesFeed.tsx` |
| Quick-write FAB | Already exists | — | `src/components/QuickWriteFAB.tsx` (already rendered in `OverviewView.tsx:252`) |
| Writing prompts widget | Static array (seed with ~30 prompts) OR LLM-generated via hybridAI | — (static) or `aiStore` (LLM) | NEW `src/components/dashboard/WritingPrompts.tsx`, NEW `src/lib/writingPrompts.ts` (static list), OPTIONAL NEW `src/utils/promptService.ts` (LLM path) |
| AI insights summary | Weekly summary from LLM over last N entries | `aiStore` gating, `entryStore.allEntries` for content | NEW `src/components/dashboard/AIInsightSummary.tsx`, NEW `src/utils/insightService.ts` (calls `hybridAI.askQuestion` with entries as context) |

**New DB helpers (if any):**

One worth adding — `getEntryStats(): { total: number; totalWords: number }` in a new `src/lib/dbQueries.ts`. Reason: `OverviewView.tsx:74-76` currently derives `totalEntries` from `allEntries.length`, but `loadPage()` only loads 20 at a time. Once a user has 100+ entries, the "Total entries" StatCard will be wrong until they scroll. This is a latent bug exposed by v1.1 dashboard prominence. See Scaling Considerations below.

**File plan:**

```
src/components/dashboard/          # NEW subfolder — co-locate all dashboard widgets
  MoodTrends.tsx                    # NEW — time-series chart (inline SVG or d3)
  RecentEntriesFeed.tsx             # EXTRACT from OverviewView
  WritingPrompts.tsx                # NEW
  AIInsightSummary.tsx              # NEW
  (StatCard.tsx stays at components/ — already reusable outside dashboard)
  (MoodOverview.tsx — keep at components/ for 30-day constellation, or move here)

src/lib/writingPrompts.ts          # NEW — static prompt list (~30 items)
src/lib/dbQueries.ts               # NEW — getEntryStats() aggregate (fixes pagination bug)
src/utils/insightService.ts        # NEW — weekly summary via hybridAI.askQuestion
```

**Data flow (no changes to stores):**

```
entryStore.saveContent(...)
    └→ updates allEntries in place (existing)
         └→ OverviewView re-renders (Zustand selector)
              └→ useMemo recomputes stats
                   └→ StatCards, MoodTrends, RecentEntriesFeed all update
```

---

### 2. First-Run Onboarding Flow

**Question:** Where does first-run state live? Integration with existing PIN setup flow? Sample entry seeding approach?

**Verdict — new key in `settings` table (`onboarding_completed`), onboarding runs AFTER PinSetupScreen, overlay at App.tsx level gated by an `isOnboardingCompleted` flag on `uiStore`. No sample entries by default — the existing "No entries yet" empty state in `OverviewView.tsx:184-202` already handles this.**

**Rationale:**
- PIN setup is itself first-run UX (`App.tsx:176-178`). Adding onboarding *before* PIN would force users through 2 setup screens before seeing the app. Adding it *instead of* PIN breaks security.
- **Onboarding should run after PIN is set but before the user lands on Overview.** New users flow: DB init → PIN setup → onboarding tour → Overview. Returning users with PIN set skip onboarding on next launch.
- **Persist to SQLite `settings` table, not localStorage.** localStorage is per-browser-profile; if Tauri webview state is cleared, the user would be re-onboarded. SQLite persists with their journal data and survives webview resets.
- **Sample entries are a trap.** They pollute search, FTS5 indexes, embeddings, and streak calculations. A first-time user seeing fake entries under their name feels fake. Use the existing empty-state CTA.

**First-run detection pattern (mirrors existing `isPinSet` tri-state):**

```typescript
// uiStore additions
isOnboardingCompleted: boolean | null;  // null = unknown, check in progress
setIsOnboardingCompleted: (v: boolean | null) => void;
```

```typescript
// App.tsx flow after DB ready + PIN unlocked:
// Query SELECT value FROM settings WHERE key = 'onboarding_completed'
// If null or 'false' → show OnboardingOverlay
// If 'true' → skip
```

**PIN setup integration:**

`PinSetupScreen.onComplete` already calls `setIsPinSet(true)` + `setIsLocked(true)` (`App.tsx:131-134`). After user unlocks the first time, App.tsx queries the onboarding flag. State sequence:

```
PIN not set → PinSetupScreen
PIN set, locked → PinEntryScreen
PIN set, unlocked, onboarding_completed = false → OnboardingOverlay + AppShell underneath
PIN set, unlocked, onboarding_completed = true → AppShell normal
```

**Overlay technique:** `OnboardingOverlay` is a full-viewport absolutely-positioned component rendered OVER `AppShell`. This lets the tour highlight real UI (sidebar, FAB, editor button, etc.) by letting them peek through a dimmed backdrop with cutouts — no need to teach users on a fake screen.

**File plan:**

```
src/components/onboarding/         # NEW
  OnboardingOverlay.tsx             # NEW — top-level modal with step progression
  OnboardingStep.tsx                # NEW — individual step card (title, body, CTA)
  onboardingSteps.ts                # NEW — step config: [{ id, title, body, spotlight?: DOMSelector }]

src/lib/db.ts                       # MODIFY — add 'onboarding_completed' to settings INSERT OR IGNORE seed
src/stores/uiStore.ts               # MODIFY — add isOnboardingCompleted tri-state + setter
src/App.tsx                         # MODIFY — query flag on mount after unlock, conditionally render OnboardingOverlay
```

**Schema addition (idempotent append to `MIGRATION_SQL`):**

```sql
INSERT OR IGNORE INTO settings(key, value) VALUES
    ('onboarding_completed', 'false');
```

No `ALTER TABLE` needed — `settings` is already a key-value table.

---

### 3. Animation System

**Question:** Create `src/animations/` presets? Global motion provider? Per-component?

**Verdict — CSS-first with a shared `src/styles/animations.css` file + Tailwind config extensions. No framer-motion. No global provider.**

**Rationale:**
- The repo currently has **zero** motion libraries installed (`package.json:12-42`). Adding framer-motion pulls ~45KB gzipped plus a React context provider into the bundle for microinteractions that CSS handles natively.
- All existing animations are Tailwind utility classes + inline styles (`StatCard.tsx:41-47`: `transition-all duration-300 group-hover:scale-110`; `QuickWriteFAB.tsx:11`: `transition-all duration-300 hover:-translate-y-0.5`).
- Tailwind v3 is pinned (v4 was explicitly rejected per `STATE.md:46`). `tailwindcss-animate` plugin is already in deps — provides `animate-in` / `animate-out` utilities.
- A "global motion provider" is only useful when you need orchestration (variants across layout changes, shared element transitions, route transitions). Chronicle AI has no route transitions (activeView swap is instant), no layout animations between entries, and no shared-element transitions planned.

**What an animation "system" looks like here:**

1. **Tokens in `globals.css`** — durations, easings as CSS variables:
   ```css
   :root {
     --motion-fast: 150ms;
     --motion-med: 300ms;
     --motion-slow: 500ms;
     --ease-out-smooth: cubic-bezier(0.22, 1, 0.36, 1);
     --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
   }
   ```
2. **Shared keyframes in `src/styles/animations.css`** (NEW) — imported by main.tsx:
   ```css
   @keyframes fade-in-up { from { opacity: 0; transform: translateY(8px); } to { ... } }
   @keyframes shimmer { ... }  /* already inlined in QuickWriteFAB — extract */
   @keyframes pulse-glow { ... }
   ```
3. **Tailwind config extensions** (MODIFY `tailwind.config.js`): register `animation`, `keyframes`, `transitionTimingFunction` that reference the CSS vars.
4. **Reduce-motion guard** (globals.css):
   ```css
   @media (prefers-reduced-motion: reduce) {
     *, *::before, *::after {
       animation-duration: 0.01ms !important;
       transition-duration: 0.01ms !important;
     }
   }
   ```

**When to reach for framer-motion:** If onboarding spotlight needs to animate DOM cutouts across multiple nodes with shared-layout transitions, OR if the mood chart needs physics-based interpolation. Defer that decision until you actually hit it — you won't for v1.1 widgets.

**File plan:**

```
src/styles/animations.css          # NEW — shared keyframes
src/styles/globals.css             # MODIFY — import animations.css, add motion tokens, add reduce-motion guard
tailwind.config.js                 # MODIFY — register animation utilities
```

No `src/animations/` JS folder. Animations are a styling concern, not a logic concern in this app.

---

### 4. Auto-Tagging AI Pipeline

**Question:** Trigger on save (debounced) or on demand? New aiStore action? How to pass entry content to Ollama + parse suggested tags?

**Verdict — on-demand button (NOT automatic on save), new `suggestTagsForEntry` in a new `src/utils/tagSuggestionService.ts`, routed through `hybridAIService.askQuestion`. Suggestions are returned as a list the user confirms before applying.**

**Rationale:**

1. **Why not automatic on save?**
   - `scheduleAutoSave` fires on every keystroke (debounced 500ms). Hammering the LLM during typing is wasteful and UX-hostile (CPU/GPU spikes, fan noise during writing).
   - LLM output is probabilistic — auto-applying tags without confirmation leads to wrong/unwanted tags polluting the user's taxonomy. Tag taxonomy hygiene matters for semantic search later.
   - The existing embedding pipeline (`generateEmbeddingAsync` in `entryStore.saveContent`) is a *silent, fallible* background job that produces invisible data. Tags are visible content — different UX contract.

2. **Why on-demand?**
   - User intent is explicit → fewer wrong tags applied.
   - Matches existing "Ask AI" / "View Insights" entry points in `QuickActions.tsx:26-28` — consistency.
   - Cheap to invoke: one `hybridAI.askQuestion` call per tap.

3. **Why `hybridAIService`, not `ollamaService` directly?**
   - `hybridAIService` routes based on `aiStore.aiBackend` preference (embedded llama.cpp vs. Ollama). Calling `ollamaService` directly would break embedded-AI users.
   - Look at `embeddingService.ts:43-77` for the established pattern — it uses `hybridAI.checkAIHealth()` then `hybridAI.generateEmbedding()`. Follow it.

**Service contract:**

```typescript
// src/utils/tagSuggestionService.ts  (NEW)
export interface TagSuggestion {
  name: string;           // lowercased, whitespace-normalized
  confidence?: number;    // optional — LLMs don't reliably return calibrated scores
  isExisting: boolean;    // true if it matches a tag in tagStore.tags
  existingId?: string;    // populated when isExisting
}

export async function suggestTagsForEntry(
  entryContent: string,
  existingTags: string[]  // pass tagStore.tags.map(t => t.name) for biasing
): Promise<TagSuggestion[]>;
```

**Implementation strategy:**

- Prompt template: "Given the journal entry below, suggest 3-5 concise tags (1-2 words, lowercase). Prefer reusing these existing tags if applicable: [...]. Return only a comma-separated list, no explanation."
- Parse response: split on commas, trim, lowercase, dedupe, match against `tagStore.tags` to flag `isExisting`.
- Cap at 5 suggestions; reject anything >20 chars or containing newlines/special chars.
- Graceful degradation: if `!aiStore.available || !aiStore.llm`, throw `AIUnavailableError` — UI shows a toast with link to settings.

**UI integration:**

- New button in `TagRow.tsx` — a small "Sparkles" icon button next to `TagInput` that opens a popover showing suggestions with checkboxes. User confirms → applies via `tagStore.addTagToEntry`.
- **Disable the button** when `!aiStore.available || !aiStore.llm`. Use the existing aiStore selectors.
- New tags (non-existing) get auto-created through `tagStore.createTag` before `addTagToEntry` (createTag already handles color assignment).

**aiStore additions — NONE.** Suggestion is a one-shot request. No persistent state to track. The existing `available` / `llm` booleans gate the button.

**File plan:**

```
src/utils/tagSuggestionService.ts   # NEW — suggestTagsForEntry(content, existing)
src/components/TagSuggestButton.tsx # NEW — popover trigger, rendered inside TagRow
src/components/TagRow.tsx           # MODIFY — render <TagSuggestButton/> next to <TagInput/>
```

**No changes to:**
- `entryStore.saveContent` (don't entangle save with tagging).
- `aiStore` (no new state).
- Any DB schema.

---

### 5. Tag Color Picker

**Question:** Schema migration? TagPill update? Color picker component placement?

**Verdict — schema already has `tags.color`, `TagPill` already renders a color picker, `updateTagColor` already persists. v1.1 work is polish only: expand palette, add "Tag management" screen in Settings, ensure color is shown consistently in timeline cards and autocomplete dropdown.**

**What's already done (confirmed from source):**

| Piece | Status | Source |
|-------|--------|--------|
| `tags.color` column with default `#6B7280` | DONE | `src/lib/db.ts:35` |
| `TAG_COLORS` palette constant (8 colors) | DONE | `src/stores/tagStore.ts:4-13` |
| `tagStore.updateTagColor(id, color)` | DONE | `src/stores/tagStore.ts:73-79` |
| Auto-assign color on create (round-robin) | DONE | `src/stores/tagStore.ts:53-54` |
| Color picker popover inside `TagPill` | DONE | `src/components/TagPill.tsx:59-82` |
| `color-mix(...)` styling for tag bg/border | DONE | `src/components/TagPill.tsx:30-32` |
| `TagPillReadOnly` for timeline cards (no popover) | EXISTS | per `STATE.md:58`; verify it uses `tag.color` |

**What v1.1 likely needs (inferred from "Tag Management: Color picker per tag (preset palette)"):**

1. **Richer palette.** 8 colors is thin; expand to 12-16 with harmonized variants for light/dark via `color-mix` or OKLCH.
2. **Tag management surface.** Currently editing a color requires opening an entry that has that tag — not discoverable. Add a section to `SettingsView.tsx` (or a dedicated "Tags" settings subsection) listing all tags with inline color picker + rename + delete.
3. **Consistent color application.** Verify `TagPillReadOnly` (timeline) and any autocomplete dropdown entries also render the color. If they default to text color, update them.

**NO schema migration required.** The `color` column exists. Just keep writing to it.

**Color picker component placement (answer to the sub-question):**

- **Per-tag in `TagPill`:** already exists, keep as-is. Discoverable when you're in an entry.
- **Global in Settings:** NEW `TagManagement.tsx`. Makes colors discoverable without opening entries. Uses the same palette grid component.
- **Extract color-grid UI** into `src/components/ui/ColorGrid.tsx` (NEW) so both `TagPill` and `TagManagement` use the same pickable grid. DRY — avoid re-implementing the palette grid twice.

**File plan:**

```
src/lib/tagColors.ts                # NEW (optional) — TAG_COLORS + helpers (pickContrastText, normalizeHex). Decide: keep in tagStore OR extract
src/stores/tagStore.ts              # MODIFY — expand TAG_COLORS palette
src/components/ui/ColorGrid.tsx     # NEW — reusable color-swatch grid
src/components/TagPill.tsx          # MODIFY — use ColorGrid
src/components/settings/TagManagement.tsx   # NEW — list all tags, inline color picker, rename, delete
src/components/SettingsView.tsx     # MODIFY — add Tag Management section
src/components/TagPillReadOnly.tsx  # VERIFY — ensure it uses tag.color (likely already does)
```

---

## Cross-Feature Data Flow

### Existing (unchanged)

```
User types in editor
    ↓
TipTap onUpdate → entryStore.scheduleAutoSave (debounced 500ms)
    ↓ (after debounce)
entryStore.saveContent
    ├→ db.execute(UPDATE entries ...)
    ├→ set({ allEntries: updated }) ← Zustand reactivity
    └→ generateEmbeddingAsync (fire-and-forget)
                ↓
          hybridAI.checkAIHealth → hybridAI.generateEmbedding
                ↓
          db.execute(INSERT embeddings ...)
```

### v1.1 additions (new arrows only)

```
User taps "Suggest tags" in TagRow
    ↓
tagSuggestionService.suggestTagsForEntry(content, existingNames)
    ↓
hybridAI.askQuestion(prompt, "")  ← same hybrid router as Q&A
    ↓
Parse response → TagSuggestion[]
    ↓
User confirms in popover → tagStore.addTagToEntry for each (createTag first for new ones)


Dashboard mount
    ↓
entryStore.loadPage() + tagStore.loadTags() (already called in OverviewView useEffect)
    + NEW: getEntryStats() for accurate totals (fixes pagination bug)
    ↓
useMemo derives stats/moodCounts/recent from allEntries + tags
    ↓
Widgets render (reactive to any subsequent saveContent/createEntry/deleteEntry)


First launch
    ↓
initializeDatabase (settings row 'onboarding_completed' = 'false' seeded)
    ↓
PIN setup → unlock
    ↓
Query onboarding_completed flag → if false, render <OnboardingOverlay/> over AppShell
    ↓
User completes/skips → UPDATE settings SET value = 'true' WHERE key = 'onboarding_completed'
    ↓
Subsequent launches: flag = 'true' → skip overlay
```

---

## File Change Summary

### NEW files

```
src/components/dashboard/
  MoodTrends.tsx
  RecentEntriesFeed.tsx
  WritingPrompts.tsx
  AIInsightSummary.tsx

src/components/onboarding/
  OnboardingOverlay.tsx
  OnboardingStep.tsx
  onboardingSteps.ts

src/components/settings/
  TagManagement.tsx

src/components/ui/
  ColorGrid.tsx

src/components/TagSuggestButton.tsx

src/lib/
  writingPrompts.ts
  dbQueries.ts                    # getEntryStats() — fixes pagination-count bug
  tagColors.ts                    # (optional — if extracting from tagStore)

src/utils/
  insightService.ts
  tagSuggestionService.ts

src/styles/
  animations.css
```

### MODIFIED files

```
src/App.tsx                       # onboarding gating after unlock
src/main.tsx                      # import animations.css
src/stores/uiStore.ts             # isOnboardingCompleted tri-state
src/stores/tagStore.ts            # (optional) expanded palette — or move to tagColors.ts
src/styles/globals.css            # motion tokens, prefers-reduced-motion guard
src/lib/db.ts                     # seed 'onboarding_completed' in settings INSERT OR IGNORE
src/components/OverviewView.tsx   # wire new widgets, extract RecentEntriesFeed, use getEntryStats
src/components/TagRow.tsx         # render TagSuggestButton
src/components/TagPill.tsx        # use ColorGrid
src/components/SettingsView.tsx   # add Tag Management section
tailwind.config.js                # animation utility extensions
```

### UNCHANGED (explicit — don't touch)

```
src/stores/entryStore.ts          # NO new actions — dashboard reads allEntries
src/stores/aiStore.ts             # NO new state — suggestion is one-shot
src/stores/viewStore.ts           # NO new views — overview already exists
src/stores/searchStore.ts
src/lib/hybridAIService.ts        # reuse askQuestion + generateEmbedding
src/lib/ollamaService.ts          # not called directly; hybridAI is the gate
src/components/OnThisDay.tsx      # reuse on dashboard AS-IS
src/components/QuickWriteFAB.tsx  # already positioned inside OverviewView
src/components/StatCard.tsx
src/components/MoodOverview.tsx   # IF we keep 30-day constellation separate from MoodTrends
```

---

## Suggested Build Order

Ordered by dependency + risk + value-per-hour.

### Wave 1 — Foundation (no AI, no DB changes, unblocks everything)

1. **Animation tokens + keyframes** — pure CSS, zero risk. Enables polish in every subsequent widget.
   - `src/styles/animations.css`, `globals.css` tokens, `tailwind.config.js` extension.
2. **ColorGrid UI primitive** — extract the color picker grid. Enables tag-color work in parallel with onboarding.
   - `src/components/ui/ColorGrid.tsx`, refactor `TagPill` to use it.
3. **`getEntryStats()` helper** in `src/lib/dbQueries.ts` — fixes the pagination-count bug before it becomes visible on the prominent dashboard.

### Wave 2 — Dashboard widgets (pure UI, read-only from existing stores)

4. **Extract `RecentEntriesFeed`** from `OverviewView` — trivial refactor, establishes `dashboard/` subfolder.
5. **`WritingPrompts` widget** with static list — no AI dep, ships value immediately.
6. **`MoodTrends` time-series** — derives from `allEntries`; in-component for now.
7. **Wire `OnThisDay` into `OverviewView`** — reuses existing component; zero new query logic.
8. **Swap `OverviewView` stats** to use `getEntryStats()` for totals.

### Wave 3 — Tag color polish

9. **Expand palette** to 12+ colors (tagColors.ts or inline in tagStore).
10. **`TagManagement` settings section** — list, inline color picker via ColorGrid, rename, delete.
11. **Verify `TagPillReadOnly`** renders color correctly in timeline cards.

### Wave 4 — Onboarding (touches App.tsx state machine — higher risk)

12. **Seed `onboarding_completed`** in `db.ts` migration.
13. **Add `isOnboardingCompleted` tri-state** to uiStore.
14. **`OnboardingOverlay` + steps config** — static content, no AI.
15. **Wire into App.tsx** after PIN unlock, before AppShell content renders.

### Wave 5 — AI-dependent features (gated by AI availability)

16. **`tagSuggestionService`** — implement + unit-test the prompt parser.
17. **`TagSuggestButton`** — popover UI, integrate in TagRow.
18. **`insightService` + `AIInsightSummary`** — weekly summary widget, aiStore-gated.

### Why this order?

- **Wave 1 first** because animations, ColorGrid, and the stats-count fix are leaf-level primitives / bugfixes used by everything else. Building them first means later work gets polish for free and dashboard stats don't ship broken.
- **Wave 2 before Wave 4** because dashboard widgets exercise `allEntries` reactivity — if there's a bug, you'd rather find it with 3 widgets than stacked under onboarding.
- **Onboarding (Wave 4) before AI (Wave 5)** because onboarding is the gate new users hit first — breaking the gate breaks the product. Land it early so it gets tested over multiple sessions.
- **AI last** because it's probabilistic (prompt-engineering iteration) and gated by a running Ollama/embedded server — the slowest feedback loop.

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Ollama (localhost:11434) | Via `hybridAIService.askQuestion / generateEmbedding` | Never call `ollamaService` directly from new code — route through hybrid |
| Embedded llama.cpp (localhost:8189) | Same `hybridAIService` | `aiStore.aiBackend` determines routing |
| SQLite (via `@tauri-apps/plugin-sql`) | `getDb()` singleton, `db.execute / db.select<T>` | All queries inlined in services/stores, no ORM |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Component ↔ Store | Zustand selectors | `useEntryStore((s) => s.allEntries)` — granular selectors prevent over-renders |
| Store ↔ DB | Direct `getDb()` call inside store actions | No separate repository layer; stores own their DB logic |
| AI features ↔ LLM | `hybridAIService` router, gated on `aiStore.{available, llm, embedding}` | All AI calls graceful-degrade — never throw to UI without a try/catch |
| Editor ↔ Auto-save | Module-level timers in entryStore (outside Zustand state) | Timers are NOT serializable — established pattern per `STATE.md:52` |
| First-run gates | Sequential tri-state checks in App.tsx: `isDbReady → dbError → isPinSet → isLocked → isOnboardingCompleted` | Each gate prevents content flash; follow the `null` sentinel pattern |

---

## Anti-Patterns (specific to this repo)

### Anti-Pattern 1: New store for dashboard stats

**What people do:** Create `statsStore` that duplicates derivations from `allEntries`.
**Why it's wrong:** Invalidation becomes a nightmare — every `saveContent / createEntry / deleteEntry` has to also poke the stats store. Drift is inevitable.
**Do this instead:** Subscribe to `entryStore.allEntries` directly in widgets, use `useMemo`. The existing pattern in `OverviewView.tsx:74-82` is correct. For "true" totals that transcend pagination, call `getEntryStats()` on mount.

### Anti-Pattern 2: Seeding sample entries on first launch

**What people do:** Create 2-3 fake entries so the dashboard looks lively for new users.
**Why it's wrong:** Fake entries pollute FTS5 search index, embeddings table, streak counter, mood stats — and feel fake to the user. Empty state in `OverviewView.tsx:184-202` is already well-designed.
**Do this instead:** Zero sample entries. Use onboarding to *explain* empty states, not fill them.

### Anti-Pattern 3: Auto-tagging on save

**What people do:** Run tag suggestion inside `scheduleAutoSave` so tags appear "magically" as the user types.
**Why it's wrong:** Hammers the LLM (CPU/GPU spikes during writing), produces wrong tags that silently pollute the taxonomy, violates the "no surprise" UX principle.
**Do this instead:** Explicit sparkle button → suggestion popover → user confirms. On-demand only.

### Anti-Pattern 4: Calling `ollamaService` directly from new code

**What people do:** Import from `src/lib/ollamaService.ts` because "we're on Ollama for now."
**Why it's wrong:** Breaks the embedded llama.cpp backend path. Users with embedded AI get silent failures.
**Do this instead:** Import from `src/lib/hybridAIService.ts`. Let the router pick the backend.

### Anti-Pattern 5: Adding framer-motion for microinteractions

**What people do:** `npm install framer-motion` because "it makes animations easier."
**Why it's wrong:** 45KB gzipped + React context for what CSS transitions and tailwindcss-animate already handle. No existing component needs motion orchestration.
**Do this instead:** CSS transitions, Tailwind `transition-*` utilities, `animate-in` / `animate-out` from `tailwindcss-animate`. Revisit only if a specific feature demands shared-element or layout animations.

### Anti-Pattern 6: Schema `ALTER TABLE` in a new migration block

**What people do:** Add `ALTER TABLE tags ADD COLUMN color TEXT` because that's what a fresh migration would need.
**Why it's wrong:** The column already exists (`db.ts:35`). `ALTER TABLE ... ADD COLUMN` is not idempotent in SQLite — it fails on second run. The project's migration pattern is idempotent `CREATE TABLE IF NOT EXISTS` — it assumes the current schema is accurate for both new and upgrade installs.
**Do this instead:** For new columns on existing tables, follow the project's convention — either update the `CREATE TABLE` statement (fine for this project because fresh installs get it; existing installs already have the column) OR write a guarded migration (`PRAGMA table_info(...)` check). Don't blindly add `ALTER TABLE`.

### Anti-Pattern 7: Rendering onboarding inside JournalView

**What people do:** Add `{ activeView === 'onboarding' && <Tour/> }` to `JournalView.tsx`.
**Why it's wrong:** Overlay needs to cover Settings too (SettingsView is rendered at App.tsx level, not inside JournalView — see `App.tsx:188-190`). Putting onboarding inside JournalView means it can't overlay Settings.
**Do this instead:** Render `<OnboardingOverlay/>` at App.tsx level, positioned absolutely over `<AppShell/>`.

---

## Scaling Considerations

| Scale | Dashboard behavior | Adjustments |
|-------|---------------------|------------|
| 0–500 entries | `allEntries` fully loaded, in-memory `useMemo` trivially fast | None |
| 500–5,000 entries | `loadPage` pagination (pageSize 20) — `allEntries` only grows as user scrolls timeline | Dashboard stats must query full count via `getEntryStats()` DB helper, NOT derive from `allEntries.length`. Recent-entries from `allEntries.slice(0,3)` stays accurate (these ARE the most recent). |
| 5,000+ entries | Full-scan `COUNT(*)` + `SUM(word_count)` takes ~50ms+ | Consider a `stats_cache` table updated via triggers, OR in-memory cache refreshed on save. **Not needed for v1.1.** |
| 10,000+ with embeddings | Embeddings table storage dominates; vector search latency grows | Already handled by existing `vectorSearchService`. Not a dashboard concern. |

**First bottleneck expected:** The current `OverviewView` calls `loadPage()` (pageSize 20), so stats are computed over only 20 entries until user scrolls timeline. **This is a latent bug for v1.1 dashboard** — `totalEntries` on StatCard will show "20" even if the user has 500 entries.

**Fix (within v1.1 scope, Wave 1 task 3):** Add `getEntryStats(): { total: number; totalWords: number }` to `src/lib/dbQueries.ts` (new file). Dashboard calls this on mount instead of deriving from `allEntries.length`. Keep `RecentEntriesFeed` using `allEntries.slice(0,3)` (accurate for "most recently loaded").

---

## Confidence Assessment

| Area | Level | Basis |
|------|-------|-------|
| Existing architecture (v1.0) | HIGH | Read directly from source files |
| Tag color status (already implemented) | HIGH | Schema + store + component all verified in source |
| Dashboard widget integration strategy | HIGH | Existing `OverviewView` already demonstrates the pattern |
| Auto-tagging on-demand vs. on-save | HIGH | Existing embedding pipeline is the fire-and-forget precedent; UX-visible content needs confirmation |
| Onboarding overlay placement | HIGH | App.tsx gate structure is explicit |
| Animation system CSS-first | HIGH | No motion library installed; existing patterns are all CSS |
| "Pagination-count bug" on dashboard totals | HIGH | Read directly from `OverviewView.tsx:74-76` + `entryStore.loadPage` pageSize 20 |
| Whether to replace or keep existing `MoodOverview.tsx` | MEDIUM | Depends on whether product wants a 30-day constellation AND a time-series, or one of the two |
| Optimal shape of writing prompts (static vs. LLM) | MEDIUM | Static is the low-risk default; LLM is valuable if prompts feel repetitive. Ship static first. |

---

## Sources

- `src/App.tsx` (state machine, render gates)
- `src/lib/db.ts` (schema, migration pattern, `tags.color` column)
- `src/stores/entryStore.ts` (allEntries, saveContent, embedding trigger)
- `src/stores/tagStore.ts` (TAG_COLORS, updateTagColor)
- `src/stores/aiStore.ts` (hybrid backend state)
- `src/stores/uiStore.ts` (tri-state PIN pattern — reused for onboarding)
- `src/stores/viewStore.ts` (activeView router)
- `src/lib/hybridAIService.ts` (routing between embedded llama.cpp and Ollama)
- `src/lib/ollamaService.ts` (reference only — do not call directly from new code)
- `src/utils/embeddingService.ts` (fire-and-forget pattern for AI background work)
- `src/components/OverviewView.tsx` (existing dashboard scaffolding, useMemo derivations)
- `src/components/OnThisDay.tsx` (reusable OTD query)
- `src/components/TagPill.tsx` (existing color picker popover)
- `src/components/TagRow.tsx` (injection point for TagSuggestButton)
- `src/components/EntryEditor.tsx` (save flow — why we do NOT hook tagging here)
- `src/components/PinSetupScreen.tsx` (existing first-run surface — onboarding slots after it)
- `src/components/JournalView.tsx` (activeView router — onboarding must NOT live here)
- `src/components/Sidebar.tsx` (nav targets — onboarding spotlight reference)
- `src/components/StatCard.tsx`, `QuickWriteFAB.tsx`, `MoodOverview.tsx`, `QuickActions.tsx` (existing widget patterns)
- `package.json` (dependency audit — no framer-motion, `tailwindcss-animate` available)
- `.planning/PROJECT.md`, `.planning/STATE.md` (milestone scope, carried decisions)

---
*Architecture research for: Chronicle AI v1.1 Daily Driver integration*
*Researched: 2026-04-16*
