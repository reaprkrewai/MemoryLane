---
phase: 10
plan: "03"
subsystem: ui
tags:
  - ui
  - react
  - tag-ux
  - sparkle
  - ghost-chips
dependency_graph:
  requires:
    - 10-01-SUMMARY  # tagSuggestionService + TagSuggestion type
    - 10-02-SUMMARY  # aiStore.tagSuggestionsEnabled + composite gate fields
  provides:
    - TagSuggestButton component (sparkle + ghost chips + state machine)
    - TagRow content prop (editor markdown threading)
    - EntryEditor → TagRow → TagSuggestButton wiring
  affects:
    - EntryEditor.tsx (editorContent state added)
    - TagRow.tsx (content prop + sparkle gate)
tech_stack:
  added: []
  patterns:
    - React Fragment return (inline flex siblings, no wrapper div)
    - Optimistic state removal before async DB write
    - Two-path tag acceptance (isNew branch + defense-in-depth fallback)
    - Composite predicate selector unmount gate
    - onUpdate + useEffect dual-seed for reactive content state
key_files:
  created:
    - src/components/TagSuggestButton.tsx
  modified:
    - src/components/TagRow.tsx
    - src/components/EntryEditor.tsx
decisions:
  - "TagSuggestButton returns a React Fragment (not a div) so ghost chips participate in TagRow's flex-wrap layout as siblings alongside real TagPills"
  - "existingTagNames sourced from global tagStore.tags (full user library) not entryTags — LLM needs full enum per AUTOTAG-03"
  - "Optimistic chip removal before await: chip disappears immediately on click, error is silent (D-10 contract)"
  - "showSparkle uses conditional render not CSS hide — TagSuggestButton's useState is garbage-collected when gate flips false (Pitfall 4 prevention)"
  - "editorContent seeded in both onUpdate AND setContent useEffect — sparkle click before first keystroke still sends correct text (Pitfall 5 prevention)"
metrics:
  duration_seconds: 179
  completed_date: "2026-04-19"
  tasks_completed: 3
  tasks_total: 3
  files_created: 1
  files_modified: 2
---

# Phase 10 Plan 03: Auto-Tagging UI — Sparkle + Ghost Chips Summary

**One-liner:** Sparkle button + ghost chips with explicit per-chip accept/dismiss wired through composite AI availability gate and reactive editor content threading.

---

## What Was Built

### TagSuggestButton.tsx (NEW — 166 lines)

Full state machine component owning the sparkle trigger, loading state, ghost chip rendering, and accept/dismiss logic.

**Props:**
```typescript
interface TagSuggestButtonProps {
  entryId: string;
  content: string;           // current editor markdown (updated per keystroke)
  existingTagNames: string[]; // full user tag library (global tagStore.tags)
  onAccept: () => void | Promise<void>; // parent reloads TagPills on accept
}
```

**State machine:**
```
IDLE              → click sparkle → LOADING
LOADING           → result ≥1     → SHOWING_SUGGESTIONS
LOADING           → result = 0    → EMPTY_STATE (4s inline msg, then IDLE)
LOADING           → >30s elapsed  → toast.info (stays LOADING)
SHOWING_SUGGESTIONS → accept chip → chip spliced; if last → IDLE
SHOWING_SUGGESTIONS → dismiss chip → chip spliced; if last → IDLE
SHOWING_SUGGESTIONS → click sparkle → LOADING (replaces batch)
```

**Accept path branching (critical — Pitfall 6 / PATTERNS.md Warning 3):**
```typescript
// isNew === true:
const newTag = await tagStore.createTag(suggestion.name);   // get UUID first
await tagStore.addTagToEntry(entryId, newTag.id);           // then FK insert

// isNew === false:
const existing = tagStore.tags.find(t => t.name.toLowerCase() === suggestion.name.toLowerCase());
if (existing) await tagStore.addTagToEntry(entryId, existing.id);
else { /* defense-in-depth */ const created = await tagStore.createTag(...); ... }
```

