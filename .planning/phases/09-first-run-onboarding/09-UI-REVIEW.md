---
phase: 09-first-run-onboarding
status: passed
overall_score: 24
audited_date: 2026-04-18
baseline: 09-UI-SPEC.md
screenshots: not_captured
dev_server: down
audit_mode: code-only
pillars:
  copywriting: 4
  visuals: 4
  color: 4
  typography: 4
  spacing: 4
  experience_design: 4
registry_audit: skipped_no_third_party
priority_fix_count: 0
minor_recommendation_count: 2
---

# Phase 9 — UI Review

**Audited:** 2026-04-18
**Baseline:** `09-UI-SPEC.md` (locked design contract — copy/spacing/typography/color all byte-explicit)
**Screenshots:** not captured (no Tauri/dev server running on 3000/5173/1420 — code-only audit)
**Audit mode:** static-source review against UI-SPEC.md byte-explicit contracts

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 4/4 | Every locked string verbatim against UI-SPEC L122–185 (10/10 CTA + 3/3 bullet + indicator + skip + Help row + loading captions); single sub-typographic ellipsis nit |
| 2. Visuals | 4/4 | All composition diagrams match (AlertDialog Steps 1+3, Popover+Spotlight Step 2, HelpSection mirrors DataSection); z-stack honored; stable virtualRef anti-thrash pattern landed |
| 3. Color | 4/4 | Accent restricted to exactly 4 spec-declared elements (active dot / 3 Check icons / 3 primary CTAs / Help icon-tile); only literal color is the spec-mandated `rgba(0,0,0,0.6)` backdrop |
| 4. Typography | 4/4 | Exactly 4 sizes (display/heading/body/label) and 2 weight families (400 + 500/600); Fraunces serif locked to Step 1 heading only — verified |
| 5. Spacing | 4/4 | All 4-multiple Tailwind tokens; the 3 documented exceptions (6px step-dot, 12px spotlight padding, 14/16px icons) match the spec exception table |
| 6. Experience Design | 4/4 | Loading + error + empty-target + disabled + reduced-motion + focus-trap + Escape-skip + Ctrl/Cmd+N guard + replay-mid-session all wired correctly; CR-01 / CR-02 / WR-01 / WR-02 / WR-03 fixes all landed |

**Overall: 24/24 — passed (no priority fixes; 2 minor polish recommendations below)**

---

## Top Priority Fixes

**None.** Zero blocking or significant findings against the UI-SPEC.md contract. The two minor consistency notes below are sub-visible polish items — left as deferred polish, not blockers.

---

## Minor Polish Recommendations (non-blocking)

1. **Step 3 AlertDialogTitle drops the `text-text` token** — `OnboardingOverlay.tsx:300` reads `className="text-heading"` while Step 2's Popover heading at `OnboardingOverlay.tsx:267` reads `className="text-heading text-text"`. UI-SPEC L86 specifies `text-heading text-text` for both. AlertDialogTitle's base shadcn class still applies a text color so this is invisible at runtime, but the token pair drifted between sibling steps. Cheap one-token fix: add `text-text` to line 300 for consistency with Step 2.

2. **App State 6.5 loader caption uses ASCII `...` vs spec's unicode `…`** — `App.tsx:216` reads `Preparing your journal...` while UI-SPEC L174 specifies `Preparing your journal…`. Sub-pixel typographic drift; not a copy-contract violation but worth aligning if future spec checks become byte-strict. One-character edit.

---

## Detailed Findings

### Pillar 1: Copywriting (4/4)

Every string locked in UI-SPEC L122–185 is present verbatim in source. Verified line-by-line:

