# Stack Research — v1.1 Daily Driver (Additions Only)

**Project:** Chronicle AI (MemoryLane) — privacy-first Tauri desktop journaling app
**Milestone:** v1.1 Daily Driver
**Researched:** 2026-04-16
**Confidence:** HIGH

---

## Scope

This document covers **only the stack additions/changes needed for v1.1 Daily Driver**. The v1.0 stack (Tauri 2, React 19, TypeScript 5.8, Vite 7, SQLite+FTS5 via `@tauri-apps/plugin-sql`, Zustand 5, TipTap 3, Tailwind v3, shadcn/ui v2.3.0, Ollama HTTP client, Inter+Fraunces fonts, PBKDF2 via Web Crypto, File System Access API) is **locked** and not revisited. See prior v1.0 research for core stack rationale.

Five questions are answered below. Every recommendation is grounded in what is already in `package.json` so dependency count stays minimal per user constraint.

---

## Summary of Recommendations

| # | Feature Area | Recommendation | Add a dep? |
|---|--------------|----------------|------------|
| 1 | Animations + microinteractions | **CSS-only via Tailwind + `tailwindcss-animate` (already present)**; add `motion` (ex-Framer Motion) **only if** a specific interaction needs spring physics or layout animations | **No** preferred / one optional dep |
| 2 | Mood trends chart | **Custom SVG sparkline/bar chart** (~40 lines, zero deps) | **No** |
| 3 | Onboarding tour | **Custom React component** using existing Radix Popover | **No** |
| 4 | Date utilities for streak | **`date-fns@4.1.0` (already installed)** — all needed functions present | **No** |
| 5 | Auto-tag Ollama prompts | **Extend `src/lib/ollamaService.ts`** with `generateTagSuggestions()` using Ollama native `format` JSON Schema field against `llama3.2:3b` | **No** |

**Net new runtime dependencies if all recommendations taken: 0** (one optional: `motion` for animations).

---

## 1. Animation Library — CSS First, `motion` Only If Needed

### Recommendation: CSS + `tailwindcss-animate` (already installed)

The codebase already has `tailwindcss-animate@1.0.7` (used by shadcn/ui for Popover/AlertDialog enter/exit). The existing code already uses Tailwind transitions generously — see `OverviewView.tsx`:

```tsx
className="transition-all duration-300 hover:-translate-y-0.5"
className="transition-transform duration-200 group-hover:translate-x-0.5"
```

For the v1.1 microinteraction pass — hover lifts, FAB pulse, stat-card reveals, tag color picker pop, page fade-ins, mood selector feedback — **Tailwind's `transition-*` / `animate-*` utilities plus a handful of custom `@keyframes` in `globals.css` cover every target animation** without adding a runtime dep.

**What's already possible with the current toolchain:**
- Enter/exit animations: `tailwindcss-animate` provides `data-[state=open]:animate-in`, `fade-in-0`, `zoom-in-95`, `slide-in-from-*`
- Hover / focus microinteractions: `transition-transform`, `hover:-translate-y-0.5`, `hover:shadow-*`, `group-hover:*`
- Loading states: `animate-pulse`, `animate-spin`
- Staggered reveals: arbitrary `animation-delay` values
- Spring-feel easing: custom `cubic-bezier` in `tailwind.config.js` `theme.extend.transitionTimingFunction`

### When to Add `motion` (ex-Framer Motion)

Add **`motion@^12.38.0`** **only if** one of these shows up in execution:

- Layout animations for dashboard widgets re-arranging
- Shared-element transitions between timeline and editor
- Spring physics that CSS `cubic-bezier` can't match (mood selector "squish", FAB open/close)
- `AnimatePresence`-style unmount animations for dismissible coachmarks in onboarding

**Important:** the package was renamed from `framer-motion` to `motion` in 2025 when it became independent from Framer. Use `motion`, not `framer-motion`. The old package still works but is in maintenance-only mode.

**If added:**
- Install: `npm install motion@^12.38.0`
- Import path: `import { ... } from "motion/react"` (NOT `"framer-motion"`)
- Use `LazyMotion` + `domAnimation` feature bundle — drops bundle cost from ~32KB gzip to ~4.6KB gzip for initial render
- Import `m.` component (not `motion.`) inside `LazyMotion` to get the smaller bundle

