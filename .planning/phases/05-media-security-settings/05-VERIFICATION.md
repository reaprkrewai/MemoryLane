# Phase 5: Verification & UAT

**Phase:** 05 — Media, Security & Settings  
**Prepared:** 2026-04-13  
**Status:** Ready for Execution

---

## Overview

This document defines the verification criteria for Phase 5. When all 4 plans are executed, the following requirements must be verified before Phase 5 is considered complete.

---

## Requirements Verification Matrix

### Security (SEC-01, SEC-02, SEC-03)

| Req | Acceptance Criteria | Verification Method | Status |
|-----|-------------------|---------------------|--------|
| **SEC-01** | User can set a PIN on first app launch | Launch app, see PIN setup screen, enter PIN | Pending |
| | PIN setup is mandatory (app unusable without PIN) | Close setup modal without entering PIN; app prevents bypass | Pending |
| | PIN must be 4-6 numeric digits | Try shorter PIN (rejected), try non-numeric (rejected), enter valid PIN (accepted) | Pending |
| | PIN is hashed with argon2 (never stored plain text) | Inspect DB: verify pin_hash is present, pin_salt is present, content is unreadable | Pending |
| **SEC-02** | App shows PIN entry screen when launched with existing PIN | Restart app, verify PIN entry screen appears before any content visible | Pending |
| | Correct PIN unlocks app | Enter correct PIN, verify app content is visible | Pending |
| | Incorrect PIN shows error | Enter wrong PIN 3x, verify error message appears each time | Pending |
| | Failed PIN attempts don't lock user out permanently (v1) | After 3 failures, user can still retry | Pending |
| **SEC-03** | Idle timeout is configurable in Settings | Open Settings, see idle timeout selector with 1/5/15/30/never options | Pending |
| | App auto-locks after idle period | Set timeout to 1 min, stop interacting, verify app locks after ~1 min | Pending |
| | User activity resets idle timer | Type in editor, verify idle counter resets | Pending |
| | "Never" timeout disables auto-lock | Select "Never", wait 5+ min, verify app stays unlocked | Pending |

### Media (MEDIA-01, MEDIA-02, MEDIA-03, MEDIA-04)

| Req | Acceptance Criteria | Verification Method | Status |
|-----|-------------------|---------------------|--------|
| **MEDIA-01** | User can attach photos from disk | Click "Attach Photos" in editor, select files from OS picker | Pending |
| | Multiple photos can be selected at once | Select 3+ photos in one dialog, verify all are attached | Pending |
| | Only JPEG/PNG/WebP are accepted | Try attaching GIF/BMP/HEIC, verify error message | Pending |
| | User can attach up to 5-10 photos per entry | Attach max number, verify success; try adding one more, verify rejection | Pending |
| **MEDIA-02** | Photos are stored in app data directory | Inspect filesystem: verify photos exist at `{app_data}/photos/{entry_id}/{uuid}.{ext}` | Pending |
| | Thumbnails are generated and stored | Verify 100x100px thumbnail exists at `{app_data}/photos/{entry_id}/{uuid}-thumb.{ext}` | Pending |
| | Photos are not embedded in entry Markdown | Open exported JSON, verify content field has no base64 images | Pending |
| | Media metadata is stored in media_attachments table | Query DB: verify photo paths, sizes, MIME types are recorded | Pending |
| **MEDIA-03** | Photos display in timeline card preview | Add entry with photos, view timeline, verify thumbnail strip appears | Pending |
| | Thumbnail strip shows first 3 photos | Add entry with 5 photos, verify timeline shows 3 thumbnails + "+2" indicator | Pending |
| | Clicking photo expands entry | Click thumbnail in timeline, verify expanded view loads | Pending |
| | Expanded view shows full photo gallery | Expand entry with 5 photos, verify all 5 thumbnails are visible | Pending |
| | Photos can be clicked to view full-size | Click thumbnail in expanded view, verify full-size preview appears | Pending |
| **MEDIA-04** | User can remove a photo from editor | Open entry for editing, click X on photo, verify removal | Pending |
| | Removed photo is deleted from disk | After removal, inspect filesystem: verify photo file is deleted | Pending |
| | Removed photo record is deleted from DB | Query media_attachments: verify record is gone | Pending |
| | Removing one photo doesn't affect others | Add 3 photos, remove middle one, verify other 2 remain | Pending |

