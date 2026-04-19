/**
 * Hybrid AI Service
 * Routes between embedded llama.cpp server and external Ollama based on user preference.
 * Provides a unified interface for embedding generation and LLM inference.
 */

import { useAIStore } from "../stores/aiStore";

export interface HealthStatus {
  available: boolean;
  embedding: boolean;
  llm: boolean;
}

const EMBEDDED_PORT = 8189;
const OLLAMA_PORT = 11434;

/**
 * Check health of the active AI backend (embedded or Ollama)
 */
export async function checkAIHealth(): Promise<HealthStatus> {
  const backend = useAIStore.getState().aiBackend;

  if (backend === "embedded") {
    return checkEmbeddedHealth();
  } else {
    return checkOllamaHealth();
  }
}

/**
 * Generate embeddings using the active backend
 */
export async function generateEmbedding(content: string): Promise<number[]> {
  const backend = useAIStore.getState().aiBackend;

  if (backend === "embedded") {
    return generateEmbeddedEmbedding(content);
  } else {
    return generateOllamaEmbedding(content);
  }
}

/**
 * Ask a question using the active backend
 * Returns { answer: string, citations: string[] }
 */
export async function askQuestion(
  question: string,
  context: string
): Promise<{ answer: string; citations: string[] }> {
  const backend = useAIStore.getState().aiBackend;

  if (backend === "embedded") {
    return askEmbeddedQuestion(question, context);
  } else {
    return askOllamaQuestion(question, context);
  }
}

/**
 * Request structured JSON output from the active AI backend.
 * Ollama: uses /api/chat + `format` parameter (JSON Schema constrained decoding).
 * Embedded: uses /v1/chat/completions + `response_format` (OpenAI-compat JSON Schema).
 *
 * Returns the parsed JSON object matching the schema. Throws on HTTP error or
 * JSON parse failure — callers are responsible for catching (tagSuggestionService
 * wraps this in try/catch and returns [] on any failure per D-03 graceful fallback).
 *
 * CRITICAL: Ollama's `format` parameter is only honored on /api/chat, NOT /api/generate.
 * The existing askOllamaQuestion uses /api/generate by design (Q&A with streaming-style
 * prompt); do not refactor it — instead this new helper uses /api/chat.
 */
export async function requestStructured(
  prompt: string,
  jsonSchema: object,
  systemPrompt?: string
): Promise<unknown> {
  const backend = useAIStore.getState().aiBackend;

  if (backend === "embedded") {
    return requestStructuredEmbedded(prompt, jsonSchema, systemPrompt);
  } else {
    return requestStructuredOllama(prompt, jsonSchema, systemPrompt);
  }
}

// ============================================================================
// EMBEDDED LLAMA.CPP SERVER (OpenAI-compatible API)
// ============================================================================

async function checkEmbeddedHealth(): Promise<HealthStatus> {
  try {
    const response = await fetch(`http://localhost:${EMBEDDED_PORT}/health`, {
      signal: AbortSignal.timeout(3000),
    });

    if (!response.ok) {
      return { available: false, embedding: false, llm: false };
    }

    // Embedded server supports both embeddings and completions
    return {
      available: true,
      embedding: true,
      llm: true,
    };
  } catch (_err) {
    return { available: false, embedding: false, llm: false };
  }
}

async function generateEmbeddedEmbedding(content: string): Promise<number[]> {
  const url = `http://localhost:${EMBEDDED_PORT}/v1/embeddings`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      input: content,
      model: "local", // llama-server doesn't require explicit model name
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to generate embedding: ${response.statusText}`);
  }

  const data = await response.json();
  // OpenAI-compatible response: { data: [{ embedding: number[] }] }
  if (data.data && data.data[0] && data.data[0].embedding) {
    return data.data[0].embedding;
  }

  throw new Error("Invalid embedding response format");
}

async function askEmbeddedQuestion(
  question: string,
  context: string
): Promise<{ answer: string; citations: string[] }> {
  const url = `http://localhost:${EMBEDDED_PORT}/v1/chat/completions`;

  const systemPrompt = `You are a helpful assistant analyzing journal entries. Use the provided context to answer questions.
When referencing specific entries, cite them using the format: [Entry UUID]
Keep responses concise and thoughtful.`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "local",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Context:\n${context}\n\nQuestion: ${question}` },
      ],
      temperature: 0.7,
      top_p: 0.9,
      stream: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to ask question: ${response.statusText}`);
  }

  const data = await response.json();
  const answer = data.choices?.[0]?.message?.content || "";

  // Parse citations in format [Entry UUID]
  const citations = parseCitations(answer);

  return { answer, citations };
}

