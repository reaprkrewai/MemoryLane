import { useEffect, useState } from "react"
import type { Editor } from "@tiptap/react"
import { ArrowLeft } from "lucide-react"
import { useEntryStore } from "../stores/entryStore"
import { useViewStore } from "../stores/viewStore"
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

  const navigateSource = useViewStore((s) => s.navigateSource)
  const navigateBack = useViewStore((s) => s.navigateBack)

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
    <div className="flex h-14 items-center border-b border-border bg-surface px-6 gap-4">
      {/* Left zone: Back button (when opened from timeline) + date picker */}
      <div className="flex flex-1 items-center gap-4">
        {navigateSource === "timeline" && (
          <button
            type="button"
            onClick={() => navigateBack()}
            className="flex items-center gap-2 text-sm text-text-secondary hover:text-text transition-colors rounded-md px-2 py-1.5 hover:bg-surface-secondary"
            aria-label="Back to Journal"
          >
            <ArrowLeft size={16} />
            <span>Back</span>
          </button>
        )}
        <div className="h-6 border-r border-border" />
        <DatePicker date={entryDate} onDateChange={handleDateChange} />
      </div>

      {/* Center zone: mood selector */}
      <div className="flex items-center justify-center">
        <MoodSelector mood={entryMood} onMoodChange={handleMoodChange} />
      </div>

      {/* Right zone: word/char count or "Saved" indicator + auto-save interval selector */}
      <div className="flex flex-1 items-center justify-end gap-4">
        {showSaved ? (
          <span className="text-sm font-medium text-accent animate-pulse">
            ✓ Saved
          </span>
        ) : (
          <span className="text-xs text-text-muted whitespace-nowrap">
            {words} <span className="text-text-muted/60">w</span> · {chars} <span className="text-text-muted/60">c</span>
          </span>
        )}
        <span className="text-text-muted/20">·</span>
        <select
          value={autoSaveMs}
          onChange={async (e) => {
            const ms = parseInt(e.target.value, 10)
            setAutoSaveMs(ms)
            await updateAutoSaveInterval(ms)
          }}
          className="cursor-pointer rounded-md border border-border bg-surface-secondary text-text-secondary text-xs px-2 py-1.5 transition-colors hover:text-text hover:bg-surface-secondary focus:outline-none focus:ring-2 focus:ring-accent/50"
          aria-label="Auto-save interval"
          title="Auto-save interval"
        >
          <option value={5000}>Every 5s</option>
          <option value={10000}>Every 10s</option>
          <option value={30000}>Every 30s</option>
        </select>
      </div>
    </div>
  )
}