```tsx
import { LazyMotion, domAnimation, m } from "motion/react";

<LazyMotion features={domAnimation} strict>
  <m.div animate={{ opacity: 1 }} transition={{ duration: 0.2 }} />
</LazyMotion>
```

### Why NOT Motion One (`@motion/dom`, ~3.8KB)

- **Imperative**, not declarative — does not play well with React's render model
- No layout animations, no `AnimatePresence`, no React-idiomatic API
- Savings (~10KB vs `motion` + `LazyMotion`) do not justify the DX cost
- The Motion team itself recommends `motion` (the React wrapper) for "99% of React developers" (per their own docs)

### Why NOT React Spring

- Heavier bundle than `motion` + `LazyMotion`
- Hook-based API has steeper learning curve for simple transitions
- Springs are nice but we don't need them for most v1.1 animations (200–300ms eases are fine)

### Tauri compatibility

Both `motion` and `tailwindcss-animate` are pure web — no Tauri integration required. WebView2 (Windows) and WKWebView (macOS/Linux) both have full WAAPI support, so `motion`'s hardware-accelerated animations work identically to a browser.

### React 19 compatibility

`motion@12.x` fully supports React 19.1 (current version in `package.json`). No peer-dep friction.

---

## 2. Charting Library for Mood Trends — Custom SVG, No Dep

### Recommendation: Hand-rolled SVG component

**The mood trends widget on the Overview is a single 30-day sparkline or small bar chart with 5 mood categories.** This does not justify pulling in a charting library.

### What we're actually drawing

The v1.1 spec shows mood counts over 30 days, 5 discrete categories (`great / good / okay / bad / awful`). The existing `MoodOverview.tsx` already renders something similar from `moodCounts: Record<string, number>`. The trend widget is a bar-per-day heatstripe, a category-count bar chart, or a line of mood-dots over time. All three are **< 50 lines of SVG**.

**Recommended implementation:**

```tsx
// src/components/charts/MoodTrendChart.tsx
interface Props { counts: Record<string, number>; max: number }
export function MoodTrendChart({ counts, max }: Props) {
  const moods = ["great", "good", "okay", "bad", "awful"] as const;
  return (
    <svg viewBox="0 0 300 120" className="w-full h-[120px]">
      {moods.map((mood, i) => {
        const h = ((counts[mood] ?? 0) / max) * 100;
        return <rect key={mood} x={i * 60} y={110 - h} width={50} height={h}
                     fill={`var(--color-mood-${mood})`} rx={6} />;
      })}
    </svg>
  );
}
```

Smaller than any charting-library bar chart, respects the existing CSS-variable palette, and doesn't commit the app to a library with its own design vocabulary. Scales easily to a 30-day sparkline by iterating over `eachDayOfInterval` from `date-fns`.

### Why NOT Recharts

