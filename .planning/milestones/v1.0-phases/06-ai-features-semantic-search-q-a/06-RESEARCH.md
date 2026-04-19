# Phase 6: AI Features (Semantic Search + Q&A) - Research

**Researched:** 2026-04-14
**Domain:** Local LLM integration, vector databases, semantic search, RAG
**Confidence:** HIGH

## Summary

Phase 6 adds local-only semantic search and Q&A to Chronicle AI using Ollama for embeddings and LLM inference. The standard stack uses **sqlite-vec** (NOT ChromaDB) for vector storage within the existing SQLite database, keeping everything in one file with no external dependencies. Embeddings are generated via Ollama's `/api/embed` endpoint (calling localhost:11434), and Q&A uses standard RAG retrieval-augmentation with grounded prompting to cite source entries.

Key findings:
- **sqlite-vec** (SQLite extension) is preferred over ChromaDB for Tauri/desktop apps — single-file, no service dependency, direct SQL queries
- **nomic-embed-text** produces 768-dim vectors (NOT 1536 as mentioned in CLAUDE.md) — Matryoshka variable-dimension support allows 64-768 range
- **Ollama health check**: Simple HTTP GET to `http://localhost:11434/api/tags` returns available models
- **Vector search latency**: <100ms for typical journal query (pre-normalized cosine similarity)
- **Embedding generation**: 15-50ms per entry on modern CPUs; batch processing recommended for bulk generation
- **Q&A architecture**: Retrieve top K similar entries → augment LLM prompt with entry texts → send to Ollama `/api/generate` → parse response with entry citations

**Primary recommendation:** Use sqlite-vec as vector extension within existing SQLite database, generate embeddings on entry creation (async/background), implement Ollama health check + graceful fallback to keyword search per CONTEXT.md locked decision.

---

## User Constraints (from CONTEXT.md)

### Locked Decisions
1. **Core capability scope**: Semantic search + Q&A only (summaries, sentiment, entity extraction deferred to v2)
2. **LLM requirement**: Optional with graceful degradation (Ollama unavailable → keyword search only)
3. **LLM architecture**: Ollama exclusively (HTTP to localhost:11434)
4. **Embedding model**: nomic-embed-text (fixed, non-negotiable)
5. **Auto-import scope**: Deferred to v2 (no OAuth, Google Photos, Spotify, Health APIs in Phase 6)
6. **Pattern insights**: Deferred to v2 (Phase 6 is search + Q&A only)
7. **UI/UX**: Natural language search box extending Phase 4 search page with mode toggle
8. **Ollama setup**: Guided wizard on first AI use (check localhost:11434, prompt user to install if missing)

### Claude's Discretion
- Vector database choice: ChromaDB vs sqlite-vec vs Faiss → Researcher recommends sqlite-vec
- Embedding generation timing: First-run batch vs on-entry-creation vs on-demand → Researcher recommends on-entry-creation (async)
- Vector filtering strategy: Apply date/tag/mood filters before or after vector similarity → Researcher recommends metadata-based pre-filtering
- Model recommendations: llama2:7b vs 13b vs custom → Researcher provides trade-offs, planner chooses based on user feedback

### Deferred Ideas (OUT OF SCOPE)
- Entity extraction (people, places, activities)
- Pattern insights (frequency counts, trends, timelines)
- Sentiment analysis
- Entry summarization
- Smart auto-imports (Google Photos, Spotify, Health, Calendar)
- Self-hosted sync
- Audio recording + Whisper transcription
- Import from other apps (Day One, Obsidian, etc.)

---

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| LLMAI-01 | User can connect a local Ollama instance | Ollama runs on localhost:11434; health check via GET /api/tags |
| LLMAI-02 | App generates vector embeddings using local model | nomic-embed-text: 768-dim vectors via POST /api/embed; batch API support |
| LLMAI-03 | User can perform semantic search | sqlite-vec extension for SQLite; vector similarity search <100ms for typical queries |
| LLMAI-04 | User can ask natural language Q&A | RAG pattern: retrieve similar entries → augment prompt → send to /api/generate |
| LLMAI-05 | User can request AI-generated summary | DEFERRED TO v2 (explicitly out of scope for Phase 6) |
| LLMAI-06 | AI features work entirely offline | All computation on localhost; no network calls for embeddings or LLM |

---

## Standard Stack

### Core Vector Database

| Technology | Version | Purpose | Why Standard |
|-----------|---------|---------|--------------|
| **sqlite-vec** | Latest (as ext) | Vector storage + similarity search within SQLite | Single-file database (no external service), proven for RAG systems, integrates seamlessly with existing Tauri/SQLite setup. Preferred over ChromaDB for local desktop apps per 2025-2026 ecosystem patterns. |

### Embedding API

| Technology | Version | Purpose | Why Standard |
|-----------|---------|---------|--------------|
| **Ollama** | Latest (localhost) | Local embedding + LLM inference server | User-friendly, cross-platform, manages model lifecycle, no additional runtime setup. HTTP API standard for local LLM integration. |
| **nomic-embed-text** | v1.5 | Embedding model | 768-dim vectors, outperforms OpenAI models on short/long context, Matryoshka variable-dimension support (flexible sizing). Explicitly recommended in CLAUDE.md. |

