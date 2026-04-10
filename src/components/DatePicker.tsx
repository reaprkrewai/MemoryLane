import { useState } from "react"
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"
import { Calendar } from "./ui/calendar"

interface DatePickerProps {
  date: Date
  onDateChange: (date: Date) => void
}

export function DatePicker({ date, onDateChange }: DatePickerProps) {
  const [open, setOpen] = useState(false)

  // Format as "Wednesday, Apr 9"
  const displayText = date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  })

  // Time as HH:MM for input[type="time"]
  const timeString = [
    String(date.getHours()).padStart(2, "0"),
    String(date.getMinutes()).padStart(2, "0"),
  ].join(":")

  const handleDateSelect = (selected: Date | undefined) => {
    if (!selected) return
    // Preserve current time
    const combined = new Date(selected)
    combined.setHours(date.getHours(), date.getMinutes(), date.getSeconds(), 0)
    onDateChange(combined)
  }

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const [hours, minutes] = e.target.value.split(":").map(Number)
    const combined = new Date(date)
    combined.setHours(hours ?? 0, minutes ?? 0, 0, 0)
    onDateChange(combined)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="text-label text-muted hover:text-text cursor-pointer transition-colors"
          style={{ fontSize: "12px", lineHeight: "1.4" }}
          aria-label="Change entry date"
        >
          {displayText}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-3">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleDateSelect}
        />
        <div className="mt-2 flex items-center gap-2">
          <label
            htmlFor="entry-time"
            className="text-label text-muted"
            style={{ fontSize: "12px" }}
          >
            Time
          </label>
          <input
            id="entry-time"
            type="time"
            value={timeString}
            onChange={handleTimeChange}
            className="text-body text-text bg-surface border border-border rounded-md px-2 py-1"
            style={{ fontSize: "14px" }}
          />
        </div>
      </PopoverContent>
    </Popover>
  )
}
