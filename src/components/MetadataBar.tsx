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
  const updateAutoSaveInterval = useEntryStore((s) => s.updateAutoSaveInterval)

  const entry = entries.find((e) => e.id === entryId)

  // Local render tick to keep word/char count live
  const [, setTick] = useState(0)

  // "Saved" flash indicator
  const [showSaved, setShowSaved] = useState(false)

  // Currently selected auto-save interval (ms)
  const [autoSaveMs, setAutoSaveMs] = useState<number>(5000)

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

  // Read persisted interval on mount to sync the UI selector
  useEffect(() => {
    (async () => {
      try {
        const { getDb } = await import("../lib/db")
        const db = await getDb()
        const rows = await db.select<{ value: string }[]>(
          "SELECT value FROM settings WHERE key = 'autosave_interval'"
        )
        if (rows.length > 0) {
          const ms = parseInt(rows[0].value, 10)
          if ([5000, 10000, 30000].includes(ms)) setAutoSaveMs(ms)
        }
      } catch {
        // ignore — default 5000 is correct
      }
    })()
  }, [])

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

      {/* Right zone: word/char count or "Saved" indicator + auto-save interval selector */}
      <div className="flex flex-1 items-center justify-end gap-2">
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
        <span className="text-label text-muted" style={{ fontSize: "12px" }}>&middot;</span>
        <select
          value={autoSaveMs}
          onChange={async (e) => {
            const ms = parseInt(e.target.value, 10)
            setAutoSaveMs(ms)
            await updateAutoSaveInterval(ms)
          }}
          className="cursor-pointer rounded border-none bg-transparent text-muted outline-none"
          style={{ fontSize: "12px", lineHeight: "1.4" }}
          aria-label="Auto-save interval"
          title="Auto-save interval"
        >
          <option value={5000}>Save 5s</option>
          <option value={10000}>Save 10s</option>
          <option value={30000}>Save 30s</option>
        </select>
      </div>
    </div>
  )
}
