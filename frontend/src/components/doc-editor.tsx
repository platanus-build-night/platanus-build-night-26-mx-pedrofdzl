"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { marked } from "marked";
import TurndownService from "turndown";

const turndown = new TurndownService();

export function DocEditor({
  content,
  onChange,
}: {
  content: string;
  onChange: (markdown: string) => void;
}) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: marked.parse(content, { async: false }),
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "min-h-80 max-w-none space-y-2 rounded-md border border-input bg-transparent p-3 text-sm leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-ring/40 [&_h1]:text-lg [&_h2]:text-base [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5",
      },
    },
    onUpdate: ({ editor }) => onChange(turndown.turndown(editor.getHTML())),
  });

  if (!editor) return null;
  return <EditorContent editor={editor} />;
}
