/**
 * Tag Suggestion Service (AUTOTAG-02, AUTOTAG-03)
 *
 * On-demand, structured-output tag suggestions for the current journal entry.
 * Routes ALL LLM dispatch through hybridAIService.requestStructured (per AUTOTAG-02
 * "never ollamaService directly") and bounds output via JSON Schema `enum` of existing
 * tags + up to 2 new-tag proposals (per AUTOTAG-03).
 *
 * Contract: returns 0-3 suggestions; NEVER throws; returns [] on any failure so the
 * UI can gracefully degrade (sparkle button stays visible — D-03 / D-10).
 */

import * as hybridAI from "../lib/hybridAIService";

export interface TagSuggestion {
  name: string;    // lowercase kebab-case for new tags; existing-tag names as-is
  isNew: boolean;  // true when name does not appear in existingTagNames (case-insensitive)
}

const SYSTEM_PROMPT =
  "You are a tag-suggestion assistant for a personal journal. Read the entry and " +
  "propose 1-3 tags. Strongly prefer existing tags from the user's library — only " +
  "invent a new tag if no existing tag fits a clear theme of the entry. Tag names " +
  "must be lowercase, kebab-case (e.g. 'family-time', 'work-stress', 'reflection'). " +
  "Return strict JSON matching the provided schema.";

const MAX_CONTENT_CHARS = 4000;

/**
 * Build the JSON Schema for the LLM call.
 * Handles the empty-tags edge case: when existingTagNames is empty, we cannot emit
 * `enum: []` (some validators reject this as "no valid values"). Instead we emit
 * `existing: { type: "array", maxItems: 0 }` to signal "no existing tags allowed."
 */
function buildSchema(existingTagNames: string[]): object {
  const hasExisting = existingTagNames.length > 0;

  const existingProp = hasExisting
    ? {
        type: "array",
        items: { type: "string", enum: existingTagNames },
        maxItems: 3,
      }
    : {
        type: "array",
        maxItems: 0,
      };

  return {
    type: "object",
    properties: {
      existing: existingProp,
      new: {
        type: "array",
        items: {
          type: "string",
          pattern: "^[a-z0-9-]+$",
          minLength: 2,
          maxLength: 30,
        },
        maxItems: 2,
      },
    },
    required: ["existing", "new"],
    additionalProperties: false,
  };
}

/**
 * Request 1-3 tag suggestions for the given entry content.
 * Returns [] on any failure (no throws).
 */
export async function suggestTagsForEntry(
  content: string,
  existingTagNames: string[]
): Promise<TagSuggestion[]> {
  try {
    const schema = buildSchema(existingTagNames);
    const cappedContent = content.slice(0, MAX_CONTENT_CHARS);
    const existingList =
      existingTagNames.length > 0
        ? existingTagNames.join(", ")
        : "(user has no tags yet — propose new tags only)";
    const userPrompt = `Existing tags: ${existingList}\n\nEntry:\n${cappedContent}`;

    const raw = (await hybridAI.requestStructured(
      userPrompt,
      schema,
      SYSTEM_PROMPT
    )) as { existing?: unknown; new?: unknown };

    const rawExisting = Array.isArray(raw.existing) ? (raw.existing as unknown[]) : [];
    const rawNew = Array.isArray(raw.new) ? (raw.new as unknown[]) : [];

    const lowerExisting = existingTagNames.map((n) => n.toLowerCase());
    const seen = new Set<string>();
    const suggestions: TagSuggestion[] = [];

    // 1. Process "existing" items — must match an actual existing tag (case-insensitive)
    for (const item of rawExisting) {
      if (suggestions.length >= 3) break;
      if (typeof item !== "string") continue;
      const lower = item.toLowerCase();
      if (seen.has(lower)) continue;
      if (!lowerExisting.includes(lower)) continue; // defense-in-depth: enum should have enforced this
      seen.add(lower);
      suggestions.push({ name: item, isNew: false });
    }

    // 2. Process "new" items — must NOT match an existing tag (dedupe)
    for (const item of rawNew) {
      if (suggestions.length >= 3) break;
      if (typeof item !== "string") continue;
      const lower = item.toLowerCase();
      if (seen.has(lower)) continue;
      if (lowerExisting.includes(lower)) continue; // new item collides with an existing tag — drop
      seen.add(lower);
      suggestions.push({ name: item, isNew: true });
    }

    return suggestions;
  } catch (err) {
    console.error("[tag-suggestions] suggestTagsForEntry failed:", err);
    return [];
  }
}
