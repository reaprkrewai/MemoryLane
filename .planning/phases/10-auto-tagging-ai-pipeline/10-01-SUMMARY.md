---
phase: 10
plan: "01"
subsystem: ai-pipeline
tags:
  - ai
  - llm
  - structured-output
  - auto-tagging
dependency_graph:
  requires:
    - src/lib/hybridAIService.ts (existing askQuestion pattern — cloned for requestStructured)
    - src/stores/aiStore.ts (useAIStore.getState().aiBackend dispatch)
  provides:
    - hybridAIService.requestStructured (structured-output LLM dispatcher)
    - tagSuggestionService.suggestTagsForEntry (tag suggestion contract for Wave 2)
    - TagSuggestion interface
  affects:
    - Wave 2 (Plan 03): TagSuggestButton calls suggestTagsForEntry
tech_stack:
  added: []
  patterns:
    - hybridAIService backend dispatch (if embedded → /v1/chat/completions + response_format; else → /api/chat + format)
    - JSON Schema constrained LLM output (enum on existing, pattern on new, additionalProperties:false)
    - Try/catch graceful fallback — returns [] on any failure
key_files:
  created:
    - src/utils/tagSuggestionService.ts
  modified:
    - src/lib/hybridAIService.ts
decisions:
  - "D-02: requestStructured added alongside askQuestion — Ollama /api/chat + format, embedded /v1/chat/completions + response_format"
  - "D-03: graceful [] fallback on any LLM failure — tagSuggestionService never throws"
  - "D-04: prompt locked — system prompt instructs kebab-case + prefer existing; user prompt caps content at 4000 chars"
  - "D-05: JSON Schema shape locked — enum on existing items, pattern on new items, maxItems 3+2, additionalProperties:false"
  - "D-19: hallucination prevention via enum constraint on existing.items"
  - "D-20: content cap at 4000 chars bounds token budget to ~1300 tokens total"
metrics:
  duration_seconds: 186
  completed_date: "2026-04-19"
  tasks_completed: 2
  tasks_total: 2
  files_created: 1
  files_modified: 1
---

# Phase 10 Plan 01: Structured-Output LLM Routing + Tag Suggestion Service Summary

**One-liner:** JWT-style backend dispatch via hybridAIService.requestStructured with JSON-Schema-constrained Ollama /api/chat and OpenAI-compat embedded endpoints, wrapped by tagSuggestionService that enforces enum + pattern + dedup and returns 0-3 TagSuggestion items or [] on any failure.

## What Was Built

### Task 1: requestStructured helper in hybridAIService.ts

Added three functions to `src/lib/hybridAIService.ts`:

**Public dispatcher** (exported, after `askQuestion` at line 74):
```typescript
export async function requestStructured(
  prompt: string,
  jsonSchema: object,
  systemPrompt?: string
): Promise<unknown>
```

**requestStructuredEmbedded** (private, in EMBEDDED section):
- POST `http://localhost:8189/v1/chat/completions`
- Body includes `response_format: { type: "json_schema", json_schema: { name: "tag_suggestions", schema: jsonSchema } }`
- Parses `data.choices?.[0]?.message?.content`
- temperature: 0.3, top_p: 0.9

**requestStructuredOllama** (private, in OLLAMA section):
- POST `http://localhost:11434/api/chat` (NOT /api/generate — Pitfall 1 avoided)
- Body includes `format: jsonSchema` (schema object directly, no wrapper)
- Parses `data.message?.content` (NOT data.response — /api/chat shape)
- model: "llama2:7b" (matches existing askOllamaQuestion for consistency)
- temperature: 0.3, top_p: 0.9

Existing `askQuestion`, `askEmbeddedQuestion`, `askOllamaQuestion` are byte-identical — zero non-regression risk for DASH-12 AI Insights.

### Task 2: tagSuggestionService.ts (NEW)

`src/utils/tagSuggestionService.ts` — 126 lines, cloning `insightService.ts` shape.

