import { useEffect, useMemo } from "react";
import { BookOpen, CalendarDays, Flame, Tag, Plus } from "lucide-react";
import { format, subDays } from "date-fns";
import { useEntryStore } from "../stores/entryStore";
import { useTagStore } from "../stores/tagStore";
import { useViewStore } from "../stores/viewStore";
import { StatCard } from "./StatCard";
import { MoodOverview } from "./MoodOverview";
import { OnThisDay } from "./OnThisDay";
import { MoodTrends } from "./dashboard/MoodTrends";
import { WritingPrompts } from "./dashboard/WritingPrompts";
import { AIInsights } from "./dashboard/AIInsights";
import { RecentEntriesFeed } from "./dashboard/RecentEntriesFeed";

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
  const navigateToEditor = useViewStore((s) => s.navigateToEditor);

  useEffect(() => {
    loadPage();
    loadTags();
  }, [loadPage, loadTags]);

  const greeting = useMemo(() => getGreeting(), []);
  const today = useMemo(() => new Date(), []);

  const totalEntries = useEntryStore((s) => s.totalEntries);
  const dayStreak = useEntryStore((s) => s.dayStreak);
  const entriesThisMonth = useEntryStore((s) => s.entriesThisMonth); // DASH-02 via Plan 01
  const tagsCreated = tags.length;

  const moodCounts = useMemo(() => calculateMoodCounts(allEntries), [allEntries]);

  const handleNewEntry = async () => {
    const newId = await createEntry();
    await selectEntry(newId);
    navigateToEditor("timeline");
  };

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
        <section
          className="mb-8 grid grid-cols-4 gap-4 stagger-children"
          data-onboarding="stat-cards"
        >
          <div style={{ "--i": 0 } as React.CSSProperties} className="animate-fade-in">
            <StatCard
              icon={BookOpen}
              label="total entries"
              value={totalEntries}
              variant="blue"
            />
          </div>
          <div style={{ "--i": 1 } as React.CSSProperties} className="animate-fade-in">
            <StatCard
              icon={CalendarDays}
              label="this month"
              value={entriesThisMonth}
              variant="violet"
            />
          </div>
          <div style={{ "--i": 2 } as React.CSSProperties} className="animate-fade-in">
            <StatCard
              icon={Flame}
              label="this week"
              value={Math.min(dayStreak, 7)}
              variant="amber"
              suffix="/7"
            />
          </div>
          <div style={{ "--i": 3 } as React.CSSProperties} className="animate-fade-in">
            <StatCard
              icon={Tag}
              label="tags created"
              value={tagsCreated}
              variant="emerald"
            />
          </div>
        </section>

        {/* Main content split */}
        <section className="grid grid-cols-[2fr_1fr] gap-4">
          {/* Recent entries (extracted to dashboard/) */}
          <RecentEntriesFeed />

          {/* Right column — stacked widgets (D-03 order) */}
          <div className="flex flex-col gap-4">
            <MoodOverview moodCounts={moodCounts} />
            <MoodTrends />
            <WritingPrompts />
            <AIInsights />
            <OnThisDay />
          </div>
        </section>
      </div>
    </div>
  );
}
