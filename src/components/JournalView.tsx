import { useEffect } from "react";
import { useEntryStore } from "../stores/entryStore";
import { useViewStore } from "../stores/viewStore";
import { EntryEditor } from "./EntryEditor";
import { TimelineView } from "./TimelineView";
import { CalendarView } from "./CalendarView";

export function JournalView() {
  const activeView = useViewStore((s) => s.activeView);
  const selectedEntryId = useEntryStore((s) => s.selectedEntryId);
  const loadEntries = useEntryStore((s) => s.loadEntries);
  const loadPage = useEntryStore((s) => s.loadPage);
  const resetPagination = useEntryStore((s) => s.resetPagination);

  // Phase 3: load sidebar list entries + first timeline page on mount.
  // Do NOT call ensureFirstEntry (Phase 2 behavior) — empty state is now shown in TimelineView.
  useEffect(() => {
    void loadEntries();
    resetPagination();
    void loadPage();
  }, [loadEntries, loadPage, resetPagination]);

  if (activeView === "calendar") return <CalendarView />;
  if (activeView === "editor" && selectedEntryId) return <EntryEditor entryId={selectedEntryId} />;
  return <TimelineView />;
}
