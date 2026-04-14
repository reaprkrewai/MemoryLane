import { create } from "zustand";
import { getDb } from "../lib/db";
import { semanticSearch } from "../utils/vectorSearchService";

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
  searchMode: "keyword" | "ai";
  searchError: string | null;

  setQuery: (q: string) => void;
  setStartDate: (ts: number | null) => void;
  setEndDate: (ts: number | null) => void;
  toggleTag: (id: string) => void;
  toggleMood: (mood: string) => void;
  setSearchMode: (mode: "keyword" | "ai") => void;
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
  searchMode: "keyword",
  searchError: null,

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

  setSearchMode: (mode) => set({ searchMode: mode }),

  resetSearch: () =>
    set({
      query: "",
      startDate: null,
      endDate: null,
      selectedTagIds: [],
      selectedMoods: [],
      results: [],
      isSearching: false,
      searchError: null,
    }),

  runSearch: async () => {
    const { query, startDate, endDate, selectedTagIds, selectedMoods, searchMode } = get();
    const db = await getDb();

    const hasKeyword = query.trim().length > 0;
    const hasDates = startDate !== null || endDate !== null;
    const hasTags = selectedTagIds.length > 0;
    const hasMoods = selectedMoods.length > 0;

    // Empty state logic
    if (searchMode === "ai") {
      // AI search requires query text (semantic search needs meaning to match)
      if (!hasKeyword) {
        set({ results: [], isSearching: false, searchError: null });
        return;
      }
    } else {
      // Keyword search can work with just filters
      if (!hasKeyword && !hasDates && !hasTags && !hasMoods) {
        set({ results: [], isSearching: false, searchError: null });
        return;
      }
    }

    set({ isSearching: true, searchError: null });

    try {
      if (searchMode === "ai") {
        // AI/Semantic search route
        const results = await semanticSearch(query, {
          dateRange: startDate !== null && endDate !== null
            ? {
                start: startDate,
                end: endDate + 86400000, // Include full end day
              }
            : undefined,
          tags: selectedTagIds.length > 0 ? selectedTagIds : undefined,
          moods: selectedMoods.length > 0 ? selectedMoods : undefined,
          limit: 20,
        });
        set({ results, isSearching: false });
      } else {
        // Keyword search route (Phase 4 FTS5)
        const conditions: string[] = [];
        const params: unknown[] = [];

        let fromClause: string;

        if (hasKeyword) {
          // Phrase-wrap to prevent FTS5 parse errors on special chars
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
          conditions.push(
            `e.id IN (SELECT entry_id FROM entry_tags WHERE tag_id IN (${placeholders}) GROUP BY entry_id HAVING COUNT(DISTINCT tag_id) = ?)`
          );
          params.push(...selectedTagIds, selectedTagIds.length);
        }

        const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
        const sql = `SELECT e.id, e.content, e.mood, e.word_count, e.created_at, e.updated_at, e.metadata
                     FROM ${fromClause} ${where} ORDER BY e.created_at DESC`;

        const rows = await db.select<SearchEntry[]>(sql, params);
        set({ results: rows, isSearching: false });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Search failed";
      set({ isSearching: false, results: [], searchError: message });
    }
  },
}));