### Settings (SETT-01, SETT-02)

| Req | Acceptance Criteria | Verification Method | Status |
|-----|-------------------|---------------------|--------|
| **SETT-01** | Settings page is accessible from sidebar | Click "Settings" in nav, verify page loads | Pending |
| | Theme toggle switches between light and dark mode | Click light/dark toggle, verify colors update immediately on same page | Pending |
| | Dark mode is readable (good contrast) | View all text, UI elements in dark mode; verify readability | Pending |
| | Light mode is readable (good contrast) | View all text, UI elements in light mode; verify readability | Pending |
| | Theme persists across app restart | Change to dark mode, restart app, verify dark mode is still active | Pending |
| | No page reload required to apply theme | Change theme, verify no loading spinner, no flashing | Pending |
| **SETT-02** | Font size selector shows 3 options (small/medium/large) | Open Settings, verify 3 radio buttons or selection UI | Pending |
| | Selecting small increases all text by ~12% | Select small, measure baseline font size, verify increase of ~12% | Pending |
| | Selecting large decreases all text by ~12% | Select large, measure baseline font size, verify increase of ~12% | Pending |
| | Font size persists across app restart | Change to large, restart app, verify large is still active | Pending |
| | Font changes don't break layout | Change to each size, scroll through timeline/editor, verify no UI breaks | Pending |

### Data Export (SETT-03)

| Req | Acceptance Criteria | Verification Method | Status |
|-----|-------------------|---------------------|--------|
| **SETT-03** | Export button is visible in Settings > Data section | Open Settings, scroll to Data section, verify "Export Data" button | Pending |
| | Clicking Export opens file save dialog | Click button, verify OS file picker dialog appears | Pending |
| | Default filename is date-stamped | Verify default name is `chronicle-export-{YYYY-MM-DD}.zip` | Pending |
| | User can choose save location | Navigate to Downloads in picker, click Save, verify file saved there | Pending |
| | ZIP file is created with correct structure | Extract ZIP, verify `metadata.json` at root, `/photos/{entry_id}/` folders | Pending |
| | metadata.json includes all entries | Export, extract, verify JSON contains all entries from timeline | Pending |
| | metadata.json includes all tags | Export, extract, verify all tags are listed in JSON | Pending |
| | metadata.json includes all photos with correct paths | Export, extract, verify photo paths match `/photos/{entry_id}/{filename}` | Pending |
| | Photos are intact after export/extract | Export, extract, open photos, verify images display correctly | Pending |
| | Success toast shows export location | Click Export, complete dialog, verify toast displays file path | Pending |
| | Export works with 100+ entries | Create 100+ entries, export, verify ZIP is complete and valid | Pending |

---

## Integration Testing

### Cross-Feature Scenarios

| Scenario | Steps | Expected Outcome | Status |
|----------|-------|------------------|--------|
| **Secure Entry Workflow** | 1. Create entry | Entry saved with auto-save | Pending |
| | 2. Add photos | Photos attach successfully | Pending |
| | 3. Lock app (idle) | App locks, PIN screen appears | Pending |
| | 4. Unlock with PIN | Entry is still visible | Pending |
| | 5. Export data | Entry + photos are in ZIP | Pending |
| **Photo Persistence** | 1. Add entry with 3 photos | Photos display in timeline | Pending |
| | 2. Restart app | Photos still visible (load from disk) | Pending |
| | 3. Open entry editor | All photos still present | Pending |
| | 4. Remove 1 photo | Removed from editor AND from disk | Pending |
| **Theme Sync** | 1. Create entry in light mode | UI is light | Pending |
| | 2. Switch to dark mode | Colors update immediately, entry still visible | Pending |
| | 3. Add photo | Photo displays correctly in dark mode | Pending |
| | 4. Restart app | Dark mode persists | Pending |
| **Large Dataset** | 1. Import or create 500+ entries | App doesn't crash | Pending |
| | 2. Add 1+ photos to 100+ entries | Timeline loads smoothly | Pending |
| | 3. Export all data | ZIP completes in reasonable time (<30s) | Pending |
| | 4. Extract ZIP on another machine | All files are intact, readable | Pending |

---

## Performance Benchmarks

