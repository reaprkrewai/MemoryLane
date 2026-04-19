# Phase 9: First-Run Onboarding - Context

**Gathered:** 2026-04-18
**Status:** Ready for planning
**Mode:** Auto (smart discuss — Claude proposed 4 grey-area tables, user accepted all)

<domain>
## Phase Boundary

A brand-new Chronicle AI user — fresh install, zero entries, no PIN-skipping shortcuts — sees a 3-step welcome overlay before any app interaction is possible. **Step 1**: a focus-trapped Radix `AlertDialog` introducing the app and stating the privacy promise (on-device, local AI, no telemetry). **Step 2**: a translucent backdrop with a CSS-cutout spotlight on the Quick-Write FAB, explaining the one-click + `Ctrl/Cmd+N` write shortcut. **Step 3**: a final `AlertDialog` with two CTAs — primary "Write your first entry" (creates a blank entry, opens the editor) and secondary "I'll explore first" (closes overlay, lands on Overview). All three steps are skippable via a "Skip tour" footer link; skip and completion both write the same SQLite `settings` row (`onboarding_completed_at = unix-ms`). **Existing v1.0 users (any DB with `COUNT(entries) > 0`) are auto-seeded as completed during `initializeDatabase()`** so they never see the flow on their first v1.1 launch. A "Replay onboarding tour" button in a new Settings → Help section deletes the row and re-renders the flow from Step 1. **Ships ONBRD-01..07 only** — no microinteractions polish (Phase 11), no auto-tagging sparkle (Phase 10), no new dashboard widgets, no demo entries written by the app. The state machine, the spotlight CSS technique, and the migration seeding are the load-bearing grey areas resolved here.

</domain>

<decisions>
## Implementation Decisions

### State Machine & Gating (ONBRD-01, ONBRD-02, ONBRD-03, ONBRD-05)

