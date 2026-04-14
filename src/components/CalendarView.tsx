import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  format,
  addMonths,
  subMonths,
  isToday,
  isSameMonth,
  addDays,
  subDays,
} from "date-fns";
import { getDb } from "../lib/db";
import { useViewStore } from "../stores/viewStore";
import { CalendarCell } from "./CalendarCell";

interface DayCountRow {
  day: string;  // "YYYY-MM-DD"
  count: number;
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

function toLocalYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function CalendarView() {
  const setView = useViewStore((s) => s.setView);
  const setDateFilter = useViewStore((s) => s.setDateFilter);

  const [currentMonth, setCurrentMonth] = useState<Date>(() => new Date());
  const [counts, setCounts] = useState<Map<string, number>>(new Map());

  // Fetch entry counts for the visible month using localtime (Pitfall 5)
  const fetchMonthCounts = useCallback(async (monthDate: Date) => {
    const first = startOfMonth(monthDate);
    const last = endOfMonth(monthDate);
    const startYmd = toLocalYmd(first);
    const endYmd = toLocalYmd(last);
    try {
      const db = await getDb();
      const rows = await db.select<DayCountRow[]>(
        `SELECT date(created_at / 1000, 'unixepoch', 'localtime') as day,
                COUNT(*) as count
         FROM entries
         WHERE date(created_at / 1000, 'unixepoch', 'localtime') >= ?
           AND date(created_at / 1000, 'unixepoch', 'localtime') <= ?
         GROUP BY day`,
        [startYmd, endYmd]
      );
      const map = new Map<string, number>();
      for (const r of rows) map.set(r.day, r.count);
      setCounts(map);
    } catch {
      setCounts(new Map());
    }
  }, []);

  useEffect(() => {
    void fetchMonthCounts(currentMonth);
  }, [currentMonth, fetchMonthCounts]);

  // Build the 7-column calendar grid:
  // - leading blanks from previous month (to fill Sunday column offset)
  // - days of current month
  // - trailing blanks from next month (to complete the final row of 7)
  const cells = useMemo(() => {
    const first = startOfMonth(currentMonth);
    const last = endOfMonth(currentMonth);
    const leadingCount = getDay(first); // 0 = Sunday
    const leading: Date[] = [];
    for (let i = leadingCount; i > 0; i--) {
      leading.push(subDays(first, i));
    }
    const inMonth = eachDayOfInterval({ start: first, end: last });
    const total = leading.length + inMonth.length;
    const trailingCount = (7 - (total % 7)) % 7;
    const trailing: Date[] = [];
    for (let i = 1; i <= trailingCount; i++) {
      trailing.push(addDays(last, i));
    }
    return [...leading, ...inMonth, ...trailing];
  }, [currentMonth]);

  const monthLabel = format(currentMonth, "MMMM yyyy");

  const handlePrev = () => setCurrentMonth((m) => subMonths(m, 1));
  const handleNext = () => setCurrentMonth((m) => addMonths(m, 1));
  const handleToday = () => setCurrentMonth(new Date());

  const handleCellClick = (date: Date) => {
    const ymd = toLocalYmd(date);
    setDateFilter(ymd);
    setView("timeline");
  };

  return (
    <div className="h-full overflow-y-auto bg-bg">
      <div className="mx-auto max-w-2xl px-8 py-8">
        {/* Header: prev / month label / next / Today */}
        <div className="mb-8 flex items-center justify-between border-b border-border pb-6">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={handlePrev}
              className="rounded-lg p-2 text-text-secondary hover:text-text hover:bg-surface-secondary transition-colors"
              aria-label="Previous month"
            >
              <ChevronLeft size={20} />
            </button>
            <h1 className="text-2xl font-bold text-text min-w-[200px]">{monthLabel}</h1>
            <button
              type="button"
              onClick={handleNext}
              className="rounded-lg p-2 text-text-secondary hover:text-text hover:bg-surface-secondary transition-colors"
              aria-label="Next month"
            >
              <ChevronRight size={20} />
            </button>
          </div>
          <button
            type="button"
            onClick={handleToday}
            className="rounded-lg px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-secondary hover:text-text transition-colors"
            aria-label="Return to current month"
          >
            Today
          </button>
        </div>

        {/* Day-of-week labels */}
        <div className="grid grid-cols-7 gap-2 pb-4 mb-2">
          {DAY_LABELS.map((label) => (
            <div
              key={label}
              className="text-center text-xs font-semibold text-text-secondary uppercase tracking-wide"
            >
              {label}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-7 gap-2">
          {cells.map((date, idx) => {
            const inMonth = isSameMonth(date, currentMonth);
            const ymd = toLocalYmd(date);
            const count = inMonth ? (counts.get(ymd) ?? 0) : 0;
            return (
              <CalendarCell
                key={`${ymd}-${idx}`}
                date={date}
                count={count}
                inCurrentMonth={inMonth}
                isTodayCell={isToday(date)}
                isSelected={false}
                onClick={() => handleCellClick(date)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