- **Bundle cost:** ~40KB gzip (v3.8.1 per Bundlephobia) — doubles what v1.1's whole feature set will add
- **React 19 status:** Recharts has had a rough ride with React 19 (issue #4558 open ~2 years); v3.x has landed support but requires `react-is` version pinning. Fragile for an app that was clean on React 19 out of the box.
- **Overkill:** Recharts ships 20+ chart types, tooltips, legends, axes — none of which we need for one dashboard widget

### Why NOT Visx

Visx is the "modular, only what you import" answer — around 15–30KB gzip per chart. But:
- Still 3–5 packages pulled in (`@visx/shape`, `@visx/scale`, `@visx/group`, etc.)
- D3-primitive design means you end up writing as much code as raw SVG
- For a 5-bar chart, Visx is strictly more work than hand-rolling

### Why NOT Chart.js / Victory / Nivo / D3 full

- Canvas-based (Chart.js) — harder to style with our CSS variable system
- Victory — comparable footprint to Recharts, no ecosystem advantage
- Nivo — heavier than Recharts, opinionated
- D3 full — 70KB+; we don't need the toolkit for one chart

### When to revisit

If a future milestone (v1.2+) adds a full insights dashboard with multi-series charts, stacked areas, legends, tooltips, **Recharts** becomes the right answer — it's the shadcn/ui ecosystem's de facto chart layer (`shadcn/charts` uses Recharts underneath). Defer until then.

---

## 3. Onboarding Tour — Custom React Component, No Dep

### Recommendation: Custom component using Radix Popover (already installed)

The first-run onboarding described in v1.1 is a 3–5 step tour: welcome → sample entry → feature tour (sidebar, editor, search). **This is a linear wizard, not a general-purpose "tour library" problem.**

### What we already have

- `@radix-ui/react-popover@^1.1.15` — anchored overlays with precise positioning
- `@radix-ui/react-alert-dialog@^1.1.15` — modal-style welcome screen with focus trap
- `@radix-ui/react-tooltip@^1.2.8` — smaller hover tooltips if needed
- Zustand 5 — store for tour step state (`onboardingStore`)
- shadcn `Popover` — already styled, matches app theme

### Recommended approach

A `<TourStep>` component wrapping Radix `Popover`, targeting elements by `data-tour-step="sidebar"` attribute, showing step N of M with Next/Previous/Skip, persisting completion to `localStorage` or SQLite `settings` table. Roughly 150 lines total for the whole onboarding controller.

**Store sketch:**

```ts
// src/stores/onboardingStore.ts
interface OnboardingState {
  currentStep: number | null;   // null = not active
  completed: boolean;
  start(): void;
  next(): void;
  skip(): void;
  reset(): void;                // for "Show tour again" in Settings
}
```

Target elements register via `data-tour-step` attributes on existing components — no refactor required.

### Why NOT React Joyride

- **7.6k stars, 400K weekly downloads — but heavy:** ~45KB gzip, pulls in `react-floater`, `scroll-parent`, etc.
- **Uses inline styles throughout** — clashes with Tailwind/CSS-variable theming; cannot style via design tokens without overriding all internal components
- **Its own portal/overlay system** duplicates what Radix already gives us

### Why NOT Shepherd.js / React-Shepherd

- **Framework-agnostic core** means extra React bridge (~30KB total)
- Ships its own CSS — would need to override to match theme
- Marginally better style customization than Joyride, still heavier than a custom Radix-based tour

### Why NOT Driver.js (1.4.0)

- **Lightweight (~5KB gzip, zero deps) — the best option if we rejected the custom route**
- However: its overlay is managed outside React's tree, which can conflict with Radix portals, focus management, and Tauri's frameless window. Reported z-index and focus-trap issues when combined with Radix modals.
- For 3–5 steps, the integration cost is roughly equal to writing it ourselves against Radix — and the custom path keeps onboarding visually coherent with the rest of the app.

### Why NOT Onborda / other shadcn-native tour libs

- Onborda is Next.js-specific and less mature
- shadcn/ui has not shipped an official tour primitive

### What NOT to do

- Do not write onboarding as a chain of `<Dialog>`s — users need to see the actual UI behind coach marks
- Do not pin tour-step elements via global CSS selectors (brittle); use `data-tour-step` attributes

---

## 4. Date Utilities for Streak Calculation — `date-fns@4.1.0` (Already Present)

### Recommendation: Use what's already there

`date-fns@^4.1.0` is already a dependency and actively used across the codebase. The WIP `OverviewView.tsx` already imports exactly the functions needed:

```ts
import { format, formatDistanceToNow, startOfDay, subDays } from "date-fns";
```

Its `calculateDayStreak()` helper already correctly implements streak logic:
1. Build a `Set` of `yyyy-MM-dd` strings from entry `created_at`
2. Walk backwards from today (`startOfDay(new Date())`) via `subDays(cursor, 1)` until a gap

**All functions needed for v1.1 dashboard date math are available in `date-fns`:**

| Function | Use Case |
|----------|----------|
| `format(date, "yyyy-MM-dd")` | Stable day key for streak Set |
| `startOfDay(date)` | Normalize entry timestamps to day boundary |
| `subDays(date, n)` | Walk streak backwards |
| `formatDistanceToNow(date, {addSuffix: true})` | "2 hours ago" on recent entry cards |
| `isSameDay(a, b)` | On This Day matching across years |
| `getMonth(date)`, `getDate(date)` | On This Day cross-year lookup |
| `differenceInDays(a, b)` | "Longest streak" stat |
| `eachDayOfInterval({start, end})` | 30-day mood trend axis |

### Critical edge case to flag

Current `calculateDayStreak()` **does not handle timezone changes.** If the user travels or DST shifts, `startOfDay` produces inconsistent day keys across entries written in different TZs. Mitigation: `created_at` is stored as UTC epoch (already done), and the local-day key is derived via `format(startOfDay(new Date(e.created_at)), "yyyy-MM-dd")` in the **local** TZ — which is what the WIP code already does. Cross-TZ edge cases deferred; flagged in PITFALLS research.

### What NOT to add

- **Day.js** — comparable size, but we already have `date-fns` and its functional API is a better fit for this codebase
- **Luxon** — heavier (~70KB vs `date-fns` ~12–30KB tree-shaken), overkill
- **Moment.js** — deprecated, bloated, mutable dates
- **`date-fns-tz`** — only needed if cross-TZ streak logic becomes a v1.2+ requirement

### Version compatibility

`date-fns@4.1.0` is the current stable (v4 API stabilized; v5 not yet released). Fully ESM, tree-shakeable, zero dependencies. Tauri WebView has all `Intl` APIs `date-fns` relies on.

---

## 5. Ollama Auto-Tagging — Native `format` Field with JSON Schema

### Recommendation: Extend existing `ollamaService.ts` with `generateTagSuggestions()`

The v1.0 `src/lib/ollamaService.ts` already has the HTTP-client scaffolding (`POST /api/generate`, error handling via try/catch, health check). Auto-tagging is an extension, not a new integration.

### Use Ollama's native structured outputs (not free-text parsing)

Since Ollama 0.5 (Dec 2024), the API supports a `format` field that takes a **JSON Schema object** (not just `"json"`). The model is constrained at the token-sampling level to produce schema-valid JSON — dramatically more reliable than parsing free-text responses.

**Recommended request format (against `llama3.2:3b`):**

```ts
export async function generateTagSuggestions(
  content: string,
  existingTags: string[]
): Promise<string[]> {
  const response = await fetch(`${OLLAMA_BASE}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "llama3.2:3b",
      prompt: `Extract 1-5 relevant tags from this journal entry. Tags should be short (1-2 words), lowercase, and capture themes, activities, people, or emotions.

Prefer reusing these existing tags when relevant: ${existingTags.join(", ")}

Entry:
${content}

Respond with JSON matching the schema.`,
      stream: false,
      format: {
        type: "object",
        properties: {
          tags: {
            type: "array",
            items: { type: "string", minLength: 1, maxLength: 30 },
            minItems: 1,
            maxItems: 5,
          },
        },
        required: ["tags"],
      },
      options: { temperature: 0.2, top_p: 0.9 },
    }),
  });

  if (!response.ok) throw new Error(`Ollama tag request failed: ${response.statusText}`);
  const data = (await response.json()) as { response: string };
  const parsed = JSON.parse(data.response) as { tags: string[] };
  if (!Array.isArray(parsed.tags)) throw new Error("Invalid tags response");
  return parsed.tags.map((t) => t.toLowerCase().trim()).filter(Boolean);
}
```

### Model choice: `llama3.2:3b` (NOT `llama2:7b`)

The v1.0 code uses `llama2:7b` for RAG Q&A. For auto-tagging, **`llama3.2:3b` is a better fit:**

- **Half the RAM** (~2GB vs ~4GB) — keeps app responsive while user is writing
- **Better structured output reliability** than llama2 generation
- **Faster** — sub-second tag generation feels ambient rather than blocking
- Same Ollama endpoint, just a different `model` string

**Coordination with existing setup:** the Ollama setup wizard (`OllamaSetupWizard.tsx`) should additionally prompt for `llama3.2:3b` alongside the existing `llama2:7b` — or fall back gracefully to whatever LLM the user has pulled. This is a FEATURES/PITFALLS concern, flagged there.

### Key prompting patterns for v1.1

1. **Pass existing tags in the prompt** — lets the model prefer reusing tags over coining new ones (prevents tag-library explosion)
2. **Temperature 0.1–0.3** — tag extraction is classification-ish, not creative
3. **Use `format` JSON schema, NOT `format: "json"`** — the latter gives valid JSON but no shape enforcement; the former guarantees the shape
4. **Debounce** — fire auto-tag suggestions 2–3 seconds after user stops typing, not on every keystroke
5. **Idempotent UI** — show suggestions as dismissible chips, never auto-apply; user must accept
6. **Fire-and-forget** — never block the save flow on tag generation; degrade gracefully if Ollama is offline (same pattern as v1.0 semantic-search fallback)

### Why NOT add a new AI client library

- **`ollama-js`** (official JS SDK, ~15KB) — tempting, but the existing `fetch`-based client in `ollamaService.ts` is <100 lines and works. Adding `ollama-js` duplicates without value.
- **`langchain` / `llamaindex`** — massive over-engineering; we need a single `/api/generate` call with a schema, not chains/agents/memory
- **`instructor-js`** — nice Pydantic-like validation layer, but overkill for one `{ tags: string[] }` schema. A 3-line runtime check is sufficient.

### What NOT to do

- **Don't use `format: "json"`** (the old mode) without a schema — valid JSON but unconstrained shape
- **Don't rely on regex on free-text output** — the v1.0 RAG citation extractor (`\[Entry\s+([A-Za-z0-9]+)\]`) works for citations because those are stable markers; tagging needs actual structured output
- **Don't block the save/auto-save flow on tag generation** — fire-and-forget
- **Don't generate tags synchronously on keystroke** — debounce 2–3s after pause

### Version compatibility

- **Ollama server 0.5+** required for `format` JSON Schema — flag for PITFALLS (existing v1.0 users may need Ollama upgrade prompt)
- **`llama3.2:3b`** widely available on Ollama registry since late 2024
- No new npm dependency

---

## Installation

**If all recommendations are taken (zero new runtime deps):**

```bash
# Nothing to install. Everything needed is already in package.json.
```

**Optional: if microinteraction pass reveals CSS isn't expressive enough:**

```bash
npm install motion@^12.38.0
# IMPORTANT: import from "motion/react", NOT "framer-motion"
# framer-motion package is legacy; motion is the actively-maintained successor
```

**Optional: if a future milestone adds a real charting dashboard (NOT v1.1):**

```bash
npm install recharts@^3.8.1
# Defer to v1.2+; overkill for the single mood widget in v1.1
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| CSS + `tailwindcss-animate` | `motion@12.38.0` (ex-Framer Motion) | Layout animations, shared-element transitions, spring physics a future milestone needs |
| Custom SVG mood chart | `recharts@3.8.1` | v1.2+ when multiple complex charts (line, area, stacked, legends) are needed |
| Custom Radix Popover tour | `driver.js@1.4.0` | If onboarding expands to 10+ steps across deeply nested routes where a dedicated tour lib pays off |
| Custom Radix Popover tour | `react-joyride@2.x` | Only if team has existing Joyride experience and accepts bundle + inline-style constraint |
| `date-fns@4.1.0` (already present) | `Temporal` API polyfill | If targeting Temporal-native runtimes (not Tauri WebView2/WKWebView yet) |
| Hand-rolled Ollama `generateTagSuggestions` | `ollama-js` SDK | If many new Ollama features land that warrant a typed SDK (stream helpers, embeddings batching) |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `framer-motion` (the old package) | Renamed to `motion` in 2025; `framer-motion` is maintenance-only | `motion@^12.38.0` with `import { m, LazyMotion, domAnimation } from "motion/react"` |
| `react-spring` | Heavier than `motion` + `LazyMotion`; hook API overkill for CSS-grade transitions | CSS transitions or `motion` |
| Motion One (`@motion/dom`) standalone | Imperative, poor React fit; saves only ~10KB | `motion/react` + `LazyMotion` |
| `chart.js` / `react-chartjs-2` | Canvas-based (harder to style with CSS vars), heavy, poor React ergonomics | Custom SVG or Recharts if truly needed |
| `victory` | Similar footprint to Recharts without the ecosystem advantages | Custom SVG or Recharts |
| `nivo` | Heavier than Recharts, opinionated | Custom SVG |
| `d3` (full package) | 70KB+ gzip; we don't need the full toolkit for one chart | Hand-rolled SVG + `date-fns` for axis labels |
| `react-joyride` | ~45KB gzip; inline styles fight Tailwind/CSS-variable theming | Custom Radix Popover tour |
| `shepherd.js` / `react-shepherd` | Extra React bridge; own CSS to override | Custom Radix Popover tour |
| `intro.js` | Restrictive license for commercial use; dated API | Custom Radix Popover tour |
| `moment.js` | Deprecated, bloated, mutable dates | `date-fns` (already installed) |
| `luxon` | Heavier than `date-fns`; unnecessary for v1.1 needs | `date-fns` (already installed) |
| `dayjs` | Comparable to `date-fns` but we already have `date-fns` everywhere | `date-fns` (consistency) |
| `ollama-js` SDK | Duplicates the already-working `fetch` client | Extend `ollamaService.ts` directly |
| `langchain` / `llamaindex` | Massive over-engineering for a single structured-output call | Direct `/api/generate` with `format` schema |
| Ollama `format: "json"` (unschemaed) | No shape guarantees; still requires runtime validation | `format: <JSON Schema object>` (Ollama 0.5+) |
| Recharts in v1.1 | Pulls in ~40KB gzip + `react-is` pinning for one widget; React 19 has had friction | Custom SVG until multi-chart dashboard ships |

