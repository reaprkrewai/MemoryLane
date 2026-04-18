import { useMemo } from "react";
import { subDays } from "date-fns";
import { useEntryStore } from "../../stores/entryStore";

// Mood palette copied verbatim from MoodOverview.tsx — single source of truth
// is MoodOverview for visual color choices; do not re-derive.
const MOODS = [
  { key: "awful", color: "#FF7A7A" },
  { key: "bad",   color: "#F5A623" },
  { key: "okay",  color: "#B4A6FF" },
  { key: "good",  color: "#5EA2FF" },
  { key: "great", color: "#4ADE9B" },
] as const;

type MoodKey = typeof MOODS[number]["key"];
const MOOD_KEY_SET = new Set<string>(MOODS.map((m) => m.key));

const DAYS = 30;
const BAR_HEIGHT = 80;       // SVG viewport height
const COL_WIDTH = 8;         // per-column width in SVG units
const SVG_WIDTH = DAYS * COL_WIDTH;

export function MoodTrends() {
  // D-08 approved exception: MoodTrends is the only new widget that subscribes
  // to allEntries. Bounded by useMemo([allEntries]) so the 30-day bucketing
  // recomputes only when allEntries identity changes (stable across renders
  // triggered by other primitives like dayStreak, totalEntries, etc.).
  const allEntries = useEntryStore((s) => s.allEntries);
  const isLoadingPage = useEntryStore((s) => s.isLoadingPage);
  const totalEntries = useEntryStore((s) => s.totalEntries);

  const dayBuckets = useMemo(() => {
    const cutoff = subDays(new Date(), DAYS).getTime();
    const today = new Date();
    const todayMs = today.getTime();
    const buckets: Array<Partial<Record<MoodKey, number>>> = Array.from(
      { length: DAYS },
      () => ({})
    );
    for (const e of allEntries) {
      if (!e.mood || !MOOD_KEY_SET.has(e.mood)) continue;
      if (e.created_at < cutoff) continue;
      const daysAgo = Math.floor((todayMs - e.created_at) / 86400000);
      if (daysAgo < 0 || daysAgo >= DAYS) continue;
      const colIndex = DAYS - 1 - daysAgo; // rightmost = today
      const mood = e.mood as MoodKey;
      buckets[colIndex][mood] = (buckets[colIndex][mood] ?? 0) + 1;
    }
    return buckets;
  }, [allEntries]);

  const hasAnyMood = useMemo(
    () => dayBuckets.some((b) => Object.keys(b).length > 0),
    [dayBuckets]
  );

  const showSkeleton = isLoadingPage && allEntries.length === 0 && totalEntries === 0;

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <div className="mb-5 flex items-baseline justify-between">
        <h3 className="font-display text-lg font-semibold text-[var(--color-text)]">
          Mood trends
        </h3>
        <span className="text-small-caps text-[10px] text-[var(--color-text-muted)]">
          last 30 days
        </span>
      </div>

      {showSkeleton ? (
        <div
          className="h-20 w-full rounded bg-[var(--color-surface-secondary)] opacity-30"
          aria-hidden="true"
        />
      ) : !hasAnyMood ? (
        <>
          <svg
            role="img"
            aria-label="Mood trends empty — last 30 days"
            viewBox={`0 0 ${SVG_WIDTH} ${BAR_HEIGHT}`}
            preserveAspectRatio="none"
            className="h-20 w-full"
          >
            {Array.from({ length: DAYS }, (_, i) => (
              <rect
                key={i}
                x={i * COL_WIDTH}
                y={BAR_HEIGHT - 6}
                width={COL_WIDTH - 1}
                height={6}
                fill="var(--color-border-subtle)"
                opacity={0.3}
              />
            ))}
          </svg>
          <p className="mt-3 text-center text-xs leading-relaxed text-[var(--color-text-muted)]">
            Your mood story unfolds here
          </p>
        </>
      ) : (
        <>
          <svg
            role="img"
            aria-label="Mood trends — daily distribution over the last 30 days"
            viewBox={`0 0 ${SVG_WIDTH} ${BAR_HEIGHT}`}
            preserveAspectRatio="none"
            className="h-20 w-full"
          >
            {dayBuckets.map((bucket, colIdx) => {
              const total = Object.values(bucket).reduce((s, n) => s + (n ?? 0), 0);
              if (total === 0) {
                return (
                  <rect
                    key={`empty-${colIdx}`}
                    x={colIdx * COL_WIDTH}
                    y={BAR_HEIGHT - 4}
                    width={COL_WIDTH - 1}
                    height={4}
                    fill="var(--color-border-subtle)"
                    opacity={0.3}
                  />
                );
              }
              let yOffset = 0;
              return MOODS.map((mood) => {
                const count = bucket[mood.key] ?? 0;
                if (count === 0) return null;
                const segHeight = (count / total) * BAR_HEIGHT;
                const rectY = BAR_HEIGHT - yOffset - segHeight;
                yOffset += segHeight;
                return (
                  <rect
                    key={`${colIdx}-${mood.key}`}
                    x={colIdx * COL_WIDTH}
                    y={rectY}
                    width={COL_WIDTH - 1}
                    height={segHeight}
                    fill={mood.color}
                    opacity={0.8}
                  />
                );
              });
            })}
          </svg>
          <div className="mt-3 flex items-center justify-between">
            {MOODS.map((mood) => (
              <div key={mood.key} className="flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: mood.color, opacity: 0.8 }}
                />
                <span className="font-display-italic text-[10px] text-[var(--color-text-muted)]">
                  {mood.key}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
