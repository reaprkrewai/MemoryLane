# Pitfalls Research — v1.1 Daily Driver

**Domain:** Tauri + React + SQLite desktop journaling app — adding dashboard, onboarding, auto-tagging, microinteractions, and tag color picker on top of an existing, shipped v1.0 MVP.
**Researched:** 2026-04-16
**Confidence:** HIGH — grounded in current repo state (`src/stores/entryStore.ts`, `tagStore.ts`, `OverviewView.tsx`, `001_initial.sql`), v1.0 `PITFALLS.md`, and decisions carried over in `.planning/STATE.md`.

**Scope note:** These are **integration pitfalls** for a brownfield milestone — not greenfield. Existing patterns in the codebase (module-level timers, L2-normalized embeddings, WAL-mode SQLite, shadcn-on-Tailwind-v3, tag `color` column already present) are assumed and must not be broken. v1.0 `PITFALLS.md` remains authoritative for infrastructure-level traps; this file covers what's new in v1.1.

---

## Critical Pitfalls

### C1: Dashboard re-render storm — widgets thrashing on every auto-save

**What goes wrong:**
`OverviewView` currently subscribes via `useEntryStore((s) => s.allEntries)` and recomputes `stats`, `moodCounts`, and `recentEntries` with `useMemo` over `allEntries`. But every `saveContent` call rewrites `allEntries` with a **new array reference** (see `entryStore.ts:156` — `allEntries: state.allEntries.map(...)`). Because TipTap debounces saves to 500ms and the interval timer fires every 5s, the dashboard re-runs all widget memos **constantly** while a user types in the editor — even though the dashboard isn't visible.

Once 7 widgets are wired in (stat cards, mood chart, On This Day, recent, prompts, AI insights, streak), this scales from "costly" to "visibly janky" when returning to the overview.

**Why it happens:**
- Zustand re-runs every subscribing component when the selected slice identity changes, regardless of mount state.
- Array `.map()` always produces a new reference — even if every row is identical, `useMemo([allEntries])` invalidates.
- Recharts specifically re-renders on prop identity changes, not deep equality — data passed inline will thrash charts on every auto-save.

**How to avoid:**
1. **Split the store subscriptions.** Don't select `allEntries` for widgets that only need aggregates. Add derived selectors to `entryStore` that return primitive stats computed once per write:
   ```ts
   // in entryStore — maintain alongside allEntries on every mutation
   totalEntries: number;
   wordsWritten: number;
   dayStreak: number;
   moodCounts: Record<string, number>;
   ```
   Widgets subscribe to the primitive they need. Numbers are `===` comparable — no re-render when unchanged.
2. **Gate dashboard work on visibility.** `OverviewView` should early-return when `activeView !== 'overview'` — or better, mount-unmount via `App.tsx` routing so it doesn't exist in the tree while editing.
3. **Memoize Recharts data outside render.** Wrap chart data in `useMemo` keyed on the **aggregate** (e.g. `moodCounts`), not `allEntries`. Pass stable callback refs via `useCallback`.
4. **Respect the existing `flushAndClearTimers()` contract.** Any dashboard work triggered by entry mutations must run *after* the save settles, not on every debounce tick.

**Warning signs:**
- React DevTools Profiler shows `OverviewView` committing during editor typing
- CPU spikes in Task Manager above 5% while typing in editor with overview mounted
- Mood chart "flickers" or axis labels jitter during rapid edits
- Unit test: `render(<OverviewView />); fireEvent.type(editor, "...")` — widget components rerender > 1 time

**Phase to address:**
Dashboard phase (Phase A) — establish derived-state pattern in `entryStore` **before** wiring the first widget. Retrofitting selectors after 7 widgets exist means 7 component refactors.

---

### C2: N+1 dashboard queries on first paint

**What goes wrong:**
Each widget naively issues its own SQL:
- Stat cards: `SELECT COUNT(*) FROM entries`, `SELECT SUM(word_count)`, streak calc
- Mood chart: `SELECT mood, created_at FROM entries WHERE created_at > ?`
- On This Day: `SELECT * FROM entries WHERE strftime('%m-%d', ...) = ?`
- Recent: `SELECT * FROM entries ORDER BY created_at DESC LIMIT 3`
- Writing prompts: no DB
- AI insights: embeddings query
- Tags count: `SELECT COUNT(*) FROM tags` or JOIN

That's 5–6 independent DB hits on mount. Worse, if widgets call `loadTags()` / `loadPage()` in their own `useEffect`, **each widget re-fetches**. And because the existing `tagStore.loadTags()` does a `LEFT JOIN ... GROUP BY` across `entry_tags`, calling it 3x is wasteful.

v1.0 Pitfall C1 (SQLite busy lock) becomes real again: 5 concurrent SELECTs colliding with an auto-save UPDATE = `SQLITE_BUSY` despite WAL mode.

**Why it happens:**
- Widget encapsulation mentality — each component "owns" its data fetch
- Copy-paste from existing views (`OverviewView.tsx` already calls both `loadPage()` and `loadTags()`)
- Dashboard performance looks fine with 50 entries; breaks at 2000+

**How to avoid:**
1. **Single aggregation query at the view level.** `OverviewView` issues ONE composed query (or 2-3 at most) on mount, feeds results down as props. Example:
   ```sql
   SELECT
     COUNT(*) AS total,
     COALESCE(SUM(word_count), 0) AS words,
     MAX(created_at) AS latest
   FROM entries;
   ```
