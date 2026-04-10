import { useState, useRef } from "react";
import { useTagStore } from "../stores/tagStore";
import { TagAutocomplete } from "./TagAutocomplete";

interface TagWithCount {
  id: string;
  name: string;
  color: string;
  created_at: number;
  usage_count: number;
}

interface TagInputProps {
  entryId: string;
  entryTags: TagWithCount[];
  onTagAdded: () => void;
}

export function TagInput({ entryId, entryTags, onTagAdded }: TagInputProps) {
  const [query, setQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const allTags = useTagStore((s) => s.tags);
  const createTag = useTagStore((s) => s.createTag);
  const addTagToEntry = useTagStore((s) => s.addTagToEntry);

  const entryTagIds = new Set(entryTags.map((t) => t.id));

  const trimmedQuery = query.trim().toLowerCase();
  const filteredTags = allTags.filter(
    (tag) =>
      tag.name.toLowerCase().includes(trimmedQuery) &&
      !entryTagIds.has(tag.id)
  );
  const exactMatch = allTags.some(
    (tag) => tag.name.toLowerCase() === trimmedQuery
  );
  const showCreateRow = !exactMatch && query.trim().length > 0;
  const totalItems = filteredTags.length + (showCreateRow ? 1 : 0);

  const handleAssignTag = async (tag: { id: string }) => {
    await addTagToEntry(entryId, tag.id);
    setQuery("");
    setActiveIndex(-1);
    setShowDropdown(false);
    onTagAdded();
  };

  const handleCreateTag = async (name: string) => {
    const newTag = await createTag(name);
    await addTagToEntry(entryId, newTag.id);
    setQuery("");
    setActiveIndex(-1);
    setShowDropdown(false);
    onTagAdded();
  };

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || totalItems === 0) {
      if (e.key === "Enter" && query.trim()) {
        e.preventDefault();
        const existingTag = allTags.find(
          (t) => t.name.toLowerCase() === query.trim().toLowerCase()
        );
        if (existingTag && !entryTagIds.has(existingTag.id)) {
          await handleAssignTag(existingTag);
        } else if (!existingTag) {
          await handleCreateTag(query.trim());
        }
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, totalItems - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < filteredTags.length) {
        await handleAssignTag(filteredTags[activeIndex]);
      } else if (activeIndex === filteredTags.length && showCreateRow) {
        await handleCreateTag(query.trim());
      } else if (query.trim()) {
        const existingTag = allTags.find(
          (t) => t.name.toLowerCase() === query.trim().toLowerCase()
        );
        if (existingTag && !entryTagIds.has(existingTag.id)) {
          await handleAssignTag(existingTag);
        } else if (!existingTag) {
          await handleCreateTag(query.trim());
        }
      }
    } else if (e.key === "Escape") {
      setShowDropdown(false);
      setActiveIndex(-1);
    }
  };

  const handleFocus = () => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
    }
    setShowDropdown(true);
  };

  const handleBlur = () => {
    blurTimeoutRef.current = setTimeout(() => {
      setShowDropdown(false);
      setActiveIndex(-1);
    }, 150);
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setShowDropdown(true);
          setActiveIndex(-1);
        }}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder="Add tag..."
        className="min-w-[120px] border-none bg-transparent text-body outline-none placeholder:text-muted"
        aria-label="Add tag"
        aria-autocomplete="list"
        aria-expanded={showDropdown}
      />
      <TagAutocomplete
        query={query}
        allTags={allTags}
        entryTagIds={entryTagIds}
        onSelect={handleAssignTag}
        onCreate={handleCreateTag}
        visible={showDropdown}
        activeIndex={activeIndex}
        onActiveIndexChange={setActiveIndex}
      />
    </div>
  );
}
