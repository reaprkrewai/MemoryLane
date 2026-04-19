import { useEffect, useState } from "react";
import { useTagStore } from "../stores/tagStore";
import { useAIStore } from "../stores/aiStore";
import { TagPill } from "./TagPill";
import { TagInput } from "./TagInput";
import { TagSuggestButton } from "./TagSuggestButton";

interface TagWithCount {
  id: string;
  name: string;
  color: string;
  created_at: number;
  usage_count: number;
}

interface TagRowProps {
  entryId: string;
  content: string;  // current editor markdown for LLM tag suggestion input
}

export function TagRow({ entryId, content }: TagRowProps) {
  const [entryTags, setEntryTags] = useState<TagWithCount[]>([]);
  const getEntryTags = useTagStore((s) => s.getEntryTags);
  const loadTags = useTagStore((s) => s.loadTags);
  const removeTagFromEntry = useTagStore((s) => s.removeTagFromEntry);
  const updateTagColor = useTagStore((s) => s.updateTagColor);
  // Sparkle visibility: AI healthy AND tag suggestions enabled.
  // Unmount-not-hide per AUTOTAG-05 "hidden (not disabled)" requirement.
  const showSparkle = useAIStore(
    (s) => s.available && s.llm && s.tagSuggestionsEnabled
  );
  // Global tag library (not just this entry's tags) — feeds LLM enum per AUTOTAG-03.
  const allTagNames = useTagStore((s) => s.tags.map((t) => t.name));

  const reloadEntryTags = async () => {
    const tags = await getEntryTags(entryId);
    setEntryTags(tags);
  };

  useEffect(() => {
    loadTags();
    reloadEntryTags();
  }, [entryId]);

  const handleRemove = async (tagId: string) => {
    await removeTagFromEntry(entryId, tagId);
    await reloadEntryTags();
  };

  const handleColorChange = async (tagId: string, color: string) => {
    await updateTagColor(tagId, color);
    await reloadEntryTags();
  };

  return (
    <div className="relative mx-auto max-w-[760px] flex flex-wrap items-center gap-2 border-t border-border bg-bg px-0 py-4 ml-8 mr-8">
      {entryTags.map((tag) => (
        <TagPill
          key={tag.id}
          tag={tag}
          onRemove={() => handleRemove(tag.id)}
          onColorChange={(color) => handleColorChange(tag.id, color)}
        />
      ))}
      <TagInput
        entryId={entryId}
        entryTags={entryTags}
        onTagAdded={reloadEntryTags}
      />
      {showSparkle && (
        <TagSuggestButton
          entryId={entryId}
          content={content}
          existingTagNames={allTagNames}
          onAccept={reloadEntryTags}
        />
      )}
    </div>
  );
}
