import { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "@tiptap/markdown";
import CharacterCount from "@tiptap/extension-character-count";
import Placeholder from "@tiptap/extension-placeholder";
import { useEntryStore } from "../stores/entryStore";
import { BubbleMenuBar } from "./BubbleMenuBar";
import { MetadataBar } from "./MetadataBar";
import { TagRow } from "./TagRow";
import { PhotoAttachmentButton } from "./PhotoAttachmentButton";
import { PhotoGallery } from "./PhotoGallery";
import { usePhotoManagement } from "../hooks/usePhotoManagement";
import { toast } from "sonner";

interface EntryEditorProps {
  entryId: string;
}

export function EntryEditor({ entryId }: EntryEditorProps) {
  const entries = useEntryStore((s) => s.entries);
  const scheduleAutoSave = useEntryStore((s) => s.scheduleAutoSave);
  const flushAndClearTimers = useEntryStore((s) => s.flushAndClearTimers);
  const loadAutoSaveInterval = useEntryStore((s) => s.loadAutoSaveInterval);

  const { loadPhotos, removePhoto, currentPhotos } = usePhotoManagement(entryId);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Markdown,
      CharacterCount,
      Placeholder.configure({ placeholder: "Start writing\u2026" }),
    ],
    content: "",
    onUpdate: ({ editor: e }) => {
      const md = e.getMarkdown();
      const words = e.storage.characterCount.words();
      const chars = e.storage.characterCount.characters();
      scheduleAutoSave(entryId, md, words, chars);
    },
    onBlur: ({ editor: e }) => {
      // Catch any save errors from background saves
      void e; // suppress unused var warning
    },
  });

  // Load auto-save interval from settings once on mount
  useEffect(() => {
    loadAutoSaveInterval().catch(() => {
      // Non-fatal: fall back to default 5s
    });
  }, []);

  // Load photos for this entry on mount / when entryId changes
  useEffect(() => {
    loadPhotos().catch(() => {
      // Non-fatal: photos section will just be empty
    });
  }, [entryId]);

  // Flush pending saves on unmount
  useEffect(() => {
    return () => {
      flushAndClearTimers().catch(() => {
        toast.error("Couldn't save entry. Check disk space.");
      });
    };
  }, []);

  // Load entry content when entryId changes
  useEffect(() => {
    if (!editor) return;
    const entry = entries.find((e) => e.id === entryId);
    if (entry) {
      // Use setContent with markdown contentType for proper hydration
      editor.commands.setContent(entry.content, {
        contentType: "markdown",
      });
    }
  }, [entryId, editor]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* MetadataBar: date picker, mood selector, word/char count */}
      <MetadataBar entryId={entryId} editor={editor} />

      {/* Editor content area — scrollable middle section */}
      <div className="flex-1 overflow-y-auto bg-bg">
        <div className="mx-auto max-w-[680px] px-8 py-6">
          <div className="tiptap-editor">
            <EditorContent editor={editor} />
            {editor && <BubbleMenuBar editor={editor} />}
          </div>
        </div>
      </div>

      {/* TagRow: fixed at bottom of editor pane, below scroll area */}
      <TagRow entryId={entryId} />

      {/* Photo attachment: below TagRow */}
      <div className="border-t border-border bg-bg px-4 py-2">
        <div className="mx-auto max-w-[680px]">
          <div className="flex items-center justify-between">
            <PhotoAttachmentButton
              entryId={entryId}
              currentPhotoCount={currentPhotos.length}
            />
          </div>
          {currentPhotos.length > 0 && (
            <PhotoGallery
              photos={currentPhotos}
              mode="editor"
              onRemove={removePhoto}
            />
          )}
        </div>
      </div>
    </div>
  );
}