### LLM Inference

| Technology | Version | Purpose | When to Use |
|-----------|---------|---------|-------------|
| **llama2:7b** | Latest | Recommended base LLM (Q&A, grounded generation) | Default recommendation: balance speed (15-30 tokens/sec) + quality for most users. ~4GB VRAM required. |
| **llama2:13b** | Latest | Alternative for higher quality | Power users with 8GB+ VRAM; slower inference (~8-12 tokens/sec) but better reasoning. |
| **Custom model** | User choice | Fallback for advanced users | Users can swap model in settings; planner detects via Ollama API. |

### Supporting Libraries (TypeScript/Node.js)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| **better-sqlite3** | Latest | SQLite bindings for Node (used in Tauri) | Already in use; required for raw SQL access to sqlite-vec extension |
| **@tauri-apps/plugin-sql** | Latest | Tauri SQL plugin (if using Rust backend) | Already integrated; handles SQLite connection from Rust |

### Installation

For sqlite-vec in existing SQLite setup:
```bash
# sqlite-vec is a dynamic extension; no npm install required
# Compile from source or use pre-built binaries depending on OS
# See: https://github.com/asg017/sqlite-vec

# Ollama standalone download from ollama.com/download
# Models pulled via: ollama pull nomic-embed-text, ollama pull llama2:7b
```

**Version verification:**
- Ollama: Check latest from ollama.com (continuously updated)
- nomic-embed-text: Via `ollama show nomic-embed-text` after pull
- sqlite-vec: Latest release from GitHub (recommend v0.1.0+)

---

## Architecture Patterns

### Recommended Workflow

```
User writes entry
    ↓
Entry saved to SQLite
    ↓
Background task: Generate embedding via Ollama /api/embed
    ↓
Store vector in sqlite-vec (entry_id, model, vector, chunk_index)
    ↓
User performs semantic search
    ↓
Retrieve query vector from Ollama /api/embed
    ↓
Vector similarity search in sqlite-vec (cosine or L2 distance)
    ↓
Apply metadata filters (date range, tags, mood)
    ↓
Return top K entries + preview
    ↓
User asks Q&A question
    ↓
Retrieve top N entries (same vector search)
    ↓
Augment prompt with entry content + metadata
    ↓
Send to Ollama /api/generate
    ↓
Parse response, extract citations, display answer + linked entries
```

### Pattern 1: Ollama Health Check

**What:** Detect if Ollama is running and required models are available at startup and before each AI operation.

**When to use:** Every phase requiring AI features (semantic search, Q&A).

**Implementation:**

```typescript
// Health check at app startup and before AI operations
async function checkOllamaHealth(): Promise<{
  available: boolean;
  models: { embedding: boolean; llm: boolean };
}> {
  try {
    const response = await fetch("http://localhost:11434/api/tags", {
      timeout: 3000,
    });
    if (!response.ok) return { available: false, models: { embedding: false, llm: false } };

    const data = await response.json();
    const models = data.models || [];
    const modelNames = models.map((m: any) => m.name);

    return {
      available: true,
      models: {
        embedding: modelNames.some((name: string) => name.includes("nomic-embed-text")),
        llm: modelNames.some((name: string) => name.includes("llama2") || name.includes("custom")),
      },
    };
  } catch (error) {
    return { available: false, models: { embedding: false, llm: false } };
  }
}
```

