import { create } from "zustand";
import { getDb } from "../lib/db";

interface Entry {
  id: string;
  content: string;
  mood: string | null;
  word_count: number;
  char_count: number;
  created_at: number;
  updated_at: number;
  metadata: string;
}

interface EntryState {
  entries: Entry[];
  selectedEntryId: string | null;
  isSaving: boolean;
  lastSavedAt: number | null;

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
}

export const useEntryStore = create<EntryState>((set, get) => ({
  entries: [],
  selectedEntryId: null,
  isSaving: false,
  lastSavedAt: null,

  loadEntries: async () => {
    const db = await getDb();
    const rows = await db.select<Entry[]>(
      "SELECT id, content, mood, word_count, char_count, created_at, updated_at, metadata FROM entries ORDER BY created_at DESC"
    );
    set({ entries: rows });
  },

  selectEntry: async (id: string) => {
    set({ selectedEntryId: id });
  },

  createEntry: async () => {
    const db = await getDb();
    await db.execute("INSERT INTO entries (content, word_count, char_count) VALUES ('', 0, 0)");
    const rows = await db.select<{ id: string }[]>(
      "SELECT id FROM entries ORDER BY created_at DESC LIMIT 1"
    );
    const newId = rows[0].id;
    await get().loadEntries();
    set({ selectedEntryId: newId });
    return newId;
  },

  deleteEntry: async (id: string) => {
    const db = await getDb();
    await db.execute("DELETE FROM entries WHERE id = ?", [id]);
    await get().loadEntries();
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
        isSaving: false,
        lastSavedAt: Date.now(),
      }));
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
    }));
  },

  updateCreatedAt: async (entryId: string, timestamp: number) => {
    const db = await getDb();
    const now = Date.now();
    await db.execute(
      "UPDATE entries SET created_at = ?, updated_at = ? WHERE id = ?",
      [timestamp, now, entryId]
    );
    await get().loadEntries();
  },

  ensureFirstEntry: async () => {
    const { entries, createEntry } = get();
    if (entries.length === 0) {
      await createEntry();
    }
  },
}));
