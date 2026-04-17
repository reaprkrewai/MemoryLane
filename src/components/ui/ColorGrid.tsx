import { Check } from "lucide-react";
import { useRef } from "react";

interface ColorGridProps {
  colors: string[];
  selected?: string;
  onSelect: (color: string) => void;
  ariaLabel: string;
  cols?: number; // default 5
}

/**
 * Accessible color-swatch grid primitive (Phase 7 — SC#5 / TAGUX-01).
 * Implements the ARIA radio-group pattern: arrow keys navigate, Enter/Space selects,
 * roving tabIndex (single tab stop into the group), focus-visible ring on each swatch.
 *
 * Visual contract: pixel-identical to the v1.0 TagPill inline grid (h-6 w-6 swatches,
 * Check icon size 14 in white at strokeWidth 3 when selected).
 *
 * Palette is consumer-supplied (palette-agnostic per D-21). TagPill passes TAG_COLORS;
 * Phase 11 Tag Management will pass the 12-color dual-tone palette.
 */
export function ColorGrid({
  colors,
  selected,
  onSelect,
  ariaLabel,
  cols = 5,
}: ColorGridProps) {
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  // ARIA radio-group keyboard model (D-24):
  //   ArrowRight / ArrowLeft  — move focus within the row, wrapping at row edges
  //   ArrowDown  / ArrowUp    — move focus across rows, clamping at first/last
  //   Enter / Space           — select the focused swatch
  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, idx: number) => {
    let nextIdx = idx;
    if (e.key === "ArrowRight") nextIdx = (idx + 1) % colors.length;
    else if (e.key === "ArrowLeft") nextIdx = (idx - 1 + colors.length) % colors.length;
    else if (e.key === "ArrowDown") nextIdx = Math.min(idx + cols, colors.length - 1);
    else if (e.key === "ArrowUp") nextIdx = Math.max(idx - cols, 0);
    else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect(colors[idx]);
      return;
    } else {
      return;
    }
    e.preventDefault();
    buttonRefs.current[nextIdx]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="grid gap-2"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {colors.map((color, idx) => {
        const isSelected = selected === color;
        // Roving tabIndex: the selected swatch is the single tab-stop; if no selection,
        // the first swatch is the entry point. Other swatches are reached via arrow keys.
        const isTabStop = isSelected || (!selected && idx === 0);
        return (
          <button
            key={color}
            ref={(el) => {
              buttonRefs.current[idx] = el;
            }}
            type="button"
            role="radio"
            aria-checked={isSelected}
            tabIndex={isTabStop ? 0 : -1}
            className="relative flex h-6 w-6 items-center justify-center rounded-md transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            style={{ backgroundColor: color }}
            onClick={() => onSelect(color)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            aria-label={`Select color ${color}`}
          >
            {isSelected && (
              <Check
                size={14}
                style={{ color: "#ffffff", strokeWidth: 3 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
