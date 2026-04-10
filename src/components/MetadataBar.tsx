import { useEffect, useState } from "react"
import type { Editor } from "@tiptap/react"
import { useEntryStore } from "../stores/entryStore"
import { MoodSelector } from "./MoodSelector"
import { DatePicker } from "./DatePicker"

interface MetadataBarProps {
  entryId: string
  editor: Editor | null
}

export function MetadataBar({ entryId, editor }: MetadataBarProps) {
  const entries = useEntryStore((s) => s.entries)
  const lastSavedAt = useEntryStore((s) => s.lastSavedAt)
  const updateMood = useEntryStore((s) => s.updateMood)
  const updateCreatedAt = useEntryStore((s) => s.updateCreatedAt)

  const entry = entries.find((e) => e.id === entryId)

  // Local render tick to keep word/char count live
  const [, setTick] = useState(0)

  // "Saved" flash indicator
  const [showSaved, setShowSaved] = useState(false)

  // Watch lastSavedAt — flash "Saved" for 1500ms
  useEffect(() => {
    if (lastSavedAt === null) return
    setShowSaved(true)
    const timer = setTimeout(() => setShowSaved(false), 1500)
    return () => clearTimeout(timer)
  }, [lastSavedAt])

  // Re-render when editor content updates (keeps word/char count live)
  useEffect(() => {
    if (!editor) return
    const handler = () => setTick((t) => t + 1)
    editor.on("update", handler)
    return () => {
      editor.off("update", handler)
    }
  }, [editor])

  const entryDate = entry ? new Date(entry.created_at) : new Date()
  const entryMood = entry ? entry.mood : null

  const words = editor ? editor.storage.characterCount.words() : 0
  const chars = editor ? editor.storage.characterCount.characters() : 0

  const handleDateChange = (newDate: Date) => {
    updateCreatedAt(entryId, newDate.getTime())
  }

  const handleMoodChange = (mood: string | null) => {
    updateMood(entryId, mood)
  }

  return (
    <div className="flex h-12 items-center border-b border-border bg-surface px-4">
      {/* Left zone: date picker */}
      <div className="flex-1">
        <DatePicker date={entryDate} onDateChange={handleDateChange} />
      </div>

      {/* Center zone: mood selector */}
      <div className="flex items-center justify-center">
        <MoodSelector mood={entryMood} onMoodChange={handleMoodChange} />
      </div>

      {/* Right zone: word/char count or "Saved" indicator */}
      <div className="flex flex-1 justify-end">
        {showSaved ? (
          <span
            className="text-label"
            style={{ fontSize: "12px", lineHeight: "1.4", color: "var(--color-accent)" }}
          >
            Saved
          </span>
        ) : (
          <span
            className="text-label text-muted"
            style={{ fontSize: "12px", lineHeight: "1.4" }}
          >
            {words} words &middot; {chars} chars
          </span>
        )}
      </div>
    </div>
  )
}
