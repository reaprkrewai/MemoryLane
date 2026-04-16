import { useEffect, useMemo } from "react";
import { BookOpen, Hash, Flame, Tag, Plus, Pencil, ArrowRight } from "lucide-react";
import { format, formatDistanceToNow, startOfDay, subDays } from "date-fns";
import { useEntryStore } from "../stores/entryStore";
import { useTagStore } from "../stores/tagStore";
import { useViewStore } from "../stores/viewStore";
import { StatCard } from "./StatCard";
import { QuickActions } from "./QuickActions";
import { MoodOverview } from "./MoodOverview";
import { QuickWriteFAB } from "./QuickWriteFAB";
import { stripMarkdown } from "../lib/stripMarkdown";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return "Late tonight";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 22) return "Good evening";
  return "Good night";
}

function formatFullDate(date: Date): string {
  return format(date, "EEEE, MMMM d, yyyy");
}

function calculateDayStreak(entries: { created_at: number }[]): number {
  if (entries.length === 0) return 0;

  const uniqueDates = new Set(
    entries.map((e) => format(startOfDay(new Date(e.created_at)), "yyyy-MM-dd"))
  );

  let streak = 0;
  let cursor = startOfDay(new Date());

  while (uniqueDates.has(format(cursor, "yyyy-MM-dd"))) {
    streak += 1;
    cursor = subDays(cursor, 1);
  }

  return streak;
}

function calculateMoodCounts(
  entries: { mood: string | null; created_at: number }[]
): Record<string, number> {
  const thirtyDaysAgo = subDays(new Date(), 30).getTime();
  return entries
    .filter((e) => e.mood && e.created_at >= thirtyDaysAgo)
    .reduce<Record<string, number>>((acc, e) => {
      if (e.mood) acc[e.mood] = (acc[e.mood] ?? 0) + 1;
      return acc;
    }, {});
}

