# Feature Research — Chronicle AI v1.1 Daily Driver

**Domain:** Privacy-first desktop journaling app (Tauri/React) — adding home dashboard, onboarding, auto-tagging, and polish on top of shipped v1.0 MVP
**Researched:** 2026-04-16
**Confidence:** HIGH for dashboard widgets and onboarding patterns (well-documented across Day One, Rosebud, Stoic, Obsidian). MEDIUM for auto-tagging UX (emerging patterns, limited competitor precedent in journal apps specifically).

---

## Scope Note

v1.0 MVP is already shipped — this research covers ONLY the five v1.1 feature areas. Existing entry CRUD, timeline, calendar, search, media, security, settings, semantic search, and RAG Q&A are treated as shipped dependencies. The research asks: *how do these new features typically work in successful apps, and what must Chronicle AI do vs avoid?*

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume a "daily driver" journaling app has. Missing these = product feels like a dev tool.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Home dashboard / landing screen** | Every modern journal app (Day One, Rosebud, Reflect, Stoic, Obsidian+StartPage) opens to a dashboard, not a blank editor. Users expect to see their world at a glance. | MEDIUM | Grid/card layout of widgets. Depends on shipped timeline/CAL/OTD queries. |
| **Streak counter** | Day One Streak widget, Duolingo-popularized expectation. Single most-requested "gamification" element in journal app reviews. | LOW | SQL: consecutive days with entries. Beware streak anxiety — see Anti-Features. |
| **Total entries + "entries this month" stat cards** | Obsidian StartPage, Notion dashboards, Day One stats page all show count-at-a-glance. Users want quantifiable progress. | LOW | Simple COUNT(*) + WHERE date >= start-of-month. Reuses existing entries table. |
| **Recent entries feed (3-10 latest)** | Obsidian StartPage "Recently modified notes" is the #1 feature of their dashboard plugin. Mirrors email inbox mental model. | LOW | LIMIT 5-10 on existing timeline query. Each card is clickable → open in editor. |
| **On This Day surface on home** | Day One "On This Day" widget is iconic; core memory-recall value prop. Backend already exists in Chronicle AI. | LOW | Wire existing OTD query into a dashboard card. Show count + top 1-3 entries. |
| **Quick-write / "New Entry" primary CTA** | Every journal app has a prominent create-entry button. Material 3 FAB is conventional on mobile; desktop equivalents are top-bar "+" buttons or floating buttons. | LOW | Single onClick → open editor with date=today. No modal needed — just navigate. |
| **First-run welcome screen** | Opening a brand-new app to a blank screen is jarring. Minimum expectation: one-screen welcome that names the app and offers a first action. | LOW | Can be a single modal/screen — doesn't need full multi-step tour. |
| **Privacy statement in onboarding** | Privacy-first positioning *requires* stating the promise up front. Users who chose this app over Day One did so for privacy; onboarding must validate that choice. | LOW | One paragraph or three bullets. Highest-leverage piece of copy in the app. |
| **Entry list animations on add/delete** | Framer Motion AnimatePresence is the 2025 default for list mutations. Instant DOM swaps feel broken in modern apps. | LOW | Wrap timeline entries with AnimatePresence; layout animation for reorder. |
| **Smooth hover/press states on interactive elements** | Tactile feedback (100-150ms transitions on buttons, cards) is invisible when done but obvious when missing. | LOW | Tailwind `transition-colors` + `hover:` classes already pattern-consistent with shadcn. |
| **Tag color picker with preset palette** | Chronicle AI v1.0 already has TAG-03 (8 preset colors) — v1.1 request is a better *picker UI*, not a new feature. Notion, Things, Todoist, Linear all use preset swatches. | LOW | Popover with 8-12 color swatches; click to set. No custom hex input (see anti-features). |

### Differentiators (Competitive Advantage)

