import { create } from "zustand";
import { getDb } from "../lib/db";

export const TAG_COLORS = [
  "#EF4444",
  "#F97316",
  "#EAB308",
  "#22C55E",
  "#3B82F6",
  "#8B5CF6",
  "#EC4899",
  "#6B7280",
] as const;

interface Tag {
  id: string;
  name: string;
  color: string;
  created_at: number;
}

interface TagWithCount extends Tag {
  usage_count: number;
}

interface TagState {
  tags: TagWithCount[];
  loadTags: () => Promise<void>;
  createTag: (name: string) => Promise<Tag>;
  deleteTag: (id: string) => Promise<void>;
  updateTagColor: (id: string, color: string) => Promise<void>;
  addTagToEntry: (entryId: string, tagId: string) => Promise<void>;
  removeTagFromEntry: (entryId: string, tagId: string) => Promise<void>;
  getEntryTags: (entryId: string) => Promise<TagWithCount[]>;
}

export const useTagStore = create<TagState>((set, get) => ({
  tags: [],

  loadTags: async () => {
    const db = await getDb();
    const rows = await db.select<TagWithCount[]>(
      `SELECT t.id, t.name, t.color, t.created_at, COUNT(et.entry_id) AS usage_count
       FROM tags t
       LEFT JOIN entry_tags et ON et.tag_id = t.id
       GROUP BY t.id
       ORDER BY t.name COLLATE NOCASE ASC`
    );
    set({ tags: rows });
  },

  createTag: async (name: string) => {
    const db = await getDb();
    const color = TAG_COLORS[get().tags.length % TAG_COLORS.length];
    await db.execute("INSERT INTO tags (name, color) VALUES (?, ?)", [name, color]);
    await get().loadTags();
    const rows = await db.select<Tag[]>(
      "SELECT * FROM tags WHERE name = ? COLLATE NOCASE",
      [name]
    );
    return rows[0];
  },

  deleteTag: async (id: string) => {
    const db = await getDb();
    await db.execute(
      "DELETE FROM tags WHERE id = ? AND id NOT IN (SELECT tag_id FROM entry_tags)",
      [id]
    );
    await get().loadTags();
  },

  updateTagColor: async (id: string, color: string) => {
    const db = await getDb();
    await db.execute("UPDATE tags SET color = ? WHERE id = ?", [color, id]);
    set((state) => ({
      tags: state.tags.map((t) => (t.id === id ? { ...t, color } : t)),
    }));
  },

  addTagToEntry: async (entryId: string, tagId: string) => {
    const db = await getDb();
    await db.execute(
      "INSERT OR IGNORE INTO entry_tags (entry_id, tag_id) VALUES (?, ?)",
      [entryId, tagId]
    );
    await get().loadTags();
  },

  removeTagFromEntry: async (entryId: string, tagId: string) => {
    const db = await getDb();
    await db.execute(
      "DELETE FROM entry_tags WHERE entry_id = ? AND tag_id = ?",
      [entryId, tagId]
    );
    await get().loadTags();
  },

  getEntryTags: async (entryId: string) => {
    const db = await getDb();
    const rows = await db.select<TagWithCount[]>(
      `SELECT t.id, t.name, t.color, t.created_at, COUNT(et2.entry_id) AS usage_count
       FROM entry_tags et
       JOIN tags t ON t.id = et.tag_id
       LEFT JOIN entry_tags et2 ON et2.tag_id = t.id
       WHERE et.entry_id = ?
       GROUP BY t.id
       ORDER BY t.name COLLATE NOCASE ASC`,
      [entryId]
    );
    return rows;
  },
}));
