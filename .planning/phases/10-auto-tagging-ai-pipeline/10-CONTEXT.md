# Phase 10: Auto-Tagging AI Pipeline - Context

**Gathered:** 2026-04-18
**Status:** Ready for planning
**Mode:** Auto (smart discuss — Claude proposed 4 grey-area tables, user accepted all)

<domain>
## Phase Boundary

Users who explicitly opt in (Settings → AI Features → "Tag suggestions" — **off by default**, AUTOTAG-06) see a Lucide `<Sparkles>` icon button in the entry editor's TagRow whenever the local LLM backend is healthy. Clicking the sparkle requests **1–3 tag suggestions** from the local LLM (Ollama OR built-in llama-server) via a new `tagSuggestionService.suggestTagsForEntry(content, existingTagNames)` helper. Suggestions are bounded by a **strict JSON Schema** routed through a new `hybridAIService.requestStructured()` helper — Ollama uses the `format` parameter, embedded llama.cpp uses OpenAI-compatible `response_format: { type: "json_schema" }`. Returned suggestions render as **ghost chips** (dashed-border, transparent-bg, muted-text) inline in the same TagRow, after the sparkle button. The user clicks each chip to accept (becomes a real `TagPill` via existing `tagStore.addTagToEntry`) or clicks the chip's `<X>` to dismiss. **No suggestion is ever auto-applied.** When AI backend is unavailable mid-session OR the toggle is off, the sparkle button disappears silently (no error toast, no dialog) — consistent with v1.0's `aiStore.available` gating convention. Ships AUTOTAG-01..07 only — no Tag Management UI (Phase 11), no microinteractions polish (Phase 11), no auto-tag-on-save (research/FEATURES.md anti-pattern). The `requestStructured` JSON-Schema dispatch helper, the ghost-chip UX, the per-chip explicit-accept contract, and the JSON-Schema shape are the load-bearing grey areas resolved here.

</domain>

<decisions>
## Implementation Decisions

### Service Architecture & API Integration (AUTOTAG-01, AUTOTAG-02, AUTOTAG-03, AUTOTAG-05)

- **D-01:** **NEW `src/utils/tagSuggestionService.ts`** exporting:
  ```typescript
  export interface TagSuggestion {
    name: string;        // tag name as it will appear (lowercase, kebab-case for new tags)
    isNew: boolean;      // true if this name doesn't match any existingTagNames entry
  }
  export async function suggestTagsForEntry(
    content: string,
    existingTagNames: string[]
  ): Promise<TagSuggestion[]>;
  ```
  Mirrors `src/utils/insightService.ts` (Phase 8) and `src/utils/aiSettingsService.ts` (v1.0) shape: thin async function, owns ALL prompt construction + JSON-Schema definition + LLM dispatch + parsing + post-processing. Returns 0–3 suggestions; never throws (catches inside, returns `[]` on any failure for graceful UI degradation). *Rationale: matches research/ARCHITECTURE.md §4 verdict verbatim ("on-demand button (NOT automatic on save), new `suggestTagsForEntry` in a new `src/utils/tagSuggestionService.ts`"); zero refactor cost; testable in isolation.*

- **D-02:** **NEW `hybridAIService.requestStructured(prompt, jsonSchema, systemPrompt?)` helper** added alongside existing `askQuestion`. Handles backend dispatch:
  - **Ollama backend:** POST `http://localhost:11434/api/chat` with `format: <jsonSchema>` field (Ollama 0.5+ supports JSON Schema in `format`)
  - **Embedded llama.cpp backend:** POST `http://localhost:8189/v1/chat/completions` with `response_format: { type: "json_schema", json_schema: { name: "tag_suggestions", schema: <jsonSchema> } }` (OpenAI-spec; llama-server supports this since b3920+)
  - Returns `Promise<unknown>` (parsed JSON object matching the schema); caller is responsible for runtime validation
  - On parse failure or HTTP error: throws — caller decides whether to swallow (tagSuggestionService swallows; future callers may surface)
  *Rationale: AUTOTAG-02 mandates routing through `hybridAIService` (NEVER `ollamaService` directly); `askQuestion` is single-purpose for Q&A with citation parsing — overloading it would couple unrelated concerns. New helper isolates the structured-output contract.*

