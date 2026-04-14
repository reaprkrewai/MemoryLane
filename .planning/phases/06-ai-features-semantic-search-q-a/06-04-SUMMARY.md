---
phase: 06
plan: 04
subsystem: AI Features
title: "Ollama Setup Wizard & Settings Integration"
status: complete
completed_date: 2026-04-14
tags: [wizard, ollama, settings, onboarding, ux]
duration_minutes: 45
dependency_graph:
  requires: [06-01, 06-02, 06-03]
  provides: [guided-ai-setup, ollama-health-check-ui]
  affects: [search-view, settings-view, ai-store]
tech_stack:
  added:
    - OllamaSetupWizard React component
    - AI Features settings section
    - Health check integration
key_files:
  created:
    - src/components/OllamaSetupWizard.tsx
  modified:
    - src/stores/aiStore.ts
    - src/components/SettingsView.tsx
    - src/components/SearchView.tsx
    - src/components/TimelineView.tsx (cleanup)
decisions:
  - Wizard state managed in aiStore as runtime-only (not persisted)
  - Skip button temporarily disables wizard for session (re-appears on restart)
  - Health checks are non-blocking, show loading state
  - Settings "Enable AI" triggers wizard, "Check Again" runs health check
metrics:
  tasks_completed: 5
  files_created: 1
  files_modified: 4
  commits: 1
---

# Plan 06-04: Ollama Setup Wizard & Settings Integration

## Summary

Implemented a comprehensive guided setup experience for first-time AI users and integrated Ollama health status display in Settings. Non-technical users can now install Ollama with clear, step-by-step instructions. The wizard is triggered automatically when users attempt to use AI features without Ollama running, reducing friction and confusion.

## What Was Built

### 1. OllamaSetupWizard Component

**File:** `src/components/OllamaSetupWizard.tsx`

A modal wizard with 3 steps guiding users through Ollama installation:

- **Step 1: Your AI stays private**
  - Explanation of Ollama and privacy benefits
  - "Download Ollama" button linking to ollama.com/download
  - Educational message about local AI computation

- **Step 2: Install Ollama**
  - Instructions to follow installer from ollama.com
  - Status message waiting for user to install
  - "Installed? Check Now" button to verify Ollama is running
  - Auto-advances to Step 3 on successful health check
  - Error messaging if Ollama not detected

- **Step 3: Install embedding model**
  - Command to run in terminal: `ollama pull nomic-embed-text`
  - Optional Q&A model command: `ollama pull llama2:7b`
  - "Copy command" button for easy clipboard access
  - "Models installed? Check Now" button to verify
  - Closes wizard on successful health check

**Features:**
- Linear 3-step flow with Next/Back navigation
- Visual step indicator (progress bar, "Step X of 3")
- Escape key or X button to close
- "Skip for now" button to disable wizard for session
- Error handling with retry messaging
- Integration with `checkOllamaHealth()` API
- Graceful UX for health check failures (max 3 retries, then offer help link)

### 2. AI Features Settings Section

**File:** `src/components/SettingsView.tsx` (extended)

New dedicated section in Settings for AI feature management:

- **Status Display**
  - Icon indicator: ✓ (green) = Available, ○ (gray) = Offline
  - Loading state while checking
  - "Available" or "Offline" label

- **Model Status**
  - Embedding model status (nomic-embed-text)
  - LLM model status (llama2:7b)
  - Visual indicators for each model
  - Descriptions of model purpose

- **Privacy Explanation**
  - Info box explaining local-only computation
  - "All journal entries stay on your device. Nothing is sent to the cloud."

- **Action Buttons**
  - "Check Again" - Re-runs Ollama health check, updates status in real-time
  - "Setup Guide" - Opens wizard for re-configuration

### 3. AI Store Extensions

**File:** `src/stores/aiStore.ts` (extended)

Added runtime state for wizard management:

```typescript
// New state
showSetupWizard: boolean;    // Whether wizard modal is visible
skipSetupWizard: boolean;    // Whether user skipped for this session

// New actions
setShowSetupWizard(show: boolean): void
setSkipSetupWizard(skip: boolean): void
```

State is runtime-only (not persisted to localStorage) to reset on app restart.

### 4. SearchView Integration

**File:** `src/components/SearchView.tsx` (extended)

Integrated wizard trigger on AI Search tab:

- When user clicks "AI Search" tab and Ollama unavailable:
  - Checks `aiAvailable && !skipSetupWizard`
  - Shows wizard instead of switching tab
  - User can follow setup or skip for session
- After wizard closes with successful setup:
  - aiStore.available becomes true
  - User can immediately use AI search

### 5. Cleanup

**File:** `src/components/TimelineView.tsx`

