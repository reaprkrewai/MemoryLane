import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { RefreshCw, Sparkles } from "lucide-react";
import { useAIStore } from "../../stores/aiStore";
import {
  readInsightCache,
  generateWeeklySummary,
} from "../../utils/insightService";

export function AIInsights() {
  // Gating primitive per D-18 — silent no-op path depends on this.
  const available = useAIStore((s) => s.available);

  const [text, setText] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [notEnough, setNotEnough] = useState(false);

  // Read cache on mount. D-17: do NOT auto-generate — wait for explicit Refresh click.
  useEffect(() => {
    let cancelled = false;
    readInsightCache()
      .then((cache) => {
        if (cancelled) return;
        setText(cache.text);
        setGeneratedAt(cache.generatedAt);
      })
      .catch((err) => {
        // Cache read failure is non-fatal — component renders empty state.
        // Per D-18: no toast, no dialog on AI-path errors.
        console.error("[AIInsights] readInsightCache failed:", err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleRefresh = async () => {
    // D-18 silent no-op when Ollama is down — no toast, no dialog.
    if (!available) return;
    if (isGenerating) return;

    setIsGenerating(true);
    setNotEnough(false);
    try {
      const summary = await generateWeeklySummary();
      setText(summary);
      setGeneratedAt(Date.now());
    } catch (err: unknown) {
      const isNotEnough =
        err instanceof Error && err.message === "NOT_ENOUGH_ENTRIES";
      if (isNotEnough) {
        setText(null);
        setNotEnough(true);
      } else {
        // D-18: silent graceful fallback — log to console only
        console.error("[AIInsights] generateWeeklySummary failed:", err);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const relativeTime =
    generatedAt !== null
      ? formatDistanceToNow(new Date(generatedAt), { addSuffix: true })
      : null;

  return (
    <div
      className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5"
      data-onboarding="ai-insights"
    >
      <div className="mb-5 flex items-baseline justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-display text-lg font-semibold text-[var(--color-text)]">
            Weekly insight
          </h3>
          <Sparkles
            size={16}
            strokeWidth={1.75}
            className="text-[var(--color-text-muted)]"
            aria-hidden="true"
          />
        </div>
        {/* Refresh button ALWAYS visible per DASH-14 — even when unavailable. */}
        <button
          type="button"
          onClick={() => void handleRefresh()}
          disabled={isGenerating}
          className="group flex items-center gap-1 text-xs text-[var(--color-primary)] transition-colors hover:text-[var(--color-primary-glow)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw
            size={12}
            className={isGenerating ? "animate-spin" : ""}
            aria-hidden="true"
          />
          Refresh insight
        </button>
      </div>

      {isGenerating ? (
        <div aria-live="polite">
          <div className="h-3 w-full animate-pulse rounded bg-[var(--color-surface-secondary)]" />
          <div className="mt-2 h-3 w-4/5 animate-pulse rounded bg-[var(--color-surface-secondary)]" />
          <p className="mt-3 text-xs text-[var(--color-text-muted)]">Generating…</p>
        </div>
      ) : !available ? (
        <div className="flex flex-col items-center py-4 text-center">
          <Sparkles
            size={32}
            strokeWidth={1.25}
            className="mb-3 text-[var(--color-text-muted)] opacity-40"
            aria-hidden="true"
          />
          <p className="text-sm text-[var(--color-text-secondary)]">Insight unavailable</p>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            Start Ollama to generate your weekly summary.
          </p>
        </div>
      ) : notEnough ? (
        <div className="flex flex-col items-center py-4 text-center">
          <p className="text-sm text-[var(--color-text-secondary)]">Not enough entries yet</p>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            Keep writing — your first weekly insight arrives after a few entries.
          </p>
        </div>
      ) : text ? (
        <div>
          <p className="text-sm leading-relaxed text-[var(--color-text)]">{text}</p>
          {relativeTime && (
            <p className="mt-2 text-xs text-[var(--color-text-muted)]">
              Generated {relativeTime}
            </p>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center py-4 text-center">
          <p className="text-sm text-[var(--color-text-secondary)]">No summary yet</p>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            Click Refresh insight to generate your weekly insight.
          </p>
        </div>
      )}
    </div>
  );
}
