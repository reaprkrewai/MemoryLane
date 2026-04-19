# Phase 10 — UI Review

**Audited:** 2026-04-19
**Baseline:** 10-UI-SPEC.md (approved design contract)
**Screenshots:** Not captured (no dev server detected on ports 3000 or 5173)

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 4/4 | All copy matches contract verbatim; ARIA labels accurate |
| 2. Visuals | 4/4 | Triple-signal ghost chips correctly differentiated; sparkle icon correct; loading state swap correct |
| 3. Color | 4/4 | No hardcoded colors; accent used only on declared elements; muted/50 border per spec |
| 4. Typography | 4/4 | Ghost chip text-xs font-normal; settings row text-sm; no off-spec sizes |
| 5. Spacing | 3/4 | Plus icon missing -ml-0.5 vs CONTEXT.md D-12; empty-state fade uses display-toggle not opacity-fade per spec |
| 6. Experience Design | 4/4 | All states covered; gate predicate correct; animations.css globally imported; reduced-motion guard verified |

**Overall: 23/24**

---

## Top 3 Priority Fixes

1. **Plus icon lacks `-ml-0.5` offset class** — The new-tag chip prefix icon renders at full left-edge spacing. CONTEXT.md D-12 specifies `"mr-1 -ml-0.5 inline"` to pull the icon 2px into the chip padding so the visual weight is balanced. Without `-ml-0.5` the icon sits further right than designed, creating a slightly cramped gap between chip edge and icon. Fix: change `className="mr-1 inline flex-shrink-0"` to `className="mr-1 -ml-0.5 inline flex-shrink-0"` at `TagSuggestButton.tsx:149`. The UI-SPEC supersedes CONTEXT here — UI-SPEC line 146 omits `-ml-0.5`, but CONTEXT.md D-12 (the locked decision) includes it and is the primary source of truth for micro-layout. See note in Pillar 5 below.

2. **Empty-state message uses display-toggle (mount/unmount), not opacity-fade** — UI-SPEC line 179 requires: "start at opacity-1, after timeout set opacity-0" via CSS transition. The implementation at `TagSuggestButton.tsx:127` conditionally mounts `{showEmptyMsg && ...}` and sets `showEmptyMsg = false` after 4 s, causing an instant DOM removal rather than a visible fade. The `transition-opacity duration-slow` class on the span is wired to nothing because the element is unmounted before the transition can run. Impact: users see the inline message snap-disappear rather than fade, which is jarring. Fix: hold the element in the DOM and drive `opacity-0 / opacity-100` via a CSS class swap — set `showEmptyMsg` to `false` after 4 s to trigger the opacity class change, then remove from DOM after the transition completes (e.g., `onTransitionEnd` or a second 300 ms timeout). Alternatively, use an `opacity` style prop that toggles from `1` to `0`, keeping `transition-opacity duration-slow` active.

3. **OptionButton missing `aria-pressed`** — UI-SPEC line 205 requires `aria-pressed={selected}` on each `OptionButton` to communicate toggle state to assistive technology. The `OptionButton` component at `SettingsView.tsx:25-37` renders a plain `<button>` with no `aria-pressed` attribute. Screen-reader users cannot determine which option (On/Off) is currently selected without visual inspection. Fix: add `aria-pressed={selected}` to the `<button>` element inside `OptionButton`, and accept it as a prop in `OptionButtonProps`.

---

## Detailed Findings

### Pillar 1: Copywriting (4/4)

All user-facing strings match the UI-SPEC Copywriting Contract exactly:

| Element | Spec | Implemented | Result |
|---------|------|-------------|--------|
| Sparkle button aria-label | `"Suggest tags"` | `"Suggest tags"` (line 115) | PASS |
| Ghost chip accept aria-label | `"Accept tag suggestion: {name}"` | `"Accept tag suggestion: ${suggestion.name}"` (line 141) | PASS |
| Ghost chip dismiss aria-label | `"Dismiss suggestion: {name}"` | `"Dismiss suggestion: ${suggestion.name}"` (line 154) | PASS |
| Empty state (0 suggestions) | `"No tag suggestions for this entry"` | `"No tag suggestions for this entry"` (line 133) | PASS |
| Slow-call toast | `"Tag suggestions are taking longer than expected"` | `"Tag suggestions are taking longer than expected"` (line 45) | PASS |
| Settings label | `"Tag suggestions"` | `"Tag suggestions"` (line 515) | PASS |
| Settings description | `"Show a sparkle button in the editor to suggest tags via local AI"` | Exact match (line 516) | PASS |
| Settings options | `"On"` / `"Off"` | `"On"` / `"Off"` (lines 520, 525) | PASS |
| Error state | Silent (console.error only) | `console.error("[tag-suggestions] ...")` — no user-visible error | PASS |

No generic labels (Submit, Cancel, OK) found in phase 10 components. Console error prefix `[tag-suggestions]` matches the spec recommendation.

