// TODO(Plan 03): replace stub body with 30-day stacked-bar SVG chart
// per UI-SPEC §3 "MoodTrends" + PATTERNS.md lines 286-365.
export function MoodTrends() {
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <div className="mb-5 flex items-baseline justify-between">
        <h3 className="font-display text-lg font-semibold text-[var(--color-text)]">Mood trends</h3>
        <span className="text-small-caps text-[10px] text-[var(--color-text-muted)]">last 30 days</span>
      </div>
      <div
        className="h-20 w-full rounded bg-[var(--color-surface-secondary)] opacity-30"
        aria-hidden="true"
      />
    </div>
  );
}
