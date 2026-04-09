import { Minus, Square, X } from "lucide-react";

export function TitleBar() {
  return (
    <div className="flex h-10 select-none bg-surface">
      {/* Drag region is a pure spacer — no interactive elements inside */}
      <div
        data-tauri-drag-region
        className="flex flex-1 items-center px-4"
      >
        <span className="text-label text-muted">Chronicle</span>
      </div>
      {/* Window controls sit OUTSIDE the drag region */}
      <div className="flex items-center">
        <button
          className="inline-flex h-10 w-12 items-center justify-center text-muted hover:bg-border/50"
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
          className="inline-flex h-10 w-12 items-center justify-center text-muted hover:bg-border/50"
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
          className="inline-flex h-10 w-12 items-center justify-center text-muted hover:bg-destructive hover:text-white"
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