---

## Stack Patterns by Variant

**Preferred path — zero new deps:**
- Animation: Tailwind utilities + custom `@keyframes` in `src/styles/globals.css`
- Chart: `src/components/charts/MoodTrendChart.tsx` — 30-line SVG
- Tour: `src/components/onboarding/TourStep.tsx` + `src/stores/onboardingStore.ts` using Radix Popover
- Streak: extend `calculateDayStreak` already in `OverviewView.tsx` — no changes needed
- Tags: new function in `src/lib/ollamaService.ts`: `generateTagSuggestions(content, existingTags): Promise<string[]>`

**If microinteraction pass reveals CSS isn't expressive enough:**
- Add `motion@^12.38.0`
- Use `LazyMotion` + `domAnimation` globally in `App.tsx`
- Use `m.` (not `motion.`) prefix for components
- Bundle cost: ~4.6KB gzip for `LazyMotion` + `domAnimation`

**If a future milestone adds a real charting dashboard (NOT v1.1):**
- Add `recharts@^3.8.1` + pin `react-is@^19.1`
- Migrate `MoodTrendChart` to Recharts `<BarChart>` for consistency
- Budget ~40KB gzip

---

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `motion@12.x` (if added) | `react@19.1` | No breaking changes from `framer-motion@11`; import path is `motion/react` |
| `motion@12.x` (if added) | Tauri 2 WebView2/WKWebView | Pure web; WAAPI supported in both; hardware acceleration works |
| `tailwindcss-animate@1.0.7` (present) | `tailwindcss@3.4.x` (present) | Already working in v1.0; do NOT upgrade Tailwind to v4 (shadcn/ui v2.3.0 requires v3 — carried v1.0 decision) |
| `date-fns@4.1.0` (present) | `react@19.1`, Tauri WebView | Fully ESM, zero deps |
| Ollama `format` JSON Schema | Ollama server 0.5+ | Setup wizard pulls current Ollama; existing v1.0 users may need upgrade prompt — flag for PITFALLS |
| `llama3.2:3b` model | Ollama 0.3+ | Pulls ~2GB; keep `llama2:7b` for RAG Q&A as-is |
| `recharts@3.8.1` (if ever added) | `react@19.1` | Requires `react-is@19.x` pin; don't mix with React 18 |
| `@radix-ui/react-popover@1.1.15` (present) | `react@19.1` | Used today for shadcn Popover; reuse for onboarding tour |

