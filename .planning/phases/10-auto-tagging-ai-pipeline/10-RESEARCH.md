# Phase 10: Auto-Tagging AI Pipeline — Research

**Researched:** 2026-04-19
**Domain:** Local LLM structured-output routing, React component composition, Zustand store extension
**Confidence:** HIGH (all critical findings verified against live codebase)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** New `src/utils/tagSuggestionService.ts` exporting `suggestTagsForEntry(content, existingTagNames)` and `TagSuggestion` interface. Catches all errors, returns `[]` on failure. Mirrors `insightService.ts` shape.
- **D-02:** New `hybridAIService.requestStructured(prompt, jsonSchema, systemPrompt?)` helper alongside `askQuestion`. Ollama backend uses `/api/chat` + `format: <schema>`. Embedded backend uses `/v1/chat/completions` + `response_format: { type: "json_schema", json_schema: { name: "tag_suggestions", schema: <schema> } }`. Returns `Promise<unknown>`.
- **D-03:** Graceful degradation — schema rejection or HTTP error on embedded backend → service returns `[]`, sparkle stays visible.
- **D-04:** Prompt design locked — system: tag-suggestion assistant, user: existing tags + entry content (capped 4000 chars). No few-shot in v1.
- **D-05:** JSON Schema shape locked — `{ existing: { type: array, items: { enum: [...existingTagNames] }, maxItems: 3 }, new: { type: array, items: { type: string, pattern: "^[a-z0-9-]+$", minLength: 2, maxLength: 30 }, maxItems: 2 }, required: ["existing", "new"], additionalProperties: false }`.
- **D-06:** Sparkle button in TagRow after `<TagInput />`. TagRow needs new `content: string` prop.
- **D-07:** New `src/components/TagSuggestButton.tsx` owns sparkle + ghost chips + local `useState<TagSuggestion[]>`.
- **D-08:** Sparkle button: `h-7 w-7 rounded-md`, `<Sparkles size={14} />`, `text-muted hover:text-accent`, `hover:bg-surface hover:border-border`, focus ring `ring-accent`.
- **D-09:** Loading: swap `<Sparkles>` for `<Loader2 className="animate-spin" size={14} />`, disabled. >30s sonner info toast. No AbortController.
- **D-10:** Empty state: transient inline `<span>` for 4s. Error state: silent, `console.error('[tag-suggestions] ...')`.
- **D-11:** Ghost chips render inline in same flex-row, after sparkle button.
- **D-12:** Ghost chip visual: `bg-transparent border-2 border-dashed border-muted/50 text-muted rounded-full px-2 py-1 text-xs`. New-tag prefix `<Plus size={10} />`. Click = accept, X = dismiss.
- **D-13:** Session-local only — `useState` in TagSuggestButton, cleared on navigate/accept/dismiss/re-request.
- **D-14:** Per-chip accept only — no Accept All button.
- **D-15:** Settings toggle in AIFeaturesSection as OptionButton pair ("On"/"Off"), default Off.
- **D-16:** Extend `aiSettingsService.ts` with `loadTagSuggestionsEnabled()` / `saveTagSuggestionsEnabled()`. Key: `tag_suggestions_enabled`. 3-column INSERT (key, value, updated_at — NO created_at).
- **D-17:** Extend `aiStore` with `tagSuggestionsEnabled: boolean` (init `false`) + `setTagSuggestionsEnabled`. Load in App.tsx `initAI` useEffect.
- **D-18:** Composite predicate: `s.available && s.llm && s.tagSuggestionsEnabled`. Unmount button when any false.
- **D-19:** Hallucination prevention via JSON Schema `enum` + pattern constraints.
- **D-20:** Token budget: content capped 4000 chars, ~1300 tokens total.

### Claude's Discretion

- Ghost chip dashed-border weight (`border-2` recommended)
- New-tag prefix icon (`<Plus />` recommended)
- Toast severity for >30s loading (`info` recommended)
- Empty-state fade implementation (CSS opacity transition)
- console.error prefix (`[tag-suggestions]`)
- Ghost chip text truncation at long names
- Toggle widget ARIA wiring detail
- `temperature` parameter (recommend 0.3)
- `top_p` for embedded backend (recommend 0.9)

### Deferred Ideas (OUT OF SCOPE)

