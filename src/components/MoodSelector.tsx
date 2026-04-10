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
  const handleClick = (value: string) => {
    // Toggle: clicking an already-selected mood deselects it
    onMoodChange(mood === value ? null : value)
  }

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        {MOODS.map(({ value, icon: Icon, label }) => {
          const isSelected = mood === value
          return (
            <Tooltip key={value} delayDuration={500}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => handleClick(value)}
                  className={[
                    "flex h-9 w-9 items-center justify-center rounded-md",
                    "transition-all duration-150",
                    isSelected
                      ? "scale-[1.0] bg-amber-50 dark:bg-amber-950/20"
                      : "bg-transparent",
                  ].join(" ")}
                  aria-label={label}
                  aria-pressed={isSelected}
                >
                  <Icon
                    size={18}
                    className={[
                      "transition-colors duration-150",
                      isSelected
                        ? "text-accent"
                        : "text-muted hover:text-text",
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
