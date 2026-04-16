import type { LucideIcon } from "lucide-react";

export type StatVariant = "blue" | "violet" | "amber" | "emerald";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: number | string;
  variant: StatVariant;
  suffix?: string;
}

const variantStyles: Record<StatVariant, { bg: string; fg: string; glow: string }> = {
  blue: {
    bg: "bg-[var(--stat-blue-soft)]",
    fg: "text-[var(--stat-blue)]",
    glow: "shadow-[0_0_24px_-12px_var(--stat-blue)]",
  },
  violet: {
    bg: "bg-[var(--stat-violet-soft)]",
    fg: "text-[var(--stat-violet)]",
    glow: "shadow-[0_0_24px_-12px_var(--stat-violet)]",
  },
  amber: {
    bg: "bg-[var(--stat-amber-soft)]",
    fg: "text-[var(--stat-amber)]",
    glow: "shadow-[0_0_24px_-12px_var(--stat-amber)]",
  },
  emerald: {
    bg: "bg-[var(--stat-emerald-soft)]",
    fg: "text-[var(--stat-emerald)]",
    glow: "shadow-[0_0_24px_-12px_var(--stat-emerald)]",
  },
};

export function StatCard({ icon: Icon, label, value, variant, suffix }: StatCardProps) {
  const v = variantStyles[variant];

  return (
    <div
      className="group relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition-all duration-300 hover:border-[var(--color-border-subtle)] hover:bg-[var(--color-surface-secondary)]"
    >
      {/* Icon tile */}
      <div className="mb-4 flex items-start justify-between">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${v.bg} ${v.fg} transition-transform duration-300 group-hover:scale-110 group-hover:${v.glow}`}
        >
          <Icon size={20} strokeWidth={2} />
        </div>
      </div>

      {/* Value + label */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline gap-1">
          <span className="font-display font-tabular text-[44px] leading-none tracking-tight text-[var(--color-text)]">
            {value}
          </span>
          {suffix && (
            <span className="font-display text-lg text-[var(--color-text-muted)]">
              {suffix}
            </span>
          )}
        </div>
        <span className="text-small-caps text-[11px] text-[var(--color-text-muted)]">
          {label}
        </span>
      </div>

      {/* Subtle decorative corner — editorial detail */}
      <div
        aria-hidden
        className={`pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100 ${v.bg}`}
      />
    </div>
  );
}