| Spec line | Locked copy | Source location | Status |
|-----------|-------------|-----------------|--------|
| L127 | `Welcome to Chronicle AI` | `OnboardingOverlay.tsx:194` | match |
| L128 | `Your life story, written for you.` | `OnboardingOverlay.tsx:197` | match |
| L129 | `**Stays on your device** — nothing leaves your computer.` | `OnboardingOverlay.tsx:205-206` | match |
| L130 | `**AI runs locally** — built-in or Ollama, never the cloud.` | `OnboardingOverlay.tsx:212-213` | match |
| L131 | `**No accounts, no tracking, no telemetry.**` | `OnboardingOverlay.tsx:219` | match |
| L132 | `Step 1 of 3` indicator | `OnboardingOverlay.tsx:58` (`Step {step} of {total}`) | match |
| L133 | `Skip tour` | `OnboardingOverlay.tsx:83` | match |
| L134 | `Continue` | `OnboardingOverlay.tsx:239` | match |
| L140 | `Start writing anytime` | `OnboardingOverlay.tsx:267` | match |
| L141 | `Tap the **+** button — or press **Ctrl/Cmd + N** — to begin a new entry. Your dashboard updates as you write.` | `OnboardingOverlay.tsx:268-272` | match |
| L144 | `Got it` | `OnboardingOverlay.tsx:283` | match |
| L152 | `Ready to begin?` | `OnboardingOverlay.tsx:300` | match |
| L153 | `Your first entry is the hardest. The next 365 are easier.` | `OnboardingOverlay.tsx:302` | match |
| L156 | `I'll explore first` | `OnboardingOverlay.tsx:324` | match |
| L157 | `Write your first entry` | `OnboardingOverlay.tsx:331` | match |
| L163 | `Help` | `SettingsView.tsx:619` (`title="Help"`) | match |
| L165 | `Replay onboarding tour` | `SettingsView.tsx:622` | match |
| L166 | `Restart the welcome flow from the beginning` | `SettingsView.tsx:623` | match |
| L167 | `Replay` (rest state) | `SettingsView.tsx:636` | match |
| L168 | `Resetting...` (loading) | `SettingsView.tsx:633` | match |
| L174 | `Preparing your journal…` (loader caption) | `App.tsx:216` (`Preparing your journal...`) | **drift — ASCII `...` vs unicode `…`** |

Generic-label audit: zero occurrences of "Submit" / "OK" / "Click Here" in any Phase 9 surface. "Cancel" appears 0 times in OnboardingOverlay.tsx. The Step 3 secondary "I'll explore first" intentionally avoids the generic "Cancel" label per UI-SPEC L156.

### Pillar 2: Visuals (4/4)

Composition matches UI-SPEC diagrams 1:1:

- **Steps 1 + 3 — AlertDialog `max-w-md`** — `OnboardingOverlay.tsx:191, 298` use `className="max-w-md"` (448px) per UI-SPEC L51 (tighter than shadcn default `max-w-lg`)
- **Step 2 — Popover anchored to FAB** — `OnboardingOverlay.tsx:261-265` use `side="top" align="end" sideOffset={16} className="max-w-xs z-[70]"` — exact match to UI-SPEC L256-260
- **Step indicator** — `StepIndicator` sub-component at `OnboardingOverlay.tsx:55-73` produces `Step N of 3` text + 3 dots, active dot `bg-accent`, inactive dots `bg-text-muted/40`, dot diameter `h-1.5 w-1.5` (6px) — matches UI-SPEC L296-313 verbatim
- **Skip link** — `SkipLink` sub-component at `OnboardingOverlay.tsx:76-86` produces a plain text `<button>` with `text-label text-text-muted hover:text-text underline-offset-4 hover:underline` — no icon-only X (per D-15)
- **Spotlight technique** — pure CSS box-shadow cutout at `OnboardingSpotlight.tsx:111` (`boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.6)"`) with `border-radius: 9999px` to match the FAB pill shape — exactly the technique mandated by UI-SPEC L242-251 and CONTEXT.md D-09
- **HelpSection grammar parity** — `SettingsView.tsx:617-642` uses `<SectionHeader icon={<HelpCircle size={16} />} title="Help" />` + `border-t border-border` divider + `<SettingRow>` — byte-identical to DataSection at `SettingsView.tsx:558-586`. Replay button className at line 628 is byte-identical to Export Data button at line 569 — only differences are (a) "Replay" vs "Export Data" label and (b) NO `<ChevronRight />` (per D-17 explicit)
- **Stable virtualRef pattern** — `OnboardingOverlay.tsx:105` declares `const fabRef = useRef<HTMLElement | null>(null);`, `useLayoutEffect` at line 107 captures the FAB on `currentStep === 1`, and `<PopoverAnchor virtualRef={...} />` at line 260 receives the SAME ref object across renders. Anti-anchor-thrash contract honored
- **WR-02 front-load** — `handleStep1Continue` at line 146 captures the FAB BEFORE `setCurrentStep(1)` so the Popover's first commit sees a populated `fabRef.current` (eliminates one-frame anchor jump)
- **WR-03 rAF re-measure loop** — `OnboardingSpotlight.tsx:69-74` adds a `requestAnimationFrame` tick to catch layout shifts that don't fire `resize` or `ResizeObserver` (sidebar collapse, font-scale change, lazy-loaded images above FAB). Cleanup at line 88 (`cancelAnimationFrame`)

