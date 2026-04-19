# Phase 5: Media, Security & Settings - Context

**Gathered:** 2026-04-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 5 delivers the final polish to Chronicle AI v1:
1. **Security** — Users can set a PIN on first launch, change it anytime in Settings. App auto-locks after a configurable idle period. PIN is hashed with argon2 + salt.
2. **Media** — Users can attach up to 5-10 photos per entry (JPEG, PNG, WebP). Photos stored in app data directory. Timeline shows thumbnail strip; expanded/editor view shows full gallery.
3. **Settings** — Full-page Settings view accessible via sidebar nav. Grouped sections: Appearance (theme, font size), Security (idle timeout, change PIN), Data (export).
4. **Data Export** — One-click export to ZIP containing JSON + separate /photos/ folder. JSON includes entries, photo references, settings config, and app metadata.

Together these features complete the production-ready v1 journaling app.

</domain>

<decisions>
## Implementation Decisions

### Security: PIN & App Lock

- **D-01:** PIN-based lock (numeric, 4-6 digits). Not a full password — faster to enter on app launch, easier to remember, appropriate for personal journaling device.
- **D-02:** PIN set on first launch; users must enter it before app is usable. Stored hashed (argon2 + salt) in SQLite — never in plain text.
- **D-03:** PIN can be changed anytime via Settings > Security section. Users select "Change PIN", enter current PIN, set new PIN with confirmation.
- **D-04:** Idle auto-lock is configurable: 1 minute / 5 minutes / 15 minutes / 30 minutes / Never. Default: 5 minutes (balanced — standard for sensitive apps).
- **D-05:** When app is locked, display a PIN entry screen with numeric keypad. Visual feedback (masked dots) as user enters digits. "Forgot PIN" recovery → TODO (deferred; out of scope for v1).

### Media: Photo Attachment & Storage

- **D-06:** Multiple photos per entry (min 1, max 5-10). User can add/remove photos in the editor via "Attach Photo(s)" button. Drag-to-reorder photos in gallery.
- **D-07:** Supported formats: JPEG, PNG, WebP. Validation on file selection (reject unsupported types). No HEIC/HEIF conversion (Windows complexity not justified for v1).
- **D-08:** Photos stored in app data directory at: `{app_data}/photos/{entry_id}/{uuid}.{ext}`. Organized by entry ID for clean backup/export.
- **D-09:** Thumbnail generation: Create 100x100px thumbnails for timeline preview (lazy-loaded). Full-resolution stored for editor/expanded view.
- **D-10:** Timeline card displays thumbnail strip (40-60px thumbnails in a horizontal row, up to 3 visible, scroll if more).
- **D-11:** Expanded entry view (inline in timeline) shows full gallery: larger thumbnails arranged in a grid or carousel. Clicking a thumbnail shows full-size.
- **D-12:** Editor view shows photo gallery below the text area. Users can click photo to remove, drag to reorder.

### Settings UI & Architecture

- **D-13:** Settings is a full page view accessed via sidebar "Settings" nav item (consistent with Journal/Calendar/Search pattern).
- **D-14:** Settings are grouped into three sections: 
  - **Appearance** — Light/dark mode toggle, font size selector (small/medium/large)
  - **Security** — Idle timeout selector (1/5/15/30 min / never), "Change PIN" button
  - **Data** — "Export Data" button, app version/build info at bottom
- **D-15:** No "Reset to Defaults" button needed — settings are minimal; users can manually adjust if desired.
- **D-16:** Theme persists in `uiStore` (existing pattern). Font size also persists in `uiStore` + CSS custom property `--font-scale` applied to document root.

### Data Export: Format & Contents

- **D-17:** Export format: ZIP file containing `metadata.json` + `/photos/` folder.
- **D-18:** `metadata.json` structure (top-level):
  ```json
  {
    "version": "1.0.0",
    "exportedAt": "2026-04-13T14:30:00Z",
    "entries": [
      {
        "id": "uuid",
        "date": "2026-04-13T...",
        "content": "Markdown text...",
        "mood": "great",
        "tags": ["tag1", "tag2"],
        "photos": ["photos/entry-uuid/photo1.jpg", "photos/entry-uuid/photo2.jpg"]
      }
    ],
    "tags": [
      { "id": "tag-uuid", "name": "work", "color": "#F59E0B" }
    ],
    "settings": {
      "theme": "dark",
      "fontSize": "medium",
      "idleTimeout": 5
    }
  }
  ```
- **D-19:** Photos in ZIP are organized: `/photos/{entry_id}/{filename}.{ext}`. Filenames are UUIDs to avoid conflicts.
- **D-20:** Export triggered by "Export Data" button in Settings > Data. User selects file location via file dialog. Confirmation toast on success.

### Claude's Discretion

