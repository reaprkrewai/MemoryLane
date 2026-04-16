export type PaletteId =
  | "amber"
  | "ocean"
  | "forest"
  | "rose"
  | "lavender"
  | "slate"
  | "custom";

export interface PaletteVariant {
  accent: string; // CSS hex color for --color-accent
  accentSoft: string; // CSS hex color for --color-accent-soft
  primary: string; // Raw oklch() string for --primary and --ring
}

export interface Palette {
  id: Exclude<PaletteId, "custom">;
  label: string;
  dark: PaletteVariant;
  light: PaletteVariant;
}

// Preset palettes with light/dark variants
export const PRESETS: Palette[] = [
  {
    id: "amber",
    label: "Amber",
    dark: {
      accent: "#F59E0B",
      accentSoft: "#78350F",
      primary: "oklch(0.75 0.17 70)",
    },
    light: {
      accent: "#D97706",
      accentSoft: "#FEF3C7",
      primary: "oklch(0.65 0.16 70)",
    },
  },
  {
    id: "ocean",
    label: "Ocean",
    dark: {
      accent: "#38BDF8",
      accentSoft: "#0C4A6E",
      primary: "oklch(0.74 0.14 220)",
    },
    light: {
      accent: "#0284C7",
      accentSoft: "#E0F2FE",
      primary: "oklch(0.55 0.16 220)",
    },
  },
  {
    id: "forest",
    label: "Forest",
    dark: {
      accent: "#4ADE80",
      accentSoft: "#14532D",
      primary: "oklch(0.76 0.17 145)",
    },
    light: {
      accent: "#16A34A",
      accentSoft: "#DCFCE7",
      primary: "oklch(0.52 0.17 145)",
    },
  },
  {
    id: "rose",
    label: "Rose",
    dark: {
      accent: "#FB7185",
      accentSoft: "#4C0519",
      primary: "oklch(0.70 0.19 15)",
    },
    light: {
      accent: "#E11D48",
      accentSoft: "#FFE4E6",
      primary: "oklch(0.55 0.22 15)",
    },
  },
  {
    id: "lavender",
    label: "Lavender",
    dark: {
      accent: "#A78BFA",
      accentSoft: "#2E1065",
      primary: "oklch(0.68 0.18 290)",
    },
    light: {
      accent: "#7C3AED",
      accentSoft: "#EDE9FE",
      primary: "oklch(0.50 0.20 290)",
    },
  },
  {
    id: "slate",
    label: "Slate",
    dark: {
      accent: "#94A3B8",
      accentSoft: "#1E293B",
      primary: "oklch(0.66 0.04 240)",
    },
    light: {
      accent: "#475569",
      accentSoft: "#F1F5F9",
      primary: "oklch(0.44 0.05 240)",
    },
  },
];

// Apply palette to the DOM
export function applyPalette(
  id: PaletteId,
  theme: "light" | "dark",
  customHex?: string
): void {
  const root = document.documentElement;
  let v: PaletteVariant;

  if (id === "custom" && customHex) {
    v = deriveCustomVariant(customHex, theme);
  } else {
    const preset = PRESETS.find((p) => p.id === id) ?? PRESETS[0];
    v = theme === "dark" ? preset.dark : preset.light;
  }

  root.style.setProperty("--color-accent", v.accent);
  root.style.setProperty("--color-accent-soft", v.accentSoft);
  root.style.setProperty("--primary", v.primary);
  root.style.setProperty("--ring", v.primary);
  root.style.setProperty("--sidebar-primary", v.primary);
  root.style.setProperty("--sidebar-ring", v.primary);
}

// Derive custom palette variant from a hex color
function deriveCustomVariant(hex: string, theme: "light" | "dark"): PaletteVariant {
  // accentSoft: overlay with alpha channel via hex
  const alphaHex = theme === "dark"
    ? Math.round(0.2 * 255)
      .toString(16)
      .padStart(2, "0")
    : Math.round(0.15 * 255)
      .toString(16)
      .padStart(2, "0");
  const accentSoft = `${hex}${alphaHex}`;

  // Approximate oklch from hex for --primary
  const primary = hexToOklchApprox(hex, theme);

  return { accent: hex, accentSoft, primary };
}

// Convert hex color to approximate oklch() string
function hexToOklchApprox(hex: string, theme: "light" | "dark"): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  // Calculate hue from RGB
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;
  if (delta > 0) {
    if (max === r) {
      h = 60 * (((g - b) / delta) % 6);
    } else if (max === g) {
      h = 60 * ((b - r) / delta + 2);
    } else {
      h = 60 * ((r - g) / delta + 4);
    }
    if (h < 0) h += 360;
  }

  // Calculate saturation
  const lHsl = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lHsl - 1));

  // Map to oklch
  const C = parseFloat((s * 0.22).toFixed(3));
  const L = theme === "dark" ? 0.72 : 0.55;

  return `oklch(${L} ${C} ${Math.round(h)})`;
}

// Storage reader helpers
export function getStoredPaletteId(): PaletteId {
  const v = localStorage.getItem("paletteId");
  const valid: PaletteId[] = [
    "amber",
    "ocean",
    "forest",
    "rose",
    "lavender",
    "slate",
    "custom",
  ];
  return valid.includes(v as PaletteId) ? (v as PaletteId) : "amber";
}

export function getStoredCustomHex(): string {
  const v = localStorage.getItem("customAccentHex");
  return v && /^#[0-9a-fA-F]{6}$/.test(v) ? v : "#F59E0B";
}