async function requestStructuredEmbedded(
  prompt: string,
  jsonSchema: object,
  systemPrompt?: string
): Promise<unknown> {
  const url = `http://localhost:${EMBEDDED_PORT}/v1/chat/completions`;

  const messages: Array<{ role: "system" | "user"; content: string }> = [];
  if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
  messages.push({ role: "user", content: prompt });

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "local",
      messages,
      stream: false,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "tag_suggestions",
          schema: jsonSchema,
        },
      },
      temperature: 0.3,
      top_p: 0.9,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Embedded structured request failed: ${response.statusText}`
    );
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Empty response from embedded backend");
  }
  return JSON.parse(content);
}

// ============================================================================
// OLLAMA (Ollama-compatible API)
// ============================================================================

async function checkOllamaHealth(): Promise<HealthStatus> {
  try {
    const response = await fetch(`http://localhost:${OLLAMA_PORT}/api/tags`, {
      signal: AbortSignal.timeout(3000),
    });

    if (!response.ok) {
      return { available: false, embedding: false, llm: false };
    }

    const data = await response.json();
    const models = data.models || [];

    const hasEmbedding = models.some((m: any) =>
      m.name.includes("nomic-embed-text")
    );
    const hasLlm = models.some((m: any) => m.name.includes("llama"));

    return {
      available: true,
      embedding: hasEmbedding,
      llm: hasLlm,
    };
  } catch (_err) {
    return { available: false, embedding: false, llm: false };
  }
}

async function generateOllamaEmbedding(content: string): Promise<number[]> {
  const url = `http://localhost:${OLLAMA_PORT}/api/embed`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "nomic-embed-text",
      input: content,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to generate embedding: ${response.statusText}`);
  }

  const data = await response.json();
  if (data.embeddings && data.embeddings[0]) {
    return data.embeddings[0];
  }

  throw new Error("Invalid embedding response format");
}

async function askOllamaQuestion(
  question: string,
  context: string
): Promise<{ answer: string; citations: string[] }> {
  const url = `http://localhost:${OLLAMA_PORT}/api/generate`;

  const systemPrompt = `You are a helpful assistant analyzing journal entries. Use the provided context to answer questions.
When referencing specific entries, cite them using the format: [Entry UUID]
Keep responses concise and thoughtful.`;

  const prompt = `Context:\n${context}\n\nQuestion: ${question}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "llama2:7b",
      prompt,
      system: systemPrompt,
      stream: false,
      temperature: 0.7,
      top_p: 0.9,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to ask question: ${response.statusText}`);
  }

  const data = await response.json();
  const answer = data.response || "";

  // Parse citations in format [Entry UUID]
  const citations = parseCitations(answer);

  return { answer, citations };
}

async function requestStructuredOllama(
  prompt: string,
  jsonSchema: object,
  systemPrompt?: string
): Promise<unknown> {
  // CRITICAL: /api/chat — NOT /api/generate. Ollama only honors `format` on the chat endpoint.
  const url = `http://localhost:${OLLAMA_PORT}/api/chat`;

  const messages: Array<{ role: "system" | "user"; content: string }> = [];
  if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
  messages.push({ role: "user", content: prompt });

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "llama2:7b", // matches existing askOllamaQuestion model string for consistency
      messages,
      stream: false,
      format: jsonSchema, // schema object passed directly — no wrapper key (distinct from OpenAI spec)
      temperature: 0.3,
      top_p: 0.9,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Ollama structured request failed: ${response.statusText}`
    );
  }

  const data = await response.json();
  const content = data.message?.content; // /api/chat response shape — NOT data.response
  if (!content) {
    throw new Error("Empty response from Ollama");
  }
  return JSON.parse(content);
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Extract entry citations from LLM response
 * Looks for patterns like [Entry UUID] or [Entry from DATE]
 */
function parseCitations(text: string): string[] {
  const citationPattern = /\[Entry\s+([A-Fa-f0-9\-]+)\]/g;
  const citations: string[] = [];
  let match;

  while ((match = citationPattern.exec(text)) !== null) {
    const entryId = match[1];
    if (!citations.includes(entryId)) {
      citations.push(entryId);
    }
  }

  return citations;
}