- Exact PIN entry UX (animated numeric keypad, haptic feedback if available)
- Thumbnail size for timeline (40px vs 60px)
- Gallery layout in expanded view (grid vs carousel vs both)
- Font size exact pixel values (base 14px? 16px?) for small/medium/large
- Theme toggle UI (switch vs radio buttons)
- ZIP library selection (native Tauri, node-zip, etc.)
- Exact error messages and recovery flows for invalid PIN entry

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — SEC-01, SEC-02, SEC-03, MEDIA-01 through MEDIA-04, SETT-01, SETT-02, SETT-03 are the complete Phase 5 scope

### Existing Code (must extend, not replace)
- `src/components/AppShell.tsx` — Main layout. Settings becomes a new view routed via viewStore (like Timeline, Calendar, Search).
- `src/components/Sidebar.tsx` — Settings nav item already exists. Phase 5 wires up handleNavClick("settings") to setView("settings").
- `src/stores/viewStore.ts` — Add "settings" to ActiveView union. Settings is a top-level view like "journal", "calendar", "search".
- `src/stores/uiStore.ts` — Already exists. Phase 5 extends with: `theme` (light|dark), `fontSize` (small|medium|large), `idleTimeout` (1|5|15|30|never).
- `src/lib/db.ts` — Extend schema with new `app_lock` table (pin_hash, pin_salt, last_locked_at) and `media_attachments` table (entry_id, photo_path, thumbnail_path, display_order).
- `src/styles/globals.css` — Design tokens. Add CSS custom property `--font-scale` for font size variants.

### Design System
- `src/styles/globals.css` — Amber accent, warm stone palette already established. Phase 5 ensures theme toggle works with dark mode CSS classes (`.dark` already in Tailwind config).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `viewStore` + `JournalView` — Settings view follows same routing pattern. `setView("settings")` → render `<SettingsView />`
- `uiStore` (Zustand) — Extend with theme, fontSize, idleTimeout. Pattern: `create<UIState>()` with flat state + setters.
- `entryStore` — Already loads entries. Media attachments will be queried alongside entries (add `photos: Photo[]` to Entry type).
- `sonner` Toaster — Use for export success/error feedback
- `lucide-react` — Icons already in use. Use `Lock`, `Key`, `Image`, `Settings`, `Download` for new UI.
- Tailwind CSS + custom tokens — New components (SettingsView, PinEntryScreen, PhotoGallery) use existing design tokens.

### Established Patterns
- State: Zustand flat slices (`create<State>((set, get) => ({...}))`)
- DB access: `getDb()` + `db.select<T[]>()` / `db.execute()`
- Styling: Tailwind + custom CSS properties (--color-bg, --color-text, etc.)
- View routing: `activeView` in `viewStore` → conditional render in `JournalView`
- Sidebar nav: `handleNavClick(id)` → `setView(id)`

### Integration Points
- `App.tsx` — Already wires up routes. No changes needed (SettingsView is just another view).
- `Sidebar.tsx` — Already has Settings nav item. Just ensure `handleNavClick("settings")` calls `setView("settings")`.
- `JournalView.tsx` — Add: `if (activeView === "settings") return <SettingsView />;`
- `EntryEditor.tsx` — Add "Attach Photo(s)" button below tag row. Opens file picker.
- `TimelineCard.tsx` — Add photo thumbnail strip preview (if entry has photos).
- `db.ts` — Add migration: `CREATE TABLE app_lock(...)` and `CREATE TABLE media_attachments(...)`.
- Tauri Rust side — No changes needed. All DB access through `@tauri-apps/plugin-sql`.

</code_context>

<specifics>
## Specific Ideas

- PIN entry screen should feel secure but not paranoid. Masked dots as user types, clear feedback on entry.
- Photo gallery in expanded view should be satisfying to scroll through — smooth carousel or grid that feels responsive.
- Settings should be grouped clearly with section headers. No overwhelming list of toggles.
- Export success message should confirm file location: "Exported to ~/Downloads/chronicle-export-2026-04-13.zip"
- Theme toggle should take effect immediately (no refresh needed). Dark mode on the same page without loading spinner.

</specifics>

<deferred>
## Deferred Ideas

- "Forgot PIN" recovery flow (security question, email recovery, etc.) — Out of scope for v1. User must reinstall if PIN is lost.
- Automated scheduled backups — Deferred to v2 (Phase 8+). v1: one-click manual export only.
- Photo editing/cropping in-app — Out of scope. Photos are attach-and-display only.
- Encrypted export option (passphrase-protected ZIP) — Deferred. v1 exports are unencrypted (files stay local until moved by user).
- "Biometric unlock" (Face ID, Touch ID) — Windows-first focus; may add later for Mac/iOS.

</deferred>

---

*Phase: 05-media-security-settings*
*Context gathered: 2026-04-13*
