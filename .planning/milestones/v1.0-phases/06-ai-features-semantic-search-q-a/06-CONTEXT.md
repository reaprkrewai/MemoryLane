---
gsd_artifact: context
phase: 6
title: AI Features (Semantic Search + Q&A)
version: 1.0
created: 2026-04-14
---

# Phase 6 Context: AI Features

## Phase Goal
Enable users to understand their journal entries through semantic search and natural language Q&A, powered by a local LLM running on their device. All inference stays local — no entries, embeddings, or questions ever leave the device.

---

## Locked Decisions

### 1. Core AI Capability Scope
**Decision:** Semantic search + natural language Q&A only.

**What this means:**
- **Semantic search**: Users type "find entries about career anxiety" and get results by *meaning*, not just keyword matches (using vector embeddings)
- **Q&A**: Users ask "when did I last feel stressed about deadlines?" and get a generated answer citing relevant entries
- **What's deferred**: Summaries, sentiment analysis, entity extraction, pattern insights → v2

**Why:** v1 ships the foundation (embeddings + vector search + LLM inference). These two features unlock value immediately. Summaries and patterns are additive enhancements, not essential to v1 launch.

**Downstream impact:** Researcher must investigate ChromaDB for vector storage, embedding inference, and LLM inference patterns. Planner needs to scope: embedding generation (first run + on new entries), vector DB initialization, Q&A prompt engineering.

---

### 2. Local LLM Requirement
**Decision:** Optional with graceful degradation.

**What this means:**
- If Ollama is running on localhost:11434 → semantic search + Q&A are available
- If Ollama is not running → search falls back to keyword-only (Phase 4 FTS5), Q&A is disabled, user sees helpful message
- Users can re-enable AI features in settings once they start Ollama

**Why:** Removes friction for non-technical users. Power users can still get full AI if they run Ollama. Keeps app usable offline without AI.

**Downstream impact:** Planner must design Ollama availability detection (health check at startup + before each AI operation). Need graceful fallback in search logic (keyword-only when vector DB unavailable). Settings UI needs "AI Features Status" indicator.

---

### 3. LLM Architecture: Ollama Only
**Decision:** Support Ollama exclusively. No llama.cpp, HuggingFace, or other runners in v1.

**What this means:**
- App connects to Ollama API (HTTP, localhost:11434)
- Users must have Ollama installed and running
- Recommended Ollama model: llama2:7b or llama2:13b (user chooses based on device capacity)
- Embedding model: nomic-embed-text (fixed, non-negotiable)

**Why:** Single clear requirement = simpler implementation + easier documentation. Ollama is the most user-friendly local LLM runner (single download, auto-manages models, cross-platform). Can expand to llama.cpp in v2 if demand justifies.

**Downstream impact:** Researcher should investigate Ollama API (HTTP endpoints for embeddings, completion, model listing). Planner needs to design Ollama model selection UI (let user pick 7b vs 13b vs custom). Documentation must include "Download Ollama" + "Install llama2 model" steps.

---

### 4. Embedding Model: nomic-embed-text
**Decision:** Fixed embedding model. App assumes users will run `ollama pull nomic-embed-text` before using semantic search.

**What this means:**
- All entry embeddings are generated with nomic-embed-text (1536-dim vectors)
- ChromaDB stores these vectors
- Vector similarity search uses these pre-computed embeddings
- No user choice of embedding model in v1

**Why:** Consistency + simplicity. One model = one embedding dimension = one DB schema. nomic-embed-text is fast, high-quality, and explicitly mentioned in your CLAUDE.md. Users won't notice this choice.

**Downstream impact:** Planner must handle: on first semantic search use, check if nomic-embed-text is available in Ollama. If not, prompt user to `ollama pull nomic-embed-text` and wait for download. Background embedding generation (process past entries to build initial vector DB).

---

### 5. Auto-Import Scope
**Decision:** Defer all smart imports (Google Photos, Spotify, Health APIs, Calendar) to v2.