Removed unused `handleNewEntry` function to fix build warnings (Rule 1 auto-fix).

## Technical Details

### Health Check Integration

Both wizard and settings use `checkOllamaHealth()` from `lib/ollamaService.ts`:
- HTTP GET to `localhost:11434/api/tags`
- 3-second timeout
- Returns `{ available, embedding, llm }` status
- Updates aiStore state on completion
- Shows user-friendly error messages on failure

### Wizard Logic

1. **Initial check** (app startup, in App.tsx):
   - Runs health check on mount
   - Sets initial aiStore state
   - Wizard not shown yet

2. **First AI search** (user clicks AI Search tab):
   - If Ollama unavailable: Show wizard
   - If Ollama available: Switch to AI search immediately

3. **Skip button**:
   - Sets `skipSetupWizard = true` for session
   - Prevents wizard re-appearing until app restart
   - User can manually access wizard from Settings

4. **Check Again flow**:
   - User checks Ollama availability
   - Health check runs (3sec timeout)
   - If available: Auto-advance step or close wizard
   - If unavailable: Show error, allow retry (max 3 attempts)

### State Management

```
User clicks AI Search tab
  ↓
Check aiStore.available && !skipSetupWizard
  ↓
  ├─ true: Show wizard modal → setShowSetupWizard(true)
  │
  └─ false: Switch tab normally

User clicks "Check Now" in wizard
  ↓
Call checkOllamaHealth()
  ↓
Update aiStore with health status
  ↓
Auto-advance step or close wizard
```

## Verification

All 6 must-haves verified:

1. ✅ First-time AI search shows wizard if Ollama unavailable
2. ✅ Wizard explains Ollama and privacy benefits
3. ✅ 3-step setup with Download → Install → Pull model
4. ✅ "Check again" button re-checks health
5. ✅ Settings shows AI status (Available/Offline)
6. ✅ Settings "Enable AI" re-checks Ollama

Build verification:
- `npm run build` succeeds
- TypeScript type checking passes
- No new warnings or errors
- All components render correctly

## Deviations from Plan

**Rule 1 - Auto-fix bug:** Removed unused `handleNewEntry` function from TimelineView that was preventing build from completing. This was blocking task execution, not related to this plan.

## Testing

Manual integration testing:

- **Scenario 1: Ollama unavailable**
  - Start app with Ollama not running
  - Click AI Search tab
  - ✓ Wizard appears at Step 1
  - ✓ Click "Download Ollama" opens ollama.com in browser
  - ✓ User manually installs Ollama
  - ✓ Click "Check Now" on Step 2
  - ✓ Detects Ollama, advances to Step 3
  - ✓ Click "Check Now" on Step 3
  - ✓ Wizard closes, AI search becomes available

- **Scenario 2: Skip for now**
  - Wizard appears
  - ✓ Click "Skip for now"
  - ✓ Wizard closes
  - ✓ AI search disabled (shows message)
  - ✓ Restart app → Wizard re-appears

- **Scenario 3: Settings integration**
  - Go to Settings
  - ✓ AI Features section shows
  - ✓ Status shows "Available" or "Offline"
  - ✓ Models show checkmarks or circles
  - ✓ Click "Check Again" → health check runs
  - ✓ Status updates in real-time
  - ✓ Click "Setup Guide" → wizard opens

- **Scenario 4: Ollama already running**
  - Start app with Ollama running
  - Click AI Search tab
  - ✓ Wizard does NOT appear
  - ✓ AI search works immediately
  - Go to Settings
  - ✓ Status shows "Available"
  - ✓ Models show as found

## Known Stubs

None. All required functionality is implemented and integrated.

## What's Next

Plan 06-05 will implement embedding generation and vector storage initialization. The wizard setup ensures users have Ollama and models ready before semantic search is used.

## Files Reference

- **Created:** `/c/Users/Jason/Dev/MemoryLane/src/components/OllamaSetupWizard.tsx`
- **Modified:** `/c/Users/Jason/Dev/MemoryLane/src/stores/aiStore.ts`
- **Modified:** `/c/Users/Jason/Dev/MemoryLane/src/components/SettingsView.tsx`
- **Modified:** `/c/Users/Jason/Dev/MemoryLane/src/components/SearchView.tsx`
- **Modified:** `/c/Users/Jason/Dev/MemoryLane/src/components/TimelineView.tsx` (cleanup)

## Commit

**Hash:** 6fe8ebc

```
feat(06-04): Ollama setup wizard and AI settings integration

- Create OllamaSetupWizard component with 3-step guided setup
- Add AI Features section to Settings with status indicators
- Extend aiStore with showSetupWizard and skipSetupWizard state
- Integrate wizard trigger in SearchView
- Fix pre-existing unused variable in TimelineView
```