| Metric | Target | Method | Status |
|--------|--------|--------|--------|
| PIN Entry Verification | <1s | Time between entering PIN and app unlock | Pending |
| Photo Attachment | <2s | Time from file selection to attachment confirmation | Pending |
| Thumbnail Generation | <500ms per photo | Time to generate 100x100 thumbnail | Pending |
| Timeline Load (100 entries, 1 photo each) | <3s | Time for timeline to render 100 entries with photos | Pending |
| Settings Theme Toggle | <100ms | Time from click to color change visible | Pending |
| Export (100 entries, 50 photos) | <10s | Time from Export button to ZIP file save | Pending |

---

## UI/UX Verification

### PIN Security
- [ ] PIN entry screen feels secure (masked input, clear feedback)
- [ ] Error messages are helpful ("PIN incorrect, try again" not "auth failed")
- [ ] Unlock flow is fast (<1s)
- [ ] Keypad is easy to tap/click (buttons are not too small)

### Photo Gallery
- [ ] Thumbnail strip doesn't break timeline layout
- [ ] Photos load without blocking timeline scroll
- [ ] Expanded gallery is satisfying to interact with (smooth, fast)
- [ ] Gallery scroll works smoothly (no jank)

### Settings Page
- [ ] Settings sections are clearly grouped (visual separation)
- [ ] All controls are clearly labeled
- [ ] Changes apply instantly (no "Save" button needed)
- [ ] Layout is responsive on different screen sizes

### Data Export
- [ ] Export button is discoverable (labeled clearly, placed logically)
- [ ] Success message is clear and confirms file location
- [ ] Error messages don't baffle users ("Permission denied" vs "Export failed")
- [ ] Export doesn't freeze the UI (use async/loading indicators)

---

## Data Integrity Checks

### Database
- [ ] PIN hash cannot be reversed (verify argon2 one-way)
- [ ] Deleting entry removes associated photos from DB
- [ ] Deleting photo removes record from media_attachments
- [ ] Foreign keys are enforced (delete entry → delete photos)

### File System
- [ ] Photo files exist on disk after attachment
- [ ] Thumbnail files exist and are correct size (~10KB for 100x100)
- [ ] Deleted photos are actually removed (not just hidden)
- [ ] No orphaned files left after operations

### Export
- [ ] metadata.json is valid JSON (can be parsed)
- [ ] All entry content is preserved (no truncation)
- [ ] All photo paths are relative (portable across machines)
- [ ] Photo files in ZIP match references in metadata.json

---

## Security Spot Checks

- [ ] PIN is never logged or displayed in plaintext
- [ ] No console.log() statements that expose sensitive data
- [ ] Idle timeout doesn't reset on app backgrounding in unusual ways
- [ ] Exported ZIP doesn't contain any secrets (tokens, hashes, etc.)
- [ ] File picker correctly filters file types (no arbitrary file upload)

---

## Execution Tracking

### Pre-Execution Checklist
- [ ] All 4 plans (05-01, 05-02, 05-03, 05-04) are reviewed
- [ ] Context (05-CONTEXT.md) and decisions are understood
- [ ] Dependencies (argon2, jszip, Tauri plugins) are available
- [ ] Testing environment is ready (test DB, test filesystem)

### During Execution
- [ ] Code review gates are passed
- [ ] Unit tests are written and passing
- [ ] Integration tests cover cross-plan scenarios
- [ ] No console errors or warnings in browser DevTools

### Post-Execution
- [ ] All checkboxes above are ticked (Pending → Done)
- [ ] Edge cases are tested (empty entries, large datasets, invalid inputs)
- [ ] Performance benchmarks are met or documented if exceeded
- [ ] User feedback is gathered (if applicable for UAT)

---

## Sign-Off Criteria

Phase 5 is **COMPLETE** when:

1. ✅ All 4 plans are fully executed
2. ✅ All 11 requirements are verified as met
3. ✅ All integration tests pass
4. ✅ Performance benchmarks are met (or variance documented)
5. ✅ No data loss or corruption found
6. ✅ UI/UX verification is satisfied
7. ✅ Security spot checks pass
8. ✅ No known bugs remain (or tracked as backlog items)

**Verification conducted by:** Claude + User Review  
**Target completion date:** 2026-04-30 (estimated based on 4-week execution cycle)

---

*Verification: 05-VERIFICATION.md*  
*Phase: 5 — Media, Security & Settings*  
*Ready for Execution*
