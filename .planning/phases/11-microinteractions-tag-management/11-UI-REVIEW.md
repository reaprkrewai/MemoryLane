# Phase 11 — UI Review

**Audited:** 2026-04-19
**Baseline:** 11-UI-SPEC.md (approved)
**Screenshots:** Not captured (no dev server on ports 3000/5173/8080)

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 4/4 | All spec-locked strings match exactly; aria-labels correct; error toast copy matches |
| 2. Visuals | 3/4 | All animations implemented; `animate-tag-pop-in` applies on every render (not just mount) — minor concern |
| 3. Color | 4/4 | 12-token TAG_COLORS exact match; accent correctly reserved; destructive pattern correct |
| 4. Typography | 3/4 | `font-medium` (500) used in TagPill and OverviewView button — third weight outside declared 400/600 pair |
| 5. Spacing | 4/4 | All spacing values match spec scale; `py-3` exception documented and correctly applied |
| 6. Experience Design | 4/4 | Rename/delete state machines implemented fully; error toasts on failure; empty state; tooltip on disabled delete |

**Overall: 22/24**

---

## Top 3 Priority Fixes

1. **`animate-tag-pop-in` is not mount-only** — The pop-in animation class is applied whenever `isRemoving === false`. Because React's CSS animation plays once per class-string change, if a parent re-renders and the class string is unchanged the animation does not re-fire. However if the component unmounts and remounts (e.g. during a sort re-order or list refresh), the animation will incorrectly replay for existing tags. Fix: add a `hasMounted` ref to TagPill (`const hasPlayed = useRef(false)`) and on first render set it to true; apply `animate-tag-pop-in` only when `!hasPlayed.current` and remove it from the class string after mount completes. — `src/components/TagPill.tsx` line 38

2. **`font-medium` (weight 500) used in two Phase 11 touch-points** — The spec declares only weights 400 (normal) and 600 (semibold) for this phase. TagPill applies `font-medium` (line 38) on the pill wrapper, and OverviewView applies it to the "New Entry" button (line 88). Neither are in the declared type scale. The closest correct weight for UI elements that need emphasis below semibold is 600. For pill text, `font-normal` (400) matches the tag name cell weight in Tag Management. Replace: TagPill line 38 `font-medium` → `font-normal`; OverviewView line 88 `font-medium` → `font-semibold` (or remove if button inherits). — `src/components/TagPill.tsx:38`, `src/components/OverviewView.tsx:88`

3. **Inline rename input missing focus ring per spec** — The spec under Color lists the rename input focus style as `focus:border-accent/60 focus:outline-none focus:ring-1 focus:ring-accent/30`, but the implementation at line 262 only has `border-b border-accent/60 focus:outline-none focus:ring-0`. The `focus:ring-0` actively suppresses the ring the spec requires. Users tabbing into the rename input will see the border underline but no surrounding ring glow. Fix: replace `focus:ring-0` with `focus:ring-1 focus:ring-accent/30` to match spec. — `src/components/settings/TagManagementSection.tsx:262`

---

## Detailed Findings

### Pillar 1: Copywriting (4/4)

All copywriting contract strings match specification exactly:

- Sort options: "Most used" / "Recently used" / "Alphabetical" — confirmed lines 127-129
- Usage singular/plural: `{N} entry` / `{N} entries` via `usageWord` — confirmed line 216
- Last-used never: `"Never"` — confirmed line 285
- Tag count display: `{N} tag` / `{N} tags` — confirmed lines 119-120
- Empty state: `"No tags yet — add tags from any entry."` — exact match line 136
- Delete confirmation title: `Delete tag "{deleteTarget?.name}"?` — confirmed line 168 (uses JSX curly quotes around dynamic value, matching spec intent)
- Delete confirmation description: `"This cannot be undone."` — confirmed line 171
- AlertDialogCancel: `"Cancel"` — confirmed line 175
- AlertDialogAction: `"Delete tag"` — confirmed line 180
- Disabled delete aria-label: `Delete tag ${name} — tag is in use` — confirmed line 308
- Enabled delete aria-label: `Delete tag ${name}` — confirmed line 325
- Rename button aria-label: `Rename tag ${name}` — confirmed lines 263, 295
- Recolor swatch aria-label: `Change color for tag ${name}` — confirmed line 238
- ColorGrid aria-label: `Color for tag ${name}` — confirmed line 246
- Tooltip disabled delete: `Tag is in use by {N} {entry/entries} — remove from entries before deleting` — confirmed lines 316-317
- Rename error toast: `A tag named "${trimmed}" already exists` — confirmed line 93
- Delete error toast: `"Failed to delete tag"` — confirmed line 109

No generic labels ("Submit", "OK", "Save") found. All strings are context-specific. Score: 4/4.

---

### Pillar 2: Visuals (3/4)

**ANIM-01 — Dashboard stagger-in:** Implemented correctly. `stagger-children` parent class applied at OverviewView line 106. Four stat cards use `style={{ "--i": N }}` with indices 0–3 and `animate-fade-in` class. The `animations.css` `.stagger-children > *` rule applies `animation-delay: calc(var(--i, 0) * 50ms)`. Matches spec D-01a. 50ms per card, max 150ms delay (4 cards). Correct.

**ANIM-02 — TagPill pop-in/pop-out:** The mutual-exclusion of `animate-tag-pop-in` / `animate-tag-pop-out` (CR-01 fix) is implemented. `isRemoving` starts `false`, so `animate-tag-pop-in` fires on mount. `handleRemove` sets `isRemoving=true`, switching to `animate-tag-pop-out`, then calls `onRemove` after 120ms. The pattern is functionally correct for single-use scenarios. However, because the class `animate-tag-pop-in` is permanently in the string when `isRemoving === false`, the animation will replay on any component remount (e.g. if the parent list re-renders and forces React to unmount/remount a TagPill). This is a minor correctness gap — priority fix #1. Deferred-removal timing (120ms) matches the `tag-pop-out` token. Both keyframes defined in `animations.css` and `tailwind.config.js` with correct timing and easing.

**ANIM-03 — AlertDialog/Popover scale-in:** Both components carry built-in Radix `data-[state=open]:zoom-in-95 data-[state=open]:fade-in-0` classes per spec analysis. No additional code was needed, and no changes were made. Compliant.

**ANIM-04 — MoodSelector spring:** `springing` state per-button implemented (line 24). `handleClick` sets `setSpringing(value)`, calls `setTimeout(() => setSpringing(null), 120)`. Class `animate-mood-spring` applied via Tailwind token (not inline string, but both resolve to same `mood-spring 120ms cubic-bezier(0.34, 1.56, 0.64, 1) both`). Correct.

**ANIM-05 — View crossfade:** JournalView implements `fading`/`displayedView` state pair. On `activeView` change: `setFading(true)` → `setTimeout(150ms)` → `setDisplayedView(activeView)` + `setFading(false)`. During fade: outgoing view renders with `animate-fade-out`; incoming view renders with `animate-fade-in`. `key={viewToRender}` on wrapper ensures React mounts fresh on view switch. `fade-out` token defined as `fade-out var(--motion-fast) var(--ease-out-smooth) both` where `--motion-fast = 150ms`. Matches spec. Note: the Timeline view is a fallback (`!isKnownView`) — the crossfade still works for "timeline" because `activeView === "timeline"` triggers the `useEffect`, sets fading, then `setDisplayedView("timeline")` which hits the `!isKnownView` branch correctly.

**ANIM-06 — Reduced motion:** `animations.css` global stanza exists from Phase 7 and covers all new keyframes automatically. No per-component hooks needed. Compliant.

Overall visual implementation is high quality. Single deduction for the pop-in mount guard gap.

---

