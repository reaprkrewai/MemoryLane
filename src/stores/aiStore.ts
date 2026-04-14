import { create } from "zustand";

/**
 * AI feature availability state.
 * Tracks whether Ollama is running and which models are available.
 * Runtime-only (no persistence).
 */
interface AIState {
  // Ollama availability
  available: boolean; // Ollama is running on localhost:11434
  embedding: boolean; // nomic-embed-text model available
  llm: boolean; // llama2 model available

  // Status during checking/loading
  status: "checking" | "ready" | "unavailable";

  // Setup wizard state
  showSetupWizard: boolean; // Whether to show the setup wizard modal
  skipSetupWizard: boolean; // Whether user has skipped wizard for this session

  // Actions
  setAIStatus(health: {
    available: boolean;
    embedding: boolean;
    llm: boolean;
  }): void;
  setStatus(status: "checking" | "ready" | "unavailable"): void;
  setShowSetupWizard(show: boolean): void;
  setSkipSetupWizard(skip: boolean): void;
}

export const useAIStore = create<AIState>((set) => ({
  // Initial state: AI features not yet checked
  available: false,
  embedding: false,
  llm: false,
  status: "checking",
  showSetupWizard: false,
  skipSetupWizard: false,

  setAIStatus: (health) =>
    set({
      available: health.available,
      embedding: health.embedding,
      llm: health.llm,
      status: health.available ? "ready" : "unavailable",
    }),

  setStatus: (status) => set({ status }),

  setShowSetupWizard: (show) => set({ showSetupWizard: show }),

  setSkipSetupWizard: (skip) => set({ skipSetupWizard: skip }),
}));
