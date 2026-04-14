import { Minus, Square, X } from "lucide-react";

export function TitleBar() {
  return (
    <div className="flex h-12 select-none border-b border-border bg-surface">
      {/* Drag region is a pure spacer — no interactive elements inside */}
      <div
        data-tauri-drag-region
        className="flex flex-1 items-center px-6"
      >
        <span className="text-sm font-semibold text-text-secondary">Chronicle</span>
      </div>
      {/* Window controls sit OUTSIDE the drag region */}
      <div className="flex items-center gap-0.5 pr-2">
        <button
          className="inline-flex h-8 w-10 items-center justify-center rounded text-text-muted transition-colors hover:text-text hover:bg-surface-secondary"
          onClick={() => {
            import("@tauri-apps/api/window").then((m) =>
              m.getCurrentWindow().minimize()
            );
          }}
          aria-label="Minimize"
        >
          <Minus size={16} />
        </button>
        <button
          className="inline-flex h-8 w-10 items-center justify-center rounded text-text-muted transition-colors hover:text-text hover:bg-surface-secondary"
          onClick={() => {
            import("@tauri-apps/api/window").then((m) =>
              m.getCurrentWindow().toggleMaximize()
            );
          }}
          aria-label="Maximize"
        >
          <Square size={14} />
        </button>
        <button
          className="inline-flex h-8 w-10 items-center justify-center rounded text-text-muted transition-colors hover:text-destructive hover:bg-destructive/10"
          onClick={() => {
            import("@tauri-apps/api/window").then((m) =>
              m.getCurrentWindow().close()
            );
          }}
          aria-label="Close"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