**What this means:**
- Phase 6 does NOT include OAuth flows, API integrations, or external data pulling
- Users manually attach photos (already in Phase 5), manually tag entries with moods, manually add location/weather
- Focus: AI understanding of what users have already written

**Why:** OAuth + external APIs are complex, require network access (conflicts with privacy guarantee perception), and are orthogonal to AI core. v1 ships AI-over-existing-data. v2 adds automation on top.

**Deferred to v2:** Google Photos import, Spotify listening history, Apple Health/Google Fit, Calendar events, Browser history, Audio recording + Whisper transcription.

**Downstream impact:** No network calls in Phase 6. Researcher focuses purely on local LLM patterns. Planner can treat Phase 6 as fully offline.

---

### 6. Pattern Insights
**Decision:** Defer all pattern insights to v2. Phase 6 is search + Q&A only.

**What this means:**
- Phase 6 does NOT include: people tracking, place tracking, emotion trend detection, relationship analysis, frequency counting
- These require entity extraction + aggregation — deferred

**Why:** Would double the scope. v1 ships search + Q&A (standalone value). v2 adds insights on top (requires NER, clustering, temporal analysis).

**Deferred to v2:** Entity extraction, people/place frequency, relationship timelines, emotion trends, pattern detection UI.

**Downstream impact:** Researcher doesn't need to investigate entity extraction or ChromaDB metadata filtering for patterns. Planner focuses on embeddings + retrieval + completion (simpler scope).

---

### 7. UI/UX: Natural Language Search Box
**Decision:** Extend the existing search interface (Phase 4) with a "natural language" mode toggle.

**What this means:**
- Search page has two modes: **Keyword Search** (current FTS5) and **AI Search** (semantic + Q&A)
- Users toggle between them
- AI Search has a text input: "Ask a question or describe what you're looking for"
- Results show: relevant entries + AI-generated answer with citations
- Falls back to keyword search if Ollama unavailable

**Why:** Minimal UI addition (reuse existing search page structure). Clear mental model: "search by meaning or by keyword". Low friction integration.

**UX flow:**
1. User clicks "AI Search" tab
2. System checks if Ollama is available (if not, show "AI features unavailable, install Ollama" message)
3. User types question: "when did I feel anxious about interviews?"
4. System:
   a. Vectorizes question
   b. Finds similar entries (vector similarity, top K=5-10)
   c. Sends to LLM: "Based on these entries, answer: {question}"
   d. Shows: AI-generated answer + list of cited entries
5. User can click citations to open full entries

**Downstream impact:** Planner must design: search tab switching, AI search input styling, result layout (answer + citations), empty state (when no entries match), error states (Ollama unavailable, slow inference).

---

### 8. Ollama Setup: Guided Wizard
**Decision:** On first semantic search attempt, check if Ollama is running. If not, show a guided setup wizard.

**What this means:**
- First time user clicks AI Search tab → app checks localhost:11434
- If available → proceed to search
- If unavailable → modal wizard appears:
  1. "AI features require Ollama. Let's set it up."
  2. Explanation: "Ollama runs AI models locally on your device. All your journal entries stay private."
  3. 3-step guide:
     - "Download Ollama" (link to ollama.com/download)
     - "Install Ollama" (follow installer)
     - "Pull embedding model" (command: `ollama pull nomic-embed-text`)
  4. "Check again" button (re-checks localhost:11434)
  5. "Skip for now" button (AI search disabled, can retry from settings)

**Why:** Lowers friction for first-time users. Clear, non-technical instructions. Optional (skip button). Can retry any time.

**Downstream impact:** Planner must design wizard modal + implement Ollama health check endpoint. Need fallback UI for each setup step. Consider: Should we shell out and run `ollama` CLI if it's installed locally? Or just HTTP check? (Keep it HTTP-only for simplicity, let users manage Ollama independently).

---

## Related Prior Decisions

**From Phase 1: Foundation**
- SQLite schema includes `embeddings` table (empty in v1, populated in Phase 6)
- Entry PKs are UUID TEXT (compatible with vector DB keys)
- Metadata JSON column available for storing embedding model version, timestamp

