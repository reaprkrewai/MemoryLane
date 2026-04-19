# Phase 10: Auto-Tagging AI Pipeline - Pattern Map

**Mapped:** 2026-04-19
**Files analyzed:** 9 (2 new, 7 modified)
**Analogs found:** 9 / 9

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/utils/tagSuggestionService.ts` | service | request-response | `src/utils/insightService.ts` | exact |
| `src/lib/hybridAIService.ts` (add `requestStructured`) | service | request-response | `hybridAIService.ts` existing `askQuestion` + `askEmbeddedQuestion` | exact |
| `src/utils/aiSettingsService.ts` (add two exports) | service | CRUD | `src/utils/insightService.ts` settings-KV write pattern | exact (NOT aiSettingsService existing — has 4-col bug) |
| `src/stores/aiStore.ts` (add field + setter) | store | event-driven | existing `setSkipSetupWizard` / `setShowSetupWizard` setter pattern | exact |
| `src/App.tsx` (extend initAI useEffect) | config/wiring | event-driven | `App.tsx` lines 86-138 existing `loadAIBackendPreference` block | exact |
| `src/components/TagSuggestButton.tsx` | component | event-driven | `src/components/TagRow.tsx` (local state + tag-store wiring) | role-match |
| `src/components/TagRow.tsx` (add prop + conditional render) | component | event-driven | `src/components/TagRow.tsx` itself | self-extend |
| `src/components/EntryEditor.tsx` (thread content prop) | component | event-driven | `src/components/EntryEditor.tsx` existing `onUpdate` callback | self-extend |
| `src/components/SettingsView.tsx` (add SettingRow) | component | event-driven | `SettingsView.tsx` `AIFeaturesSection` lines 330-507 | exact |

---

## Pattern Assignments

### `src/utils/tagSuggestionService.ts` (NEW — service, request-response)

**Analog:** `src/utils/insightService.ts`

**Imports pattern** (`insightService.ts` lines 16-17):
```typescript
import { getDb } from "../lib/db";
import * as hybridAI from "../lib/hybridAIService";
```
Tag suggestion service needs the same two imports. `getDb` is not needed for the core path (settings write is in `aiSettingsService`), but the import shape and the `hybridAI` alias are the canonical form used across all service files.

**Core service pattern** (`insightService.ts` lines 59-91) — async function, try/catch wrapping entire body, `hybridAI.*` for dispatch, returns typed result:
```typescript
export async function generateWeeklySummary(): Promise<string> {
  // ... all business logic inside try ...
  const { answer } = await hybridAI.askQuestion(SUMMARY_PROMPT, context);
  // ... process result ...
  return answer;
  // No catch re-throw — service swallows and returns graceful result
}
```
`tagSuggestionService.suggestTagsForEntry` mirrors this shape: entire body in try/catch, call `hybridAI.requestStructured(...)` (new helper), post-process result, `return suggestions`. The `catch` block returns `[]` (not `null`, not `throw`) — identical graceful-fallback contract.

**Settings KV write pattern** (`insightService.ts` lines 82-89) — 3-column INSERT form, the ONLY correct form:
```typescript
await db.execute(
  "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)",
  [KEY_TEXT, answer, now]
);
```
**CRITICAL:** Do NOT copy `aiSettingsService.ts` lines 40-45. That file uses a 4-column INSERT (`key, value, created_at, updated_at`) against a 3-column table and is a latent bug. The two new exports `loadTagSuggestionsEnabled` / `saveTagSuggestionsEnabled` must use the 3-column form shown above from `insightService.ts`.

**Load pattern** (`aiSettingsService.ts` lines 13-33) — granular SELECT by key, default-on-missing, try/catch:
```typescript
export async function loadAIBackendPreference(): Promise<AIBackend> {
  try {
    const db = await getDb();
    const rows = await db.select<{ value: string }[]>(
      `SELECT value FROM settings WHERE key = 'aiBackend'`,
      []
    );
    if (rows.length > 0 && rows[0].value) {
      const value = rows[0].value;
      if (value === "embedded" || value === "ollama") {
        return value as AIBackend;
      }
    }
  } catch (err) {
    console.error("Failed to load AI backend preference:", err);
  }
  return "embedded"; // default fallback
}
```
Copy this shape for `loadTagSuggestionsEnabled`: replace key string, replace return type with `boolean`, replace validation with `rows[0].value === "1"`, change default return to `false`.

---

### `src/lib/hybridAIService.ts` — add `requestStructured` (service, request-response)

**Analog:** existing `askQuestion` / `askEmbeddedQuestion` / `askOllamaQuestion` in same file

**Backend dispatch pattern** (`hybridAIService.ts` lines 48-59) — public function dispatches to private backend-specific functions:
```typescript
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
```
`requestStructured` follows the identical `if (backend === "embedded")` branch — same `useAIStore.getState().aiBackend` read, same private function delegation pattern.

**Embedded backend fetch pattern** (`hybridAIService.ts` lines 111-147) — POST to `/v1/chat/completions`, OpenAI-compat response shape `data.choices[0].message.content`:
```typescript
async function askEmbeddedQuestion(...) {
  const url = `http://localhost:${EMBEDDED_PORT}/v1/chat/completions`;
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
  // ...
}
```
`requestStructuredEmbedded` copies this pattern exactly but adds `response_format: { type: "json_schema", json_schema: { name: "tag_suggestions", schema: jsonSchema } }` to the body, and `return JSON.parse(data.choices?.[0]?.message?.content)` instead of returning the string directly.

**CRITICAL — Ollama endpoint mismatch.** The existing `askOllamaQuestion` (`hybridAIService.ts` lines 205-241) uses `/api/generate` and reads `data.response`. The `format` JSON-Schema constraint only works on `/api/chat`. `requestStructuredOllama` MUST use `/api/chat` and parse `data.message?.content` (NOT `data.response`):
```typescript
// EXISTING (askOllamaQuestion — DO NOT copy this endpoint for requestStructured):
const url = `http://localhost:${OLLAMA_PORT}/api/generate`;
// ...
const answer = data.response || "";

