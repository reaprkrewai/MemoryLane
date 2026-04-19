---
phase: 11
slug: microinteractions-tag-management
status: ready
gathered: 2026-04-19
mode: auto-discretion (autonomous run, no grey-area blockers)
---

# Phase 11: Microinteractions & Tag Management - Context

**Gathered:** 2026-04-19
**Status:** Ready for planning
**Mode:** Claude's Discretion (autonomous `/gsd-autonomous --from 10` run — all durations, easings, and palette values are derivable from ROADMAP success criteria + Phase 7 animations.css + UI-SPEC conventions; no user-blocking grey areas identified)

<domain>
## Phase Boundary

Phase 11 delivers two user-visible payloads on top of the Phase 7 primitives:

**(A) Microinteractions — every click, mount, and transition feels deliberate**
- Dashboard widgets stagger-in on Overview mount (50ms-per-card delay)
- TagPill pop-in on add (0.8→1.0 scale) and scale-out on remove (1.0→0.8 + fade)
- Dialogs, Popovers, and AlertDialogs fade + scale (0.95→1.0) on open, reverse on close
- MoodSelector buttons provide tactile spring (1.0→0.9→1.0) on click
- View transitions between Overview/Timeline/Calendar/Search use 150ms crossfade
- **All animations honor `@media (prefers-reduced-motion: reduce)`** via the existing Phase 7 `animations.css` stanza — no per-component reduce-motion checks needed

**(B) Tag Management — dedicated Settings surface for tag housekeeping**
- Expand TAG_COLORS from 8 ad-hoc hex values to exactly **12 dual-tone tokens** (each token: `{id, label, base, bg, text}`), WCAG AA-verified in both light and dark themes
- TagPill color picker + the future Tag Management view both render swatches via the shared `ColorGrid` primitive (Phase 7 TAGUX-01) — no duplicate grid implementations
- New Settings → Tag Management view: lists all tags with color swatch, usage count, last-used date; sortable by usage or recency; rename / recolor / delete (delete disabled when usage_count > 0)
- Rename propagates atomically to every entry that references the tag; color change reflects instantly in TagPill, autocomplete, and timeline

</domain>

<decisions>
## Implementation Decisions

### Microinteraction Timings (D-01 — derived from ROADMAP success criteria #1)

- **D-01a — Dashboard stagger-in**: 50ms-per-card delay; 6 cards max → 300ms total stagger; base fade-in `animate-fade-in` (already in animations.css, 200ms default). Implement via CSS custom property `--stagger-delay: calc(var(--stagger-index) * 50ms)` + inline `style={{"--stagger-index": i}}` on each card.
- **D-01b — TagPill pop-in**: 150ms scale from 0.8 → 1.0 with ease-out. New keyframe `@keyframes tag-pop-in` added to `animations.css`. Triggered only on new-tag mount via React's existing state (first render after add).
- **D-01c — TagPill scale-out**: 120ms scale from 1.0 → 0.8 + opacity 1.0 → 0.0 with ease-in. New keyframe `@keyframes tag-pop-out`. Requires deferred removal — wrap the remove click in a 120ms timeout before calling `tagStore.removeTagFromEntry`, or use `onAnimationEnd` to trigger state removal.
- **D-01d — Dialog/Popover/AlertDialog scale-in**: 150ms opacity 0→1 + scale 0.95→1.0 with ease-out. Radix primitives support `data-[state=open]:animate-in` Tailwind classes already; add them to the project's Popover/AlertDialog wrapper components.
- **D-01e — MoodSelector spring**: 120ms scale 1.0 → 0.9 → 1.0 via cubic-bezier(0.34, 1.56, 0.64, 1) approximation. Use a two-keyframe animation `@keyframes mood-spring` — 50% at scale 0.9, 100% at 1.0. Triggered via `active:` Tailwind variant or transient state.
- **D-01f — View crossfade**: 150ms opacity 1→0 on outgoing view, 0→1 on incoming. Implement in `JournalView` (or wherever the view switch happens) — render outgoing for 150ms with `animate-fade-out`, then swap.
- **D-01g — Reduced motion**: NONE of the above require bespoke reduce-motion handling. The global `@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; } }` stanza from Phase 7 already disables them. Verify by running the app with OS "Reduce motion" enabled.

### Tag Color Palette (D-02 — 12 dual-tone WCAG AA-verified tokens)

Replace the existing `TAG_COLORS` array (8 hex strings) in `src/stores/tagStore.ts` with a new 12-token structured array. Each token defines three derived colors:

