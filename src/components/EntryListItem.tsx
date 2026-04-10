import { Laugh, Smile, Meh, Frown, Angry } from "lucide-react";

interface EntryListItemProps {
  entry: {
    id: string;
    mood: string | null;
    word_count: number;
    created_at: number;
  };
  isSelected: boolean;
  onClick: () => void;
}

function MoodIcon({ mood }: { mood: string | null }) {
  if (!mood) return null;
  const iconProps = { size: 14, className: "text-muted" };
  switch (mood) {
    case "great":
      return <Laugh {...iconProps} />;
    case "good":
      return <Smile {...iconProps} />;
    case "okay":
      return <Meh {...iconProps} />;
    case "bad":
      return <Frown {...iconProps} />;
    case "awful":
      return <Angry {...iconProps} />;
    default:
      return null;
  }
}

export function EntryListItem({ entry, isSelected, onClick }: EntryListItemProps) {
  const dateLabel = new Date(entry.created_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return (
    <button
      onClick={onClick}
      className={`flex min-h-[56px] w-full items-center px-3 py-2 transition-colors ${
        isSelected ? "bg-bg" : "bg-transparent hover:bg-bg/60"
      }`}
    >
      <span className="flex-1 text-left text-label text-muted">{dateLabel}</span>
      <span className="mx-2 flex w-4 items-center justify-center">
        <MoodIcon mood={entry.mood} />
      </span>
      <span className="text-label text-muted">{entry.word_count}w</span>
    </button>
  );
}
