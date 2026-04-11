import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ChevronDown, ChevronUp } from "lucide-react";
import { getDb } from "../lib/db";
import { useUiStore } from "../stores/uiStore";
import { useEntryStore } from "../stores/entryStore";
import { useViewStore } from "../stores/viewStore";
import { TimelineCard } from "./TimelineCard";

// Reuse types from TimelineView
interface TimelineCardEntry {
  id: string;
  content: string;
  mood: string | null;
  word_count: number;
  created_at: number;
}

interface TimelineCardTag {
  id: string;
  name: string;
  color: string;
}

export function OnThisDay() {
  const [otdEntries, setOtdEntries] = useState<TimelineCardEntry[]>([]);
  const [otdTags, setOtdTags] = useState<Record<string, TimelineCardTag[]>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { onThisDayCollapsed, setOnThisDayCollapsed } = useUiStore();
  const { selectEntry } = useEntryStore();
  const { navigateToEditor } = useViewStore();

  // Query OTD entries on mount
  useEffect(() => {
    const fetchOtdEntries = async () => {
      const db = await getDb();
      const today = format(new Date(), "MM-dd");

      // Pattern 5 from RESEARCH.md + Pitfall 3 (/ 1000) + Pitfall 4 ('localtime')
      const sql = `
        SELECT id, content, mood, word_count, created_at, updated_at, metadata
        FROM entries
        WHERE strftime('%m-%d', created_at / 1000, 'unixepoch', 'localtime') = ?
          AND date(created_at / 1000, 'unixepoch', 'localtime') < date('now', 'localtime')
        ORDER BY created_at DESC
      `;

      try {
        const entries = await db.select<TimelineCardEntry[]>(sql, [today]);
        setOtdEntries(entries);

        // If entries exist, fetch their tags using the same batch pattern as TimelineView
        if (entries.length > 0) {
          const ids = entries.map((e) => e.id);
          const tagsQuery = `
            SELECT et.entry_id, t.id, t.name, t.color
            FROM entry_tags et
            JOIN tags t ON et.tag_id = t.id
            WHERE et.entry_id IN (${ids.map(() => "?").join(", ")})
          `;
          const tagRows = await db.select<any[]>(tagsQuery, ids);
          const tagMap: Record<string, TimelineCardTag[]> = {};
          entries.forEach((e) => {
            tagMap[e.id] = [];
          });
          tagRows.forEach((row) => {
            tagMap[row.entry_id].push({
              id: row.id,
              name: row.name,
              color: row.color,
            });
          });
          setOtdTags(tagMap);
        }
      } catch (err) {
        console.error("OTD query failed:", err);
        setOtdEntries([]);
      }
    };

    void fetchOtdEntries();
  }, []);

  // Don't render if no past entries for today
  if (otdEntries.length === 0) {
    return null;
  }

  const handleToggleCollapse = () => {
    setOnThisDayCollapsed(!onThisDayCollapsed);
  };

  const handleOpenEntry = (entryId: string) => {
    void selectEntry(entryId);
    navigateToEditor("timeline");
  };

  return (
    <div className="bg-surface/50 rounded-md border border-border/50 p-4 mb-6">
      {/* Header with toggle */}
      <button
        onClick={handleToggleCollapse}
        className="flex w-full items-center justify-between gap-2 font-semibold text-text hover:opacity-80"
        type="button"
      >
        <span className="text-label">On This Day</span>
        {onThisDayCollapsed ? (
          <ChevronDown size={16} className="text-muted" />
        ) : (
          <ChevronUp size={16} className="text-muted" />
        )}
      </button>

      {/* Collapsed state */}
      {onThisDayCollapsed && (
        <p className="text-body text-muted mt-2">
          {otdEntries.length} past entr{otdEntries.length === 1 ? "y" : "ies"}
        </p>
      )}

      {/* Expanded state — render entry cards */}
      {!onThisDayCollapsed && (
        <div className="mt-4 space-y-3">
          {otdEntries.map((entry) => (
            <TimelineCard
              key={entry.id}
              entry={entry}
              tags={otdTags[entry.id] || []}
              expanded={expandedId === entry.id}
              onToggleExpand={() =>
                setExpandedId((curr) => (curr === entry.id ? null : entry.id))
              }
              onOpen={() => handleOpenEntry(entry.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
