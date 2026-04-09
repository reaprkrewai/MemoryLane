import { BookOpen } from "lucide-react";

export function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4">
      <BookOpen size={48} className="text-muted" />
      <h1 className="text-display text-text">Your journal is ready</h1>
      <p className="max-w-sm text-center text-body text-muted">
        Everything stays on your device. Start writing — Chronicle will
        remember the rest.
      </p>
      <span className="cursor-pointer text-body text-accent hover:underline">
        Write your first entry
      </span>
    </div>
  );
}
