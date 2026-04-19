---
phase: 11
plan: 01
subsystem: tag-store, animations, tailwind-config, db-migrations
tags: [animations, tags, palette, css-keyframes, sqlite-migration]
dependency_graph:
  requires: []
  provides: [TAG_COLORS-12-tokens, renameTag-action, tag-pop-in-keyframe, tag-pop-out-keyframe, mood-spring-keyframe, scale-in-keyframe, tailwind-animation-tokens, tag-color-backfill-migration]
  affects: [TagPill.tsx, ColorGrid consumers, Wave-2-microinteractions, Wave-3-tag-management]
tech_stack:
  added: []
  patterns: [12-token dual-tone palette, CSS keyframe append, Tailwind animation token registration, idempotent-sqlite-UPDATE-migration]
key_files:
  created: []
  modified:
    - src/stores/tagStore.ts
    - src/styles/animations.css
    - tailwind.config.js
    - src/lib/db.ts
    - src/components/TagPill.tsx
decisions:
  - TAG_COLORS changed from 8-string array to 12-object structured array; consumers use .base for plain hex (backwards compat)
  - renameTag added to TagState interface and implementation; mirrors updateTagColor pattern
  - animations.css keyframes appended with no prefers-reduced-motion stanza (covered by globals.css blanket rule)
  - Phase 11 migration uses standalone db.execute() UPDATE loop after idx_entries_local_date line (UAT-01 rule)
metrics:
  duration_seconds: 185
  completed_date: "2026-04-19"
  tasks_completed: 3
  files_modified: 5
---

# Phase 11 Plan 01: Foundation Layer (Palette + Keyframes + Migration) Summary

**One-liner:** 12-token dual-tone TAG_COLORS palette with renameTag mutator, 4 CSS keyframes + 5 Tailwind animation tokens, and idempotent SQLite backfill migration mapping 8 legacy hex values to new palette base tokens.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | 12-token TAG_COLORS + renameTag + last_used | 4be7e1c | src/stores/tagStore.ts, src/components/TagPill.tsx |
| 2 | CSS keyframes + Tailwind animation tokens | c21d50b | src/styles/animations.css, tailwind.config.js |
| 3 | Phase 11 tag color backfill migration | 2710a59 | src/lib/db.ts |

## Decisions Made

1. **TAG_COLORS structured array**: Replaced 8-element `string[]` with 12-element structured array of `{ id, label, base, bg_light, bg_dark, text_light, text_dark }`. All 7 fields per token per D-02 spec. Consumers requiring plain hex use `TAG_COLORS.map(t => t.base)`.

2. **TagPill consumer fixed inline (Rule 1)**: TagPill.tsx was passing `[...TAG_COLORS]` directly to `ColorGrid` which expects `string[]`. Updated to `TAG_COLORS.map(t => t.base)` and `cols={6}` (12 tokens = 2 rows of 6, per D-04).

3. **renameTag mirrors updateTagColor pattern**: Optimistic store update + SQL UPDATE, same shape as existing `updateTagColor`. SQLite UNIQUE constraint on `tags.name` surfaces duplicate-name errors as rejected promises (T-11-02 accepted).

4. **Reduced-motion via globals.css only**: Zero `@media (prefers-reduced-motion)` stanzas added to animations.css. The existing Phase 7 blanket `*, *::before, *::after { animation-duration: 0.01ms !important; }` in globals.css covers all 4 new keyframes automatically (D-01g, ANIM-06).

5. **Migration ordering (UAT-01 compliant)**: The 8-mapping UPDATE loop is placed as standalone `db.execute()` calls after `idx_entries_local_date` — never inside `MIGRATION_SQL`. Idempotent via value-matching: once old hex is gone, UPDATE matches zero rows.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TagPill ColorGrid consumer breaking on structured TAG_COLORS**
- **Found during:** Task 1
- **Issue:** TagPill.tsx passed `[...TAG_COLORS]` (now `object[]`) to `ColorGrid` which accepts `colors: string[]`. This would cause a TypeScript error and runtime breakage.
- **Fix:** Updated to `TAG_COLORS.map(t => t.base)` for the `colors` prop. Also updated `cols={5}` to `cols={6}` per D-04 (12 tokens = 2 rows of 6).
- **Files modified:** src/components/TagPill.tsx
- **Commit:** 4be7e1c (included in Task 1 commit)

## Verification Results

All acceptance criteria passed:

- `grep -c "^  { id:" src/stores/tagStore.ts` → `12` (exactly 12 tokens)
- `grep "renameTag: async"` → matches implementation
- `grep "renameTag: (id: string, newName: string) => Promise<void>"` → matches interface
- `grep "last_used?: number"` → matches TagWithCount extension
- `grep "MAX(e.created_at) AS last_used"` → matches loadTags SELECT
- `grep "TAG_COLORS\[.*\.length\]\.base"` → matches createTag
- `grep "^@keyframes tag-pop-in/out"` → both match in animations.css
- `grep "^@keyframes mood-spring"` → matches
- `grep "^@keyframes scale-in"` → matches
- All 5 Tailwind animation token greps → pass
- `grep -c "prefers-reduced-motion" src/styles/animations.css` → `0`
- `grep -q "prefers-reduced-motion" src/styles/globals.css` → PRESENT
- Migration ordering awk → correct (mapping line 235 > idx_entries_local_date line 218)
- Not-inside-MIGRATION_SQL awk → PASS
- `npx tsc --noEmit` → PASS
- `npm run build` → PASS

## Known Stubs

None — all exports are fully functional. TAG_COLORS tokens are code constants (not stubs). The renameTag action writes to SQLite immediately.

## Threat Flags

None — all new surface is covered by the plan's threat model (T-11-01 through T-11-04). No new network endpoints, auth paths, or schema changes beyond the documented tag.color UPDATE migration.

## Self-Check: PASSED

- src/stores/tagStore.ts: exists and contains 12 tokens, renameTag, last_used
- src/styles/animations.css: exists and contains 4 new keyframes
- tailwind.config.js: exists and contains 5 new animation tokens + 5 keyframes entries
- src/lib/db.ts: exists and contains Phase 11 migration block
- src/components/TagPill.tsx: exists and contains TAG_COLORS.map(t => t.base)
- Commits 4be7e1c, c21d50b, 2710a59: all present in git log
