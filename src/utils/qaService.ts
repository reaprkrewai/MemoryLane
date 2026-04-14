/**
 * Q&A service implementing RAG (Retrieval-Augmented Generation) pattern.
 *
 * Pipeline:
 * 1. Retrieve: Use semantic search to find top K similar entries
 * 2. Augment: Build context string with entry content + metadata
 * 3. Generate: Send system prompt + context + question to Ollama LLM
 * 4. Extract: Parse response for [Entry ID] citations
 * 5. Display: Return answer + cited entry IDs
 */

import { semanticSearch } from "./vectorSearchService";
import {
  checkOllamaHealth,
  askQuestion as askQuestionOllama,
} from "../lib/ollamaService";

interface RetrievedEntry {
  id: string;
  content: string;
  created_at: number;
}

interface QAResult {
  answer: string;
  citedEntryIds: string[];
}

/**
 * Parse [Entry XXXXX] citations from LLM response.
 * Regex pattern: /\[Entry ([a-f0-9-]+)\]/g matches UUID format
 * Returns array of unique, deduped entry IDs.
 *
 * Example:
 * Input: "You felt stressed [Entry abc123]. Similar in [Entry def456]."
 * Output: ["abc123", "def456"]
 *
 * Example with duplicates:
 * Input: "Check entry [Entry xyz789] and [Entry xyz789]."
 * Output: ["xyz789"]
 */
export function parseCitations(text: string): string[] {
  // Match [Entry <uuid>] pattern
  // UUID format: 8-4-4-4-12 hex digits: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
  const citationPattern = /\[Entry\s+([a-f0-9-]+)\]/gi;
  const matches = text.matchAll(citationPattern);

  // Extract entry IDs and deduplicate
  const entryIds = new Set<string>();
  for (const match of matches) {
    const id = match[1];
    if (id) {
      entryIds.add(id.toLowerCase());
    }
  }

  return Array.from(entryIds);
}

/**
 * Build context string from retrieved entries.
 * Format: [Entry from DATE]\nCONTENT\n[End Entry ID]
 *
 * Example output:
 * [Entry from 2026-04-10]
 * Had a great day, promoted at work!
 * [End Entry xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx]
 *
 * [Entry from 2026-04-09]
 * Feeling anxious about project deadline.
 * [End Entry yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy]
 */
function buildContextString(entries: RetrievedEntry[]): string {
  return entries
    .map((e) => {
      const date = new Date(e.created_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
      return `[Entry from ${date}]\n${e.content}\n[End Entry ${e.id}]`;
    })
    .join("\n\n");
}

/**
 * Ask a natural language question about journal entries.
 * Implements full RAG pipeline:
 *
 * 1. Check LLM availability via Ollama health check
 * 2. If unavailable, return helpful error message
 * 3. Retrieve top K similar entries using semantic search (K=5-10)
 * 4. Build augmented prompt with entry context
 * 5. Send to Ollama LLM with system + user prompts
 * 6. Parse response for [Entry ID] citations
 * 7. Return { answer, citedEntryIds }
 *
 * @param question - User's natural language question
 * @param retrievedEntries - Pre-retrieved entries for context (optional, uses semantic search if not provided)
 * @returns { answer: string, citedEntryIds: string[] }
 * @throws Error if retrieval or LLM inference fails
 */
export async function askQuestion(
  question: string,
  retrievedEntries?: RetrievedEntry[]
): Promise<QAResult> {
  // Step 1: Check LLM availability
  const health = await checkOllamaHealth();

  if (!health.available || !health.llm) {
    return {
      answer:
        "Q&A requires a local LLM model. Please install Ollama and pull llama2:7b to use this feature. Visit ollama.com/download for setup instructions.",
      citedEntryIds: [],
    };
  }

  // Step 2: Retrieve entries if not provided
  let entries = retrievedEntries;
  if (!entries) {
    try {
      const searchResults = await semanticSearch(question, { limit: 10 });

      // Convert SearchEntry to RetrievedEntry (select only needed fields)
      entries = searchResults.map((r) => ({
        id: r.id,
        content: r.content,
        created_at: r.created_at,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to retrieve entries: ${message}`);
    }
  }

  // Step 3: Handle empty retrieval
  if (entries.length === 0) {
    return {
      answer:
        "I could not find any journal entries relevant to your question. Try asking about topics you have written about.",
      citedEntryIds: [],
    };
  }

  // Step 4: Build augmented prompt
  const contextString = buildContextString(entries);

  // Step 5: Call LLM
  try {
    const llmResult = await askQuestionOllama(question, contextString);

    // Step 6: Parse citations from response
    const citedEntryIds = parseCitations(llmResult.answer);

    // Step 7: Return result
    return {
      answer: llmResult.answer,
      citedEntryIds,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to generate answer: ${message}`);
  }
}
