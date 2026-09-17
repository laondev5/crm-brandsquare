"use client";

import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Code2,
  Heading2,
  Heading3,
  Heading4,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Pilcrow,
  Quote,
  Redo2,
  Strikethrough,
  Underline as UnderlineIcon,
  Undo2,
  Unlink,
} from "lucide-react";

function Btn({
  on,
  disabled,
  label,
  onClick,
  children,
}: {
  on?: boolean;
  disabled?: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={on}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      style={{
        border: 0,
        borderRadius: 6,
        width: 30,
        height: 30,
        display: "grid",
        placeItems: "center",
        cursor: disabled ? "default" : "pointer",
        background: on ? "var(--accent)" : "transparent",
        color: on ? "var(--p)" : "var(--ink)",
        opacity: disabled ? 0.4 : 1,
      }}
    >
      {children}
    </button>
  );
}

const Sep = () => <span style={{ width: 1, alignSelf: "stretch", background: "var(--line)", margin: "4px 4px" }} />;

function Toolbar({
  editor,
  onImage,
  uploading,
}: {
  editor: Editor;
  onImage: () => void;
  uploading: boolean;
}) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      p: e.isActive("paragraph"),
      h2: e.isActive("heading", { level: 2 }),
      h3: e.isActive("heading", { level: 3 }),
      h4: e.isActive("heading", { level: 4 }),
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      strike: e.isActive("strike"),
      link: e.isActive("link"),
      ul: e.isActive("bulletList"),
      ol: e.isActive("orderedList"),
      quote: e.isActive("blockquote"),
      code: e.isActive("codeBlock"),
      undo: e.can().undo(),
      redo: e.can().redo(),
    }),
  });

  const setLink = () => {
    const prev = (editor.getAttributes("link").href as string) ?? "";
    const url = window.prompt("Link address (https://… or /page-on-this-site)", prev || "https://");
    if (url === null) return;
    if (!url.trim() || url.trim() === "https://") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    const external = /^https?:\/\//i.test(url) && !/brandsquare\.shop/i.test(url);
    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: url.trim(), target: external ? "_blank" : null, rel: external ? "noopener" : null })
      .run();
  };

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 2,
        padding: 4,
        borderBottom: "1px solid var(--line)",
        position: "sticky",
        top: 0,
        background: "#fff",
        zIndex: 2,
      }}
    >
      <Btn label="Paragraph" on={s.p} onClick={() => editor.chain().focus().setParagraph().run()}>
        <Pilcrow className="size-4" />
      </Btn>
      <Btn label="Heading 2" on={s.h2} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
        <Heading2 className="size-4" />
      </Btn>
      <Btn label="Heading 3" on={s.h3} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
        <Heading3 className="size-4" />
      </Btn>
      <Btn label="Heading 4" on={s.h4} onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}>
        <Heading4 className="size-4" />
      </Btn>
      <Sep />
      <Btn label="Bold" on={s.bold} onClick={() => editor.chain().focus().toggleBold().run()}>
        <Bold className="size-4" />
      </Btn>
      <Btn label="Italic" on={s.italic} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <Italic className="size-4" />
      </Btn>
      <Btn label="Underline" on={s.underline} onClick={() => editor.chain().focus().toggleUnderline().run()}>
        <UnderlineIcon className="size-4" />
      </Btn>
      <Btn label="Strikethrough" on={s.strike} onClick={() => editor.chain().focus().toggleStrike().run()}>
        <Strikethrough className="size-4" />
      </Btn>
      <Sep />
      <Btn label="Add or edit link" on={s.link} onClick={setLink}>
        <Link2 className="size-4" />
      </Btn>
      <Btn label="Remove link" disabled={!s.link} onClick={() => editor.chain().focus().unsetLink().run()}>
        <Unlink className="size-4" />
      </Btn>
      <Btn label={uploading ? "Uploading image…" : "Insert image"} disabled={uploading} onClick={onImage}>
        <ImagePlus className="size-4" />
      </Btn>
      <Sep />
      <Btn label="Bulleted list" on={s.ul} onClick={() => editor.chain().focus().toggleBulletList().run()}>
        <List className="size-4" />
      </Btn>
      <Btn label="Numbered list" on={s.ol} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        <ListOrdered className="size-4" />
      </Btn>
      <Btn label="Quote" on={s.quote} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
        <Quote className="size-4" />
      </Btn>
      <Btn label="Code block" on={s.code} onClick={() => editor.chain().focus().toggleCodeBlock().run()}>
        <Code2 className="size-4" />
      </Btn>
      <Btn label="Divider" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
        <Minus className="size-4" />
      </Btn>
      <Sep />
      <Btn label="Undo" disabled={!s.undo} onClick={() => editor.chain().focus().undo().run()}>
        <Undo2 className="size-4" />
      </Btn>
      <Btn label="Redo" disabled={!s.redo} onClick={() => editor.chain().focus().redo().run()}>
        <Redo2 className="size-4" />
      </Btn>
    </div>
  );
}

