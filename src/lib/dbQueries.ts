/**
 * SQL aggregate helpers for dashboard widgets.
 * Pagination-independent — returns true DB counts, not allEntries.length.
 * Streak query reads local_date (FOUND-03) for TZ-safe results.
 */

import { getDb } from "./db";

export interface EntryStats {
  totalEntries: number;
  totalWords: number;
  thisMonth: number;
  totalTags: number;
  dayStreak: number;
}

export async function getEntryStats(): Promise<EntryStats> {
  const db = await getDb();

  // Query 1 — aggregate row covering totals/words/this-month/tag-count.
  // Single round-trip to SQLite; uses scalar subqueries so the engine evaluates each
  // count independently (cheaper than UNION/JOIN tricks at small DB sizes).
  const [agg] = await db.select<Array<{
    total: number;
    words: number;
    this_month: number;
    total_tags: number;
  }>>(`
    SELECT
      (SELECT COUNT(*) FROM entries)                                              AS total,
      (SELECT COALESCE(SUM(word_count), 0) FROM entries)                          AS words,
      (SELECT COUNT(*) FROM entries
         WHERE created_at >= (unixepoch('now', 'start of month') * 1000))         AS this_month,
      (SELECT COUNT(*) FROM tags)                                                 AS total_tags
  `);

  // Query 2 — distinct local_date strings, descending. Bounded at 365 to cap iteration cost.
  // Reads local_date (FOUND-03 column) — never reformat created_at in JS for streak math (D-07).
  const dateRows = await db.select<Array<{ local_date: string }>>(
    "SELECT DISTINCT local_date FROM entries WHERE local_date IS NOT NULL ORDER BY local_date DESC LIMIT 365"
  );
  const dateSet = new Set(dateRows.map((r) => r.local_date));

  // Walk back from "today" in user's local TZ, counting consecutive days that have entries.
  // Algorithm preserved from OverviewView.calculateDayStreak; only the date-source changes.
  // toLocaleDateString("en-CA") returns YYYY-MM-DD in the user's local timezone (D-11 convention).
  let dayStreak = 0;
  const cursor = new Date();
  while (dateSet.has(cursor.toLocaleDateString("en-CA"))) {
    dayStreak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return {
    totalEntries: agg.total,
    totalWords: agg.words,
    thisMonth: agg.this_month,
    totalTags: agg.total_tags,
    dayStreak,
  };
}
