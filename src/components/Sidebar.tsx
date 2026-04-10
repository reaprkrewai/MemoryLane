import { BookOpen, CalendarDays, Search, Settings } from "lucide-react";
import { EntryList } from "./EntryList";

const navItems = [
  { icon: BookOpen, label: "Journal", id: "journal" },
  { icon: CalendarDays, label: "Calendar", id: "calendar" },
  { icon: Search, label: "Search", id: "search" },
  { icon: Settings, label: "Settings", id: "settings" },
] as const;

export function Sidebar() {
  // Phase 1: "journal" is always active; routing comes in Phase 2+
  const activeId = "journal";

  return (
    <nav className="flex w-60 flex-col border-r border-border bg-surface">
      <div className="py-4">
        {navItems.map((item) => {
          const isActive = item.id === activeId;
          return (
            <button
              key={item.id}
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

      {/* Separator */}
      <div className="border-b border-border" />

      {/* Entry list — fills remaining vertical space */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <EntryList />
      </div>
    </nav>
  );
}
