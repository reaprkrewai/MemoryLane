import { BubbleMenu } from "@tiptap/react/menus";
import type { Editor } from "@tiptap/react";
import { List, Quote, Code } from "lucide-react";

interface BubbleMenuBarProps {
  editor: Editor;
}

interface FormatButton {
  label: string | React.ReactNode;
  command: () => void;
  isActive: () => boolean;
  title: string;
}

export function BubbleMenuBar({ editor }: BubbleMenuBarProps) {
  const buttons: FormatButton[] = [
    {
      label: "B",
      command: () => editor.chain().focus().toggleBold().run(),
      isActive: () => editor.isActive("bold"),
      title: "Bold (Ctrl+B)",
    },
    {
      label: <em>I</em>,
      command: () => editor.chain().focus().toggleItalic().run(),
      isActive: () => editor.isActive("italic"),
      title: "Italic (Ctrl+I)",
    },
    {
      label: "H1",
      command: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
      isActive: () => editor.isActive("heading", { level: 1 }),
      title: "Heading 1",
    },
    {
      label: "H2",
      command: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      isActive: () => editor.isActive("heading", { level: 2 }),
      title: "Heading 2",
    },
    {
      label: <List size={13} />,
      command: () => editor.chain().focus().toggleBulletList().run(),
      isActive: () => editor.isActive("bulletList"),
      title: "Bullet List",
    },
    {
      label: <Quote size={13} />,
      command: () => editor.chain().focus().toggleBlockquote().run(),
      isActive: () => editor.isActive("blockquote"),
      title: "Blockquote",
    },
    {
      label: <Code size={13} />,
      command: () => editor.chain().focus().toggleCode().run(),
      isActive: () => editor.isActive("code"),
      title: "Inline Code",
    },
  ];

  return (
    <BubbleMenu
      editor={editor}
      options={{ placement: "top" }}
    >
      <div className="flex flex-row gap-[4px] rounded-md border border-border bg-surface px-1 py-1 shadow-md">
        {buttons.map((btn, i) => {
          const active = btn.isActive();
          return (
            <button
              key={i}
              onClick={btn.command}
              title={btn.title}
              className={`flex h-7 w-7 items-center justify-center rounded-sm text-[13px] font-medium transition-colors ${
                active
                  ? "bg-amber-50/30 text-accent dark:bg-amber-950/20"
                  : "text-text hover:bg-bg"
              }`}
            >
              {btn.label}
            </button>
          );
        })}
      </div>
    </BubbleMenu>
  );
}