---

## Integration Points with Existing Stack

| v1.1 Concern | Integration Point | Notes |
|--------------|-------------------|-------|
| Animation enter/exit | `tailwindcss-animate` via shadcn/ui `Popover` and `Dialog` already configured | Add `data-[state=open]:animate-in` classes |
| Animation hover lifts | Existing pattern in `OverviewView.tsx` (`hover:-translate-y-0.5`) — extend to `StatCard.tsx`, `TimelineCard.tsx` | No new deps |
| Mood chart | Drop-in or sibling to existing `MoodOverview.tsx` | New file `src/components/charts/MoodTrendChart.tsx` |
| Onboarding tour | New `onboardingStore.ts`; Radix Popover targets via `data-tour-step` attrs on `Sidebar.tsx`, `EntryEditor.tsx`, `SearchView.tsx` | Trigger on first-run (new gate: `!hasSeenTour` alongside v1.0 `isPinSet` null guard); reset via Settings |
| Streak calc | Existing `calculateDayStreak()` in `OverviewView.tsx` | Consider extracting to `src/lib/dateHelpers.ts` for reuse if a "longest streak" stat lands |
| Auto-tag suggestions | Extend `src/lib/ollamaService.ts` with `generateTagSuggestions()`; UI hook in `TagInput.tsx` or sibling suggestion bar | Debounced 2–3s after typing pause; dismissible chips; never auto-apply; graceful fallback when Ollama offline |
| Tag color picker | Tailwind-only (CSS gradient swatches + a preset palette in `src/lib/paletteData.ts` — already exists) | No new deps; reuse existing `paletteData.ts` |

