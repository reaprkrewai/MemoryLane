import { useEntryStore } from "../stores/entryStore";
import { EntryListItem } from "./EntryListItem";

export function EntryList() {
  const entries = useEntryStore((s) => s.entries);
  const selectedEntryId = useEntryStore((s) => s.selectedEntryId);
  const selectEntry = useEntryStore((s) => s.selectEntry);
  const createEntry = useEntryStore((s) => s.createEntry);

  return (
    <div className="flex flex-col overflow-hidden">
      {/* New Entry button */}
      <div className="px-3 pt-3">
        <button
          onClick={() => createEntry()}
          className="h-9 w-full rounded-md bg-accent text-body font-semibold text-stone-900 transition-all duration-150 hover:bg-[#D97706] active:scale-[0.97]"
        >
          New Entry
        </button>
      </div>

      {/* Entry list */}
      <div className="mt-2 flex-1 overflow-y-auto">
        {entries.map((entry) => (
          <EntryListItem
            key={entry.id}
            entry={entry}
            isSelected={entry.id === selectedEntryId}
            onClick={() => selectEntry(entry.id)}
          />
        ))}
      </div>
    </div>
  );
}
