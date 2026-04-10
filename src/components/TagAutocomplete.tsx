interface TagWithCount {
  id: string;
  name: string;
  color: string;
  created_at: number;
  usage_count: number;
}

interface TagAutocompleteProps {
  query: string;
  allTags: TagWithCount[];
  entryTagIds: Set<string>;
  onSelect: (tag: TagWithCount) => void;
  onCreate: (name: string) => void;
  visible: boolean;
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
}

export function TagAutocomplete({
  query,
  allTags,
  entryTagIds,
  onSelect,
  onCreate,
  visible,
  activeIndex,
  onActiveIndexChange,
}: TagAutocompleteProps) {
  if (!visible || query.trim() === "") return null;

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

  if (totalItems === 0) return null;

  return (
    <div
      className="absolute left-0 top-full z-50 mt-1 max-h-[200px] w-64 overflow-y-auto rounded-md border border-border bg-surface shadow-md"
      role="listbox"
    >
      {filteredTags.map((tag, index) => (
        <div
          key={tag.id}
          role="option"
          aria-selected={activeIndex === index}
          className={`flex cursor-pointer items-center gap-2 px-3 py-2 transition-colors ${
            activeIndex === index ? "bg-bg" : "hover:bg-bg"
          }`}
          onMouseEnter={() => onActiveIndexChange(index)}
          onMouseDown={(e) => {
            e.preventDefault();
            onSelect(tag);
          }}
        >
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: tag.color }}
          />
          <span className="flex-1 text-body text-text">{tag.name}</span>
          <span className="text-label text-muted">{tag.usage_count}</span>
        </div>
      ))}

      {showCreateRow && (
        <div
          role="option"
          aria-selected={activeIndex === filteredTags.length}
          className={`flex cursor-pointer items-center gap-2 px-3 py-2 transition-colors ${
            activeIndex === filteredTags.length ? "bg-bg" : "hover:bg-bg"
          }`}
          onMouseEnter={() => onActiveIndexChange(filteredTags.length)}
          onMouseDown={(e) => {
            e.preventDefault();
            onCreate(query.trim());
          }}
        >
          <span className="text-body text-muted italic">
            Create tag '{query.trim()}'
          </span>
        </div>
      )}
    </div>
  );
}