### Pillar 3: Color (4/4)

**TAG_COLORS palette:** Exactly 12 tokens present in `src/stores/tagStore.ts` lines 4-17. All token shapes (`id`, `label`, `base`, `bg_light`, `bg_dark`, `text_light`, `text_dark`) match spec. All 12 base hex values verified to match CONTEXT.md D-02 table exactly. No deviations.

**Accent usage — reserved elements:**
- Section header icon: `text-accent` on `<span>` wrapper — TagManagementSection line 41. Correct.
- Section header icon background: `bg-accent/10` — line 40. Correct.
- Sort select focus ring: `focus-visible:ring-2 focus-visible:ring-accent` — line 124. Matches spec.
- Swatch button focus ring: `focus-visible:ring-2 focus-visible:ring-accent` — line 236. Matches spec.
- Rename input border: `border-b border-accent/60` — line 262. Matches spec.
- Rename button hover: `hover:text-accent hover:bg-surface` — line 294. Matches spec.
- MoodSelector selected state: `bg-accent/20` and `text-accent` — MoodSelector lines 49, 61. Previously established pattern.

**Destructive usage:**
- Delete button enabled: `text-destructive hover:bg-destructive/10` — line 324. Matches spec.
- Delete button disabled: `text-destructive opacity-40 cursor-not-allowed` — line 307. Matches spec.
- AlertDialogAction: `buttonVariants({ variant: "destructive" })` — line 177. Matches spec.

No hardcoded hex colors in phase components. TagPill uses `color-mix(in srgb, ${tag.color} 12%, transparent)` for background and `color-mix(in srgb, ${tag.color} 35%, transparent)` for border — runtime-derived, not spec-deviant. No overuse of accent. Score: 4/4.

---

### Pillar 4: Typography (3/4)

**Declared weights (spec): 400 (normal) and 600 (semibold) only.**

Found in phase-touched files:
- `font-normal` — OverviewView heading (`font-normal` on `text-[52px]` display element). Expected.
- `font-bold` — SectionHeader `h2` (`text-sm font-bold uppercase tracking-wider`) in both `TagManagementSection.tsx:43` and `SettingsView.tsx:53`. This resolves to 700. The spec says SectionHeader uses `font-bold` per the "matching existing SectionHeader pattern" — this is a carry-over from existing sections, not a Phase 11 addition.
- `font-medium` — **TagPill.tsx line 38** (tag pill wrapper text) and **OverviewView.tsx line 88** (New Entry button). Weight 500 is outside the declared 400/600 pair.

**Font sizes used:**
- `text-xs` (12px) — usage counts, last-used dates, section tag count display. All within label role. Correct.
- `text-sm` (14px) — tag name, sort select, rename input, empty state, SettingsView page subtitle. Correct body/label usage.
- `text-2xl` (24px) — SettingsView page `h1`. Pre-existing, not Phase 11.

The `text-[52px]` in OverviewView is an explicit override on the display heading — not a new undeclared size, it's the display element. Pre-existing.

`font-medium` on TagPill and OverviewView button are the only out-of-spec weights introduced or touched in Phase 11. `font-bold` in SectionHeader is a pre-Phase-11 pattern the spec explicitly endorsed ("matching existing SectionHeader pattern").

Deduction: 1 point for `font-medium` in two Phase 11 touch-points.

---

### Pillar 5: Spacing (4/4)

Spacing values in `TagManagementSection.tsx`:
- `mb-4` (16px) — gap below sort control. Matches spec `mb-4`.
- `px-4 py-3` (16px / 12px) — tag row. Spec locked these values; `py-3` exception documented.
- `px-2 py-1` (8px / 4px) — sort select. Standard.
- `p-3` (12px) — PopoverContent padding. Standard.
- `gap-4` (16px) — row items. Standard.
- `gap-3` (12px) — SectionHeader icon-label gap. Standard.
- `gap-2` (8px) — actions column buttons. Standard.
- `py-8` (32px) — empty state padding. Standard.
- `w-16` (64px) — usage column width.
- `w-24` (96px) — last-used and actions columns. Match spec.
- `h-6 w-6` (24px) — swatch. Match spec.
- `h-7 w-7` (28px) — action icon buttons. Standard.

