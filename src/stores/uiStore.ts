import { create } from "zustand";

interface UIState {
  isDbReady: boolean;
  dbError: string | null;
  onThisDayCollapsed: boolean;
  setDbReady: (ready: boolean) => void;
  setDbError: (err: string) => void;
  setOnThisDayCollapsed: (v: boolean) => void;
}

export const useUiStore = create<UIState>((set) => ({
  isDbReady: false,
  dbError: null,
  onThisDayCollapsed: false,
  setDbReady: (ready) => set({ isDbReady: ready }),
  setDbError: (err) => set({ dbError: err }),
  setOnThisDayCollapsed: (v) => set({ onThisDayCollapsed: v }),
}));
