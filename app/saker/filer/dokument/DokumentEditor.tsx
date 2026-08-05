import {
  ArrowRedoIcon,
  ArrowUndoIcon,
  BulletListIcon,
  NumberListIcon,
  TableIcon,
} from "@navikt/aksel-icons";
import { Button, HStack, Tooltip } from "@navikt/ds-react";
import {
  BlockquotePlugin,
  BoldPlugin,
  H2Plugin,
  H3Plugin,
  ItalicPlugin,
} from "@platejs/basic-nodes/react";
import { toggleBulletedList, toggleNumberedList } from "@platejs/list-classic";
import { BulletedListPlugin, NumberedListPlugin } from "@platejs/list-classic/react";
import {
  deleteColumn,
  deleteRow,
  deleteTable,
  insertTable,
  insertTableColumn,
  insertTableRow,
} from "@platejs/table";
import {
  TableCellHeaderPlugin,
  TableCellPlugin,
  TablePlugin,
  TableRowPlugin,
} from "@platejs/table/react";
import { createContext, useContext } from "react";
import { Plate, PlateContent, PlateElement, useEditorState, usePlateEditor } from "platejs/react";
import type { TElement } from "platejs";
import type { PlateElementProps } from "platejs/react";
import { sporHendelse } from "~/analytics/analytics";
import type { DokumentInnhold } from "~/saker/filer/typer";
import {
  LeggTilKolonneIkon,
  LeggTilRadIkon,
  SlettKolonneIkon,
  SlettRadIkon,
  SlettTabellIkon,
} from "./tabell-ikoner";

/** Sporer hvilken formateringsknapp som brukes, knyttet til riktig dokument. */
const FormaterContext = createContext<(etikett: string) => void>(() => {});

type VerktøyKnappProps = {
  etikett: string;
  aktiv?: boolean;
  onClick: () => void;
  children: React.ReactNode;
};

function VerktøyKnapp({ etikett, aktiv, onClick, children }: VerktøyKnappProps) {
  const onFormater = useContext(FormaterContext);
  return (
    <Tooltip content={etikett}>
      <Button
        type="button"
        size="small"
        variant={aktiv ? "secondary" : "tertiary"}
        aria-label={etikett}
        aria-pressed={aktiv}
        onMouseDown={(e) => {
          // Hindrer at fokus flyttes fra editoren til knappen
          e.preventDefault();
          onFormater(etikett);
          onClick();
        }}
      >
        {children}
      </Button>
    </Tooltip>
  );
}

function Verktøylinje({ onFormater }: { onFormater: (etikett: string) => void }) {
  const editor = useEditorState();
  const erITabell = !!editor.api.above({ match: { type: TablePlugin.key } });

  return (
    <FormaterContext.Provider value={onFormater}>
      {/* Den negative margen nuller ut den horisontale paddingen til dokumentkortet
          slik at den festede verktøylinja går helt ut til kantene, mens px-en
          justerer knappene tilbake på linje med teksten. Vi bruker de samme Aksel
          spacing-variablene som kortet (space-24 / space-64 ved md), så verdiene
          ikke drifter fra hverandre om spacing-skalaen endres. */}
      <HStack
        justify="space-between"
        align="center"
        gap="space-4"
        wrap
        className="sticky top-0 z-10 bg-ax-bg-raised border-b border-ax-border-neutral-subtle py-2 mb-2 mx-[calc(var(--ax-space-24)_*_-1)] px-[var(--ax-space-24)] md:mx-[calc(var(--ax-space-64)_*_-1)] md:px-[var(--ax-space-64)]"
      >
        <HStack gap="space-2" align="center" wrap role="toolbar" aria-label="Formatering">
          <VerktøyKnapp
            etikett="Fet"
            aktiv={!!editor.api.mark(BoldPlugin.key)}
            onClick={() => editor.tf.toggleMark(BoldPlugin.key)}
          >
            <span className="font-bold">F</span>
          </VerktøyKnapp>
          <VerktøyKnapp
            etikett="Kursiv"
            aktiv={!!editor.api.mark(ItalicPlugin.key)}
            onClick={() => editor.tf.toggleMark(ItalicPlugin.key)}
          >
            <span className="italic">K</span>
          </VerktøyKnapp>
          <VerktøyKnapp
            etikett="Overskrift 2"
            aktiv={editor.api.some({ match: { type: H2Plugin.key } })}
            onClick={() => editor.tf.toggleBlock(H2Plugin.key)}
          >
            H2
          </VerktøyKnapp>
          <VerktøyKnapp
            etikett="Overskrift 3"
            aktiv={editor.api.some({ match: { type: H3Plugin.key } })}
            onClick={() => editor.tf.toggleBlock(H3Plugin.key)}
          >
            H3
          </VerktøyKnapp>
          <VerktøyKnapp
            etikett="Punktliste"
            aktiv={editor.api.some({ match: { type: BulletedListPlugin.key } })}
            onClick={() => toggleBulletedList(editor)}
          >
            <BulletListIcon aria-hidden />
          </VerktøyKnapp>
          <VerktøyKnapp
            etikett="Nummerert liste"
            aktiv={editor.api.some({ match: { type: NumberedListPlugin.key } })}
            onClick={() => toggleNumberedList(editor)}
          >
            <NumberListIcon aria-hidden />
          </VerktøyKnapp>
          <VerktøyKnapp
            etikett="Sitat"
            aktiv={editor.api.some({ match: { type: BlockquotePlugin.key } })}
            onClick={() => editor.tf.toggleBlock(BlockquotePlugin.key)}
          >
            <span aria-hidden>&rdquo;</span>
          </VerktøyKnapp>
          <VerktøyKnapp etikett="Angre" onClick={() => editor.undo()}>
            <ArrowUndoIcon aria-hidden />
          </VerktøyKnapp>
          <VerktøyKnapp etikett="Gjenta" onClick={() => editor.redo()}>
            <ArrowRedoIcon aria-hidden />
          </VerktøyKnapp>
          <VerktøyKnapp
            etikett="Sett inn tabell"
            onClick={() => insertTable(editor, { rowCount: 3, colCount: 3, header: true })}
          >
            <TableIcon aria-hidden />
          </VerktøyKnapp>
          {erITabell && (
            <>
              <VerktøyKnapp etikett="Legg til kolonne" onClick={() => insertTableColumn(editor)}>
                <LeggTilKolonneIkon aria-hidden />
              </VerktøyKnapp>
              <VerktøyKnapp etikett="Slett kolonne" onClick={() => deleteColumn(editor)}>
                <SlettKolonneIkon aria-hidden />
              </VerktøyKnapp>
              <VerktøyKnapp etikett="Legg til rad" onClick={() => insertTableRow(editor)}>
                <LeggTilRadIkon aria-hidden />
              </VerktøyKnapp>
              <VerktøyKnapp etikett="Slett rad" onClick={() => deleteRow(editor)}>
                <SlettRadIkon aria-hidden />
              </VerktøyKnapp>
              <VerktøyKnapp etikett="Slett tabell" onClick={() => deleteTable(editor)}>
                <SlettTabellIkon aria-hidden />
              </VerktøyKnapp>
            </>
          )}
        </HStack>
      </HStack>
    </FormaterContext.Provider>
  );
}

