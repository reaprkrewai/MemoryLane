import { format } from "date-fns";

interface DaySeparatorProps {
  date: Date;
}

export function DaySeparator({ date }: DaySeparatorProps) {
  // Premium day separator with better spacing and typography
  const label = format(date, "EEEE, MMM d");
  return (
    <div className="my-6 flex items-center gap-4">
      <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider whitespace-nowrap">
        {label}
      </span>
      <hr className="flex-1 border-t border-border" />
    </div>
  );
}
