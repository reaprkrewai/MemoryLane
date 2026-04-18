import { create } from "zustand";
import { getDb } from "../lib/db";
import { generateEmbeddingAsync } from "../utils/embeddingService";
import { getEntryStats } from "../lib/dbQueries";

export interface Photo {
  id: string;
  entry_id: string;
  photo_path: string;
  thumbnail_path: string;
  file_size: number | null;
  mime_type: string;
  display_order: number;
  created_at: number;
}

interface Entry {
  id: string;
  content: string;
  mood: string | null;
  word_count: number;
  char_count: number;
  created_at: number;
  updated_at: number;
  metadata: string;
  photos?: Photo[];
}

interface EntryState {
  entries: Entry[];
  selectedEntryId: string | null;
  isSaving: boolean;
  lastSavedAt: number | null;

  // Phase 3: keyset pagination for timeline
  allEntries: Entry[];
  hasMore: boolean;
  isLoadingPage: boolean;
  pageSize: number;

  // FOUND-01 — maintained derived primitives (D-01..D-05)
  totalEntries: number;
  dayStreak: number;
  moodCounts: Record<string, number>;
  recentEntries: Entry[];
  entriesThisMonth: number; // DASH-02 — wired to stats.thisMonth; same D-05 contract as FOUND-01

  loadEntries: () => Promise<void>;
  selectEntry: (id: string) => Promise<void>;
  createEntry: () => Promise<string>;
  deleteEntry: (id: string) => Promise<void>;
  saveContent: (
    entryId: string,
    content: string,
    wordCount: number,
    charCount: number
  ) => Promise<void>;
  updateMood: (entryId: string, mood: string | null) => Promise<void>;
  updateCreatedAt: (entryId: string, timestamp: number) => Promise<void>;
  ensureFirstEntry: () => Promise<void>;
  loadPage: (cursor?: number) => Promise<void>;
  resetPagination: () => void;
  prependToTimeline: (entry: Entry) => void;
  scheduleAutoSave: (
    entryId: string,
    content: string,
    wordCount: number,
    charCount: number
  ) => void;
  flushAndClearTimers: () => Promise<void>;
  loadAutoSaveInterval: () => Promise<void>;
  updateAutoSaveInterval: (ms: number) => Promise<void>;

  // Phase 5.2: Photo management
  getPhotosForEntry: (entryId: string) => Promise<Photo[]>;
  addPhotosToEntry: (entryId: string, photos: Photo[]) => void;
  removePhotoFromEntry: (entryId: string, photoId: string) => void;
  setEntryPhotos: (entryId: string, photos: Photo[]) => void;
}

// Module-level timer state — not in Zustand state (timers are not serializable)
let _debounceTimer: ReturnType<typeof setTimeout> | null = null;
let _intervalTimer: ReturnType<typeof setInterval> | null = null;
let _pendingSave: (() => Promise<void>) | null = null;
let _autoSaveInterval = 5000; // default, loaded from settings

// FOUND-01 D-02 — identity-stable top-5 slice. Returns prev (same reference) when the
// top 5 entries' id+updated_at are unchanged; returns a new slice otherwise. Subscribers
// get === stability across mutations that don't touch the leading 5.
function stableRecentSlice(all: Entry[], prev: Entry[]): Entry[] {
  const next = all.slice(0, 5);
  if (next.length !== prev.length) return next;
  for (let i = 0; i < next.length; i++) {
    if (next[i].id !== prev[i].id || next[i].updated_at !== prev[i].updated_at) {
      return next;
    }
  }
  return prev; // identity-stable: avoid re-render
}

// FOUND-01 D-04 — lifetime mood totals over allEntries. Cheap O(n) scan.
// 30-day windowed shapes are widget-local concerns (Phase 8), not FOUND-01.
function computeMoodCounts(all: Entry[]): Record<string, number> {
  const counts: Record<string, number> = { great: 0, good: 0, okay: 0, bad: 0, awful: 0 };
  for (const e of all) {
    if (e.mood && e.mood in counts) counts[e.mood] += 1;
  }
  return counts;
}

