/**
 * Ollama HTTP client for embedding generation, LLM inference, and health checks.
 * All communication with localhost:11434 (Ollama API).
 * All errors are caught and handled gracefully — app continues functioning if Ollama unavailable.
 */

const OLLAMA_BASE = "http://localhost:11434";
const HEALTH_CHECK_TIMEOUT = 3000; // 3 second timeout

/**
 * Check if Ollama is available and models are loaded.
 * GET to http://localhost:11434/api/tags
 * Returns { available: false, embedding: false, llm: false } on any error.
 */
export async function checkOllamaHealth(): Promise<{
  available: boolean;
  embedding: boolean;
  llm: boolean;
}> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT);

    const response = await fetch(`${OLLAMA_BASE}/api/tags`, {
      method: "GET",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return { available: false, embedding: false, llm: false };
    }

    const data = (await response.json()) as { models: Array<{ name: string }> };
    const models = data.models || [];
    const modelNames = models.map((m) => m.name.toLowerCase());

    // Check for nomic-embed-text and any llama2 model
    const hasEmbedding = modelNames.some((n) => n.includes("nomic-embed-text"));
    const hasLlm = modelNames.some(
      (n) => n.includes("llama2") || n.includes("llama")
    );

    return {
      available: true,
      embedding: hasEmbedding,
      llm: hasLlm,
    };
  } catch (err) {
    // Network error, timeout, or parse error
    return { available: false, embedding: false, llm: false };
  }
}

/**
 * Generate embedding for content.
 * POST to http://localhost:11434/api/embed with model "nomic-embed-text"
 * Returns 768-element float array (nomic-embed-text output).
 * Throws error if Ollama unavailable or request fails.
 */
export async function generateEmbedding(content: string): Promise<number[]> {
  try {
    const response = await fetch(`${OLLAMA_BASE}/api/embed`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "nomic-embed-text",
        input: content,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama embedding request failed: ${response.statusText}`);
    }

    const data = (await response.json()) as { embeddings: number[][] };
    const embedding = data.embeddings?.[0];

    if (!embedding || !Array.isArray(embedding)) {
      throw new Error("Invalid embedding response from Ollama");
    }

    return embedding;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to generate embedding: ${message}`);
  }
}

/**
 * Generate embedding for a query (same as generateEmbedding, reuses same endpoint).
 * Returns normalized query vector for vector similarity.
 */
export async function queryEmbedding(query: string): Promise<number[]> {
  return generateEmbedding(query);
}

/**
 * Ask question about journal entries using LLM.
 * POST to http://localhost:11434/api/generate with model "llama2:7b"
 * Returns { answer: string, citations: string[] } with entry IDs extracted from response.
 * Throws error if LLM model unavailable or request fails.
 */
export async function askQuestion(
  question: string,
  context: string
): Promise<{ answer: string; citations: string[] }> {
  try {
    const systemPrompt =
      "You are a helpful assistant answering questions about journal entries. Always ground your answers in the provided entry content. When you reference information from an entry, cite it using [Entry XXXXX] format. If you cannot answer from the entries, say so explicitly.";

    const userPrompt = `Based on these journal entries:\n\n${context}\n\nQuestion: ${question}\n\nProvide a grounded answer with citations.`;

    const response = await fetch(`${OLLAMA_BASE}/api/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama2:7b",
        system: systemPrompt,
        prompt: userPrompt,
        stream: false,
        temperature: 0.7,
        top_p: 0.9,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Ollama LLM request failed: ${response.statusText}`
      );
    }

    const data = (await response.json()) as { response: string };
    const rawAnswer = data.response || "";

    // Extract entry IDs from [Entry XXXXX] pattern
    const citationMatches = rawAnswer.match(/\[Entry\s+([A-Za-z0-9]+)\]/g) || [];
    const citations = [
      ...new Set(
        citationMatches.map((match) => match.match(/[A-Za-z0-9]+$/)?.[0] || "")
      ),
    ].filter(Boolean);

    return {
      answer: rawAnswer,
      citations,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to ask question: ${message}`);
  }
}
