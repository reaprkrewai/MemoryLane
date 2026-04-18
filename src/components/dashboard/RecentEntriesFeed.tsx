import { ArrowRight, Pencil } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useEntryStore } from "../../stores/entryStore";
import { useViewStore } from "../../stores/viewStore";
import { stripMarkdown } from "../../lib/stripMarkdown";

export function RecentEntriesFeed() {
  // Primitive selectors — one per line (D-08 contract)
  const recentEntries = useEntryStore((s) => s.recentEntries); // full 5-item stable slice (D-06)
  const isLoadingPage = useEntryStore((s) => s.isLoadingPage);
  const totalEntries = useEntryStore((s) => s.totalEntries);
  const allEntriesLength = useEntryStore((s) => s.allEntries.length);
  const selectEntry = useEntryStore((s) => s.selectEntry);
  const createEntry = useEntryStore((s) => s.createEntry);
  const setView = useViewStore((s) => s.setView);
  const navigateToEditor = useViewStore((s) => s.navigateToEditor);

  const hasEntries = recentEntries.length > 0;
  const showSkeleton = isLoadingPage && allEntriesLength === 0 && totalEntries === 0;

  const handleOpenEntry = async (id: string) => {
    await selectEntry(id);
    navigateToEditor("timeline");
  };
  const handleNewEntry = async () => {
    const newId = await createEntry();
    await selectEntry(newId);
    navigateToEditor("timeline");
  };

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
      <div className="mb-5 flex items-baseline justify-between">
        <h3 className="font-display text-lg font-semibold text-[var(--color-text)]">Recent entries</h3>
        {hasEntries && (
          <button
            onClick={() => setView("timeline")}
            className="group flex items-center gap-1 text-xs text-[var(--color-primary)] transition-colors hover:text-[var(--color-primary-glow)]"
          >
            View all
            <ArrowRight size={12} className="transition-transform duration-200 group-hover:translate-x-0.5" />
          </button>
        )}
      </div>
      {/* 1) skeleton, 2) empty state, 3) list — triple-gate priority */}
      {showSkeleton ? (
        <ul className="flex flex-col divide-y divide-[var(--color-border-subtle)]" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <li key={i} className="py-3.5">
              <div className="h-3 w-full animate-pulse rounded bg-[var(--color-surface-secondary)]" />
              <div className="mt-1 h-2 w-1/3 animate-pulse rounded bg-[var(--color-surface-secondary)]" />
            </li>
          ))}
        </ul>
      ) : !hasEntries ? (
        <div className="flex flex-col items-center justify-center py-14 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-secondary)]">
            <Pencil size={20} strokeWidth={1.5} className="text-[var(--color-text-muted)]" />
          </div>
          <p className="mb-1 text-sm text-[var(--color-text-secondary)]">No entries yet</p>
          <button
            onClick={() => void handleNewEntry()}
            className="font-display-italic text-sm text-[var(--color-primary)] transition-colors hover:text-[var(--color-primary-glow)]"
          >
            Write your first entry
          </button>
        </div>
      ) : (
        <ul className="flex flex-col divide-y divide-[var(--color-border-subtle)]">
          {recentEntries.map((entry) => {
            const preview = stripMarkdown(entry.content).slice(0, 140).trim();
            const relativeTime = formatDistanceToNow(new Date(entry.created_at), { addSuffix: true });
            return (
              <li key={entry.id}>
                <button
                  onClick={() => void handleOpenEntry(entry.id)}
                  className="group flex w-full items-start gap-4 py-3.5 text-left transition-colors"
                >
                  <div className="flex-1 overflow-hidden">
                    <p className="mb-1 line-clamp-2 text-sm leading-relaxed text-[var(--color-text)] transition-colors group-hover:text-[var(--color-primary)]">
                      {preview || <span className="italic text-[var(--color-text-muted)]">Empty entry</span>}
                    </p>
                    <p className="font-display-italic text-xs text-[var(--color-text-muted)]">{relativeTime}</p>
                  </div>
                  {entry.mood && (
                    <span className="mt-1 flex h-2 w-2 shrink-0 rounded-full bg-[var(--color-primary)]" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