export function OverviewView() {
  const allEntries = useEntryStore((s) => s.allEntries);
  const loadPage = useEntryStore((s) => s.loadPage);
  const createEntry = useEntryStore((s) => s.createEntry);
  const selectEntry = useEntryStore((s) => s.selectEntry);
  const tags = useTagStore((s) => s.tags);
  const loadTags = useTagStore((s) => s.loadTags);
  const setView = useViewStore((s) => s.setView);
  const navigateToEditor = useViewStore((s) => s.navigateToEditor);

  useEffect(() => {
    loadPage();
    loadTags();
  }, [loadPage, loadTags]);

  const greeting = useMemo(() => getGreeting(), []);
  const today = useMemo(() => new Date(), []);

  const stats = useMemo(() => {
    const totalEntries = allEntries.length;
    const wordsWritten = allEntries.reduce((sum, e) => sum + (e.word_count ?? 0), 0);
    const dayStreak = calculateDayStreak(allEntries);
    const tagsCreated = tags.length;
    return { totalEntries, wordsWritten, dayStreak, tagsCreated };
  }, [allEntries, tags]);

  const moodCounts = useMemo(() => calculateMoodCounts(allEntries), [allEntries]);

  const recentEntries = useMemo(() => allEntries.slice(0, 3), [allEntries]);

  const handleNewEntry = async () => {
    const newId = await createEntry();
    await selectEntry(newId);
    navigateToEditor("timeline");
  };

  const handleOpenEntry = async (id: string) => {
    await selectEntry(id);
    navigateToEditor("timeline");
  };

  const hasEntries = allEntries.length > 0;

  return (
    <div className="relative min-h-full overflow-y-auto">
      <div className="relative z-10 mx-auto max-w-[1200px] px-10 py-10">
        {/* Header: greeting + date + new entry */}
        <header className="mb-10 flex items-start justify-between gap-8">
          <div className="flex flex-col gap-1">
            <h1
              className="font-display-italic text-[52px] font-normal leading-[1.05] tracking-[-0.02em] text-[var(--color-text)]"
            >
              {greeting}
            </h1>
            <p className="text-sm text-[var(--color-text-secondary)]">
              {formatFullDate(today)}
            </p>
          </div>

          <button
            onClick={() => void handleNewEntry()}
            className="group relative flex items-center gap-2 overflow-hidden rounded-full px-5 py-2.5 text-sm font-medium text-white shadow-[0_6px_20px_rgba(124,109,255,0.35)] transition-all duration-300 hover:shadow-[0_8px_28px_rgba(124,109,255,0.5)] hover:-translate-y-0.5"
            style={{
              background:
                "linear-gradient(135deg, var(--color-primary-glow) 0%, var(--color-primary) 100%)",
            }}
          >
            <Plus size={16} strokeWidth={2.25} className="relative" />
            <span className="relative tracking-tight">New Entry</span>
          </button>
        </header>

        {/* Editorial section break — a subtle ornamental rule */}
        <div className="mb-8 flex items-center gap-4">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[var(--color-border)] to-transparent" />
        </div>

        {/* Stat grid */}
        <section className="mb-8 grid grid-cols-4 gap-4">
          <StatCard
            icon={BookOpen}
            label="Total entries"
            value={stats.totalEntries}
            variant="blue"
          />
          <StatCard
            icon={Hash}
            label="Words written"
            value={stats.wordsWritten.toLocaleString()}
            variant="violet"
          />
          <StatCard
            icon={Flame}
            label="Day streak"
            value={stats.dayStreak}
            variant="amber"
            suffix={stats.dayStreak === 1 ? "day" : "days"}
          />
          <StatCard
            icon={Tag}
            label="Tags created"
            value={stats.tagsCreated}
            variant="emerald"
          />
        </section>

        {/* Main content split */}
        <section className="grid grid-cols-[2fr_1fr] gap-4">
          {/* Recent entries */}
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
            <div className="mb-5 flex items-baseline justify-between">
              <h3 className="font-display text-lg font-semibold text-[var(--color-text)]">
                Recent entries
              </h3>
              {hasEntries && (
                <button
                  onClick={() => setView("timeline")}
                  className="group flex items-center gap-1 text-xs text-[var(--color-primary)] transition-colors hover:text-[var(--color-primary-glow)]"
                >
                  View all
                  <ArrowRight
                    size={12}
                    className="transition-transform duration-200 group-hover:translate-x-0.5"
                  />
                </button>
              )}
            </div>

            {!hasEntries ? (
              <div className="flex flex-col items-center justify-center py-14 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-secondary)]">
                  <Pencil
                    size={20}
                    strokeWidth={1.5}
                    className="text-[var(--color-text-muted)]"
                  />
                </div>
                <p className="mb-1 text-sm text-[var(--color-text-secondary)]">
                  No entries yet
                </p>
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
                  const relativeTime = formatDistanceToNow(new Date(entry.created_at), {
                    addSuffix: true,
                  });
                  return (
                    <li key={entry.id}>
                      <button
                        onClick={() => void handleOpenEntry(entry.id)}
                        className="group flex w-full items-start gap-4 py-3.5 text-left transition-colors"
                      >
                        <div className="flex-1 overflow-hidden">
                          <p className="mb-1 line-clamp-2 text-sm leading-relaxed text-[var(--color-text)] transition-colors group-hover:text-[var(--color-primary)]">
                            {preview || (
                              <span className="italic text-[var(--color-text-muted)]">
                                Empty entry
                              </span>
                            )}
                          </p>
                          <p className="font-display-italic text-xs text-[var(--color-text-muted)]">
                            {relativeTime}
                          </p>
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

          {/* Right column — stacked */}
          <div className="flex flex-col gap-4">
            <MoodOverview moodCounts={moodCounts} />
            <QuickActions
              onStartWriting={() => void handleNewEntry()}
              onAskAI={() => setView("search")}
              onViewInsights={() => setView("search")}
              onSearch={() => setView("search")}
            />
          </div>
        </section>
      </div>

      <QuickWriteFAB onClick={() => void handleNewEntry()} />
    </div>
  );
}
