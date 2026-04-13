import { create } from "zustand";

// --- Theme helpers ---
export function applyTheme(theme: "light" | "dark") {
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
    root.classList.remove("light");
  } else {
    root.classList.remove("dark");
    root.classList.add("light");
  }
}

// --- Font scale helpers ---
export function applyFontScale(size: "small" | "medium" | "large") {
  const root = document.documentElement;
  root.classList.remove("font-small", "font-medium", "font-large");
  root.classList.add(`font-${size}`);
}

interface UIState {
  isDbReady: boolean;
  dbError: string | null;
  onThisDayCollapsed: boolean;

  // Settings state
  theme: "light" | "dark";
  fontSize: "small" | "medium" | "large";
  idleTimeout: 1 | 5 | 15 | 30 | "never";
  lastActivityTime: number;
  isLocked: boolean;

  setDbReady: (ready: boolean) => void;
  setDbError: (err: string) => void;
  setOnThisDayCollapsed: (v: boolean) => void;

  // Settings setters
  setTheme: (theme: "light" | "dark") => void;
  setFontSize: (size: "small" | "medium" | "large") => void;
  setIdleTimeout: (timeout: 1 | 5 | 15 | 30 | "never") => void;
  setLastActivityTime: () => void;
  setIsLocked: (locked: boolean) => void;
}

function getStoredTheme(): "light" | "dark" {
  const stored = localStorage.getItem("theme");
  if (stored === "light" || stored === "dark") return stored;
  return "dark";
}

function getStoredFontSize(): "small" | "medium" | "large" {
  const stored = localStorage.getItem("fontSize");
  if (stored === "small" || stored === "medium" || stored === "large") return stored;
  return "medium";
}

function getStoredIdleTimeout(): 1 | 5 | 15 | 30 | "never" {
  const stored = localStorage.getItem("idleTimeout");
  if (stored === "never") return "never";
  const n = Number(stored);
  if (n === 1 || n === 5 || n === 15 || n === 30) return n;
  return 5;
}

export const useUiStore = create<UIState>((set) => ({
  isDbReady: false,
  dbError: null,
  onThisDayCollapsed: false,

  theme: getStoredTheme(),
  fontSize: getStoredFontSize(),
  idleTimeout: getStoredIdleTimeout(),
  lastActivityTime: Date.now(),
  isLocked: false,

  setDbReady: (ready) => set({ isDbReady: ready }),
  setDbError: (err) => set({ dbError: err }),
  setOnThisDayCollapsed: (v) => set({ onThisDayCollapsed: v }),

  setTheme: (theme) => {
    set({ theme });
    localStorage.setItem("theme", theme);
    applyTheme(theme);
  },
  setFontSize: (size) => {
    set({ fontSize: size });
    localStorage.setItem("fontSize", size);
    applyFontScale(size);
  },
  setIdleTimeout: (timeout) => {
    set({ idleTimeout: timeout });
    localStorage.setItem("idleTimeout", String(timeout));
  },
  setLastActivityTime: () => set({ lastActivityTime: Date.now() }),
  setIsLocked: (locked) => set({ isLocked: locked }),
}));