**From Phase 4: Search & Discovery**
- FTS5 full-text search is working, polished
- Search page structure exists
- Users expect filtering by date, tags, mood (semantic search should support same filters)

**From Phase 5: Media, Security & Settings**
- App is fully offline (no network calls)
- Settings UI pattern established (modal with categories)
- Theme switching works (dark/light mode)

**Design principles (from PROJECT.md):**
- Privacy-first: All AI computation local, no data leaves device
- User owns their tools: One-time purchase model, no lock-in
- Distinctive UI: Avoid generic AI aesthetics (use frontend-design patterns)
- Minimize friction: Optional features, graceful degradation, clear setup

---

## Success Criteria for Phase 6

What must be true for Phase 6 to ship:

1. **Semantic Search Works**
   - User can ask "find entries about career anxiety" and get relevant results by *meaning*
   - Results are ranked by vector similarity (L2 distance or cosine similarity)
   - Results are significantly better than keyword search for semantic queries
   - Ollama available → vector search works; Ollama unavailable → graceful fallback

2. **Q&A Works**
   - User can ask "when did I last feel stressed?" and get a generated answer
   - Answer is grounded in retrieved entries (user sees which entries the LLM used)
   - Answer is coherent and relevant (not hallucinated)
   - Inference latency is acceptable (<10s for typical questions)

3. **Setup is Smooth**
   - First-time user sees helpful wizard if Ollama missing
   - Instructions are clear, non-technical
   - Users can retry setup without leaving the app

4. **Graceful Degradation**
   - AI search unavailable if Ollama down → falls back to keyword search, shows message
   - Settings shows "AI Status: Available" or "AI Status: Ollama not detected"
   - No crashes, no hangs, no network calls

5. **Performance**
   - Initial embedding generation (for existing entries) completes without freezing UI
   - Vector search completes in <500ms for typical queries
   - Q&A LLM inference completes in <10s for typical questions

6. **Integration**
   - Existing search page extends cleanly (tab toggle, no major restructuring)
   - Mood/tag/date filters from Phase 4 work with semantic search (filter results before or after?)
   - No breaking changes to previous phases

---

## Open Questions (For Researcher)

1. **Embedding generation strategy**: Should we generate embeddings for all entries on first semantic search use (slow first-run), or background them? Or on entry creation?
2. **ChromaDB vs alternatives**: Is ChromaDB the right choice for local vector storage, or are there better options?
3. **LLM prompt engineering**: What's the best prompt structure for Q&A over journal entries? How do we ensure grounded answers?
4. **Vector filtering**: Can we apply date/tag/mood filters efficiently on top of vector similarity? (Filter before retrieval, or retrieve then filter?)
5. **Model recommendations**: Should we recommend llama2:7b or 13b? What are memory/speed trade-offs?
6. **Ollama health check**: Best way to detect if Ollama is running and models are available? (HTTP GET to `/api/tags`?)

---

## Scope Boundaries (What's NOT Phase 6)

**Explicitly deferred to v2:**
- Entity extraction (people, places, activities)
- Pattern insights (frequency counts, trends, timelines)
- Sentiment analysis
- Entry summarization
- Smart auto-imports (Google Photos, Spotify, Health, Calendar)
- Self-hosted sync
- Audio recording + Whisper transcription
- Import from other apps

**Out of scope forever (per privacy commitment):**
- Cloud AI APIs (OpenAI, Anthropic, Google)
- Third-party model hosting
- Data leaving the device

---

## Next Steps

1. **Researcher**: Investigate vector DB options (ChromaDB, Faiss, others), Ollama integration patterns, LLM prompt engineering for journal Q&A
2. **Planner**: Break Phase 6 into plans around: embedding generation, vector search UI, Q&A inference, Ollama setup wizard, settings integration
3. **Implementation**: Start with embedding generation (background task), then vector search UI, then Q&A, then wizard, then polish

---

**Context created:** 2026-04-14  
**Decided by:** User (all 6 gray areas discussed)  
**Status:** Ready for research phase
