import { format } from "date-fns";
import { ChevronDown, ChevronUp } from "lucide-react";
import { stripMarkdown, truncatePreview } from "../lib/stripMarkdown";
import { TagPillReadOnly } from "./TagPillReadOnly";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "@tiptap/markdown";
import { useEffect } from "react";
import React from "react";
import { Photo } from "../stores/entryStore";
import { PhotoGallery } from "./PhotoGallery";

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
  photos?: Photo[];
  expanded: boolean;
  onToggleExpand: () => void;
  onOpen: () => void;
  searchQuery?: string;
}

function injectHighlights(text: string, query: string): React.ReactNode[] {
  if (!query.trim()) return [text];
  const terms = query
    .replace(/"/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (terms.length === 0) return [text];
  const pattern = new RegExp(`(${terms.join("|")})`, "gi");
  const parts = text.split(pattern);
  return parts.map((part, i) =>
    pattern.test(part) ? (
      <mark key={i} className="bg-accent/20 rounded-[2px] px-[2px]">{part}</mark>
    ) : (
      part
    )
  );
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

export function TimelineCard({ entry, tags, photos = [], expanded, onToggleExpand, onOpen, searchQuery }: TimelineCardProps) {
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
      className="group mb-4 cursor-pointer rounded-xl border border-border bg-surface transition-all duration-200 hover:border-accent/40 hover:shadow-md"
    >
      {/* Header: mood indicator + date (left) + word count (right) */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          {dotClass && (
            <div className={`flex h-3 w-3 rounded-full ${dotClass} shadow-sm`} />
          )}
          <span className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
            {dateLabel}
          </span>
        </div>
        <span className="text-xs font-medium text-text-muted">{wordLabel}</span>
      </div>

      {/* Body: preview text and metadata */}
      <div className="px-5 py-4">
        {/* Preview text with optional search highlights */}
        {preview && (
          <p className="text-sm leading-relaxed text-text line-clamp-3">
            {searchQuery ? injectHighlights(preview, searchQuery) : preview}
          </p>
        )}

        {/* Photo thumbnail strip (lazy-loaded) */}
        {photos.length > 0 && (
          <div className="mt-3">
            <PhotoGallery photos={photos} mode="thumbnail-strip" />
          </div>
        )}

        {/* Tags and expand control */}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {visibleTags.map((t) => (
              <TagPillReadOnly key={t.id} tag={t} />
            ))}
            {overflow > 0 && (
              <span className="text-xs text-text-muted font-medium">+{overflow}</span>
            )}
          </div>
          <button
            type="button"
            data-expand-control=""
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand();
            }}
            className="ml-2 rounded-md p-1.5 text-text-muted transition-colors hover:text-text hover:bg-surface-secondary"
            aria-label={expanded ? "Collapse entry" : "Expand entry"}
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* Expanded: full content */}
      {expanded && (
        <div
          className="border-t border-border/50 bg-surface-secondary/40 px-5 py-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="tiptap-editor mb-4">
            <EditorContent editor={editor} />
          </div>
          {/* Full photo gallery in expanded view */}
          {photos.length > 0 && (
            <div className="mb-4">
              <PhotoGallery photos={photos} mode="expanded-grid" />
            </div>
          )}
          <button
            type="button"
            data-expand-control=""
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand();
            }}
            className="text-xs font-semibold text-text-muted uppercase tracking-wide transition-colors hover:text-text"
            aria-label="Collapse entry"
          >
            Collapse
          </button>
        </div>
      )}
    </div>
  );
}
