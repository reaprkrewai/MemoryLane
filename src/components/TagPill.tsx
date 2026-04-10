import { useState } from "react";
import { X, Check } from "lucide-react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "./ui/popover";
import { TAG_COLORS } from "../stores/tagStore";

interface TagPillProps {
  tag: { id: string; name: string; color: string };
  onRemove: () => void;
  onColorChange: (color: string) => void;
}

export function TagPill({ tag, onRemove, onColorChange }: TagPillProps) {
  const [open, setOpen] = useState(false);

  const handleColorSelect = (color: string) => {
    onColorChange(color);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div
          className="group inline-flex cursor-pointer items-center gap-1 rounded-full border py-[4px] pl-3 pr-2 transition-colors"
          style={{
            backgroundColor: `color-mix(in srgb, ${tag.color} 15%, transparent)`,
            borderColor: `color-mix(in srgb, ${tag.color} 40%, transparent)`,
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
          <span
            className="text-label select-none"
            style={{ color: "var(--color-text)" }}
          >
            {tag.name}
          </span>
          <button
            type="button"
            className="opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
            style={{ color: "var(--color-text)" }}
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            aria-label={`Remove tag ${tag.name}`}
          >
            <X size={14} />
          </button>
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" onClick={(e) => e.stopPropagation()}>
        <div className="grid grid-cols-4 gap-1">
          {TAG_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              className="relative flex h-5 w-5 items-center justify-center rounded-full transition-transform hover:scale-110"
              style={{ backgroundColor: color }}
              onClick={() => handleColorSelect(color)}
              aria-label={`Select color ${color}`}
            >
              {tag.color === color && (
                <Check
                  size={12}
                  style={{
                    color: "#ffffff",
                  }}
                />
              )}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
