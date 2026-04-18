import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Toaster, toast } from "sonner";
import { invoke } from "@tauri-apps/api/core";
import { AppShell } from "./components/AppShell";
import { TitleBar } from "./components/TitleBar";
import { JournalView } from "./components/JournalView";
import { SettingsView } from "./components/SettingsView";
import { PinSetupScreen } from "./components/PinSetupScreen";
import { PinEntryScreen } from "./components/PinEntryScreen";
import { initializeDatabase, getAppLock } from "./lib/db";
import { useUiStore, applyTheme, applyFontScale } from "./stores/uiStore";
import { useViewStore } from "./stores/viewStore";
import { useAIStore } from "./stores/aiStore";
import * as hybridAI from "./lib/hybridAIService";
import { loadAIBackendPreference } from "./utils/aiSettingsService";
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

  // Initialize AI backend and check availability on app mount
  useEffect(() => {
    const initAI = async () => {
      try {
        // Load persisted backend preference
        const backend = await loadAIBackendPreference();
        useAIStore.setState({ aiBackend: backend });

        // If embedded backend, initialize the server
        if (backend === "embedded") {
          try {
            // Get the embedded server status
            const status = await invoke<{
              binary_exists: boolean;
              model_exists: boolean;
              server_running: boolean;
              server_healthy: boolean;
            }>("get_embedded_status");

            if (status.model_exists && !status.server_running) {
              // Model is downloaded but server not running, start it
              await invoke("start_embedded_ai");
            } else if (status.model_exists) {
              useAIStore.setState({ embeddedStatus: "running" });
            } else {
              useAIStore.setState({ embeddedStatus: "not-downloaded" });
            }
          } catch (err) {
            console.error("Failed to initialize embedded AI:", err);
            useAIStore.setState({ embeddedStatus: "error" });
          }
        }

        // Check hybrid AI health
        const health = await hybridAI.checkAIHealth();
        useAIStore.setState({
          available: health.available,
          embedding: health.embedding,
          llm: health.llm,
          status: health.available ? "ready" : "unavailable",
        });
      } catch (err) {
        console.error("Failed to initialize AI:", err);
        useAIStore.setState({
          available: false,
          embedding: false,
          llm: false,
          status: "unavailable",
        });
      }
    };

    initAI();
  }, []);

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
    <div className="flex h-screen flex-col bg-bg text-text">
      <TitleBar />
      <div className="flex flex-1 overflow-hidden">
        {/* State 1: Database loading */}
        {!isDbReady && !dbError && (
          <div className="flex h-full w-full items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-4">
              <Loader2 size={24} className="animate-spin text-muted" />
              <p className="text-body text-muted">Opening your journal...</p>
            </div>
          </div>
        )}

        {/* State 2: Database error */}
        {dbError && (
          <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-background">
            <h1 className="text-display text-text">
              Could not open your journal
            </h1>
            <p className="max-w-sm text-center text-body text-muted">
              The database failed to initialize. Check that the app has write
              access to your data folder, then restart.
            </p>
            {import.meta.env.DEV && (
              <pre className="mt-2 max-w-md whitespace-pre-wrap rounded-md border border-border bg-surface p-3 text-xs text-muted font-mono">
                {dbError}
              </pre>
            )}
          </div>
        )}

        {/* State 3: PIN state unknown (should not show, prevents content flash) */}
        {isDbReady && !dbError && isPinSet === null && (
          <div className="flex h-full w-full items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-4">
              <Loader2 size={24} className="animate-spin text-muted" />
              <p className="text-body text-muted">Checking security...</p>
            </div>
          </div>
        )}

        {/* State 4: PIN not set, show setup */}
        {isDbReady && !dbError && isPinSet === false && (
          <div className="h-full w-full">
            <PinSetupScreen onComplete={handlePinSetupComplete} />
          </div>
        )}

        {/* State 5: PIN set and locked, show entry screen */}
        {isDbReady && !dbError && isPinSet === true && isLocked && (
          <div className="h-full w-full">
            <PinEntryScreen onUnlock={handleUnlock} />
          </div>
        )}

        {/* State 6: Unlocked, show content */}
        {isDbReady && !dbError && isPinSet === true && !isLocked && (
          <AppShell>
            {activeView === "settings" && <SettingsView />}
            {activeView !== "settings" && <JournalView />}
          </AppShell>
        )}
      </div>
      <Toaster position="bottom-right" />
    </div>
  );
}

export default App;
