import { useEffect, useRef } from "react";
import { useUiStore } from "../stores/uiStore";

/**
 * Hook to monitor user activity and auto-lock the app after idle timeout
 * Only activates if a PIN is set
 */
export function useIdleTimeout() {
  const idleTimeout = useUiStore((s) => s.idleTimeout);
  const setLastActivityTime = useUiStore((s) => s.setLastActivityTime);
  const setIsLocked = useUiStore((s) => s.setIsLocked);
  const isPinSet = useUiStore((s) => s.isPinSet);

  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const activityListenerRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Don't set up idle timeout if PIN is not set or timeout is "never"
    if (!isPinSet || idleTimeout === "never") {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
      if (activityListenerRef.current) {
        document.removeEventListener("mousemove", activityListenerRef.current);
        document.removeEventListener("keydown", activityListenerRef.current);
        document.removeEventListener("click", activityListenerRef.current);
        activityListenerRef.current = null;
      }
      return;
    }

    // Convert timeout minutes to milliseconds
    const timeoutMs = (idleTimeout as number) * 60 * 1000;

    const resetIdleTimer = () => {
      // Clear existing timer
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }

      // Update activity time
      setLastActivityTime();

      // Set new timer
      idleTimerRef.current = setTimeout(() => {
        setIsLocked(true);
      }, timeoutMs);
    };

    // Activity handler
    const handleActivity = () => {
      resetIdleTimer();
    };

    // Store reference for cleanup
    activityListenerRef.current = handleActivity;

    // Attach listeners
    document.addEventListener("mousemove", handleActivity);
    document.addEventListener("keydown", handleActivity);
    document.addEventListener("click", handleActivity);

    // Initial timer
    resetIdleTimer();

    // Cleanup
    return () => {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
      document.removeEventListener("mousemove", handleActivity);
      document.removeEventListener("keydown", handleActivity);
      document.removeEventListener("click", handleActivity);
    };
  }, [idleTimeout, isPinSet, setLastActivityTime, setIsLocked]);
}
