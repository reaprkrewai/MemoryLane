import { BookOpen, CalendarDays, Search, Settings } from "lucide-react";
import { EntryList } from "./EntryList";
import { useViewStore } from "../stores/viewStore";

const navItems = [
  { icon: BookOpen, label: "Journal", id: "journal" },
  { icon: CalendarDays, label: "Calendar", id: "calendar" },
  { icon: Search, label: "Search", id: "search" },
  { icon: Settings, label: "Settings", id: "settings" },
] as const;

export function Sidebar() {
  const activeView = useViewStore((s) => s.activeView);
  const setView = useViewStore((s) => s.setView);

  // Treat 'editor' as 'journal' for nav highlight — editor is reached from journal
  const activeId =
    activeView === "calendar"
      ? "calendar"
      : activeView === "search"
      ? "search"
      : activeView === "timeline" || activeView === "editor"
      ? "journal"
      : "journal";

  const handleNavClick = (id: string) => {
    if (id === "journal") {
      setView("timeline");
    } else if (id === "calendar") {
      setView("calendar");
    } else if (id === "search") {
      setView("search");
    }
  };

  // Per D-01: sidebar compact EntryList only appears when editor is active.
  // Open question 1 resolution from RESEARCH.md.
  const showEntryList = activeView === "editor";

  return (
    <nav className="flex w-60 flex-col border-r border-border bg-surface">
      <div className="py-4">
        {navItems.map((item) => {
          const isActive = item.id === activeId;
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`flex items-center gap-3 px-4 py-2 text-body transition-colors w-full ${
                isActive
                  ? "border-l-[3px] border-accent bg-bg font-semibold text-text"
                  : "border-l-[3px] border-transparent text-muted hover:bg-bg/50 hover:text-text"
              }`}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {showEntryList && (
        <>
          {/* Separator */}
          <div className="border-b border-border" />
          {/* Entry list — fills remaining vertical space */}
          <div className="flex flex-1 flex-col overflow-hidden">
            <EntryList />
          </div>
        </>
      )}
    </nav>
  );
}
