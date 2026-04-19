import { useState } from "react";
import { X } from "lucide-react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "./ui/popover";
import { ColorGrid } from "./ui/ColorGrid";
import { TAG_COLORS } from "../stores/tagStore";

interface TagPillProps {
  tag: { id: string; name: string; color: string };
  onRemove: () => void;
  onColorChange: (color: string) => void;
}

export function TagPill({ tag, onRemove, onColorChange }: TagPillProps) {
  const [open, setOpen] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isRemoving) return; // prevent double-fire
    setIsRemoving(true);
    // Defer the actual removal until the pop-out animation completes (120ms per tailwind.config.js token)
    setTimeout(() => onRemove(), 120);
  };

  const handleColorSelect = (color: string) => {
    onColorChange(color);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div
          className={`group inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-all hover:shadow-sm animate-tag-pop-in ${isRemoving ? "animate-tag-pop-out" : ""}`}
          style={{
            backgroundColor: `color-mix(in srgb, ${tag.color} 12%, transparent)`,
            borderColor: `color-mix(in srgb, ${tag.color} 35%, transparent)`,
            color: "var(--color-text)",
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setOpen(true);
            }
          }}
        >
          <span className="select-none">
            {tag.name}
          </span>
          <button
            type="button"
            className="opacity-0 transition-opacity group-hover:opacity-100 flex items-center justify-center p-0.5 rounded hover:text-destructive"
            onClick={handleRemove}
            aria-label={`Remove tag ${tag.name}`}
          >
            <X size={14} />
          </button>
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" onClick={(e) => e.stopPropagation()}>
        <ColorGrid
          colors={TAG_COLORS.map(t => t.base)}
          selected={tag.color}
          onSelect={handleColorSelect}
          ariaLabel={`Color for tag ${tag.name}`}
          cols={6}
        />
      </PopoverContent>
    </Popover>
  );
}
