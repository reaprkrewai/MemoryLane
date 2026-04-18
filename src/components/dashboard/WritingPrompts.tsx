// TODO(Plan 03): replace stub body with day_of_year deterministic prompt display
// + "Another prompt" offset cycling per UI-SPEC §7 + PATTERNS.md lines 368-409.
export function WritingPrompts() {
  return (
    <div
      className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5"
      data-onboarding="writing-prompts"
    >
      <div className="mb-5 flex items-baseline justify-between">
        <h3 className="font-display text-lg font-semibold text-[var(--color-text)]">Today's prompt</h3>
      </div>
      <div
        className="h-4 w-full animate-pulse rounded bg-[var(--color-surface-secondary)]"
        aria-hidden="true"
      />
    </div>
  );
}
