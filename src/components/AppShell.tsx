import { Sidebar } from "./Sidebar";
import { QuickWriteFAB } from "./QuickWriteFAB";
import { useViewStore } from "../stores/viewStore";
import { useEntryStore } from "../stores/entryStore";

// D-21: FAB is visible on these 4 top-level views. Hidden on settings and editor.
const FAB_VISIBLE_VIEWS = ["overview", "timeline", "calendar", "search"] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  // Primitive selectors — one per line (Zustand granular subscription).
  const activeView = useViewStore((s) => s.activeView);
  const navigateToEditor = useViewStore((s) => s.navigateToEditor);
  const createEntry = useEntryStore((s) => s.createEntry);
  const selectEntry = useEntryStore((s) => s.selectEntry);

  const showFAB = (FAB_VISIBLE_VIEWS as readonly string[]).includes(activeView);

  const handleNewEntry = async () => {
    const newId = await createEntry();
    await selectEntry(newId);
    // Pitfall 3: NavigateSource = "timeline" | "sidebar" | null.
    // "overview"/"calendar"/"search" are NOT valid NavigateSource values.
    // Pass "timeline" — the editor back-button always returns to timeline.
    navigateToEditor("timeline");
  };

  return (
    <div className="flex h-full flex-1 overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-auto bg-bg">
        <div className="h-full">{children}</div>
      </main>
      {showFAB && <QuickWriteFAB onClick={() => void handleNewEntry()} />}
    </div>
  );
}
