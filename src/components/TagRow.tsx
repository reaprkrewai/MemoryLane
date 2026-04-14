import { useEffect, useState } from "react";
import { useTagStore } from "../stores/tagStore";
import { TagPill } from "./TagPill";
import { TagInput } from "./TagInput";

interface TagWithCount {
  id: string;
  name: string;
  color: string;
  created_at: number;
  usage_count: number;
}

interface TagRowProps {
  entryId: string;
}

export function TagRow({ entryId }: TagRowProps) {
  const [entryTags, setEntryTags] = useState<TagWithCount[]>([]);
  const getEntryTags = useTagStore((s) => s.getEntryTags);
  const loadTags = useTagStore((s) => s.loadTags);
  const removeTagFromEntry = useTagStore((s) => s.removeTagFromEntry);
  const updateTagColor = useTagStore((s) => s.updateTagColor);

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
    </div>
  );
}