const PLUGINS = [
  BoldPlugin,
  ItalicPlugin,
  H2Plugin,
  H3Plugin,
  BlockquotePlugin,
  BulletedListPlugin,
  NumberedListPlugin,
  TablePlugin.withComponent(({ children, ...props }: PlateElementProps) => (
    <PlateElement as="table" {...props}>
      {children}
    </PlateElement>
  )),
  TableRowPlugin.withComponent(({ children, ...props }: PlateElementProps) => (
    <PlateElement as="tr" {...props}>
      {children}
    </PlateElement>
  )),
  TableCellPlugin.withComponent(({ children, ...props }: PlateElementProps) => (
    <PlateElement as="td" {...props}>
      {children}
    </PlateElement>
  )),
  TableCellHeaderPlugin.withComponent(({ children, ...props }: PlateElementProps) => (
    <PlateElement as="th" {...props}>
      {children}
    </PlateElement>
  )),
];

type DokumentEditorProps = {
  startInnhold: DokumentInnhold;
  redigerbar: boolean;
  onEndring: (innhold: DokumentInnhold) => void;
  /** Brukes til å knytte «dokument formatert»-analytics til riktig dokument. */
  sakId: string;
  docId: string;
};

export function DokumentEditor({
  startInnhold,
  redigerbar,
  onEndring,
  sakId,
  docId,
}: DokumentEditorProps) {
  const editor = usePlateEditor({
    plugins: PLUGINS,
    value: startInnhold as TElement[],
  });

  return (
    <Plate
      editor={editor}
      readOnly={!redigerbar}
      onChange={({ value }) => onEndring(value as DokumentInnhold)}
    >
      {redigerbar && (
        <Verktøylinje
          onFormater={(format) => sporHendelse("dokument formatert", { sakId, docId, format })}
        />
      )}
      <PlateContent
        role="textbox"
        aria-multiline
        aria-label="Dokumentinnhold"
        className={
          "min-h-[60vh] focus:outline-none [&_h2]:text-xl [&_h2]:font-bold [&_h3]:text-lg " +
          "[&_h3]:font-semibold [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 " +
          "[&_blockquote]:border-l-4 [&_blockquote]:border-ax-border-neutral-subtle " +
          "[&_blockquote]:pl-4 [&_blockquote]:italic [&_p]:my-2 " +
          "[&_table]:border-collapse [&_table]:my-3 [&_table]:w-full " +
          "[&_td]:border [&_td]:border-ax-border-neutral-subtle [&_td]:p-2 [&_td]:align-top " +
          "[&_th]:border [&_th]:border-ax-border-neutral-subtle [&_th]:p-2 [&_th]:align-top " +
          "[&_th]:bg-ax-bg-neutral-soft [&_th]:text-left [&_th]:font-semibold"
        }
      />
    </Plate>
  );
}
