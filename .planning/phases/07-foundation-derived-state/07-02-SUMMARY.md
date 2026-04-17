---
phase: 07-foundation-derived-state
plan: 02
subsystem: foundation/animation-primitives
tags: [animation, motion, accessibility, design-system, tailwind, css]
requirements:
  - FOUND-04
dependency_graph:
  requires:
    - "src/styles/globals.css :root token block (existing)"
    - "src/main.tsx import order (existing)"
    - "tailwind.config.js theme.extend (existing)"
  provides:
    - "Motion tokens (--motion-fast/med/slow, --ease-out-smooth, --ease-spring) globally available"
    - "src/styles/animations.css — 3 shared keyframes (fade-in, slide-up, pop-in) + .stagger-children utility"
    - "Tailwind utilities: duration-{fast,med,slow}, ease-{out-smooth,spring}, animate-{fade-in,slide-up,pop-in}"
    - "Universal-selector reduced-motion guard (PITFALLS I2 mitigation)"
  affects:
    - "Phase 11 microinteractions (ANIM-01..06) — adoption surface ready, no rewiring this plan"
    - "All current Radix popover / alert-dialog animations — now respect prefers-reduced-motion"
tech_stack:
  added: []
  patterns:
    - "CSS custom properties as motion tokens (mirrors existing color/shadow token pattern)"
    - "Tailwind keyframes mirror animations.css (JIT requires both keyframes + animation extension entries)"
    - "Universal selector + !important for reduced-motion override (beats utilities and inline styles)"
key_files:
  created:
    - "src/styles/animations.css"
  modified:
    - "src/styles/globals.css"
    - "tailwind.config.js"
    - "src/main.tsx"
decisions:
  - "Motion tokens declared once in :root only, NOT duplicated under .dark (D-16 — theme-agnostic)"
  - "Exactly 3 keyframes shipped (fade-in, slide-up, pop-in); shimmer/pulse-glow deferred to Phase 11 (D-17)"
  - "Universal selector (*, *::before, *::after) for reduced-motion guard (D-18 — covers Radix + future code)"
  - ".stagger-children utility implemented as delay container, not its own keyframe (D-17 4th roadmap item)"
  - "Tailwind extension uses single-quoted strings to match existing 'var(...)' style (D-19)"
  - "Pre-existing transition: all 150ms cubic-bezier rule at line ~358 left in place per D-20 (Phase 11 owns standardization)"
metrics:
  duration: "2m 42s"
  completed_date: "2026-04-17"
  task_count: 3
  file_count: 4
  insertions: 72
  deletions: 0
  commits: 3
---

# Phase 07 Plan 02: Animation Primitives (FOUND-04) Summary

Shipped the v1.1 motion foundation — CSS variable tokens (durations + easings) inside `globals.css :root`, a new `animations.css` stylesheet with 3 shared keyframes plus a stagger-children delay utility, the universal-selector `prefers-reduced-motion` guard that pre-empts PITFALLS I2, and the `tailwind.config.js` theme extensions that surface every primitive as a Tailwind utility class. No existing component was rewired — Phase 11 microinteractions own adoption.

## Tasks Executed

| Task | Name                                                                 | Commit    | Files                                                       |
| ---- | -------------------------------------------------------------------- | --------- | ----------------------------------------------------------- |
| 1    | Add motion tokens + reduced-motion guard to globals.css              | `5f8ceed` | `src/styles/globals.css`                                    |
| 2    | Create animations.css keyframe stylesheet + import from main.tsx     | `9ec7fd2` | `src/styles/animations.css`, `src/main.tsx`                 |
| 3    | Extend tailwind.config.js with motion utilities                       | `cd68451` | `tailwind.config.js`                                        |

## Bytes Added per File

| File                       | Insertions | Deletions | Final Lines | Notes                                                                                              |
| -------------------------- | ---------: | --------: | ----------: | -------------------------------------------------------------------------------------------------- |
| `src/styles/globals.css`   |         19 |         0 |         413 | 6 lines (motion tokens) inside `:root` + 10 lines (reduced-motion stanza) appended at EOF + comments |
| `src/styles/animations.css` |        26 |         0 |          26 | NEW — header comment, 3 `@keyframes` blocks, `.stagger-children > *` selector                      |
| `tailwind.config.js`       |         26 |         0 |          95 | 4 new `theme.extend` blocks: transitionDuration, transitionTimingFunction, keyframes, animation     |
| `src/main.tsx`             |          1 |         0 |          21 | Single side-effect `import "./styles/animations.css"` immediately after globals.css                |
| **Total**                  |     **72** |     **0** |             |                                                                                                    |

## Verification Results

### Automated Grep Checks (per task)