Z-index stack matches UI-SPEC L284-291 exactly:

| Layer | Class / value | Source |
|-------|--------------|--------|
| FAB at rest | `z-40` | unchanged from Phase 8 |
| FAB during Step 2 | `z-80` (raised via `body.onboarding-spotlight-active` rule) | `globals.css:421-423` |
| Spotlight backdrop | `z-[60]` | `OnboardingSpotlight.tsx:96` |
| Spotlight cutout div | inherits `z-[60]` (pointer-events-none) | `OnboardingSpotlight.tsx:101` |
| Step 2 Popover | `z-[70]` | `OnboardingOverlay.tsx:265` |
| AlertDialog (Steps 1+3) | shadcn default `z-50` | unmodified |

Decorative elements correctly `aria-hidden`: step dots (`OnboardingOverlay.tsx:67`), spotlight backdrop (`OnboardingSpotlight.tsx:97`).

### Pillar 3: Color (4/4)

Accent token (`bg-accent` / `text-accent` / `bg-accent/10`) appears in source ONLY on the four UI-SPEC L106-110 reserved-for elements — verified by grep over `src/components/onboarding/` + the Phase 9 HelpSection block:

| # | Reserved-for element | Source location |
|---|---------------------|-----------------|
| 1 | Active step-indicator dot (`bg-accent`) | `OnboardingOverlay.tsx:65` |
| 2 | Privacy-bullet Check icons (`text-accent`, ×3) | `OnboardingOverlay.tsx:203, 210, 217` |
| 3 | Primary CTAs Continue / Got it / Write your first entry (`bg-accent text-amber-950 dark:text-bg font-medium`) | `OnboardingOverlay.tsx:237, 281, 329` |
| 4 | HelpSection icon-tile (`bg-accent/10` + `text-accent`) | `SettingsView.tsx:49-50` (SectionHeader) used at `SettingsView.tsx:619` |

Inactive elements correctly avoid accent:

- Inactive step dots → `bg-text-muted/40` (`OnboardingOverlay.tsx:65`) — matches L114
- Skip-tour link → `text-text-muted hover:text-text` (`OnboardingOverlay.tsx:80`) — matches L115
- "I'll explore first" secondary CTA → `border-border text-text-secondary hover:text-text` (`OnboardingOverlay.tsx:322`) — matches L115
- Body prose → `text-text-secondary` (lines 196, 268, 301) — matches L116

Hardcoded color literals in Phase 9 source: ONE (`OnboardingSpotlight.tsx:111` — `rgba(0, 0, 0, 0.6)` for the spotlight backdrop). This is explicitly mandated by UI-SPEC L55 and L117 (neutral darkening, NOT a brand color). No accidental hex / rgb leakage anywhere else.

60/30/10 split honored: dominant surfaces (AlertDialog/Popover bg) inherit `--color-bg`; secondary surfaces (borders, dot inactive state, skip link rest color) use `--color-border` / `text-text-muted`; accent is the single 10% layer with the four reserved-for uses above.

### Pillar 4: Typography (4/4)

Exactly 4 size tokens present in Phase 9 surfaces (`text-display`, `text-heading`, `text-body`, `text-label`) — matches UI-SPEC L73-76. Distribution:

| Token | Used in | Count |
|-------|---------|-------|
| `text-display` | Step 1 heading only (`OnboardingOverlay.tsx:193`) | 1 |
| `text-heading` | Step 2 heading + Step 3 heading (`OnboardingOverlay.tsx:267, 300`) | 2 |
| `text-body` | All paragraph copy (`OnboardingOverlay.tsx:196, 204, 211, 218, 268, 301`) + App.tsx loader caption | 7 |
| `text-label` | Step indicator text + Skip link + all CTA buttons + Replay button | 8 |