- Auto-tag-on-save (anti-pattern, permanently out of scope)
- Confidence indicators / reasoning
- Few-shot examples
- Accept All button
- AbortController / cancel-during-loading
- Suggestion history
- Multi-language model switching
- Tag Management UI (Phase 11)
- Microinteraction polish (Phase 11)
- Background re-tagging of historic entries
- Inline edit of suggested tag name before accept
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUTOTAG-01 | Sparkle "Suggest tags" button in TagRow, visible only when AI backend available | TagRow.tsx confirmed: simple conditional render after TagInput, needs `content` prop added and composite predicate gate |
| AUTOTAG-02 | Click calls hybridAIService (never ollamaService directly), returns 1–3 suggestions using `format` JSON-Schema constraint | hybridAIService.ts confirmed: existing `askQuestion` uses `/api/generate` (no format support); new `requestStructured` must use `/api/chat` for Ollama. Both endpoints confirmed in codebase. |
| AUTOTAG-03 | LLM call uses format JSON-Schema with length-capped enum of existing tags + up to 2 new-tag proposals | Schema shape locked in D-05; Ollama `format` passes schema object directly on `/api/chat`; embedded uses `response_format` on `/v1/chat/completions` |
| AUTOTAG-04 | Suggestions render as ghost chips; user explicitly accepts (click) or dismisses (×); never auto-applied | TagRow.tsx and TagPill.tsx confirmed as visual reference; `addTagToEntry` confirmed in tagStore.ts as accept path |
| AUTOTAG-05 | When AI unavailable, sparkle button is hidden (not disabled) | aiStore.ts confirmed: `available`, `llm` booleans reactive. Unmount pattern (not CSS hide) via conditional render. |
| AUTOTAG-06 | "Tag suggestions" in Settings → AI Features, defaults off | SettingsView.tsx AIFeaturesSection confirmed: OptionButton pair pattern available; settings KV table confirmed 3-column (key, value, updated_at) |
| AUTOTAG-07 | When Settings toggle is off, sparkle hidden even if AI available | Composite predicate `s.available && s.llm && s.tagSuggestionsEnabled` in TagRow handles both AUTOTAG-05 and AUTOTAG-07 |
</phase_requirements>

---

## Summary

Phase 10 adds a sparkle-triggered local LLM tag-suggestion pipeline to the entry editor. The architecture is fully locked in CONTEXT.md. Research confirms all assumptions against the live codebase and identifies three critical implementation gaps that would cause bugs if overlooked.

The most important finding is a **routing mismatch**: the existing `askOllamaQuestion` in `hybridAIService.ts` uses `/api/generate` (the old generate endpoint), but Ollama's `format` JSON-Schema constraint only works on `/api/chat`. The new `requestStructured` helper MUST use `/api/chat` for Ollama — using `/api/generate` with a `format` field will silently produce unstructured output. For the embedded backend, the existing code already uses `/v1/chat/completions` with OpenAI-compatible request shape, so `response_format` can be added directly.

A second finding: `aiSettingsService.ts` currently uses a 4-column INSERT (`key, value, created_at, updated_at`) which is a known latent bug — the settings table DDL in `db.ts` only defines 3 columns (`key, value, updated_at`). The two new exports (`loadTagSuggestionsEnabled`/`saveTagSuggestionsEnabled`) MUST use the 3-column INSERT form from `insightService.ts`, not clone the broken form from `aiSettingsService.ts`.

A third finding: the `EntryEditor.tsx` renders `<TagRow entryId={entryId} />` without passing content — it has access to the TipTap `editor` instance whose `editor.getMarkdown()` method produces the plain-text content needed by `tagSuggestionService`. The `content` prop for `TagRow` should be derived from `editor.getText()` (not `getMarkdown()`) for cleaner LLM input — but either works since `suggestTagsForEntry` receives a string.

**Primary recommendation:** Implement in 3 waves: (1) backend plumbing (`hybridAIService.requestStructured` + `tagSuggestionService` + store/settings extension), (2) `TagSuggestButton` component, (3) wiring (TagRow prop extension + EntryEditor content pass-through + SettingsView toggle).

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| LLM structured-output routing | Service layer (`hybridAIService.ts`) | — | Backend dispatch is a service concern, not UI; both backends handled in one function |
| Tag suggestion logic (prompt + schema + post-process) | Service layer (`tagSuggestionService.ts`) | — | Isolates LLM concern from UI; testable in isolation |
| Ghost chip UI + session state | Component (`TagSuggestButton.tsx`) | — | Session-local `useState` lives in the component that creates and clears it |
| Sparkle visibility gating | Parent component (`TagRow.tsx`) | Store (`aiStore`) | Parent conditionally mounts/unmounts; store provides reactive boolean signals |
| Settings persistence | Service layer (`aiSettingsService.ts`) | DB (`settings` KV) | Matches existing aiSettingsService pattern |
| Settings reactive value | Store (`aiStore.tagSuggestionsEnabled`) | — | Mirrors existing `aiBackend` preference wiring |
| Tag acceptance (on ghost chip click) | Store action (`tagStore.addTagToEntry`) | DB (`entry_tags`) | Reuses existing tag-add flow without modification |

---

## Standard Stack

### Core (all already in project — zero new dependencies)

