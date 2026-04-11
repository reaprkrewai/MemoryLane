import { format } from "date-fns";

interface CalendarCellProps {
  date: Date;                 // The cell's date (even if out-of-month)
  count: number;              // Entry count for this date
  inCurrentMonth: boolean;    // False for leading/trailing days from adjacent months
  isTodayCell: boolean;       // True if this cell is today's date
  isSelected: boolean;        // True if dateFilter matches this cell
  onClick: () => void;        // Click handler (no-op when !inCurrentMonth or count === 0? — see action)
}

/**
 * Heatmap intensity class per UI-SPEC "Heatmap Intensity Levels":
 *   0 entries: faint surface + border
 *   1 entry:   whisper amber (amber-100/40 light, amber-900/30 dark)
 *   2-3:       bg-accent/30
 *   4+:        bg-accent/60
 */
function heatmapClass(count: number): string {
  if (count === 0) return "bg-surface border border-border";
  if (count === 1) return "bg-amber-100/40 dark:bg-amber-900/30";
  if (count <= 3) return "bg-accent/30";
  return "bg-accent/60";
}

export function CalendarCell({
  date,
  count,
  inCurrentMonth,
  isTodayCell,
  isSelected,
  onClick,
}: CalendarCellProps) {
  const dayNumber = format(date, "d");

  // Out-of-month days: dim, not clickable (UI-SPEC: "Days from previous/next month: text-muted/40, not clickable")
  if (!inCurrentMonth) {
    return (
      <div
        className="flex min-h-[40px] items-start p-1 text-label text-muted/40 select-none"
        aria-hidden="true"
      >
        {dayNumber}
      </div>
    );
  }

  const intensity = heatmapClass(count);
  const isClickable = count > 0;

  // Selected ring takes precedence; hover ring only when clickable
  const interactiveClasses = isSelected
    ? "ring-2 ring-accent"
    : isClickable
    ? "hover:ring-1 hover:ring-accent/40 cursor-pointer"
    : "cursor-default";

  return (
    <button
      type="button"
      onClick={() => {
        if (isClickable) onClick();
      }}
      disabled={!isClickable}
      className={`flex min-h-[40px] items-start p-1 text-label text-text rounded-md transition-shadow ${intensity} ${interactiveClasses}`}
      aria-label={`${format(date, "MMMM d, yyyy")}, ${count} ${count === 1 ? "entry" : "entries"}`}
      title={count === 0 ? "No entries on this day" : undefined}
    >
      <span
        className={
          isTodayCell
            ? "inline-flex h-5 w-5 items-center justify-center rounded-full bg-accent/20"
            : ""
        }
      >
        {dayNumber}
      </span>
    </button>
  );
}