- **D-03:** **Embedded backend JSON-Schema graceful degradation.** If `requestStructured` HTTP call fails on the embedded backend (older llama-server build that pre-dates `response_format` support, or schema rejection), `tagSuggestionService` catches the error, returns `[]`, and the UI silently shows "No tag suggestions for this entry" (D-13 empty state). The sparkle button stays visible — failure mode is "no suggestions this time," not "feature broken." *Rationale: matches v1.0 graceful-fallback convention (PATTERNS.md pattern #1); avoids forcing users to switch backends; AUTOTAG-05 only mandates hiding when `aiStore.available === false`, NOT when a single LLM call fails.*

- **D-04:** **Prompt design — locked.**
  - **System:** `"You are a tag-suggestion assistant for a personal journal. Read the entry and propose 1–3 tags. Strongly prefer existing tags from the user's library — only invent a new tag if no existing tag fits a clear theme of the entry. Tag names must be lowercase, kebab-case (e.g. 'family-time', 'work-stress', 'reflection'). Return strict JSON matching the provided schema."`
  - **User:** `"Existing tags: ${existingTagNames.length > 0 ? existingTagNames.join(', ') : '(user has no tags yet — propose new tags only)'}\n\nEntry:\n${content.slice(0, 4000)}"` (cap content at 4000 chars to bound token cost; entries longer than that are summarized by the leading content per existing entry-display convention)
  - **No few-shot examples in v1** — JSON-Schema constraint + clear natural-language guidance is sufficient for first ship. Iterate if UAT reveals quality issues. *Rationale: research/FEATURES.md L100 explicitly flags auto-tagging as the highest-risk prompt-engineering area and recommends iteration; few-shot adds 200+ tokens per call for marginal gain at small corpus sizes; schema-constrained models follow JSON shape without examples in 90%+ of cases (Ollama Llama 3.2 3B + format-bound runs).*

- **D-05:** **JSON Schema shape — locked.**
  ```json
  {
    "type": "object",
    "properties": {
      "existing": {
        "type": "array",
        "items": {
          "type": "string",
          "enum": [...existingTagNames]
        },
        "maxItems": 3
      },
      "new": {
        "type": "array",
        "items": {
          "type": "string",
          "pattern": "^[a-z0-9-]+$",
          "minLength": 2,
          "maxLength": 30
        },
        "maxItems": 2
      }
    },
    "required": ["existing", "new"],
    "additionalProperties": false
  }
  ```
  When `existingTagNames` is empty, omit the `enum` constraint on `existing.items` (or send `existing: { type: "array", maxItems: 0 }`). Post-processing in `tagSuggestionService` flattens the two fields into a single `TagSuggestion[]` (existing items have `isNew: false`, new items have `isNew: true`), de-duplicates case-insensitively against `existingTagNames`, trims to first 3 total. *Rationale: AUTOTAG-03 mandates "structured tag array with length-capped enum of existing tags + up to 2 new-tag proposals" — split fields make the LLM's intent unambiguous (it can't accidentally claim a new-tag proposal is an existing one); kebab-case pattern enforces tag-name convention used throughout v1.0; total cap of 3 honors AUTOTAG-02 "1–3 tag suggestions."*

### TagRow Composition & Sparkle Button UX (AUTOTAG-01, AUTOTAG-04, AUTOTAG-05)

