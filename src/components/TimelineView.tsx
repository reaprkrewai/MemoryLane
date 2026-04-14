import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useEntryStore, Photo } from "../stores/entryStore";
import { useViewStore } from "../stores/viewStore";
import { TimelineCard } from "./TimelineCard";
import { DaySeparator } from "./DaySeparator";
import { EmptyState } from "./EmptyState";
import { OnThisDay } from "./OnThisDay";
import { getDb } from "../lib/db";

interface EntryTagRow {
  entry_id: string;
  id: string;
  name: string;
  color: string;
}

interface EntryPhotoRow extends Photo {
  entry_id: string;
}

export function TimelineView() {
  const allEntries = useEntryStore((s) => s.allEntries);
  const hasMore = useEntryStore((s) => s.hasMore);
  const isLoadingPage = useEntryStore((s) => s.isLoadingPage);
  const loadPage = useEntryStore((s) => s.loadPage);
  const createEntry = useEntryStore((s) => s.createEntry);
  const selectEntry = useEntryStore((s) => s.selectEntry);

  const navigateToEditor = useViewStore((s) => s.navigateToEditor);
  const setTimelineScrollY = useViewStore((s) => s.setTimelineScrollY);
  const timelineScrollY = useViewStore((s) => s.timelineScrollY);
  const dateFilter = useViewStore((s) => s.dateFilter);
  const setDateFilter = useViewStore((s) => s.setDateFilter);

  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Only one card expanded at a time (Pitfall 6)
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);

  // Tags for currently-loaded entries: Record<entryId, Tag[]>
  const [entryTags, setEntryTags] = useState<Record<string, EntryTagRow[]>>({});

  // Photos for currently-loaded entries: Record<entryId, Photo[]>
  const [entryPhotos, setEntryPhotos] = useState<Record<string, EntryPhotoRow[]>>({});

  // Batch-fetch tags whenever allEntries changes (N+1 avoidance per RESEARCH.md Open Q 2)
  useEffect(() => {
    if (allEntries.length === 0) {
      setEntryTags({});
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const db = await getDb();
        const ids = allEntries.map((e) => e.id);
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
        setEntryTags(grouped);
      } catch {
        // Non-fatal: cards will render with empty tag arrays
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [allEntries]);

  // Batch-fetch photos whenever allEntries changes
  useEffect(() => {
    if (allEntries.length === 0) {
      setEntryPhotos({});
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const db = await getDb();
        const ids = allEntries.map((e) => e.id);
        const placeholders = ids.map(() => "?").join(",");
        const rows = await db.select<EntryPhotoRow[]>(
          `SELECT * FROM media_attachments
           WHERE entry_id IN (${placeholders})
           ORDER BY entry_id, display_order ASC`,
          ids
        );
        if (cancelled) return;
        const grouped: Record<string, EntryPhotoRow[]> = {};
        for (const row of rows) {
          if (!grouped[row.entry_id]) grouped[row.entry_id] = [];
          grouped[row.entry_id].push(row);
        }
        setEntryPhotos(grouped);
      } catch {
        // Non-fatal: cards will render with empty photo arrays
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [allEntries]);

  // IntersectionObserver for infinite scroll (D-11, Pattern 4, Pitfall 2)
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first && first.isIntersecting && hasMore && !isLoadingPage) {
          const cursor =
            allEntries.length > 0
              ? allEntries[allEntries.length - 1].created_at
              : undefined;
          void loadPage(cursor);
        }
      },
      { rootMargin: "200px", threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, isLoadingPage, allEntries, loadPage]);

  // Restore scroll position on mount (Open Q 3)
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    if (timelineScrollY > 0) {
      container.scrollTo({ top: timelineScrollY, behavior: "auto" });
    }
  }, []); // only on mount

  // Persist scroll position on scroll
  const handleScroll = useCallback(() => {
    const container = scrollRef.current;
    if (!container) return;
    setTimelineScrollY(container.scrollTop);
  }, [setTimelineScrollY]);

  // Filter entries by dateFilter when set (CAL-04 integration — wired by Plan 03)
  const filteredEntries = useMemo(() => {
    if (!dateFilter) return allEntries;
    // dateFilter is "YYYY-MM-DD" — compare via local date
    return allEntries.filter((e) => {
      const d = new Date(e.created_at);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}` === dateFilter;
    });
  }, [allEntries, dateFilter]);

  // Group entries by local calendar day (Pattern 5)
  const grouped = useMemo(() => {
    const out: { dayKey: string; date: Date; entries: typeof filteredEntries }[] = [];
    for (const entry of filteredEntries) {
      const d = new Date(entry.created_at);
      const dayKey = d.toDateString();
      const last = out[out.length - 1];
      if (last && last.dayKey === dayKey) {
        last.entries.push(entry);
      } else {
        out.push({ dayKey, date: d, entries: [entry] });
      }
    }
    return out;
  }, [filteredEntries]);

  const handleNewEntry = async () => {
    const newId = await createEntry();
    await selectEntry(newId);
    navigateToEditor("timeline");
  };

  const handleOpenEntry = async (entryId: string) => {
    await selectEntry(entryId);
    navigateToEditor("timeline");
  };

  const handleToggleExpand = (entryId: string) => {
    setExpandedEntryId((curr) => (curr === entryId ? null : entryId));
  };

  const clearDateFilter = () => setDateFilter(null);

  // Empty states
  const isEmpty = filteredEntries.length === 0 && !isLoadingPage;
  const isFilteredEmpty = isEmpty && dateFilter !== null;
  const isAllEmpty = isEmpty && dateFilter === null;

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className="flex h-full flex-col overflow-y-auto bg-bg"
    >
      {/* Sticky header row */}
      <div className="sticky top-0 z-10 border-b border-border bg-bg/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[760px] items-center justify-between px-6 py-5">
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold text-text">Journal</h1>
            {dateFilter && (
              <button
                type="button"
                onClick={clearDateFilter}
                className="mt-1 text-xs text-text-muted hover:text-text transition-colors flex items-center gap-1"
              >
                <span className="font-semibold">{format(new Date(dateFilter + "T00:00:00"), "MMM d, yyyy")}</span>
                <span>—</span>
                <span className="underline">Clear filter</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="mx-auto w-full max-w-[760px] flex-1 px-6 py-6">
        <OnThisDay />

        {isAllEmpty && <EmptyState />}

        {isFilteredEmpty && (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <h2 className="text-xl font-bold text-text">Nothing here yet</h2>
            <p className="text-sm text-text-secondary max-w-sm">
              No entries for {format(new Date(dateFilter! + "T00:00:00"), "MMM d, yyyy")}. Select a different date or write something new.
            </p>
          </div>
        )}

        {!isEmpty &&
          grouped.map((group) => (
            <div key={group.dayKey}>
              <DaySeparator date={group.date} />
              {group.entries.map((entry) => (
                <TimelineCard
                  key={entry.id}
                  entry={entry}
                  tags={entryTags[entry.id] ?? []}
                  photos={entryPhotos[entry.id] ?? []}
                  expanded={expandedEntryId === entry.id}
                  onToggleExpand={() => handleToggleExpand(entry.id)}
                  onOpen={() => void handleOpenEntry(entry.id)}
                />
              ))}
            </div>
          ))}

        {/* Sentinel — always rendered (even when empty) so observer can trigger first fill if needed */}
        <div ref={sentinelRef} className="h-1" />

        {isLoadingPage && hasMore && (
          <div className="flex justify-center py-4">
            <Loader2 size={20} className="animate-spin text-muted" />
          </div>
        )}
      </div>
    </div>
  );
}