2. **Reuse `allEntries` in memory** for stats that can be computed client-side (word count sum, streak) — the timeline already loads entries into Zustand. Don't re-query what's already in memory.
3. **On This Day needs its own query** (by design — it spans years, not "recent"). Keep it scoped: `WHERE strftime('%m-%d', created_at/1000, 'unixepoch') = strftime('%m-%d', 'now') AND created_at < date_of_today_start_ms`.
4. **Index check:** v1.0 already has `idx_entries_created` on `created_at`. Verify before adding new indexes — duplicate indexes hurt write performance.
5. **One `useEffect` per view, not per widget.** Dashboard mounts → fetches aggregates → passes down. Widgets are pure presentational.

**Warning signs:**
- Network tab / SQL profiling shows >3 SELECTs on overview mount
- "database is locked" errors reappear (v1.0 C1 territory)
- Overview paints data progressively (stats, then mood, then On This Day) instead of atomically
- First paint lag > 300ms on 1000+ entry test DB

**Phase to address:**
Dashboard phase (Phase A), query layer — establish the data-fetching contract in the same plan that creates OverviewView, not after widgets are built.

---

### C3: Streak calculation wrong for traveling users and DST transitions

**What goes wrong:**
Current `calculateDayStreak` in `OverviewView.tsx:26` uses `format(startOfDay(new Date(e.created_at)), "yyyy-MM-dd")` — this formats in the **browser's current timezone at render time**, not the timezone the entry was written in. Three broken cases:

1. **Spring-forward DST:** `subDays(cursor, 1)` on the DST transition day returns a timestamp that — when `startOfDay()`-ed — may land on the wrong calendar date in the browser's zone. `date-fns` `subDays` is calendar-aware but `startOfDay` still depends on local offset.
2. **Traveling users:** User writes on 2026-04-15 in New York (23:30 local = `created_at` UTC timestamp). They fly to Tokyo. On 2026-04-16 Tokyo morning, that UTC timestamp formats as `2026-04-16` — streak accidentally extended. Or inverse: writing pre-midnight in Tokyo, traveling to LA, streak accidentally lost.
3. **1000+ entries:** `Set` over all entries on every render is O(n) per render. Fine at 100 entries, visible lag at 5000.

This is the classic "streak rage" failure mode that makes users quit journaling apps.

**Why it happens:**
- `new Date(e.created_at)` silently uses local TZ
- Naive day-diff assumes 24h = 1 day (DST breaks this)
- UTC storage + local rendering without explicit TZ intent

**How to avoid:**
1. **Store entry's local day at write time.** Add `local_date TEXT` column (format `YYYY-MM-DD` in the user's TZ at moment of write) and `tz_offset_min INTEGER`. Streak queries use `local_date` directly — no re-formatting, no DST confusion.

   Migration safety: backfill existing entries with `strftime('%Y-%m-%d', created_at/1000, 'unixepoch')` as best-effort (UTC day). Document that pre-migration streaks may be off by one day per entry created near midnight UTC — acceptable for v1.0 data.
2. **Streak from SQL, not JS.** Push the set-of-dates query to SQLite:
   ```sql
   SELECT DISTINCT local_date FROM entries ORDER BY local_date DESC LIMIT 365;
   ```
   Then the streak calculation iterates at most 365 strings.
3. **Define "today" explicitly.** `const today = format(new Date(), 'yyyy-MM-dd')` at component mount, memoized — not recomputed per render.
4. **Guard the midnight edge.** If user writes at 23:58:57 and the streak calc runs at 00:00:02, they must not lose the streak. Cache `today` at mount, refresh only on navigation.
5. **Test matrix:** DST spring-forward day, DST fall-back day, user traveling across date line, user at UTC+14 vs UTC-12.

**Warning signs:**
- Users report "I wrote every day but the streak shows 3"
- Streak changes when timezone changes (laptop travel)
- Streak resets at midnight even though user wrote at 11:59pm
- On the twice-yearly DST day, streak calc returns wrong count

**Phase to address:**
Dashboard phase (Phase A), stat cards plan — **before** schema freeze. Adding `local_date` after the widget ships means a migration against a populated user DB.

