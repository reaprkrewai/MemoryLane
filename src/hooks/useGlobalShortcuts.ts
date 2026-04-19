/**
 * Global keyboard shortcuts for Chronicle AI.
 *
 * DASH-09 — Ctrl/Cmd+N: creates a new entry and opens it in the editor from any
 * top-level view. Guarded by `isTypingContext()` so the shortcut does not hijack
 * TipTap or any input element's native behavior. Also guarded at fire-time by
 * `isLocked === false && isDbReady === true` to prevent firing during PIN lock
 * or before database initialization completes.
 *
 * Mount: called from App.tsx unconditionally at the component top level alongside
 * useIdleTimeout(). The hook guards itself via store-state checks inside the
 * handler (mirrors useIdleTimeout's internal-guard pattern).
 */

import { useEffect } from "react";
import { useEntryStore } from "../stores/entryStore";
import { useViewStore } from "../stores/viewStore";
import { useUiStore } from "../stores/uiStore";

/**
 * Returns true when the currently-focused element is text-editable. Used to
 * prevent the Ctrl/Cmd+N shortcut from hijacking user typing in TipTap, inputs,
 * or textareas — native editor keybindings take precedence.
 */
function isTypingContext(): boolean {
  const el = document.activeElement as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA") return true;
  if (el.isContentEditable) return true;
  return false;
}

export function useGlobalShortcuts(): void {
  // Primitive selectors (Zustand granular subscription).
  const createEntry = useEntryStore((s) => s.createEntry);
  const selectEntry = useEntryStore((s) => s.selectEntry);
  const navigateToEditor = useViewStore((s) => s.navigateToEditor);

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // Match gate — Ctrl (Windows/Linux) or Cmd (Mac) + N
      if (!((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "n")) return;

      // Typing-context gate — let TipTap / inputs / textareas handle their own keys
      if (isTypingContext()) return;

      // Locked-state gate — do not fire during PIN lock or pre-DB-ready.
      // Read store state at fire-time (not closure-captured) so the hook responds
      // to lock/unlock transitions without re-binding the listener.
      const ui = useUiStore.getState();
      if (ui.isLocked || !ui.isDbReady) return;

      // ONBRD-05 / D-20 — onboarding-active guard. Mirrors the locked/DB-ready
      // rationale: no Ctrl/Cmd+N while the welcome modal is up, otherwise users
      // could short-circuit the flow and start writing without ever finishing it.
      if (ui.isOnboardingCompleted === false) return;

      // Editor-view gate — belt-and-suspenders defense. isTypingContext() already
      // catches TipTap (contentEditable), but an explicit view check avoids firing
      // the shortcut if focus is momentarily in an editor toolbar button etc.
      const view = useViewStore.getState();
      if (view.activeView === "editor" || view.activeView === "settings") return;

      e.preventDefault();
      try {
        const newId = await createEntry();
        await selectEntry(newId);
        // Pitfall 3: NavigateSource = "timeline" | "sidebar" | null.
        // "overview"/"calendar"/"search" are invalid — always pass "timeline".
        navigateToEditor("timeline");
      } catch (err) {
        // Keep the shortcut resilient — a failed new-entry chain should not crash
        // the app. Consistent with graceful-fallback convention in AI path.
        console.error("[useGlobalShortcuts] new-entry chain failed:", err);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [createEntry, selectEntry, navigateToEditor]);
}
