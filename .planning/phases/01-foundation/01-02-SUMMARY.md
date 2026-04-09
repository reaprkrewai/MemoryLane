---
phase: 01-foundation
plan: 02
subsystem: infra
tags: [tauri, sqlite, react, zustand, tailwindcss, lucide-react, sonner]

# Dependency graph
requires:
  - 01-01 (Tailwind design tokens, shadcn/ui, Tauri scaffold, plugin-sql registered)
provides:
  - SQLite migration file at src-tauri/migrations/001_initial.sql
  - Database singleton (getDb, initializeDatabase) at src/lib/db.ts
  - Zustand UI store (useUiStore) at src/stores/uiStore.ts
  - Two-column app shell (TitleBar + Sidebar + main area) at src/components/AppShell.tsx
  - Custom 40px title bar with drag region and window controls at src/components/TitleBar.tsx
  - Sidebar nav rail with 4 items and amber active indicator at src/components/Sidebar.tsx
  - Empty state with privacy copy and CTA at src/components/EmptyState.tsx
  - Root App.tsx wiring DB init, loading/error/empty states
affects:
  - All future phases (inherit AppShell layout, DB init pattern, design tokens in components)
  - 02-editor (will import AppShell, useUiStore, getDb)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - DB init via useEffect on mount — initializeDatabase() called once, signals readiness via Zustand
    - Multi-statement SQL migration split by semicolons with BEGIN...END depth tracking for triggers
    - data-tauri-drag-region as pure flex-1 spacer, window controls in sibling div outside drag region
    - Active sidebar nav state via border-l-[3px] border-accent pattern (amber left border indicator)
    - Loading/error/empty state trifecta pattern in App.tsx driven by isDbReady + dbError Zustand fields

key-files:
  created:
    - src-tauri/migrations/001_initial.sql (canonical migration path for Plan 02; mirrors src-tauri/src/migrations/ from Plan 01)
    - src/lib/db.ts (Database.load singleton + initializeDatabase with statement splitter)
    - src/stores/uiStore.ts (Zustand: isDbReady, dbError, setDbReady, setDbError)
    - src/components/TitleBar.tsx (40px drag region + window controls outside drag zone)
    - src/components/Sidebar.tsx (w-60 nav rail, 4 items, amber active border)
    - src/components/AppShell.tsx (h-screen flex-col TitleBar + flex-1 row with Sidebar + main)
    - src/components/EmptyState.tsx (centered flex-col, BookOpen 48px, display heading, body, CTA)
  modified:
    - src/App.tsx (full rewrite: DB init useEffect, loading/error/empty states, Toaster)

key-decisions:
  - "Migration SQL inlined as template literal in db.ts — ?raw import unreliable for files outside src/"
  - "Multi-statement SQL splitting with BEGIN...END depth tracking to handle FTS5 triggers correctly"
  - "Window controls placed outside data-tauri-drag-region div to prevent mousedown interception"
  - "EmptyState uses no Card chrome per UI-SPEC — centered flex column only"
  - "DEV-only table verification console.log in initializeDatabase for development diagnostics"

requirements-completed:
  - AI-01
  - AI-02
  - AI-03
  - SETT-04

# Metrics
duration: 2min
completed: 2026-04-09
---

# Phase 1 Plan 02: App Shell + Database Init Summary

**SQLite schema migration, database singleton with statement splitter, Zustand UI store, and complete Tauri app shell (TitleBar, Sidebar, AppShell, EmptyState) — app launches into "Your journal is ready" empty state with zero network calls**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-04-09T21:38:40Z
- **Completed:** 2026-04-09T21:40:40Z
- **Tasks:** 2 completed
- **Files modified:** 8

## Accomplishments

