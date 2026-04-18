import { useMemo, useState } from "react";
import { getDayOfYear } from "date-fns";
import { ArrowRight, Lightbulb } from "lucide-react";
import PROMPTS from "../../lib/writingPrompts";

export function WritingPrompts() {
  // D-14: offset is local component state — resets on unmount, no persistence.
  const [offset, setOffset] = useState<number>(0);

  // D-13: today's index is getDayOfYear(new Date()) % PROMPTS.length.
  // useMemo with empty deps captures once per mount — midnight crossing is a
  // documented Pitfall 4 accepted as out-of-scope for Phase 8.
  const todayIndex = useMemo(() => getDayOfYear(new Date()), []);

  const displayIndex = (todayIndex + offset) % PROMPTS.length;
  const prompt = PROMPTS[displayIndex];

  return (
    <div
      className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5"
      data-onboarding="writing-prompts"
    >
      <div className="mb-5 flex items-baseline justify-between">
        <h3 className="font-display text-lg font-semibold text-[var(--color-text)]">
          Today's prompt
        </h3>
        <Lightbulb
          size={16}
          strokeWidth={1.75}
          className="text-[var(--color-text-muted)]"
          aria-hidden="true"
        />
      </div>

      <p className="border-l-2 border-[var(--color-primary)] py-3 pl-3 text-sm italic leading-relaxed text-[var(--color-text-secondary)]">
        {prompt}
      </p>

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={() => setOffset((prev) => prev + 1)}
          className="group flex items-center gap-1 text-xs text-[var(--color-primary)] transition-colors hover:text-[var(--color-primary-glow)]"
        >
          Another prompt
          <ArrowRight
            size={12}
            className="transition-transform duration-200 group-hover:translate-x-0.5"
          />
        </button>
      </div>
    </div>
  );
}
