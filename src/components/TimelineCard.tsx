import { format } from "date-fns";
import { ChevronDown, ChevronUp } from "lucide-react";
import { stripMarkdown, truncatePreview } from "../lib/stripMarkdown";
import { TagPillReadOnly } from "./TagPillReadOnly";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "@tiptap/markdown";
import { useEffect } from "react";

interface TimelineCardEntry {
  id: string;
  content: string;
  mood: string | null;
  word_count: number;
  created_at: number;
}

interface TimelineCardTag {
  id: string;
  name: string;
  color: string;
}

interface TimelineCardProps {
  entry: TimelineCardEntry;
  tags: TimelineCardTag[];
  expanded: boolean;
  onToggleExpand: () => void;
  onOpen: () => void;
}

// Mood dot color map — matches UI-SPEC "Mood Indicator Color Map"
function moodDotClass(mood: string | null): string | null {
  if (!mood) return null;
  switch (mood) {
    case "great": return "bg-accent";
    case "good": return "bg-emerald-400";
    case "okay": return "bg-stone-400";
    case "bad": return "bg-orange-400";
    case "awful": return "bg-rose-400";
    default: return null;
  }
}

export function TimelineCard({ entry, tags, expanded, onToggleExpand, onOpen }: TimelineCardProps) {
  const dotClass = moodDotClass(entry.mood);
  const dateLabel = format(new Date(entry.created_at), "MMM d, yyyy");
  const preview = truncatePreview(stripMarkdown(entry.content || ""), 150);
  const wordLabel = `${entry.word_count}w`;
  const visibleTags = tags.slice(0, 3);
  const overflow = tags.length - visibleTags.length;

  // Read-only TipTap editor for expanded state (one instance per expanded card;
  // TimelineView enforces single-expand-at-a-time, Pitfall 6)
  const editor = useEditor(
    {
      extensions: [StarterKit, Markdown],
      content: "",
      editable: false,
    },
    [expanded]
  );

  useEffect(() => {
    if (expanded && editor) {
      editor.commands.setContent(entry.content || "", { contentType: "markdown" });
    }
  }, [expanded, editor, entry.content]);

  return (
    <div
      onClick={(e) => {
        // Ignore clicks on the expand/collapse control
        const target = e.target as HTMLElement;
        if (target.closest("[data-expand-control]")) return;
        onOpen();
      }}
      className="group mb-3 cursor-pointer rounded-md border border-border bg-surface px-4 py-3 transition-colors hover:bg-bg/60 hover:border-l-2 hover:border-l-accent"
    >
      {/* Row 1: mood dot + date (left) + word count (right) */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {dotClass && <span className={`block h-2 w-2 rounded-full ${dotClass}`} />}
          <span className="text-label text-muted">{dateLabel}</span>
        </div>
        <span className="text-label text-muted">{wordLabel}</span>
      </div>

      {/* Row 2: preview text (150 chars plain) */}
      {preview && (
        <p className="mt-2 text-body text-text">
          {preview}
        </p>
      )}

      {/* Row 3: tags (left) + expand chevron (right) */}
      <div className="mt-3 flex items-center justify-between">
        <div className="flex flex-wrap items-center gap-1">
          {visibleTags.map((t) => (
            <TagPillReadOnly key={t.id} tag={t} />
          ))}
          {overflow > 0 && (
            <span className="text-label text-muted">+{overflow}</span>
          )}
        </div>
        <button
          type="button"
          data-expand-control=""
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand();
          }}
          className="flex items-center p-1 text-muted hover:text-text transition-colors"
          aria-label={expanded ? "Collapse entry" : "Expand entry"}
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* Expanded: full markdown rendered inline */}
      {expanded && (
        <div
          className="mt-3 border-t border-border pt-3"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="tiptap-editor">
            <EditorContent editor={editor} />
          </div>
          <button
            type="button"
            data-expand-control=""
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand();
            }}
            className="mt-2 text-label text-muted hover:text-text transition-colors"
            aria-label="Collapse entry"
          >
            Collapse
          </button>
        </div>
      )}
    </div>
  );
}
