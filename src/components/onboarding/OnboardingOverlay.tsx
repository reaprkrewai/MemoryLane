/**
 * OnboardingOverlay — 3-step first-run welcome flow.
 *
 * State machine: 0 (Welcome AlertDialog) -> 1 (Spotlight + Popover anchored to FAB)
 *               -> 2 (Ready-to-begin AlertDialog) -> "done" (unmount).
 *
 * Skip-tour link in every step writes the same SQLite settings row as completion
 * (markOnboardingCompleted). Step 3 primary CTA additionally creates a blank
 * entry and opens the editor — the user types their own first words (PITFALLS.md
 * L455 explicit anti-pattern: never write sample entries).
 *
 * Mounted by App.tsx inside the State 6 fragment alongside AppShell, so the
 * overlay sits above both JournalView AND SettingsView (D-02 / SC #5).
 *
 * Render gate: isOnboardingCompleted === false (loading and completed states
 * are handled in App.tsx — this component only mounts when the flow should
 * actually render).
 *
 * Controlled-mode Escape-skip (UI-SPEC L228 + threat-model T-09-04): both
 * Step 1 and Step 3 AlertDialogs pass `onOpenChange` so Radix's native
 * Escape-key handling routes through handleSkip, keeping the skip path
 * single-source-of-truth.
 *
 * Stable virtualRef (anti-anchor-thrash): the Step 2 PopoverAnchor receives a
 * ref captured via useRef + useLayoutEffect, NOT an inline object literal.
 * Inline literals would cause floating-ui to re-anchor on every render and
 * would run document.querySelector during render — both anti-patterns.
 *
 * No return-type annotation (codebase convention — App.tsx, AppShell.tsx,
 * SettingsView.tsx all infer).
 */

import { useLayoutEffect, useRef, useState, type RefObject } from "react";
import { Check } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from "../ui/alert-dialog";
import { Popover, PopoverContent, PopoverAnchor } from "../ui/popover";
import { useUiStore } from "../../stores/uiStore";
import { useEntryStore } from "../../stores/entryStore";
import { useViewStore } from "../../stores/viewStore";
import { markOnboardingCompleted } from "../../utils/onboardingService";
import { OnboardingSpotlight } from "./OnboardingSpotlight";

type Step = 0 | 1 | 2 | "done";

const FAB_SELECTOR = '[data-onboarding="quick-write-fab"]';

// Inline StepIndicator (private to this component — could extract if reused later)
function StepIndicator({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-label text-text-muted">Step {step} of {total}</span>
      <div className="flex items-center gap-1">
        {Array.from({ length: total }).map((_, i) => (
          <span
            key={i}
            className={
              "h-1.5 w-1.5 rounded-full transition-colors duration-150 " +
              (i === step - 1 ? "bg-accent" : "bg-text-muted/40")
            }
            aria-hidden
          />
        ))}
      </div>
    </div>
  );
}

// Inline SkipLink (consistent across all 3 steps)
function SkipLink({ onSkip }: { onSkip: () => void }) {
  return (
    <button
      type="button"
      className="text-label text-text-muted hover:text-text underline-offset-4 hover:underline"
      onClick={onSkip}
    >
      Skip tour
    </button>
  );
}