**Source:** [Ollama REST API Reference](https://github.com/ollama/ollama/blob/main/docs/api.md)

---

### Pattern 2: Embedding Generation (On Entry Creation)

**What:** Generate and store embeddings asynchronously after entry save, with progress tracking for bulk generation.

**When to use:** After entry is created/updated in editor.

**Implementation:**

```typescript
// Async embedding generation triggered after entry save
async function generateEmbeddingAsync(entryId: string, content: string): Promise<void> {
  try {
    const ollamaHealth = await checkOllamaHealth();
    if (!ollamaHealth.available || !ollamaHealth.models.embedding) return; // Graceful skip

    const response = await fetch("http://localhost:11434/api/embed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "nomic-embed-text",
        input: content,
      }),
    });

    if (!response.ok) throw new Error("Embedding request failed");

    const data = await response.json();
    const vector = data.embedding; // Array of 768 floats

    // Store in sqlite-vec table
    const db = await getDb();
    await db.execute(
      `INSERT OR REPLACE INTO embeddings (entry_id, model, dimensions, vector, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [entryId, "nomic-embed-text", 768, JSON.stringify(vector), Date.now()]
    );
  } catch (error) {
    console.error("[embeddings] Generation failed, AI search unavailable for this entry:", error);
    // Graceful degradation — app still works, just without this entry's embedding
  }
}
```

**Performance:** ~25-50ms per entry (nomic-embed-text on modern CPU); batch processing via array input reduces latency for bulk generation.

**Source:** [Ollama Embeddings API](https://docs.ollama.com/capabilities/embeddings), [Ollama Embedded Models Guide](https://collabnix.com/ollama-embedded-models-the-complete-technical-guide-to-local-ai-embeddings-in-2025/)

---

### Pattern 3: Vector Similarity Search (Semantic Search)

**What:** Query vector database for semantically similar entries using pre-normalized cosine similarity.

**When to use:** User enters semantic search query (AI Search tab).

**Implementation:**

```typescript
// Semantic search with metadata filtering
async function semanticSearch(
  query: string,
  filters?: { dateRange?: [number, number]; tags?: string[]; moods?: string[] }
): Promise<Array<{ entryId: string; similarity: number; preview: string }>> {
  const ollamaHealth = await checkOllamaHealth();
  if (!ollamaHealth.available) {
    return []; // Fallback to keyword search (Phase 4 FTS5)
  }

  // Generate query vector
  const embeddingResponse = await fetch("http://localhost:11434/api/embed", {
    method: "POST",
    body: JSON.stringify({
      model: "nomic-embed-text",
      input: query,
    }),
  });
  const embeddingData = await embeddingResponse.json();
  const queryVector = embeddingData.embedding; // 768-dim array

  // Normalize for cosine similarity (L2 norm)
  const magnitude = Math.sqrt(queryVector.reduce((sum: number, v: number) => sum + v * v, 0));
  const normalized = queryVector.map((v: number) => v / magnitude);

  // Query sqlite-vec with metadata filtering
  const db = await getDb();
  const sqlFilter = buildMetadataFilter(filters); // Helper: builds WHERE clause

  const results = await db.select<
    Array<{ id: string; vector: string; content_preview: string; similarity: number }>
  >(
    `SELECT 
       e.id, 
       emb.vector,
       substr(e.content, 1, 150) AS content_preview,
       CAST(
         SUM(emb.vector_val * ?) / COUNT(*) AS REAL
       ) AS similarity
     FROM embeddings emb
     JOIN entries e ON emb.entry_id = e.id
     ${sqlFilter}
     GROUP BY e.id
     ORDER BY similarity DESC
     LIMIT 10`,
    normalized // Spreads normalized vector into SQL params
  );

  return results.map((r) => ({
    entryId: r.id,
    similarity: r.similarity,
    preview: r.content_preview,
  }));
}
```

**Note:** sqlite-vec syntax differs from above pseudocode. See sqlite-vec documentation for actual vector distance functions (e.g., `vec_distance_l2`, `vec_distance_cosine`).

**Performance:** <100ms for 10k entries with pre-indexed vectors (typical journal size).

**Source:** [sqlite-vec Documentation](https://github.com/asg017/sqlite-vec), [Vector Search Performance Benchmarks](https://redis.io/blog/benchmarking-results-for-vector-databases/)

---

### Pattern 4: RAG for Q&A (Retrieval-Augmented Generation)

**What:** Retrieve relevant entries → construct grounded prompt → send to LLM → return answer with citations.

**When to use:** User types natural language question in AI Search mode.

**Implementation:**

```typescript
// Q&A with grounding and citations
async function askQuestion(
  question: string,
  _filters?: { dateRange?: [number, number]; tags?: string[]; moods?: string[] }
): Promise<{ answer: string; citedEntries: string[] }> {
  // Step 1: Retrieve similar entries (reuse semanticSearch above)
  const retrievedEntries = await semanticSearch(question, _filters);
  const topK = 5; // Retrieve top 5 most similar entries
  const entryIds = retrievedEntries.slice(0, topK).map((r) => r.entryId);

  // Step 2: Fetch full entry content for augmentation
  const db = await getDb();
  const entries = await db.select<Array<{ id: string; content: string; date: number }>>(
    `SELECT id, content, created_at FROM entries WHERE id IN (${entryIds.map(() => "?").join(",")})`,
    entryIds
  );

  // Step 3: Build context-aware prompt
  const context = entries
    .map(
      (e) =>
        `[Entry from ${new Date(e.date).toLocaleDateString()}]\n${e.content}\n[End Entry ${e.id}]`
    )
    .join("\n\n");

  const systemPrompt = `You are a helpful assistant answering questions about journal entries. 
Always ground your answers in the provided entry content. 
When you reference information from an entry, cite it using [Entry ID].
If you cannot answer from the entries, say so explicitly.`;

  const userPrompt = `Based on these journal entries:\n\n${context}\n\nQuestion: ${question}\n\nProvide a grounded answer with citations.`;

  // Step 4: Send to Ollama for generation
  const generationResponse = await fetch("http://localhost:11434/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "llama2:7b", // Default; user can configure in settings
      system: systemPrompt,
      prompt: userPrompt,
      stream: false, // Non-streaming for simplicity; Phase 6 can use streaming UI later
      temperature: 0.7,
      top_p: 0.9,
    }),
  });

  const generationData = await generationResponse.json();
  const rawAnswer = generationData.response; // String with inline [Entry ID] citations

  // Step 5: Extract cited entry IDs from response
  const citationRegex = /\[Entry ([a-f0-9-]+)\]/g;
  const citedEntries = [...rawAnswer.matchAll(citationRegex)].map((m) => m[1]);

  return {
    answer: rawAnswer,
    citedEntries: [...new Set(citedEntries)], // Deduplicate
  };
}
```

**Prompt Engineering Notes:**
- System prompt establishes grounding requirement (cite sources, admit limitations)
- User prompt provides retrieved entries + question
- Temperature 0.7 balances factuality + creativity (lower = more factual)
- Model choice: llama2:7b default (15-30 tokens/sec), 13b available for power users

**Performance:** <10s total (2-3s retrieval + embedding, 5-8s LLM inference on typical question).

**Source:** [Grounding Enterprise AI with Citations](https://engineering.salesforce.com/grounding-enterprise-ai-with-live-web-retrieval-and-verifiable-citations/), [RAG Guide](https://www.promptingguide.ai/techniques/rag), [Ollama API Reference](https://github.com/ollama/ollama/blob/main/docs/api.md)

---

### Anti-Patterns to Avoid

- **Synchronous embedding generation blocking UI:** Generate embeddings asynchronously; don't wait for embedding before returning to timeline.
- **No Ollama fallback:** Always check health before AI operations; gracefully fall back to keyword search if unavailable.
- **Storing vectors as JSON strings:** Use SQLite BLOB type with sqlite-vec extension for efficient similarity search.
- **Re-embedding unchanged entries:** Check `updated_at` timestamp; skip re-embedding if entry content hasn't changed since last embedding.
- **Ungrounded LLM responses:** Always retrieve entries + include in prompt; avoid asking LLM to answer from memory alone.
- **No citation parsing:** Parse [Entry ID] tokens from LLM response and link them back to full entries for user verification.
- **Ignoring Ollama model availability:** Check both Ollama service AND required models (nomic-embed-text, llama2:*) before enabling AI features.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|------------|-------------|-----|
| Vector similarity search | Custom L2/cosine distance calculations | sqlite-vec extension | Optimized for large datasets, proven performance, SIMD-accelerated on modern CPUs |
| Embedding generation | Custom neural network or API wrapper | Ollama /api/embed endpoint | Model training/fine-tuning is complex; Ollama manages model lifecycle, supports batching |
| Prompt engineering for grounding | Generic LLM prompts | System prompt + context injection + citation parsing | Requires careful design to avoid hallucination; proven patterns in production RAG systems |
| Model management (download, install, version) | Shell scripts, manual CI/CD | Ollama CLI (`ollama pull`, `ollama show`) | Handles model verification, compatibility checks, VRAM requirements |
| Metadata filtering on vectors | Post-retrieval filtering in app code | SQLite metadata columns + WHERE clause | Reduces search space before similarity scoring, dramatic latency improvement |
| Ollama health monitoring | Manual curl/fetch calls scattered in code | Centralized health check function (called at startup + before AI ops) | Single source of truth, easier to add retry logic, consistent UX for unavailable Ollama |

**Key insight:** Vector databases are complex (approximate nearest neighbor search, index management, concurrency); use sqlite-vec to avoid reinventing. Embedding models are neural networks; use Ollama's pre-trained, optimized models rather than training/hosting custom. LLM prompting requires experimentation; use proven RAG citation patterns rather than custom prompt hacks.

---

## Common Pitfalls

### Pitfall 1: ChromaDB vs sqlite-vec Choice

**What goes wrong:** Choosing ChromaDB for a Tauri desktop app introduces external service dependency; if Chroma crashes, vector search is unavailable even though Ollama is running.

**Why it happens:** ChromaDB is well-known, documented, but it's designed for server deployments with separate DB services. For single-user desktop apps, sqlite-vec is simpler.

**How to avoid:** Use sqlite-vec (SQLite extension) — no external service, single-file database, integrates directly with existing SQLite. Tauri apps use Tauri SQL plugin; sqlite-vec extends it seamlessly.

**Warning signs:** Planning to run separate Chroma service on localhost; complexity around Chroma connection pooling or restart handling.

**Source:** [SQLite vs Chroma Comparative Analysis](https://stephencollins.tech/posts/sqlite-vs-chroma-comparative-analysis), [sqlite-vec Embedded Intelligence](https://dev.to/aairom/embedded-intelligence-how-sqlite-vec-delivers-fast-local-vector-search-for-ai-3dpb)

---

### Pitfall 2: Synchronous Embedding Generation Blocks UI

**What goes wrong:** Calling `generateEmbedding()` synchronously after entry save freezes the editor for 50-100ms (noticeable lag).

**Why it happens:** Ollama embedding API takes 20-50ms per entry; waiting for response blocks the main thread.

**How to avoid:** Generate embeddings asynchronously (background task, don't await in save handler). Fire and forget, with error handling for graceful degradation.

**Warning signs:** Perceptible pause after hitting save; user clicks to next entry but editor lags.

---

### Pitfall 3: Unhandled Ollama Unavailability

**What goes wrong:** User hasn't installed Ollama or quit the service; semantic search crashes with "connection refused" error instead of falling back to keyword search.

**Why it happens:** No health check before attempting API calls; error not caught or mishandled.

**How to avoid:** Call `checkOllamaHealth()` at app startup and before each AI operation. If unavailable, disable AI features gracefully, show message in UI, don't attempt Ollama API calls.

**Warning signs:** User sees error dialog instead of "AI features unavailable, install Ollama" message; app crashes if Ollama quits mid-session.

**Source:** [Ollama REST API Reference](https://mljourney.com/ollama-rest-api-reference-every-endpoint-with-examples/)

---

### Pitfall 4: Wrong Embedding Dimensions (CLAUDE.md Discrepancy)

**What goes wrong:** CLAUDE.md states "1536-dim vectors" for nomic-embed-text, but actual model outputs 768 dimensions, breaking vector schema.

**Why it happens:** Confusion with OpenAI's text-embedding-3-large (1536 dims); nomic-embed-text is smaller but higher quality.

**How to avoid:** Verify embedding dimensions after `ollama pull nomic-embed-text`: run `ollama show nomic-embed-text` or check first embedding response. Implement flexible dimension handling (768 is standard; Matryoshka support allows 64-768 range if needed).

**Warning signs:** SQLite schema expects 1536 floats per vector, but Ollama returns 768-element arrays; storage mismatch.

**Source:** [Nomic Embed Text Specifications](https://huggingface.co/nomic-ai/nomic-embed-text-v1.5), [Ollama Embedding Models](https://collabnix.com/ollama-embedded-models-the-complete-technical-guide-to-local-ai-embeddings-in-2025/)

---

### Pitfall 5: Re-Embedding Unchanged Entries

**What goes wrong:** On every app launch, all entries are re-embedded, wasting CPU and slowing startup.

**Why it happens:** No check for whether entry content changed since last embedding.

**How to avoid:** Store `embedding_generated_at` timestamp in embeddings table; before re-generating, check if `entry.updated_at > embedding.created_at`. Skip if unchanged.

**Warning signs:** Embedding generation runs every startup; performance regresses as journal grows.

---

### Pitfall 6: Ungrounded LLM Responses (Hallucination)

**What goes wrong:** LLM answers question without referencing retrieved entries, making up details not in journal ("You mentioned visiting Paris in 2024" when user never wrote that).

**Why it happens:** No system prompt enforcing grounding; LLM uses training data knowledge instead of entry context.

**How to avoid:** Always include system prompt + context (retrieved entries) in request. Require citations in prompt. Parse and verify citations in response before returning to user.

**Warning signs:** LLM answer contradicts entry content or introduces information not present in journal.

**Source:** [Enhancing Factual Accuracy and Citation Generation](https://arxiv.org/pdf/2509.05741)

---

### Pitfall 7: Model Configuration Complexity

**What goes wrong:** User installs Ollama but hasn't downloaded llama2 model yet; semantic search works (nomic-embed-text available) but Q&A fails with "model not found" error.

**Why it happens:** No distinction between embedding model (required for search) and LLM model (required for Q&A only). Planner must handle model availability separately.

**How to avoid:** Health check returns `{ embedding: bool, llm: bool }`. Semantic search enabled if embedding available; Q&A enabled only if LLM available. Show separate "download llama2" prompt if user tries Q&A without LLM.

**Warning signs:** Partial AI feature availability not clearly communicated to user; user confused why search works but Q&A doesn't.

---

## Code Examples

### Health Check at App Startup

```typescript
// App.tsx or main initialization
import { useEffect, useState } from 'react';
import { useAIStore } from './stores/aiStore'; // Future store

