# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.0 — MVP

**Shipped:** 2026-04-18
**Phases:** 6 | **Plans:** 23 | **Tasks:** 34
**Timeline:** 2026-04-09 → 2026-04-17 (9 active days; gap-closure pass 2026-04-17–18)
**Code delivered:** ~9,252 LOC TypeScript/TSX, ~372 LOC Rust
**Requirements:** 45/45 shipped

### What Was Built

- **Offline-first Tauri foundation** with AI-ready SQLite schema (`embeddings` table, UUID entry IDs, `metadata` JSON, FTS5 triggers) and a zero-network-call guarantee
- **Rich journaling editor** — TipTap with Markdown round-trip, 5-level mood, on-the-fly tags with autocomplete + 8-color palette, configurable auto-save (500ms idle + N-second keepalive)
- **Timeline & calendar browsing** — keyset-paginated infinite scroll, monthly heatmap with day-click drilldown, inline entry expansion
- **Search & discovery** — FTS5 keyword search with phrase-wrap escaping, multi-filter (date/tag/mood, AND semantics), prior-year "On This Day"
- **Production polish** — photo attachments (no base64), PBKDF2-SHA256 PIN lock with idle auto-lock, full ZIP data export, light/dark theme, three font sizes
- **Local-first AI** — Ollama HTTP client with health-check gate, async embedding generation, vector similarity semantic search, RAG Q&A with UUID citations, graceful keyword fallback when Ollama is unavailable

### What Worked

- **CLAUDE.md as product spec** — the detailed product-vision doc gave planners enough context that every phase's CONTEXT.md felt like a natural next step, not an invention
- **GSD phase segmentation** — coarse 6-phase milestone was the right granularity; Phases 1→6 compose into a working app at each boundary
- **Sidecar pattern for risky migrations** — Phase 7's `local_date` column shipped as a PRAGMA-guarded ALTER with backfill, reused a pattern proven in Phase 1
- **Explicit must-have truths in PLAN.md frontmatter** — gsd-verifier could compare shipped state against must-haves without re-deriving from goals
- **Gap-closure cycle** — Phase 1's UAT-01 (DB migration ordering) and UAT-02 (TitleBar single-mount) were caught in post-Phase-5 regression testing; explicit 01-03 and 01-04 plans closed them surgically
- **Local-only AI** — Ollama HTTP with health check + keyword fallback is simpler than managing a bundled llama.cpp binary (which had the os-error-216 issue on Windows)

### What Was Inefficient

- **Phase 6's missing VERIFICATION.md** — Phase 6 shipped with UAT.md but no formal VERIFICATION.md artifact, breaking the gsd audit tooling's expectations; `audit-open` later tried to report but crashed on a separate bug (`ReferenceError: output is not defined` in gsd-tools.cjs@v1)
- **REQUIREMENTS.md checkbox drift** — Phase 5 delivered SEC-01..03, MEDIA-01..04, SETT-03 but their `[ ]` boxes were never flipped to `[x]`; had to catch this at milestone close and bulk-update with evidence pointers
- **Bundled llama.cpp binary download failure on Windows** (os error 216) — shipped built-in AI mode still fails on user machines without VC++ Redistributables; External Ollama is the real working path but we didn't mark built-in as "experimental" or hide it for Windows
- **STATE.md milestone-transition drift** — STATE.md still said `milestone: v1.0, status: completed` even after Phase 7 work began; `roadmap analyze` then reported v1.0 as the active milestone with phase_count: 7, hiding v1.1 phases from tooling
- **Built-in llama binary download** still flagged as a known UX issue carried into v1.1 — not triaged, just documented

### Patterns Established

- **Migration-ordering rule:** any index/trigger/view referencing a column added by a PRAGMA-guarded ALTER inside `initializeDatabase()` must run AFTER that guarded block as a standalone `db.execute()` call — NEVER inside `MIGRATION_SQL`, even behind `IF NOT EXISTS`. Enforced via 01-03 fix.
- **Dev-only raw error surfacing:** user-facing error branches render the underlying SQLite/Tauri message in a `<pre>` gated by `import.meta.env.DEV` so future diagnoses don't get misrouted to generic copy. Enforced via 01-03.
- **Single-mount invariant for window-chrome components:** `<TitleBar />` is mounted exactly once at the App.tsx root above the state switch — never nested inside any conditional branch. Enforced via 01-04.
- **Derived primitive selectors for dashboards:** dashboard widgets read `entryStore.totalEntries`, `dayStreak`, etc. — never `allEntries`. Prevents re-render storms during 500ms auto-save bursts. Shipped in Phase 7.
- **Local-date column over browser-local date math:** streak and date-grouping queries read `entries.local_date TEXT` (written at entry creation in user's local TZ), not `startOfDay(new Date())`. Eliminates DST/TZ edge cases. Shipped in Phase 7.
- **Blur-timeout + stopPropagation pattern for tag autocomplete:** 150ms blur timeout on TagInput lets `onMouseDown` fire on the autocomplete row before input blur; `stopPropagation` on row click prevents parent `onSelect` firing.
- **PBKDF2-SHA256 via Web Crypto API** (310k iterations) for PIN hashing — native browser API, no `argon2-browser` runtime dependency.
- **Multi-statement SQL splitter with BEGIN…END tracking** in `db.ts` handles FTS5 trigger bodies correctly — inlined migration approach chosen because `?raw` import is unreliable for files outside `src/`.

### Key Lessons

1. **Verify checkboxes against evidence at every phase transition** — not just at milestone close. Drift compounds silently.
2. **STATE.md needs to be updated immediately when a new milestone becomes active** — not lazily on demand. Tooling trusts the frontmatter milestone field and will hide newer phases otherwise.
3. **Build/type checks are a false signal when schema files drive types from config** — types come from the live database or the ORM config; run the push/migrate command as a BLOCKING verification step, not relying on `tsc --noEmit` alone.
4. **Bundle a fallback inference path on first install** — built-in (llama.cpp) + external (Ollama) dual-backend was the right architectural call; External Ollama is now the tested-working Windows path, and the built-in should be marked experimental until the os-error-216 root cause is resolved.
5. **Plan audits before milestone close** — running `/gsd-audit-milestone` catches checkbox drift and missing VERIFICATION artifacts before they become paper-trail gaps in the shipped milestone.
6. **No `npm run lint` script exists in this repo yet** — verifiers used `npx tsc --noEmit` as the type/lint surrogate; adding ESLint + a `lint` script is a v1.1 todo.

### Cost Observations

- Model mix: configured as `balanced` profile — researcher: sonnet, planner: opus, checker: sonnet
- Notable: opus-only planning produced plans that passed gsd-plan-checker in ≤3 iterations for every phase; sonnet research kept pre-planning cheap

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Plans | Tasks | Key Change |
|-----------|--------|-------|-------|------------|
| v1.0 | 6 | 23 | 34 | Initial milestone — established GSD workflow cadence |

### Cumulative Quality

| Milestone | Requirements | Coverage | Runtime Deps Added |
|-----------|--------------|----------|--------------------|
| v1.0 | 45/45 shipped | 100% | Tauri v2, React 19, TipTap v3, Zustand 5, shadcn/ui, sonner, lucide-react, Tailwind v3 |

### Top Lessons (Verified Across Milestones)

*(Will accumulate as v1.1, v1.2, etc. ship)*

1. Keep milestone-active state in STATE.md frontmatter synced when transitioning — tooling reads the frontmatter authoritatively
2. Audit requirement checkboxes at phase close, not milestone close
