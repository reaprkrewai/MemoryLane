import { useEffect } from "react";
import { useEntryStore } from "../stores/entryStore";
import { EntryEditor } from "./EntryEditor";

export function JournalView() {
  const selectedEntryId = useEntryStore((s) => s.selectedEntryId);
  const loadEntries = useEntryStore((s) => s.loadEntries);
  const ensureFirstEntry = useEntryStore((s) => s.ensureFirstEntry);

  useEffect(() => {
    loadEntries().then(() => ensureFirstEntry());
  }, [loadEntries, ensureFirstEntry]);

  if (!selectedEntryId) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2">
        <p className="text-body text-muted">No entries yet</p>
        <p className="text-label text-muted">
          Your entries will appear here. Start writing above.
        </p>
      </div>
    );
  }

  return <EntryEditor entryId={selectedEntryId} />;
}
