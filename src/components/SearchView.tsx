import { useEffect, useState } from "react";
import { Search, Sparkles, Loader2, AlertCircle } from "lucide-react";
import { useSearchStore } from "../stores/searchStore";
import { useEntryStore } from "../stores/entryStore";
import { useViewStore } from "../stores/viewStore";
import { getDb } from "../lib/db";
import { checkOllamaHealth } from "../lib/ollamaService";
import { SearchFilterBar } from "./SearchFilterBar";
import { TimelineCard } from "./TimelineCard";
import type { SearchEntry } from "../stores/searchStore";

interface EntryTagRow {
  entry_id: string;
  id: string;
  name: string;
  color: string;
}

interface QAResultCardProps {
  answer: string;
  citedEntryIds: string[];
  entries: SearchEntry[];
  onCitationClick: (entryId: string) => void;
}

/**
 * Display Q&A result with answer text and clickable citation links.
 * Shows sources list with entry dates.
 * If answer has no citations, shows "Answer not grounded in entries" message.
 */
function QAResultCard({
  answer,
  citedEntryIds,
  entries,
  onCitationClick,
}: QAResultCardProps) {
  return (
    <div className="rounded-lg border border-border bg-surface-secondary p-5 mb-6">
      {/* Answer section */}
      <div className="mb-5">
        <h3 className="font-semibold text-text mb-2 flex items-center gap-2">
          <Sparkles size={16} className="text-accent" />
          AI Generated Answer
        </h3>
        <p className="text-text-secondary whitespace-pre-wrap text-sm leading-relaxed">
          {answer}
        </p>
      </div>

      {/* Sources section */}
      <div className="border-t border-border pt-4">
        <h4 className="font-semibold text-text mb-2 text-sm">Sources</h4>
        {citedEntryIds.length === 0 ? (
          <p className="text-xs text-text-muted italic">
            Answer not grounded in entries
          </p>
        ) : (
          <ul className="space-y-1">
            {citedEntryIds.map((entryId) => {
              const entry = entries.find((e) => e.id === entryId);
              if (!entry) return null;

              const date = new Date(entry.created_at).toLocaleDateString(
                "en-US",
                { month: "short", day: "numeric", year: "numeric" }
              );

              return (
                <li key={entryId}>
                  <button
                    type="button"
                    onClick={() => onCitationClick(entryId)}
                    className="text-xs text-accent hover:underline transition-colors"
                  >
                    Entry from {date}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
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
  const searchMode = useSearchStore((s) => s.searchMode);
  const searchError = useSearchStore((s) => s.searchError);
  const setSearchMode = useSearchStore((s) => s.setSearchMode);
  const resetSearch = useSearchStore((s) => s.resetSearch);
  const qaResult = useSearchStore((s) => s.qaResult);
  const isAsking = useSearchStore((s) => s.isAsking);
  const runQA = useSearchStore((s) => s.runQA);
  const setQuery = useSearchStore((s) => s.setQuery);

  const selectEntry = useEntryStore((s) => s.selectEntry);
  const navigateToEditor = useViewStore((s) => s.navigateToEditor);

  // Ollama availability check
  const [ollamaAvailable, setOllamaAvailable] = useState(false);
  const [checkingOllama, setCheckingOllama] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const health = await checkOllamaHealth();
      if (mounted) {
        setOllamaAvailable(health.available && health.embedding);
        setCheckingOllama(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

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

  // Q&A input for AI mode
  const [qaInput, setQAInput] = useState("");

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

  const handleModeChange = (newMode: "keyword" | "ai") => {
    setSearchMode(newMode);
  };

  const handleAskQuestion = async () => {
    const trimmedQuestion = qaInput.trim();
    if (trimmedQuestion.length === 0) return;

    // Update query so it appears in the state
    setQuery(trimmedQuestion);
    await runQA(trimmedQuestion);
    setQAInput("");
  };

  const handleCitationClick = (entryId: string) => {
    void selectEntry(entryId).then(() => {
      navigateToEditor("timeline");
    });
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-bg">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-bg/95 backdrop-blur-sm border-b border-border">
        <div className="mx-auto max-w-[760px] px-6 py-5">
          <div className="flex items-center justify-between mb-4">
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

          {/* Search mode tabs */}
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => handleModeChange("keyword")}
              className={[
                "px-4 py-2 rounded-md text-sm font-medium transition-colors",
                searchMode === "keyword"
                  ? "bg-accent/20 text-text border border-accent/50"
                  : "text-text-muted hover:text-text hover:bg-surface",
              ].join(" ")}
            >
              Keyword Search
            </button>
            <button
              type="button"
              onClick={() => {
                if (ollamaAvailable) {
                  handleModeChange("ai");
                }
              }}
              disabled={!ollamaAvailable && !checkingOllama}
              className={[
                "px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2",
                searchMode === "ai" && ollamaAvailable
                  ? "bg-accent/20 text-text border border-accent/50"
                  : ollamaAvailable
                    ? "text-text-muted hover:text-text hover:bg-surface cursor-pointer"
                    : "text-text-muted opacity-50 cursor-not-allowed",
              ].join(" ")}
              title={!ollamaAvailable ? "Ollama not available" : ""}
            >
              <Sparkles size={16} />
              AI Search
            </button>
          </div>

          {/* AI Search unavailable message */}
          {searchMode === "ai" && !ollamaAvailable && (
            <div className="mt-3 rounded-md bg-amber-500/10 border border-amber-500/30 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
              AI features require Ollama. See settings to install.
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="mx-auto w-full max-w-[760px] flex-1 px-6 py-6">
        {searchMode === "ai" ? (
          <>
            {/* AI Search input */}
            <div className="mb-6">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ask a question about your journal..."
                  value={qaInput}
                  onChange={(e) => setQAInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && qaInput.trim().length > 0) {
                      void handleAskQuestion();
                    }
                  }}
                  disabled={isAsking}
                  className="flex-1 rounded-lg border border-border bg-surface px-4 py-2 text-sm text-text placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => void handleAskQuestion()}
                  disabled={isAsking || qaInput.trim().length === 0}
                  className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {isAsking ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      Ask
                    </>
                  )}
                </button>
              </div>
              {isAsking && (
                <p className="mt-2 text-xs text-text-muted">
                  Generating answer...
                </p>
              )}
            </div>

            {/* Q&A Result */}
            {qaResult && !isAsking && (
              <QAResultCard
                answer={qaResult.answer}
                citedEntryIds={qaResult.citedEntryIds}
                entries={results}
                onCitationClick={handleCitationClick}
              />
            )}
          </>
        ) : (
          <SearchFilterBar
            searchMode={searchMode}
            onModeChange={handleModeChange}
          />
        )}

        {/* Error message */}
        {searchError && (
          <div className="mt-4 rounded-md bg-red-500/10 border border-red-500/30 px-3 py-2 text-sm text-red-700 dark:text-red-400 flex gap-2 items-start">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
            <span>{searchError}</span>
          </div>
        )}

        {/* Result count */}
        {results.length > 0 && (
          <p className="mt-6 mb-4 text-xs font-semibold text-text-muted uppercase tracking-wider">
            {results.length} result{results.length !== 1 ? "s" : ""} {searchMode === "ai" ? "— Most relevant" : ""}
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
