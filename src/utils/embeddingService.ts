/**
 * Async embedding generation service.
 * Triggered on entry save, runs fire-and-forget in background.
 * Gracefully handles AI unavailable — returns early without error.
 * Supports both embedded and Ollama backends.
 */

import { getDb } from "../lib/db";
import * as hybridAI from "../lib/hybridAIService";
import { useAIStore } from "../stores/aiStore";

// Model name and dimensions mapping
const MODEL_DIMS: Record<string, number> = {
  "nomic-embed-text": 768,
  "phi3-mini-q4": 3072, // Phi-3 embeddings dimension
};

/**
 * Get the active model name and dimensions based on current backend
 */
function getActiveModelInfo(): { name: string; dims: number } {
  const backend = useAIStore.getState().aiBackend;

  if (backend === "embedded") {
    return { name: "phi3-mini-q4", dims: MODEL_DIMS["phi3-mini-q4"] };
  } else {
    return { name: "nomic-embed-text", dims: MODEL_DIMS["nomic-embed-text"] };
  }
}

/**
 * Generate embedding for entry content and store in database.
 * Fire-and-forget — caller does NOT await this.
 * Returns Promise<void> for consistency, but errors are logged and ignored.
 *
 * Flow:
 * 1. Check if active AI backend + embedding model available
 * 2. If not, return early (graceful degradation)
 * 3. Generate embedding via hybrid AI service
 * 4. Store vector in embeddings table as Float32Array
 * 5. Log warnings on error, continue (no UI impact)
 */
export async function generateEmbeddingAsync(
  entryId: string,
  content: string
): Promise<void> {
  try {
    // Check if AI available
    const health = await hybridAI.checkAIHealth();
    if (!health.available || !health.embedding) {
      // AI not running or embedding model not available — graceful degradation
      return;
    }

    // Generate embedding
    const vector = await hybridAI.generateEmbedding(content);

    // Get model info for current backend
    const { name: modelName, dims: dimensions } = getActiveModelInfo();

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
        modelName,
        dimensions,
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
 * Check if embedding exists for entry in any model.
 * Returns true if at least one embedding row exists.
 */
export async function embeddingExists(entryId: string): Promise<boolean> {
  try {
    const db = await getDb();
    const rows = await db.select<{ count: number }[]>(
      `SELECT COUNT(*) as count FROM embeddings
       WHERE entry_id = ?`,
      [entryId]
    );
    return rows.length > 0 && rows[0].count >= 1;
  } catch (err) {
    // On error, assume no embedding exists
    return false;
  }
}

/**
 * Get embeddings for the current active model.
 * Filters by the model name matching the current backend.
 */
export async function getEmbeddingsForCurrentModel(
  entryId: string
): Promise<Float32Array | null> {
  try {
    const { name: modelName } = getActiveModelInfo();
    const db = await getDb();
    const rows = await db.select<{ vector: ArrayBuffer }[]>(
      `SELECT vector FROM embeddings
       WHERE entry_id = ? AND model = ?`,
      [entryId, modelName]
    );

    if (rows.length === 0) return null;

    return new Float32Array(rows[0].vector);
  } catch (err) {
    return null;
  }
}
