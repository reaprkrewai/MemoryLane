---
phase: 07-foundation-derived-state
plan: 05
subsystem: ui
tags: [react, accessibility, aria, radio-group, tailwind, shadcn-ui, lucide-react]

# Dependency graph
requires:
  - phase: 02-editor-tags
    provides: TAG_COLORS palette + TagPill Popover-based color picker (v1.0 visual contract being preserved)
provides:
  - Reusable accessible ColorGrid primitive (palette-agnostic, ARIA radio-group, arrow-key nav, focus-visible rings)
  - TagPill refactored as first real-world consumer of ColorGrid (validates API surface)
affects: [11-microinteractions-tag-management]

# Tech tracking
tech-stack:
  added: []  # Zero new deps - reused lucide-react Check, React useRef
  patterns:
    - "ARIA radio-group with roving tabIndex for grid-of-buttons selection"
    - "Palette-agnostic UI primitive — consumer supplies colors[] (D-21)"
    - "Spread `[...TAG_COLORS]` to convert `as const` readonly tuple to plain string[] without cast"

key-files:
  created:
    - src/components/ui/ColorGrid.tsx
  modified:
    - src/components/TagPill.tsx

key-decisions:
  - "ColorGrid is palette-agnostic — consumer passes colors[] (D-21). TagPill passes TAG_COLORS today; Phase 11 Tag Management will pass the 12-color dual-tone palette without modifying ColorGrid."
  - "Roving tabIndex pattern: selected swatch is the single tab-stop (or first swatch when no selection). Other swatches reached via arrow keys. Single tab-stop into the group, single tab-stop out — matches WAI-ARIA radio-group authoring guidance (D-24)."
  - "ArrowLeft/Right wrap at row edges; ArrowUp/Down clamp at first/last (idiomatic 2D-grid radio-group keyboard model)."
  - "No useEffect for initial focus — Radix PopoverContent owns autofocus contract; managing initial focus inside ColorGrid would conflict with portal/Popover internals."
  - "TAG_COLORS export stays in src/stores/tagStore.ts — D-25 defers the move to src/lib/tagColors.ts to Phase 11 (paired with the dual-tone palette restructure)."
  - "Spread [...TAG_COLORS] (not `as string[]` cast) to satisfy ColorGridProps colors: string[] — preserves type safety without lying to the type checker about mutability."

patterns-established:
  - "Pattern: ARIA radio-group as the keyboard model for grid-of-buttons selection primitives — extensible to future Phase 11 Tag Management swatch grid and any other palette/option grid surface"
  - "Pattern: Palette-agnostic UI primitives accept colors via props — keep visual primitives generic, let stores/lib own palette data"
  - "Pattern: Pure refactor verification via byte-level diff — only the targeted region changed (imports + PopoverContent body); trigger pill JSX byte-identical to v1.0"

requirements-completed: [TAGUX-01]

# Metrics
duration: 2min 14s
completed: 2026-04-17
---

# Phase 07 Plan 05: ColorGrid Primitive + TagPill Refactor Summary

**Accessible ColorGrid primitive (ARIA radio-group + arrow-key nav + focus-visible rings) with TagPill refactored as the first real-world consumer, pixel-identical to v1.0**

## Performance

- **Duration:** 2 min 14s
- **Started:** 2026-04-17T12:38:58Z
- **Completed:** 2026-04-17T12:41:12Z
- **Tasks:** 2
- **Files modified:** 2 (1 created, 1 refactored)

## Accomplishments