- **D-01:** **Add `isOnboardingCompleted: boolean | null` to `useUiStore` mirroring `isPinSet`.** Same tri-state semantics: `null` = unknown (loading from settings), `true` = onboarded (skip overlay), `false` = needs onboarding (render overlay). Default initial value is `null`. Setter `setIsOnboardingCompleted(v: boolean | null)`. Mounted alongside `isPinSet` in [src/stores/uiStore.ts:34-35](src/stores/uiStore.ts#L34-L35). *Rationale: research/SUMMARY.md L70 mandates this exact pattern; mirrors a shipped + battle-tested v1.0 pattern; no new store needed.*

- **D-02:** **Render `<OnboardingOverlay />` at `App.tsx` top-level — above `AppShell`, alongside `<SettingsView />`.** Specifically: place it inside the State 6 (`isDbReady && !dbError && isPinSet === true && !isLocked`) branch, AFTER `<AppShell>{...}</AppShell>` but inside the same fragment, so it absolutely-positions over both `JournalView` and `SettingsView`. Conditional render gate: `isOnboardingCompleted === false`. *Rationale: SC #5 explicit requirement — overlay must overlay every top-level view including Settings (matters for "Replay tour" UX where overlay re-appears AFTER a click in Settings).*

- **D-03:** **Settings KV key = `onboarding_completed_at`** stored as a stringified unix-ms timestamp (matches `aiSettingsService.ts:42-44` `created_at`/`updated_at` write pattern). **Row presence == "user has been onboarded".** No second key, no boolean string, no separate "skipped" key. Skip and completion both call the same `markOnboardingCompleted()` helper. *Rationale: simplest correct shape; matches PITFALLS.md C5 fix #1; one query to check, one INSERT to set, one DELETE to replay.*

- **D-04:** **Migration seeding for v1.0 users runs inside `initializeDatabase()` after `MIGRATION_SQL`** as an idempotent statement: `INSERT OR IGNORE INTO settings(key, value, updated_at) SELECT 'onboarding_completed_at', CAST(? AS TEXT), ? WHERE (SELECT COUNT(*) FROM entries) > 0` with `[Date.now(), Date.now()]` bindings. **Atomic, idempotent, no race.** Lives next to the FOUND-03 `local_date` guarded ALTER ([src/lib/db.ts:167-179](src/lib/db.ts#L167-L179)) — same pattern, same rationale. Wrap in `if (import.meta.env.DEV) console.log("[db] Seeded onboarding_completed_at for existing-user install")` for diagnostic. *Rationale: SC #3 explicit; runs before any React mounting so the gate sees correct state on first read; idempotent so re-runs on every launch are harmless.*

- **D-05:** **Add `loadOnboardingState()` to a new `src/utils/onboardingService.ts`** that returns `Promise<boolean>` (true = completed, false = needs onboarding). Reads `SELECT value FROM settings WHERE key = 'onboarding_completed_at'`; returns `rows.length > 0`. Called from App's existing init `useEffect` (immediately after `getAppLock()` resolves) and writes via `setIsOnboardingCompleted(result)`. Mirrors `loadAIBackendPreference` shape exactly. *Rationale: keeps the store dumb (no DB calls in store actions); centralizes the SQL in one service file consistent with `aiSettingsService.ts` convention.*

- **D-06:** **First-load loader (State 6.5) when `isOnboardingCompleted === null`.** During the brief window between unlock and `loadOnboardingState()` resolution, render the same `<Loader2 size={24} className="animate-spin text-muted" />` block as State 3 (PIN check) with caption "Preparing your journal…". Prevents content-flash and pre-onboarding-write race. Add as a sibling render branch in App.tsx between State 5 (locked) and State 6 (content). *Rationale: SC #1 forbids "interaction is possible" before overlay renders; loader is the cleanest way to bridge the async gap without a hidden flash.*

- **D-07:** **`markOnboardingCompleted()` and `replayOnboarding()` helpers live in `onboardingService.ts`.** `markOnboardingCompleted()` → `INSERT OR REPLACE INTO settings(key, value, updated_at) VALUES('onboarding_completed_at', ?, ?)` + `setIsOnboardingCompleted(true)`. `replayOnboarding()` → `DELETE FROM settings WHERE key='onboarding_completed_at'` + `setIsOnboardingCompleted(false)`. Both async, both wrap in `try/catch` with `console.error` (matches `aiSettingsService.ts` pattern; UI errors are non-fatal). *Rationale: keeps SQL out of components; one source of truth for the completion contract.*

### Overlay UX Shape (ONBRD-01, ONBRD-04)

- **D-08:** **Mixed component strategy — Steps 1 + 3 = Radix `AlertDialog`, Step 2 = backdrop overlay + Radix `Popover`.** Both primitives are already in `src/components/ui/` (alert-dialog.tsx + popover.tsx). Step 1's privacy promise needs focus trap + escape-to-skip discoverability (AlertDialog handles); Step 3's CTA needs focus trap on the primary button (AlertDialog); Step 2 must NOT modal because users need to SEE the FAB they're being pointed at (research STACK.md L216 anti-pattern: "Do not write onboarding as a chain of `<Dialog>`s — users need to see the actual UI behind coach marks"). *Rationale: zero new deps; uses the right primitive for each step's intent.*

- **D-09:** **Step 2 spotlight = pure-CSS box-shadow cutout — no SVG, no clip-path.** Implementation: a fixed-position `<div>` whose `top/left/width/height` are recalculated each render from `document.querySelector('[data-onboarding="quick-write-fab"]')?.getBoundingClientRect()` via `useLayoutEffect` (re-runs on `window` resize via a ResizeObserver/`window.addEventListener("resize")` cleanup pair). The div has `box-shadow: 0 0 0 9999px rgba(0,0,0,0.6)` and `border-radius` matching the FAB's pill shape (`9999px`). The FAB itself remains interactive (z-index above the cutout) so users can click it from inside the spotlight to advance the tour. Scroll lock (`document.body.style.overflow = "hidden"`) added during Step 2 to prevent the FAB drifting out of the spotlight. *Rationale: simplest pixel-correct technique; no new deps; ResizeObserver is platform-native.*

- **D-10:** **Step indicator = "Step **N** of 3" text + 3 dots.** Placed in the modal/popover footer, left of the action buttons. Active dot uses `bg-accent` (amber via existing CSS variable), inactive dots use `bg-muted/40`. Dot size: `h-1.5 w-1.5 rounded-full`. Text size: `text-label text-muted`. *Rationale: minimal cognitive overhead; matches existing app typography scale; no progress bar (overweight for 3 steps).*

- **D-11:** **Animations = Phase 7's existing `fade-in` + `pop-in` keyframes from `animations.css`.** Backdrop and Popover use `animate-fade-in` (200ms). AlertDialog content uses `animate-pop-in` on enter. **No layout shift, no slide animations** (could compete with the spotlight repositioning math). Honors `prefers-reduced-motion` automatically via the FOUND-04 `@media` stanza already in animations.css — verified by toggling OS reduce-motion and seeing instant transitions. *Rationale: reuses Phase-7 primitives; keeps motion conservative for a "first impression" surface; a11y-correct out of the box.*

### Tour Content & Step Targets (ONBRD-01, ONBRD-04)

- **D-12:** **Step 2 has exactly ONE highlight target: the FAB (`data-onboarding="quick-write-fab"`).** Pointer copy: heading "**Start writing anytime**", body "Tap the **+** button — or press **Ctrl/Cmd + N** — to begin a new entry. Your dashboard updates as you write." No multi-target nested tour, no chained "next: stat cards → next: AI insights". *Rationale: SC #1 caps the flow at exactly 3 steps; multi-target Step 2 would balloon to 5+ steps and break the SC. Single-target keeps the tour scannable. The FAB already has `data-onboarding` attribute (Phase 8) — zero new attributes needed for the recommended target.*

- **D-13:** **Step 1 copy beats — locked.**
  - Heading: "**Welcome to Chronicle AI**"
  - Subheading: "Your life story, written for you." *(matches PROJECT.md tagline)*
  - Three privacy bullets, each with a small Lucide check icon (`<Check />` 14px in `text-accent`):
    1. "**Stays on your device** — nothing leaves your computer."
    2. "**AI runs locally** — built-in or Ollama, never the cloud."
    3. "**No accounts, no tracking, no telemetry.**"
  - Primary button: "Continue" → advances to Step 2.
  - Footer left: "Skip tour" link (muted) → calls `markOnboardingCompleted()`, closes overlay.
  *Rationale: anchors the privacy promise (the unique selling point per PROJECT.md) on the first screen the user ever sees. Three short bullets > one long paragraph; matches research/PITFALLS.md L450 "no analytics ever" spirit.*

- **D-14:** **Step 3 CTA behavior — primary creates entry + opens editor; secondary closes overlay only.**
  - Heading: "**Ready to begin?**"
  - Body: "Your first entry is the hardest. The next 365 are easier."
  - Primary button: "**Write your first entry**" → calls `useEntryStore.getState().createEntry()` → captures returned id → `useEntryStore.getState().selectEntry(newId)` → `useViewStore.getState().setActiveView("editor")` (or whatever the existing FAB flow uses — re-use `QuickWriteFAB`'s handler, do NOT duplicate the logic) → calls `markOnboardingCompleted()` → closes overlay.
  - Secondary button: "I'll explore first" → calls `markOnboardingCompleted()` → closes overlay → user lands on Overview.
  - Footer left: "Skip tour" link (same behavior as secondary, kept for consistency across all 3 steps).
  *Rationale: SC #1 mandates "Write your first entry" CTA; PITFALLS.md L455 explicitly forbids the app writing demo entries (privacy + clutter). Re-using the FAB's existing entry-creation flow guarantees behavioral parity (flush-pending-saves contract preserved, navigation event consistent).*

- **D-15:** **Skip control = "Skip tour" footer link on every step (left-aligned, `text-muted` underline-on-hover).** Same SQLite write as completion (`markOnboardingCompleted()`). **No corner X**, no icon-only dismiss — explicit text reduces accidental dismissal and improves accessibility (screen-readers announce "Skip tour" not "Close button"). *Rationale: PITFALLS.md C5 fix #1+#5 explicitly call out skippability + replay; consistent placement across all 3 steps means users always know where to find the exit.*

### Replay & Migration (ONBRD-04, ONBRD-06, ONBRD-07)

- **D-16:** **Replay scope = full re-run from Step 1.** "Replay onboarding tour" button → `await replayOnboarding()` (D-07 helper) → `setIsOnboardingCompleted(false)` → no manual navigation needed (the App.tsx render gate flips and overlay re-mounts at Step 1 automatically). Resets `currentStep` state to 0 implicitly via component re-mount. *Rationale: PITFALLS.md C5 fix #5; predictable, single-button UX; users wanting the privacy refresher get it.*

- **D-17:** **Replay button placement = new `<HelpSection>` between `<DataSection>` and the version footer in `SettingsView.tsx`.** Section icon: `<HelpCircle size={16} />` (Lucide). Single `<SettingRow label="Replay onboarding tour" description="Restart the welcome flow from the beginning">` containing a button styled identically to "Export Data" (same border-pill button class, no `<ChevronRight />`, label "Replay"). Click handler is async (await `replayOnboarding()`) with loading state via `useState<boolean>` + `<Loader2 className="animate-spin" />` swap (matches `handleExport` pattern at SettingsView.tsx:565). *Rationale: SC #4 explicit; existing SettingsView grammar reused; users know where to find Help/Tour controls (industry-standard placement at bottom of Settings).*

- **D-18:** **Tour targets resolve via `data-onboarding="..."` attributes — never CSS classes.** Phase 8 already added `data-onboarding="quick-write-fab"` to `QuickWriteFAB.tsx:17` and `data-onboarding="stat-cards"` to `OverviewView.tsx:107`. Phase 9 only needs the FAB target (D-12); no new `data-onboarding` attributes need to be added in this phase. *Rationale: SC #4 explicit; PITFALLS.md C5 fix #3 codifies the rule; Phase 8 already met us halfway.*

- **D-19:** **`OnboardingOverlay` mounts the `<AlertDialog open={...}>` declaratively** — `open` is bound to `isOnboardingCompleted === false && currentStep !== "done"`. Internal `useState<0 | 1 | 2 | "done">("done"-fallback)` tracks current step. When user advances past Step 3 OR clicks Skip, set step to `"done"` AND call `markOnboardingCompleted()` in the same handler. *Rationale: declarative open state plays well with Radix's controlled-component model; single state machine inside the overlay component; no escape-hatch race.*

- **D-20:** **`useGlobalShortcuts` Ctrl/Cmd+N must be a no-op while onboarding is active.** Add `isOnboardingCompleted === false` to the existing isTyping/isLocked guard list in `src/hooks/useGlobalShortcuts.ts`. Otherwise users could type `Ctrl+N` during the welcome modal and start writing without ever finishing the flow. *Rationale: same security/scope rationale as the locked-app gate (D-23 in Phase 8 CONTEXT); preserves the "no interaction is possible" SC #1 contract.*

### Claude's Discretion

- Exact pixel sizing of the spotlight cutout (8px padding around FAB? 12px? — planner picks; Phase 11 polish can adjust).
- Exact micro-copy on the "Step N of 3" indicator (could be "1/3", "Step 1 of 3", or "Step 1 · 3" — pick one for visual consistency).
- Whether the AlertDialog uses `max-w-md` or `max-w-lg` — driven by the privacy bullets layout.
- Lucide icon for the HelpSection — `HelpCircle` recommended but `LifeBuoy`, `BookOpen`, `Compass` all valid.
- Whether the spotlight backdrop is rgba(0,0,0,0.6) or rgba(0,0,0,0.5) — UX feel.
- Exact wording of dev-only diagnostic console.log lines.
- The `currentStep` state shape — discriminated union vs. number is implementation detail.
- Whether the "Replay" button shows a confirmation dialog before resetting (recommend NO; reset is cheap and non-destructive — just shows the tour again).

### Folded Todos

- **Phase 8 deferred note** "Phase 8 will add `data-onboarding` attributes opportunistically on stat cards, FAB, and OTD during widget build-out to make Phase 9's life easier" → confirmed shipped (FAB + stat-cards + writing-prompts + ai-insights all have `data-onboarding` per Phase 8 implementation). Phase 9 only needs the FAB target per D-12.
- **STATE.md** "OnboardingOverlay rendered at App.tsx level (above AppShell) — must overlay SettingsView too" → folded into D-02 as the explicit mount-point decision.
- **STATE.md** "Onboarding tri-state on uiStore (`isOnboardingCompleted: boolean | null`) — mirrors v1.0 `isPinSet` pattern" → folded into D-01.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 9 scope
- `.planning/REQUIREMENTS.md` §Onboarding — ONBRD-01..07 acceptance criteria
- `.planning/ROADMAP.md` §Phase 9: First-Run Onboarding — Goal, Depends on, Success Criteria (5 items), Requirements mapping

### Phase 7 + 8 primitives this phase builds on
- `.planning/phases/08-home-dashboard-widgets/08-CONTEXT.md` — Phase 8 D-22 (FAB `data-onboarding="quick-write-fab"` + focus ring + aria-label "New entry"); Phase 8 deferred note re: data-onboarding attributes
- `.planning/phases/07-foundation-derived-state/07-CONTEXT.md` — `animations.css` keyframes (`fade-in`, `pop-in`) + `prefers-reduced-motion` stanza (FOUND-04)
- `src/styles/animations.css` — fade-in (line 6), pop-in (line 16), reduced-motion @media stanza
- `src/components/QuickWriteFAB.tsx` — existing FAB with `data-onboarding="quick-write-fab"` (line 17); Phase 9 wraps the SAME entry-creation flow for Step 3 CTA
- `src/hooks/useGlobalShortcuts.ts` — Ctrl/Cmd+N handler; Phase 9 D-20 adds onboarding-active guard

### State machine + persistence patterns to mirror
- `src/stores/uiStore.ts:34-35,86,100` — `isPinSet: boolean | null` tri-state pattern (D-01 mirrors this verbatim)
- `src/utils/aiSettingsService.ts` — settings table read/write convention (D-05, D-07 follow this shape)
- `src/lib/db.ts:154-197` — `initializeDatabase()` MIGRATION_SQL + post-migration guarded statements (D-04 follows this pattern at the same call site)
- `src/App.tsx:50-73,177-207` — App init `useEffect` + state-machine render branches (D-02, D-06 modify this code)
- `src/components/SettingsView.tsx:557-585,587-627` — DataSection shape + main SettingsView composition (D-17 inserts HelpSection before version footer)

### Chronicle AI principles
- `.planning/PROJECT.md` — privacy-first promise (zero network, local AI, no telemetry); the Step 1 copy in D-13 anchors this directly
- `.planning/STATE.md` — v1.1 carried decisions (especially "Onboarding tri-state on uiStore" + "OnboardingOverlay rendered at App.tsx level")

### Research context (v1.1 authoritative)
- `.planning/research/SUMMARY.md` L20, L43, L70, L96, L113-115 — onboarding state in SQLite, 1-3 welcome screens, App.tsx state-machine integration, fragility fixes, Phase 3 delivery scope
- `.planning/research/STACK.md` §3 (lines 157-217) — custom Radix Popover/AlertDialog over tour libraries; rationale for NOT using react-joyride/shepherd/driver.js
- `.planning/research/PITFALLS.md` §C5 (lines 179-211) — three failure modes + six prevention rules (settings table, COUNT(entries) auto-skip, data-onboarding attrs, CI test, Settings replay button, modal sequence over tour libs)
- `.planning/research/PITFALLS.md` L450, L455, L467, L471, L500-505 — onboarding-specific anti-patterns and acceptance checklist

### UI primitives available (zero new deps required)
- `src/components/ui/alert-dialog.tsx` — Radix AlertDialog (focus trap, escape-to-close, overlay) — used for Steps 1 + 3
- `src/components/ui/popover.tsx` — Radix Popover (positioning, anchoring) — used for Step 2 spotlight content
- `src/components/ui/button.tsx` — shadcn button variants — primary/secondary CTAs
- `lucide-react` — `Check` (privacy bullets), `HelpCircle` (HelpSection icon), `Loader2` (loading state), `X` (NOT used — D-15 explicitly avoids corner X)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- [`src/stores/uiStore.ts`](src/stores/uiStore.ts) — `isPinSet: boolean | null` tri-state pattern (lines 34, 86, 100); D-01 adds `isOnboardingCompleted` mirroring this exactly. ZERO refactor cost.
- [`src/utils/aiSettingsService.ts`](src/utils/aiSettingsService.ts) — `loadAIBackendPreference()` / `saveAIBackendPreference()` shape (lines 13-49); `onboardingService.ts` (NEW) follows this pattern verbatim.
- [`src/lib/db.ts:154-197`](src/lib/db.ts) — `initializeDatabase()` post-migration guarded SQL (FOUND-03 local_date pattern, lines 167-179); D-04 inserts the migration seed at this call site, same idempotent shape.
- [`src/components/QuickWriteFAB.tsx`](src/components/QuickWriteFAB.tsx) — existing FAB; D-12 spotlights it via existing `data-onboarding="quick-write-fab"` attr (line 17); D-14 reuses its onClick handler logic for the Step 3 CTA.
- [`src/components/ui/alert-dialog.tsx`](src/components/ui/alert-dialog.tsx) — Radix AlertDialog wrapper; D-08 uses for Steps 1 + 3.
- [`src/components/ui/popover.tsx`](src/components/ui/popover.tsx) — Radix Popover wrapper; D-08 uses for Step 2 spotlight content.
- [`src/components/SettingsView.tsx:557-585`](src/components/SettingsView.tsx) — DataSection composition shape (SectionHeader + border-t + SettingRow rows); D-17 inserts HelpSection in identical shape.
- [`src/styles/animations.css`](src/styles/animations.css) — fade-in (line 6), pop-in (line 16), reduced-motion stanza; D-11 reuses both keyframes.
- [`src/hooks/useGlobalShortcuts.ts`](src/hooks/useGlobalShortcuts.ts) — Ctrl/Cmd+N handler with isTyping/isLocked guard list; D-20 adds onboarding-active guard.
- [`src/stores/entryStore.ts::createEntry, selectEntry`](src/stores/entryStore.ts) — Step 3 primary CTA chains these (preserves flush-pending-saves contract D-24 from Phase 8).
- [`src/stores/viewStore.ts`](src/stores/viewStore.ts) — `setActiveView` for Step 3 navigation to editor.

### Established Patterns
- **Zustand granular selectors** — `useUiStore((s) => s.isOnboardingCompleted)` returns primitive; OnboardingOverlay subscribes only to this primitive (no `allEntries` subscription) — no re-render storm risk.
- **`getDb()` + parameterized SQL** — every new SQL call in `onboardingService.ts` uses this pattern (Phase-7 Pattern 2).
- **`settings` KV table as SQLite localStorage** — `INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)` is the canonical write; `INSERT OR IGNORE` for one-time seeds; `DELETE FROM settings WHERE key=?` for replay reset (D-07).
- **Tri-state init pattern** — `boolean | null` where `null` = "loading from settings", driven by an async loader called in App.tsx's init `useEffect`. Render gate uses `=== false` (NOT `!isOnboardingCompleted`) to distinguish "loading" from "needs onboarding".
- **Migration ordering rule (from v1.0 PATTERNS.md)** — any seeded INSERT referencing data from MIGRATION_SQL tables runs AFTER the for-loop, NOT inside MIGRATION_SQL (D-04 places the conditional INSERT after the loop, next to the local_date guard).
- **Section composition in SettingsView** — `<section><SectionHeader icon={...} title="..." /><div className="border-t border-border">{...rows}</div></section>` (D-17 follows verbatim).
- **Async helper with try/catch + console.error** — non-fatal UI errors caught at the service boundary (matches `aiSettingsService.ts` pattern; D-07 helpers follow).

### Integration Points
- `src/stores/uiStore.ts` — ADD `isOnboardingCompleted: boolean | null` field + `setIsOnboardingCompleted` setter alongside existing `isPinSet` block (lines 28-101).
- `src/utils/onboardingService.ts` — NEW file. Exports `loadOnboardingState()`, `markOnboardingCompleted()`, `replayOnboarding()`. Owns ALL onboarding-related SQL.
- `src/lib/db.ts` — INSERT migration seed inside `initializeDatabase()` after the local_date guard block (around line 186, before the dev diagnostic at line 188).
- `src/App.tsx` — IMPORT `OnboardingOverlay` + `loadOnboardingState`; ADD `loadOnboardingState()` call to existing init useEffect (after `getAppLock`); ADD State 6.5 loader render branch; ADD `<OnboardingOverlay />` inside State 6 fragment.
- `src/components/onboarding/OnboardingOverlay.tsx` — NEW file. Owns the 3-step state machine, AlertDialog/Popover composition, `markOnboardingCompleted` calls.
- `src/components/onboarding/OnboardingSpotlight.tsx` — NEW file. Owns the box-shadow cutout + ResizeObserver + scroll lock for Step 2.
- `src/components/SettingsView.tsx` — INSERT new `<HelpSection />` between `<DataSection />` and the version footer (around line 608); add `import { HelpCircle } from "lucide-react"`.
- `src/hooks/useGlobalShortcuts.ts` — ADD `isOnboardingCompleted === false` to the guard list (D-20).
- (Optional) `src/components/onboarding/index.ts` — barrel export for OnboardingOverlay + OnboardingSpotlight.

### Files NOT touched in this phase
- No changes to `JournalView.tsx`, `OverviewView.tsx`, `AppShell.tsx`, `Sidebar.tsx`, `EntryEditor.tsx`, dashboard widgets, or anything else in `src/components/dashboard/`.
- No new shadcn primitives, no new dependencies, no `package.json` changes.
- No changes to `MIGRATION_SQL` itself — the seed is appended via post-migration code (D-04).
- No CI test infrastructure added (mentioned in PITFALLS.md L197 as future polish; not in ONBRD-01..07 SC).

</code_context>

<specifics>
## Specific Ideas

- **Privacy promise is the load-bearing copy.** Step 1's three bullets are directly downstream of PROJECT.md's "Only app with local AI" and "anti-subscription mindset" positioning. Don't let planning regress to a generic "Welcome to your journal" splash — the privacy beat is the differentiator that drives the $49/$99 conversion.
- **The CSS-cutout spotlight is non-trivial but contained.** A `useLayoutEffect` + `ResizeObserver` recompute pattern; ~60 lines total in OnboardingSpotlight.tsx. Don't outsource to a tour library — STACK.md L208 explicitly evaluates and rejects `react-joyride` (broken on React 19), `shepherd.js`, `driver.js`, `intro.js`. All bigger than the custom implementation.
- **Migration seed is a one-line SQL with a `WHERE COUNT > 0` filter.** The `INSERT OR IGNORE ... SELECT ... WHERE` form is idempotent on every launch. Do NOT add a separate migration version flag.
- **Step 3 CTA must NOT write a sample entry.** PITFALLS.md L455 explicitly: "Onboarding never writes entries; first entry prompt only — user writes themselves." The "Write your first entry" button creates a *blank* entry and opens the editor — the user types their own first words.
- **Existing v1.0 users with PIN locked must auto-skip onboarding.** The State 6.5 loader bridges the unlock → settings-load gap. Without it, a returning v1.0 user could see a 100ms content flash before the auto-seeded settings row is read. D-06 prevents this.
- **No analytics, no completion tracking, no funnel measurement.** PROJECT.md zero-network principle + PITFALLS.md L450 anti-pattern. Onboarding completion is a local-only fact; even DEV-mode `console.log` should be minimal and not include any user content.
- **Replay must work mid-session.** Click "Replay tour" in Settings → overlay should appear immediately, no app restart required. The reactive uiStore primitive + App.tsx render gate handles this for free if the gate is set up correctly (D-02).
- **Dialog z-index must beat the FAB's z-40 from Phase 8.** Use `z-50` for the AlertDialog overlay, `z-[60]` for the spotlight backdrop, `z-[70]` for the spotlight cutout (or use Tailwind arbitrary values — implementation detail). The FAB needs to remain interactive INSIDE the spotlight cutout for Step 2, so its z-index must be raised inside the active-onboarding state too. Coordination point worth flagging in the plan.
- **`COUNT(*) FROM entries` runs once at migration time.** Don't poll; don't subscribe; don't recompute. The seed either runs or it doesn't on a given install.

</specifics>

<deferred>
## Deferred Ideas

- **CI test that asserts `data-onboarding="quick-write-fab"` exists in DOM** (PITFALLS.md L197). Useful for catching DOM drift but not in ONBRD-01..07 SC; defer to a future polish pass.
- **Tour analytics / funnel metrics** — violates zero-network; permanently out of scope per PROJECT.md.
- **Per-feature mini-tours** ("New: tap here to see Tag Management") — a different UX pattern (feature highlights, not first-run); could ship later.
- **i18n / localized tour copy** — out of scope for v1.1 (app is English-only).
- **Onboarding video / animation walkthrough** — PITFALLS.md L65 anti-pattern + scope creep; deferred indefinitely.
- **Goal-setting questionnaire** ("How often do you want to journal?") — PITFALLS.md L63 anti-pattern + violates "minimal friction" principle.
- **Sample entries written by the app** — PITFALLS.md L455 explicit anti-pattern.
- **Multi-language privacy promise variants** — not in v1.1 scope.
- **Settings → Help section beyond "Replay tour"** — Help section ships with one row in Phase 9; future phases may add "Keyboard shortcuts", "About Chronicle AI", "Support" rows. Out of Phase 9 scope.
- **Step 2 multi-target tour (FAB → stat-cards → AI insights)** — would balloon to 5+ steps and break SC #1; can ship as a separate "Feature tour" entry point if user demand emerges.
- **Spotlight focus management for screen readers** — basic AlertDialog focus trap covers Steps 1+3; Step 2's Popover anchored to the FAB inherits focus management from the FAB's `aria-label="New entry"` (Phase 8 D-22). If a11y audit later flags issues, address as polish.
- **"Don't show again" checkbox** — redundant with skip + replay UX (skip already means "don't show again").

### Reviewed Todos (not folded)
- "Consider adding ESLint + `lint` npm script" (STATE.md) — orthogonal to Phase 9; remains in todos.
- "Phase 10 flagged HIGH research" (STATE.md) — Phase 10 concern, not Phase 9.

</deferred>

---

*Phase: 09-first-run-onboarding*
*Context gathered: 2026-04-18*
