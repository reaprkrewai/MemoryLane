import { useEffect, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "@tiptap/markdown";
import CharacterCount from "@tiptap/extension-character-count";
import Placeholder from "@tiptap/extension-placeholder";
import { useEntryStore } from "../stores/entryStore";
import { BubbleMenuBar } from "./BubbleMenuBar";
import { toast } from "sonner";

interface EntryEditorProps {
  entryId: string;
}

export function EntryEditor({ entryId }: EntryEditorProps) {
  const entries = useEntryStore((s) => s.entries);
  const saveContent = useEntryStore((s) => s.saveContent);

  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);

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
      setWordCount(words);
      setCharCount(chars);
      saveContent(entryId, md, words, chars).catch(() => {
        toast.error("Couldn't save entry. Check disk space.");
      });
    },
  });

  // Load entry content when entryId changes
  useEffect(() => {
    if (!editor) return;
    const entry = entries.find((e) => e.id === entryId);
    if (entry) {
      // Use setContent with markdown contentType for proper hydration
      editor.commands.setContent(entry.content, {
        contentType: "markdown",
      });
      // Update counts from stored values
      setWordCount(entry.word_count);
      setCharCount(entry.char_count);
    }
  }, [entryId, editor]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* MetadataBar placeholder — Plan 02 */}
      <div />

      {/* Editor content area */}
      <div className="flex-1 overflow-y-auto bg-bg">
        <div className="mx-auto max-w-[680px] px-8 py-6">
          <div className="tiptap-editor">
            <EditorContent editor={editor} />
            {editor && <BubbleMenuBar editor={editor} />}
          </div>

          {/* TagRow placeholder — Plan 03 */}
          <div />

          {/* Temporary word/char count — will move to MetadataBar in Plan 02 */}
          <div className="mt-4 flex justify-end">
            <span className="text-label text-muted">
              {wordCount} words &middot; {charCount} chars
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