- Shipped `src/components/ui/ColorGrid.tsx` (92 lines) — first reusable UI primitive in `src/components/ui/` outside the shadcn-vendored set, fully accessible with ARIA radio-group semantics, roving tabIndex, arrow-key navigation (Left/Right wrap, Up/Down clamp), Enter/Space selection, and `focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2` (roadmap SC#5).
- Refactored `src/components/TagPill.tsx` to consume ColorGrid as a single child of `PopoverContent`. Visual output pixel-identical to v1.0 (5-column grid of 24×24px swatches, `Check` icon size 14 in white at strokeWidth 3 when selected, `hover:scale-110` lift). Trigger pill JSX byte-identical to v1.0 — the only changes are the import block and the PopoverContent body region.
- Pre-implemented TAGUX-01 (ColorGrid primitive). The 12-color dual-tone palette and the Tag Management view that consumes it stay deferred to Phase 11 per D-22 / D-25.
- API validated under a real consumer (TagPill) inside Phase 7 — Phase 11 inherits the primitive with one round of integration friction already absorbed, so adding the second consumer (Tag Management) becomes pure additive work.
- Build (`npm run build`) passes cleanly after both tasks. No TypeScript errors on `colors={[...TAG_COLORS]}` spread (readonly tuple → plain `string[]`).

## Task Commits

Each task was committed atomically:

1. **Task 1: Create src/components/ui/ColorGrid.tsx with accessible swatch grid + ARIA radio-group keyboard model** — `16800d9` (feat)
2. **Task 2: Refactor TagPill.tsx to consume ColorGrid (pure refactor, pixel-identical visual output)** — `8af21d3` (refactor)

## Files Created/Modified

- `src/components/ui/ColorGrid.tsx` (created, 92 lines) — Reusable accessible color-swatch grid primitive. Exports `ColorGrid({ colors, selected, onSelect, ariaLabel, cols = 5 })`. Container `<div role="radiogroup">` with consumer-supplied `aria-label`; per-swatch `<button role="radio" aria-checked={isSelected} tabIndex={isTabStop ? 0 : -1}>` with the v1.0 visual classes (`h-6 w-6 rounded-md transition-transform hover:scale-110`) plus the new focus-visible ring. Arrow-key handler in `handleKeyDown` covers Left/Right (wrap), Up/Down (clamp by `cols`), Enter/Space (select). No `forwardRef`, no `cn()`, no `useEffect` — leaf primitive with a static className list and Radix Popover owning autofocus.
- `src/components/TagPill.tsx` (modified, 71 lines, was 86) — Imports: dropped `Check` from `lucide-react` (now owned by ColorGrid) and added `import { ColorGrid } from "./ui/ColorGrid"`. PopoverContent body: replaced the inline `<div className="grid grid-cols-5 gap-2">` + `TAG_COLORS.map(...)` block (24 lines) with a single `<ColorGrid colors={[...TAG_COLORS]} selected={tag.color} onSelect={handleColorSelect} ariaLabel={\`Color for tag ${tag.name}\`} cols={5} />` (8 lines). Everything else — `useState` for popover open state, the trigger pill `<div role="button">` block, the X-remove button, `handleColorSelect` callback, `Popover`/`PopoverTrigger`/`PopoverContent` wrapper structure, the `TagPillProps` interface, `TAG_COLORS` import path — unchanged.

### TagPill.tsx imports diff (exact)

```diff
 import { useState } from "react";
-import { X, Check } from "lucide-react";
+import { X } from "lucide-react";
 import {
   Popover,
   PopoverTrigger,
   PopoverContent,
 } from "./ui/popover";
+import { ColorGrid } from "./ui/ColorGrid";
 import { TAG_COLORS } from "../stores/tagStore";
```

## Decisions Made

All decisions were pre-resolved by the planner in `07-CONTEXT.md` (D-21 through D-25) and faithfully implemented:

- **D-21 (palette-agnostic primitive):** ColorGrid accepts `colors: string[]` from the consumer rather than importing `TAG_COLORS` directly. Phase 11 Tag Management will pass a different (12-color) palette without touching ColorGrid.
- **D-22 (TagPill is the v1 consumer):** Refactored as a pure visual passthrough — no palette change, no behavior change, only a structural lift of the swatch loop into the primitive.
- **D-23 (focus-visible ring added on top of v1.0 visuals):** `focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2` added to each swatch button. Roadmap SC#5 satisfied without disturbing the default visual.
- **D-24 (ARIA radio-group keyboard model):** Container `role="radiogroup"`, per-button `role="radio"` + `aria-checked`, roving tabIndex, ArrowLeft/Right wrap, ArrowUp/Down clamp by `cols`, Enter/Space select.
- **D-25 (TAG_COLORS stays in stores/tagStore.ts):** No file movement in Phase 7. Phase 11 owns the relocation to `src/lib/tagColors.ts` paired with the dual-tone restructure.

Implementation choices left to discretion:

- **Spread vs cast for readonly→mutable tuple:** Chose `[...TAG_COLORS]` (idiomatic, type-honest) over `TAG_COLORS as string[]` (lying cast). Plan also specifically prescribed this.
- **No `useEffect` for initial focus:** Plan-prescribed but worth flagging — Radix PopoverContent owns autofocus via its internal `onOpenAutoFocus`. Adding a focus-stealing effect inside ColorGrid would conflict with the portal lifecycle. The `tabIndex={0}` on the selected swatch (or first swatch when unselected) is sufficient — Tab from outside the popover lands on it correctly without imperative focus management.

## Deviations from Plan

None — plan executed exactly as written. Both tasks completed without auto-fixes, blocking issues, or architectural questions.

## Visual Identity Verification (D-22 mandate)

Build-level verification (text/DOM): the rendered DOM under `<PopoverContent>` is functionally identical to v1.0:

- v1.0 produced `<div class="grid grid-cols-5 gap-2"><button class="relative flex h-6 w-6 ... transition-transform hover:scale-110" style="background-color:#EF4444">...</button> × 8</div>`.
- v1.1 (this plan) produces `<div role="radiogroup" aria-label="Color for tag {name}" class="grid gap-2" style="grid-template-columns: repeat(5, minmax(0, 1fr))"><button role="radio" aria-checked="..." tabindex="0|-1" class="relative flex h-6 w-6 ... transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2" style="background-color:#EF4444">...</button> × 8</div>`.

Visible deltas vs v1.0 (verified via diff inspection):

- **Grid columns:** v1.0 used Tailwind class `grid-cols-5`; v1.1 uses inline `grid-template-columns: repeat(5, minmax(0, 1fr))` to make `cols` prop-driven. Computed CSS produces the **identical 5-equal-column layout** with the same `gap-2` spacing.
- **Swatch positions:** All 8 swatches in `TAG_COLORS` order render at the same grid positions: row 1 has `#EF4444 #F97316 #EAB308 #22C55E #3B82F6` (5 cols filled), row 2 has `#8B5CF6 #EC4899 #6B7280` (3 cols filled, 2 empty cells). Identical to v1.0.
- **Selected check icon:** v1.1 selected swatch renders `<Check size={14} style={{ color: "#ffffff", strokeWidth: 3 }} />` — byte-identical to v1.0 (same import, same component, same props).
- **Hover lift:** `hover:scale-110` preserved on each swatch button. Identical to v1.0.

Invisible additions (accessibility upgrades that do not change the default visual):

- `role="radiogroup"` + `role="radio"` + `aria-checked` (DOM/AT only).
- `tabIndex` roving (no visual change in resting state).
- `focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2` (only renders during keyboard focus per `focus-visible` semantics — invisible to mouse users; matches Button.tsx focus precedent).
- Arrow-key keyboard handler (no-op for mouse users).

Conclusion: **Pure refactor confirmed.** Mouse-driven users see no change. Keyboard users gain focus-visible rings, single-tab-stop entry into the grid, and arrow-key navigation between swatches.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required. Pure UI primitive + refactor.

## Next Phase Readiness

- ColorGrid primitive ready for the second consumer in Phase 11 (Tag Management view, TAGUX-02..07). The API surface (`colors`, `selected`, `onSelect`, `ariaLabel`, `cols`) is locked and validated under a real consumer.
- TagPill behavior unchanged — no downstream consumer needs to update.
- Phase 11 inherits two reuses: (a) the same ColorGrid in the Tag Management list/grid view passing the 12-color dual-tone palette, (b) the established ARIA radio-group keyboard model that other future palette/option grid surfaces (e.g., theme picker, mood selector if reworked) can adopt without re-deriving the pattern.
- No blockers, no open questions for Phase 11.

## Self-Check: PASSED

Verified post-execution:

- `src/components/ui/ColorGrid.tsx` exists (92 lines, exceeds min 50).
- `src/components/TagPill.tsx` modified (71 lines, was 86).
- Commit `16800d9` (feat: ColorGrid) present in git log.
- Commit `8af21d3` (refactor: TagPill) present in git log.
- `npm run build` exits 0 after both commits.
- All `<truths>` from must_haves frontmatter satisfied (file exports, prop shape, ARIA roles, focus-visible ring, h-6/w-6, hover:scale-110, Check size 14 white strokeWidth 3, ColorGrid replaces inline grid in TagPill, pixel-identical trigger pill).
- All `<key_links>` satisfied (`import { ColorGrid } from "./ui/ColorGrid"` present; `[...TAG_COLORS]` spread present).
- TAGUX-01 requirement complete.

---
*Phase: 07-foundation-derived-state*
*Completed: 2026-04-17*
