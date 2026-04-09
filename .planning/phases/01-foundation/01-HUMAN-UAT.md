---
status: partial
phase: 01-foundation
source: [01-VERIFICATION.md]
started: 2026-04-09T00:00:00Z
updated: 2026-04-09T00:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. App Compilation and Launch
expected: Run `npm run tauri dev` — native window opens with custom title bar, sidebar (Journal nav item highlighted), spinner then "Your journal is ready" empty state, "Journal opened" toast bottom-right
result: [pending]

### 2. Window Minimum Size Constraint
expected: Dragging window edges below 960×600 is resisted — window does not shrink below minimums
result: [pending]

### 3. Window Control Buttons
expected: Minimize/Maximize/Close buttons in the custom title bar each perform their OS action via Tauri API
result: [pending]

### 4. Zero Network Calls
expected: Opening WebView devtools Network tab on launch shows zero requests to any external domain
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
