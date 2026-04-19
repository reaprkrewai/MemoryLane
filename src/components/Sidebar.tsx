import {
  BookOpen,
  CalendarDays,
  Home,
  MessageSquare,
  Plus,
  Search,
  Settings,
} from "lucide-react";
import { EntryList } from "./EntryList";
import { useViewStore } from "../stores/viewStore";
import { useEntryStore } from "../stores/entryStore";
import { useSearchStore } from "../stores/searchStore";

const navItems = [
  { icon: Home, label: "Home", id: "home" },
  { icon: BookOpen, label: "Journal", id: "journal" },
  { icon: CalendarDays, label: "Calendar", id: "calendar" },
  { icon: Search, label: "Search", id: "search" },
  { icon: MessageSquare, label: "Ask AI", id: "ask-ai" },
  { icon: Settings, label: "Settings", id: "settings" },
] as const;

export function Sidebar() {
  const activeView = useViewStore((s) => s.activeView);
  const setView = useViewStore((s) => s.setView);
  const navigateToEditor = useViewStore((s) => s.navigateToEditor);
  const createEntry = useEntryStore((s) => s.createEntry);
  const selectEntry = useEntryStore((s) => s.selectEntry);
  const searchMode = useSearchStore((s) => s.searchMode);
  const setSearchMode = useSearchStore((s) => s.setSearchMode);

  // Map active view → highlighted nav item. 'editor' rolls up under Journal (it's
  // reached from the journal surface). 'search' splits by searchMode so Ask AI
  // highlights when the user is actually in AI Q&A mode.
  const activeId =
    activeView === "overview"
      ? "home"
      : activeView === "calendar"
      ? "calendar"
      : activeView === "search"
      ? searchMode === "ai"
        ? "ask-ai"
        : "search"
      : activeView === "settings"
      ? "settings"
      : "journal";

  const handleNavClick = (id: string) => {
    if (id === "home") {
      setView("overview");
    } else if (id === "journal") {
      setView("timeline");
    } else if (id === "calendar") {
      setView("calendar");
    } else if (id === "search") {
      setSearchMode("keyword");
      setView("search");
    } else if (id === "ask-ai") {
      setSearchMode("ai");
      setView("search");
    } else if (id === "settings") {
      setView("settings");
    }
  };

  const handleNewEntry = async () => {
    const newId = await createEntry();
    await selectEntry(newId);
    navigateToEditor("timeline");
  };

  // Per D-01: sidebar compact EntryList only appears when editor is active.
  // Open question 1 resolution from RESEARCH.md.
  const showEntryList = activeView === "editor";

  return (
    <nav className="flex w-64 flex-col border-r border-border bg-surface">
      {/* Header with app name and new entry button */}
      <div className="space-y-4 border-b border-border px-5 py-5">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            Chronicle
          </h2>
        </div>
        <button
          onClick={() => void handleNewEntry()}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-amber-950 transition-all duration-150 hover:bg-amber-600 active:scale-95"
        >
          <Plus size={18} />
          <span>New Entry</span>
        </button>
      </div>

      {/* Navigation items */}
      <div className="space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const isActive = item.id === activeId;
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`group flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-150 ${
                isActive
                  ? "bg-accent/10 text-accent"
                  : "text-text-secondary hover:text-text hover:bg-surface-secondary"
              }`}
            >
              <item.icon
                size={18}
                className={isActive ? "text-accent" : "text-text-secondary group-hover:text-text"}
              />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {showEntryList && (
        <>
          {/* Separator */}
          <div className="border-t border-border" />
          {/* Entry list — fills remaining vertical space */}
          <div className="flex flex-1 flex-col overflow-hidden">
            <EntryList />
          </div>
        </>
      )}
    </nav>
  );
}
