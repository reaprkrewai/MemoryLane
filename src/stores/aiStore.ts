import { create } from "zustand";

export type EmbeddedStatus = "not-downloaded" | "downloading" | "ready" | "running" | "error";
export type AIBackend = "embedded" | "ollama";

/**
 * AI feature availability state.
 * Tracks Ollama/embedded availability, backend preference, and model status.
 * Most state is runtime-only; aiBackend and downloadProgress are persisted to SQLite.
 */
interface AIState {
  // Backend selection and persistence
  aiBackend: AIBackend; // "embedded" | "ollama" - persisted to SQLite settings

  // Ollama availability (runtime-only)
  available: boolean; // Ollama is running on localhost:11434
  embedding: boolean; // nomic-embed-text model available
  llm: boolean; // llama2 model available

  // Embedded AI status (runtime-only during this session)
  embeddedStatus: EmbeddedStatus; // lifecycle of embedded AI
  downloadProgress: number; // 0-100, during model download
  embeddedModel: string; // "phi3-mini-q4"

  // Status during checking/loading
  status: "checking" | "ready" | "unavailable";

  // Setup wizard state
  showSetupWizard: boolean; // Whether to show the setup wizard modal
  skipSetupWizard: boolean; // Whether user has skipped wizard for this session

  // Tag suggestions toggle (AUTOTAG-06 — persisted to SQLite settings, default off)
  tagSuggestionsEnabled: boolean;

  // Actions
  setAIBackend(backend: AIBackend): void;
  setAIStatus(health: {
    available: boolean;
    embedding: boolean;
    llm: boolean;
  }): void;
  setEmbeddedStatus(status: EmbeddedStatus): void;
  setDownloadProgress(percentage: number): void;
  setStatus(status: "checking" | "ready" | "unavailable"): void;
  setShowSetupWizard(show: boolean): void;
  setSkipSetupWizard(skip: boolean): void;
  setTagSuggestionsEnabled(v: boolean): void;
}

export const useAIStore = create<AIState>((set) => ({
  // Initial state: AI features not yet checked
  aiBackend: "embedded", // Default to embedded
  available: false,
  embedding: false,
  llm: false,
  embeddedStatus: "not-downloaded",
  downloadProgress: 0,
  embeddedModel: "phi3-mini-q4",
  status: "checking",
  showSetupWizard: false,
  skipSetupWizard: false,
  tagSuggestionsEnabled: false, // AUTOTAG-06: default OFF — users opt in consciously

  setAIBackend: (backend) => set({ aiBackend: backend }),

  setAIStatus: (health) =>
    set({
      available: health.available,
      embedding: health.embedding,
      llm: health.llm,
      status: health.available ? "ready" : "unavailable",
    }),

  setEmbeddedStatus: (status) => set({ embeddedStatus: status }),

  setDownloadProgress: (percentage) => set({ downloadProgress: percentage }),

  setStatus: (status) => set({ status }),

  setShowSetupWizard: (show) => set({ showSetupWizard: show }),

  setSkipSetupWizard: (skip) => set({ skipSetupWizard: skip }),
  setTagSuggestionsEnabled: (v) => set({ tagSuggestionsEnabled: v }),
}));