The empty state `aria-live="polite"` attribute at line 130 is a bonus that improves screen-reader announcement — not required by spec, no deduction.

### Pillar 2: Visuals (4/4)

**Sparkle button anatomy** (TagSuggestButton.tsx:113-125):
- Size: `h-7 w-7` — matches spec
- Shape: `rounded-md` — matches spec
- Icon: `<Sparkles size={14} />` resting, `<Loader2 size={14} className="animate-spin" />` loading — matches spec
- Inline flex centering: `inline-flex items-center justify-center` — correct

**Ghost chip triple-signal differentiation** (TagSuggestButton.tsx:145):
- `bg-transparent` — present
- `border-2 border-dashed` — present
- `text-muted` — present
- No color-swatch dot (correct absence confirmed — no `TagPill`-style dot in JSX)

**New-tag prefix:** `<Plus size={10} />` renders only when `suggestion.isNew === true` (line 148) — fourth visual signal correctly gated.

**Chip render order:** reading left-to-right in TagRow.tsx: TagPills → TagInput → SparkleButton → GhostChips — matches spec's declared reading order.

**Loading state:** Sparkle icon is cleanly swapped for Loader2 (no double-render). Button is `disabled={isLoading}` correctly.

**Hover focus-visible states on sparkle:** `hover:text-accent` is present (line 118). `focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1` is present. Full visual state coverage.

### Pillar 3: Color (4/4)

**Accent usage in phase 10 code:**
- `hover:text-accent` — sparkle button hover icon color (spec: declared)
- `focus-visible:ring-accent` — sparkle button focus ring (spec: declared)
- `hover:border-accent/40` — ghost chip hover border (spec: declared)
- `bg-accent text-amber-950 border-accent` — OptionButton selected state (spec: declared)
- `hover:border-accent/50` — existing button patterns in SettingsView (pre-existing, not introduced in phase 10)

No accent applied to undeclared elements. No hardcoded hex or `rgb()` values found in TagSuggestButton.tsx or TagRow.tsx.

**Ghost chip border:** `border-muted/50` — correctly uses `--color-text-muted` at 50% opacity, not `border-border`. Matches spec's intentional signal distinction.

**Ghost chip hover background:** `hover:bg-surface` — correct. Uses `--color-surface` (secondary background), not accent.

60/30/10 color split is honored: bg/surface tokens for dominant/secondary, accent reserved for interactive affordances only.

### Pillar 4: Typography (4/4)

**Ghost chip text:** `text-xs font-normal leading-tight` at TagSuggestButton.tsx:145.
- Size: `text-xs` = 12px — matches spec (`text-label` = 12px)
- Weight: `font-normal` = 400 — matches spec
- Line height: `leading-tight` — matches spec

**Empty state inline message:** `text-muted text-xs ml-1` at line 129. Size and weight match spec.

**Settings toggle label:** rendered through `SettingRow` label prop as `"Tag suggestions"`. SettingRow consistently uses `text-sm` (14px) for labels throughout the section — matches the spec's declared `text-body` (14px) weight 400 role.

**Settings description:** `text-sm` at 400 weight, color `text-text-muted` — matches spec.

No off-spec font sizes (no `text-lg`, `text-base`, `text-xl` in phase 10 additions). No off-spec weights (no `font-bold`, `font-semibold` in ghost chip or empty-state spans).

**The two declared weights (400 normal, 600 semibold) are not violated by phase 10 code.**

### Pillar 5: Spacing (3/4)

**Passing:**
- Ghost chip padding: `px-2 py-1` — matches spec (8px horizontal, 4px vertical)
- Ghost chip internal gap: `gap-1` — matches spec (4px between icon, label, and X at text-xs scale)
- X button margin: `ml-1` — matches spec
- X button hit target: `h-4 w-4` — matches spec
- Empty state margin: `ml-1` — matches spec
- TagRow outer spacing: `px-0 py-4 ml-8 mr-8` — pre-existing, correct
- Gap between sparkle and chips: chips render in the same `flex flex-wrap gap-2` parent as the sparkle button, so the gap between sparkle and first chip is `gap-2` (8px) — matches spec

**Finding 1 — Plus icon missing `-ml-0.5` (minor):**
CONTEXT.md D-12 (locked decision, line 111) specifies: `className="mr-1 -ml-0.5 inline"`. The implementation at `TagSuggestButton.tsx:149` uses: `className="mr-1 inline flex-shrink-0"`. The `-ml-0.5` (−2px) is absent. The UI-SPEC itself (line 146) reproduces the class string without `-ml-0.5`, but CONTEXT.md is the source of truth for micro-layout decisions and includes it as a deliberate optical correction. The `flex-shrink-0` addition is correct and beneficial. The missing `-ml-0.5` is a minor visual polish gap — the icon still appears, the feature works, but the left-edge spacing of new-tag chips is 2px wider than designed, making the `+` icon feel slightly detached from the pill edge at small sizes.

