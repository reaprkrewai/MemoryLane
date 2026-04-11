import { create } from "zustand";
import { getDb } from "../lib/db";

interface SearchEntry {
  id: string;
  content: string;
  mood: string | null;
  word_count: number;
  created_at: number;
  updated_at: number;
  metadata: string;
}

interface SearchState {
  query: string;
  startDate: number | null; // ms epoch, null = no filter
  endDate: number | null; // ms epoch, null = no filter
  selectedTagIds: string[];
  selectedMoods: string[];
  results: SearchEntry[];
  isSearching: boolean;

  setQuery: (q: string) => void;
  setStartDate: (ts: number | null) => void;
  setEndDate: (ts: number | null) => void;
  toggleTag: (id: string) => void;
  toggleMood: (mood: string) => void;
  resetSearch: () => void;
  runSearch: () => Promise<void>;
}

export const useSearchStore = create<SearchState>((set, get) => ({
  query: "",
  startDate: null,
  endDate: null,
  selectedTagIds: [],
  selectedMoods: [],
  results: [],
  isSearching: false,

  setQuery: (q) => set({ query: q }),
  setStartDate: (ts) => set({ startDate: ts }),
  setEndDate: (ts) => set({ endDate: ts }),

  toggleTag: (id) =>
    set((state) => ({
      selectedTagIds: state.selectedTagIds.includes(id)
        ? state.selectedTagIds.filter((t) => t !== id)
        : [...state.selectedTagIds, id],
    })),

  toggleMood: (mood) =>
    set((state) => ({
      selectedMoods: state.selectedMoods.includes(mood)
        ? state.selectedMoods.filter((m) => m !== mood)
        : [...state.selectedMoods, mood],
    })),

  resetSearch: () =>
    set({
      query: "",
      startDate: null,
      endDate: null,
      selectedTagIds: [],
      selectedMoods: [],
      results: [],
      isSearching: false,
    }),

  runSearch: async () => {
    const { query, startDate, endDate, selectedTagIds, selectedMoods } = get();
    const db = await getDb();

    const hasKeyword = query.trim().length > 0;
    const hasDates = startDate !== null || endDate !== null;
    const hasTags = selectedTagIds.length > 0;
    const hasMoods = selectedMoods.length > 0;

    // Empty state: no results until user interacts
    if (!hasKeyword && !hasDates && !hasTags && !hasMoods) {
      set({ results: [], isSearching: false });
      return;
    }

    set({ isSearching: true });

    const conditions: string[] = [];
    const params: unknown[] = [];

    let fromClause: string;

    if (hasKeyword) {
      // Phrase-wrap to prevent FTS5 parse errors on special chars (RESEARCH.md Pitfall 2)
      const ftsQuery = `"${query.trim().replace(/"/g, '""')}"`;
      fromClause = `entries e JOIN entries_fts ON e.rowid = entries_fts.rowid`;
      conditions.push(`entries_fts MATCH ?`);
      params.push(ftsQuery);
    } else {
      fromClause = `entries e`;
    }

    if (startDate !== null) {
      conditions.push(`e.created_at >= ?`);
      params.push(startDate);
    }
    if (endDate !== null) {
      // Include the full end day: +86400000ms (Pitfall 3: entries.created_at is ms epoch)
      conditions.push(`e.created_at < ?`);
      params.push(endDate + 86400000);
    }
    if (hasMoods) {
      const placeholders = selectedMoods.map(() => "?").join(", ");
      conditions.push(`e.mood IN (${placeholders})`);
      params.push(...selectedMoods);
    }
    if (hasTags) {
      const placeholders = selectedTagIds.map(() => "?").join(", ");
      // AND semantics: all selected tags must be present (RESEARCH.md Pitfall 5)
      conditions.push(
        `e.id IN (SELECT entry_id FROM entry_tags WHERE tag_id IN (${placeholders}) GROUP BY entry_id HAVING COUNT(DISTINCT tag_id) = ?)`
      );
      params.push(...selectedTagIds, selectedTagIds.length);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const sql = `SELECT e.id, e.content, e.mood, e.word_count, e.created_at, e.updated_at, e.metadata
                 FROM ${fromClause} ${where} ORDER BY e.created_at DESC`;

    try {
      const rows = await db.select<SearchEntry[]>(sql, params);
      set({ results: rows, isSearching: false });
    } catch {
      set({ isSearching: false });
    }
  },
}));