Exactly 2 weight families:

- `font-medium` (500): bullet lead-ins (lines 205, 212, 219), primary CTAs (lines 237, 281, 329), secondary CTA (line 322), Replay button (`SettingsView.tsx:628` via byte-identical inheritance from DataSection grammar)
- Implicit 400 (default body), 600 (display/heading default via Tailwind config) — no third weight introduced

Fraunces serif locked to Step 1 heading only: grep across `src/components/onboarding/` for `font-display` returns ONE match (`OnboardingOverlay.tsx:193` — Step 1 `Welcome to Chronicle AI`). Step 2 + Step 3 headings use Inter via `text-heading`. UI-SPEC L82 ("the only place Fraunces appears in this phase, anchoring the 'first impression' moment") — verified.

Italic restricted to Step 1 subhead (`OnboardingOverlay.tsx:196` `italic`) — matches UI-SPEC L84.

Minor token-pair drift: `OnboardingOverlay.tsx:300` (Step 3 title) reads `className="text-heading"` only, while sibling Step 2 heading at line 267 reads `className="text-heading text-text"`. UI-SPEC L86 specifies `text-heading text-text` for both. AlertDialogTitle's base shadcn class still resolves a text color so this is invisible at runtime — drift is sub-pixel but worth a one-token alignment in a future polish pass.

### Pillar 5: Spacing (4/4)

All spacing values are 4-multiple Tailwind tokens. Distribution by class:

| Class | Pixel value | Used in | Spec line |
|-------|-------------|---------|-----------|
| `gap-1` | 4 | Step dot row gap (`OnboardingOverlay.tsx:59`) | L40 |
| `gap-2` | 8 | StepIndicator text→dots, Step 1 bullet icon→text, Step 3 button row gap | L41 |
| `gap-3` | 12 | StepIndicator+SkipLink row gap (lines 225, 274, 307) | L320 |
| `gap-4` | 16 | Step 1 bullet vertical gap (`OnboardingOverlay.tsx:201`) | L42 |
| `mt-1` | 4 | Check icon vertical alignment (lines 203, 210, 217) | n/a (visual centering) |
| `mt-2` | 8 | Bullets→AlertDialog header gap (line 201), Step 2 body→heading gap (line 268), AlertDialog footer→content gap (lines 224, 306) | L42 |
| `mt-4` | 16 | Step 2 button row→body gap (line 273) | L42 |
| `px-3 py-1.5` | 12 / 6 | Step 2 "Got it" button (line 281) + Replay button (`SettingsView.tsx:628`) | L348 (matches Export Data button) |
| `px-4 py-2` | 16 / 8 | Step 1 Continue + Step 3 buttons (lines 237, 322, 329) | L43 |

Documented exceptions outside the 4-multiple rule (all spec-explicit per UI-SPEC L60-63):

| Element | Value | Source |
|---------|-------|--------|
| Step indicator dot diameter | 6px (`h-1.5 w-1.5`) | `OnboardingOverlay.tsx:64` |
| Privacy-bullet Check icon | 14px (`size={14}`) | `OnboardingOverlay.tsx:203, 210, 217` |
| HelpSection icon | 16px (`size={16}`) | `SettingsView.tsx:619` |
| HelpSection Loader2 icon | 14px (`size={14}`) | `SettingsView.tsx:632` |
| Spotlight padding around FAB | 12px (`PADDING = 12`) | `OnboardingSpotlight.tsx:29, 106-109` |
| Step 2 Popover sideOffset | 16px | `OnboardingOverlay.tsx:264` |

Arbitrary `[…]` Tailwind values audit: only z-index utilities (`z-[60]`, `z-[70]`) — both spec-mandated by UI-SPEC L284-291 (the z-stack table). No arbitrary spacing or color values.

`px-3 py-1.5` (`6px` y-padding) on the Step 2 "Got it" button is non-4-multiple but matches the existing Export Data / Setup AI button class across the rest of the codebase — intentional grammar parity, not a drift.

### Pillar 6: Experience Design (4/4)

State coverage analysis:

| State | Spec L | Source location | Status |
|-------|--------|-----------------|--------|
| Loading bridge (App State 6.5) | L174 | `App.tsx:212-219` (Loader2 + caption) | wired |
| Replay button loading state | L168 | `SettingsView.tsx:630-634` (Loader2 + "Resetting...") | wired |
| Replay error → silent fail | L176 | `onboardingService.ts` try/catch + console.error (no toast) | wired |
| Spotlight target missing → fallback backdrop | L177 | `OnboardingSpotlight.tsx:120-122` | wired |
| Resize → ResizeObserver re-measure | L178 | `OnboardingSpotlight.tsx:55-59` | wired |
| Per-frame layout shift catch-all (WR-03) | n/a | `OnboardingSpotlight.tsx:69-74` (rAF tick) | wired (defense-in-depth) |
| Step 3 chain failure → close overlay | L41 (PLAN-02) | `OnboardingOverlay.tsx:165-179` (try/catch) | wired |
| Replay button disabled during in-flight | n/a | `SettingsView.tsx:627` (`disabled={isReplaying}` + `disabled:opacity-50`) | wired |
| No confirmation dialog before replay | L184 + D-15 | `SettingsView.tsx:617-642` (no AlertDialog wrapping handleReplay) | wired |

Interaction patterns:

- **Focus trap (Steps 1 + 3):** Native Radix `AlertDialog` — `OnboardingOverlay.tsx:187, 294`
- **Focus trap (Step 2):** Native Radix `Popover` — `OnboardingOverlay.tsx:252`
- **Escape-skip routing (Steps 1 + 3):** Both AlertDialogs use controlled-mode `onOpenChange={(open) => { if (!open) void handleSkip(); }}` (lines 189, 296). UI-SPEC L228 contract — Radix's native Escape-key dismiss routes through the same `markOnboardingCompleted()` write the explicit Skip-tour link uses, keeping skip path single-source-of-truth
- **Reduced-motion:** Inherited via `globals.css:406-413` `@media (prefers-reduced-motion: reduce)` stanza covering all `animation-duration`, `transition-duration`, and `animation-iteration-count` — applies to `animate-fade-in` (Spotlight backdrop), `animate-spin` (Loader2), `transition-colors duration-150` (step dots), and shadcn's built-in `animate-in zoom-in-95 fade-in-0 slide-in-from-top-[48%]` AlertDialog enter animations. No per-component opt-out needed
- **Ctrl/Cmd+N gated during onboarding:** `useGlobalShortcuts.ts:57` — `if (ui.isOnboardingCompleted === false) return;` placed AFTER the existing locked-state gate, using the same read-at-fire-time pattern (no listener re-bind on isOnboardingCompleted transitions). UI-SPEC D-20 verified
- **Replay-mid-session works:** SettingsView.tsx HelpSection calls `setView("overview")` BEFORE `replayOnboarding()` (line 604) — guarantees the FAB is mounted in the DOM by the time Step 2's `OnboardingSpotlight` queries `[data-onboarding="quick-write-fab"]`. AppShell hides the FAB on Settings view; without WR-01 the spotlight backdrop would render with no cutout. Overlay re-mounts above SettingsView via the App.tsx mount-alongside-AppShell pattern (D-02)
- **currentStep reset on replay:** `OnboardingOverlay.tsx:120-124` — useEffect resets `currentStep = 0` whenever `isOnboardingCompleted === false`. Without this (CR-02 fix), the component would persist `"done"` from a prior completion and every `<AlertDialog open={currentStep === N}>` would evaluate to false on replay, silently breaking SC #4. Effect declared BEFORE the early-return-null guard so hook order is preserved
- **CR-01 — plain `<button>` instead of `AlertDialogAction` / `AlertDialogCancel`:** Documented at `OnboardingOverlay.tsx:229-233` and 312-318. Radix's Action/Cancel auto-fire `onOpenChange(false)` on click, which would route through `handleSkip()` and trigger a redundant `markOnboardingCompleted()` write (and on Step 3, would force a misleading skip telemetry — not present since there's no analytics, but still wrong-shaped). The plain `<button>`s are styled to match the spec L273 primary-CTA contract verbatim (`bg-accent text-amber-950 dark:text-bg font-medium px-4 py-2 text-label rounded-md`) — no visual regression vs the original AlertDialogAction styling
- **No icon-only dismiss controls (D-15):** Audit confirmed — every dismiss/skip surface uses an explicit text label ("Skip tour", "I'll explore first", or the Escape key). Zero corner-X buttons. Screen readers announce intent clearly