export function App() {
  const [aiReady, setAIReady] = useState(false);
  const setAIStatus = useAIStore((s) => s.setAIStatus);

  useEffect(() => {
    async function initAI() {
      const health = await checkOllamaHealth();
      setAIStatus(health);
      setAIReady(health.available);
    }
    initAI();
  }, []);

  // ... rest of app
}

// Health check function
async function checkOllamaHealth(): Promise<{
  available: boolean;
  embedding: boolean;
  llm: boolean;
}> {
  try {
    const resp = await fetch('http://localhost:11434/api/tags', {
      timeout: 3000,
    });
    if (!resp.ok) return { available: false, embedding: false, llm: false };

    const data: { models: Array<{ name: string }> } = await resp.json();
    const models = data.models?.map((m) => m.name) || [];

    return {
      available: true,
      embedding: models.some((name) => name.includes('nomic-embed-text')),
      llm: models.some((name) => name.includes('llama2') || name.some((n) => !n.includes('embed'))),
    };
  } catch (error) {
    return { available: false, embedding: false, llm: false };
  }
}
```

**Source:** [Ollama REST API Reference](https://github.com/ollama/ollama/blob/main/docs/api.md)

---

### Async Embedding Generation

```typescript
// embedService.ts
async function generateEmbeddingAsync(
  entryId: string,
  content: string
): Promise<void> {
  try {
    const health = await checkOllamaHealth();
    if (!health.available || !health.embedding) return; // Graceful skip

    const resp = await fetch('http://localhost:11434/api/embed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'nomic-embed-text',
        input: content,
      }),
    });

    if (!resp.ok) throw new Error(`Embedding API error: ${resp.status}`);
    const data: { embedding: number[] } = await resp.json();

    const db = await getDb();
    const vectorBlob = new Float32Array(data.embedding).buffer;

    await db.execute(
      `INSERT OR REPLACE INTO embeddings
       (entry_id, model, dimensions, vector, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [entryId, 'nomic-embed-text', data.embedding.length, vectorBlob, Date.now()]
    );
  } catch (error) {
    console.warn(`[embeddings] Skipped for entry ${entryId}:`, error);
    // Graceful degradation — app continues without this entry's embedding
  }
}

// Call from entry save handler (async, don't await)
export async function onEntrySaved(entryId: string, content: string) {
  await saveEntry(entryId, content); // Main save (awaited)
  generateEmbeddingAsync(entryId, content); // Background (fire and forget)
}
```

**Source:** [Ollama Embeddings API](https://docs.ollama.com/capabilities/embeddings)

---

### Semantic Search with Metadata Filtering

```typescript
// searchService.ts
export async function semanticSearch(
  query: string,
  options?: {
    dateRange?: { start: number; end: number };
    tags?: string[];
    moods?: string[];
    limit?: number;
  }
): Promise<Array<{ entryId: string; similarity: number; preview: string }>> {
  const health = await checkOllamaHealth();
  if (!health.available || !health.embedding) {
    // Fallback to keyword search (Phase 4 FTS5)
    console.log('[search] Ollama unavailable, falling back to FTS5');
    return keywordSearch(query); // Existing Phase 4 implementation
  }

  // Generate query embedding
  const embResp = await fetch('http://localhost:11434/api/embed', {
    method: 'POST',
    body: JSON.stringify({
      model: 'nomic-embed-text',
      input: query,
    }),
  });
  const embData: { embedding: number[] } = await embResp.json();
  const queryVector = embData.embedding;

  // Normalize for cosine similarity
  const magnitude = Math.sqrt(queryVector.reduce((sum, v) => sum + v * v, 0));
  const normalized = queryVector.map((v) => v / (magnitude || 1));

  // Build WHERE clause for metadata filters
  let whereClause = '1 = 1';
  const params: any[] = [normalized];

  if (options?.dateRange) {
    whereClause += ` AND e.created_at BETWEEN ? AND ?`;
    params.push(options.dateRange.start, options.dateRange.end);
  }

  if (options?.moods?.length) {
    whereClause += ` AND e.mood IN (${options.moods.map(() => '?').join(',')})`;
    params.push(...options.moods);
  }

  if (options?.tags?.length) {
    // Multi-tag: entries with ALL selected tags
    whereClause +=
      ` AND e.id IN (
          SELECT entry_id FROM entry_tags 
          WHERE tag_id IN (${options.tags.map(() => '?').join(',')})
          GROUP BY entry_id HAVING COUNT(DISTINCT tag_id) = ?
        )`;
    params.push(...options.tags, options.tags.length);
  }

  // Query sqlite-vec (pseudocode — actual syntax depends on sqlite-vec API)
  const db = await getDb();
  const results = await db.select<
    Array<{
      id: string;
      similarity: number;
      content_preview: string;
    }>
  >(
    `SELECT 
       e.id,
       substr(e.content, 1, 150) AS content_preview,
       vec_distance_cosine(emb.vector, json_array(${normalized.map(() => '?').join(',')})) AS similarity
     FROM embeddings emb
     JOIN entries e ON emb.entry_id = e.id
     WHERE ${whereClause}
     ORDER BY similarity ASC
     LIMIT ?`,
    [...params, options?.limit ?? 10]
  );

  return results.map((r) => ({
    entryId: r.id,
    similarity: r.similarity,
    preview: r.content_preview,
  }));
}
```

**Note:** Exact sqlite-vec syntax for vector distance functions needs verification against official docs. Above is pseudocode following standard RAG patterns.

**Source:** [sqlite-vec Documentation](https://github.com/asg017/sqlite-vec), [SQL Vector Search Patterns](https://dev.to/sfundomhlungu/how-to-build-a-vector-database-with-sqlite-in-nodejs-1epd)

---

### Q&A with Citations

```typescript
// qaService.ts
export async function askQuestion(
  question: string,
  filters?: { dateRange?: [number, number]; tags?: string[]; moods?: string[] }
): Promise<{
  answer: string;
  citedEntries: Array<{ id: string; preview: string }>;
  tokensUsed: number;
}> {
  const health = await checkOllamaHealth();
  if (!health.available || !health.llm) {
    throw new Error('Q&A requires LLM. Install Ollama and pull a model (ollama pull llama2:7b)');
  }

  // Step 1: Retrieve relevant entries
  const retrieved = await semanticSearch(question, {
    dateRange: filters?.dateRange as any,
    tags: filters?.tags,
    moods: filters?.moods,
    limit: 5,
  });

  if (retrieved.length === 0) {
    return {
      answer: "No entries found matching your query.",
      citedEntries: [],
      tokensUsed: 0,
    };
  }

  // Step 2: Fetch full entry content
  const db = await getDb();
  const entries = await db.select<
    Array<{ id: string; content: string; created_at: number }>
  >(
    `SELECT id, content, created_at FROM entries WHERE id IN (${retrieved
      .map(() => '?')
      .join(',')})`,
    retrieved.map((r) => r.entryId)
  );

  // Step 3: Build context
  const context = entries
    .map((e) => {
      const date = new Date(e.created_at).toLocaleDateString();
      return `[Entry ${e.id} from ${date}]\n${e.content}\n[/Entry]`;
    })
    .join('\n\n');

  const systemPrompt = `You are a helpful assistant analyzing journal entries.
Always ground your answers in the provided entry content.
When you reference information from an entry, cite it using [Entry <id>].
If you cannot answer from the entries provided, say so explicitly.
Keep responses concise (2-3 sentences) unless asked for detail.`;

  const userPrompt = `Based on these journal entries:\n\n${context}\n\nQuestion: ${question}`;

  // Step 4: Call Ollama generate endpoint
  const genResp = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama2:7b', // Default; configurable in settings
      system: systemPrompt,
      prompt: userPrompt,
      stream: false,
      temperature: 0.7,
      top_p: 0.9,
    }),
  });

  const genData: {
    response: string;
    total_duration: number;
    load_duration: number;
    prompt_eval_count: number;
    eval_count: number;
    eval_duration: number;
  } = await genResp.json();

  const rawAnswer = genData.response;

  // Step 5: Parse citations from response
  const citationRegex = /\[Entry ([a-f0-9-]+)/gi;
  const matches = [...rawAnswer.matchAll(citationRegex)];
  const uniqueCitedIds = new Set(matches.map((m) => m[1].toLowerCase()));

  const citedEntries = entries
    .filter((e) => uniqueCitedIds.has(e.id.toLowerCase()))
    .map((e) => ({
      id: e.id,
      preview: e.content.substring(0, 150),
    }));

  return {
    answer: rawAnswer,
    citedEntries,
    tokensUsed: genData.eval_count,
  };
}
```

**Source:** [Ollama API Reference](https://github.com/ollama/ollama/blob/main/docs/api.md), [RAG Prompt Engineering Guide](https://www.promptingguide.ai/techniques/rag)

---

## State of the Art

| Old Approach | Current Approach (2025-2026) | When Changed | Impact |
|--------------|------------------------------|-------------|--------|
| Cloud AI APIs (OpenAI, Anthropic) | Local LLMs (Ollama, llama.cpp) | 2023-2024 | Privacy guarantee possible for desktop; no per-token cost; users own data |
| Single monolithic vector DB (Pinecone, Weaviate) | Embedded vectors in existing DB (sqlite-vec, pgvector) | 2024-2025 | Simpler deployment, one less service to manage, fits single-user/desktop use cases |
| Synchronous embedding generation | Async background generation | 2024-2025 | Better UX, non-blocking saves, graceful degradation if Ollama unavailable |
| Generic LLM prompts | Grounded RAG with system prompts + citations | 2023-2025 | Reduced hallucination, verifiable answers, user trust in AI features |
| Separate embedding + LLM models (different vendors) | Unified local LLM platform (Ollama manages both) | 2024 | Single download, consistent versions, easier setup for non-technical users |

**Deprecated/outdated:**
- **ChromaDB as default for local apps**: Still valid for server deployments, but sqlite-vec preferred for Tauri/desktop (2025 consensus)
- **Cloud-first architecture**: Privacy-first desktop LLM apps now viable with Ollama; no longer assume users need cloud
- **Manual vector storage**: sqlite-vec extension automates vector indexing; manual SQL vector operations now considered unnecessary complexity

---

## Open Questions

1. **Exact sqlite-vec Integration Path**
   - **What we know:** sqlite-vec is a dynamic SQLite extension; exact loading mechanism in Tauri SQL plugin needs verification
   - **What's unclear:** Can `@tauri-apps/plugin-sql` load custom extensions? Or must Tauri Rust backend handle compilation/loading?
   - **Recommendation:** Planner should spike this before Phase 6 execution; may require Rust-side FFI or pre-compiled binaries

2. **Batch Embedding Performance**
   - **What we know:** Ollama `/api/embed` supports array input for batch generation; 12k+ tokens/sec on RTX 4090
   - **What's unclear:** What's the optimal batch size for typical journal entry sizes (500-2000 words)? Diminishing returns beyond batch size X?
   - **Recommendation:** Benchmark with actual journal data; start with batch size 8-16 entries per request

3. **Model Recommendation: llama2:7b vs 13b**
   - **What we know:** 7b = fast (15-30 tok/sec), 13b = better quality (8-12 tok/sec); both adequate for Q&A
   - **What's unclear:** User expectations for latency? Should we recommend 7b by default and let power users opt-in to 13b?
   - **Recommendation:** Default to 7b (better UX), provide "download larger model" option in settings with VRAM warnings

4. **Streaming vs Non-Streaming Q&A UI**
   - **What we know:** Ollama supports streaming responses; Tauri v2 supports server-sent events
   - **What's unclear:** Is streaming necessary for Phase 6, or can we ship non-streaming (simpler implementation)?
   - **Recommendation:** Phase 6 MVP uses non-streaming (simpler); streaming can be Phase 6.5 enhancement if UX testing shows latency is problematic

5. **Vector Dimension Flexibility**
   - **What we know:** nomic-embed-text supports Matryoshka variable dimensions (64-768)
   - **What's unclear:** Should we implement dimension flexibility (configurable in settings), or lock to 768?
   - **Recommendation:** Lock to 768 for Phase 6 (simpler schema); add configurable dimensions in v2 if users request it

6. **Metadata Filtering Efficiency**
   - **What we know:** Filtering before vector search is faster than post-filtering
   - **What's unclear:** For typical journal sizes (1-10k entries), does date/tag/mood filtering in WHERE clause significantly impact performance?
   - **Recommendation:** Benchmark with actual Chrome schema; if <50ms impact, filtering in WHERE clause is fine; otherwise, pre-filter in app code

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Ollama | Embedding + LLM inference | ✓ (optional) | Latest (user installs) | Keyword search only (Phase 4 FTS5) |
| nomic-embed-text model | Semantic search | ✓ (user must pull) | Via Ollama | Semantic search disabled; Q&A disabled |
| llama2:7b or 13b model | Q&A inference | ✓ (user must pull) | Via Ollama | Q&A disabled; semantic search works |
| sqlite-vec extension | Vector storage | ⚠️ (needs integration) | Latest | Hand-roll vector storage in SQLite (complex) |
| Node.js / Tauri backend | Any AI operation | ✓ | Already present | — |

**Missing dependencies with no fallback:**
- sqlite-vec integration path (may require Rust-side work)

**Missing dependencies with fallback:**
- Ollama (graceful degradation to keyword search)
- Models (guide user to install via wizard)

---

## Validation Architecture

**Config check:** `workflow.nyquist_validation` is set to `false` in .planning/config.json.

**Section skipped per configuration.**

---

## Sources

### Primary (HIGH confidence)
- **Ollama Official API Docs** - [github.com/ollama/ollama/docs/api.md](https://github.com/ollama/ollama/blob/main/docs/api.md) — Embeddings endpoints, health check, model management
- **ChromaDB Docs** - [docs.trychroma.com](https://docs.trychroma.com/) — Vector DB patterns, embedding functions, JS client
- **Nomic Embed Text Specs** - [huggingface.co/nomic-ai/nomic-embed-text-v1.5](https://huggingface.co/nomic-ai/nomic-embed-text-v1.5) — Dimension sizes, Matryoshka support
- **sqlite-vec GitHub** - [github.com/asg017/sqlite-vec](https://github.com/asg017/sqlite-vec) — Vector extension, similarity search, performance

### Secondary (MEDIUM confidence)
- [SQLite vs Chroma Comparative Analysis](https://stephencollins.tech/posts/sqlite-vs-chroma-comparative-analysis) — Desktop app trade-offs verified with multiple sources
- [Building Local LLM Desktop Applications with Tauri](https://medium.com/@dillon.desilva/building-local-lm-desktop-applications-with-tauri-f54c628b13d9) — Tauri + Ollama integration patterns
- [How I Built a Desktop AI App with Tauri v2 + React 19 in 2026](https://dev.to/purpledoubled/how-i-built-a-desktop-ai-app-with-tauri-v2-react-19-in-2026-1g47) — Recent 2026 patterns
- [Ollama Embedded Models: Technical Guide](https://collabnix.com/ollama-embedded-models-the-complete-technical-guide-to-local-ai-embeddings-in-2025/) — Performance benchmarks, batch processing
- [Grounding Enterprise AI with Citations](https://engineering.salesforce.com/grounding-enterprise-ai-with-live-web-retrieval-and-verifiable-citations/) — RAG + citation patterns

### Tertiary (Technical References)
- [RAG Prompt Engineering Guide](https://www.promptingguide.ai/techniques/rag) — Retrieval-augmented generation best practices
- [Vector Search Performance Benchmarks](https://redis.io/blog/benchmarking-results-for-vector-databases/) — Latency expectations, optimization
- [Enhancing Factual Accuracy and Citation Generation](https://arxiv.org/pdf/2509.05741) — Grounding LLM responses

---

## Metadata

**Confidence breakdown:**
- **Standard Stack (sqlite-vec + Ollama)**: HIGH — Multiple 2025-2026 sources confirm this is SOTA for local desktop apps. Official Ollama docs and sqlite-vec GitHub are authoritative.
- **Embedding Dimensions (768, not 1536)**: HIGH — Verified against HuggingFace official model card; CLAUDE.md discrepancy noted.
- **Architecture Patterns (health check, async generation, RAG)**: HIGH — All patterns sourced from official docs or production implementations (Ollama, Chroma, Salesforce RAG).
- **Performance targets (<100ms vector search, <10s Q&A)**: MEDIUM — Derived from Redis/benchmark sources; actual performance varies by hardware. Planner should validate on target devices.
- **Prompt Engineering for Citations**: MEDIUM — Best practices come from research papers and Salesforce engineering; specific journal domain requires validation.
- **Pitfalls**: MEDIUM-HIGH — Common issues sourced from GitHub issues, Medium blogs, documentation; some are general RAG pitfalls, others journal-specific.

**Research date:** 2026-04-14  
**Valid until:** 2026-05-14 (30 days; Ollama ecosystem evolves monthly)

---

**Context committed:** Ready for planner to create Phase 6 PLAN.md files
