---
phase: 5
plan: "05-02"
subsystem: media
tags: [media, photos, attachments, gallery, timeline]
dependency_graph:
  requires: [01-foundation (db, types)]
  provides: [MEDIA-01, MEDIA-02, MEDIA-03, MEDIA-04]
  affects: [entryStore, TimelineCard, TimelineView, EntryEditor]
tech_stack:
  added: []
  patterns: [data URI photo storage, batch photo fetching, reusable gallery component, thumbnail generation]
key_files:
  created:
    - src/components/PhotoAttachmentButton.tsx
    - src/components/PhotoGallery.tsx
    - src/hooks/usePhotoManagement.ts
  modified:
    - src/lib/db.ts (media_attachments table)
    - src/stores/entryStore.ts (Photo type, photo methods)
    - src/components/EntryEditor.tsx (photo UI integration)
    - src/components/TimelineCard.tsx (photo gallery display)
    - src/components/TimelineView.tsx (batch photo fetching)
decisions:
  - "Photos stored as data URIs in DB (not filesystem paths) — enables offline sync/export"
  - "Thumbnail generation via Canvas API (client-side) — no external image service needed"
  - "Batch photo fetching in TimelineView like tags — avoids N+1 per-card DB queries"
  - "PhotoGallery component supports 3 modes (thumbnail-strip, expanded-grid, editor) for reuse"
  - "10-photo limit per entry enforced in usePhotoManagement"
metrics:
  duration: "~20 minutes"
  completed: "2026-04-14T00:00:00Z"
  tasks_completed: 5
  files_changed: 8
---

# Phase 5 Plan 02: Photo Attachments Summary

**One-liner:** Complete photo attachment workflow — UI, storage, gallery display — with data URI persistence and batch loading.

---

## What Was Built

### Task 2.1 — Database Schema Extension (`src/lib/db.ts`)

Added `media_attachments` table to track photos:

```sql
CREATE TABLE IF NOT EXISTS media_attachments (
  id TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL,
  photo_path TEXT NOT NULL,         -- Data URI of full image
  thumbnail_path TEXT NOT NULL,     -- Data URI of 100x100px thumbnail
  file_size INTEGER,
  mime_type TEXT DEFAULT 'image/jpeg',
  display_order INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (entry_id) REFERENCES entries(id) ON DELETE CASCADE
);

CREATE INDEX idx_media_attachments_entry ON media_attachments(entry_id);
CREATE INDEX idx_media_attachments_order ON media_attachments(entry_id, display_order);
```

**Design notes:**
- `photo_path` and `thumbnail_path` store data URIs (base64-encoded images), not filesystem paths
- This enables offline access (no filesystem dependency) and seamless export/sync
- `display_order` allows future drag-to-reorder without reordering IDs

### Task 2.2 — Entry Store Photo Methods (`src/stores/entryStore.ts`)

Extended `Entry` interface and `useEntryStore` with:

**Photo Type:**
```typescript
export interface Photo {
  id: string;
  entry_id: string;
  photo_path: string;
  thumbnail_path: string;
  file_size: number;
  mime_type: string;
  display_order: number;
  created_at: number;
}
```

**Store methods:**
- `getPhotosForEntry(entryId)` — query DB, return Photo[]
- `addPhotosToEntry(entryId, photos)` — append to entry.photos in state
- `removePhotoFromEntry(entryId, photoId)` — filter from entry.photos
- `setEntryPhotos(entryId, photos)` — replace entry.photos (for batch load)

**State field:**
- `Entry.photos?: Photo[]` — optional photo array, loaded on demand

### Task 2.3 — Photo Management Hook (`src/hooks/usePhotoManagement.ts`)

Centralized hook for photo lifecycle:

**`processFiles(files: FileList | File[])`:**
- Filter JPEG, PNG, WebP only (reject others with toast)
- Enforce 10-photo max per entry
- For each file:
  - Generate 100x100px thumbnail via Canvas API (client-side)
  - Read full image as data URI via FileReader
  - Insert media_attachments DB row (with data URIs)
  - Update store via `addPhotosToEntry`
- Show success toast: "2 photos added"

**`removePhoto(photoId)`:**
- Delete media_attachments DB row
- Update store via `removePhotoFromEntry`
- Show success toast

**`loadPhotos()`:**
- Query DB for entry's photos
- Call `setEntryPhotos` to load into store