| Token  | Label  | Base (hex) | BG (AA vs text) | Text (AA vs BG) |
|--------|--------|------------|------------------|------------------|
| red    | Red    | #DC2626    | #FEE2E2 / #450A0A | #991B1B / #FECACA |
| orange | Orange | #EA580C    | #FFEDD5 / #431407 | #9A3412 / #FED7AA |
| amber  | Amber  | #D97706    | #FEF3C7 / #451A03 | #92400E / #FDE68A |
| yellow | Yellow | #CA8A04    | #FEF9C3 / #422006 | #854D0E / #FEF08A |
| green  | Green  | #16A34A    | #DCFCE7 / #14532D | #166534 / #BBF7D0 |
| teal   | Teal   | #0D9488    | #CCFBF1 / #134E4A | #115E59 / #99F6E4 |
| cyan   | Cyan   | #0891B2    | #CFFAFE / #164E63 | #155E75 / #A5F3FC |
| blue   | Blue   | #2563EB    | #DBEAFE / #1E3A8A | #1E40AF / #BFDBFE |
| violet | Violet | #7C3AED    | #EDE9FE / #2E1065 | #5B21B6 / #DDD6FE |
| pink   | Pink   | #DB2777    | #FCE7F3 / #500724 | #9F1239 / #FBCFE8 |
| rose   | Rose   | #E11D48    | #FFE4E6 / #4C0519 | #9F1239 / #FECDD3 |
| slate  | Slate  | #475569    | #F1F5F9 / #020617 | #334155 / #CBD5E1 |

BG / Text columns are `{light mode} / {dark mode}`. Each BG/text pair verified WCAG AA (≥4.5:1) in both themes — use axe-core or a manual contrast-checker during implementation.

TagPill background/border currently derived on-the-fly from `base` via `color-mix`. Phase 11 keeps this behavior — the dual-tone tokens are authoritative for Tag Management preview swatches; TagPill's runtime `color-mix` continues to match visually within the accent-agnostic design system.

Migration: existing entries reference tags by UUID; tag `color` column stores a hex string. When the palette expands, existing tags keep their current hex (which may or may not match a new token). Add a one-time SQLite migration that maps old TAG_COLORS[i] → nearest new token's `base` for backwards compatibility. New tags auto-pick from the new 12-color rotation.

### Tag Management View (D-03 — Settings sub-nav, not a top-level view)

- **Location**: Settings → Tag Management (new sub-section inside existing `SettingsView.tsx`, rendered as a collapsible `<Section>` matching the existing "Data Export" / "Help" pattern). NOT a new top-level view — Overview/Timeline/Calendar/Search remain the 4 primary views.
- **Columns**: color swatch (24×24 rounded-full), tag name, usage count, last-used date (`formatDistanceToNow`), actions (rename, delete).
- **Sort**: controlled `<select>` above the table — options: "Most used" (default), "Recently used", "Alphabetical".
- **Empty state**: when `tags.length === 0`, show inline message "No tags yet — add tags from any entry."
- **Rename**: inline edit on tag name cell via double-click or edit button; confirm with Enter, cancel with Escape. Rename mutates `tags.name` in SQLite — no cascade needed since junction table uses `tag_id`.
- **Recolor**: clicking the swatch opens a Popover containing `<ColorGrid colors={TAG_COLORS} ... cols={6} />` (6-col grid for 12 tokens = 2 rows).
- **Delete**: button disabled when `usage_count > 0`; tooltip reads "Tag is in use by N entries — remove from entries before deleting." When enabled, clicking opens an AlertDialog confirmation with copy "Delete tag `{name}`? This cannot be undone." Uses destructive accent color (red).

### TagPill Refactor for 12-color Palette (D-04)

- TagPill.tsx's Popover currently renders `ColorGrid` with `colors={[...TAG_COLORS]}` and `cols={5}`. Update to `cols={6}` so 12 colors render as 2 rows of 6. Change the grid gap to match (already `gap-1.5` in ColorGrid — verify visual rhythm).
- No behavior changes — only data change + column count.

### Reduced Motion Audit (D-05)

- Phase 7 `animations.css` already contains `@media (prefers-reduced-motion: reduce) { ... }` — verify it wraps ALL new keyframes added in Phase 11 (`tag-pop-in`, `tag-pop-out`, `mood-spring`). The blanket `*, *::before, *::after { animation-duration: 0.01ms !important; }` rule handles them automatically.
- Verify by running the Tauri app with OS "Reduce motion" enabled and watching dashboard stagger / tag pop / mood spring become instant.

### Animation Library Choice (D-06 — locked: CSS only, no Framer Motion / motion / react-spring)