/**
 * The post body. A visual editor for writing, with a switch to the raw HTML
 * for pasting in something formatted elsewhere. Images upload straight to the
 * site's media library and ask for alt text, which Rank Math checks.
 */
export default function RichText({
  value,
  onChange,
  upload,
}: {
  value: string;
  onChange: (html: string) => void;
  upload: (file: File, alt: string) => Promise<{ url: string } | { error: string }>;
}) {
  const [mode, setMode] = useState<"visual" | "html">("visual");
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ link: { openOnClick: false, autolink: true } }),
      Image.configure({ HTMLAttributes: { style: "max-width:100%;height:auto" } }),
      Placeholder.configure({ placeholder: "Start writing… Use H2 and H3 for sections." }),
    ],
    content: value,
    onUpdate: ({ editor: e }) => onChange(e.getHTML()),
    editorProps: { attributes: { class: "blog-prose" } },
  });

  // Coming back from the HTML view: load what was typed there.
  useEffect(() => {
    if (editor && mode === "visual" && editor.getHTML() !== value) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, editor]);

  const pick = async (file: File | undefined) => {
    if (!file || !editor) return;
    const alt = window.prompt("Describe the image (alt text) — helps SEO and screen readers:", "") ?? "";
    setErr("");
    setUploading(true);
    const res = await upload(file, alt);
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
    if ("error" in res) {
      setErr(res.error);
      return;
    }
    editor.chain().focus().setImage({ src: res.url, alt }).run();
  };

  return (
    <div style={{ border: "1px solid var(--line)", borderRadius: 10, background: "#fff" }}>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 4, padding: "6px 8px 0" }}>
        {(["visual", "html"] as const).map((m) => (
          <button
            key={m}
            type="button"
            className={`btn sm ${mode === m ? "" : "ghost"}`}
            onClick={() => setMode(m)}
          >
            {m === "visual" ? "Visual" : "HTML"}
          </button>
        ))}
      </div>
      {err && (
        <div className="msg err" style={{ margin: 8 }}>
          {err}
        </div>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        hidden
        onChange={(e) => pick(e.target.files?.[0])}
      />
      {mode === "visual" ? (
        editor ? (
          <>
            <Toolbar editor={editor} uploading={uploading} onImage={() => fileRef.current?.click()} />
            <EditorContent editor={editor} />
          </>
        ) : (
          <div style={{ minHeight: 420 }} />
        )
      ) : (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          style={{
            width: "100%",
            minHeight: 460,
            border: 0,
            borderTop: "1px solid var(--line)",
            borderRadius: "0 0 10px 10px",
            fontFamily: "ui-monospace, Menlo, Consolas, monospace",
            fontSize: 12.5,
            padding: 14,
          }}
        />
      )}
    </div>
  );
}
