/**
 * AI Insights Service (DASH-12, DASH-13, DASH-14)
 *
 * Owns the 7-day SQL read, the `hybridAIService.askQuestion` LLM call, and the
 * `settings` KV cache read/write for the Weekly Insight widget.
 *
 * Design notes:
 * - Pagination-independent SQL read — queries the DB directly, never the store (FOUND-02 contract).
 * - LLM call routed through hybridAIService — Phase 10 AUTOTAG-02 copies this pattern
 *   for tagSuggestionService.ts; always route through hybridAIService.
 * - Settings KV write uses the 3-column INSERT signature matching the settings table
 *   DDL in db.ts (line 79-83). The 4-column form in aiSettingsService.ts is a latent
 *   bug — see 08-PATTERNS.md "Critical Schema Finding".
 */

import { getDb } from "../lib/db";
import * as hybridAI from "../lib/hybridAIService";

export interface InsightCache {
  text: string | null;
  generatedAt: number | null;
}

const KEY_TEXT = "ai_insight_text";
const KEY_AT = "ai_insight_generated_at";
const SEVEN_DAYS_MS = 7 * 86400 * 1000;

const SUMMARY_PROMPT =
  "Summarize the emotional and thematic arc of the last 7 days of journal entries " +
  "in 2-3 sentences. Keep it warm, specific, and grounded in what was actually written. " +
  "Do not invent details.";

export async function readInsightCache(): Promise<InsightCache> {
  const db = await getDb();
  const rows = await db.select<Array<{ key: string; value: string }>>(
    "SELECT key, value FROM settings WHERE key IN (?, ?)",
    [KEY_TEXT, KEY_AT]
  );
  const map: Record<string, string> = {};
  for (const r of rows) map[r.key] = r.value;

  const text = map[KEY_TEXT] ?? null;
  const generatedAt = map[KEY_AT] ? parseInt(map[KEY_AT], 10) : null;

  return {
    text,
    generatedAt: Number.isFinite(generatedAt) ? (generatedAt as number) : null,
  };
}

/**
 * Generate a new weekly summary by querying the last 7 days of entries and
 * routing through hybridAIService. Writes the result to the settings KV table.
 *
 * Throws Error("NOT_ENOUGH_ENTRIES") when zero entries exist in the 7-day window —
 * caller (AIInsights widget) handles this by rendering a friendly empty state,
 * NOT an error toast (D-18 graceful-fallback convention).
 */
export async function generateWeeklySummary(): Promise<string> {
  const db = await getDb();

  // Direct DB query — pagination-independent, never reads from the Zustand store (FOUND-02 contract).
  const cutoff = Date.now() - SEVEN_DAYS_MS;
  const rows = await db.select<Array<{ content: string }>>(
    "SELECT content FROM entries WHERE created_at >= ? ORDER BY created_at DESC",
    [cutoff]
  );

  if (rows.length === 0) {
    throw new Error("NOT_ENOUGH_ENTRIES");
  }

  const context = rows.map((r) => r.content).join("\n\n---\n\n");

  // Route through hybridAIService — Phase 10 AUTOTAG-02 will copy this routing contract.
  const { answer } = await hybridAI.askQuestion(SUMMARY_PROMPT, context);

  // Write both rows with the 3-column INSERT form (matches settings DDL line 79-83).
  // Two separate writes — acceptable per Pitfall 7 (stale cache on partial failure
  // is low-severity: user re-clicks Refresh).
  const now = Date.now();
  await db.execute(
    "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)",
    [KEY_TEXT, answer, now]
  );
  await db.execute(
    "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)",
    [KEY_AT, String(now), now]
  );

  return answer;
}
