/**
 * Async embedding generation service.
 * Triggered on entry save, runs fire-and-forget in background.
 * Gracefully handles Ollama unavailable — returns early without error.
 */

import { getDb } from "../lib/db";
import {
  checkOllamaHealth,
  generateEmbedding,
} from "../lib/ollamaService";

/**
 * Generate embedding for entry content and store in database.
 * Fire-and-forget — caller does NOT await this.
 * Returns Promise<void> for consistency, but errors are logged and ignored.
 *
 * Flow:
 * 1. Check if Ollama + embedding model available
 * 2. If not, return early (graceful degradation)
 * 3. Generate embedding via Ollama API
 * 4. Store vector in embeddings table as Float32Array
 * 5. Log warnings on error, continue (no UI impact)
 */
export async function generateEmbeddingAsync(
  entryId: string,
  content: string
): Promise<void> {
  try {
    // Check if Ollama available
    const health = await checkOllamaHealth();
    if (!health.available || !health.embedding) {
      // Ollama not running or embedding model not available — graceful degradation
      return;
    }

    // Generate embedding
    const vector = await generateEmbedding(content);

    // Store in DB as Float32Array binary buffer
    const float32Vector = new Float32Array(vector);
    const vectorBuffer = Buffer.from(float32Vector.buffer);

    const db = await getDb();
    await db.execute(
      `INSERT OR REPLACE INTO embeddings
       (entry_id, model, dimensions, vector, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [
        entryId,
        "nomic-embed-text",
        768, // nomic-embed-text output dimension
        vectorBuffer,
        Date.now(),
      ]
    );
  } catch (err) {
    // Log warning but don't crash or propagate error
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[AI] Failed to generate embedding for entry ${entryId}: ${message}`);
  }
}

/**
 * Check if embedding exists for entry.
 * Returns true if embedding row exists with nomic-embed-text model.
 */
export async function embeddingExists(entryId: string): Promise<boolean> {
  try {
    const db = await getDb();
    const rows = await db.select<{ count: number }[]>(
      `SELECT COUNT(*) as count FROM embeddings
       WHERE entry_id = ? AND model = 'nomic-embed-text'`,
      [entryId]
    );
    return rows.length > 0 && rows[0].count >= 1;
  } catch (err) {
    // On error, assume no embedding exists
    return false;
  }
}
