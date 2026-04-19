import { useState } from "react"
import { Laugh, Smile, Meh, Frown, Angry } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip"

const MOODS = [
  { value: "great", icon: Laugh, label: "Great" },
  { value: "good", icon: Smile, label: "Good" },
  { value: "okay", icon: Meh, label: "Okay" },
  { value: "bad", icon: Frown, label: "Bad" },
  { value: "awful", icon: Angry, label: "Awful" },
] as const

interface MoodSelectorProps {
  mood: string | null
  onMoodChange: (mood: string | null) => void
}

export function MoodSelector({ mood, onMoodChange }: MoodSelectorProps) {
  const [springing, setSpringing] = useState<string | null>(null);

  const handleClick = (value: string) => {
    // Trigger spring animation for 120ms on the clicked button
    setSpringing(value);
    setTimeout(() => setSpringing(null), 120);
    // Toggle: clicking an already-selected mood deselects it
    onMoodChange(mood === value ? null : value);
  }

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1 bg-surface-secondary rounded-lg p-1">
        {MOODS.map(({ value, icon: Icon, label }) => {
          const isSelected = mood === value
          return (
            <Tooltip key={value} delayDuration={500}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => handleClick(value)}
                  className={[
                    "flex h-8 w-8 items-center justify-center rounded-md",
                    "transition-all duration-150",
                    isSelected
                      ? "bg-accent/20"
                      : "hover:bg-surface",
                    springing === value ? "animate-mood-spring" : "",
                  ].join(" ")}
                  aria-label={label}
                  aria-pressed={isSelected}
                >
                  <Icon
                    size={16}
                    className={[
                      "transition-colors duration-150",
                      isSelected
                        ? "text-accent"
                        : "text-text-secondary hover:text-text",
                    ].join(" ")}
                    style={
                      isSelected
                        ? { color: "var(--color-accent)" }
                        : undefined
                    }
                  />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <span>{label}</span>
              </TooltipContent>
            </Tooltip>
          )
        })}
      </div>
    </TooltipProvider>
  )
}
