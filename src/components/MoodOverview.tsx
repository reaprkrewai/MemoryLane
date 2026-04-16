interface MoodOverviewProps {
  moodCounts?: Record<string, number>;
}

/**
 * Mood constellation — small arc of dots representing the 5 moods,
 * with ring weight indicating frequency. Empty state shows the constellation
 * faintly with a poetic prompt.
 *
 * Mood order: awful → bad → okay → good → great (left to right, low to high)
 */
export function MoodOverview({ moodCounts = {} }: MoodOverviewProps) {
  const MOODS = [
    { key: "awful", color: "#FF7A7A" },
    { key: "bad", color: "#F5A623" },
    { key: "okay", color: "#B4A6FF" },
    { key: "good", color: "#5EA2FF" },
    { key: "great", color: "#4ADE9B" },
  ] as const;

  const total = Object.values(moodCounts).reduce((sum, n) => sum + n, 0);
  const isEmpty = total === 0;

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <div className="mb-5 flex items-baseline justify-between">
        <h3 className="font-display text-lg font-semibold text-[var(--color-text)]">
          Mood overview
        </h3>
        {!isEmpty && (
          <span className="text-small-caps text-[10px] text-[var(--color-text-muted)]">
            last 30 days
          </span>
        )}
      </div>

      {/* Constellation */}
      <div className="flex items-end justify-between gap-2 px-2 py-4">
        {MOODS.map((mood) => {
          const count = moodCounts[mood.key] ?? 0;
          const intensity = total === 0 ? 0 : count / total;
          // Ring scale: 0 intensity = 8px dot, full = 32px ring
          const size = isEmpty ? 10 : 10 + Math.round(intensity * 28);
          const opacity = isEmpty ? 0.25 : 0.5 + intensity * 0.5;

          return (
            <div
              key={mood.key}
              className="flex flex-1 flex-col items-center gap-2"
              title={`${mood.key}: ${count}`}
            >
              <div
                className="rounded-full transition-all duration-500"
                style={{
                  width: `${size}px`,
                  height: `${size}px`,
                  background: `radial-gradient(circle, ${mood.color} 0%, ${mood.color}00 70%)`,
                  opacity,
                  boxShadow: isEmpty ? "none" : `0 0 16px -4px ${mood.color}`,
                }}
              />
              <span className="font-display-italic text-[11px] text-[var(--color-text-muted)]">
                {mood.key}
              </span>
            </div>
          );
        })}
      </div>

      {isEmpty && (
        <p className="mt-3 text-center text-xs leading-relaxed text-[var(--color-text-muted)]">
          Your mood story unfolds here
          <br />
          <span className="font-display-italic">as entries are written</span>
        </p>
      )}
    </div>
  );
}