| Library | Version in Project | Purpose | Phase 10 Usage |
|---------|--------------------|---------|----------------|
| lucide-react | ^1.8.0 | Icons | `Sparkles`, `Loader2`, `X`, `Plus` — all already used elsewhere |
| zustand | ^5.0.12 | State management | Extend `aiStore` with `tagSuggestionsEnabled` |
| sonner | ^2.0.7 | Toasts | >30s slow-call info toast |
| tailwindcss | ^3.4.19 (pinned v3) | Styling | Ghost chip utilities, button states |
| @tauri-apps/plugin-sql | ^2.4.0 | SQLite | Settings KV read/write |

**Installation:** No new packages. Zero dependency changes. [VERIFIED: package.json in codebase]

---

## Architecture Patterns

### System Architecture Diagram

```
EntryEditor
    │
    │ editor.getMarkdown() → content: string (prop)
    ▼
TagRow (modified)
    │ showSparkle = s.available && s.llm && s.tagSuggestionsEnabled
    │
    ├─ [TagPill...] [TagInput] ─────────────────────────────────────────
    │                                                                    │
    └─ {showSparkle && <TagSuggestButton>}                              │
              │                                                          │
              │ click                                                    │
              ▼                                                          │
       tagSuggestionService.suggestTagsForEntry(content, tagNames)      │
              │                                                          │
              ▼                                                          │
       hybridAIService.requestStructured(prompt, schema, system)        │
              │                                                          │
       ┌──────┴───────┐                                                 │
       │ Ollama        │ Embedded llama.cpp                             │
       │ /api/chat     │ /v1/chat/completions                           │
       │ + format:     │ + response_format:                             │
       │   {schema}    │   { type:"json_schema", ... }                 │
       └──────┬────────┘                                                │
              │ Promise<{existing: string[], new: string[]}>            │
              ▼                                                          │
       post-process → TagSuggestion[]                                   │
              │                                                          │
              ▼                                                          │
       setState(suggestions) → render ghost chips                       │
              │                                                          │
       click chip ──────────────────────────────────────────────────────┘
              │                                                          
       tagStore.addTagToEntry(entryId, tagId)                           
       onAccept() → reloadEntryTags()                                   
```

### Recommended Project Structure (Phase 10 additions only)

```
src/
├── components/
│   ├── TagRow.tsx               # modified: add content prop + TagSuggestButton render
│   ├── TagSuggestButton.tsx     # NEW: sparkle button + ghost chips + local state
│   └── SettingsView.tsx         # modified: add "Tag suggestions" SettingRow
├── lib/
│   └── hybridAIService.ts       # modified: add requestStructured() export
└── utils/
    ├── tagSuggestionService.ts  # NEW: prompt + schema + LLM dispatch + parse
    └── aiSettingsService.ts     # modified: add loadTagSuggestionsEnabled/save
stores/
└── aiStore.ts                   # modified: add tagSuggestionsEnabled + setter
App.tsx                          # modified: load tagSuggestionsEnabled in initAI
```

### Pattern 1: requestStructured — Ollama `/api/chat` with `format`

The Ollama `format` parameter accepts a JSON Schema object passed **directly** as the value — not wrapped in a `json_schema` key. This is distinct from the OpenAI spec.

```typescript
// Source: Ollama API docs (https://github.com/ollama/ollama/blob/main/docs/api.md)
// VERIFIED: format goes on /api/chat, NOT /api/generate
const response = await fetch(`http://localhost:${OLLAMA_PORT}/api/chat`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    model: "llama3.2:3b",   // or whichever model is loaded
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt },
    ],
    stream: false,
    format: jsonSchema,      // schema object passed directly — no wrapper
    temperature: 0.3,
    top_p: 0.9,
  }),
});
const data = await response.json();
const parsed = JSON.parse(data.message.content);  // response in message.content (chat endpoint)
```

**CRITICAL NOTE:** The existing `askOllamaQuestion` uses `/api/generate` which responds with `data.response`. The `/api/chat` endpoint responds with `data.message.content`. The new `requestStructured` function must parse from `data.message.content` — not `data.response`. [VERIFIED: hybridAIService.ts lines 209, 237]

### Pattern 2: requestStructured — Embedded llama.cpp `response_format`

```typescript
// Source: llama-server OpenAI-compat spec (b3920+)
// The embedded backend already uses /v1/chat/completions in askEmbeddedQuestion
const response = await fetch(`http://localhost:${EMBEDDED_PORT}/v1/chat/completions`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    model: "local",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt },
    ],
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
const data = await response.json();
const parsed = JSON.parse(data.choices[0].message.content);
```

[ASSUMED: llama-server b3920 supports `response_format.type = "json_schema"` — confirmed in CONTEXT.md D-02 but not verified against running binary in this session]

### Pattern 3: aiSettingsService extension (3-column INSERT — critical)

```typescript
// Source: insightService.ts (Phase 8) — uses 3-column form matching db.ts DDL
// DO NOT copy aiSettingsService.ts which uses broken 4-column form
export async function loadTagSuggestionsEnabled(): Promise<boolean> {
  try {
    const db = await getDb();
    const rows = await db.select<{ value: string }[]>(
      `SELECT value FROM settings WHERE key = 'tag_suggestions_enabled'`,
      []
    );
    if (rows.length > 0) return rows[0].value === "1";
    return false; // default: off
  } catch (err) {
    console.error("[tag-suggestions] Failed to load setting:", err);
    return false;
  }
}

