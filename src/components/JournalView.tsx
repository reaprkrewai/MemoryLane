import { useEffect, useState } from "react";
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

  // ANIM-05 — crossfade between top-level views
  const [displayedView, setDisplayedView] = useState(activeView);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    void loadEntries();
    resetPagination();
    void loadPage();
  }, [loadEntries, loadPage, resetPagination]);

  useEffect(() => {
    if (activeView === displayedView) return;
    setFading(true);
    const t = setTimeout(() => {
      setDisplayedView(activeView);
      setFading(false);
    }, 150); // matches --motion-fast + animate-fade-out duration
    return () => clearTimeout(t);
  }, [activeView, displayedView]);

  const viewToRender = fading ? displayedView : activeView;
  const isEditorView = viewToRender === "editor" && selectedEntryId;
  const isKnownView =
    viewToRender === "overview" ||
    viewToRender === "search" ||
    viewToRender === "calendar" ||
    isEditorView;

  return (
    <div
      key={viewToRender}
      className={fading ? "animate-fade-out" : "animate-fade-in"}
    >
      {viewToRender === "overview" && <OverviewView />}
      {viewToRender === "search" && <SearchView />}
      {viewToRender === "calendar" && <CalendarView />}
      {isEditorView && <EntryEditor entryId={selectedEntryId} />}
      {!isKnownView && <TimelineView />}
    </div>
  );
}
