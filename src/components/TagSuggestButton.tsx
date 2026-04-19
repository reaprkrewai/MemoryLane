import { useEffect, useState } from "react";
import { Sparkles, Loader2, X, Plus } from "lucide-react";
import { toast } from "sonner";
import { useTagStore } from "../stores/tagStore";
import {
  suggestTagsForEntry,
  type TagSuggestion,
} from "../utils/tagSuggestionService";

interface TagSuggestButtonProps {
  entryId: string;
  content: string;
  existingTagNames: string[];
  onAccept: () => void | Promise<void>;
}

const SLOW_CALL_THRESHOLD_MS = 30_000;
const EMPTY_MSG_TIMEOUT_MS = 4_000;

export function TagSuggestButton({
  entryId,
  content,
  existingTagNames,
  onAccept,
}: TagSuggestButtonProps) {
  const [suggestions, setSuggestions] = useState<TagSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showEmptyMsg, setShowEmptyMsg] = useState(false);

  // Auto-dismiss the "No tag suggestions" inline message after 4s.
  useEffect(() => {
    if (!showEmptyMsg) return;
    const id = window.setTimeout(() => setShowEmptyMsg(false), EMPTY_MSG_TIMEOUT_MS);
    return () => window.clearTimeout(id);
  }, [showEmptyMsg]);

  const handleSparkleClick = async () => {
    if (isLoading) return;
    setIsLoading(true);
    setShowEmptyMsg(false);
    setSuggestions([]); // clear any prior batch (D-13 session-local replacement)

    // Slow-call toast — fires ONCE if the LLM takes >30s. Does NOT cancel the request.
    const slowId = window.setTimeout(() => {
      toast.info("Tag suggestions are taking longer than expected");
    }, SLOW_CALL_THRESHOLD_MS);

    try {
      const result = await suggestTagsForEntry(content, existingTagNames);
      if (result.length === 0) {
        setShowEmptyMsg(true);
      } else {
        setSuggestions(result);
      }
    } catch (err) {
      // D-10 error state: silent, log only.
      console.error("[tag-suggestions] handleSparkleClick failed:", err);
    } finally {
      window.clearTimeout(slowId);
      setIsLoading(false);
    }
  };

  const handleAccept = async (suggestion: TagSuggestion) => {
    // Optimistic: remove the chip from state immediately.
    setSuggestions((prev) => prev.filter((s) => s.name !== suggestion.name));

    try {
      const tagStore = useTagStore.getState();
      if (suggestion.isNew) {
        const newTag = await tagStore.createTag(suggestion.name);
        await tagStore.addTagToEntry(entryId, newTag.id);
      } else {
        // Look up existing tag by case-insensitive name match.
        const existing = tagStore.tags.find(
          (t) => t.name.toLowerCase() === suggestion.name.toLowerCase()
        );
        if (existing) {
          await tagStore.addTagToEntry(entryId, existing.id);
        } else {
          // Defense-in-depth: enum should prevent this, but if the tag was
          // deleted between suggestion and accept, treat it as a new-tag create.
          const created = await tagStore.createTag(suggestion.name);
          await tagStore.addTagToEntry(entryId, created.id);
        }
      }
      await onAccept();
    } catch (err) {
      console.error("[tag-suggestions] accept failed:", err);
      // Silent per D-10 error-state contract — chip is already removed from view.
    }
  };

  const handleDismiss = (suggestion: TagSuggestion) => {
    setSuggestions((prev) => prev.filter((s) => s.name !== suggestion.name));
  };

  const handleChipKeyDown = (
    e: React.KeyboardEvent<HTMLDivElement>,
    suggestion: TagSuggestion
  ) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      void handleAccept(suggestion);
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleDismiss(suggestion);
    }
  };

  return (
    <>
      <button
        type="button"
        aria-label="Suggest tags"
        disabled={isLoading}
        onClick={() => void handleSparkleClick()}
        className="h-7 w-7 rounded-md border border-transparent bg-transparent text-muted transition-colors duration-fast hover:bg-surface hover:border-border hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center"
      >
        {isLoading ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Sparkles size={14} />
        )}
      </button>

      {showEmptyMsg && !isLoading && suggestions.length === 0 && (
        <span
          className="text-muted text-xs ml-1 transition-opacity duration-slow"
          aria-live="polite"
        >
          No tag suggestions for this entry
        </span>
      )}

      {suggestions.map((suggestion, idx) => (
        <div
          key={`${suggestion.isNew ? "new" : "existing"}-${suggestion.name}`}
          role="button"
          tabIndex={0}
          aria-label={`Accept tag suggestion: ${suggestion.name}`}
          title={suggestion.name}
          onClick={() => void handleAccept(suggestion)}
          onKeyDown={(e) => handleChipKeyDown(e, suggestion)}
          className="inline-flex items-center gap-1 rounded-full border-2 border-dashed border-muted/50 bg-transparent px-2 py-1 text-xs font-normal leading-tight text-muted transition-colors duration-fast cursor-pointer hover:bg-surface hover:border-accent/40 hover:text-text animate-slide-up"
          style={{ animationDelay: `${idx * 60}ms` }}
        >
          {suggestion.isNew && (
            <Plus size={10} className="mr-1 inline flex-shrink-0" />
          )}
          <span className="max-w-[120px] truncate">{suggestion.name}</span>
          <button
            type="button"
            aria-label={`Dismiss suggestion: ${suggestion.name}`}
            onClick={(e) => {
              e.stopPropagation();
              handleDismiss(suggestion);
            }}
            className="h-4 w-4 rounded-full hover:bg-muted/20 ml-1 inline-flex items-center justify-center"
          >
            <X size={11} />
          </button>
        </div>
      ))}
    </>
  );
}