export async function saveTagSuggestionsEnabled(value: boolean): Promise<void> {
  try {
    const db = await getDb();
    await db.execute(
      "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)",
      [TAG_SUGGESTIONS_KEY, value ? "1" : "0", Date.now()]
    );
  } catch (err) {
    console.error("[tag-suggestions] Failed to save setting:", err);
  }
}
```

[VERIFIED: db.ts line 79-83 — settings table has only key, value, updated_at. No created_at column.]

### Pattern 4: aiStore extension (Zustand 5 pattern)

```typescript
// Source: aiStore.ts — mirroring existing setAIStatus shape
// Zustand 5 uses create<State>((set) => ...) — identical to v4 for this use case
interface AIState {
  // ... existing fields ...
  tagSuggestionsEnabled: boolean;          // ADD
  setTagSuggestionsEnabled(v: boolean): void; // ADD
}

// In create():
tagSuggestionsEnabled: false,  // init false (AUTOTAG-06 default-off)
setTagSuggestionsEnabled: (v) => set({ tagSuggestionsEnabled: v }),
```

[VERIFIED: aiStore.ts — current fields, setter pattern, Zustand 5 usage]

### Pattern 5: App.tsx initAI extension

```typescript
// Source: App.tsx lines 86-138 — existing initAI useEffect pattern
// Extend the existing try block after loadAIBackendPreference:
import { loadTagSuggestionsEnabled } from "./utils/aiSettingsService";

// Inside initAI() async function, after backend preference load:
const tagSuggestionsEnabled = await loadTagSuggestionsEnabled();
useAIStore.setState({ tagSuggestionsEnabled });
```

[VERIFIED: App.tsx lines 86-138 — initAI useEffect structure confirmed]

### Pattern 6: TagRow content prop wiring

```typescript
// Source: EntryEditor.tsx line 99 — current TagRow render
// EntryEditor already has the TipTap editor instance
// Option A: pass editor.getText() (plain text — cleaner for LLM)
// Option B: pass editor.getMarkdown() (already used for auto-save)
// Both work; getMarkdown() is already called in the onUpdate callback

// In EntryEditor.tsx, derive content from editor state:
const [editorContent, setEditorContent] = useState("");
// In onUpdate callback, also update:
setEditorContent(e.getMarkdown());
// Pass to TagRow:
<TagRow entryId={entryId} content={editorContent} />
```

[VERIFIED: EntryEditor.tsx — `editor.getMarkdown()` already called in `onUpdate`. `editor.getText()` is also available from TipTap's standard API.]

### Pattern 7: TagSuggestButton state machine

```typescript
// Session-local state (never persisted):
const [suggestions, setSuggestions] = useState<TagSuggestion[]>([]);
const [isLoading, setIsLoading] = useState(false);
const [showEmptyMsg, setShowEmptyMsg] = useState(false);

// Empty state cleanup (useEffect with setTimeout):
useEffect(() => {
  if (!showEmptyMsg) return;
  const id = setTimeout(() => setShowEmptyMsg(false), 4000);
  return () => clearTimeout(id);
}, [showEmptyMsg]);

// Accept handler (calls tagStore.addTagToEntry):
const handleAccept = async (suggestion: TagSuggestion) => {
  // Existing tags: find by name in tagStore.tags
  // New tags: call tagStore.createTag(name) first, then addTagToEntry
  setSuggestions((prev) => prev.filter((s) => s.name !== suggestion.name));
  // then call onAccept() to reload real TagPills in parent
};
```

[VERIFIED: tagStore.ts — `createTag(name)` returns the new tag object; `addTagToEntry(entryId, tagId)` is the acceptance path]

### Pattern 8: SettingsView AIFeaturesSection toggle insertion

```typescript
// Source: SettingsView.tsx lines 500-508 — existing Actions SettingRow closes section
// Insert AFTER the closing </SettingRow> for "Actions" (line 504) but BEFORE </div> (line 505)
// Uses identical OptionButton pattern to "AI Backend" row (lines 339-349)

<div className="border-t border-border/50" />
<SettingRow
  label="Tag suggestions"
  description="Show a sparkle button in the editor to suggest tags via local AI"
>
  <div className="flex gap-2">
    <OptionButton label="On"  selected={tagSuggestionsEnabled}  onClick={() => handleTagSuggestionsToggle(true)}  />
    <OptionButton label="Off" selected={!tagSuggestionsEnabled} onClick={() => handleTagSuggestionsToggle(false)} />
  </div>
