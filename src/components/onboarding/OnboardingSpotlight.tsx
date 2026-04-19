/**
 * OnboardingSpotlight — Step 2 spotlight cutout + scroll lock.
 *
 * Renders a fixed backdrop with a CSS box-shadow cutout that highlights the
 * QuickWriteFAB. The FAB itself is identified via the data-onboarding attribute
 * that Phase 8 already shipped (QuickWriteFAB.tsx:17). The cutout repositions
 * on window resize and on FAB resize via ResizeObserver. Scroll is locked while
 * the spotlight is active so the FAB cannot drift out of the highlighted area.
 *
 * The cutout is purely visual (pointer-events: none) — clicks pass through to
 * the FAB underneath, which is hoisted to z-80 via the body class
 * `onboarding-spotlight-active` (CSS rule in globals.css, NOT an inline element-
 * injected stylesheet — codebase convention has zero precedent for that pattern).
 * CONTEXT.md D-09 mandates the spotlight technique.
 *
 * Defensive: if the FAB target is missing (refactor drift), the backdrop still
 * renders with no cutout — user can still escape via Skip tour or Esc.
 */

import { useLayoutEffect, useState } from "react";

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PADDING = 12;        // UI-SPEC locked exception: 12px around FAB
const TARGET_SELECTOR = '[data-onboarding="quick-write-fab"]';
const BODY_CLASS = "onboarding-spotlight-active";

// No return-type annotation — codebase convention (App.tsx, AppShell.tsx,
// SettingsView.tsx all infer the React return type; grep across src/ for the
// React element-type annotation returns 0 matches.
export function OnboardingSpotlight() {
  const [rect, setRect] = useState<Rect | null>(null);

  useLayoutEffect(() => {
    const target = document.querySelector(TARGET_SELECTOR) as HTMLElement | null;

    const recompute = () => {
      if (!target) return;
      const r = target.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };

    // Initial measurement
    recompute();

    // Re-measure on window resize
    window.addEventListener("resize", recompute);

    // Re-measure when the FAB itself resizes (e.g., font-scale change mid-session)
    let ro: ResizeObserver | null = null;
    if (target) {
      ro = new ResizeObserver(recompute);
      ro.observe(target);
    }

    // Scroll lock — capture prior value to restore on unmount
    const priorOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // FAB z-hoist: add the body class. The global stylesheet rule
    // (globals.css `body.onboarding-spotlight-active [data-onboarding="quick-write-fab"]`)
    // raises the FAB above the backdrop so it remains clickable inside the cutout.
    document.body.classList.add(BODY_CLASS);

    return () => {
      window.removeEventListener("resize", recompute);
      if (ro) ro.disconnect();
      document.body.style.overflow = priorOverflow;
      document.body.classList.remove(BODY_CLASS);
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[60] pointer-events-none animate-fade-in"
      aria-hidden
    >
      {/* Cutout div: visible only when the FAB rect was successfully measured.
          The 9999px box-shadow IS the dim effect; the div itself is transparent.
          border-radius matches the FAB's pill shape. */}
      {rect && (
        <div
          className="absolute rounded-full"
          style={{
            top: rect.top - PADDING,
            left: rect.left - PADDING,
            width: rect.width + PADDING * 2,
            height: rect.height + PADDING * 2,
            borderRadius: "9999px",
            boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.6)",
            pointerEvents: "none",
          }}
        />
      )}

      {/* Defensive: when target is missing, the backdrop still dims the screen
          via this fallback so users see "this is a tour" feedback even if the
          cutout cannot be drawn. */}
      {!rect && (
        <div className="absolute inset-0 bg-black/60" style={{ pointerEvents: "none" }} />
      )}
    </div>
  );
}