// NEW (requestStructuredOllama — different endpoint, different response key):
const url = `http://localhost:${OLLAMA_PORT}/api/chat`;
// body uses messages[] array (not prompt/system top-level fields)
// body adds: format: jsonSchema  (schema object directly — no wrapper key)
// parse: data.message?.content   (NOT data.response)
```

**Error handling pattern** (`hybridAIService.ts` lines 136-138) — throw on non-OK response, let caller swallow:
```typescript
if (!response.ok) {
  throw new Error(`Failed to ask question: ${response.statusText}`);
}
```
`requestStructured` follows the same "throw on HTTP error, throw on parse failure" contract. `tagSuggestionService` is the caller that catches and returns `[]`.

---

### `src/utils/aiSettingsService.ts` — add `loadTagSuggestionsEnabled` + `saveTagSuggestionsEnabled` (service, CRUD)

**Analog:** `src/utils/insightService.ts` (3-column INSERT) + `src/utils/aiSettingsService.ts` (load pattern structure)

See pattern excerpts above under `tagSuggestionService`. The two new exports follow the identical try/catch + `console.error` + default-return pattern of `loadAIBackendPreference` and the `insightService.ts` 3-column write. No new patterns beyond what is already captured.

**Key constant pattern** (top of `aiSettingsService.ts`, `insightService.ts` lines 24-26):
```typescript
const KEY_TEXT = "ai_insight_text";
const KEY_AT = "ai_insight_generated_at";
```
Declare `const TAG_SUGGESTIONS_KEY = "tag_suggestions_enabled"` at the top of the module (or in `aiSettingsService.ts` as a module-level const) following this convention.

---

### `src/stores/aiStore.ts` — add `tagSuggestionsEnabled` field + setter (store, event-driven)

**Analog:** `src/stores/aiStore.ts` existing setter pattern

**Interface extension pattern** (`aiStore.ts` lines 11-44) — add to `AIState` interface and `create()` initializer:
```typescript
// In AIState interface (add alongside existing boolean fields):
tagSuggestionsEnabled: boolean;
setTagSuggestionsEnabled(v: boolean): void;

// In create() initializer:
tagSuggestionsEnabled: false,  // init false — AUTOTAG-06 default-off

