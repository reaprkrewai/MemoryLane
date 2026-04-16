import { Feather } from "lucide-react";

interface QuickWriteFABProps {
  onClick: () => void;
}

export function QuickWriteFAB({ onClick }: QuickWriteFABProps) {
  return (
    <button
      onClick={onClick}
      className="group fixed bottom-8 right-8 z-40 flex items-center gap-2.5 overflow-hidden rounded-full pl-5 pr-6 py-3.5 text-sm font-medium text-white shadow-[0_8px_32px_rgba(124,109,255,0.4)] transition-all duration-300 hover:shadow-[0_12px_40px_rgba(124,109,255,0.55)] hover:-translate-y-0.5 active:translate-y-0"
      style={{
        background:
          "linear-gradient(135deg, var(--color-primary-glow) 0%, var(--color-primary) 60%, #6B5FDE 100%)",
      }}
      aria-label="Quick write new entry"
    >
      {/* Shimmer overlay on hover */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-1000 group-hover:translate-x-full"
      />

      <Feather
        size={16}
        strokeWidth={2}
        className="relative transition-transform duration-300 group-hover:-rotate-12"
      />
      <span className="relative tracking-tight">Quick Write</span>
    </button>
  );
}
