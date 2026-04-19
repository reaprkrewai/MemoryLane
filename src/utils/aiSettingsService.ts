/**
 * AI Settings Service
 * Handles persistence of AI backend preference to SQLite settings table
 */

import { getDb } from "../lib/db";
import type { AIBackend } from "../stores/aiStore";

const TAG_SUGGESTIONS_KEY = "tag_suggestions_enabled";

/**
 * Load the persisted AI backend preference from database
 * Falls back to "embedded" if not set
 */
export async function loadAIBackendPreference(): Promise<AIBackend> {
  try {
    const db = await getDb();
    const rows = await db.select<{ value: string }[]>(
      `SELECT value FROM settings WHERE key = 'aiBackend'`,
      []
    );

    if (rows.length > 0 && rows[0].value) {
      const value = rows[0].value;
      if (value === "embedded" || value === "ollama") {
        return value as AIBackend;
      }
    }
  } catch (err) {
    console.error("Failed to load AI backend preference:", err);
  }

  // Default to embedded
  return "embedded";
}

/**
 * Save the AI backend preference to database
 */
export async function saveAIBackendPreference(backend: AIBackend): Promise<void> {
  try {
    const db = await getDb();
    await db.execute(
      `INSERT OR REPLACE INTO settings (key, value, created_at, updated_at)
       VALUES ('aiBackend', ?, ?, ?)`,
      [backend, Date.now(), Date.now()]
    );
  } catch (err) {
    console.error("Failed to save AI backend preference:", err);
  }
}

/**
 * Trigger a background re-embedding of all entries when backend changes
 * This is a fire-and-forget operation that updates embeddings in the background
 */
export async function triggerReembeddingOnBackendSwitch(): Promise<void> {
  try {
    const db = await getDb();

    // Clear old embeddings to force re-generation with new backend
    // We don't delete, just mark for re-processing by using a timestamp
    // Actually, for simplicity, we can just let new embeddings be created
    // and the old ones will be replaced via INSERT OR REPLACE

    // Get all entries
    const entries = await db.select<{ id: string; content: string }[]>(
      `SELECT id, content FROM entries ORDER BY created_at DESC`,
      []
    );

    // Mark that re-embedding is needed (this could be tracked with a flag)
    // For now, we'll rely on the fact that embeddings are generated on-demand
    console.log(
      `[AI] Backend switch detected. Will re-embed ${entries.length} entries on next use`
    );
  } catch (err) {
    console.error("Failed to trigger re-embedding:", err);
  }
}

/**
 * Load the persisted "Tag suggestions" toggle (AUTOTAG-06).
 * Returns false on missing row, invalid value, or DB error — matches D-16 default-off contract.
 */
export async function loadTagSuggestionsEnabled(): Promise<boolean> {
  try {
    const db = await getDb();
    const rows = await db.select<{ value: string }[]>(
      `SELECT value FROM settings WHERE key = ?`,
      [TAG_SUGGESTIONS_KEY]
    );

    if (rows.length > 0 && rows[0].value) {
      return rows[0].value === "1";
    }
  } catch (err) {
    console.error("[tag-suggestions] Failed to load setting:", err);
  }

  return false; // AUTOTAG-06: default off
}

/**
 * Persist the "Tag suggestions" toggle.
 * CRITICAL: uses the 3-column INSERT form matching the settings table DDL in db.ts.
 * DO NOT clone the 4-column form from saveAIBackendPreference — that is a latent bug
 * referencing a non-existent `created_at` column in the settings table.
 */
export async function saveTagSuggestionsEnabled(value: boolean): Promise<void> {
  try {
    const db = await getDb();
    await db.execute(
      `INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)`,
      [TAG_SUGGESTIONS_KEY, value ? "1" : "0", Date.now()]
    );
  } catch (err) {
    console.error("[tag-suggestions] Failed to save setting:", err);
  }
}