**Finding 2 — Empty-state opacity-fade not implemented (minor):**
UI-SPEC line 179 declares: "start at opacity-1, after timeout set opacity-0" via CSS transition. Implementation at lines 127-134 uses conditional rendering `{showEmptyMsg && ...}` — the element is mounted when `showEmptyMsg` is true and unmounted when false. The `transition-opacity duration-slow` class on the span never fires because React removes the DOM node instantly when `showEmptyMsg` becomes false. This is a behavioral gap: the spec calls for a smooth 300 ms fade-out (collapsed to instant under reduced-motion via the global guard); the implementation gives an instant pop-out in all motion environments. The fix requires holding the element in the DOM and toggling opacity via a CSS class or inline style, with DOM removal deferred to after the transition.

**Arbitrary values present (acceptable):**
- `max-w-[120px]` on ghost chip label — explicitly authorized by spec (researcher discretion)
- `max-w-[760px]` in TagRow — pre-existing, not introduced in phase 10

### Pillar 6: Experience Design (4/4)

**State machine coverage:**
All five states from the UI-SPEC state machine are implemented:
- HIDDEN: `{showSparkle && <TagSuggestButton />}` in TagRow.tsx:70 — button unmounted (not hidden) when gate is false
- IDLE: sparkle button visible, `suggestions === []`
- LOADING: `isLoading === true` → Loader2 swap + `disabled={true}` on button
- SHOWING_SUGGESTIONS: `suggestions.length > 0` → ghost chips rendered with stagger delay
- EMPTY_STATE: `showEmptyMsg === true` → inline message with 4 s timeout

**Composite predicate (AUTOTAG-05/06/07):**
TagRow.tsx:29-31: `s.available && s.llm && s.tagSuggestionsEnabled` — all three gates compose correctly. Reactive via Zustand granular selector — rerenders when any gate flips mid-session.

**Keyboard accessibility:**
- Enter/Space on chip body → accept (line 102-104)
- Escape on chip → dismiss (line 105-108)
- X button: standalone `<button type="button">` with stopPropagation (line 155-158)
- Tab order: sparkle button is keyboard-focusable; ghost chips have `tabIndex={0}`; X is a native button

**Animation:**
- `animate-slide-up` class on each chip — keyframe defined in both tailwind.config.js (line 78-81) and animations.css (line 11-14) — registered correctly
- Per-chip stagger: `style={{ animationDelay: \`${idx * 60}ms\` }}` (line 146) — matches spec (0 ms, 60 ms, 120 ms for up to 3 chips)
- animations.css imported in main.tsx (line 15) — globally available
- Reduced-motion guard in globals.css (line 406-414): `animation-duration: 0.01ms !important` covers all chips — verified

**Error handling:**
- Silent catch at lines 55-57 (LLM call failure) — no user-facing noise per spec
- Silent catch at lines 88-90 (accept failure) — optimistic chip removal already applied; state consistent
- Slow-call toast fires only once via `window.setTimeout` cleared in `finally` block — no double-fire risk

**Settings toggle default:**
`tagSuggestionsEnabled` initializes to `false` in aiStore (per AUTOTAG-06 locked default). `selected={!tagSuggestionsEnabled}` means "Off" is selected by default. Correct.

**Minor accessibility gap (OptionButton aria-pressed):**
`OptionButton` at SettingsView.tsx:25-37 renders `<button>` without `aria-pressed`. UI-SPEC line 205 requires `aria-pressed={selected}`. Screen-reader users cannot determine the current state via ARIA role. This is the same component used for the existing "AI Backend" toggle, so fixing it benefits the whole settings section. Not scored down from 4 since the visual selected state is unambiguous and the existing app pattern predates phase 10 — but flagged as a top-3 fix.

---

## Registry Safety

No third-party shadcn registries declared in UI-SPEC.md. All UI is built from Tailwind utilities and existing lucide-react icons. No new shadcn components added in this phase.

Registry audit: 0 third-party blocks, no flags.

---

## Files Audited

| File | Audit Result |
|------|-------------|
| `src/components/TagSuggestButton.tsx` | Primary implementation — 2 minor findings |
| `src/components/TagRow.tsx` | Composite predicate + prop threading — clean |
| `src/components/SettingsView.tsx` (AIFeaturesSection, lines 283-534) | Settings toggle — 1 finding (aria-pressed) |
| `src/components/EntryEditor.tsx` | Content prop threading — clean |
| `src/styles/animations.css` | Keyframes verified |
| `tailwind.config.js` | Motion tokens + animation registration verified |
| `.planning/phases/10-auto-tagging-ai-pipeline/10-UI-SPEC.md` | Design contract reference |
| `.planning/phases/10-auto-tagging-ai-pipeline/10-CONTEXT.md` | Locked decisions reference |
