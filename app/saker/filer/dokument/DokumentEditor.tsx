import {
  ArrowRedoIcon,
  ArrowUndoIcon,
  BulletListIcon,
  NumberListIcon,
  TableIcon,
} from "@navikt/aksel-icons";
import { Button, HStack } from "@navikt/ds-react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TableKit } from "@tiptap/extension-table";
import { useEffect } from "react";
import { sporHendelse } from "~/analytics/analytics";
import type { DokumentInnhold } from "~/saker/filer/typer";
import {
  LeggTilKolonneIkon,
  LeggTilRadIkon,
  SlettKolonneIkon,
  SlettRadIkon,
} from "./tabell-ikoner";

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
      onClick={() => {
        sporHendelse("dokument formatert", { format: etikett });
        onClick();
      }}
    >
      {children}
    </Button>
  );
}

function Verktøylinje({ editor, slutt }: { editor: Editor; slutt?: React.ReactNode }) {
  return (
    <HStack
      justify="space-between"
      align="center"
      gap="space-4"
      wrap
      className="border-b border-ax-border-neutral-subtle pb-2 mb-2"
    >
      <HStack gap="space-2" align="center" wrap role="toolbar" aria-label="Formatering">
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
        <VerktøyKnapp
          etikett="Sett inn tabell"
          onClick={() =>
            editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
          }
        >
          <TableIcon aria-hidden />
        </VerktøyKnapp>
        {editor.isActive("table") && (
          <>
            <VerktøyKnapp
              etikett="Legg til kolonne"
              onClick={() => editor.chain().focus().addColumnAfter().run()}
            >
              <LeggTilKolonneIkon aria-hidden />
            </VerktøyKnapp>
            <VerktøyKnapp
              etikett="Slett kolonne"
              onClick={() => editor.chain().focus().deleteColumn().run()}
            >
              <SlettKolonneIkon aria-hidden />
            </VerktøyKnapp>
            <VerktøyKnapp
              etikett="Legg til rad"
              onClick={() => editor.chain().focus().addRowAfter().run()}
            >
              <LeggTilRadIkon aria-hidden />
            </VerktøyKnapp>
            <VerktøyKnapp
              etikett="Slett rad"
              onClick={() => editor.chain().focus().deleteRow().run()}
            >
              <SlettRadIkon aria-hidden />
            </VerktøyKnapp>
            <VerktøyKnapp
              etikett="Slett tabell"
              onClick={() => editor.chain().focus().deleteTable().run()}
            >
              Slett tabell
            </VerktøyKnapp>
          </>
        )}
      </HStack>
      {slutt}
    </HStack>
  );
}

type DokumentEditorProps = {
  startInnhold: DokumentInnhold;
  redigerbar: boolean;
  onEndring: (innhold: DokumentInnhold) => void;
  /** Innhold som vises til høyre i verktøylinjen (f.eks. lagrestatus). */
  verktøylinjeSlutt?: React.ReactNode;
};

export function DokumentEditor({
  startInnhold,
  redigerbar,
  onEndring,
  verktøylinjeSlutt,
}: DokumentEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit, TableKit.configure({ table: { resizable: true } })],
    content: startInnhold,
    editable: redigerbar,
    immediatelyRender: false,
    // Re-render verktøylinjen på hver transaksjon, slik at aktiv-tilstand (fet, tabell osv.)
    // og kontekstuelle tabell-knapper holder seg i synk med markøren.
    shouldRerenderOnTransaction: true,
    editorProps: {
      attributes: {
        role: "textbox",
        "aria-multiline": "true",
        "aria-label": "Dokumentinnhold",
        class:
          "min-h-80 focus:outline-none [&_h2]:text-xl [&_h2]:font-bold [&_h3]:text-lg " +
          "[&_h3]:font-semibold [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 " +
          "[&_blockquote]:border-l-4 [&_blockquote]:border-ax-border-neutral-subtle " +
          "[&_blockquote]:pl-4 [&_blockquote]:italic [&_p]:my-2 " +
          "[&_table]:border-collapse [&_table]:my-3 [&_table]:w-full " +
          "[&_td]:border [&_td]:border-ax-border-neutral-subtle [&_td]:p-2 [&_td]:align-top " +
          "[&_th]:border [&_th]:border-ax-border-neutral-subtle [&_th]:p-2 [&_th]:align-top " +
          "[&_th]:bg-ax-bg-neutral-soft [&_th]:text-left [&_th]:font-semibold",
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
      {redigerbar && <Verktøylinje editor={editor} slutt={verktøylinjeSlutt} />}
      <EditorContent editor={editor} />
    </div>
  );
}
