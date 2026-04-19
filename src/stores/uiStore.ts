import { create } from "zustand";
import {
  applyPalette,
  getStoredPaletteId,
  getStoredCustomHex,
  type PaletteId,
} from "../lib/paletteData";

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

  // PIN/Security state (tri-state: null = unknown, true = set, false = not set)
  isPinSet: boolean | null;
  isLocked: boolean;
  lastActivityTime: number;

  // Onboarding state (tri-state: null = unknown, true = completed, false = needs onboarding)
  isOnboardingCompleted: boolean | null;

  // Settings state
  theme: "light" | "dark";
  fontSize: "small" | "medium" | "large";
  idleTimeout: 1 | 5 | 15 | 30 | "never";
  paletteId: PaletteId;
  customAccentHex: string;

  setDbReady: (ready: boolean) => void;
  setDbError: (err: string) => void;
  setOnThisDayCollapsed: (v: boolean) => void;

  // PIN/Security setters
  setIsPinSet: (set: boolean | null) => void;
  setIsLocked: (locked: boolean) => void;
  setLastActivityTime: () => void;

  // Onboarding setters
  setIsOnboardingCompleted: (v: boolean | null) => void;

  // Settings setters
  setTheme: (theme: "light" | "dark") => void;
  setFontSize: (size: "small" | "medium" | "large") => void;
  setIdleTimeout: (timeout: 1 | 5 | 15 | 30 | "never") => void;
  setPalette: (id: PaletteId, customHex?: string) => void;
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

export const useUiStore = create<UIState>((set, get) => ({
  isDbReady: false,
  dbError: null,
  onThisDayCollapsed: false,

  isPinSet: null, // tri-state: null = unknown, true = set, false = not set
  isLocked: false,
  lastActivityTime: Date.now(),

  isOnboardingCompleted: null, // tri-state: null = unknown, true = completed, false = needs onboarding

  theme: getStoredTheme(),
  fontSize: getStoredFontSize(),
  idleTimeout: getStoredIdleTimeout(),
  paletteId: getStoredPaletteId(),
  customAccentHex: getStoredCustomHex(),

  setDbReady: (ready) => set({ isDbReady: ready }),
  setDbError: (err) => set({ dbError: err }),
  setOnThisDayCollapsed: (v) => set({ onThisDayCollapsed: v }),

  setIsPinSet: (isPinSet) => set({ isPinSet }),
  setIsLocked: (locked) => set({ isLocked: locked }),
  setLastActivityTime: () => set({ lastActivityTime: Date.now() }),

  setIsOnboardingCompleted: (isOnboardingCompleted) => set({ isOnboardingCompleted }),

  setTheme: (theme) => {
    set({ theme });
    localStorage.setItem("theme", theme);
    applyTheme(theme);
    // Re-apply palette for new mode (accent colors differ between light/dark)
    const { paletteId, customAccentHex } = get();
    applyPalette(
      paletteId,
      theme,
      paletteId === "custom" ? customAccentHex : undefined
    );
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
  setPalette: (id, customHex) => {
    const resolvedHex = customHex ?? get().customAccentHex;
    set({
      paletteId: id,
      ...(customHex !== undefined ? { customAccentHex: customHex } : {}),
    });
    localStorage.setItem("paletteId", id);
    if (customHex !== undefined) localStorage.setItem("customAccentHex", customHex);
    applyPalette(id, get().theme, id === "custom" ? resolvedHex : undefined);
  },
}));