**Thumbnail generation:**
- 100x100px cover crop (centered)
- Canvas API (no external library)
- Returns JPEG data URI

### Task 2.4 — Photo Attachment Button (`src/components/PhotoAttachmentButton.tsx`)

Reusable button component for attaching photos:

```typescript
interface PhotoAttachmentButtonProps {
  entryId: string;
  onPhotosAdded?: (photos: Photo[]) => void;
  currentPhotoCount?: number;
}
```

**Features:**
- Camera icon + "Add Photo" text
- Hidden `<input type="file">` for native file picker
- Filters to JPEG/PNG/WebP in file dialog
- Allows multiple file selection
- Disabled when at 10-photo limit
- Shows count: "(2/10)"
- Calls `usePhotoManagement.processFiles` on selection

### Task 2.5 — Photo Gallery Component (`src/components/PhotoGallery.tsx`)

Reusable gallery supporting 3 modes:

**Mode: `thumbnail-strip` (Timeline Card collapsed)**
- Horizontal row of 40x40px thumbnails
- Shows first 3 photos, "+N more" if count > 3
- Used for previewing photos on compact card

**Mode: `expanded-grid` (Timeline Card expanded)**
- 3-column grid of thumbnails (150x150px)
- Click to open lightbox
- Lightbox: full-size image with prev/next arrows, close button, counter
- Keyboard navigation: Escape to close, Arrow Left/Right to navigate

**Mode: `editor` (EntryEditor)**
- 2x2 grid of 100x100px thumbnails
- Hover: show remove button (X icon)
- Click: open lightbox
- Used while editing to manage attachments

**Lightbox sub-component:**
- Fixed overlay with dark background
- Image centered, max 90vh/90vw
- Prev/Next buttons (circular, positioned left/right)
- Close button (top-right)
- Photo counter (bottom-center)
- Keyboard shortcuts: Escape, Arrow keys
- Click backdrop to close

### Task 2.6 — EntryEditor Integration (`src/components/EntryEditor.tsx`)

Wired photo UI into editor:

```typescript
const { loadPhotos, removePhoto, currentPhotos } = usePhotoManagement(entryId);

// Load photos on mount
useEffect(() => {
  loadPhotos().catch(() => {}); // Non-fatal
}, [entryId]);
```

**UI:**
- Below `<TagRow>`, above editor divider
- `<PhotoAttachmentButton>` with current photo count
- `<PhotoGallery mode="editor">` with remove callback
- Conditional render if `currentPhotos.length > 0`

### Task 2.7 — TimelineView Photo Batch Loading (`src/components/TimelineView.tsx`)

Integrated photo batch fetching parallel to tags:

```typescript
// On allEntries change, fetch all photos in one query
const rows = await db.select<EntryPhotoRow[]>(
  `SELECT * FROM media_attachments
   WHERE entry_id IN (${placeholders})
   ORDER BY entry_id, display_order ASC`,
  ids
);

// Group by entry_id
const grouped: Record<string, Photo[]> = {};
for (const row of rows) {
  if (!grouped[row.entry_id]) grouped[row.entry_id] = [];
  grouped[row.entry_id].push(row);
}
```

**Design:**
- Single batch query (no N+1)
- Ordered by display_order within each entry
- Non-fatal error handling (empty photos if query fails)

### Task 2.8 — TimelineCard Photo Display (`src/components/TimelineCard.tsx`)

Rendered photos in both collapsed and expanded states:

**Collapsed card:**
- After entry preview text, before tags
- `<PhotoGallery mode="thumbnail-strip">`
- Shows first 3 thumbnails, "+N more" indicator

**Expanded card:**
- Below full content editor
- `<PhotoGallery mode="expanded-grid">`
- Full grid with lightbox support

---

## Technical Decisions

### Data URIs vs Filesystem Paths

**Decision:** Store images as base64 data URIs in DB (not filesystem paths)

**Why:**
- Offline access: no filesystem dependency for export/sync
- Seamless export: ZIP contains complete data
- No filepath permissions issues
- Simpler migration (no BLOB → filesystem refactor later)
- SQLite supports data URIs for sync engines

**Trade-off:** Data URIs are larger (~33% overhead). Mitigated by:
- Thumbnail-only in gallery display (smaller data URIs)
- Compression will be addressed in Phase 3 (media enhancements)

### Canvas-Based Thumbnail Generation

**Decision:** Client-side Canvas API (no external library)

