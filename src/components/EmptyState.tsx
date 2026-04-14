import { BookOpen } from "lucide-react";

export function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6">
      <div className="rounded-full bg-accent/10 p-5">
        <BookOpen size={40} className="text-accent" />
      </div>
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-text">Your journal is ready</h1>
        <p className="max-w-md text-sm text-text-secondary">
          Everything stays on your device. Start writing — Chronicle will
          remember the rest.
        </p>
      </div>
      <span className="cursor-pointer text-sm font-semibold text-accent hover:opacity-80 transition-opacity">
        Write your first entry
      </span>
    </div>
  );
}
