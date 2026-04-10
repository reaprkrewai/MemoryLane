# Phase 2: Editor & Tags - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-09
**Phase:** 02-editor-tags
**Areas discussed:** Editor toolbar style, Entry access in Phase 2, Metadata bar layout, Tag input UX

---

## Editor Toolbar Style

| Option | Description | Selected |
|--------|-------------|----------|
| Bubble menu only | Formatting toolbar appears when text is selected. Distraction-free by default. | ✓ |
| Persistent toolbar above editor | Always-visible toolbar above writing area. More discoverable but adds visual noise. | |
| Both — minimal fixed + bubble | Thin fixed bar for a subset + bubble menu for extended formatting. | |

**User's choice:** Bubble menu only

**Follow-up — Bubble menu contents:**

| Option | Description | Selected |
|--------|-------------|----------|
| Bold, Italic, Heading 1/2, Bullet list, Blockquote | Covers EDIT-01 exactly. Compact menu. | ✓ |
| Full set + Code block, Link, Strike | More comprehensive but bubble gets wide. | |
| You decide | Claude picks a sensible subset. | |

**User's choice:** Bold, Italic, Heading 1/2, Bullet list, Blockquote

---

## Entry Access in Phase 2

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal sidebar entry list | Scrollable list in sidebar showing date + mood + word count. | ✓ |
| Defer EDIT-02 to Phase 3 | Phase 2 only creates entries; editing unlocks with Timeline. | |
| Most recent entry on open | App opens to most recent entry; no list navigation. | |

**User's choice:** Minimal sidebar entry list

**Follow-up — List item content:**

| Option | Description | Selected |
|--------|-------------|----------|
| Date + mood icon + word count | Compact, three data points to identify an entry. | ✓ |
| Date + first line of content preview | More context but sidebar gets wordy. | |
| You decide | Claude picks the density. | |

**User's choice:** Date + mood icon + word count

**Follow-up — New Entry placement:**

| Option | Description | Selected |
|--------|-------------|----------|
| Button at top of sidebar + auto-open empty entry on first launch | Amber "New Entry" pinned at top; first launch auto-creates blank entry. | ✓ |
| Button in main content area (empty state CTA) | Uses existing EmptyState component. | |
| Keyboard shortcut only (Cmd/Ctrl+N) | Power-user approach. | |

**User's choice:** Button at top of sidebar + auto-open empty entry on first launch

---

## Metadata Bar Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Header bar above editor content | Thin row at top: date left, mood center, word count right. Always visible. | ✓ |
| Footer bar below editor | Same layout at bottom as a status bar. | |
| Inline at top of entry (inside editor) | Date/mood as first block inside TipTap. | |

**User's choice:** Header bar above editor content

**Follow-up — Mood selector:**

| Option | Description | Selected |
|--------|-------------|----------|
| 5 emoji/icon buttons, tap to select | Five compact icons in a row; selected mood highlights amber. | ✓ |
| Single mood button opens popover | Current mood shown as icon; clicking opens picker. | |
| Text dropdown | Standard select control. | |

**User's choice:** 5 emoji/icon buttons, tap to select

**Follow-up — Date editing:**

| Option | Description | Selected |
|--------|-------------|----------|
| Click date to open date+time picker popover | Date shown as readable text; clicking opens calendar + time input. | ✓ |
| Editable date field always visible | In-place editable input in header. | |
| You decide | Claude picks the interaction. | |

**User's choice:** Click date to open date+time picker popover

---

## Tag Input UX

| Option | Description | Selected |
|--------|-------------|----------|
| Below editor content, above bottom chrome | Dedicated tag row below writing area. Doesn't interrupt writing. | ✓ |
| In the header bar (same row as mood/date) | Tags as pills in metadata bar. Header gets busier. | |
| Floating footer pinned to bottom | Always visible at bottom regardless of scroll. | |

**User's choice:** Below editor content, above bottom chrome

**Follow-up — Autocomplete behavior:**

| Option | Description | Selected |
|--------|-------------|----------|
| Dropdown below input, filtered as you type | Shows tag name + usage count. Enter/click to select. Type new name + Enter to create. | ✓ |
| Inline typeahead ghost text | Shell-style autocomplete. Less visual clutter. | |
| You decide | Claude picks the autocomplete pattern. | |

**User's choice:** Dropdown below input, filtered as you type

**Follow-up — Color assignment:**

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-assigned from 8 presets, editable via tag pill click | Next color auto-assigned; click pill to change after creation. | ✓ |
| Color picker shown immediately on creation | Color selection is part of creation flow. | |
| You decide | Claude picks color assignment flow. | |

**User's choice:** Auto-assigned from 8 presets, editable via tag pill click

---

## Claude's Discretion

- Exact visual treatment of the metadata header bar (size, spacing, dividers)
- Entry list loading behavior (pagination, scroll behavior for large lists)
- Specific icon choices for mood states
- Delete entry confirmation UX
- Auto-save indicator treatment (silent / brief "Saved" flash)

## Deferred Ideas

- Full timeline cards with expand/collapse — Phase 3
- Calendar heatmap — Phase 3
- Full-text search and filter UI — Phase 4
- Keyboard shortcut Cmd/Ctrl+N for New Entry — post-Phase 2 enhancement
