import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Toaster, toast } from "sonner";
import { AppShell } from "./components/AppShell";
import { JournalView } from "./components/JournalView";
import { SettingsView } from "./components/SettingsView";
import { PinSetupScreen } from "./components/PinSetupScreen";
import { PinEntryScreen } from "./components/PinEntryScreen";
import { initializeDatabase, getAppLock } from "./lib/db";
import { useUiStore, applyTheme, applyFontScale } from "./stores/uiStore";
import { useViewStore } from "./stores/viewStore";
import { useIdleTimeout } from "./hooks/useIdleTimeout";

function App() {
  const isDbReady = useUiStore((s) => s.isDbReady);
  const dbError = useUiStore((s) => s.dbError);
  const isPinSet = useUiStore((s) => s.isPinSet);
  const isLocked = useUiStore((s) => s.isLocked);
  const setDbReady = useUiStore((s) => s.setDbReady);
  const setDbError = useUiStore((s) => s.setDbError);
  const setIsPinSet = useUiStore((s) => s.setIsPinSet);
  const setIsLocked = useUiStore((s) => s.setIsLocked);
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

  // Initialize database and check PIN state
  useEffect(() => {
    const initApp = async () => {
      try {
        await initializeDatabase();
        setDbReady(true);
        toast.success("Journal opened");

        // Check if PIN is set
        const appLock = await getAppLock();
        setIsPinSet(appLock !== null);

        // If PIN is set, lock the app on first load
        if (appLock !== null) {
          setIsLocked(true);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        setDbError(message);
        toast.error("Failed to open journal");
      }
    };

    initApp();
  }, [setDbReady, setDbError, setIsPinSet, setIsLocked]);

  // Set up idle timeout monitoring
  useIdleTimeout();

  const handlePinSetupComplete = async () => {
    setIsPinSet(true);
    setIsLocked(true);
  };

  const handleUnlock = () => {
    setIsLocked(false);
  };

  return (
    <>
      {/* State 1: Database loading */}
      {!isDbReady && !dbError && (
        <div className="flex h-full items-center justify-center bg-background">
          <div className="flex flex-col items-center gap-4">
            <Loader2 size={24} className="animate-spin text-muted" />
            <p className="text-body text-muted">Opening your journal...</p>
          </div>
        </div>
      )}

      {/* State 2: Database error */}
      {dbError && (
        <div className="flex h-full flex-col items-center justify-center gap-4 bg-background">
          <h1 className="text-display text-text">
            Could not open your journal
          </h1>
          <p className="max-w-sm text-center text-body text-muted">
            The database failed to initialize. Check that the app has write
            access to your data folder, then restart.
          </p>
        </div>
      )}

      {/* State 3: PIN state unknown (should not show, prevents content flash) */}
      {isDbReady && !dbError && isPinSet === null && (
        <div className="flex h-full items-center justify-center bg-background">
          <div className="flex flex-col items-center gap-4">
            <Loader2 size={24} className="animate-spin text-muted" />
            <p className="text-body text-muted">Checking security...</p>
          </div>
        </div>
      )}

      {/* State 4: PIN not set, show setup */}
      {isDbReady && !dbError && isPinSet === false && (
        <PinSetupScreen onComplete={handlePinSetupComplete} />
      )}

      {/* State 5: PIN set and locked, show entry screen */}
      {isDbReady && !dbError && isPinSet === true && isLocked && (
        <PinEntryScreen onUnlock={handleUnlock} />
      )}

      {/* State 6: Unlocked, show content */}
      {isDbReady && !dbError && isPinSet === true && !isLocked && (
        <AppShell>
          {activeView === "settings" && <SettingsView />}
          {activeView !== "settings" && <JournalView />}
        </AppShell>
      )}

      <Toaster position="bottom-right" />
    </>
  );
}

export default App;