export const useEntryStore = create<EntryState>((set, get) => ({
  entries: [],
  selectedEntryId: null,
  isSaving: false,
  lastSavedAt: null,
  allEntries: [],
  hasMore: true,
  isLoadingPage: false,
  pageSize: 20,

  // FOUND-01 — maintained derived primitives initial values
  totalEntries: 0,
  dayStreak: 0,
  moodCounts: {},
  recentEntries: [],
  entriesThisMonth: 0,

  loadEntries: async () => {
    const db = await getDb();
    const rows = await db.select<Entry[]>(
      "SELECT id, content, mood, word_count, char_count, created_at, updated_at, metadata FROM entries ORDER BY created_at DESC"
    );
    set({ entries: rows });
  },

  selectEntry: async (id: string) => {
    await get().flushAndClearTimers();
    set({ selectedEntryId: id });
  },

  createEntry: async () => {
    const db = await getDb();
    const localDate = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD in user local TZ (FOUND-03 D-11)
    // Generate id client-side to avoid the racy "ORDER BY created_at DESC LIMIT 1"
    // recovery pattern. Two createEntry calls in the same millisecond (bulk seed,
    // double-click, batch import) would otherwise risk returning the wrong row's id
    // and miswiring local_date semantics (D-11). Shape matches the DB schema's
    // `lower(hex(randomblob(16)))` default — 32 lowercase hex chars.
    const newId = crypto.randomUUID().replace(/-/g, "");
    await db.execute(
      "INSERT INTO entries (id, content, word_count, char_count, local_date) VALUES (?, '', 0, 0, ?)",
      [newId, localDate]
    );
    await get().loadEntries();
    set({ selectedEntryId: newId });
    // Phase 3: keep the paginated timeline in sync with newly created entries
    const newRow = await db.select<Entry[]>(
      "SELECT id, content, mood, word_count, char_count, created_at, updated_at, metadata FROM entries WHERE id = ?",
      [newId]
    );
    if (newRow.length > 0) {
      set((state) => ({ allEntries: [newRow[0], ...state.allEntries] }));
    }
    const stats = await getEntryStats();
    const all = get().allEntries;
    set({
      totalEntries: stats.totalEntries,
      dayStreak: stats.dayStreak,
      entriesThisMonth: stats.thisMonth,
      moodCounts: computeMoodCounts(all),
      recentEntries: stableRecentSlice(all, get().recentEntries),
    });
    return newId;
  },

  deleteEntry: async (id: string) => {
    const db = await getDb();
    await db.execute("DELETE FROM entries WHERE id = ?", [id]);
    await get().loadEntries();
    set((state) => ({
      allEntries: state.allEntries.filter((e) => e.id !== id),
    }));
    const statsDel = await getEntryStats();
    const allDel = get().allEntries;
    set({
      totalEntries: statsDel.totalEntries,
      dayStreak: statsDel.dayStreak,
      entriesThisMonth: statsDel.thisMonth,
      moodCounts: computeMoodCounts(allDel),
      recentEntries: stableRecentSlice(allDel, get().recentEntries),
    });
    const { entries, selectedEntryId } = get();
    if (selectedEntryId === id) {
      set({ selectedEntryId: entries.length > 0 ? entries[0].id : null });
    }
  },

  saveContent: async (
    entryId: string,
    content: string,
    wordCount: number,
    charCount: number
  ) => {
    set({ isSaving: true });
    try {
      const db = await getDb();
      const now = Date.now();
      await db.execute(
        "UPDATE entries SET content = ?, word_count = ?, char_count = ?, updated_at = ? WHERE id = ?",
        [content, wordCount, charCount, now, entryId]
      );
      // Update local entries array to keep sidebar in sync without full reload
      set((state) => ({
        entries: state.entries.map((e) =>
          e.id === entryId
            ? { ...e, content, word_count: wordCount, char_count: charCount, updated_at: now }
            : e
        ),
        allEntries: state.allEntries.map((e) =>
          e.id === entryId
            ? { ...e, content, word_count: wordCount, char_count: charCount, updated_at: now }
            : e
        ),
        isSaving: false,
        lastSavedAt: Date.now(),
      }));
      const after = get().allEntries;
      set({
        moodCounts: computeMoodCounts(after),
        recentEntries: stableRecentSlice(after, get().recentEntries),
      });
      // Trigger async embedding generation (fire-and-forget)
      generateEmbeddingAsync(entryId, content);
    } catch (err) {
      set({ isSaving: false });
      throw err;
    }
  },

  updateMood: async (entryId: string, mood: string | null) => {
    const db = await getDb();
    const now = Date.now();
    await db.execute(
      "UPDATE entries SET mood = ?, updated_at = ? WHERE id = ?",
      [mood, now, entryId]
    );
    set((state) => ({
      entries: state.entries.map((e) =>
        e.id === entryId ? { ...e, mood, updated_at: now } : e
      ),
      allEntries: state.allEntries.map((e) =>
        e.id === entryId ? { ...e, mood, updated_at: now } : e
      ),
    }));
    // FOUND-01 D-01 — every write action that can affect a derived primitive must
    // recompute it. updateMood is the canonical mood-mutating action; refresh
    // moodCounts (D-04) and recentEntries (D-02; updated_at bump may rotate slice).
    // totalEntries / dayStreak don't change here — skip getEntryStats() to avoid
    // unnecessary DB round-trips, matching the saveContent treatment.
    const after = get().allEntries;
    set({
      moodCounts: computeMoodCounts(after),
      recentEntries: stableRecentSlice(after, get().recentEntries),
    });
  },

  updateCreatedAt: async (entryId: string, timestamp: number) => {
    const db = await getDb();
    const now = Date.now();
    await db.execute(
      "UPDATE entries SET created_at = ?, updated_at = ? WHERE id = ?",
      [timestamp, now, entryId]
    );
    await get().loadEntries();
    // Reload the timeline page so the re-dated entry sorts correctly
    await get().resetPagination();
    await get().loadPage();
  },

  ensureFirstEntry: async () => {
    const { entries, createEntry } = get();
    if (entries.length === 0) {
      await createEntry();
    }
  },

  loadPage: async (cursor?: number) => {
    const { isLoadingPage } = get();
    if (isLoadingPage) return; // guard against duplicate calls (Pitfall 2)
    set({ isLoadingPage: true });
    try {
      const db = await getDb();
      const limit = get().pageSize;
      const rows = cursor
        ? await db.select<Entry[]>(
            "SELECT id, content, mood, word_count, char_count, created_at, updated_at, metadata FROM entries WHERE created_at < ? ORDER BY created_at DESC LIMIT ?",
            [cursor, limit]
          )
        : await db.select<Entry[]>(
            "SELECT id, content, mood, word_count, char_count, created_at, updated_at, metadata FROM entries ORDER BY created_at DESC LIMIT ?",
            [limit]
          );
      set((state) => ({
        allEntries: cursor ? [...state.allEntries, ...rows] : rows,
        hasMore: rows.length === limit,
        isLoadingPage: false,
      }));
      const statsPage = await getEntryStats();
      const allPage = get().allEntries;
      set({
        totalEntries: statsPage.totalEntries,
        dayStreak: statsPage.dayStreak,
        entriesThisMonth: statsPage.thisMonth,
        moodCounts: computeMoodCounts(allPage),
        recentEntries: stableRecentSlice(allPage, get().recentEntries),
      });
    } catch (err) {
      set({ isLoadingPage: false });
      throw err;
    }
  },

  resetPagination: () => set({ allEntries: [], hasMore: true, isLoadingPage: false }),

  prependToTimeline: (entry: Entry) =>
    set((state) => ({ allEntries: [entry, ...state.allEntries] })),

  scheduleAutoSave: (
    entryId: string,
    content: string,
    wordCount: number,
    charCount: number
  ) => {
    const save = async () => {
      await get().saveContent(entryId, content, wordCount, charCount);
    };
    _pendingSave = save;

    // Debounce: reset 500ms timer on every keystroke
    if (_debounceTimer) clearTimeout(_debounceTimer);
    _debounceTimer = setTimeout(async () => {
      await save();
      _pendingSave = null;
    }, 500);

    // Interval: flush every N seconds while typing continues
    if (!_intervalTimer) {
      _intervalTimer = setInterval(async () => {
        if (_pendingSave) {
          await _pendingSave();
          _pendingSave = null;
        }
      }, _autoSaveInterval);
    }
  },

  flushAndClearTimers: async () => {
    if (_debounceTimer) {
      clearTimeout(_debounceTimer);
      _debounceTimer = null;
    }
    if (_intervalTimer) {
      clearInterval(_intervalTimer);
      _intervalTimer = null;
    }
    if (_pendingSave) {
      await _pendingSave();
      _pendingSave = null;
    }
  },

  loadAutoSaveInterval: async () => {
    const db = await getDb();
    const rows = await db.select<{ value: string }[]>(
      "SELECT value FROM settings WHERE key = 'autosave_interval'"
    );
    if (rows.length > 0) {
      _autoSaveInterval = parseInt(rows[0].value, 10) || 5000;
    }
  },

  updateAutoSaveInterval: async (ms: number) => {
    const db = await getDb();
    await db.execute(
      "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('autosave_interval', ?, ?)",
      [String(ms), Date.now()]
    );
    _autoSaveInterval = ms;
    // Reset interval timer with new duration
    if (_intervalTimer) {
      clearInterval(_intervalTimer);
      _intervalTimer = null;
    }
  },

  // Phase 5.2: Photo management
  getPhotosForEntry: async (entryId: string) => {
    const db = await getDb();
    return db.select<Photo[]>(
      "SELECT * FROM media_attachments WHERE entry_id = ? ORDER BY display_order ASC",
      [entryId]
    );
  },

  addPhotosToEntry: (entryId: string, photos: Photo[]) => {
    set((state) => ({
      allEntries: state.allEntries.map((e) =>
        e.id === entryId
          ? { ...e, photos: [...(e.photos ?? []), ...photos] }
          : e
      ),
      entries: state.entries.map((e) =>
        e.id === entryId
          ? { ...e, photos: [...(e.photos ?? []), ...photos] }
          : e
      ),
    }));
  },

  removePhotoFromEntry: (entryId: string, photoId: string) => {
    set((state) => ({
      allEntries: state.allEntries.map((e) =>
        e.id === entryId
          ? { ...e, photos: (e.photos ?? []).filter((p) => p.id !== photoId) }
          : e
      ),
      entries: state.entries.map((e) =>
        e.id === entryId
          ? { ...e, photos: (e.photos ?? []).filter((p) => p.id !== photoId) }
          : e
      ),
    }));
  },

  setEntryPhotos: (entryId: string, photos: Photo[]) => {
    set((state) => ({
      allEntries: state.allEntries.map((e) =>
        e.id === entryId ? { ...e, photos } : e
      ),
      entries: state.entries.map((e) =>
        e.id === entryId ? { ...e, photos } : e
      ),
    }));
  },
}));