- Created `src-tauri/migrations/001_initial.sql` with full Phase 1 schema: entries (UUID TEXT PK + metadata JSON), tags, entry_tags, entries_fts (FTS5 virtual table with 3 triggers), embeddings, settings — all idempotent via IF NOT EXISTS
- Created `src/lib/db.ts`: Database.load singleton with multi-statement SQL splitter that correctly handles BEGIN...END trigger bodies and executes each statement individually (required by tauri-plugin-sql which does not support multi-statement execute)
- Created `src/stores/uiStore.ts`: Zustand store tracking isDbReady and dbError for DB initialization lifecycle
- Created `src/components/TitleBar.tsx`: 40px custom title bar with data-tauri-drag-region spacer and window controls (Minus, Square, X) in a sibling div outside the drag region
- Created `src/components/Sidebar.tsx`: 240px nav rail with Journal/Calendar/Search/Settings, amber 3px left border + bg-bg active state
- Created `src/components/AppShell.tsx`: h-screen flex-col layout with TitleBar and flex-1 row containing Sidebar + main content area
- Created `src/components/EmptyState.tsx`: centered flex column with BookOpen 48px, "Your journal is ready" display heading, privacy body copy, accent CTA — no Card chrome per UI-SPEC
- Rewrote `src/App.tsx`: initializeDatabase() in useEffect, loading spinner (Loader2 animate-spin) while initializing, error state with exact UI-SPEC copy, EmptyState on success, sonner Toaster bottom-right

## Task Commits

1. **Task 1: SQLite migration, database singleton, UI store** — `c3ff779` (feat)
2. **Task 2: App shell components and DB init wiring** — `57d97f4` (feat)

## Files Created/Modified

- `src-tauri/migrations/001_initial.sql` — Canonical migration file at plan-02 expected path
- `src/lib/db.ts` — Database singleton: getDb() + initializeDatabase() with SQL statement splitter
- `src/stores/uiStore.ts` — Zustand store: isDbReady, dbError, setDbReady, setDbError
- `src/components/TitleBar.tsx` — Custom title bar with Tauri drag region and window controls
- `src/components/Sidebar.tsx` — Nav rail: 240px, 4 items, amber active indicator
- `src/components/AppShell.tsx` — Two-column layout shell
- `src/components/EmptyState.tsx` — First-launch empty state with exact UI-SPEC copy
- `src/App.tsx` — Root component with full DB init lifecycle wiring

## Decisions Made

- **Migration SQL inlined in db.ts:** The `?raw` import for files outside the `src/` directory is unreliable in Vite without explicit config. Inlining the SQL as a template literal guarantees it is available at runtime without additional build configuration.
- **Multi-statement SQL splitter with BEGIN...END tracking:** tauri-plugin-sql's `execute()` method does not support multiple statements in one call. The splitter tracks nesting depth (BEGIN increments, END decrements) to avoid splitting FTS5 trigger bodies at their internal semicolons.
- **Window controls outside drag region:** Per RESEARCH.md Pitfall 5 — interactive elements inside data-tauri-drag-region have mousedown intercepted; placing them in a sibling div ensures reliable click handling on Windows and macOS.
- **No Card in EmptyState:** UI-SPEC explicitly states "No card chrome, no border, no shadow" for the empty state. Centered flex column with gap-4 only.
- **DEV-only diagnostic in initializeDatabase:** Console.log of table names gated on `import.meta.env.DEV` — provides visibility during development without polluting production logs.

## Deviations from Plan

None — plan executed exactly as written.

The SQL migration already existed at `src-tauri/src/migrations/001_initial.sql` from Plan 01. Plan 02 specified a new path `src-tauri/migrations/001_initial.sql` — both files are identical in content. This is a path duplication, not a conflict. Both files are committed; the one at `src-tauri/migrations/` is the canonical path referenced by `src/lib/db.ts`.

## Known Stubs

- **Sidebar nav items** (Journal, Calendar, Search, Settings): clicking these items does not navigate anywhere — routes are stubs. This is intentional per the plan: "Phase 1: 'journal' is always active; routing comes in Phase 2+." Future plans will wire routing.
- **EmptyState CTA** ("Write your first entry"): the `<span>` has no onClick handler. This will be wired when the entry editor ships in Phase 2.

These stubs do not prevent the plan's goal from being achieved — the plan objective is the app shell and DB initialization, not navigation or entry creation.

## Self-Check: PASSED

All key files exist at their expected paths. Both task commits (c3ff779, 57d97f4) confirmed in git log.

---
*Phase: 01-foundation*
*Completed: 2026-04-09*
