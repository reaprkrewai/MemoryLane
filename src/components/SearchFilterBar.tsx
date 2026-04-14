import React, { useEffect, useRef } from "react";
import { Search, X, Laugh, Smile, Meh, Frown, Angry } from "lucide-react";
import { useSearchStore } from "../stores/searchStore";
import { useTagStore } from "../stores/tagStore";
import { DatePicker } from "./DatePicker";

const MOODS = [
  { value: "great" as const, icon: Laugh, label: "Great" },
  { value: "good" as const, icon: Smile, label: "Good" },
  { value: "okay" as const, icon: Meh, label: "Okay" },
  { value: "bad" as const, icon: Frown, label: "Bad" },
  { value: "awful" as const, icon: Angry, label: "Awful" },
];

interface SearchFilterBarProps {
  searchMode?: "keyword" | "ai";
  onModeChange?: (mode: "keyword" | "ai") => void;
}

export function SearchFilterBar({
  searchMode = "keyword",
}: SearchFilterBarProps) {
  const query = useSearchStore((s) => s.query);
  const startDate = useSearchStore((s) => s.startDate);
  const endDate = useSearchStore((s) => s.endDate);
  const selectedTagIds = useSearchStore((s) => s.selectedTagIds);
  const selectedMoods = useSearchStore((s) => s.selectedMoods);
  const setQuery = useSearchStore((s) => s.setQuery);
  const setStartDate = useSearchStore((s) => s.setStartDate);
  const setEndDate = useSearchStore((s) => s.setEndDate);
  const toggleTag = useSearchStore((s) => s.toggleTag);
  const toggleMood = useSearchStore((s) => s.toggleMood);
  const runSearch = useSearchStore((s) => s.runSearch);

  const tags = useTagStore((s) => s.tags);
  const loadTags = useTagStore((s) => s.loadTags);

  // Load tags on mount if not yet loaded
  useEffect(() => {
    if (tags.length === 0) {
      void loadTags();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounce ref for keyword input — 300ms
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { void runSearch(); }, 300);
  };

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  const handleClearQuery = () => {
    setQuery("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    void runSearch();
  };

  const handleStartDateChange = (d: Date) => {
    setStartDate(d.getTime());
    void runSearch();
  };

  const handleClearStartDate = () => {
    setStartDate(null);
    void runSearch();
  };

  const handleEndDateChange = (d: Date) => {
    const newEndTs = d.getTime();
    // If end date would be before start date, clear start date silently
    if (startDate !== null && newEndTs < startDate) {
      setStartDate(null);
    }
    setEndDate(newEndTs);
    void runSearch();
  };

  const handleClearEndDate = () => {
    setEndDate(null);
    void runSearch();
  };

  return (
    <div className="rounded-md border border-border bg-surface p-4">
      {/* Row 0: Search input */}
      <div className="relative">
        <Search
          size={16}
          className="text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
        />
        <input
          value={query}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleQueryChange(e.target.value)}
          placeholder={
            searchMode === "ai"
              ? "Ask a question or describe what you're looking for..."
              : "Search by keyword..."
          }
          className="w-full pl-9 pr-9 h-10 rounded-md border border-border bg-bg text-body text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/50 px-3 transition-colors"
          aria-label="Search entries"
        />
        {query.length > 0 && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={handleClearQuery}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-text cursor-pointer transition-colors"
          >
            <X size={14} />
          </button>
        )}
      </div>

      <hr className="border-border my-4" />

      {/* Row 1: Date range filter */}
      <div className="flex items-center gap-2">
        <span className="min-w-14 text-label text-muted">Date</span>
        <div className="flex items-center gap-1">
          {startDate !== null ? (
            <>
              <DatePicker
                date={new Date(startDate)}
                onDateChange={handleStartDateChange}
              />
              <button
                type="button"
                onClick={handleClearStartDate}
                className="text-label text-muted hover:text-text ml-1 transition-colors"
                aria-label="Clear start date"
              >
                ×
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => {
                setStartDate(Date.now());
                void runSearch();
              }}
              className="bg-surface border border-border rounded-md px-3 py-1 text-label text-muted h-8 hover:bg-bg cursor-pointer transition-colors"
            >
              Start date
            </button>
          )}
        </div>
        <span className="text-label text-muted mx-2">→</span>
        <div className="flex items-center gap-1">
          {endDate !== null ? (
            <>
              <DatePicker
                date={new Date(endDate)}
                onDateChange={handleEndDateChange}
              />
              <button
                type="button"
                onClick={handleClearEndDate}
                className="text-label text-muted hover:text-text ml-1 transition-colors"
                aria-label="Clear end date"
              >
                ×
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => {
                setEndDate(Date.now());
                void runSearch();
              }}
              className="bg-surface border border-border rounded-md px-3 py-1 text-label text-muted h-8 hover:bg-bg cursor-pointer transition-colors"
            >
              End date
            </button>
          )}
        </div>
      </div>

      {/* Row 2: Tag filter chips */}
      <div className="mt-3 flex items-start gap-2">
        <span className="min-w-14 text-label text-muted mt-[5px]">Tags</span>
        <div className="flex flex-wrap gap-2">
          {tags.length === 0 ? (
            <span className="text-label text-muted">No tags yet</span>
          ) : (
            tags.map((tag) => {
              const isSelected = selectedTagIds.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => {
                    toggleTag(tag.id);
                    void runSearch();
                  }}
                  className="rounded-full px-3 py-[4px] border cursor-pointer transition-colors text-label"
                  style={{
                    backgroundColor: isSelected
                      ? `color-mix(in srgb, ${tag.color} 25%, transparent)`
                      : `color-mix(in srgb, ${tag.color} 15%, transparent)`,
                    borderColor: isSelected
                      ? tag.color
                      : `color-mix(in srgb, ${tag.color} 40%, transparent)`,
                    color: "var(--color-text)",
                    fontWeight: isSelected ? 600 : undefined,
                  }}
                >
                  {tag.name}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Row 3: Mood filter pills */}
      <div className="mt-3 flex items-center gap-2">
        <span className="min-w-14 text-label text-muted">Mood</span>
        <div className="flex flex-wrap gap-2">
          {MOODS.map(({ value, icon: MoodIcon, label }) => {
            const isSelected = selectedMoods.includes(value);
            return (
              <button
                key={value}
                type="button"
                onClick={() => {
                  toggleMood(value);
                  void runSearch();
                }}
                className={[
                  "flex items-center gap-1 rounded-full px-3 py-1 text-label min-h-[32px] cursor-pointer transition-colors",
                  isSelected
                    ? "bg-accent/15 border border-accent/50 text-text font-semibold"
                    : "bg-surface border border-border text-muted hover:border-border/80 hover:text-text",
                ].join(" ")}
              >
                <MoodIcon size={14} />
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