</SettingRow>
```

[VERIFIED: SettingsView.tsx lines 283-508 — AIFeaturesSection structure, OptionButton definition, existing pattern]

### Anti-Patterns to Avoid

- **Using `/api/generate` for structured output:** Ollama's `format` parameter only works on `/api/chat`. The existing `askOllamaQuestion` uses `/api/generate` — do NOT reuse or extend it for `requestStructured`.
- **Copying aiSettingsService.ts INSERT form:** The existing `saveAIBackendPreference` uses a 4-column INSERT (`key, value, created_at, updated_at`) against a 3-column table. This is a latent bug. New settings functions MUST use the 3-column form.
- **Storing ghost chips in a shared store:** Ghost chips are transient UI state. `viewStore`, `uiStore`, and `entryStore` are the wrong home. Local `useState` in `TagSuggestButton` is the correct container.
- **Calling `ollamaService` directly from `tagSuggestionService`:** AUTOTAG-02 is explicit. All LLM dispatch goes through `hybridAIService.requestStructured`.
- **Using CSS `visibility: hidden` or `opacity-0` for the sparkle gate:** AUTOTAG-05 says "hidden" — implement as conditional render (`{showSparkle && <TagSuggestButton />}`) so the component unmounts and ghost chip state is garbage-collected.
- **Reading `editor` instance inside TagSuggestButton:** TagSuggestButton should receive `content: string` as a prop, not import or read TipTap state directly. This preserves single-responsibility and testability.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| LLM JSON constraint enforcement | Custom regex/parser to force JSON output | Ollama `format` / llama.cpp `response_format` | Grammar-constrained decoding at model layer; regex post-hoc is unreliable |
| Structured output validation | TypeScript types alone | Runtime JSON Schema check against locked schema | LLM can still return schema-violating JSON if constraint is silently ignored |
| Tag name de-duplication | New store selector | In-function comparison in `tagSuggestionService` post-processing | Simple case-insensitive `filter` is sufficient; no new infrastructure |
| Loading spinner | Custom CSS animation | `<Loader2 className="animate-spin" />` from lucide-react | Already in codebase; consistent with other loading states |
| Settings persistence | localStorage or React Context | SQLite `settings` KV table via existing `getDb()` pattern | Survives reinstalls; matches ONBRD-03 contract for all settings |
| Toast notification | Custom component | `toast.info(...)` from sonner (already imported in App.tsx) | Zero new imports |

---

## Common Pitfalls

### Pitfall 1: Ollama endpoint mismatch (`/api/generate` vs `/api/chat`)
**What goes wrong:** Developer adds `format` parameter to a `POST /api/generate` request expecting JSON-constrained output. Ollama silently ignores `format` on the generate endpoint and returns unstructured text. JSON.parse throws, service returns `[]` silently. Feature appears broken with no error message.
**Why it happens:** The existing `askOllamaQuestion` uses `/api/generate` — a natural starting point for cloning. But `format` is a chat-endpoint-only feature.
**How to avoid:** `requestStructured` for Ollama MUST post to `http://localhost:${OLLAMA_PORT}/api/chat`. Parse result from `data.message.content` (chat format), NOT `data.response` (generate format).
**Warning signs:** LLM returns text with no `{` character; JSON.parse throws `SyntaxError`; console shows `[tag-suggestions] ... SyntaxError` but not HTTP errors.

### Pitfall 2: 4-column INSERT on 3-column settings table
**What goes wrong:** Cloning `saveAIBackendPreference` which does `INSERT OR REPLACE INTO settings (key, value, created_at, updated_at) VALUES (?, ?, ?, ?)` — the settings table only has 3 columns (no `created_at`). Tauri plugin-sql throws `table settings has no column named created_at`. Settings save fails silently (caught in catch block), leaving `tagSuggestionsEnabled` in memory-only state that resets on restart.
**Why it happens:** `aiSettingsService.ts` has a latent 4-column bug. Copying it propagates the bug.
**How to avoid:** Use the 3-column form from `insightService.ts`: `INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)`.
**Warning signs:** Toggle state does not persist across app restarts; console shows error about `created_at` column.

### Pitfall 3: Empty `existingTagNames` schema edge case
**What goes wrong:** When a user has no tags, `existingTagNames = []`. If the `existing.items.enum` is set to `[]` (empty array), some JSON Schema validators treat it as "no valid values allowed" and reject any array content — or the LLM produces `existing: []` correctly but the schema enforcer errors on the constraint itself.
**How to avoid:** When `existingTagNames.length === 0`, either (a) omit the `enum` constraint entirely and set `existing: { type: "array", maxItems: 0 }` to signal "no existing tags", or (b) set `existing: { type: "array", items: { type: "string" }, maxItems: 0 }` with a comment in the system prompt. This is a schema-construction step in `tagSuggestionService`, not a runtime issue.
**Warning signs:** JSON schema constraint errors logged from the LLM backend on users with zero tags.