**Ghost chip visual contract (locked from 10-UI-SPEC.md D-12):**
- Shape: `rounded-full` (vs TagPill's `rounded-lg`)
- Border: `border-2 border-dashed border-muted/50` (vs solid colored border)
- Background: `bg-transparent` (vs color-mix tint)
- Text: `text-xs font-normal text-muted` (vs `text-sm font-medium`)
- Color-swatch dot: absent (signal of pending status)
- New-tag prefix: `<Plus size={10} />` only when `isNew === true`
- Entry animation: `animate-slide-up` with `animationDelay: idx * 60ms` stagger

**Keyboard support:**
| Key | Target | Action |
|-----|--------|--------|
| Enter / Space | chip body (div[role=button]) | accept |
| Escape | chip body | dismiss |
| Enter / Space / click | X button (native button) | dismiss (native behavior) |

### TagRow.tsx (MODIFIED)

**Changes:**
1. Added `content: string` to `TagRowProps`
2. Destructured `content` in function signature
3. Added `useAIStore` import + composite predicate selector
4. Added `allTagNames` from global `tagStore.tags`
5. Conditional `{showSparkle && <TagSuggestButton ... />}` after `<TagInput>`

**Composite predicate (single source of truth for AUTOTAG-05 + AUTOTAG-07):**
```typescript
const showSparkle = useAIStore(
  (s) => s.available && s.llm && s.tagSuggestionsEnabled
);
```

When any gate flips false (Ollama down, LLM unavailable, toggle off) — `TagSuggestButton` unmounts and its `useState` (suggestions, isLoading, showEmptyMsg) is garbage-collected. Ghost chips disappear with no explicit cleanup needed.

**existingTagNames decision:** Sourced from `useTagStore((s) => s.tags.map((t) => t.name))` — the full user tag library, not just `entryTags`. This is correct per AUTOTAG-03: the JSON-Schema enum in `tagSuggestionService` must cover all tags the user has created so the LLM can propose existing ones.

### EntryEditor.tsx (MODIFIED)

**Changes:**
1. Extended `import { useEffect }` to `import { useEffect, useState }`
2. Added `const [editorContent, setEditorContent] = useState<string>("")`
3. Added `setEditorContent(md)` in `onUpdate` callback (fires on every keystroke)
4. Added `setEditorContent(entry.content)` in the `setContent` useEffect (seeds on mount/entry-change)
5. Updated `<TagRow entryId={entryId} />` to `<TagRow entryId={entryId} content={editorContent} />`

**Content freshness guarantee:**
- Keystroke path: `onUpdate` → `setEditorContent(md)` — content is always current
- Mount/navigation path: `setContent` useEffect → `setEditorContent(entry.content)` — sparkle click before first keystroke still sends correct persisted text

**Auto-save is untouched:** `scheduleAutoSave(entryId, md, words, chars)` still receives `md` from the local variable — not from `editorContent` state — so debounce timing is unaffected.

---

## End-to-End Component Wiring

```
User types in TipTap editor
  → onUpdate fires
    → setEditorContent(md)   [fresh content for sparkle]
    → scheduleAutoSave(...)  [5s debounced save — untouched]

User clicks sparkle button (when showSparkle === true)
  → TagSuggestButton.handleSparkleClick()
    → suggestTagsForEntry(content, existingTagNames)
      → hybridAIService.requestStructured(...)
        → Ollama /api/chat OR embedded /v1/chat/completions
    → setSuggestions(result)  [ghost chips render]

User clicks ghost chip body
  → handleAccept(suggestion)
    → tagStore.createTag(name)      [if isNew]
    → tagStore.addTagToEntry(...)   [UUID FK — never plain string]
    → onAccept() → reloadEntryTags() → real TagPill appears
```

---

## Pitfalls Avoided

| Pitfall | Prevention |
|---------|-----------|
| FK error: addTagToEntry with plain string name | createTag first (isNew branch), look up .id (existing branch) |
| Ghost chip state leak on navigation | showSparkle gate unmounts component; useState GC'd |
| Stale content on sparkle click before typing | editorContent seeded in setContent useEffect |
| CSS-hide leaving component mounted | Conditional render `{showSparkle && <TagSuggestButton />}` only |
| Dismiss bubbling to accept | `e.stopPropagation()` on X button onClick |
| LLM bypass in UI layer | No ollamaService/hybridAIService imports in components |

---

## Decisions Honored from CONTEXT.md

| Decision | Implementation |
|----------|---------------|
| D-06: content prop threading | editorContent state in EntryEditor → TagRow prop |
| D-07: TagSuggestButton owns local state | useState in component, not in any store |
| D-08: Sparkle button spec | h-7 w-7 rounded-md, icon-only, exact classes from UI-SPEC |
| D-09: Slow-call toast | toast.info after 30s, single fire, no cancel affordance |
| D-10: Silent error state | console.error only, sparkle returns to resting state |
| D-11: No AbortController | Deferred per D-09 |
| D-12: Ghost chip visual contract | bg-transparent + border-2 border-dashed + no color dot |
| D-13: Session-local state | useState only, no store/DB persistence |
| D-14: No bulk accept | Per-chip accept only, no "Accept all" button |
| D-18: Unmount not hide | Conditional JSX render, no CSS visibility |

---

## Requirements Closed

- **AUTOTAG-01:** Sparkle button visible in TagRow when AI available
- **AUTOTAG-04:** Ghost chips — click accepts (explicit), X dismisses, never auto-applied
- **AUTOTAG-05:** Sparkle hidden (unmounted) when AI unavailable
- **AUTOTAG-07:** Sparkle hidden when Settings toggle off

---

## UAT Checklist (Manual — Gap Closure / Verify Phase)

- [ ] Enable "Tag suggestions" in Settings → AI Features; confirm sparkle appears in TagRow with Ollama running
- [ ] Type a journal entry (>50 words), click sparkle — 1-3 ghost chips appear within ~4s
- [ ] Click ghost chip body — chip disappears, real TagPill appears with correct color
- [ ] Click X on a ghost chip — chip disappears silently, no TagPill added
- [ ] Click sparkle with a very short entry (1 word) — "No tag suggestions for this entry" appears for ~4s then fades
- [ ] Stop Ollama mid-session — sparkle button unmounts within one health-check cycle
- [ ] Toggle Settings → AI Features → Tag suggestions → Off — sparkle unmounts instantly
- [ ] Navigate to a different entry — ghost chips from previous entry are gone (component GC'd)
- [ ] Click sparkle with a new-tag suggestion — tag created with auto-assigned color, added to entry

---

## Deviations from Plan

None — plan executed exactly as written.

---

## Self-Check: PASS

- `src/components/TagSuggestButton.tsx` — exists (166 lines) ✓
- `src/components/TagRow.tsx` — modified ✓
- `src/components/EntryEditor.tsx` — modified ✓
- Commits: c019a0c (TagSuggestButton), 824fc84 (TagRow), eef5575 (EntryEditor) ✓
- `npx tsc --noEmit` — clean ✓
- `npm run build` — succeeds ✓