---

## Sources

- [Motion & Framer Motion upgrade guide](https://motion.dev/docs/react-upgrade-guide) — HIGH: official rename + migration guide
- [motion npm package](https://www.npmjs.com/package/motion) — HIGH: v12.38.0 confirmed stable as of Mar 2026
- [Reduce bundle size of Framer Motion/Motion](https://motion.dev/docs/react-reduce-bundle-size) — HIGH: LazyMotion 4.6KB confirmed
- [Should I use Framer Motion or Motion One?](https://motion.dev/blog/should-i-use-framer-motion-or-motion-one) — HIGH: official guidance from Motion team
- [Comparing the best React animation libraries for 2026 — LogRocket](https://blog.logrocket.com/best-react-animation-libraries/) — MEDIUM: cross-reference
- [Framer Motion vs Motion One mobile performance 2025 — React Libraries](https://www.reactlibraries.com/blog/framer-motion-vs-motion-one-mobile-animation-performance-in-2025) — MEDIUM
- [Best React chart libraries (2025 update) — LogRocket](https://blog.logrocket.com/best-react-chart-libraries-2025/) — MEDIUM: Recharts bundle size + ecosystem
- [Recharts React 19 support issue #4558](https://github.com/recharts/recharts/issues/4558) — HIGH: known React 19 friction
- [recharts v3.8.1 Bundlephobia](https://bundlephobia.com/package/recharts) — HIGH: confirmed ~40KB gzip
- [npm-compare recharts / visx / chart.js / d3 / react-vis](https://npm-compare.com/@visx/visx,chart.js,d3,react-vis,recharts) — MEDIUM: side-by-side
- [Best Open-Source Product Tour Libraries in 2026 — Userorbit](https://userorbit.com/blog/best-open-source-product-tour-libraries) — MEDIUM: Shepherd/Joyride/Driver.js landscape
- [Evaluating tour libraries for React — Sandro Roth](https://sandroroth.com/blog/evaluating-tour-libraries/) — MEDIUM: Joyride inline-style limitation, styling friction
- [Driver.js installation docs](https://driverjs.com/docs/installation) — HIGH: v1.4.0 confirmed, zero deps, ~5KB
- [5 Best React Onboarding Libraries in 2026 — OnboardJS](https://onboardjs.com/blog/5-best-react-onboarding-libraries-in-2025-compared) — MEDIUM: comparison context
- [date-fns documentation (v4)](https://date-fns.org/) — HIGH: v4.1 API stable, all needed helpers present
- [Ollama Structured Outputs (official docs)](https://docs.ollama.com/capabilities/structured-outputs) — HIGH: HTTP API `format` field JSON schema syntax
- [Structured outputs blog post — Ollama](https://ollama.com/blog/structured-outputs) — HIGH: official launch post (Dec 2024)
- [Ollama API reference (GitHub)](https://github.com/ollama/ollama/blob/main/docs/api.md) — HIGH: canonical HTTP API
- [A Practical Guide to Using Ollama's Structured JSON Output](https://lucianoayres.github.io/blog/2024/12/08/A-Practical-Guide-to-Using-Ollama-Structured-JSON-Output.html) — MEDIUM: usage patterns
- Local file `C:\Users\Jason\Dev\MemoryLane\package.json` — HIGH: ground truth for existing deps
- Local file `C:\Users\Jason\Dev\MemoryLane\src\lib\ollamaService.ts` — HIGH: existing Ollama integration (prior art for `generateTagSuggestions`)
- Local file `C:\Users\Jason\Dev\MemoryLane\src\components\OverviewView.tsx` — HIGH: WIP dashboard starting point, streak helper
- Local file `C:\Users\Jason\Dev\MemoryLane\.planning\STATE.md` — HIGH: v1.0 carried decisions (Tailwind v3 pin, shadcn v2.3.0 lock)

---
*Stack research for: Chronicle AI v1.1 Daily Driver (additions only)*
*Researched: 2026-04-16*
*Confidence: HIGH — library versions verified via npm/official docs; integration claims grounded in local codebase*