// In create() actions:
setTagSuggestionsEnabled: (v) => set({ tagSuggestionsEnabled: v }),
```
The closest existing setters to copy from are `setShowSetupWizard` and `setSkipSetupWizard` (`aiStore.ts` lines 76-77):
```typescript
setShowSetupWizard: (show) => set({ showSetupWizard: show }),
setSkipSetupWizard: (skip) => set({ skipSetupWizard: skip }),
```
`setTagSuggestionsEnabled` follows the same single-line `set({...})` pattern.

**Zustand selector pattern for consumers** (used throughout `SettingsView.tsx` and `TagRow.tsx`):
```typescript
const tagSuggestionsEnabled = useAIStore((s) => s.tagSuggestionsEnabled);
```

---

### `src/App.tsx` — extend `initAI` useEffect (config/wiring, event-driven)

**Analog:** `src/App.tsx` lines 86-138 existing `initAI` block

**Extension point** (`App.tsx` lines 89-91) — pattern to mirror for `tagSuggestionsEnabled` load, placed immediately after the existing `loadAIBackendPreference` call:
```typescript
// EXISTING — copy this pattern:
const backend = await loadAIBackendPreference();
useAIStore.setState({ aiBackend: backend });

// NEW — add immediately after (same try block, same useAIStore.setState pattern):
const tagSuggestionsEnabled = await loadTagSuggestionsEnabled();
useAIStore.setState({ tagSuggestionsEnabled });
```

**Import addition** (`App.tsx` line 17) — extend the existing named import:
```typescript
// EXISTING:
import { loadAIBackendPreference } from "./utils/aiSettingsService";
// BECOMES:
import { loadAIBackendPreference, loadTagSuggestionsEnabled } from "./utils/aiSettingsService";
```

---

### `src/components/TagSuggestButton.tsx` (NEW — component, event-driven)

**Analog:** `src/components/TagRow.tsx` (local state + tagStore wiring), `src/components/TagPill.tsx` (pill shape visual reference)

**Local state pattern for tag-adjacent UI** (`TagRow.tsx` lines 19-28) — useState for derived display state, async reload pattern:
```typescript
const [entryTags, setEntryTags] = useState<TagWithCount[]>([]);
const getEntryTags = useTagStore((s) => s.getEntryTags);
// ...
const reloadEntryTags = async () => {
  const tags = await getEntryTags(entryId);
  setEntryTags(tags);
};
```
`TagSuggestButton` extends this by adding `suggestions: TagSuggestion[]` and `isLoading: boolean` as additional useState values. The `onAccept` callback that triggers `reloadEntryTags` in the parent mirrors the same pattern.

**tagStore accept-path** (`tagStore.ts` lines 52-60 and 81-88) — `createTag` returns the new tag object; `addTagToEntry` takes `(entryId, tagId)`:
```typescript
createTag: async (name: string) => {
  // ... inserts, reloads tags ...
  const rows = await db.select<Tag[]>("SELECT * FROM tags WHERE name = ? COLLATE NOCASE", [name]);
  return rows[0];  // <-- returns Tag with .id
},

addTagToEntry: async (entryId: string, tagId: string) => {
  await db.execute(
    "INSERT OR IGNORE INTO entry_tags (entry_id, tag_id) VALUES (?, ?)",
    [entryId, tagId]
  );
  await get().loadTags();
},
```
`handleAccept` in `TagSuggestButton` must branch on `suggestion.isNew`: call `createTag(name)` first for new tags to get the UUID, then pass that UUID to `addTagToEntry`. For existing tags, look up by name in `useTagStore.getState().tags` to find the UUID.

**TagPill shape reference** (`TagPill.tsx` lines 29-35) — pill wrapper classes that ghost chip inverts:
```typescript
// EXISTING TagPill (solid bg, solid 1px border, color-mix, sm font):
<div
  className="group inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-all hover:shadow-sm"
  style={{
    backgroundColor: `color-mix(in srgb, ${tag.color} 12%, transparent)`,
    borderColor: `color-mix(in srgb, ${tag.color} 35%, transparent)`,
  }}
