/**
 * Vector search service for semantic similarity matching.
 *
 * Uses cosine similarity on normalized vectors to find entries by semantic meaning.
 * Falls back to keyword search if Ollama is unavailable.
 */

import { getDb } from "../lib/db";
import * as hybridAI from "../lib/hybridAIService";
import { useAIStore } from "../stores/aiStore";

interface SearchEntry {
  id: string;
  content: string;
  mood: string | null;
  word_count: number;
  created_at: number;
  updated_at: number;
  metadata: string;
}

interface VectorSearchOptions {
  dateRange?: {
    start: number; // ms epoch
    end: number;   // ms epoch
  };
  tags?: string[];
  moods?: string[];
  limit?: number;
}

interface EmbeddingRow {
  id: string;
  content: string;
  mood: string | null;
  word_count: number;
  created_at: number;
  updated_at: number;
  metadata: string;
  vector: ArrayBuffer;
}

interface ScoredResult {
  entry: SearchEntry;
  similarity: number;
}

/**
 * Compute L2 norm (Euclidean magnitude) of a vector.
 * magnitude = sqrt(sum(v_i^2))
 */
function computeMagnitude(vector: number[]): number {
  const sumSquares = vector.reduce((sum, v) => sum + v * v, 0);
  return Math.sqrt(sumSquares);
}

/**
 * Normalize a vector to unit length using L2 normalization.
 * normalized[i] = v[i] / magnitude
 *
 * Handles zero-magnitude vectors by returning them as-is.
 */
export function normalizeVector(vector: number[]): number[] {
  const magnitude = computeMagnitude(vector);

  // Zero vector edge case: return as-is
  if (magnitude === 0) {
    return vector;
  }

  return vector.map(v => v / magnitude);
}

/**
 * Compute cosine similarity between two normalized vectors.
 * cosine_similarity = sum(v1[i] * v2[i])
 *
 * Assumes both vectors are already normalized (L2 norm = 1).
 * Range: [-1, 1] where 1 = identical direction, 0 = orthogonal, -1 = opposite.
 */
export function cosineSimilarity(v1: number[], v2: number[]): number {
  if (v1.length !== v2.length) {
    throw new Error("Vector dimensions must match");
  }

  return v1.reduce((sum, a, i) => sum + a * v2[i], 0);
}

/**
 * Deserialize a vector from a BLOB (Float32Array binary buffer).
 */
function deserializeVector(blob: ArrayBuffer): number[] {
  const view = new Float32Array(blob);
  return Array.from(view);
}

/**
 * Build a SQL WHERE clause from metadata filters.
 * Returns { clause: string, params: any[] }
 */
function buildMetadataFilter(
  dateRange?: VectorSearchOptions["dateRange"],
  tags?: string[],
  moods?: string[]
): { clause: string; params: unknown[] } {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (dateRange) {
    conditions.push("e.created_at >= ?");
    params.push(dateRange.start);
    conditions.push("e.created_at < ?");
    params.push(dateRange.end);
  }

  if (moods && moods.length > 0) {
    const placeholders = moods.map(() => "?").join(", ");
    conditions.push(`e.mood IN (${placeholders})`);
    params.push(...moods);
  }

  if (tags && tags.length > 0) {
    const placeholders = tags.map(() => "?").join(", ");
    // AND semantics: all selected tags must be present
    conditions.push(
      `e.id IN (SELECT entry_id FROM entry_tags WHERE tag_id IN (${placeholders}) GROUP BY entry_id HAVING COUNT(DISTINCT tag_id) = ?)`
    );
    params.push(...tags, tags.length);
  }

  const clause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  return { clause, params };
}

/**
 * Fallback to keyword search from Phase 4.
 * This is called when Ollama is unavailable.
 */
async function keywordSearchFallback(
  query: string,
  options?: VectorSearchOptions
): Promise<SearchEntry[]> {
  const db = await getDb();

  // Phrase-wrap FTS5 query to prevent special char errors
  const ftsQuery = `"${query.trim().replace(/"/g, '""')}"`;
  const { clause, params } = buildMetadataFilter(
    options?.dateRange,
    options?.tags,
    options?.moods
  );

  const baseParams: unknown[] = [ftsQuery];
  const sql = `
    SELECT e.id, e.content, e.mood, e.word_count, e.created_at, e.updated_at, e.metadata
    FROM entries e
    JOIN entries_fts ON e.rowid = entries_fts.rowid
    ${clause}
    ORDER BY e.created_at DESC
    LIMIT ?
  `;

  const results = await db.select<SearchEntry[]>(
    sql,
    [...baseParams, ...params, options?.limit ?? 10]
  );

  return results;
}

/**
 * Perform semantic search on entries using vector similarity.
 *
 * 1. Check if AI backend is available
 * 2. If not, fall back to keyword search
 * 3. Generate query vector using active backend (embedded or Ollama)
 * 4. Apply metadata filters (date, tags, moods)
 * 5. Retrieve embeddings from database for the active model
 * 6. Compute cosine similarity for each entry
 * 7. Return top K results sorted by similarity
 */
export async function semanticSearch(
  query: string,
  options?: VectorSearchOptions
): Promise<SearchEntry[]> {
  // Check AI availability
  const health = await hybridAI.checkAIHealth();
  if (!health.available || !health.embedding) {
    // Graceful fallback to keyword search
    return keywordSearchFallback(query, options);
  }

  const db = await getDb();
  const limit = options?.limit ?? 10;

  try {
    // Get the active model name for filtering embeddings
    const backend = useAIStore.getState().aiBackend;
    const modelName = backend === "embedded" ? "phi3-mini-q4" : "nomic-embed-text";

    // Generate query embedding via hybrid service
    const queryVector = await hybridAI.generateEmbedding(query);
    const normalizedQuery = normalizeVector(queryVector);

    // Build metadata filter
    const { clause, params } = buildMetadataFilter(
      options?.dateRange,
      options?.tags,
      options?.moods
    );

    // Query embeddings with metadata filters AND model match
    const modelFilterClause = clause
      ? `${clause} AND emb.model = ?`
      : "WHERE emb.model = ?";

    const sql = `
      SELECT e.id, e.content, e.mood, e.word_count, e.created_at, e.updated_at, e.metadata, emb.vector
      FROM embeddings emb
      JOIN entries e ON emb.entry_id = e.id
      ${modelFilterClause}
      ORDER BY e.created_at DESC
    `;

    const rows = await db.select<EmbeddingRow[]>(sql, [...params, modelName]);

    // Compute similarity scores for each entry
    const scored: ScoredResult[] = rows.map(row => {
      const storedVector = deserializeVector(row.vector);
      const normalizedStored = normalizeVector(storedVector);
      const similarity = cosineSimilarity(normalizedQuery, normalizedStored);

      return {
        entry: {
          id: row.id,
          content: row.content,
          mood: row.mood,
          word_count: row.word_count,
          created_at: row.created_at,
          updated_at: row.updated_at,
          metadata: row.metadata,
        },
        similarity,
      };
    });

    // Sort by similarity descending
    scored.sort((a, b) => b.similarity - a.similarity);

    // Return top K
    return scored.slice(0, limit).map(s => s.entry);
  } catch (error) {
    // If query embedding fails or any DB error, fall back to keyword search
    console.error("Vector search failed, falling back to keyword search:", error);
    return keywordSearchFallback(query, options);
  }
}