Accessibility audit (UI-SPEC L389-402):

| Surface | Guarantee | Status |
|---------|-----------|--------|
| AlertDialog focus trap (Steps 1+3) | Native Radix; first focus on primary CTA; Escape → skip | wired |
| Spotlight aria-hidden | Backdrop and cutout `aria-hidden` (`OnboardingSpotlight.tsx:97`) | wired |
| Step indicator aria-hidden dots | Decorative dots `aria-hidden` (`OnboardingOverlay.tsx:67`); semantic in `Step N of 3` text | wired |
| Skip-tour link with text | Plain `<button>` with literal text "Skip tour" | wired |
| Color contrast WCAG AA | Spec-verified — amber `#D97706` on `#FFFFFF` = 4.6:1 light; violet `#8B7FFF` on `#0A0A0D` = 8.2:1 dark | wired (token reuse) |
| Focus-visible rings | Inherits global `focus-visible:ring-2` from button base | wired (no per-component override needed) |

---

## Registry Safety

`components.json` is present (shadcn initialized). UI-SPEC L426-433 declares only shadcn-official primitives are used (`alert-dialog`, `popover`, `button` — all shipped in v1.0, no Phase 9 add). The Registry Safety table at L431 explicitly lists `third-party | (none) | not applicable`.

**Per agent gating rules: registry audit skipped.**

`Registry audit: 0 third-party blocks checked, no flags.`

---

## Files Audited

Source files reviewed (all paths absolute):

- `c:\Users\Jason\Dev\MemoryLane\src\components\onboarding\OnboardingOverlay.tsx` (340 lines — 3-step state machine, sub-components, all CTAs and copy)
- `c:\Users\Jason\Dev\MemoryLane\src\components\onboarding\OnboardingSpotlight.tsx` (125 lines — CSS box-shadow cutout, ResizeObserver, scroll lock, body class management, rAF re-measure tick)
- `c:\Users\Jason\Dev\MemoryLane\src\components\SettingsView.tsx` (lines 1-50 imports + 540-643 — DataSection + HelpSection block + main composition)
- `c:\Users\Jason\Dev\MemoryLane\src\styles\globals.css` (lines 404-423 — `prefers-reduced-motion` stanza + Phase 9 FAB z-hoist rule)
- `c:\Users\Jason\Dev\MemoryLane\src\styles\animations.css` (full file — verified `fade-in` + `pop-in` keyframes available; no Phase 9 additions)
- `c:\Users\Jason\Dev\MemoryLane\src\App.tsx` (lines 31, 205-238 — onboarding selectors, State 6.5 loader, State 6 mount alongside AppShell)
- `c:\Users\Jason\Dev\MemoryLane\src\hooks\useGlobalShortcuts.ts` (line 57 — Ctrl/Cmd+N onboarding gate)
- `c:\Users\Jason\Dev\MemoryLane\src\stores\uiStore.ts` (lines 39, 96, 112 — tri-state primitive + setter)

Spec/context files referenced:

- `c:\Users\Jason\Dev\MemoryLane\.planning\phases\09-first-run-onboarding\09-UI-SPEC.md` (full file — design contract baseline)
- `c:\Users\Jason\Dev\MemoryLane\.planning\phases\09-first-run-onboarding\09-CONTEXT.md` (decisions D-08 through D-20)
- `c:\Users\Jason\Dev\MemoryLane\.planning\phases\09-first-run-onboarding\09-01-SUMMARY.md` (Plan 01 outcomes)
- `c:\Users\Jason\Dev\MemoryLane\.planning\phases\09-first-run-onboarding\09-02-SUMMARY.md` (Plan 02 outcomes — overlay + spotlight + App mount)
- `c:\Users\Jason\Dev\MemoryLane\.planning\phases\09-first-run-onboarding\09-03-SUMMARY.md` (Plan 03 outcomes — HelpSection + Replay button)

Audit method: code-only static review (no dev server detected on ports 3000/5173/1420). The 6-pillar contract from UI-SPEC.md is byte-explicit enough that visual screenshots would have added verification of spacing pixel-positions and accent saturation — neither flagged in source but worth a follow-up screenshot pass during the next manual UAT cycle.