Features that set Chronicle AI apart from Day One, Reflect, Rosebud, Obsidian.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Mood trends chart on home dashboard** | Stoic's "Trends" tab is a premium feature — surfacing this for free on home is a Day One-killer. Chronicle AI already stores moods; visualization is pure UI work. | MEDIUM | Sparkline (last 30 days) OR calendar-heatmap-colored-by-mood. Recharts/D3. Reuses existing mood data. |
| **AI insights summary panel (privacy-first)** | Rosebud and Reflect surface AI summaries — but they send your data to OpenAI. Chronicle AI does this with local Ollama. Headline differentiator. | HIGH | Depends on Ollama warmup. Show cached summary + "Refresh" button. Graceful fallback when Ollama unavailable (don't hide widget — show "Connect Ollama" CTA). |
| **Writing prompts widget with local rotation** | Day One Daily Prompts, Reflection.app's 365-prompt library, Stoic weekly themes — all are core retention tools. Chronicle AI can ship a curated local prompt library (no network, deterministic rotation). | LOW | Static JSON library of 100-365 prompts + day-of-year modulo for rotation. No AI needed for v1.1. |
| **Auto-tagging suggestions (local LLM)** | Rosebud auto-tags via cloud AI; no local-only journal app does this. Major privacy+convenience differentiator. Reduces the #1 friction point in journaling: manual metadata. | HIGH | See detailed UX section below. Depends on Ollama. |
| **First-run sample data (skippable)** | Most journal apps drop users into blank state — creating a "ghost town" feeling. Seeding 2-3 sample entries lets users immediately explore timeline, calendar, search. Daylio does this well. | LOW | Bundle 3 sample entries with varied moods/tags/dates. Toggle in onboarding. Auto-delete or mark as sample. |
| **Feature tour that teaches power features** | Ollama setup, app lock, semantic search, RAG Q&A are all *deep* features users won't discover on their own. Progressive disclosure during/after onboarding converts free-users to AI-users. | MEDIUM | 3-5 step interactive tour (not modal hell). Can defer advanced steps to "later" CTA. |
| **Dashboard-as-home (replaces blank Journal view)** | Most journal apps open to a list; Notion opens to last-viewed page. Opening to a dashboard gives context BEFORE input — differentiator for long-term journalers who want to see patterns, not just write. | MEDIUM | Routing work in viewStore; new OverviewView scaffold already committed (per PROJECT.md). |
| **Accept/reject/edit auto-tag flow with confidence** | LLM4Tag research (arxiv 2502.13481) shows LLMs can't reliably quantify tag confidence — surfacing *suggestions* (not automatic assignment) lets users stay in control. Firefly-III's `AI Suggestions` panel pattern. | MEDIUM | Ghost-chip UI (dim until accepted). Never auto-assign. One-click accept, one-click reject, optional edit. |
| **Streak that caps at 7/30 days ("weekly champion")** | Yu-kai Chou's research: infinite streaks shift from pride (Core Drive 2) to loss-avoidance (Core Drive 8) around day 30, causing ~40% churn. A *capped* streak ("5/7 days this week") avoids this. Chronicle AI can be the journal app that doesn't guilt-trip you. | MEDIUM | Show "3 days this week" + weekly goal instead of "47-day streak". |
| **Quick-write FAB with keyboard shortcut (Cmd+N / Ctrl+N)** | Things 3's quick-entry is renowned; desktop users expect keyboard-first creation. FAB gives discoverability; shortcut gives speed. | LOW | Single component with keyboard listener at App level. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Infinite streak counter with "don't break the chain" messaging** | Duolingo copy-paste; seems motivating | Research (Yu-kai Chou, The Brink): becomes anxiety-inducing past day 30; ~40% churn after streak break; contradicts "wellness" positioning of journaling | Capped weekly streak ("4/7 days this week"); celebrate consistency, not obsession |
| **Push notifications / reminders to journal** | "Users won't come back without reminders" | Chronicle AI is local-desktop — no push infra; desktop nag popups feel intrusive; undermines calm writing positioning | OS-level reminders via user's calendar; "gentle" in-app banner if user hasn't written in 7+ days |
| **Automatic tag assignment without confirmation** | "Save the user a click" | LLM4Tag research: LLMs hallucinate tags and can't quantify confidence. Silent writes erode trust; users find wrong tags later and rage-quit | Always show as *suggestion*; require explicit accept; allow learn-from-reject |
| **Rich AI dashboard that auto-refreshes on every home visit** | "Always-fresh insights!" | Cold Ollama inference can take 10-30s on first call; auto-refresh causes visible lag on home load; wastes CPU/power | Cache summaries; manual "Refresh insights" CTA; background regen on idle |
| **Custom hex color input for tag colors** | "Power users want full control" | 16M colors → no visual coherence; accessibility nightmare (contrast varies wildly); picker UI is complex; Notion/Things/Linear all use preset palettes for this reason | Curated 8-12 swatch palette with WCAG-AA contrast verified; dark-mode-aware variants |
| **Full-screen multi-step onboarding (>5 steps)** | "Teach users everything up front" | Appcues/Formbricks 2025 data: dropoff grows linearly past 3 steps; users want to start, not study. Demoralizing for second-launch users | 1-3 screen welcome + progressive disclosure (contextual tooltips when feature first encountered) |
| **Mandatory account creation in onboarding** | Convention for cloud apps | Chronicle AI is local-only — no account *exists*; would require inventing auth for no reason; contradicts privacy positioning | Skip entirely. App works from launch. Optional PIN set later in Settings. |
| **Gamification: XP, badges, leaderboards** | "Make journaling fun!" | Leaderboards require cloud (privacy conflict); badges trivialize emotional content; journaling ≠ habit app | Surface intrinsic rewards: "You've written 50,000 words this year" (fact, not trophy) |
| **AI-generated entries ("write my entry for me")** | "Lazy users will love it" | Defeats the *purpose* of journaling (self-reflection). Not requested by serious journalers. Invites misuse of local LLM. | AI assists reflection (prompts, summaries), never writes the entry |
| **Elaborate first-run questionnaire ("what are your goals?")** | Personalization rhetoric | Data collection-y; feels like a startup asking for ammo; no backend to personalize against in local-only app | Skip. Let usage reveal preferences. Maybe: one optional "preferred prompt theme" question. |
| **Auto-tag on every keystroke / continuous background tagging** | "Real-time magic" | Ollama per-keystroke = CPU fire; battery drain; UX jank; most tags are stable only when entry is "done" | Trigger auto-tag on: (a) user clicks "Suggest tags" button, (b) entry saved & idle 5s, (c) entry length crosses 100 words — explicit, not continuous |
| **Dashboard widgets user can rearrange (drag-drop customization)** | "Notion does it" | Huge complexity (dnd-kit, persist layout, responsive reflow); low value for v1.1; most users never customize | Ship opinionated, fixed layout. Revisit in v1.2 if requested. |
| **Streak "freezes" / "repair" purchases** | Duolingo model | Chronicle AI has no IAP; would require subscription billing; amplifies the streak-anxiety anti-pattern | Just don't punish missed days. Show "last wrote: 3 days ago" neutrally. |
| **Long onboarding video** | "Explains everything at once" | High dropoff; users skip videos; can't scrub; inaccessible to deaf users without captions | Text + illustrations; optional embedded doc/FAQ for deep dive |

---

## Feature Dependencies

```
Overview view (route)
    ├──requires──> viewStore view enum extension
    ├──requires──> shipped entry/mood/tag queries (reuse)
    └──contains──>
        ├── StatCard x 3 (streak, total, this-month)
        │       └──requires──> SQL aggregation queries
        ├── MoodOverview chart
        │       ├──requires──> Recharts or D3 (+ new dependency)
        │       └──requires──> mood data from entries (shipped)
        ├── OnThisDay widget
        │       └──requires──> existing OTD query (shipped in Phase 4)
        ├── RecentEntries feed
        │       └──requires──> existing timeline query with LIMIT (shipped)
        ├── QuickActions (prompts + FAB trigger)
        │       ├──requires──> static prompt library JSON
        │       └──requires──> routing to editor
        ├── AIInsights panel
        │       ├──requires──> Ollama connection (shipped)
        │       ├──requires──> cached-summary persistence (NEW)
        │       └──requires──> graceful fallback UI (when Ollama off)
        └── QuickWriteFAB (global, floats over app)
                ├──requires──> global keyboard shortcut handler
                └──requires──> routing to editor

Onboarding flow
    ├──requires──> first-run detection (NEW — localStorage/settings flag)
    ├──requires──> privacy copy (content work)
    ├──requires──> optional sample data seeder
    └──enhances──> feature tour (can trigger progressively in-product)

Auto-tagging
    ├──requires──> Ollama connection (shipped)
    ├──requires──> prompt template for tag generation (NEW)
    ├──requires──> Ollama warmup strategy (NEW — critical)
    ├──requires──> suggestion UI component (NEW — ghost chips)
    └──enhances──> existing TagInput (v1.0)

Tag color picker
    ├──requires──> existing tag color field (shipped TAG-03)
    └──enhances──> tag management UI (may need new tag-admin view or inline)

Microinteractions
    ├──requires──> Framer Motion dependency (NEW)
    └──enhances──> timeline cards, tag pills, widget cards, modal transitions

Writing prompts widget
    ├──requires──> static prompt library (NEW — JSON file)
    └──optional──> Ollama-generated personalized prompts (v1.2)

Streak counter
    ├──requires──> SQL consecutive-days calculation (NEW — window function)
    └──conflicts──> "don't break the chain" mental model → must use weekly cap
```

### Dependency Notes

- **Overview view depends on routing refactor:** viewStore currently has `journal | settings` (per STATE.md); adding `overview` is low-risk but must be the default landing view → existing users may see "new" home on first v1.1 launch. Consider a one-time highlight on upgrade.
- **AIInsights requires Ollama warmup:** First-time Ollama inference after app idle is 5-30s (cold model load). MUST NOT block home render. Pattern: load cached summary from SQLite; show "Last updated: 2 hours ago"; user-initiated refresh shows inline spinner.
- **Auto-tagging depends on prompt engineering:** This is the *highest-risk* feature. Llama 3.2 3B / nomic-embed-text behavior on tag suggestion varies; requires careful prompt with few-shot examples. Plan for iteration.
- **Sample data conflicts with migration:** If sample entries are seeded into the same entries table, must be deletable and must not pollute "total entries" stats. Solution: `is_sample` flag in metadata JSON, exclude from counts if user prefers, or just delete on user action.
- **Microinteractions must NOT block shipping:** Framer Motion adds ~50KB; wire it *once* for AnimatePresence on timeline & widget entries, defer page transitions to v1.2. Don't animate everything.
- **Color picker conflicts with accessibility if hex allowed:** Preset palette must include dark-mode-safe variants (contrast against dark background differs from light). Test all 8-12 swatches at WCAG AA against both backgrounds.
- **Quick-write FAB conflicts with shipped "+" button (if one exists):** Audit existing create-entry paths; single primary CTA on home, keyboard shortcut global, don't duplicate.

---

## MVP Definition (v1.1 "Daily Driver")

Chronicle AI v1.0 is the baseline MVP — v1.1 is a *polish+retention* milestone, not a feature-completeness milestone.

### Must Ship for v1.1 to be Valuable

- [x] **Home dashboard as default view** — Without this, "Daily Driver" fails. Users must land somewhere richer than a blank editor.
  - StatCards (streak, total, this-month)
  - Recent entries feed
  - On This Day (wire existing backend)
  - Quick-write FAB
- [x] **First-run welcome + privacy statement** — 1-2 screens. Users need to know *why* this app.
- [x] **Auto-tagging suggestions (ghost-chip UX)** — Core AI differentiator. Accept/reject, never auto-apply.
- [x] **Animations pass** — AnimatePresence on timeline + widgets. Without this, app feels v1.0-static.
- [x] **Tag color picker UX improvement** — Swap ad-hoc color assignment for clean preset-palette popover.

### Should Ship (adds meaningful retention)

- [ ] **Mood trends chart** — Turns home into a self-reflection surface, not just a launcher.
- [ ] **Writing prompts widget (static library)** — Cheap to build, high daily-value.
- [ ] **AI insights summary (cached)** — Headline differentiator, but only if Ollama warmup can be hidden behind cached state.
- [ ] **Sample data in onboarding** — Low cost, massive improvement to empty-state feel.
- [ ] **Feature tour (progressive)** — Unlocks discoverability of AI features.

### Defer to v1.2+

- [ ] **Drag-drop dashboard customization** — User research needed; low value for v1.1.
- [ ] **Personalized AI-generated prompts** — Requires prompt history, user preferences; static library first.
- [ ] **Multi-mood-per-entry** — Schema change; not requested in v1.1 scope.
- [ ] **Relationship tracking / People tab** — Large scope, separate milestone.
- [ ] **Streak freezes / repair** — Anti-feature; skip entirely unless users explicitly demand.
- [ ] **Widget library / community widgets** — Obsidian-style plugin surface; much later.

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Overview view routing + layout shell | HIGH | LOW | P1 |
| StatCards (streak, total, month) | HIGH | LOW | P1 |
| Recent entries feed | HIGH | LOW | P1 |
| On This Day widget (wire existing) | HIGH | LOW | P1 |
| Quick-write FAB + Cmd+N shortcut | HIGH | LOW | P1 |
| First-run welcome + privacy copy | HIGH | LOW | P1 |
| Auto-tagging suggestion UI (ghost chips) | HIGH | MEDIUM | P1 |
| Tag color picker popover | MEDIUM | LOW | P1 |
| Framer Motion on timeline + widgets | MEDIUM | LOW | P1 |
| Mood trends chart | HIGH | MEDIUM | P2 |
| Writing prompts widget (static) | HIGH | LOW | P2 |
| AI insights summary (cached) | HIGH | HIGH | P2 |
| Sample data seeding | MEDIUM | LOW | P2 |
| Feature tour (progressive) | MEDIUM | MEDIUM | P2 |
| Capped/weekly streak design | MEDIUM | LOW | P2 |
| Auto-tag confidence indicator | LOW | MEDIUM | P3 |
| Personalized AI prompts | MEDIUM | HIGH | P3 |
| Dashboard customization | LOW | HIGH | P3 |

**Priority key:**
- **P1:** Must ship for v1.1 — defines the milestone
- **P2:** Should ship — major retention lift; descope only under schedule pressure
- **P3:** Nice to have — revisit for v1.2

---

## Feature-Specific Deep Dives

### 1. Home Dashboard Widgets

**Competitive reference points:**
- **Day One** — Widgets are iOS/Home-Screen-only; in-app home is chronological. Their `On This Day`, `Streak`, and `Daily Prompt` widgets are the industry templates ([Day One widgets guide](https://dayoneapp.com/guides/day-one-ios/day-one-widgets-for-ios/)).
- **Rosebud** — Chat-first home; shows recent entries + insights summary. `Learned Preferences` track user-stated preferences ([Rosebud AI](https://www.rosebud.app/)).
- **Stoic** — `Trends` tab with mood/activity/emotion visualizations; user-customizable `Favorites` section on dashboard ([Stoic features](https://www.getstoic.com/features)).
- **Obsidian StartPage plugin** — Card-based layout with vault stats (total notes, today's edits), pinned notes, recently modified notes, smart time display ("2 hours ago") ([StartPage plugin](https://github.com/kuzzh/obsidian-startpage)).

**Expected user flow:**
1. Launch app → land on Overview (not editor, not timeline).
2. Glance at streak + recent activity (takes <2s).
3. Either: (a) click quick-write to capture a thought, (b) click a prompt widget to reflect, (c) click a recent entry to continue yesterday's thread, (d) click On This Day for memory dive.
4. Return to Overview after writing (breadcrumb: Home > Journal).

**Complexity considerations:**
- **Fixed grid layout (P1)** vs **drag-drop customization (defer):** Ship fixed. Customization is a v2.0 feature at earliest.
- **Responsive breakpoints:** Tauri windows resize; widgets must reflow from 3-column → 2-column → 1-column at sensible widths.
- **Empty states:** First-launch users have no data. Each widget needs a graceful empty state ("Your first week of entries will appear here") — NOT a stat card showing "0 / 0 / 0".
- **Performance:** All dashboard queries run on navigation. Batch them (single `loadOverview()` call) to avoid 6 separate DB round-trips.

**Dependency on existing features:**
- Streak query: NEW SQL (GROUP BY date, consecutive-day window function)
- Total/month counts: NEW SQL (COUNT aggregations)
- On This Day widget: REUSE shipped OTD-01 backend
- Recent entries: REUSE shipped timeline query with LIMIT 5
- Mood trends: REUSE shipped mood field; NEW Recharts dependency
- AI insights: REUSE shipped Ollama client; NEW caching layer

---

### 2. First-Run Onboarding Flow

**Competitive reference points:**
- **Daylio** — Minimalist 3-5 screens with clean illustrations; minimal text; focuses on "how you feel" intake ([Daylio style via UXCam](https://uxcam.com/blog/10-apps-with-great-user-onboarding/)).
- **Rosebud** — Asks about goals up front to personalize prompts; conversational tone sets expectations.
- **Stoic** — Guides user to first mood check-in + first reflection immediately after signup.
- **Appcues 2025 guidance** — 3 flow archetypes: benefits-oriented, function-oriented, progressive. Chronicle AI best fits **benefits-oriented** (privacy promise) + **progressive** (tour advanced features contextually).

**Expected user flow (recommended, 3 screens max):**
1. **Screen 1 — Welcome + Privacy Promise.** "Your thoughts. Your device. Never the cloud." + app logo + "Get started" button.
2. **Screen 2 — Seed the experience.** "Start with a few sample entries to explore" / "Start empty" — user choice.
3. **Screen 3 — First action.** "Write your first entry" (opens editor) OR "Explore the sample journal" (opens timeline). Skip everything else.

**Progressive tour (post-onboarding, contextual):**
- On first editor open: tooltip pointing at tag input — "Add tags to organize — AI can suggest them."
- On first Settings visit: banner — "Unlock AI features by connecting Ollama."
- On 5th entry: one-time modal — "Try semantic search — find entries by meaning, not just words."

**Complexity considerations:**
- **First-run detection:** Add `onboarding_completed: boolean` to settings table. Reset-able for QA via a hidden setting.
- **Sample data:** Ship 3 pre-written sample entries (varied moods, 2-3 tags each, spread across last 30 days) as an asset bundle. Mark `is_sample=true` in metadata. On user's first "real" entry, optionally prompt "Delete sample entries?"
- **Skip everywhere:** Every screen needs a "Skip" option; no step can be gated.
- **Returning users:** If a user wipes app data, re-onboarding is fine. Don't show tour to existing v1.0 users on v1.1 upgrade — only show a one-time "What's new in 1.1" card on home.

**Anti-patterns to avoid (explicitly):**
- No account creation (local-only app)
- No email collection
- No "rate us" prompts (design principle #3)
- No length > 5 screens
- No mandatory sample-data opt-in (must be skippable)

---

### 3. Animations + Microinteractions

**Competitive reference points:**
- **Things 3** — Industry gold standard on Apple hardware. "Fluid animations, thoughtful typography" ([Productive with Chris review](https://productivewithchris.com/tools/things-3/)).
- **Notion** — Layout animations on block reorder, smooth modal transitions, hover lift on cards.
- **Day One** — Fade-in on entry open, parallax on photo backgrounds, spring animations on mood selector.
- **Framer Motion (2025 default)** — `AnimatePresence` for enter/exit, `layout` prop for FLIP transitions, `motion.div` with spring presets ([Motion React layout docs](https://motion.dev/docs/react-layout-animations)).

**Expected behaviors:**
- **Timeline entries:** Fade+slide in when loaded; smooth reorder when filters change; swipe-or-fade on delete.
- **Widget cards:** Stagger-in on dashboard load (50ms delay per card); subtle scale on hover.
- **Tag pills:** Pop-in when added; quick shrink-fade on remove.
- **Modal/dialog:** 200ms backdrop fade; content scale-up from 0.95.
- **Mood selector:** Spring-based scale on select.
- **View transitions:** Fade between Overview/Journal/Settings (200ms).

**Complexity considerations:**
- **Bundle size:** Framer Motion ~50KB gzipped. Worth it for v1.1.
- **Reduced-motion support:** MUST respect `prefers-reduced-motion` CSS media query. Disable all non-essential animation for accessibility.
- **Don't over-animate:** Every animation = cognitive cost. Reserve for state changes; don't animate static content.
- **Perf on 10k+ entries timeline:** `layout` animations can be expensive on long lists; use `LayoutGroup` carefully or skip layout animation for timeline items, keep it to enter/exit only.

**Specific to Chronicle AI:**
- Amber accent color (per STATE.md) in animations = brand reinforcement.
- Keep ambient (non-triggered) motion minimal — users are writing, motion must not distract.

---

### 4. Auto-Tagging (Local LLM)

**Competitive reference points:**
- **Rosebud** — Auto-tags every entry via cloud LLM ([Rosebud AI journaling guide](https://www.rosebud.app/blog/ai-journaling-guide)). Chronicle AI's differentiator: do this locally.
- **LLM4Tag (arxiv 2502.13481)** — Production-deployed LLM tagging system. Key findings: LLMs hallucinate tags; confidence scoring is unreliable; match-based recall + LLM refinement works best ([LLM4Tag paper](https://arxiv.org/html/2502.13481v2)).
- **Firefly-III (issue #9753)** — "AI Suggestions" panel in transaction creation — accept/reject flow, doesn't auto-write ([Firefly-III AI suggestions](https://github.com/firefly-iii/firefly-iii/issues/9753)).
- **Enterprise Knowledge auto-tagging guidance** — Recommends LLM-generated tags always go through human validation in content-management contexts ([Enterprise Knowledge article](https://enterprise-knowledge.com/how-to-leverage-llms-for-auto-tagging-content-enrichment/)).

**Recommended UX pattern (ghost-chip):**
1. User writes entry. Tag input shows existing tag autocomplete as today.
2. Trigger events for suggestion generation (any one):
   - User clicks a "Suggest tags" button near tag input
   - Entry is auto-saved AND entry length > 100 words AND Ollama available
3. Suggested tags appear as **dim/ghost pills** next to committed tags, labeled "Suggested":
   - `[work] [stress]` (committed, solid) `[meeting] [deadline]` (suggested, dim, dashed border)
4. User can: **click** a ghost pill → commits it (solidifies); **click X** → dismisses it; **ignore** → disappears on next save without commit.
5. Accepted suggestions prefer *existing tags* (from autocomplete set) over new-tag creation, to prevent tag sprawl.

**Accuracy expectations:**
- Llama 3.2 3B on tag suggestion: realistic precision ~60-75% on short entries, higher on long entries (>300 words).
- NEVER claim "AI tagged this for you" — always frame as "Suggestions."
- Be explicit about limits in Settings: "AI tag suggestions are experimental and work best on longer entries."

**Latency & warmup:**
- Cold Ollama call: 5-30s (model load into VRAM/RAM).
- Warm call: 1-3s for a short tag-generation prompt.
- **Critical design rule:** Suggestion generation must be **async + non-blocking**. User types → saves → suggestions appear when ready (can be seconds later); user can keep writing or leave the entry without waiting.
- Warmup strategy: Opportunistically ping Ollama with a tiny "ping" prompt when user opens the editor; keeps model resident.

**Prompt engineering notes (for Phase of implementation):**
- Provide the full entry + user's existing tag list + few-shot examples.
- Ask for top 3-5 tags, preferring existing vocabulary, comma-separated, no explanation.
- Parse: trim, lowercase-normalize, dedupe against existing tags on entry.
- Cap output at 5 tags; reject any tag >20 chars (likely hallucination).

**What makes this a differentiator:**
- First local-only journal app to do this (every competitor requires cloud).
- Privacy-preserving: tags never leave device.
- Chronicle AI already has the LLM client and tag system — this is glue + UX + prompt work.

---

### 5. Tag Color Picker (Preset Palette)

**Competitive reference points:**
- **Notion** — Fixed 10-color palette (default, gray, brown, orange, yellow, green, blue, purple, pink, red). No custom hex ([Notion color conventions](https://www.lemon8-app.com/@sherizuleika/7193640297950118402?region=sg)).
- **Todoist** — Brand palette with utility colors for task priorities ([Todoist color palette](https://mobbin.com/colors/brand/todoist)).
- **Things 3** — Small curated accent palette (5-7 colors) that match iOS/macOS system colors.
- **Linear** — ~12 color presets for labels, each with accessible contrast in light/dark mode.

**Chronicle AI's current state:** v1.0 TAG-03 shipped "Each tag has a color selected from 8 preset colors." v1.1 task is UX improvement of the picker.

**Expected user flow:**
1. User opens tag management (or creates tag) → sees tag chip + small color swatch.
2. Click swatch → popover opens with 8-12 color grid.
3. Click a swatch → instantly applied; popover closes.
4. Current color shown with checkmark/ring.

**Complexity considerations:**
- **WCAG contrast:** Each preset must meet AA contrast against both light and dark mode backgrounds. May require two variants per color (lighter fill for light mode, darker for dark mode) OR use a mid-value that works on both.
- **Semantic color conventions (optional):** Consider naming presets with subtle hints (e.g., calm/neutral/warm/bold) rather than "red/green/blue" — supports user meaning-making without forcing it.
- **Color blindness:** Include shape/label differentiation on tag pills (not just color) so color-blind users aren't excluded. Tailwind icon-next-to-color is sufficient.
- **No custom hex:** Anti-feature. Locks to palette → visual consistency.

**Dependency:** Existing TAG-03 color field. No schema change needed.

---

### 6. Writing Prompts Widget

**Competitive reference points:**
- **Day One Daily Prompts** — Rotating curated prompt, tap to start entry pre-filled with the prompt ([Day One Daily Writing Prompts](https://dayoneapp.com/features/daily-writing-prompts/)).
- **Reflection.app** — 365 daily prompts, one per calendar day + 100+ themed guides (career, gratitude, etc.) ([Reflection daily prompts](https://www.reflection.app/blog/daily-journal-prompts-365-questions)).
- **Rosebud** — AI-generated prompts based on user's recent entries (requires cloud); premium feature.
- **Stoic** — Rotating stoic-philosophy prompts with weekly themes ([Stoic features](https://www.getstoic.com/features)).

**Recommended v1.1 pattern (static library):**
- Ship a curated JSON file of 100-365 prompts, categorized by theme (gratitude, reflection, memory, goals, struggles).
- Rotate: daily prompt = prompts[day-of-year % total]. Deterministic, no state.
- Widget shows today's prompt + "Write" button → opens editor with prompt prepended as an H1 or blockquote.
- "New prompt" button for users who don't resonate with today's — cycles to next in category.

**v1.2 upgrade path:** Optionally use Ollama to generate personalized prompts based on recent mood/tags. Keep static library as fallback.

**Complexity:** Low. Copywriting is the bulk of work. UI is one card with a string.

---

### 7. Streak Counter (With a Warning)

**Research finding (important):** Yu-kai Chou's streak research + The Brink article on gamification dark patterns: infinite streaks are an anti-pattern in mental-health-adjacent apps. Around day 30, users shift from pride (motivating) to loss-avoidance anxiety (demotivating); ~40% churn after streak break.

**Chronicle AI positioning:** This is a privacy-first, wellness-adjacent journaling app. Design principle #3: "Insights, not interruptions."

**Recommended implementation:**
- Show **current streak** AND **weekly cadence** — e.g., "3 days in a row / 5 days this week"
- Celebrate milestones quietly: "5 days this week!" (subtle, one-time-per-week), not "Don't break your streak!" (anxiety-inducing)
- Never show red/warning colors on streak reset
- Never use loss-aversion copy ("Your streak will break in 4 hours")
- Include a **neutral fallback metric** — "Total entries: 247" — so users who break streaks still see progress

**What to avoid:**
- Large streak-break animations
- Push notifications ("Your streak is in danger")
- Public-facing streak (no leaderboards)
- Streak-freeze/repair mechanics (no IAP, invites gaming)

---

## Competitor Feature Analysis

| Feature | Day One | Rosebud | Stoic | Obsidian (+StartPage) | Chronicle AI v1.1 (planned) |
|---------|---------|---------|-------|----------------------|----------------------------|
| **Home dashboard** | Home-Screen widgets only (iOS); in-app is chronological | Chat-first home + insights | `Trends` tab + Favorites dashboard | Plugin-based StartPage (stats, pinned, recent) | Dedicated OverviewView with widgets |
| **Streak counter** | Yes, infinite | No (intentional) | Yes, with milestones | No | Yes, capped-weekly framing |
| **On This Day** | Widget + in-app | Limited | Limited | No | Wire existing backend into home card |
| **Writing prompts** | Daily Prompts (rotating curated) | AI-personalized | Daily + weekly themes | No (user's own) | Static library v1.1; AI v1.2 |
| **Mood trends** | Basic | Pattern detection via AI | Full `Trends` tab | No (user-built) | Sparkline or heatmap-by-mood |
| **Auto-tagging** | No | Yes (cloud AI) | No | No | Yes (local Ollama, ghost-chip UX) |
| **AI insights** | Apple Intelligence (on-device, iOS) | Cloud-based summaries | AI pattern analysis | No | Local Ollama summaries, cached |
| **First-run onboarding** | Sign-in + privacy pitch | Goals questionnaire + chat intro | Mood intake + first reflection | Minimal (Obsidian for power users) | 1-3 screens + optional sample data |
| **Privacy positioning** | Opt-in E2E ($) | Cloud-first | Cloud | Local (but manual) | Local-only, privacy-first |
| **Pricing** | Freemium + subscription | Freemium + subscription | Freemium + subscription | Free (paid sync) | Local-only, no subscription |
| **Microinteractions** | Polished (native iOS) | Polished (chat-style) | Polished | Minimal | Framer Motion pass v1.1 |
| **Tag color picker** | Limited | Auto-themed | N/A | User-defined | Preset palette popover |

---

## Sources

**Competitor product research:**
- [Day One Features](https://dayoneapp.com/features/) — feature overview
- [Day One Widgets for iOS](https://dayoneapp.com/guides/day-one-ios/day-one-widgets-for-ios/) — widget design reference
- [Day One Streaks](https://dayoneapp.com/guides/tips-and-tutorials/journal-streaks/) — streak UX implementation
- [Day One Daily Writing Prompts](https://dayoneapp.com/features/daily-writing-prompts/) — prompts design
- [Rosebud AI](https://www.rosebud.app/) — AI journal with auto-tagging
- [Rosebud Best Journaling Apps 2025](https://www.rosebud.app/blog/best-journaling-app-2025-review) — comparative analysis
- [Rosebud AI Journaling Guide](https://www.rosebud.app/blog/ai-journaling-guide) — AI journaling patterns
- [Stoic Features](https://www.getstoic.com/features) — dashboard + Trends tab design
- [Reflection.app Daily Prompts](https://www.reflection.app/blog/daily-journal-prompts-365-questions) — 365-prompt library pattern
- [Reflection.app AI Journaling Comparison](https://www.reflection.app/blog/ai-journaling-apps-compared) — competitor feature matrix
- [Obsidian StartPage plugin](https://github.com/kuzzh/obsidian-startpage) — dashboard stats + recent notes reference
- [Obsidian Dashboard Navigator](https://www.obsidianstats.com/plugins/dashboard-navigator) — alternative dashboard approach
- [Todoist Brand Palette](https://mobbin.com/colors/brand/todoist) — tag color conventions
- [Things 3 review](https://productivewithchris.com/tools/things-3/) — microinteractions gold standard

**Research + UX theory:**
- [LLM4Tag paper (arxiv 2502.13481)](https://arxiv.org/html/2502.13481v2) — LLM auto-tagging accuracy, confidence limitations
- [Enterprise Knowledge on LLM auto-tagging](https://enterprise-knowledge.com/how-to-leverage-llms-for-auto-tagging-content-enrichment/) — human-in-loop validation patterns
- [Firefly-III #9753](https://github.com/firefly-iii/firefly-iii/issues/9753) — accept/reject suggestion UX pattern
- [SemEval-2025 Task 5 LLMs4Subjects](https://arxiv.org/html/2504.07199) — LLM tagging evaluation
- [Yu-kai Chou: Streak Design Motivation vs Burnout](https://yukaichou.com/gamification-analysis/streak-design-gamification-motivation-burnout/) — streak anti-pattern research
- [The Brink: Dark Psychology of Gamified Apps](https://www.thebrink.me/gamified-life-dark-psychology-app-addiction/) — gamification pitfalls
- [Appcues 2025 onboarding guide](https://www.appcues.com/blog/in-app-onboarding) — onboarding best practices
- [UXCam top onboarding flows 2026](https://uxcam.com/blog/10-apps-with-great-user-onboarding/) — Daylio + competitor onboarding
- [Formbricks onboarding best practices](https://formbricks.com/blog/user-onboarding-best-practices) — 2026 onboarding data
- [Motion React layout animations](https://motion.dev/docs/react-layout-animations) — Framer Motion AnimatePresence + layout
- [Mobbin: Floating Action Button](https://mobbin.com/glossary/floating-action-button) — FAB UX patterns
- [Material 3 Expressive FAB Menu](https://medium.com/@renaud.mathieu/discovering-material-3-expressive-fab-menu-ecfae766a946) — 2025 FAB patterns
- [IxDF UI Color Palette](https://ixdf.org/literature/article/ui-color-palette) — palette accessibility principles

---

*Feature research for: Chronicle AI v1.1 Daily Driver milestone*
*Researched: 2026-04-16*
*Confidence: HIGH (dashboard/onboarding/animations patterns well-established), MEDIUM (auto-tagging UX — emerging pattern with limited journal-app precedent)*
