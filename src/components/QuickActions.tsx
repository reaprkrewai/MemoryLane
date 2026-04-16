import type { LucideIcon } from "lucide-react";
import { Feather, Search, Sparkles, MessageSquare, ChevronRight } from "lucide-react";

interface QuickAction {
  id: string;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}

interface QuickActionsProps {
  onStartWriting: () => void;
  onAskAI: () => void;
  onViewInsights: () => void;
  onSearch: () => void;
}

export function QuickActions({
  onStartWriting,
  onAskAI,
  onViewInsights,
  onSearch,
}: QuickActionsProps) {
  const actions: QuickAction[] = [
    { id: "write", icon: Feather, label: "Start writing", onClick: onStartWriting },
    { id: "ask", icon: MessageSquare, label: "Ask AI about your journal", onClick: onAskAI },
    { id: "insights", icon: Sparkles, label: "View AI insights", onClick: onViewInsights },
    { id: "search", icon: Search, label: "Search entries", onClick: onSearch },
  ];

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <h3 className="mb-4 font-display text-lg font-semibold text-[var(--color-text)]">
        Quick actions
      </h3>
      <div className="flex flex-col gap-1">
        {actions.map((action, idx) => (
          <button
            key={action.id}
            onClick={action.onClick}
            className="group flex items-center gap-3 rounded-lg px-2 py-2.5 text-left transition-colors duration-200 hover:bg-[var(--color-surface-secondary)]"
          >
            {/* Numeric index — editorial detail */}
            <span className="font-display-italic w-4 text-sm text-[var(--color-text-muted)]">
              {idx + 1}
            </span>
            <action.icon
              size={16}
              className="text-[var(--color-text-secondary)] transition-colors group-hover:text-[var(--color-primary)]"
              strokeWidth={1.75}
            />
            <span className="flex-1 text-sm text-[var(--color-text-secondary)] transition-colors group-hover:text-[var(--color-text)]">
              {action.label}
            </span>
            <ChevronRight
              size={14}
              className="translate-x-0 text-[var(--color-text-muted)] opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:opacity-100"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