CONTEXT cross-check: Phase 11 ROADMAP constraint is "zero new runtime dependencies preferred." All animations in Phase 11 use CSS keyframes + Tailwind utility classes + `animations.css` tokens. No `motion@12.x` / `framer-motion` / `react-spring` additions. Refer to STATE.md entry: "`motion@12.x` trigger — default NO; re-evaluate at Phase 11 kickoff."

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets (from Phase 7 + v1.0)
- `src/styles/animations.css` — existing keyframes (`fade-in`, `slide-up`, `pop-in`, `stagger-in`) + global `@media (prefers-reduced-motion: reduce)` stanza. Phase 11 adds `tag-pop-in`, `tag-pop-out`, `mood-spring`, `scale-in` keyframes here.
- `src/components/ui/ColorGrid.tsx` — Phase 7 TAGUX-01 primitive. Accepts `colors`, `selected`, `onSelect`, `cols`, `ariaLabel`. Phase 11 reuses this for both TagPill (cols=6) and Tag Management recolor Popover (cols=6).
- `src/stores/tagStore.ts` — already exports `createTag`, `deleteTag`, `updateTagColor`, `addTagToEntry`, `removeTagFromEntry`, `loadTags`. Tag Management view consumes these directly; no new store actions required.
- `src/lib/db.ts` — SQLite schema migration pattern established in v1.0 (PRAGMA-guarded ALTER + separate `db.execute()` for triggers/indexes). Phase 11 migration: backfill tag colors to new palette tokens.
- `src/components/SettingsView.tsx` — existing pattern for collapsible sections (Data Export, AI Features, Help). Tag Management adopts same layout.
- `src/components/TagPill.tsx` — Phase 7 refactored to use ColorGrid. Phase 11 change is 1 line: `cols={5}` → `cols={6}`.

### Established Patterns
- **Migration ordering**: any index/trigger/view referencing a column added by a PRAGMA-guarded ALTER MUST run AFTER that guarded block as a standalone `db.execute()` — NEVER inside MIGRATION_SQL (established 01-03 UAT-01 fix).
- **Reduced-motion gating**: a single global `*, *::before, *::after { animation-duration: 0.01ms !important; }` stanza in animations.css handles ALL animations; no per-component `useReducedMotion` hook needed.
- **Settings sections**: rendered as collapsible blocks inside SettingsView with SettingRow children — do NOT create a dedicated route.
- **Confirmation dialogs**: use the existing `shadcn/ui AlertDialog` primitive (already in use for Delete Entry) — do NOT roll custom modals.

### Integration Points
- **TAG_COLORS replacement**: `src/stores/tagStore.ts` line 4 — the array literal is the single source of truth. All consumers (`createTag`, TagPill, ColorGrid) import from here.
- **TagPill cols update**: `src/components/TagPill.tsx` line 66 — one-prop change (`cols={5}` → `cols={6}`).
- **Tag Management insertion**: new `<TagManagementSection />` component imported into `SettingsView.tsx` alongside existing sections.
- **Migration**: new migration in `src/lib/db.ts` — PRAGMA-guarded check for tag color normalization, backfill to nearest new palette token via SQL CASE expression or JS-computed mapping.
- **Crossfade**: `JournalView` (or the view switch location — typically `AppShell` or a top-level router) wraps view content in a keyed container with CSS transition on opacity.

</code_context>

<specifics>
## Specific Ideas

- **Pop-in delay only on first mount**: TagPill's `animate-[tag-pop-in]` class must apply only when the pill is newly added, not on every re-render. Use React's existing TagRow state (array-index stability via React keys) — new pills get the animation on their first mount because the keyframe runs exactly once per element lifecycle.
- **Stagger-in via CSS custom property**: use `style={{ "--stagger-index": i }}` + `animation-delay: calc(var(--stagger-index, 0) * 50ms)` inside the keyframe — avoids JS timing, respects reduced-motion via the global stanza.
- **Tag Management access from TagPill Popover**: optional nice-to-have — add a "Manage tags..." link at the bottom of TagPill's ColorGrid Popover that opens Settings → Tag Management. Deferred to polish pass; not a must-have.

</specifics>

<deferred>
## Deferred Ideas

- **Custom user-added palette colors** — users can only pick from the 12 presets; custom hex entry is out of scope (future milestone).
- **Drag-to-reorder tags** — Tag Management view lists tags sortable by usage/recency/alphabetical only; no manual reordering.
- **Tag groups / hierarchies / parent-child tags** — explicitly out of scope.
- **Bulk rename / bulk recolor / merge-tags operations** — Tag Management handles one tag at a time; bulk UX deferred.
- **Animation performance profiling / will-change hints** — only add if a user reports jank; premature optimization otherwise.
- **"Manage tags..." link inside TagPill Popover** — nice-to-have polish, not required by any ANIM/TAGUX requirement.

</deferred>

---

*Phase: 11-microinteractions-tag-management*
*Context gathered: 2026-04-19 via autonomous Claude's Discretion (run `/gsd-autonomous --from 10`)*