References: [Trophy: Handling Time Zones in Global Gamification Features](https://trophy.so/blog/handling-time-zones-gamification), [moment-timezone DST jumps guide](https://momentjs.com/timezone/guides/).

---

### C4: Auto-tagging overwhelm + hallucination

**What goes wrong:**
Naive flow: user finishes writing → send content to Ollama → get JSON array of tags → display. Four failure modes:

1. **Hallucination of tags not in taxonomy.** LLM invents `"contemplation"` when the user's tag bank is `reflection, mindful, quiet`. User now has two semantically identical tags polluting autocomplete and search filters.
2. **Over-suggestion.** LLM returns 12 tags for a 200-word entry. User faces decision fatigue, dismisses all → feature mortally wounded on first use.
3. **Auto-accept.** Worst path: suggestions apply silently. User now has tags they didn't choose; Ollama's creative day yields `"existential-dread"` on an entry about buying groceries. Undoing is friction.
4. **Latency.** User stops typing → 800ms debounce → 3-8 second Ollama call → suggestions appear while user has already navigated away. Or worse, UI blocks.

**Why it happens:**
- LLM cannot quantify confidence without calibration ([LLM4Tag, 2025](https://arxiv.org/html/2502.13481v2))
- JSON-schema constrained output still hallucinates when schema doesn't lexically enumerate allowed values
- Prompt says "suggest tags" without bounding — model maximizes recall
- Embedding comparison + LLM combo not obvious from docs

**How to avoid:**
1. **Constrain to existing taxonomy first.**
   - Pass the **full current tag list** in the prompt: "You MUST choose 0–3 tags from this exact list: [reflection, mindful, work, family, ...]. Output JSON array of strings present in this list. Do not invent new tags."
   - Use Ollama's `format: "json"` + a JSON schema that restricts output to an enum — the most effective hallucination guard ([Function Calling + JSON Constraints, 2024](https://medium.com/@bhagyarana80/how-i-solved-hallucination-in-llms-using-function-calling-and-json-constraints-a7af60f9cb60)).
   - Post-filter: drop any suggestion not in the existing tag list.
2. **Cap suggestions at 3.** Hard cap in the prompt AND in code. More suggestions = fewer accepts.
3. **Two-tier: existing tags vs new.**
   - Tier 1 (default): suggest only existing tags. Low hallucination risk.
   - Tier 2 (opt-in, per-suggestion): "Also create a new tag" — clearly marked, requires explicit click.
4. **Always preview, never auto-apply.** Suggestions appear as chips below the tag row with `+` button per suggestion. One-click accept, one-click dismiss-all. Never batch-apply.
5. **Latency UX:** Trigger on entry *save* (post-debounce), not per-keystroke. Show skeleton chip placeholders. Ollama unavailable → widget hides silently (no error toast per v1.0 convention — `.planning/STATE.md` "graceful fallback to keyword search when Ollama unavailable").
6. **Rate-limit:** Don't re-query on every save. Trigger once per "writing session" — e.g. when word count delta > 50 since last suggestion, or on blur.
7. **Respect opt-out.** Settings toggle "Suggest tags automatically" (default off for first release to avoid surprise).

**Warning signs:**
- Tag autocomplete grows to 50+ tags after 2 weeks (hallucination leakage)
- Users report "tags I never added"
- `usage_count` for LLM-suggested tags is always 1 (users create but never re-use)
- P95 suggestion latency > 5 seconds

**Phase to address:**
Auto-tagging phase. Build constrained-taxonomy prompt + JSON-schema enum in the first plan. Ship disabled-by-default with settings toggle.

---

### C5: First-run onboarding — dismissal state loss and DOM fragility

**What goes wrong:**
Three failure modes for first-run onboarding in an already-installed app:

1. **Dismissal state resets on install.** Storing "onboarding completed" in localStorage persists across version upgrades on the same install — but Tauri's `localStorage` is scoped to the webview, not the user. A fresh install on a new machine shows onboarding again (often desired), but a **reinstall** (support scenario, corrupt cache) shows it again when the user has 2 years of entries. Deeply irritating.
2. **Tour steps break when DOM changes.** `react-joyride` and `shepherd.js` target CSS selectors. Renaming a class or restructuring a component silently breaks the tour — no type error, no test failure, users see a tooltip pointing at nothing. [React Joyride is known broken on React 19](https://onboardjs.com/vs/react-joyride).
3. **Skip/restart flow forgotten.** User skips tour, regrets it → no way to re-trigger. Or user is halfway through, closes app, restart behavior unclear.

**Why it happens:**
- localStorage seems durable; users forget it's app-state, not user-state
- Onboarding library choice optimizes for "copy-paste demo", not long-term DOM drift
- Skip/restart is a separate code path rarely designed upfront

**How to avoid:**
1. **Store onboarding state in SQLite `settings` table, not localStorage.** Schema already has a `settings` key-value store (see `loadAutoSaveInterval` pattern). Key: `onboarding_completed_at`. This also survives an `app.db` restore from JSON export.
2. **Distinguish "new user" from "new install".** An install with > 0 entries is not a new user — auto-skip onboarding for existing journalers. Check `SELECT COUNT(*) FROM entries` before showing.
3. **Use `data-onboarding="step-name"` attributes, not CSS classes.** Refactoring `.btn-primary` → `.button-primary` breaks class selectors silently; data attributes are grep-able and survive className churn.
4. **Test the tour in CI.** Playwright/Vitest test that mounts each step's target selector, fails if the element isn't in the DOM. Catches drift early.
5. **Ship "Restart tour" button** in Settings → Help. One SQL: `DELETE FROM settings WHERE key = 'onboarding_completed_at'`. Essential for support.
6. **Consider alternatives to tour libraries.** For a 3-5 step onboarding, a **self-contained modal sequence** (single component, explicit steps) is more robust than `react-joyride`. No DOM selector coupling. No library maintenance risk.
7. **Respect existing WIP.** Commit `b9af497` already has WIP dashboard. Onboarding must not break the "empty state" branch — it's the most-viewed screen for new users.

**Warning signs:**
- Bug reports: "onboarding keeps appearing"
- Tour tooltip points at empty space (DOM drift)
- Screenshots in bug reports show tour on screens it wasn't designed for
- Settings has no "restart onboarding" — support asks users to delete app data

**Phase to address:**
UX Polish phase. Decide library vs custom **before** writing the first step. Settings-based persistence from the first plan — migration pain later.

References: [React Joyride is broken on React 19](https://onboardjs.com/vs/react-joyride), [5 Best React Onboarding Libraries 2026](https://onboardjs.com/blog/5-best-react-onboarding-libraries-in-2025-compared).

---

## Important Pitfalls

### I1: Recharts mood chart re-render loops

**What goes wrong:**
Passing inline `data={entries.filter(...).map(...)}` to `<LineChart>` creates a new array every render. Recharts uses deep-compare in some paths but prop identity in others — result: chart re-draws axis, re-animates, re-lays-out on every parent render. Visible as "flickering" axis or sluggish hover.

**How to avoid:**
1. `useMemo` the chart data array keyed on a stable dependency (`moodCounts` aggregate, not `allEntries`).
2. `useCallback` any `dataKey`, `tickFormatter`, or custom tooltip.
3. For sparse data (mood not logged every day), **pre-fill missing days** with `null` or `0` so the x-axis doesn't jump — Recharts draws gaps as straight interpolation lines by default, which misleads users.
4. Disable animations during typing: `isAnimationActive={!isEditorActive}`.
5. At 365+ points, switch from `<LineChart>` to `<AreaChart>` with sampled data (one point per week beyond 30 days) — [Recharts perf guide](https://recharts.github.io/en-US/guide/performance/).

**Phase:** Dashboard phase, mood chart plan.

References: [Recharts Performance Optimization](https://recharts.github.io/en-US/guide/performance/), [Recharts is slow with large data #1146](https://github.com/recharts/recharts/issues/1146).

---

### I2: Microinteraction battery drain and a11y violation

**What goes wrong:**
Desktop Tauri apps inherit webview GPU behavior. Continuous CSS animations (spinning gradients, looping blur pulses, infinite `animate-ping`) keep the compositor awake — measurable battery drain on laptops (reported by users of similar apps). Worse: violating `prefers-reduced-motion` for users with vestibular disorders or migraines is a WCAG violation and an instant 1-star review.

Existing `OverviewView.tsx` already uses `transition-all duration-300` and hover translates — these are event-driven, fine. The risk is when decorative ambient motion gets added (glow pulses, floating particles, gradient animations on stat cards).

**How to avoid:**
1. **Global `@media (prefers-reduced-motion: reduce)` rule** in `globals.css` that disables all `animation` and `transition` (duration → 0.01ms). One stanza protects the whole app:
   ```css
   @media (prefers-reduced-motion: reduce) {
     *, *::before, *::after {
       animation-duration: 0.01ms !important;
       animation-iteration-count: 1 !important;
       transition-duration: 0.01ms !important;
       scroll-behavior: auto !important;
     }
   }
   ```
2. **No infinite animations on by default.** FAB pulse, gradient shimmer, etc. — only on hover/focus, not ambient.
3. **Framer Motion caveat:** if adopted, use `MotionConfig` with `reducedMotion="user"` globally. Raw `<motion.div>` does NOT automatically honor the preference.
4. **Respect `will-change` budget.** Each `will-change` promotes to GPU layer. Apply sparingly — especially not on `StatCard` × 4 simultaneously.
5. **Visibility API:** Pause decorative animations when window hidden (`document.visibilityState === 'hidden'`). Saves battery during background.

**Warning signs:**
- Fans spin while overview is visible
- Laptop battery stats show Chronicle AI as high energy impact
- Accessibility audit (axe-core) flags motion violation
- Users with vestibular issues report nausea

**Phase:** Microinteractions phase. Global stanza in the same plan as the first animation.

References: [prefers-reduced-motion MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion), [web.dev: prefers-reduced-motion](https://web.dev/articles/prefers-reduced-motion).

---

### I3: Tag color picker — migration, contrast, and meaning-through-color

**What goes wrong:**
The `tags` table already has a `color TEXT` column (per `tagStore.ts:11`, `TAG_COLORS` palette is round-robin-assigned on creation). Three pitfalls:

1. **Contrast failure on theme switch.** A color that looks good on white background (e.g. `#FEF3C7` pale amber) is invisible on dark mode. Hard-coded palette doesn't account for light/dark contrast.
2. **Color as sole meaning.** Users with color blindness (8% of men) can't distinguish `#EF4444` (red) from `#22C55E` (green) if those are the only differentiator. WCAG 1.4.1 violation.
3. **Migration of pre-existing tags.** v1.0 tags already have colors (round-robin assigned). Changing palette or allowing custom colors must not break or reset existing assignments. Existing entries' tag pills must render identically after the picker ships.

**How to avoid:**
1. **Dual-tone palette.** Each palette entry has `{ base, bg, text }` — base color for the dot, bg for pill background (with adequate luminance), text color that contrasts with bg on both themes. Precompute for light/dark pairs.
2. **Keep the icon/label.** Tag pills show `#text` always — color is accent, not identity. Color-blind users can read.
3. **Lock the palette to 8 values.** Existing `TAG_COLORS` constant. Custom hex input is tempting but multiplies accessibility risk. Ship fixed palette first.
4. **Migration safety:**
   - Existing tags retain their color. Don't re-run round-robin assignment.
   - If palette expands, new colors append — old indices remain stable.
   - Default for NULL `color` (shouldn't exist, but defensive): picker shows "Pick a color" instead of crashing.
5. **Preview in context.** Color picker shows the pill *as it will appear in timeline* on both light/dark backgrounds side-by-side. Prevents "looked fine in picker, invisible in use".
6. **Update paths:** `updateTagColor` in tagStore already exists. Ensure it triggers re-render of tag pills everywhere (timeline cards, filter bar, entry editor) — verify by grepping `tag.color` usage.

**Warning signs:**
- Tag pill invisible on one theme
- axe-core flags "color contrast" on tag pills
- Users report "my tags changed color after the update" (accidental re-assignment)
- Tag color flash on update (no optimistic UI)

**Phase:** Tag color picker phase. Migration test in the first plan (assert existing tags unchanged post-update).

---

### I4: On This Day — no entries and year boundary bugs

**What goes wrong:**
"On This Day" surfaces entries from this calendar day in prior years. Three edge cases:

1. **Leap day.** Feb 29 — prior-year entries don't exist. Naive query returns empty; widget shows empty state awkwardly forever for non-leap years. Decision: show Feb 28 or Mar 1? Must decide.
2. **First-year user.** User installed 3 months ago. "On This Day" always empty. Widget takes up dashboard real estate showing nothing. Embarrassing.
3. **Off-by-one TZ.** Same root cause as C3 — `strftime('%m-%d', created_at/1000, 'unixepoch')` uses UTC day. User in Tokyo who wrote at 20:00 local on 2025-04-15 has UTC timestamp on 2025-04-15 — correct. User in LA who wrote at 22:00 local on 2025-04-15 has UTC timestamp on 2025-04-16 — comparison to "today" in local TZ returns wrong day.

**How to avoid:**
1. **Use `local_date` column** (from C3 mitigation). On This Day queries `WHERE local_date LIKE '%-04-16' AND local_date < '2026-04-16'`. TZ-safe.
2. **Empty state is first-class.** Design from day one: "You haven't been here a year yet — check back on [today's date] 2027!" Inspirational, not apologetic. Don't hide the widget — promise future value.
3. **Leap day policy:** On Feb 29, include Feb 28 AND Mar 1 from non-leap years as well. Document the decision.
4. **Cap at 5 entries.** More than 5 gets scrolly — pick the most word-count-rich per year.

**Phase:** Dashboard phase, On This Day plan.

---

### I5: Writing prompts widget — staleness and repetition

**What goes wrong:**
Prompts shown from a static list: "What are you grateful for today?" User sees the same prompt every time they open the app — ignored after day 3. Or prompts are LLM-generated but re-generated on every mount — expensive, inconsistent.

**How to avoid:**
1. **Rotate deterministically.** `prompt_index = day_of_year % prompt_list.length`. Same prompt all day, new tomorrow, no storage needed.
2. **Large pool:** Minimum 60 prompts. Users shouldn't see repetition within 2 months.
3. **If LLM-generated:** cache one prompt per day. Key `prompt_YYYY-MM-DD` in settings. Ollama unavailable → fall back to static pool.
4. **Dismissible per-day.** User can click "Not today" — replaced with next in rotation. State cleared at midnight.
5. **Never LLM-generate prompts on entry content.** Feels surveillant. Generic prompts only.

**Phase:** Dashboard phase, prompts widget plan.

---

### I6: @fontsource bundle bloat and cold-start flash

**What goes wrong:**
STATE.md confirms Inter + Fraunces are wired via `@fontsource`. Two gotchas:

1. **All weights imported by default.** `import '@fontsource/fraunces'` without specifying weights/subsets pulls 10+ weight variants × multiple subsets = 2-3 MB added to bundle. Tauri cold start slows measurably.
2. **FOUT/FOIT on cold start.** Tauri webview loads the bundle, parses CSS, requests font files from the asset server. 200-500ms window where fallback (system sans) renders — then text reflows to Fraunces. Feels cheap.

**How to avoid:**
1. **Import only used weights.** `@fontsource/fraunces/400.css`, `@fontsource/fraunces/italic-500.css` — whatever is actually used. Audit with `grep font-display` across components.
2. **Variable font where available.** `@fontsource-variable/fraunces` is one file covering all weights — smaller total, no per-weight flash.
3. **`font-display: swap` explicitly.** Tauri webview honors it. Renders fallback first, swaps on load — prevents invisible text during load.
4. **Fallback stack matters.** Define in CSS: `font-family: "Fraunces", ui-serif, "Iowan Old Style", "Apple Garamond", Baskerville, "Times New Roman", serif;` — so fallback looks *close* to Fraunces before swap, minimizing reflow.
5. **Size budget:** Fonts should be < 500KB total. Measure with `vite-bundle-visualizer`.

**Phase:** Microinteractions/polish phase (or immediate — independent).

---

### I7: QuickWriteFAB — z-index, keyboard trap, focus styles

**What goes wrong:**
`QuickWriteFAB` (already a component per git status) is a floating action button. Three common failures:

1. **Covers content.** FAB sits bottom-right; covers the last recent-entry row on short viewports. Users can't tap underneath.
2. **No keyboard equivalent.** Tab-accessible? Tab order reasonable? Or floating in a portal outside the document flow — skipped entirely.
3. **Focus ring missing.** `outline: none` removed without replacement → keyboard users can't see focus.

**How to avoid:**
1. **Reserve bottom padding on scroll container** equal to FAB height + margin — so scrollToBottom reveals last content.
2. **Hide FAB when writing prompts/empty state's CTA is visible** — they serve same purpose, stacking looks noisy.
3. **Keyboard shortcut:** `Ctrl/Cmd+N` triggers new entry from anywhere. Document in onboarding.
4. **Focus ring always:** `focus-visible:ring-2 focus-visible:ring-primary`.
5. **`aria-label="New entry"`** since FAB often has icon only.

**Phase:** Dashboard phase, FAB plan.

---

### I8: Integration — breaking existing editor auto-save

**What goes wrong:**
Adding dashboard widgets that subscribe to entry state risks triggering `flushAndClearTimers` or `loadPage` at wrong times. The existing pattern (entryStore.ts:97-100) says `selectEntry` flushes pending saves before switching — a dashboard click like "Open entry X" must go through this path, not directly set `selectedEntryId`.

Specifically: `OverviewView.handleOpenEntry` currently uses `await selectEntry(id)` — correct. But future widget developers copying from a less-careful widget may bypass. Auto-tagging trigger point also matters — if triggered on `saveContent` completion, it must not race with another `saveContent` on a different entry.

**How to avoid:**
1. **Document the "enter editor" contract.** All entry-open paths (dashboard, timeline, search, On This Day, recent) MUST call `selectEntry`. Lint rule or code review checklist.
2. **Auto-tagging hook point.** Subscribe to `saveContent` completion (not `scheduleAutoSave` queue) so tag suggestions fire on persisted content, not in-flight. Use a dedicated event or Zustand subscription on `lastSavedAt`.
3. **Never call `setSelectedEntryId` directly from widgets** — always `selectEntry`.
4. **Regression test:** typing in editor while dashboard mounted does not corrupt entry content (v1.0 I3 territory).

**Phase:** Cross-cutting — flag in every plan that touches entry state.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Storing widget stats in React state, not Zustand | Quick to prototype one widget | Duplicated computation across widgets; no cache sharing; re-fetch on every mount | Never — derive in store from day 1 |
| Computing streak from `allEntries` on every render | No schema change | O(n) per render; wrong on TZ change | MVP demo only; before shipping, move to `local_date` + SQL |
| Auto-applying LLM tag suggestions | Feels magical in demo | User loses trust on first wrong tag; hallucinated tags pollute autocomplete | Never — always require explicit accept |
| Tour state in localStorage | Zero code to persist | Survives reinstall weirdly; doesn't transfer to JSON backup restore | Never for new features — use `settings` table |
| `outline: none` on custom buttons | Visually cleaner | A11y violation; keyboard users lost | Never — always provide `:focus-visible` replacement |
| Hard-coded tag palette with no contrast check | Ships fast | Invisible tags on dark mode; accessibility complaints | Only during prototype — ship with light/dark-aware tokens |
| Eager `@fontsource` import of all weights | One line of code | 2+ MB bundle bloat, cold-start flash | Never — specify weights explicitly |
| Widget-level `useEffect` DB fetches | Encapsulation | N+1 queries; busy-lock with save path | Never — one fetch per view, props down |
| Skipping `prefers-reduced-motion` | Ship animations fast | WCAG violation, vestibular harm | Never — global stanza is 6 lines |
| Trigger auto-tagging on keystroke | Live feel | Ollama thrashing, UI jank, battery drain | Never — trigger on save, rate-limited |

---

## Integration Gotchas (Brownfield — extending v1.0)

| Integration point | Common mistake | Correct approach |
|-------------------|----------------|------------------|
| **entryStore writes** | Widget subscribes to `allEntries`, recomputes on every save | Add derived primitive selectors (totalEntries, dayStreak) that update once per mutation |
| **Tag color migration** | Re-run color assignment on update (overwrites existing) | `updateTagColor` only — never rewrite existing tags' colors during migration |
| **Ollama availability** | Show error toast when Ollama off | Silent graceful fallback (v1.0 STATE.md pattern — "graceful fallback to keyword search when Ollama unavailable") |
| **Auto-save + auto-tag race** | Tag suggestion fires while save in-flight | Hook on `lastSavedAt` change in Zustand, not mid-debounce |
| **View switching** | Dashboard stays mounted during editor → re-renders on every save | Route at App.tsx level — unmount non-active views |
| **Existing FTS5 index** | Tag suggestions bypass FTS, run separate regex | Reuse FTS5 tokenizer for tag matching where possible (keyword extraction) |
| **Tauri capability JSON** | Adding Ollama endpoint without updating capabilities | v1.0 C2 — add capability entry in same commit as plugin use |
| **Window drag region** | Dashboard header gets `data-tauri-drag-region` → stat cards unclickable | v1.0 I4 — never drag-region an interactive container |
| **localStorage for onboarding** | "It's just a flag" | Use `settings` SQLite table — survives JSON restore, consistent with v1.0 settings pattern |
| **New DB column** | Add column, hope existing rows default fine | Explicit `DEFAULT` clause + backfill query in migration; test against 2000-row v1.0 DB |

---

## Performance Traps

| Trap | Symptoms | Prevention | When it breaks |
|------|----------|------------|----------------|
| Dashboard re-render on every keystroke | Editor typing feels laggy; fan spins | Split selectors, derive primitives, gate mount on `activeView` | Immediately — becomes critical above 2-3 widgets |
| N+1 widget DB queries | First paint > 500ms | Single view-level fetch, props down | 500+ entries |
| Streak `Set` over all entries per render | Dashboard scroll janks | Cache streak as primitive in store, compute in SQL | 5000+ entries |
| Recharts re-render loop | Axis flickers during typing | `useMemo` data, `isAnimationActive={false}` during edit | Any dataset |
| Font bundle eager-load all weights | Cold start > 2s | Explicit weight imports, variable fonts | Every start — instant visible cost |
| Ambient animations always running | Battery drain, GPU pegged | `prefers-reduced-motion` + visibility API pause | Continuous — noticed at ~10 min use |
| LLM tag suggestion on every keystroke | UI freezes, Ollama queue grows | Rate-limit to post-save, debounce 2-5s | First user with fast typing |
| Writing `updated_at` on every dashboard mutation | Write storm to `entries` table | Dashboard is read-only — never writes | Never should happen — flag in code review |
| Loading all photos for recent entries thumbnails | Memory spike | Lazy-load thumbnails; `loading="lazy"` | 100+ entries with photos |
| On This Day query without index on `local_date` | Slow widget paint | Index `local_date` when column added | 500+ entries |

---

## Security & Privacy Mistakes (v1.1 specific)

Beyond v1.0's E2E / local-only guarantees — new surface area from v1.1 features.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Auto-tagging prompt leaks entry content to logs | Accidental content persistence in Ollama debug logs | Disable Ollama verbose logging; audit `OLLAMA_DEBUG` env |
| Onboarding screenshots/analytics | Zero-network violation | No analytics ever — inherit from v1.0 SETT-04 |
| CDN-hosted fonts (Google Fonts) | Phones home on first paint | Only `@fontsource` local — already chosen, but verify no `<link>` tags introduced for "quick test" |
| LLM suggestion feedback "improve the model" | Sends content out | Never add — reject PRs that propose it |
| Writing prompts fetched from remote | Zero-network violation | Static bundled list OR local LLM — no `fetch()` |
| Tag-color hex input → stored SQL without validation | Not a real injection risk (parameterized) but malformed → UI breaks | Validate hex format: `/^#[0-9A-F]{6}$/i` before INSERT |
| Onboarding demo data leakage | Demo entries written to real DB | Onboarding never writes entries; first entry prompt only — user writes themselves |

---

## UX Pitfalls

| Pitfall | User impact | Better approach |
|---------|-------------|-----------------|
| "0 day streak" stat card on empty state | Demotivating — feels like failure before starting | Empty state: "Start your first streak" — no zero shown |
| Mood chart with < 3 data points | Uninformative line; looks broken | Don't render chart until ≥ 7 mood entries; show placeholder "Log mood for a week to see trends" |
| On This Day empty forever (year-0 user) | Widget always empty — real estate wasted | Copy: "Check back on [today] 2027 for memories"; or rotate to "Recent milestones" |
| Auto-tag suggestion appears after user navigated away | Surprising pill appears later | Only show suggestions while entry editor active |
| Tour restart hidden | Users who skip can't re-trigger | Settings → Help → "Replay tour" button |
| Animations on dashboard load stagger every widget | Feels janky, delays info | Coordinate entrance: all widgets fade in together, not cascading stagger |
| FAB text "+ New Entry" duplicated with header button | Confusion (which do I click?) | FAB on scrolled state only; header button primary on top |
| Color picker only shows swatches, not preview | User picks, surprise in timeline | Live preview pill as user hovers swatches |
| Onboarding forces account/sign-in | v1.0 is local-only — no account | Onboarding never asks for account; first screen is "Your first entry" |
| Stat cards click through to filtered timeline but no hint | Users don't discover | Subtle "→" icon on hover + cursor-pointer |
| Writing prompt counts as "started entry" | Creates empty ghost entries | Prompt → pre-fills editor content on first keystroke, not on prompt click |

---

## "Looks Done But Isn't" Checklist

Per feature, pre-ship verification:

**Dashboard:**
- [ ] Widgets re-render only when their own slice changes (React DevTools Profiler confirms)
- [ ] First paint < 300ms with 1000-entry test DB
- [ ] All widgets have empty states (no "undefined" or "NaN" visible)
- [ ] Stat cards click through to filtered timeline
- [ ] Dashboard unmounts when navigating to editor (or selectors fully isolated)

**Streak:**
- [ ] Test: user in Tokyo writes at 20:00 local, same day shows in streak
- [ ] Test: DST spring-forward day, streak continues
- [ ] Test: 2000 entries, streak renders < 50ms
- [ ] Test: midnight boundary — write at 23:59, streak includes today and yesterday

**Mood chart:**
- [ ] Chart doesn't re-render during editor typing
- [ ] Sparse data (3 days) renders without gap-line misleading interpolation
- [ ] Handles null/missing mood days correctly
- [ ] Light + dark theme contrast verified

**Onboarding:**
- [ ] Existing user (≥ 1 entry) never sees onboarding
- [ ] "Replay tour" button in Settings works
- [ ] Tour skipped in middle — no ghost tooltips remain
- [ ] Tour targets use `data-onboarding` attributes, not CSS classes
- [ ] Tested after a DOM refactor (class rename) that tour still works OR fails loudly

**Auto-tagging:**
- [ ] Off by default (settings toggle)
- [ ] Ollama unavailable → widget hidden silently (no error toast)
- [ ] Suggests only existing tags in Tier 1
- [ ] Max 3 suggestions always
- [ ] User can dismiss all with one action
- [ ] Suggestion latency P95 < 3s on reference Ollama 3B model
- [ ] Content is NOT logged or persisted outside the entry

**Microinteractions:**
- [ ] `prefers-reduced-motion` stanza in globals.css
- [ ] No ambient (infinite) animations on by default
- [ ] Animations pause when window hidden
- [ ] axe-core a11y audit passes

**Tag color picker:**
- [ ] Existing tags' colors unchanged after update (migration test)
- [ ] Each color visible on both light and dark backgrounds
- [ ] Tag labels readable even without color (color-blind simulator check)
- [ ] Preview shows pill as it appears in timeline
- [ ] Invalid hex rejected gracefully

**Integration:**
- [ ] Editor auto-save unaffected by dashboard mount
- [ ] No new "database is locked" errors under typing load
- [ ] JSON export/import round-trip includes v1.1 state (onboarding completion, streak column, tag colors)
- [ ] No new network requests (verify in Tauri devtools network panel — should be empty)

---

## Recovery Strategies

| Pitfall | Recovery cost | Recovery steps |
|---------|---------------|----------------|
| Dashboard render storm shipped | MEDIUM | Hot-fix: gate `OverviewView` render on `activeView === 'overview'`. Then refactor widgets to derived selectors. Ship within 1 week. |
| Streak wrong for existing users | HIGH | Add `local_date` column, backfill best-effort from UTC. Release note: "streak recalculated; prior streaks may shift ± 1 day". Accept one-time user grumble. |
| Auto-tags hallucinated into DB | HIGH | Audit query: `SELECT t.name, COUNT(et.*) FROM tags t LEFT JOIN entry_tags et ON et.tag_id=t.id WHERE t.name IN (suspect list) GROUP BY t.id`. Delete hallucinated tags via bulk UI. Tighten prompt. Retroactive cleanup requires user action. |
| Onboarding stuck on broken step | MEDIUM | Ship "Skip onboarding" button immediately; patch DOM selector in point release. Add CI test for selector presence. |
| Font bundle bloat detected post-ship | LOW | Patch import paths to specific weights. Ship in next minor. No migration needed. |
| Tag color invisible on dark mode | LOW-MEDIUM | Replace palette with dual-tone tokens. `updateTagColor` for any tag using deprecated value. User may need to re-pick 1-2 tags. |
| Animation causes vestibular complaint | MEDIUM | Emergency: add `!important` reduced-motion override for specific offending class. Then remove or soften animation. |
| Widget N+1 query triggers busy-lock | MEDIUM | Hot-fix: move widget's DB call behind existing view-level fetch. Increase `PRAGMA busy_timeout` to 10000 as belt-and-suspenders. |

---

## Pitfall-to-Phase Mapping

Assumes rough phase structure: **(A) Dashboard foundation & widgets → (B) Onboarding flow → (C) Auto-tagging → (D) Microinteractions polish → (E) Tag color picker** (phases may overlap; ordering per roadmap).

| Pitfall | Prevention phase | Verification |
|---------|------------------|--------------|
| C1 Dashboard re-render storm | A (foundation) | React DevTools Profiler — no dashboard commits during editor type |
| C2 N+1 dashboard queries | A (foundation) | DB query log on overview mount shows ≤ 3 queries |
| C3 Streak TZ/DST bugs | A (stat cards) | Unit tests: NY→Tokyo travel, DST boundary, leap day |
| C4 Auto-tagging hallucination | C (auto-tagging) | Prompt test fixtures: prompt returns only in-taxonomy tags |
| C5 Onboarding dismissal / DOM | B (onboarding) | Multi-install test; DOM refactor CI guard |
| I1 Recharts re-render | A (mood chart) | Profiler during editor type; no chart commits |
| I2 Motion a11y / battery | D (microinteractions) | axe-core pass; `prefers-reduced-motion` test |
| I3 Tag color contrast | E (color picker) | Light+dark visual diff test; migration test on v1.0 DB |
| I4 On This Day edge cases | A (OTD widget) | Empty-state test; leap-day test |
| I5 Prompts staleness | A (prompts widget) | Deterministic rotation test; 60+ prompt pool |
| I6 Font bundle | D (polish) OR independent | Bundle size check < 500KB for fonts |
| I7 FAB a11y | A (FAB widget) | Keyboard tab order + focus-visible verified |
| I8 Auto-save integration | Cross-cutting (every phase) | Regression: type while dashboard mounted — content persists correctly |

---

## Sources

- Repo state references:
  - `.planning/STATE.md` — "Decisions carried over from v1.0" (module-level timers, Tailwind v3 pin, `selectEntry` flush contract, graceful Ollama fallback)
  - `.planning/research/PITFALLS.md` (v1.0) — SQLite busy-lock, capability JSON, TipTap round-trip, FTS5 escape, popover z-index
  - `src/components/OverviewView.tsx` — current streak implementation (local-TZ naive)
  - `src/stores/entryStore.ts` — `allEntries` mutation pattern, auto-save timer contract
  - `src/stores/tagStore.ts` — existing `TAG_COLORS` palette and `updateTagColor` API
- External:
  - [Trophy: Handling Time Zones in Global Gamification](https://trophy.so/blog/handling-time-zones-gamification)
  - [moment-timezone DST jumps guide](https://momentjs.com/timezone/guides/)
  - [LLM4Tag: Automatic Tagging via LLMs (2025)](https://arxiv.org/html/2502.13481v2)
  - [Solving LLM Hallucination with Function Calling + JSON Constraints](https://medium.com/@bhagyarana80/how-i-solved-hallucination-in-llms-using-function-calling-and-json-constraints-a7af60f9cb60)
  - [web.dev: prefers-reduced-motion](https://web.dev/articles/prefers-reduced-motion)
  - [MDN: prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion)
  - [Recharts: Performance Optimization](https://recharts.github.io/en-US/guide/performance/)
  - [Recharts large-data issue #1146](https://github.com/recharts/recharts/issues/1146)
  - [React Joyride broken on React 19 (OnboardJS)](https://onboardjs.com/vs/react-joyride)
  - [5 Best React Onboarding Libraries 2026](https://onboardjs.com/blog/5-best-react-onboarding-libraries-in-2025-compared)
  - [Zustand re-render discussions #3228, #2642](https://github.com/pmndrs/zustand/discussions/3228)

---
*Pitfalls research for: Chronicle AI v1.1 Daily Driver — brownfield extension of shipped v1.0 MVP*
*Researched: 2026-04-16*
