import { create } from "zustand";

interface UIState {
  isDbReady: boolean;
  dbError: string | null;
  setDbReady: (ready: boolean) => void;
  setDbError: (err: string) => void;
}

export const useUiStore = create<UIState>((set) => ({
  isDbReady: false,
  dbError: null,
  setDbReady: (ready) => set({ isDbReady: ready }),
  setDbError: (err) => set({ dbError: err }),
}));