### Pitfall 4: Ghost chips persist after entry navigation
**What goes wrong:** User has ghost chips showing for entry A, navigates to entry B. Old suggestions are still visible because TagSuggestButton was not unmounted.
**Why it happens:** If `entryId` changes but the parent component is not remounted (e.g., keying is wrong), `useState` in TagSuggestButton holds stale suggestions.
**How to avoid:** `TagRow` and `TagSuggestButton` should receive `entryId` as a key prop — `<TagRow key={entryId} entryId={entryId} content={content} />` — so React unmounts and remounts the whole component tree on entry change. The existing `useEffect([entryId])` in `TagRow` already handles tag reload, but the key prop enforces state reset.
**Warning signs:** Ghost chips from entry A visible on entry B after navigation.

### Pitfall 5: Content prop staleness — suggestions for old text
**What goes wrong:** User writes entry content, then quickly hits sparkle before the `editorContent` state in EntryEditor has updated. LLM receives stale content, suggests tags for the previous save rather than current text.
**How to avoid:** Derive `editorContent` from the `onUpdate` callback (which fires on every change) rather than a polling effect. The `onUpdate` callback in `EntryEditor` already calls `e.getMarkdown()` — extend it to also call `setEditorContent(md)`. This ensures the prop is always the latest editor text.
**Warning signs:** Tag suggestions seem unrelated to current text; suggestions match text from a few seconds ago.

### Pitfall 6: `tagStore.createTag` vs `addTagToEntry` for new-tag acceptance
**What goes wrong:** When accepting a ghost chip where `isNew === true`, developer calls only `addTagToEntry(entryId, tagName)` — but `addTagToEntry` takes a `tagId` (UUID), not a name. The new tag must be created first with `createTag(name)` which returns the new tag object containing its UUID.
**How to avoid:** In `handleAccept` inside `TagSuggestButton`, branch on `suggestion.isNew`:
  1. `isNew === true`: call `tagStore.createTag(suggestion.name)` → get `tag.id` → call `tagStore.addTagToEntry(entryId, tag.id)`
  2. `isNew === false`: find the tag by name in `tagStore.tags` → get its `id` → call `tagStore.addTagToEntry(entryId, foundTag.id)`
**Warning signs:** `addTagToEntry` throws a foreign-key constraint error; tag not added to entry.

---

## Code Examples

### Complete `requestStructured` skeleton (hybridAIService.ts addition)

```typescript
// Source: hybridAIService.ts — new export, added after askQuestion

/**
 * Request structured JSON output from the active AI backend.
 * Ollama: uses /api/chat + format parameter (JSON Schema constrained decoding)
 * Embedded: uses /v1/chat/completions + response_format (OpenAI-compat JSON Schema)
 * Returns the parsed JSON object. Throws on HTTP error or JSON parse failure.
 * Callers (tagSuggestionService) are responsible for catching.
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

async function requestStructuredOllama(
  prompt: string,
  jsonSchema: object,
  systemPrompt?: string
): Promise<unknown> {
  const url = `http://localhost:${OLLAMA_PORT}/api/chat`;  // /api/chat — NOT /api/generate
  const messages = [];
  if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
  messages.push({ role: "user", content: prompt });

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "llama3.2:3b",
      messages,
      stream: false,
      format: jsonSchema,  // schema object directly — no wrapper key
      temperature: 0.3,
      top_p: 0.9,
    }),
  });
  if (!response.ok) throw new Error(`Ollama structured request failed: ${response.statusText}`);
  const data = await response.json();
  const content = data.message?.content;  // /api/chat uses message.content
  if (!content) throw new Error("Empty response from Ollama");
  return JSON.parse(content);
}

async function requestStructuredEmbedded(
  prompt: string,
  jsonSchema: object,
  systemPrompt?: string
): Promise<unknown> {
  const url = `http://localhost:${EMBEDDED_PORT}/v1/chat/completions`;
  const messages = [];
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
        json_schema: { name: "tag_suggestions", schema: jsonSchema },
      },
      temperature: 0.3,
      top_p: 0.9,
    }),
  });
  if (!response.ok) throw new Error(`Embedded structured request failed: ${response.statusText}`);
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty response from embedded backend");
  return JSON.parse(content);
}
```

### `tagSuggestionService.ts` skeleton

```typescript
// NEW FILE: src/utils/tagSuggestionService.ts
import * as hybridAI from "../lib/hybridAIService";

export interface TagSuggestion {
  name: string;
  isNew: boolean;
}

const SYSTEM_PROMPT =
  "You are a tag-suggestion assistant for a personal journal. Read the entry and " +
  "propose 1–3 tags. Strongly prefer existing tags from the user's library — only " +
  "invent a new tag if no existing tag fits a clear theme of the entry. Tag names " +
  "must be lowercase, kebab-case (e.g. 'family-time', 'work-stress', 'reflection'). " +
  "Return strict JSON matching the provided schema.";