>
  <span className="select-none">{tag.name}</span>
  {/* X button */}
```
Ghost chip inverts each signal:
- `rounded-lg` → `rounded-full` (softer, signals pending)
- `border` (1px solid) → `border-2 border-dashed border-muted/50`
- `color-mix bg` → `bg-transparent`
- `text-sm font-medium` → `text-xs font-normal`
- color-swatch dot → omitted entirely
- `px-3 py-1.5` → `px-2 py-1`

**X button pattern** (`TagPill.tsx` lines 47-56) — `e.stopPropagation()` on dismiss, `aria-label` with tag name, opacity-on-hover via group:
```typescript
<button
  type="button"
  className="opacity-0 transition-opacity group-hover:opacity-100 flex items-center justify-center p-0.5 rounded hover:text-destructive"
  onClick={(e) => {
    e.stopPropagation();
    onRemove();
  }}
  aria-label={`Remove tag ${tag.name}`}
>
  <X size={14} />
</button>
```
Ghost chip dismiss copies `e.stopPropagation()` and `type="button"`, but X is always visible (no opacity-0/group-hover) and aria-label is `"Dismiss suggestion: ${name}"`.

**Loading spinner pattern** (`SettingsView.tsx` lines 484-490) — `Loader2` with `animate-spin` on a disabled button:
```typescript
{isChecking ? (
  <>
    <Loader2 size={14} className="animate-spin" />
    Checking...
  </>
) : (
  "Check Status"
)}
```
Sparkle button loading state replaces the icon inline: `{isLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}`.

**useEffect setTimeout cleanup pattern** (`TagSuggestButton` state machine — from RESEARCH.md Pattern 7):
```typescript
useEffect(() => {
  if (!showEmptyMsg) return;
  const id = setTimeout(() => setShowEmptyMsg(false), 4000);
  return () => clearTimeout(id);
}, [showEmptyMsg]);
```
This is the standard cleanup pattern used throughout the codebase. The return cleanup function ensures no setState-after-unmount.

---

### `src/components/TagRow.tsx` — add `content` prop + sparkle gate (component, event-driven)

**Analog:** `src/components/TagRow.tsx` itself

**Current interface** (`TagRow.tsx` lines 14-16):
```typescript
interface TagRowProps {
  entryId: string;
}
```
Extend to:
```typescript
interface TagRowProps {
  entryId: string;
  content: string;  // current editor markdown for LLM input
}
```

**Current JSX structure** (`TagRow.tsx` lines 46-61) — flex-wrap container with pills, then `<TagInput>`:
```typescript
<div className="relative mx-auto max-w-[760px] flex flex-wrap items-center gap-2 border-t border-border bg-bg px-0 py-4 ml-8 mr-8">
  {entryTags.map((tag) => (
    <TagPill key={tag.id} ... />
  ))}
  <TagInput entryId={entryId} entryTags={entryTags} onTagAdded={reloadEntryTags} />
  {/* INSERT TagSuggestButton here, after TagInput */}
</div>
```

**Zustand composite predicate pattern** (mirrors `SettingsView.tsx` lines 285-291 — granular selector per boolean field):
```typescript
// In TagRow component body — add alongside existing useTagStore selectors:
const showSparkle = useAIStore((s) =>
  s.available && s.llm && s.tagSuggestionsEnabled
);
```
Add import `import { useAIStore } from "../stores/aiStore"` alongside existing imports.

---

### `src/components/EntryEditor.tsx` — thread content prop (component, event-driven)

**Analog:** `src/components/EntryEditor.tsx` existing `onUpdate` callback

**Current onUpdate** (`EntryEditor.tsx` lines 36-41) — already calls `e.getMarkdown()`:
```typescript
onUpdate: ({ editor: e }) => {
  const md = e.getMarkdown();
  const words = e.storage.characterCount.words();
  const chars = e.storage.characterCount.characters();
  scheduleAutoSave(entryId, md, words, chars);
},
```

**Extension** — add `useState<string>("")` for `editorContent` and update it in the same `onUpdate` callback:
```typescript
// Add near top of component:
const [editorContent, setEditorContent] = useState("");

