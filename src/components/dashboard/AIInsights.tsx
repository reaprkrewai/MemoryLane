// TODO(Plan 04): replace stub body with insightService-driven summary + Refresh button
// per UI-SPEC §8 + PATTERNS.md lines 413-490. Must read cache on mount, gate on aiStore.available,
// and render via React children (NOT dangerouslySetInnerHTML — XSS hardening T-08-04-02).
export function AIInsights() {
  return (
    <div
      className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5"
      data-onboarding="ai-insights"
    >
      <div className="mb-5 flex items-baseline justify-between">
        <h3 className="font-display text-lg font-semibold text-[var(--color-text)]">Weekly insight</h3>
      </div>
      <div
        className="h-3 w-full rounded bg-[var(--color-surface-secondary)] opacity-30"
        aria-hidden="true"
      />
    </div>
  );
}