function buildSchema(existingTagNames: string[]): object {
  const existingItems =
    existingTagNames.length > 0
      ? { type: "string", enum: existingTagNames }
      : { type: "string", maxLength: 0 }; // no existing tags — disallow existing field

  return {
    type: "object",
    properties: {
      existing: {
        type: "array",
        items: existingItems,
        maxItems: existingTagNames.length > 0 ? 3 : 0,
      },
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

export async function suggestTagsForEntry(
  content: string,
  existingTagNames: string[]
): Promise<TagSuggestion[]> {
  try {
    const schema = buildSchema(existingTagNames);
    const cappedContent = content.slice(0, 4000);
    const existingList =
      existingTagNames.length > 0 ? existingTagNames.join(", ") : "(user has no tags yet — propose new tags only)";
    const userPrompt = `Existing tags: ${existingList}\n\nEntry:\n${cappedContent}`;

    const raw = await hybridAI.requestStructured(userPrompt, schema, SYSTEM_PROMPT) as {
      existing: string[];
      new: string[];
    };

    // Flatten, deduplicate case-insensitively, cap at 3 total
    const lowerExisting = existingTagNames.map((n) => n.toLowerCase());
    const suggestions: TagSuggestion[] = [];

    for (const name of (raw.existing || [])) {
      if (suggestions.length >= 3) break;
      if (lowerExisting.includes(name.toLowerCase())) {
        suggestions.push({ name, isNew: false });
      }
    }
    for (const name of (raw.new || [])) {
      if (suggestions.length >= 3) break;
      if (!lowerExisting.includes(name.toLowerCase())) {
        suggestions.push({ name, isNew: true });
      }
    }

    return suggestions;
  } catch (err) {
    console.error("[tag-suggestions] suggestTagsForEntry failed:", err);
    return [];
  }
}
```

### TagRow modification

```typescript
// src/components/TagRow.tsx — add content prop + sparkle gate
interface TagRowProps {
  entryId: string;
  content: string;  // NEW — current editor text for LLM input
}

// Inside TagRow component:
const showSparkle = useAIStore((s) =>
  s.available && s.llm && s.tagSuggestionsEnabled
);

// In JSX, after <TagInput>:
{showSparkle && (
  <TagSuggestButton
    entryId={entryId}
    content={content}
    existingTagNames={entryTags.map((t) => t.name)}
    onAccept={reloadEntryTags}
  />
)}
```

---

## Runtime State Inventory

Step 2.6 screening: SKIPPED — this is a new-feature phase, not a rename/refactor/migration. No existing runtime state references the new `tag_suggestions_enabled` key before this phase ships.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Ollama (localhost:11434) | AUTOTAG-02 Ollama path | Runtime-variable | N/A — user-managed | Graceful hide via `aiStore.available` |
| Embedded llama-server (localhost:8189) | AUTOTAG-02 embedded path | Runtime-variable | N/A — Tauri-managed | Graceful hide via `aiStore.available` |
| SQLite via plugin-sql | D-16 settings persistence | ✓ (app dependency) | 2.4.0 | None needed |
| lucide-react Sparkles, Loader2, X, Plus | D-07, D-08, D-09, D-12 | ✓ | ^1.8.0 | None needed |
| sonner toast | D-09 slow-call toast | ✓ | ^2.0.7 | None needed |

**Missing dependencies with no fallback:** None — all required tools are already present or handled by existing AI-unavailability graceful degradation.

---

## Validation Architecture

`workflow.nyquist_validation` is explicitly `false` in `.planning/config.json`. This section is omitted per config.

---

## Security Domain

`security_enforcement` is not set in config.json (absent = enabled by convention). However, Phase 10 has minimal security surface:

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | Not applicable — no auth in this phase |
| V3 Session Management | No | Ghost chips are session-local; no session data created |
| V4 Access Control | No | Local-only; no external endpoints |
| V5 Input Validation | Yes | JSON Schema constraint via `format`/`response_format` at model layer; `additionalProperties: false` rejects unknown fields; content capped at 4000 chars |
| V6 Cryptography | No | Not applicable |

**Threat patterns for this phase:**

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| LLM prompt injection via entry content | Tampering | Content-only input (no system prompt modification); schema constraint limits output shape |
| Tag name injection (XSS via ghost chip text) | Tampering | JSON Schema `pattern: "^[a-z0-9-]+$"` + `maxLength: 30` on new items; existing-tag names come from user's own tag library |
| Infinite loop / cost via oversized prompt | Denial of Service | 4000-char content cap; 30s timeout toast; local LLM (no external cost) |

Privacy: all LLM calls are localhost only. Zero network calls. Consistent with "none of it ever touches the internet" core value.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | llama-server b3920 (bundled in Phase 5) supports `response_format: { type: "json_schema" }` | requestStructured Pattern 2 | If not supported, embedded backend silently returns unstructured text; D-03 graceful fallback (returns `[]`) prevents crash but feature is non-functional on embedded backend |
| A2 | Ollama LLM detection uses `m.name.includes("llama")` — `requestStructured` uses model name `"llama3.2:3b"` | requestStructured Pattern 1 | If user's Ollama model is named differently (e.g., `"llama3:8b"`, `"mistral:7b"`), the model parameter string must match. The model name in the request should ideally be dynamic from the available models list. |

**A2 note:** The existing `askOllamaQuestion` hardcodes `model: "llama2:7b"` — same potential mismatch exists there. Phase 10 should use the same hardcoded model string for consistency, OR derive it from `checkOllamaHealth` data. The hardcoded string is a pre-existing architectural limitation, not a Phase 10 problem to solve.

---

## Open Questions

1. **Ollama model name for `requestStructured`**
   - What we know: `askOllamaQuestion` uses `model: "llama2:7b"`. The health check detects models via `m.name.includes("llama")`.
   - What's unclear: Whether users running `llama3.2:3b` will have the request accepted if the model field says `"llama2:7b"`.
   - Recommendation: Use the same model string as existing `askOllamaQuestion` (`"llama2:7b"`) for consistency. Document that users must have this model pulled. This is a pre-existing constraint; Phase 10 should not change it.

2. **Ghost chip animation class**
   - What we know: `animate-slide-up` is defined in tailwind.config.js and uses `slide-up` keyframes from animations.css.
   - What's unclear: Whether `animate-slide-up` is currently in Tailwind's safelist or whether it needs `content: [...]` config to avoid purging.
   - Recommendation: If the class is used anywhere in Phase 8/9 already, it will be in the purge-safe set. If not, add `"animate-slide-up"` to the safelist in `tailwind.config.js` or use it in a non-purged context.

3. **`editor.getText()` vs `editor.getMarkdown()` for LLM input**
   - What we know: `editor.getMarkdown()` is already called in `onUpdate`. `editor.getText()` returns plain text without markdown syntax.
   - What's unclear: Whether markdown syntax in the content (`**bold**`, `# headings`) would confuse the LLM when suggesting tags.
   - Recommendation: Use `editor.getMarkdown()` for consistency with existing auto-save. Markdown formatting tokens are low-frequency in typical journal entries and unlikely to affect tag quality.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Ollama `format: "json"` (string) | Ollama `format: { ...jsonSchema }` (object) | Ollama 0.5.0 (Nov 2024) | JSON Schema object in `format` provides constrained decoding; string `"json"` only requests JSON mode with no schema enforcement |
| OpenAI `response_format: { type: "json_object" }` | `response_format: { type: "json_schema", json_schema: { ... } }` | OpenAI Structured Outputs (Aug 2024), llama.cpp mirrored | Schema-constrained output replaces freeform JSON mode |

**Deprecated/outdated for this phase:**
- `format: "json"` (string on Ollama): requests JSON mode only, no schema; model can return arbitrary JSON keys
- `/api/generate` for structured output: correct for streaming text; wrong endpoint for chat-format schema constraint

---

## Sources

### Primary (HIGH confidence)
- Live codebase — `src/lib/hybridAIService.ts`, `src/utils/insightService.ts`, `src/utils/aiSettingsService.ts`, `src/stores/aiStore.ts`, `src/components/TagRow.tsx`, `src/components/TagPill.tsx`, `src/components/EntryEditor.tsx`, `src/components/SettingsView.tsx`, `src/lib/db.ts` — all read directly in this session
- `.planning/phases/10-auto-tagging-ai-pipeline/10-CONTEXT.md` — all decisions locked
- `.planning/phases/10-auto-tagging-ai-pipeline/10-UI-SPEC.md` — visual contract locked

### Secondary (MEDIUM confidence)
- Ollama API docs (`https://github.com/ollama/ollama/blob/main/docs/api.md`) — `format` object shape on `/api/chat` confirmed via WebFetch
- CONTEXT.md canonical refs — Ollama structured outputs URL, llama-server URL, OpenAI spec URL cited as authoritative

### Tertiary (LOW confidence)
- A1: llama-server b3920 `response_format` support — cited in CONTEXT.md D-02 but not verified against binary in this session

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified against live package.json and source files
- Architecture: HIGH — all patterns derived from verified codebase artifacts
- API routing (Ollama /api/chat): HIGH — verified via Ollama docs WebFetch
- Embedded backend response_format: MEDIUM — cited in CONTEXT.md, not verified against running binary
- Pitfalls: HIGH — all derived from verified code bugs (aiSettingsService 4-col issue, askOllamaQuestion endpoint) or standard React state patterns

**Research date:** 2026-04-19
**Valid until:** 2026-05-19 (stable codebase; Ollama/llama.cpp API stable within versions already in use)