- **D-06:** **Sparkle button placement = inside the same flex-row, AFTER `<TagInput />`.** Reading order: existing pills → input → sparkle → ghost suggestions. Modify [src/components/TagRow.tsx:55-59](src/components/TagRow.tsx#L55-L59) to render `<TagSuggestButton entryId={entryId} content={content} existingTagNames={...} onAccept={reloadEntryTags} />` immediately after `<TagInput />`. Pass `content` from EntryEditor down through TagRow's props (new `content: string` prop required on TagRow — minor signature extension). *Rationale: research/ARCHITECTURE.md §4 specifies "small 'Sparkles' icon button next to TagInput" — rightmost placement preserves left-to-right tag-management flow.*

- **D-07:** **NEW `src/components/TagSuggestButton.tsx`** — owns the sparkle button + ghost-chip rendering + per-chip accept/dismiss + local `useState<TagSuggestion[]>` for the active suggestion batch. Props: `{ entryId: string; content: string; existingTagNames: string[]; onAccept: () => void | Promise<void> }`. Internal state: `suggestions: TagSuggestion[]` (initially `[]`), `isLoading: boolean`. *Rationale: keeps TagRow.tsx lean (it's already the wiring point for pills + input); collocates suggestion lifecycle with the button that produces them; testable in isolation.*

- **D-08:** **Sparkle button visual treatment.** Lucide `<Sparkles size={14} />` icon-only button with:
  - Size: `h-7 w-7` (matches TagInput height — verify against current TagInput.tsx render)
  - Shape: `rounded-md`
  - Color: `text-muted hover:text-accent` icon, `hover:bg-surface` background
  - Border: `border border-transparent hover:border-border`
  - Focus: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1` (matches Phase 8 FAB pattern)
  - ARIA: `aria-label="Suggest tags"` (matches the action verb, not the icon)
  - Disabled state: `opacity-50 cursor-not-allowed` (used during loading)
  *Rationale: icon-only is least intrusive; amber on hover signals AI affordance without dominating; mirrors existing app button grammar (TagPill close button, FAB focus ring).*

- **D-09:** **Loading state.** During the LLM call (`isLoading === true`), swap `<Sparkles />` for `<Loader2 className="animate-spin" size={14} />` and set `disabled={true}`. **No cancel control** in v1 — typical local-LLM call latency is 1.5–4 seconds; cancellation adds AbortController plumbing for marginal UX win. If user clicks the button during loading, it's a no-op (`disabled` blocks). If a single call exceeds 30 seconds, surface a sonner toast `"Tag suggestions are taking longer than expected"` (non-blocking, dismissable, info-level) — but DO NOT cancel the underlying request; let it complete or fail naturally. *Rationale: matches v1.0 loader semantics (insightService Refresh button, Phase 8 D-17); avoids over-engineering for an edge case; toast surfaces awareness without forcing user action.*

- **D-10:** **Empty / error states.**
  - **Empty (LLM returned 0 valid suggestions after dedup + post-processing):** Restore `<Sparkles>` icon. Render a transient inline `<span className="text-muted text-xs ml-1">No tag suggestions for this entry</span>` next to the button for 4 seconds, then fade out (CSS transition). Use a `useEffect` with `setTimeout` cleanup pattern.
  - **Error (network failure, JSON parse error, HTTP non-200):** Restore `<Sparkles>` icon. **No toast, no dialog, no inline message.** Log to `console.error` with prefix `[tag-suggestions]` for dev debugging. Spirit of D-03's graceful degradation.
  - **Ollama unavailable mid-session:** Sparkle button disappears entirely (handled by D-12 reactive gating in parent component, not inside TagSuggestButton). The button is conditionally rendered in TagRow via the AUTOTAG composite predicate.
  *Rationale: empty state is informative (user clicked, got result); error state is silent (failure noise destroys trust); mid-session unavailability is invisible (gating elsewhere). All three honor research/PITFALLS.md #1 graceful-fallback rule.*

### Suggestion Presentation — Ghost Chips (AUTOTAG-04)

- **D-11:** **Ghost chip rendering location.** Render ghost chips inline in the same flex-row as TagPills/TagInput/SparkleButton, AFTER the sparkle button. Reading order: existing pills → input → sparkle → suggestions. Chips wrap onto a new line via the existing `flex flex-wrap` parent. Ghost chips render INSIDE TagSuggestButton's JSX tree (after the button itself), so the component owns its full UI surface. *Rationale: matches CONTEXT D-08 wording from research/FEATURES.md ("ghost chips inside the editor"); no popover indirection means suggestions feel like part of the entry's tag context, not a modal interrupting flow.*

- **D-12:** **Ghost chip visual contract — locked.**
  - **Ghost chip:** Same overall pill shape as `TagPill` (`px-2.5 py-1 rounded-full text-xs leading-tight font-medium`) BUT with:
    - Background: `bg-transparent` (NOT solid)
    - Border: `border-2 border-dashed` (NOT solid 1px)
    - Border color: `border-muted/50`
    - Text color: `text-muted`
    - **NO color-swatch dot** (real TagPills have one; ghost has none — visual signal that it's pending)
  - **New-tag prefix:** New-tag suggestions render `<Plus size={10} className="mr-1 -ml-0.5 inline" />` BEFORE the tag name to signal "this will create a new tag." Existing-tag suggestions don't get this prefix.
  - **Click-to-accept (whole-chip hit area):** `cursor-pointer hover:bg-surface hover:border-accent/40 hover:text-text` (transitions to look like an "almost real" chip). Click anywhere on the chip body → calls `handleAccept(suggestion)`.
  - **Dismiss (close icon):** Trailing `<X size={11} />` inside a small button (`h-4 w-4 rounded-full hover:bg-muted/20 ml-1`). Click → calls `handleDismiss(suggestion)`. Stop event propagation so click doesn't bubble to the chip's accept handler.
  - **ARIA:** Chip wrapper gets `role="button"` + `tabIndex={0}` + `aria-label="Accept tag suggestion: ${name}"`; X button gets `aria-label="Dismiss suggestion: ${name}"`. Enter/Space on chip = accept; Escape inside chip = dismiss.
  *Rationale: dashed border + transparent bg + missing color-dot = three independent signals that this is "pending, not real"; whole-chip click target reduces friction; AUTOTAG-04 explicit "click to add OR × to remove."*

- **D-13:** **Persistence semantics — session-local only.** Ghost chip array lives in TagSuggestButton's internal `useState<TagSuggestion[]>`. Cleared when:
  - User accepts a chip → spliced out of state, real TagPill appears via `onAccept` callback to parent which reloads `entryTags` (existing TagRow `reloadEntryTags` flow)
  - User dismisses a chip via X → spliced out of state
  - User clicks sparkle again → state replaced wholesale with new batch (previous suggestions gone)
  - User navigates to a different entry (TagRow + TagSuggestButton unmount via `entryId` change in deps; React garbage-collects state)
  - App restart, refresh, view switch back-and-forth — ghost chips never persist. NOT written to SQLite. NOT survived in any other store.
  *Rationale: suggestions are inherently transient (LLM context is the entry's current text); persisting them creates stale-state confusion (user opens entry weeks later, sees outdated suggestions); aligns with research/PITFALLS.md "no LLM caching for transient UI state."*

- **D-14:** **One-click-per-chip only — NO "Accept all" / "Dismiss all" buttons.** AUTOTAG-04 explicitly mandates "the user explicitly accepts (click to add) or dismisses (× to remove); no suggestion is ever auto-applied." Bulk-accept controls would technically require a click but feel auto-applied, undermining the explicit-deliberation contract. With a max of 3 suggestions, per-chip clicks are tolerable. *Rationale: AUTOTAG-04 spirit-of-requirement; product principle "Insights, not interruptions" — user is in control of what enters their journal.*

### Settings Toggle, Persistence & Reactive Gating (AUTOTAG-06, AUTOTAG-07, AUTOTAG-05)

- **D-15:** **Settings toggle — placement and default.** Insert new `<SettingRow label="Tag suggestions" description="Show a sparkle button in the editor to suggest tags via local AI">` into the existing `AIFeaturesSection()` ([SettingsView.tsx:331-505](src/components/SettingsView.tsx#L331-L505)) — placed AFTER the existing AI backend toggle and the "Actions" status row but BEFORE the section closes. Toggle widget: a button styled identically to the existing `idleTimeout` controls in `AIFeaturesSection` (or the on/off button pattern used by other AI toggles — Claude's Discretion to pick whichever exact widget matches the section's grammar). Default: **OFF** (AUTOTAG-06 explicit). *Rationale: SectionHeader = AI Features (already exists with Sparkles icon); single new SettingRow = minimal disruption; AUTOTAG-06 verbatim default.*

- **D-16:** **Persistence — extend `aiSettingsService.ts` with two new exports.**
  ```typescript
  export async function loadTagSuggestionsEnabled(): Promise<boolean>;
  export async function saveTagSuggestionsEnabled(value: boolean): Promise<void>;
  ```
  SQLite `settings` table key: `tag_suggestions_enabled` stored as `'0'` or `'1'`. `loadTagSuggestionsEnabled()` returns `false` on missing row, `false` on parse error (try/catch + console.error per existing aiSettingsService convention). `saveTagSuggestionsEnabled(value)` writes `INSERT OR REPLACE INTO settings(key, value, updated_at) VALUES (?, ?, ?)` — schema-correct three-column write (matches Phase 9 PATTERNS.md heads-up: settings table has only key/value/updated_at, NO created_at). *Rationale: matches existing `loadAIBackendPreference` / `saveAIBackendPreference` shape verbatim; same try/catch envelope; reuses settings KV table without schema migration.*

- **D-17:** **Reactive store wiring — extend `aiStore`.** Add field `tagSuggestionsEnabled: boolean` (init `false`) plus setter `setTagSuggestionsEnabled(v: boolean): void`. Load on App mount: extend the existing `initAI` `useEffect` block in [App.tsx:76-128](src/App.tsx#L76-L128) to call `loadTagSuggestionsEnabled()` and `useAIStore.setState({ tagSuggestionsEnabled: result })`. Settings toggle's `onClick` handler in `AIFeaturesSection` calls `setTagSuggestionsEnabled(newValue)` AND `await saveTagSuggestionsEnabled(newValue)` to persist atomically. *Rationale: aiStore is the right store (gates AI behavior, not UI state); init in App.tsx mirrors existing aiBackend load; setter encapsulates store update + persistence in one click handler.*

- **D-18:** **Sparkle button visibility — composite predicate.** In TagRow.tsx (NOT TagSuggestButton — gating happens at the parent so the button is unmounted, not hidden via CSS):
  ```typescript
  const showSparkle = useAIStore((s) =>
    s.available && s.llm && s.tagSuggestionsEnabled === true
  );
  // ...
  {showSparkle && <TagSuggestButton ... />}
  ```
  Three independent gates compose with `&&`; if ANY is false, button is unmounted and ghost chips disappear with it. Reactive — when Ollama goes down mid-session OR user toggles off, button vanishes immediately. *Rationale: AUTOTAG-05 explicit "hidden (not disabled) in every other case"; AUTOTAG-07 same hidden-when-off contract; single-line predicate keeps gating logic flat and trivially auditable.*

### Pitfall Mitigations & Cross-Cutting Concerns

- **D-19:** **Hallucination prevention.** JSON Schema's `enum` constraint on `existing.items` GUARANTEES the LLM cannot suggest an existing-tag name that doesn't exist in the user's library — invalid output is rejected at the model layer, not the parsing layer. The `pattern: "^[a-z0-9-]+$"` constraint on `new.items` prevents the LLM from suggesting tags with spaces, capitals, or punctuation that would break v1.0 tag-name conventions. Combined with `maxItems`, the model literally cannot return malformed output that passes schema validation. *Rationale: addresses CONTEXT.md L138 pitfall "Auto-tag hallucination — JSON-Schema enum constraint + cap 3 suggestions + always preview + off by default" with three of four mitigations (D-14 + D-15 default-off cover the remaining two).*

- **D-20:** **Token budget bounding.** Content cap at 4000 chars (D-04) keeps the user-prompt portion under ~1000 tokens worst-case; system prompt is ~150 tokens; existing tags list typically <100 tokens; total request ~1300 tokens. Llama 3.2 3B handles this in 1.5–4 seconds on modern desktop CPUs. JSON Schema constraint keeps response under 100 tokens. *Rationale: bounded latency keeps the loading state tolerable without cancellation; bounded request size avoids context-window blowup on long entries.*

### Claude's Discretion

- Exact pixel sizing of the ghost chip's dashed-border weight (`border-2` recommended; `border-1` or `border-3` also defensible — UX feel)
- Exact icon for the new-tag prefix (`<Plus />` recommended; `<Sparkles size={9} />` also defensible)
- Exact toast severity for the >30s loading warning (`info` recommended; `warning` also defensible)
- Whether the empty-state inline message uses opacity-fade or display-toggle for the 4s timeout (CSS implementation detail)
- Exact wording of console.error prefix on LLM call failure (`[tag-suggestions]` recommended)
- Whether to truncate ghost chip text with ellipsis at very long new-tag names (>20 chars) or wrap (recommend ellipsis with title attribute)
- Toggle widget visual — pick whichever existing AI Features section pattern is closest match
- Settings toggle's `aria-pressed` / `role="switch"` ARIA wiring detail
- Exact `temperature` parameter for the structured LLM call (recommend 0.3 — low for deterministic output, but tunable in v2 if quality is poor)
- Exact `top_p` for embedded backend (recommend 0.9 default, leave temperature as the primary knob)

### Folded Todos

- **STATE.md** "Phase 10 flagged HIGH research — recommend `/gsd-research-phase` at planning time for prompt engineering" → folded into D-04 (locked prompt + content cap) + D-05 (locked JSON Schema). Phase-specific research at planning time may still be valuable to validate llama.cpp's `response_format` support but the core architecture is locked.
- **STATE.md** "Ollama version compat for `format` JSON-Schema (requires 0.5+) — UX for older installs; decide in Phase 10 planning" → folded into D-03 (graceful degradation — older Ollama returns parse error → service returns `[]` → UI shows empty state, sparkle stays visible).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 10 scope
- `.planning/REQUIREMENTS.md` §AI / Auto-Tagging — AUTOTAG-01..07 acceptance criteria
- `.planning/ROADMAP.md` §Phase 10: Auto-Tagging AI Pipeline — Goal, Depends on, Success Criteria (5 items), Requirements mapping

### Phase 8 + 9 primitives this phase builds on
- `.planning/phases/08-home-dashboard-widgets/08-CONTEXT.md` — Phase 8 D-19 (`hybridAIService.askQuestion` routing convention; `insightService.ts` shape that this phase mirrors); Phase 8 PATTERNS.md graceful-fallback when Ollama unavailable
- `.planning/phases/09-first-run-onboarding/09-CONTEXT.md` — settings-table schema correctness (key, value, updated_at — NO created_at); aiSettingsService.ts pattern reuse
- `src/utils/insightService.ts` — Phase 8 output, the analog template for `tagSuggestionService.ts` (D-01)
- `src/utils/aiSettingsService.ts` — Phase 8/v1.0 output, the analog template for the two new tag-suggestion settings exports (D-16)
- `src/lib/hybridAIService.ts:48-59` — `askQuestion` shape; D-02 adds `requestStructured` alongside, NOT modifies existing function

### State machine + persistence patterns to mirror
- `src/stores/aiStore.ts:11-44` — `available`, `llm`, `embedding`, `aiBackend`, `embeddedStatus` fields; D-17 adds `tagSuggestionsEnabled` to this interface
- `src/components/SettingsView.tsx:283-505` — `AIFeaturesSection` structure with SectionHeader + multiple SettingRows; D-15 inserts new SettingRow inside this section
- `src/App.tsx:76-128` — existing `initAI` `useEffect` that loads aiBackend preference; D-17 extends to also load tagSuggestionsEnabled

### Chronicle AI principles
- `.planning/PROJECT.md` — privacy-first promise (zero network = local LLM only, NO cloud); local-AI-only positioning; one-time pricing model; the "AI assist quietly" v1.1 positioning anchors D-14 (no auto-apply, never bulk-accept)
- `.planning/STATE.md` — v1.1 carried decisions ("Auto-tagging goes through `hybridAIService` — NEVER call `ollamaService` directly from new code"); pitfall mitigations (Auto-tag hallucination — D-19)

### Research context (v1.1 authoritative)
- `.planning/research/ARCHITECTURE.md` §4 (Auto-Tagging AI Pipeline) — verdict statement, file layout, signature for `suggestTagsForEntry`, TagSuggestButton placement, hybridAIService routing rationale
- `.planning/research/FEATURES.md` §4 (Auto-Tagging Local LLM) — competitive context (Rosebud cloud auto-tags, Chronicle AI local), ghost-chip UX rationale, accept/reject deliberation, "Auto-tag on every keystroke" anti-pattern, prompt-engineering risk warning
- `.planning/research/PITFALLS.md` (search "auto-tag" / "Auto-tagging") — hallucination prevention, JSON-Schema enum + cap rationale, default-off recommendation
- `.planning/research/SUMMARY.md` — "Auto-tagging is one-shot via `hybridAIService`" architectural primitive

### Ollama + llama.cpp API documentation (external)
- Ollama `format` parameter (JSON Schema): https://github.com/ollama/ollama/blob/main/docs/api.md#chat-request-with-structured-outputs
- llama-server OpenAI-compatible `response_format`: https://github.com/ggerganov/llama.cpp/tree/master/examples/server#api-endpoints (look for `/v1/chat/completions` JSON Schema support)
- OpenAI structured outputs spec (referenced by llama-server): https://platform.openai.com/docs/guides/structured-outputs

### Backend dispatch ports (already in code)
- `OLLAMA_PORT = 11434` — see [src/lib/hybridAIService.ts:153](src/lib/hybridAIService.ts#L153)
- `EMBEDDED_PORT = 8189` — see [src/lib/hybridAIService.ts:67](src/lib/hybridAIService.ts#L67)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- [`src/utils/insightService.ts`](src/utils/insightService.ts) — Phase 8 output, structurally identical to `tagSuggestionService.ts`. Read for: try/catch envelope, getDb usage, hybridAI call pattern, settings KV write pattern. CLONE this shape.
- [`src/utils/aiSettingsService.ts`](src/utils/aiSettingsService.ts) — `loadAIBackendPreference` / `saveAIBackendPreference` are the exact analog for D-16's two new exports. CLONE the shape.
- [`src/lib/hybridAIService.ts`](src/lib/hybridAIService.ts) — `askQuestion` (lines 48-59) shows the backend dispatch pattern; D-02's `requestStructured` is added alongside following the same `if (backend === "embedded") askEmbedded… else askOllama…` shape.
- [`src/stores/aiStore.ts`](src/stores/aiStore.ts) — `available`, `llm`, `embedding` reactive fields; D-17 adds `tagSuggestionsEnabled` field with same Zustand patterns.
- [`src/components/SettingsView.tsx:283-505`](src/components/SettingsView.tsx) — AIFeaturesSection composition with SectionHeader + SettingRow rows; D-15 inserts new row using same grammar.
- [`src/components/TagRow.tsx`](src/components/TagRow.tsx) — modify to add `content` prop and render `<TagSuggestButton />` after `<TagInput />` (D-06).
- [`src/components/TagPill.tsx`](src/components/TagPill.tsx) — visual reference for ghost chip styling (D-12 inverts: solid → transparent, 1px solid → 2px dashed, dot → no dot).
- [`src/stores/tagStore.ts`](src/stores/tagStore.ts) — `addTag` + `addTagToEntry` are the existing helpers TagSuggestButton calls on accept (no new store APIs needed).
- [`src/lib/db.ts:79-83`](src/lib/db.ts) — settings KV table (key, value, updated_at — NO created_at; D-16 honors).
- [`src/App.tsx:76-128`](src/App.tsx) — initAI useEffect; D-17 extends with `loadTagSuggestionsEnabled()` call.
- `lucide-react` — `Sparkles` (sparkle button + AI Features section icon), `Loader2` (loading state), `X` (chip dismiss), `Plus` (new-tag prefix). All already used in v1.0/v1.1 — zero new imports.

### Established Patterns
- **Zustand granular selectors** — `useAIStore((s) => s.tagSuggestionsEnabled)` for the gate; ensures TagRow re-renders when toggle flips.
- **`getDb()` + parameterized SQL** — D-16 helpers use this (Phase 7 Pattern 2).
- **`settings` KV table** — `INSERT OR REPLACE INTO settings(key, value, updated_at) VALUES(?, ?, ?)` is the canonical write; missing-row read returns default (D-16).
- **Async helper with try/catch + console.error** — non-fatal UI errors caught at the service boundary; UI gracefully degrades (matches `aiSettingsService.ts` and `insightService.ts` patterns).
- **Reactive AI gating** — `aiStore.available` drives feature visibility; subscribers re-render when health-check flips. AUTOTAG-05/06/07 composite predicate (D-18) follows this.
- **Backend-conditional dispatch in hybridAIService** — `if (backend === "embedded") ... else ...` per [src/lib/hybridAIService.ts:52-58](src/lib/hybridAIService.ts#L52-L58). D-02's `requestStructured` follows the same shape.
- **shadcn primitive reuse** — Phase 9 used existing `alert-dialog`, `popover`, `button`. Phase 10 uses none of these (entirely new component) — but TagPill + TagInput + Sparkle button all use existing Tailwind utility classes, no new primitives.

### Integration Points
- `src/utils/tagSuggestionService.ts` — NEW file. Exports `suggestTagsForEntry`, `TagSuggestion` interface. Owns prompt + JSON-Schema + post-processing.
- `src/lib/hybridAIService.ts` — ADD `requestStructured(prompt, jsonSchema, systemPrompt?)` export alongside existing `askQuestion`. Backend dispatch handled inside.
- `src/utils/aiSettingsService.ts` — ADD `loadTagSuggestionsEnabled` + `saveTagSuggestionsEnabled` exports.
- `src/stores/aiStore.ts` — ADD `tagSuggestionsEnabled: boolean` field + `setTagSuggestionsEnabled(v: boolean)` setter.
- `src/App.tsx` — extend `initAI` useEffect to call `loadTagSuggestionsEnabled()` and seed aiStore.
- `src/components/SettingsView.tsx` — ADD new `<SettingRow label="Tag suggestions" ...>` inside `AIFeaturesSection()` (D-15).
- `src/components/TagRow.tsx` — ADD `content: string` prop to interface; render `<TagSuggestButton />` after `<TagInput />` gated on `useAIStore` composite predicate (D-18).
- `src/components/TagSuggestButton.tsx` — NEW file. Owns sparkle button + ghost chip rendering + per-chip accept/dismiss + local suggestions state.
- `src/components/EntryEditor.tsx` (or wherever `<TagRow entryId={...} />` is rendered today) — pass entry content as new `content` prop. Must read editor's current text reactively (likely via TipTap's editor state).

### Files NOT touched in this phase
- No changes to TagPill (it's pure presentation; ghost chips are a NEW component, not a TagPill variant)
- No changes to TagInput, TagAutocomplete (their behavior is independent of suggestions)
- No changes to viewStore, uiStore, entryStore (this is purely AI + tag wiring)
- No changes to db.ts schema (settings KV row is added at runtime, not via migration)
- No new shadcn primitives, no new dependencies, no `package.json` changes

</code_context>

<specifics>
## Specific Ideas

- **Hallucination prevention is non-negotiable.** The JSON Schema `enum` constraint on `existing.items` is the single most important pitfall mitigation in this phase. Without it, the LLM can confidently propose tags that don't exist in the user's library, and the user thinks "this is from my tags" when it's a hallucination. Don't let planning soften this constraint to "use enum if convenient" — it's load-bearing.
- **`hybridAIService.requestStructured` is the load-bearing API choice.** It honors AUTOTAG-02 ("never `ollamaService` directly") while keeping `askQuestion` (a Q&A function with citation parsing) uncontaminated. Future structured-output features (Phase 11+ if any) reuse this helper — establishing it now pays compounding dividends.
- **Default-off is a product principle, not a polish detail.** AUTOTAG-06 mandates "off by default; users opt in consciously." This protects the brand promise of "AI assist quietly while writing" — surprising users with AI suggestions on day 1 violates the privacy-first ethos that drives the $49/$99 conversion.
- **Ghost chips must look pending, not real.** The triple-signal (transparent bg + dashed border + missing color-dot) is intentional redundancy. Removing any one would risk users mistaking suggestions for accepted tags. The new-tag `<Plus>` prefix adds a fourth signal for "this will create something new."
- **Per-chip accept (no Accept All) is intentional UX friction.** AUTOTAG-04's "explicitly accepts" language is product-driven: every tag entering the journal is a deliberate choice. Bulk-accept would technically satisfy "click required" but spiritually violate the contract.
- **Empty state ≠ error state.** When LLM returns 0 valid suggestions, that's a successful call with nothing to show — surface a transient inline message. When LLM call fails (network, parse), that's an error — surface nothing (graceful), log to console. Don't conflate the two.
- **Sparkle button visibility composes 3 independent reactive gates.** AUTOTAG-05 (`available`), AUTOTAG-06 (`tagSuggestionsEnabled`), and an implicit `llm` capability gate. All three must be `true` for the button to appear. Hide-when-false (NOT disable-when-false) per AUTOTAG-05 explicit wording.
- **Content is passed top-down through TagRow as a new prop.** The current TagRow signature (`{ entryId }`) is insufficient — TagSuggestButton needs the entry's current text. Rather than reaching into entryStore from inside TagSuggestButton (state-coupling antipattern), the parent (EntryEditor or whoever renders TagRow) passes content as a prop, and TagRow forwards to TagSuggestButton. This keeps the data flow explicit and testable.
- **JSON-Schema `additionalProperties: false` is the safety net.** Without it, the LLM could emit extra fields the parser silently ignores (e.g., `confidence_scores`, `reasoning`). Strict-mode rejects unknown fields — fail closed is the right default for an AI-output surface.
- **30-second slow-call toast is informative, not actionable.** It tells the user "we know it's slow, you don't need to click again." It does NOT cancel the underlying request — that adds AbortController plumbing for negligible UX win. The toast is an info-signal, not a prompt to act.

</specifics>

<deferred>
## Deferred Ideas

- **Auto-tag-on-save** — research/FEATURES.md L455 explicit anti-pattern; Chronicle AI's "explicit user control over AI" principle. Permanently out of scope.
- **Auto-tag confidence indicators** — research/FEATURES.md flags as P3 (low impact) and notes LLM4Tag research showing LLMs can't reliably quantify tag confidence. Out of v1.1 scope.
- **Few-shot prompting** — D-04 explicit: schema constraint + natural-language is sufficient for v1. If UAT reveals quality issues, future phase can add 2-3 examples (200-300 tokens overhead).
- **Background re-tagging of historic entries** — would require batch processing + UI for browse/review. Different feature surface; out of Phase 10 scope.
- **Tag-suggestion analytics or quality metrics** — violates zero-network principle. Out of scope.
- **Inline edit of suggested tag name before accept** — adds an editable input to ghost chips; complexity for marginal value (user can just accept then rename via Tag Management when Phase 11 ships). Defer.
- **AbortController / cancel-during-loading** — D-09 explicit defer; LLM call latency 1.5–4s is tolerable; AbortController plumbing not worth the complexity.
- **Suggestion history / "show me my last suggestions" panel** — anti-pattern (D-13 session-only). Permanently deferred.
- **Multi-language entries / non-English tag suggestions** — English-only in v1.1. Future i18n phase would tackle this.
- **Custom prompt template per user** — out of v1.1; would require Settings UI for prompt editing + safety considerations. Defer to v2.
- **Tag color suggestion alongside name suggestion** — Tag Management (Phase 11) handles color assignment; Phase 10 tags inherit default color from `tagStore.addTag`.
- **Per-entry "AI tag suggestions used" flag for analytics** — violates zero-network; no analytics in app per PROJECT.md.
- **Suggestion ranking / re-ordering by relevance** — schema-bound output is already small (max 3 + 2); no need for client-side ranking in v1.

### Reviewed Todos (not folded)
- "Consider adding ESLint + `lint` npm script" (STATE.md) — orthogonal to Phase 10; remains in todos.

</deferred>

---

*Phase: 10-auto-tagging-ai-pipeline*
*Context gathered: 2026-04-18*