Arbitrary values in phase files:
- `TagManagementSection.tsx:262` — `max-w-[180px]` on rename input and name span. These are explicit layout constraints from the spec (spec says `max-w-[180px]`). Not a deviation.
- `OverviewView.tsx` — `max-w-[1200px]`, `text-[52px]`, `tracking-[-0.02em]` are pre-existing display values untouched by Phase 11.

All horizontal spacing values (`px-4`, `px-2`) are standard. The `py-3` deliberate exception is documented in spec. No unintended arbitrary spacing values found. Score: 4/4.

---

### Pillar 6: Experience Design (4/4)

**Rename state machine (READ → EDITING → COMMITTING):**
- Double-click on name span triggers `onStartRename` — line 268
- Pencil icon click triggers `onStartRename` (guarded: `if (!isEditing)`) — line 293
- Enter key commits via `onCommitRename(draftName)` — line 221
- Escape key reverts `draftName` to `tag.name` and calls `onCancelRename` — lines 223-225
- Blur commits — line 260
- Empty name or unchanged name silently exits editing — lines 83-85
- Duplicate name: toast.error and editing state preserved (input stays open) — lines 89-93

**Delete state machine (IDLE → CONFIRM_OPEN → DELETING):**
- Delete button disabled when `usage_count > 0` with `disabled` attribute + `opacity-40 cursor-not-allowed` — lines 304-310
- Tooltip on disabled delete with correct `TooltipProvider` wrapping — lines 300-319
- Wrapper `<span>` around disabled button to preserve pointer events for tooltip — line 302
- AlertDialog open on delete click — line 161
- AlertDialogCancel closes dialog — line 175
- AlertDialogAction fires `confirmDelete()` — lines 177-182
- `confirmDelete` clears `deleteTarget` before async to prevent double-fire — lines 103-110
- Error toast on delete failure — line 109

**Recolor state machine (CLOSED → OPEN → CLOSED):**
- Swatch click opens Popover — via `onOpenChange` callback line 232
- ColorGrid selection fires `onRecolor` and closes (`setRecolorId(null)`) — lines 97-100
- Click outside / Escape closes via Radix's built-in behavior

**Error handling:** Both rename failure (SQLite UNIQUE) and delete failure have `try/catch` with `toast.error`. No unhandled promise rejections.

**Empty state:** Rendered when `sorted.length === 0` with correct copy. Note: `sorted` filters from `tags` — if `tags` is loading, an empty array would show the empty state prematurely. However, `loadTags` is called in `OverviewView.useEffect` — the tags array is populated before Settings is typically visited. No explicit loading state in TagManagementSection, but absence is consistent with all other SettingsView sections. Not a Phase 11 regression.

Score: 4/4.

---

## Registry Safety

No third-party registries in Phase 11 per UI-SPEC.md Registry Safety table. All new components use Tailwind utilities + existing Radix primitives (AlertDialog, Popover, Tooltip) + lucide-react. No new `npx shadcn add` installs. Registry audit: 0 third-party blocks, not applicable.

---

## Files Audited

- `src/components/TagPill.tsx`
- `src/components/MoodSelector.tsx`
- `src/components/OverviewView.tsx`
- `src/components/JournalView.tsx`
- `src/components/SettingsView.tsx`
- `src/components/settings/TagManagementSection.tsx`
- `src/styles/animations.css`
- `tailwind.config.js`
- `src/stores/tagStore.ts`
- `.planning/phases/11-microinteractions-tag-management/11-UI-SPEC.md`
- `.planning/phases/11-microinteractions-tag-management/11-CONTEXT.md`
