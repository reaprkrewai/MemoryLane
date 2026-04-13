import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Toaster, toast } from "sonner";
import { AppShell } from "./components/AppShell";
import { JournalView } from "./components/JournalView";
import { SettingsView } from "./components/SettingsView";
import { initializeDatabase } from "./lib/db";
import { useUiStore, applyTheme, applyFontScale } from "./stores/uiStore";
import { useViewStore } from "./stores/viewStore";

function App() {
  const isDbReady = useUiStore((s) => s.isDbReady);
  const dbError = useUiStore((s) => s.dbError);
  const setDbReady = useUiStore((s) => s.setDbReady);
  const setDbError = useUiStore((s) => s.setDbError);
  const theme = useUiStore((s) => s.theme);
  const fontSize = useUiStore((s) => s.fontSize);
  const activeView = useViewStore((s) => s.activeView);

  // Apply persisted theme and font scale on initial mount
  useEffect(() => {
    applyTheme(theme);
    applyFontScale(fontSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-apply whenever settings change
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    applyFontScale(fontSize);
  }, [fontSize]);

  useEffect(() => {
    initializeDatabase()
      .then(() => {
        setDbReady(true);
        toast.success("Journal opened");
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        setDbError(message);
        toast.error("Failed to open journal");
      });
  }, [setDbReady, setDbError]);

  return (
    <>
      <AppShell>
        {!isDbReady && !dbError && (
          <div className="flex h-full items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <Loader2 size={24} className="animate-spin text-muted" />
              <p className="text-body text-muted">Opening your journal...</p>
            </div>
          </div>
        )}
        {dbError && (
          <div className="flex h-full flex-col items-center justify-center gap-4">
            <h1 className="text-display text-text">
              Could not open your journal
            </h1>
            <p className="max-w-sm text-center text-body text-muted">
              The database failed to initialize. Check that the app has write
              access to your data folder, then restart.
            </p>
          </div>
        )}
        {isDbReady && !dbError && activeView === "settings" && <SettingsView />}
        {isDbReady && !dbError && activeView !== "settings" && <JournalView />}
      </AppShell>
      <Toaster position="bottom-right" />
    </>
  );
}

export default App;