**Exports:**
- `TagSuggestion` interface: `{ name: string; isNew: boolean }`
- `suggestTagsForEntry(content, existingTagNames): Promise<TagSuggestion[]>`

**JSON Schema (buildSchema helper):**
```json
{
  "type": "object",
  "properties": {
    "existing": { "type": "array", "items": { "type": "string", "enum": [...existingTagNames] }, "maxItems": 3 },
    "new": { "type": "array", "items": { "type": "string", "pattern": "^[a-z0-9-]+$", "minLength": 2, "maxLength": 30 }, "maxItems": 2 }
  },
  "required": ["existing", "new"],
  "additionalProperties": false
}
```

**Empty-tags edge case:** When `existingTagNames.length === 0`, emits `existing: { type: "array", maxItems: 0 }` instead of `enum: []` (Pitfall 3 avoided).

**Post-processing:**
1. Processes `existing` items first — validates each against `lowerExisting` (defense-in-depth despite enum constraint)
2. Processes `new` items — drops any that collide with existing tags (case-insensitive)
3. Caps total at 3
4. Case-insensitive dedup via `seen: Set<string>` across both buckets

**Content cap:** `content.slice(0, 4000)` before insertion into user prompt (D-20).

**Error handling:** Entire body in `try/catch`; logs `console.error("[tag-suggestions] suggestTagsForEntry failed:", err)` and returns `[]` on any failure.

## Decisions Honored

| Decision | How Honored |
|----------|------------|
| D-01 | tagSuggestionService.ts created, exports TagSuggestion + suggestTagsForEntry |
| D-02 | requestStructured added to hybridAIService; Ollama /api/chat + format; embedded /v1/chat/completions + response_format |
| D-03 | try/catch in suggestTagsForEntry returns [] on any failure; sparkle button stays visible |
| D-04 | System prompt locked; user prompt with content.slice(0,4000) |
| D-05 | JSON Schema shape locked with enum/pattern/maxItems/additionalProperties:false |
| D-19 | enum constraint on existing.items prevents hallucinated existing-tag names |
| D-20 | MAX_CONTENT_CHARS = 4000 bounds token budget |

## Pitfalls Avoided

1. **Pitfall 1 — Ollama /api/generate vs /api/chat:** requestStructuredOllama explicitly uses `/api/chat` with `messages[]` array and parses `data.message.content`. The existing `askOllamaQuestion` uses `/api/generate` and was NOT modified.

2. **Pitfall 3 — Empty enum:** When `existingTagNames.length === 0`, `buildSchema` emits `{ type: "array", maxItems: 0 }` instead of `{ type: "array", items: { enum: [] } }`.

## Downstream Consumer (Wave 2 — Plan 03)

Plan 03 imports:
```typescript
import { suggestTagsForEntry, TagSuggestion } from "../utils/tagSuggestionService";
```

And calls:
```typescript
const suggestions = await suggestTagsForEntry(content, existingTagNames);
// suggestions: TagSuggestion[] — 0 to 3 items, never throws
```

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | 964f0f2 | feat(10-01): add requestStructured helper to hybridAIService |
| Task 2 | 4daee36 | feat(10-01): create tagSuggestionService with structured-output LLM integration |

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- [x] `src/lib/hybridAIService.ts` exists with `export async function requestStructured`
- [x] `src/utils/tagSuggestionService.ts` exists, 126 lines (>=60)
- [x] TypeScript compiles clean (`npx tsc --noEmit` — no output)
- [x] Production build succeeds (`npm run build` — built in 8.68s)
- [x] Commit 964f0f2 exists (Task 1)
- [x] Commit 4daee36 exists (Task 2)
- [x] No `enum: []` in executable code (only in JSDoc comment)
- [x] No `ollamaService` import in either file (only in JSDoc comment in tagSuggestionService.ts)
- [x] `askQuestion`/`askEmbeddedQuestion`/`askOllamaQuestion` unchanged — `git diff HEAD~2 HEAD -- src/lib/hybridAIService.ts` shows zero removed lines