// Extend onUpdate (add one line to existing callback):
onUpdate: ({ editor: e }) => {
  const md = e.getMarkdown();
  setEditorContent(md);        // ADD THIS LINE
  const words = e.storage.characterCount.words();
  const chars = e.storage.characterCount.characters();
  scheduleAutoSave(entryId, md, words, chars);
},

// Update TagRow render (EntryEditor.tsx line 99):
// BEFORE: <TagRow entryId={entryId} />
// AFTER:  <TagRow entryId={entryId} content={editorContent} />
```

**Entry load useEffect** (`EntryEditor.tsx` lines 72-81) — also seed `editorContent` when loading an existing entry, to avoid empty string on first sparkle click before any keystroke:
```typescript
useEffect(() => {
  if (!editor) return;
  const entry = entries.find((e) => e.id === entryId);
  if (entry) {
    editor.commands.setContent(entry.content, { contentType: "markdown" });
    setEditorContent(entry.content);  // ADD THIS LINE
  }
}, [entryId, editor]);
```

---

### `src/components/SettingsView.tsx` — add "Tag suggestions" SettingRow (component, event-driven)

**Analog:** `SettingsView.tsx` lines 329-350 — `AIFeaturesSection` "AI Backend" SettingRow with `OptionButton` pair

**OptionButton component** (`SettingsView.tsx` lines 25-38) — exact widget to reuse:
```typescript
function OptionButton({ label, selected, onClick }: OptionButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm rounded-lg border font-medium transition-all ${
        selected
          ? "bg-accent text-amber-950 border-accent shadow-sm"
          : "bg-transparent text-text-secondary border-border hover:border-accent/40 hover:text-text hover:bg-surface-secondary"
      }`}
    >
      {label}
    </button>
  );
}
```

**Existing SettingRow insertion pattern** (`SettingsView.tsx` lines 334-350) — preceding divider + `<SettingRow>` + `OptionButton` pair:
```typescript
<div className="border-t border-border/50" />
<SettingRow
  label="AI Backend"
  description="Choose where AI models run"
>
  <div className="flex gap-2">
    <OptionButton
      label="Built-in AI"
      selected={aiBackend === "embedded"}
      onClick={() => handleBackendChange("embedded")}
    />
    <OptionButton
      label="External Ollama"
      selected={aiBackend === "ollama"}
      onClick={() => handleBackendChange("ollama")}
    />
  </div>
</SettingRow>
```
The new "Tag suggestions" row is inserted AFTER the closing `</SettingRow>` of the "Actions" row (`SettingsView.tsx` line 504) and BEFORE the `</div>` that closes the backend-conditional blocks (line 505). It follows this identical `<div className="border-t border-border/50" />` + `<SettingRow>` + `<div className="flex gap-2">` + two `<OptionButton>` shape.

**Handler pattern** (`SettingsView.tsx` lines 320-327) — async handler that calls store setter + persists:
```typescript
const handleBackendChange = async (newBackend: "embedded" | "ollama") => {
  setAiBackend(newBackend);
  await saveAIBackendPreference(newBackend);
  toast.info("Backend changed...");
};
```
`handleTagSuggestionsToggle` mirrors this: `setTagSuggestionsEnabled(value)` + `await saveTagSuggestionsEnabled(value)`. No toast needed for this toggle (settings write is silent per project convention for simple toggles).

**Store selector pattern in AIFeaturesSection** (`SettingsView.tsx` lines 285-291):
```typescript
const aiBackend = useAIStore((s) => s.aiBackend);
const setAiBackend = useAIStore((s) => s.setAIBackend);
```
Add alongside:
```typescript
const tagSuggestionsEnabled = useAIStore((s) => s.tagSuggestionsEnabled);
const setTagSuggestionsEnabled = useAIStore((s) => s.setTagSuggestionsEnabled);
```

---

## Shared Patterns

### Graceful Degradation (AI unavailability)
**Source:** `src/utils/insightService.ts` lines 59-92 (try/catch returns graceful default)
**Apply to:** `tagSuggestionService.ts`, `loadTagSuggestionsEnabled`, `saveTagSuggestionsEnabled`
```typescript
// Pattern: entire async function body in try/catch, return default on any failure
try {
  // ... all logic ...
  return result;
} catch (err) {
  console.error("[tag-suggestions] ...", err);
  return []; // or false, or default value
}
```

### Settings KV Read/Write (3-column form — CRITICAL)
**Source:** `src/utils/insightService.ts` lines 82-89
**Apply to:** `saveTagSuggestionsEnabled` in `aiSettingsService.ts`
**WARNING:** Do NOT copy from `aiSettingsService.ts` lines 40-45 — that file has a 4-column INSERT bug (`created_at` column does not exist in the settings table DDL).
```typescript
// CORRECT 3-column form:
await db.execute(
  "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)",
  [key, value, Date.now()]
);
```

### Backend Dispatch (hybridAIService pattern)
**Source:** `src/lib/hybridAIService.ts` lines 48-59
**Apply to:** `requestStructured` in `hybridAIService.ts`
```typescript
const backend = useAIStore.getState().aiBackend;
if (backend === "embedded") {
  return privateEmbeddedFunction(...);
} else {
  return privateOllamaFunction(...);
}
```

### Zustand Granular Selector
**Source:** `src/components/SettingsView.tsx` lines 285-291
**Apply to:** `TagRow.tsx` composite predicate, `SettingsView.tsx` new SettingRow
```typescript
const fieldValue = useAIStore((s) => s.fieldName);
```
Use one `useAIStore` call per consumed field for precise re-render granularity.

### Conditional Unmount (not CSS hide)
**Source:** Pattern mandated by CONTEXT.md D-18 and AUTOTAG-05
**Apply to:** `TagRow.tsx` sparkle button gate
```typescript
// Unmount — component and its useState are garbage-collected:
{showSparkle && <TagSuggestButton ... />}

// NOT: visibility: hidden or opacity-0 (state leaks, ghost chips persist)
```

### useAIStore.setState Direct Writes (for useEffect init)
**Source:** `src/App.tsx` lines 91, 120-125
**Apply to:** `App.tsx` initAI extension
```typescript
// Pattern for loading persisted values into store on init:
const value = await loadSomeSetting();
useAIStore.setState({ someField: value });
```

---

## No Analog Found

All files have strong analogs in the existing codebase. No files require falling back to RESEARCH.md patterns for their primary structure.

| File | Note |
|------|------|
| `src/components/TagSuggestButton.tsx` | Ghost chip sub-component is novel; no existing ghost/pending UI exists. Visual spec from `TagPill.tsx` via inversion. State machine pattern derived from `TagRow.tsx` local state + `useEffect` cleanup patterns from React standard library. |

---

## Critical Implementation Warnings

### Warning 1: Ollama Endpoint
`requestStructuredOllama` MUST POST to `/api/chat` (line 209 in `hybridAIService.ts` currently shows `/api/generate` — do NOT copy that URL). Parse response from `data.message?.content`, not `data.response`.

### Warning 2: 4-column INSERT Bug
`aiSettingsService.ts` line 42 has `INSERT OR REPLACE INTO settings (key, value, created_at, updated_at)` — this is a bug. The settings table DDL (`db.ts` lines 79-83) only has `key, value, updated_at`. All new `save*` functions must use the 3-column form from `insightService.ts`.

### Warning 3: tagStore.createTag vs addTagToEntry
`addTagToEntry(entryId, tagId)` takes a UUID, not a name. For `isNew === true` chips, call `createTag(name)` first (returns `Tag` with `.id`), then pass that `.id` to `addTagToEntry`. For `isNew === false` chips, look up the UUID in `useTagStore.getState().tags` by case-insensitive name match.

### Warning 4: Empty existingTagNames schema edge case
When `existingTagNames.length === 0`, do not set `existing.items.enum: []` — some validators treat it as "no valid values." Instead set `existing: { type: "array", maxItems: 0 }` to signal "no existing tags allowed" without an empty enum constraint.

---

## Metadata

**Analog search scope:** `src/utils/`, `src/lib/`, `src/stores/`, `src/components/`, `src/App.tsx`
**Files read:** 10 source files + 3 planning documents
**Pattern extraction date:** 2026-04-19
