import { format } from "date-fns";

interface DaySeparatorProps {
  date: Date;
}

export function DaySeparator({ date }: DaySeparatorProps) {
  // Per D-07 and UI-SPEC: "Wednesday, Apr 9" label + hr to right edge, my-3 (12px)
  const label = format(date, "EEEE, MMM d");
  return (
    <div className="my-3 flex items-center gap-3">
      <span className="text-label font-semibold text-muted whitespace-nowrap">
        {label}
      </span>
      <hr className="flex-1 border-t border-border" />
    </div>
  );
}