// No return-type annotation — codebase convention (App.tsx, AppShell.tsx,
// SettingsView.tsx all infer the React element return type).
export function OnboardingOverlay() {
  // Granular primitive selectors (Pattern S1 — one primitive per useStore call).
  const isOnboardingCompleted = useUiStore((s) => s.isOnboardingCompleted);
  const createEntry = useEntryStore((s) => s.createEntry);
  const selectEntry = useEntryStore((s) => s.selectEntry);
  const navigateToEditor = useViewStore((s) => s.navigateToEditor);

  const [currentStep, setCurrentStep] = useState<Step>(0);

  // Stable ref for the Step 2 Popover anchor. We capture the FAB element via a
  // useLayoutEffect that runs when currentStep === 1 — passing the SAME ref
  // object across renders so floating-ui anchors once and stays put. Anti-
  // pattern this fixes: an inline `{ current: document.querySelector(...) }`
  // literal allocates a new object every render, causing re-anchor thrash and
  // running querySelector during the render phase.
  const fabRef = useRef<HTMLElement | null>(null);

  useLayoutEffect(() => {
    if (currentStep === 1) {
      fabRef.current = document.querySelector(FAB_SELECTOR) as HTMLElement | null;
    }
  }, [currentStep]);

  // Defensive gate (App.tsx also gates) — if onboarding is completed or still
  // loading, render nothing.
  if (isOnboardingCompleted !== false) return null;

  // Skip handler — used by every step's "Skip tour" link AND by the Escape-key
  // dismiss path on Step 1 + Step 3 AlertDialogs (via onOpenChange).
  const handleSkip = async () => {
    setCurrentStep("done");
    await markOnboardingCompleted();
  };

  // Step 1 -> Step 2 advance (no DB write until completion/skip).
  const handleStep1Continue = () => setCurrentStep(1);

  // Step 2 -> Step 3 advance.
  const handleStep2GotIt = () => setCurrentStep(2);

  // Step 3 secondary — close overlay, land on Overview.
  const handleStep3Explore = async () => {
    setCurrentStep("done");
    await markOnboardingCompleted();
  };

  // Step 3 primary — create blank entry, mark complete, open editor.
  // Mirrors AppShell.handleNewEntry chain (D-14 explicit reuse), plus
  // markOnboardingCompleted before navigate so the gate has flipped by the
  // time the editor mounts.
  const handleWriteFirstEntry = async () => {
    try {
      const newId = await createEntry();
      await selectEntry(newId);
      await markOnboardingCompleted();
      // navigateToEditor only accepts "timeline" | "sidebar" | null — pass
      // "timeline" so the editor's back-button returns to a valid view.
      navigateToEditor("timeline");
      setCurrentStep("done");
    } catch (err) {
      // Resilient — if the new-entry chain fails, still close the overlay so
      // the user is not trapped. They can use the FAB / Ctrl+N to try again.
      console.error("[OnboardingOverlay] Step 3 CTA chain failed:", err);
      setCurrentStep("done");
      await markOnboardingCompleted();
    }
  };

  return (
    <>
      {/* ===== Step 1: Welcome + Privacy Promise (AlertDialog, medium width) =====
          onOpenChange routes Radix's native Escape-key dismiss through the same
          handleSkip path used by the "Skip tour" link (UI-SPEC L228 + T-09-04). */}
      <AlertDialog
        open={currentStep === 0}
        onOpenChange={(open) => { if (!open) void handleSkip(); }}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-display">
              Welcome to Chronicle AI
            </AlertDialogTitle>
            <AlertDialogDescription className="text-body text-text-secondary italic">
              Your life story, written for you.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <ul className="flex flex-col gap-4 mt-2">
            <li className="flex gap-2 items-start">
              <Check size={14} className="text-accent shrink-0 mt-1" />
              <p className="text-body">
                <span className="font-medium text-text">Stays on your device</span>
                <span className="text-text-secondary"> — nothing leaves your computer.</span>
              </p>
            </li>
            <li className="flex gap-2 items-start">
              <Check size={14} className="text-accent shrink-0 mt-1" />
              <p className="text-body">
                <span className="font-medium text-text">AI runs locally</span>
                <span className="text-text-secondary"> — built-in or Ollama, never the cloud.</span>
              </p>
            </li>
            <li className="flex gap-2 items-start">
              <Check size={14} className="text-accent shrink-0 mt-1" />
              <p className="text-body">
                <span className="font-medium text-text">No accounts, no tracking, no telemetry.</span>
              </p>
            </li>
          </ul>

          <AlertDialogFooter className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-3">
              <StepIndicator step={1} total={3} />
              <SkipLink onSkip={() => void handleSkip()} />
            </div>
            {/* CR-01 fix: plain <button> instead of AlertDialogAction. Radix's
                Action auto-closes the dialog and fires onOpenChange(false),
                which would route through handleSkip() and silently end the
                tour. The Escape/click-outside dismissal still uses
                onOpenChange -> handleSkip above. */}
            <button
              type="button"
              onClick={handleStep1Continue}
              className="px-4 py-2 text-label rounded-md bg-accent text-amber-950 dark:text-bg font-medium"
            >
              Continue
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ===== Step 2: Spotlight + Popover anchored to FAB =====
          PopoverAnchor receives the stable fabRef (captured by the
          useLayoutEffect above when currentStep flipped to 1). NO inline
          virtualRef literal — that would cause anchor thrash. */}
      {currentStep === 1 && (
        <>
          <OnboardingSpotlight />
          <Popover open>
            {/* Cast to Measurable-shaped RefObject — Radix's virtualRef type is
                React.RefObject<Measurable> (non-null current), but useRef
                inevitably starts at null. fabRef is populated by the
                useLayoutEffect above before the Popover renders, so the cast is
                safe — and React 19's RefObject<T> tightening is what makes the
                explicit cast necessary. The ref OBJECT identity is still stable
                across renders (warning-fix #4 honored). */}
            <PopoverAnchor virtualRef={fabRef as RefObject<{ getBoundingClientRect(): DOMRect }>} />
            <PopoverContent
              side="top"
              align="end"
              sideOffset={16}
              className="max-w-xs z-[70]"
            >
              <h3 className="text-heading text-text">Start writing anytime</h3>
              <p className="text-body text-text-secondary mt-2">
                Tap the <strong>+</strong> button — or press{" "}
                <strong>Ctrl/Cmd&nbsp;+&nbsp;N</strong> — to begin a new entry.
                Your dashboard updates as you write.
              </p>
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-3">
                  <StepIndicator step={2} total={3} />
                  <SkipLink onSkip={() => void handleSkip()} />
                </div>
                <button
                  type="button"
                  onClick={handleStep2GotIt}
                  className="px-3 py-1.5 text-label rounded-md bg-accent text-amber-950 dark:text-bg font-medium"
                >
                  Got it
                </button>
              </div>
            </PopoverContent>
          </Popover>
        </>
      )}

      {/* ===== Step 3: Ready to Begin (AlertDialog, medium width) =====
          onOpenChange routes Radix's native Escape-key dismiss through the same
          handleSkip path used by the "Skip tour" link (UI-SPEC L228 + T-09-04). */}
      <AlertDialog
        open={currentStep === 2}
        onOpenChange={(open) => { if (!open) void handleSkip(); }}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-heading">Ready to begin?</AlertDialogTitle>
            <AlertDialogDescription className="text-body text-text-secondary">
              Your first entry is the hardest. The next 365 are easier.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-3">
              <StepIndicator step={3} total={3} />
              <SkipLink onSkip={() => void handleSkip()} />
            </div>
            <div className="flex items-center gap-2">
              {/* CR-01 fix: plain <button>s instead of AlertDialogCancel /
                  AlertDialogAction. Both Radix variants auto-close the dialog
                  and fire onOpenChange(false), which would route through
                  handleSkip() and trigger a redundant markOnboardingCompleted
                  write (also resolves IN-01). The handlers below already mark
                  completion explicitly. Escape / click-outside dismissal still
                  uses onOpenChange -> handleSkip above. */}
              <button
                type="button"
                onClick={() => void handleStep3Explore()}
                className="px-4 py-2 text-label rounded-md border border-border text-text-secondary hover:text-text font-medium"
              >
                I'll explore first
              </button>
              <button
                type="button"
                onClick={() => void handleWriteFirstEntry()}
                className="px-4 py-2 text-label rounded-md bg-accent text-amber-950 dark:text-bg font-medium"
              >
                Write your first entry
              </button>
            </div>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
