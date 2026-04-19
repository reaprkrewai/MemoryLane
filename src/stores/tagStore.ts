import { create } from "zustand";
import { getDb } from "../lib/db";

export const TAG_COLORS = [
  { id: "red",    label: "Red",    base: "#DC2626", bg_light: "#FEE2E2", bg_dark: "#450A0A", text_light: "#991B1B", text_dark: "#FECACA" },
  { id: "orange", label: "Orange", base: "#EA580C", bg_light: "#FFEDD5", bg_dark: "#431407", text_light: "#9A3412", text_dark: "#FED7AA" },
  { id: "amber",  label: "Amber",  base: "#D97706", bg_light: "#FEF3C7", bg_dark: "#451A03", text_light: "#92400E", text_dark: "#FDE68A" },
  { id: "yellow", label: "Yellow", base: "#CA8A04", bg_light: "#FEF9C3", bg_dark: "#422006", text_light: "#854D0E", text_dark: "#FEF08A" },
  { id: "green",  label: "Green",  base: "#16A34A", bg_light: "#DCFCE7", bg_dark: "#14532D", text_light: "#166534", text_dark: "#BBF7D0" },
  { id: "teal",   label: "Teal",   base: "#0D9488", bg_light: "#CCFBF1", bg_dark: "#134E4A", text_light: "#115E59", text_dark: "#99F6E4" },
  { id: "cyan",   label: "Cyan",   base: "#0891B2", bg_light: "#CFFAFE", bg_dark: "#164E63", text_light: "#155E75", text_dark: "#A5F3FC" },
  { id: "blue",   label: "Blue",   base: "#2563EB", bg_light: "#DBEAFE", bg_dark: "#1E3A8A", text_light: "#1E40AF", text_dark: "#BFDBFE" },
  { id: "violet", label: "Violet", base: "#7C3AED", bg_light: "#EDE9FE", bg_dark: "#2E1065", text_light: "#5B21B6", text_dark: "#DDD6FE" },
  { id: "pink",   label: "Pink",   base: "#DB2777", bg_light: "#FCE7F3", bg_dark: "#500724", text_light: "#9F1239", text_dark: "#FBCFE8" },
  { id: "rose",   label: "Rose",   base: "#E11D48", bg_light: "#FFE4E6", bg_dark: "#4C0519", text_light: "#9F1239", text_dark: "#FECDD3" },
  { id: "slate",  label: "Slate",  base: "#475569", bg_light: "#F1F5F9", bg_dark: "#020617", text_light: "#334155", text_dark: "#CBD5E1" },
] as const;

interface Tag {
  id: string;
  name: string;
  color: string;
  created_at: number;
}

interface TagWithCount extends Tag {
  usage_count: number;
  last_used?: number; // Unix timestamp ms — MAX(e.created_at) across referencing entries; undefined if none
}

interface TagState {
  tags: TagWithCount[];
  loadTags: () => Promise<void>;
  createTag: (name: string) => Promise<Tag>;
  deleteTag: (id: string) => Promise<void>;
  updateTagColor: (id: string, color: string) => Promise<void>;
  renameTag: (id: string, newName: string) => Promise<void>;
  addTagToEntry: (entryId: string, tagId: string) => Promise<void>;
  removeTagFromEntry: (entryId: string, tagId: string) => Promise<void>;
  getEntryTags: (entryId: string) => Promise<TagWithCount[]>;
}

export const useTagStore = create<TagState>((set, get) => ({
  tags: [],

  loadTags: async () => {
    const db = await getDb();
    const rows = await db.select<TagWithCount[]>(
      `SELECT t.id, t.name, t.color, t.created_at,
              COUNT(et.entry_id) AS usage_count,
              MAX(e.created_at) AS last_used
       FROM tags t
       LEFT JOIN entry_tags et ON et.tag_id = t.id
       LEFT JOIN entries e ON e.id = et.entry_id
       GROUP BY t.id
       ORDER BY t.name COLLATE NOCASE ASC`
    );
    set({ tags: rows });
  },

  createTag: async (name: string) => {
    const db = await getDb();
    const color = TAG_COLORS[get().tags.length % TAG_COLORS.length].base;
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

  renameTag: async (id: string, newName: string) => {
    const db = await getDb();
    await db.execute("UPDATE tags SET name = ? WHERE id = ?", [newName, id]);
    set((state) => ({
      tags: state.tags.map((t) => (t.id === id ? { ...t, name: newName } : t)),
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