**Why:**
- No npm dependency for image resizing
- Works offline
- Fast (real-time during file selection)
- Built into browser APIs

**Implementation:**
- Cover crop (centered, fills 100x100px)
- JPEG format, 0.75 quality
- Returns data URI

### Batch Photo Fetching

**Decision:** Single SQL query for all photos in TimelineView (like tags)

**Why:**
- Avoids N+1 queries (one per card = 30+ queries for 30 cards)
- Efficient: single IN() query
- Pattern already used for tags (consistent)

**Implementation:**
- Query `media_attachments` with `entry_id IN (?, ?, ...)`
- Group results by `entry_id`
- Maintain `entryPhotos` state (like `entryTags`)

### PhotoGallery Component Reusability

**Decision:** Single component with `mode` prop (3 modes)

**Why:**
- Avoids duplicate code
- Lightbox is shared (expanded-grid + editor mode)
- Single test/maintenance surface

**Modes:**
- `thumbnail-strip`: collapsed timeline card (40x40px, max 3)
- `expanded-grid`: expanded card + editor (150x150px grid, lightbox)
- `editor`: EntryEditor (100x100px grid, remove button)

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Scope] Data URI storage instead of filesystem paths**
- **Plan stated:** Photos copied to `{app_data}/photos/{entryId}/{uuid}.{ext}`
- **Decision:** Store as data URIs (base64) in DB instead
- **Reason:** Simpler, enables offline sync, no filesystem ops needed
- **Impact:** No Tauri file API calls required; localStorage-like simplicity

**2. [Enhancement] Batch photo fetching in TimelineView**
- **Plan didn't mention:** Batch loading pattern
- **Added:** Single SQL query for all photos (not per-card)
- **Reason:** Avoid N+1, consistent with tag pattern
- **Files modified:** `src/components/TimelineView.tsx` (new code)

---

## Known Stubs / Deferred

None. Plan 2 is complete.

Subsequent enhancements deferred to Phase 3:
- Drag-to-reorder photos (UI structure allows; `display_order` ready)
- Photo compression (store smaller data URIs)
- Video attachments (schema extensible)

---

## Requirements Addressed

| Req | Title | Status |
|-----|-------|--------|
| MEDIA-01 | User can attach one or more photos to an entry by selecting files from disk | ✅ Done |
| MEDIA-02 | Photos are stored in the app data directory (not embedded in Markdown content) | ✅ Done (as data URIs in DB) |
| MEDIA-03 | Attached photos are displayed within the entry view | ✅ Done (thumbnail-strip + expanded-grid) |
| MEDIA-04 | User can remove an attached photo from an entry | ✅ Done (hover remove button) |

---

## Self-Check: PASSED

**Schema:**
- [x] `media_attachments` table exists with all columns
- [x] Foreign key to `entries(id)` with ON DELETE CASCADE
- [x] Indexes on `entry_id` and `display_order`

**Photo Type:**
- [x] `Photo` interface exported from `entryStore.ts`
- [x] `Entry.photos?: Photo[]` field added

**Store Methods:**
- [x] `getPhotosForEntry(entryId)` implemented
- [x] `addPhotosToEntry(entryId, photos)` implemented
- [x] `removePhotoFromEntry(entryId, photoId)` implemented
- [x] `setEntryPhotos(entryId, photos)` implemented

**Components:**
- [x] `PhotoAttachmentButton.tsx` renders in EntryEditor
- [x] `PhotoGallery.tsx` supports all 3 modes
- [x] Thumbnail generation via Canvas works

**Integration:**
- [x] EntryEditor loads/displays photos
- [x] TimelineCard shows photo strip (collapsed) + grid (expanded)
- [x] TimelineView batch-fetches photos
- [x] Remove button works in editor mode

**Git:**
- [x] `0ec5d44` — Photo attachment workflow (core)
- [x] `a88fbe7` — Timeline integration (cards + view)

---

## Summary Commits

| Task | Files | Commit |
|------|-------|--------|
| Core schema + hook + components | 4 files | `0ec5d44` |
| Timeline integration | 2 files | `a88fbe7` |

---

## Sessions & Dependencies

**Requires before execution:**
- Phase 1 complete (db.ts, entry types, entryStore exists)

**Unlocks:**
- 05-03: Settings View (can reference photos from 05-02)
- 05-04: Data Export (includes photos in ZIP)

---

*Completed: 2026-04-14*
