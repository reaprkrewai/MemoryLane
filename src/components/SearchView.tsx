import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { useSearchStore } from "../stores/searchStore";
import { useEntryStore } from "../stores/entryStore";
import { useViewStore } from "../stores/viewStore";
import { getDb } from "../lib/db";
import { SearchFilterBar } from "./SearchFilterBar";
import { TimelineCard } from "./TimelineCard";

interface EntryTagRow {
  entry_id: string;
  id: string;
  name: string;
  color: string;
}

function PreSearchState() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
      <div className="rounded-full bg-accent/10 p-4">
        <Search size={32} className="text-accent" />
      </div>
      <h2 className="text-xl font-bold text-text">Search your journal</h2>
      <p className="text-sm text-text-secondary max-w-sm">Type a keyword or use the filters above to find entries.</p>
    </div>
  );
}

function NoResultsState() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
      <div className="rounded-full bg-accent/10 p-4">
        <Search size={32} className="text-accent" />
      </div>
      <h2 className="text-xl font-bold text-text">No entries found</h2>
      <p className="text-sm text-text-secondary max-w-sm">Try different keywords or fewer filters.</p>
    </div>
  );
}

export function SearchView() {
  const query = useSearchStore((s) => s.query);
  const startDate = useSearchStore((s) => s.startDate);
  const endDate = useSearchStore((s) => s.endDate);
  const selectedTagIds = useSearchStore((s) => s.selectedTagIds);
  const selectedMoods = useSearchStore((s) => s.selectedMoods);
  const results = useSearchStore((s) => s.results);
  const isSearching = useSearchStore((s) => s.isSearching);
  const resetSearch = useSearchStore((s) => s.resetSearch);

  const selectEntry = useEntryStore((s) => s.selectEntry);
  const navigateToEditor = useViewStore((s) => s.navigateToEditor);

  // Computed: any filter is active
  const hasActiveFilters =
    query.trim().length > 0 ||
    startDate !== null ||
    endDate !== null ||
    selectedTagIds.length > 0 ||
    selectedMoods.length > 0;

  const handleClearAll = () => {
    resetSearch();
  };

  // Only one card expanded at a time
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Tags for current results — batch fetch on results change
  const [resultTags, setResultTags] = useState<Record<string, EntryTagRow[]>>({});

  useEffect(() => {
    if (results.length === 0) {
      setResultTags({});
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const db = await getDb();
        const ids = results.map((r) => r.id);
        const placeholders = ids.map(() => "?").join(",");
        const rows = await db.select<EntryTagRow[]>(
          `SELECT et.entry_id, t.id, t.name, t.color
           FROM entry_tags et
           JOIN tags t ON t.id = et.tag_id
           WHERE et.entry_id IN (${placeholders})`,
          ids
        );
        if (cancelled) return;
        const grouped: Record<string, EntryTagRow[]> = {};
        for (const row of rows) {
          if (!grouped[row.entry_id]) grouped[row.entry_id] = [];
          grouped[row.entry_id].push(row);
        }
        setResultTags(grouped);
      } catch {
        // Non-fatal: cards render with empty tag arrays
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [results]);

  // Reset expanded card when results change
  useEffect(() => {
    setExpandedId(null);
  }, [results]);

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-bg">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-bg/95 backdrop-blur-sm border-b border-border">
        <div className="mx-auto flex max-w-[760px] items-center justify-between px-6 py-5">
          <h1 className="text-2xl font-bold text-text">Search</h1>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearAll}
              className="text-xs font-semibold text-text-muted hover:text-text transition-colors px-3 py-1.5 rounded-lg hover:bg-surface-secondary"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="mx-auto w-full max-w-[760px] flex-1 px-6 py-6">
        <SearchFilterBar />

        {/* Result count */}
        {results.length > 0 && (
          <p className="mt-6 mb-4 text-xs font-semibold text-text-muted uppercase tracking-wider">
            {results.length} result{results.length !== 1 ? "s" : ""}
          </p>
        )}

        {/* Results list */}
        {results.length > 0 &&
          results.map((result) => (
            <TimelineCard
              key={result.id}
              entry={result}
              tags={resultTags[result.id] ?? []}
              expanded={expandedId === result.id}
              onToggleExpand={() =>
                setExpandedId((prev) => (prev === result.id ? null : result.id))
              }
              onOpen={() => {
                void selectEntry(result.id).then(() => {
                  navigateToEditor("timeline");
                });
              }}
              searchQuery={query}
            />
          ))}

        {/* Pre-search empty state */}
        {!hasActiveFilters && !isSearching && results.length === 0 && (
          <PreSearchState />
        )}

        {/* No-results state */}
        {hasActiveFilters && !isSearching && results.length === 0 && (
          <NoResultsState />
        )}
      </div>
    </div>
  );
}
