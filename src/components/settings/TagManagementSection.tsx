import { useMemo, useState } from "react";
import { Tag, Pencil, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { useTagStore, TAG_COLORS } from "../../stores/tagStore";
import { ColorGrid } from "../ui/ColorGrid";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "../ui/popover";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "../ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { buttonVariants } from "../ui/button";

// Local SectionHeader — mirrors SettingsView.tsx lines 41-55 (12-line component, stable API).
// Duplicated locally to avoid modifying SettingsView's internal API surface (D-patterns).
interface SectionHeaderProps {
  icon: React.ReactNode;
  title: string;
}

function SectionHeader({ icon, title }: SectionHeaderProps) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-accent/10">
        <span className="text-accent">{icon}</span>
      </div>
      <h2 className="text-sm font-bold uppercase tracking-wider text-text">{title}</h2>
    </div>
  );
}

type SortMode = "usage" | "recent" | "alpha";

interface TagWithMeta {
  id: string;
  name: string;
  color: string;
  usage_count: number;
  last_used?: number;
}

export function TagManagementSection() {
  const tags = useTagStore((s) => s.tags);
  const renameTag = useTagStore((s) => s.renameTag);
  const updateTagColor = useTagStore((s) => s.updateTagColor);
  const deleteTag = useTagStore((s) => s.deleteTag);

  const [sortBy, setSortBy] = useState<SortMode>("usage");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [recolorId, setRecolorId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TagWithMeta | null>(null);

  const sorted = useMemo(() => {
    const copy = [...tags];
    if (sortBy === "usage") {
      copy.sort((a, b) => b.usage_count - a.usage_count || a.name.localeCompare(b.name));
    } else if (sortBy === "recent") {
      copy.sort((a, b) => (b.last_used ?? 0) - (a.last_used ?? 0) || a.name.localeCompare(b.name));
    } else {
      copy.sort((a, b) => a.name.localeCompare(b.name));
    }
    return copy;
  }, [tags, sortBy]);

  const commitRename = async (id: string, newName: string, originalName: string) => {
    const trimmed = newName.trim();
    setEditingId(null);
    if (trimmed.length === 0 || trimmed === originalName) return;
    try {
      await renameTag(id, trimmed);
    } catch {
      // SQLite UNIQUE constraint on tags.name rejects duplicates
      toast.error(`A tag named "${trimmed}" already exists`);
      setEditingId(id); // return to editing state
    }
  };

  const handleRecolor = async (id: string, color: string) => {
    setRecolorId(null);
    await updateTagColor(id, color);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    try {
      await deleteTag(target.id);
    } catch {
      toast.error("Failed to delete tag");
    }
  };

  return (
    <section>
      <SectionHeader icon={<Tag size={16} />} title="Tag Management" />

      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-muted">
          {tags.length} {tags.length === 1 ? "tag" : "tags"}
        </span>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortMode)}
          className="text-sm bg-surface border border-border rounded-md px-2 py-1 text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          aria-label="Sort tags by"
        >
          <option value="usage">Most used</option>
          <option value="recent">Recently used</option>
          <option value="alpha">Alphabetical</option>
        </select>
      </div>

      <div className="border-t border-border">
        {sorted.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-muted">No tags yet — add tags from any entry.</p>
          </div>
        ) : (
          <TooltipProvider>
            {sorted.map((tag) => (
              <TagRow
                key={tag.id}
                tag={tag}
                isEditing={editingId === tag.id}
                isRecolorOpen={recolorId === tag.id}
                onStartRename={() => setEditingId(tag.id)}
                onCommitRename={(newName) => commitRename(tag.id, newName, tag.name)}
                onCancelRename={() => setEditingId(null)}
                onOpenRecolor={() => setRecolorId(tag.id)}
                onCloseRecolor={() => setRecolorId(null)}
                onRecolor={(color) => handleRecolor(tag.id, color)}
                onRequestDelete={() => setDeleteTarget(tag)}
              />
            ))}
          </TooltipProvider>
        )}
      </div>

      {/* Delete confirmation — ANIM-03 compliance is automatic via AlertDialog's
          built-in data-[state=open]:zoom-in-95 + fade-in-0 classes */}
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete tag "{deleteTarget?.name}"?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: "destructive" })}
              onClick={confirmDelete}
            >
              Delete tag
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

