import { ArrowRedoIcon, ArrowUndoIcon, BulletListIcon, NumberListIcon } from "@navikt/aksel-icons";
import { Button, HStack } from "@navikt/ds-react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect } from "react";
import type { DokumentInnhold } from "~/saker/filer/typer";

// 🔴 Rød sone: Tiptap-oppsett er ny teknologi for teamet. Innhold serialiseres som
// ProseMirror/Tiptap-JSON via `editor.getJSON()`. `immediatelyRender: false` er
// nødvendig for server-rendering (unngår hydration-mismatch).

type VerktøyKnappProps = {
  etikett: string;
  aktiv?: boolean;
  onClick: () => void;
  children: React.ReactNode;
};

function VerktøyKnapp({ etikett, aktiv, onClick, children }: VerktøyKnappProps) {
  return (
    <Button
      type="button"
      size="small"
      variant={aktiv ? "secondary" : "tertiary"}
      aria-label={etikett}
      aria-pressed={aktiv}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

function Verktøylinje({ editor }: { editor: Editor }) {
  return (
    <HStack
      gap="space-2"
      align="center"
      wrap
      className="border-b border-ax-border-neutral-subtle pb-2 mb-2"
      role="toolbar"
      aria-label="Formatering"
    >
      <VerktøyKnapp
        etikett="Fet"
        aktiv={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <span className="font-bold">F</span>
      </VerktøyKnapp>
      <VerktøyKnapp
        etikett="Kursiv"
        aktiv={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <span className="italic">K</span>
      </VerktøyKnapp>
      <VerktøyKnapp
        etikett="Overskrift 2"
        aktiv={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        H2
      </VerktøyKnapp>
      <VerktøyKnapp
        etikett="Overskrift 3"
        aktiv={editor.isActive("heading", { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        H3
      </VerktøyKnapp>
      <VerktøyKnapp
        etikett="Punktliste"
        aktiv={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <BulletListIcon aria-hidden />
      </VerktøyKnapp>
      <VerktøyKnapp
        etikett="Nummerert liste"
        aktiv={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <NumberListIcon aria-hidden />
      </VerktøyKnapp>
      <VerktøyKnapp
        etikett="Sitat"
        aktiv={editor.isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <span aria-hidden>&rdquo;</span>
      </VerktøyKnapp>
      <VerktøyKnapp etikett="Angre" onClick={() => editor.chain().focus().undo().run()}>
        <ArrowUndoIcon aria-hidden />
      </VerktøyKnapp>
      <VerktøyKnapp etikett="Gjenta" onClick={() => editor.chain().focus().redo().run()}>
        <ArrowRedoIcon aria-hidden />
      </VerktøyKnapp>
    </HStack>
  );
}

type DokumentEditorProps = {
  startInnhold: DokumentInnhold;
  redigerbar: boolean;
  onEndring: (innhold: DokumentInnhold) => void;
};

export function DokumentEditor({ startInnhold, redigerbar, onEndring }: DokumentEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: startInnhold,
    editable: redigerbar,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        role: "textbox",
        "aria-multiline": "true",
        "aria-label": "Dokumentinnhold",
        class:
          "min-h-80 focus:outline-none [&_h2]:text-xl [&_h2]:font-bold [&_h3]:text-lg " +
          "[&_h3]:font-semibold [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 " +
          "[&_blockquote]:border-l-4 [&_blockquote]:border-ax-border-neutral-subtle " +
          "[&_blockquote]:pl-4 [&_blockquote]:italic [&_p]:my-2",
      },
    },
    onUpdate: ({ editor: gjeldende }) => {
      onEndring(gjeldende.getJSON() as DokumentInnhold);
    },
  });

  // Hold redigerbar-tilstanden i synk dersom tilgangen endres.
  useEffect(() => {
    editor?.setEditable(redigerbar);
  }, [editor, redigerbar]);

  if (!editor) {
    return null;
  }

  return (
    <div>
      {redigerbar && <Verktøylinje editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
}
