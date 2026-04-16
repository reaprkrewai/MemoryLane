import { useEffect } from "react";
import { useEntryStore } from "../stores/entryStore";
import { useViewStore } from "../stores/viewStore";
import { EntryEditor } from "./EntryEditor";
import { TimelineView } from "./TimelineView";
import { CalendarView } from "./CalendarView";
import { SearchView } from "./SearchView";
import { OverviewView } from "./OverviewView";

export function JournalView() {
  const activeView = useViewStore((s) => s.activeView);
  const selectedEntryId = useEntryStore((s) => s.selectedEntryId);
  const loadEntries = useEntryStore((s) => s.loadEntries);
  const loadPage = useEntryStore((s) => s.loadPage);
  const resetPagination = useEntryStore((s) => s.resetPagination);

  useEffect(() => {
    void loadEntries();
    resetPagination();
    void loadPage();
  }, [loadEntries, loadPage, resetPagination]);

  if (activeView === "overview") return <OverviewView />;
  if (activeView === "search") return <SearchView />;
  if (activeView === "calendar") return <CalendarView />;
  if (activeView === "editor" && selectedEntryId) return <EntryEditor entryId={selectedEntryId} />;
  return <TimelineView />;
}