interface TagRowProps {
  tag: TagWithMeta;
  isEditing: boolean;
  isRecolorOpen: boolean;
  onStartRename: () => void;
  onCommitRename: (newName: string) => void;
  onCancelRename: () => void;
  onOpenRecolor: () => void;
  onCloseRecolor: () => void;
  onRecolor: (color: string) => void;
  onRequestDelete: () => void;
}

function TagRow({
  tag,
  isEditing,
  isRecolorOpen,
  onStartRename,
  onCommitRename,
  onCancelRename,
  onOpenRecolor,
  onCloseRecolor,
  onRecolor,
  onRequestDelete,
}: TagRowProps) {
  const [draftName, setDraftName] = useState(tag.name);
  const isInUse = tag.usage_count > 0;
  const usageWord = tag.usage_count === 1 ? "entry" : "entries";

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onCommitRename(draftName);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setDraftName(tag.name); // revert
      onCancelRename();
    }
  };

  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b border-border/50 last:border-b-0 hover:bg-surface transition-colors duration-fast">
      {/* Swatch column (recolor Popover trigger) */}
      <Popover open={isRecolorOpen} onOpenChange={(open) => (open ? onOpenRecolor() : onCloseRecolor())}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex-shrink-0 h-6 w-6 rounded-full border-2 border-border/30 hover:scale-110 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
            style={{ backgroundColor: tag.color }}
            aria-label={`Change color for tag ${tag.name}`}
          />
        </PopoverTrigger>
        <PopoverContent className="w-auto p-3" align="start">
          <ColorGrid
            colors={TAG_COLORS.map((t) => t.base)}
            selected={tag.color}
            onSelect={onRecolor}
            ariaLabel={`Color for tag ${tag.name}`}
            cols={6}
          />
        </PopoverContent>
      </Popover>

      {/* Name column */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <input
            type="text"
            value={draftName}
            autoFocus
            onChange={(e) => setDraftName(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => onCommitRename(draftName)}
            className="text-sm text-text bg-transparent border-b border-accent/60 focus:outline-none focus:ring-0 w-full max-w-[180px]"
            aria-label={`Rename tag ${tag.name}`}
          />
        ) : (
          <span
            className="text-sm text-text truncate max-w-[180px] inline-block cursor-text"
            onDoubleClick={onStartRename}
          >
            {tag.name}
          </span>
        )}
      </div>

      {/* Usage column */}
      <span className="text-xs text-muted w-16 text-right flex-shrink-0">
        {tag.usage_count} {usageWord}
      </span>

      {/* Last-used column
          last_used is Unix ms (MAX(e.created_at) — entries.created_at is stored as ms).
          Use new Date(tag.last_used) directly — no * 1000 multiplier needed. */}
      <span className="text-xs text-muted w-24 text-right flex-shrink-0">
        {tag.last_used
          ? formatDistanceToNow(new Date(tag.last_used), { addSuffix: true })
          : "Never"}
      </span>

      {/* Actions column */}
      <div className="flex items-center gap-2 flex-shrink-0 w-24 justify-end">
        <button
          type="button"
          onClick={onStartRename}
          className="flex items-center justify-center h-7 w-7 rounded-md text-muted hover:text-accent hover:bg-surface transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
          aria-label={`Rename tag ${tag.name}`}
        >
          <Pencil size={14} />
        </button>

        {isInUse ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <button
                  type="button"
                  disabled
                  className="flex items-center justify-center h-7 w-7 rounded-md text-destructive opacity-40 cursor-not-allowed"
                  aria-label={`Delete tag ${tag.name} — tag is in use`}
                >
                  <Trash2 size={14} />
                </button>
              </span>
            </TooltipTrigger>
            <TooltipContent side="left">
              <span>
                Tag is in use by {tag.usage_count} {usageWord} — remove from entries before deleting
              </span>
            </TooltipContent>
          </Tooltip>
        ) : (
          <button
            type="button"
            onClick={onRequestDelete}
            className="flex items-center justify-center h-7 w-7 rounded-md text-destructive hover:bg-destructive/10 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-destructive"
            aria-label={`Delete tag ${tag.name}`}
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