**Task 1 — globals.css:**

- `grep -c "^    --motion-fast: 150ms;$" src/styles/globals.css` → `1`
- `grep -c "^    --motion-med:  300ms;$" src/styles/globals.css` → `1`
- `grep -c "^    --motion-slow: 500ms;$" src/styles/globals.css` → `1`
- `grep -cF '    --ease-out-smooth: cubic-bezier(0.22, 1, 0.36, 1);' src/styles/globals.css` → `1`
- `grep -cF '    --ease-spring:     cubic-bezier(0.34, 1.56, 0.64, 1);' src/styles/globals.css` → `1`
- `grep -c "@media (prefers-reduced-motion: reduce)" src/styles/globals.css` → `1`
- `grep -c "transition-duration: 0.01ms !important;" src/styles/globals.css` → `1`
- `grep -c "scroll-behavior: auto !important;" src/styles/globals.css` → `1`
- Universal selector pairing check (SC#4 guard): `grep -B1 "animation-duration: 0.01ms !important" src/styles/globals.css | grep -cE "\*,\s*\*::before,\s*\*::after"` → `1`
- `.dark` rule still single instance: `grep -c "\.dark {" src/styles/globals.css` → `1`
- Pre-existing `transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1);` rule unchanged → `1`

**Task 2 — animations.css + main.tsx:**

- `test -f src/styles/animations.css` → exists
- `grep -c "^@keyframes fade-in" src/styles/animations.css` → `1`
- `grep -c "^@keyframes slide-up" src/styles/animations.css` → `1`
- `grep -c "^@keyframes pop-in" src/styles/animations.css` → `1`
- `grep -cE "^@keyframes " src/styles/animations.css` → `3` (no extras leaked in)
- `grep -cF '.stagger-children > *' src/styles/animations.css` → `1`
- `grep -c "@apply" src/styles/animations.css` → `0` (pure CSS, no Tailwind directives)
- `grep -c "@tailwind" src/styles/animations.css` → `0`
- File length: 26 lines (≥18 line minimum)
- main.tsx import order: `grep -A1 'styles/globals.css' src/main.tsx | grep -c 'styles/animations.css'` → `1`

**Task 3 — tailwind.config.js:**

- `grep -c "transitionDuration:" tailwind.config.js` → `1`
- `grep -c "transitionTimingFunction:" tailwind.config.js` → `1`
- `grep -c "var(--motion-fast)" tailwind.config.js` → `1`
- `grep -c "var(--motion-med)" tailwind.config.js` → `4` (≥4 required)
- `grep -c "var(--motion-slow)" tailwind.config.js` → `1`
- `grep -c "var(--ease-out-smooth)" tailwind.config.js` → `3` (≥2 required)
- `grep -c "var(--ease-spring)" tailwind.config.js` → `2` (≥2 required)
- `grep -c "'fade-in':" tailwind.config.js` → `2` (one in keyframes, one in animation)
- `grep -c "'slide-up':" tailwind.config.js` → `2`
- `grep -c "'pop-in':" tailwind.config.js` → `2`
- `grep -c "tailwindcss-animate" tailwind.config.js` → `1` (preserved)
- `grep -cE "shimmer|pulse-glow" tailwind.config.js` → `0` (no Phase 11 leakage)
- `darkMode: ['class']` unchanged → `1`

### Build & Bundle Probes

- `npm run build` → exit 0 across all 3 task verifications.
- `dist/assets/index-*.css` byte size:
  - **Pre-Plan-02 baseline** (after Task 1, before animations.css): `62.84 kB` (`gzip 11.15 kB`)
  - **Post-Task-2** (animations.css bundled): `63.17 kB` (`gzip 11.25 kB`) — **delta +330 bytes** (+0.10 kB gzipped) confirming Vite resolved and bundled `animations.css`.
  - **Post-Task-3** (tailwind extensions added): `63.17 kB` — unchanged because Tailwind JIT only emits utilities that are actually referenced in JSX; `animate-fade-in`, `duration-fast`, etc. will materialize when first used in Phase 11 components.
- `grep "@keyframes fade-in" dist/assets/index-*.css` → `1` (confirms keyframes bundled in compiled CSS).
- `git diff package.json` → no changes (zero new dependencies — uses existing Tailwind v3 + tailwindcss-animate).

### Reduced-Motion Verification (Roadmap SC#4 — text confirmation)

The reduced-motion stanza was verified by static analysis rather than a live devtools probe:

- The universal selector `*, *::before, *::after` directly precedes the `animation-duration: 0.01ms !important` line — confirmed by the `grep -B1` regression guard above. This selector pattern is the recommended a11y-first form (per WCAG SC 2.3.3 / `prefers-reduced-motion` MDN guidance) and matches the literal stanza specified in PITFALLS I2.
- The four `!important` overrides (animation-duration, animation-iteration-count, transition-duration, scroll-behavior) collectively neutralize: (a) Tailwind utility transitions (`transition-all duration-300`), (b) the existing `transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1)` rule on interactive elements, (c) Radix Popover/AlertDialog open/close animations, (d) the `html { scroll-behavior: smooth }` rule at line 148.
- A live devtools probe (`getComputedStyle(document.documentElement).getPropertyValue('--motion-med')` returning `' 300ms'`, plus DevTools Rendering → Emulate `prefers-reduced-motion: reduce` showing instantaneous transitions) is recommended at Phase 11 kickoff when the first `animate-*` utility actually lands in JSX. This plan only ships the inventory; there is no animated component yet to visually verify against.

## Decisions Made

1. **Theme-agnostic motion tokens (D-16):** Declared the 5 motion vars once inside `:root` only — explicitly NOT duplicated under `.dark`. Motion duration/easing has no theme variant; the cascade handles dark mode automatically. Verified by checking `.dark { ... }` block remains a single occurrence.
2. **Exactly 3 keyframes shipped (D-17):** `fade-in`, `slide-up`, `pop-in` only. The roadmap's 4th item ("stagger-in") is implemented as the `.stagger-children > *` delay container, NOT a 4th keyframe — this matches the documented D-17 pattern and prevents Phase 11 lock-in. `shimmer`, `pulse-glow`, `spring-feedback`, `crossfade` are deferred to Phase 11 per CONTEXT `<deferred>`.
3. **Universal-selector reduced-motion stanza (D-18):** Uses `*, *::before, *::after` with four `!important` declarations. Necessary to override Tailwind utility classes, inline styles, third-party Radix transitions, and the pre-existing global `transition: all 150ms` rule. This is the only architecturally sound place for the override (PITFALLS I2 mitigation).
4. **Tailwind keyframes mirror animations.css (D-19):** Tailwind JIT requires both `keyframes:` and `animation:` extension entries to emit `animate-*` utility classes correctly. The two declarations are byte-identical; browsers deduplicate. Single-quoted strings throughout match existing `'var(--color-bg)'` style.
5. **Pre-existing transition rule preserved (D-20):** The `transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1)` rule on `button, input, select, textarea, [role="button"]` at line ~358 was deliberately NOT touched. D-20 defers the standardization-to-tokens migration to Phase 11; this plan ships the primitives, not the adoption.
6. **Side-effect import order (load-bearing):** `animations.css` is imported in `main.tsx` immediately after `globals.css`. Order matters because Tailwind utilities downstream resolve `--motion-*` / `--ease-*` references at runtime — those tokens must be defined before any consuming stylesheet loads.

## Deviations from Plan

None — plan executed exactly as written. All file edits matched the literal CSS/JS snippets provided in the plan; all grep acceptance criteria pass on first run; build succeeded on first attempt for each task.

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes introduced. Pure CSS/Tailwind theme extensions and a side-effect stylesheet import. No threat flags.

## Known Stubs

None. Every artifact is fully wired:

- Motion tokens flow from `:root` → Tailwind config (CSS var refs) → utility classes → DOM at runtime.
- Keyframes are bundled in the compiled CSS (verified via `grep dist/assets/index-*.css`).
- Reduced-motion stanza is the last rule in `globals.css` and is shipped to production.
- The `main.tsx` side-effect import is loaded on every app boot.

The fact that no Phase 7 component currently uses `animate-fade-in` / `duration-fast` is by design (D-20 — Phase 11 owns adoption), not a stub. The primitives are immediately usable; the next code that wants a keyframe animation gets it for free.

## Self-Check: PASSED

**Files created:**

- `src/styles/animations.css` — `FOUND: src/styles/animations.css`

**Files modified (verified via git diff stats):**

- `src/styles/globals.css` — `FOUND` (+19 lines)
- `tailwind.config.js` — `FOUND` (+26 lines)
- `src/main.tsx` — `FOUND` (+1 line)

**Commits exist on current branch:**

- `5f8ceed` — `FOUND: feat(07-02): add motion tokens and reduced-motion guard to globals.css`
- `9ec7fd2` — `FOUND: feat(07-02): add animations.css with shared keyframes and import from main.tsx`
- `cd68451` — `FOUND: feat(07-02): expose motion utilities in tailwind.config.js`

**Build:** `npm run build` exits 0; `dist/assets/index-*.css` contains `@keyframes fade-in`; `package.json` unchanged.

All success criteria from the plan satisfied.
