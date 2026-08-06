import {
  ArrowRedoIcon,
  ArrowUndoIcon,
  BulletListIcon,
  NumberListIcon,
  TableIcon,
} from "@navikt/aksel-icons";
import { Button, HStack, Select, Tooltip } from "@navikt/ds-react";
import {
  BlockquotePlugin,
  BoldPlugin,
  H1Plugin,
  H2Plugin,
  H3Plugin,
  ItalicPlugin,
  StrikethroughPlugin,
  UnderlinePlugin,
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
import { indent, outdent } from "@platejs/indent";
import { IndentPlugin } from "@platejs/indent/react";
import { TrailingBlockPlugin } from "platejs";
import {
  TableCellHeaderPlugin,
  TableCellPlugin,
  TablePlugin,
  TableRowPlugin,
} from "@platejs/table/react";
import { createContext, useCallback, useContext, useRef, useState } from "react";
import { Plate, PlateContent, PlateElement, useEditorState, usePlateEditor } from "platejs/react";
import type { TElement } from "platejs";
import type { PlateElementProps } from "platejs/react";
import { sporHendelse } from "~/analytics/analytics";
import { Kort } from "~/komponenter/Kort";
import type { DokumentInnhold } from "~/saker/filer/typer";
import {
  LeggTilKolonneIkon,
  LeggTilRadIkon,
  SlettKolonneIkon,
  SlettRadIkon,
  SlettTabellIkon,
} from "./tabell-ikoner";
import { AvindenterIkon, IndenterIkon } from "./verktøylinje-ikoner";

/** Sporer hvilken formateringsknapp som brukes, knyttet til riktig dokument. */
const FormaterContext = createContext<(etikett: string) => void>(() => {});
/** Etikett på den knappen som for øyeblikket er i tab-rekkefølgen (roving tabindex). */
const AktivEtikettContext = createContext<string>("");
/** Oppdaterer roving tabindex-roveren når en knapp får fokus. */
const SettAktivEtikettContext = createContext<(etikett: string) => void>(() => {});

type VerktøyKnappProps = {
  etikett: string;
  aktiv?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
};

function VerktøyKnapp({ etikett, aktiv, disabled, onClick, children }: VerktøyKnappProps) {
  const onFormater = useContext(FormaterContext);
  const aktivEtikett = useContext(AktivEtikettContext);
  const settAktivEtikett = useContext(SettAktivEtikettContext);

  return (
    <Tooltip content={etikett}>
      <Button
        type="button"
        size="small"
        variant={aktiv ? "secondary" : "tertiary"}
        aria-label={etikett}
        aria-pressed={aktiv}
        disabled={disabled}
        tabIndex={aktivEtikett === etikett ? 0 : -1}
        onFocus={() => settAktivEtikett(etikett)}
        onMouseDown={(e) => {
          // For museklikk (detail > 0): hindre at fokus flyttes fra editoren.
          // For tastatur-syntetiske click-events (detail === 0): la nettleseren
          // håndtere fokus normalt slik at skjermlesere fungerer riktig.
          if (e.detail > 0) e.preventDefault();
        }}
        onClick={() => {
          onFormater(etikett);
          onClick();
        }}
      >
        {children}
      </Button>
    </Tooltip>
  );
}

/** Visuelt skille mellom grupper av verktøy. Rent dekorativt – skjult for skjermlesere. */
function Skillelinje() {
  return <div aria-hidden className="mx-1 h-[22px] w-px shrink-0 bg-ax-border-neutral-subtle" />;
}

function hentKnapper(container: HTMLElement | null): (HTMLButtonElement | HTMLSelectElement)[] {
  return Array.from(
    container?.querySelectorAll<HTMLButtonElement | HTMLSelectElement>(
      "button:not([disabled]), select:not([disabled])",
    ) ?? [],
  );
}

const BLOKTYPER = [
  { verdi: "p", etikett: "Normaltekst" },
  { verdi: H1Plugin.key, etikett: "Overskrift 1" },
  { verdi: H2Plugin.key, etikett: "Overskrift 2" },
  { verdi: H3Plugin.key, etikett: "Overskrift 3" },
] as const;

function hentGjeldendeBloktype(editor: ReturnType<typeof useEditorState>): string {
  for (const { verdi } of BLOKTYPER) {
    if (verdi !== "p" && editor.api.some({ match: { type: verdi } })) return verdi;
  }
  return "p";
}

function Verktøylinje({ onFormater }: { onFormater: (etikett: string) => void }) {
  const editor = useEditorState();
  const erITabell = !!editor.api.above({ match: { type: TablePlugin.key } });
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [aktivEtikett, settAktivEtikett] = useState("Skrifttype");

  // Behold roveren innenfor gyldige knapper når verktøylinja endres (tabell-knapper vises/skjules)
  const oppdaterRoverVedEndring = useCallback(() => {
    const knapper = hentKnapper(toolbarRef.current);
    const erGyldig = knapper.some((k) => k.tabIndex === 0);
    if (!erGyldig && knapper.length > 0) {
      settAktivEtikett(knapper[0].getAttribute("aria-label") ?? "");
    }
  }, []);

  // Kjør etter render når erITabell endres
  const forrigeErITabell = useRef(erITabell);
  if (forrigeErITabell.current !== erITabell) {
    forrigeErITabell.current = erITabell;
    oppdaterRoverVedEndring();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    const navigasjonstaster = ["ArrowLeft", "ArrowRight", "Home", "End"];
    if (!navigasjonstaster.includes(e.key)) return;
    e.preventDefault();

    const knapper = hentKnapper(toolbarRef.current);
    const gjeldende = knapper.findIndex((k) => k.getAttribute("aria-label") === aktivEtikett);
    if (gjeldende === -1) return;

    let neste: number;
    if (e.key === "ArrowRight") neste = (gjeldende + 1) % knapper.length;
    else if (e.key === "ArrowLeft") neste = (gjeldende - 1 + knapper.length) % knapper.length;
    else if (e.key === "Home") neste = 0;
    else neste = knapper.length - 1;

    const nesteEtikett = knapper[neste].getAttribute("aria-label") ?? "";
    settAktivEtikett(nesteEtikett);
    knapper[neste].focus();
  }

  return (
    <FormaterContext.Provider value={onFormater}>
      <AktivEtikettContext.Provider value={aktivEtikett}>
        <SettAktivEtikettContext.Provider value={settAktivEtikett}>
          {/* Verktøylinja ligger nå over «arket» og er et eget kort, slik skissen viser.
          Den er festet til toppen av visningsområdet så formateringen er tilgjengelig
          også når man scroller nedover i et langt dokument. */}
          <HStack
            justify="space-between"
            align="center"
            gap="space-4"
            wrap
            className="sticky top-0 z-10 rounded-lg border border-ax-border-neutral-subtle bg-ax-bg-raised px-[var(--ax-space-8)] py-[var(--ax-space-6)]"
          >
            <HStack
              gap="space-2"
              align="center"
              wrap
              role="toolbar"
              aria-label="Formatering"
              ref={toolbarRef}
              onKeyDown={onKeyDown}
            >
              <VerktøyKnapp
                etikett="Angre"
                disabled={editor.history.undos.length === 0}
                onClick={() => editor.undo()}
              >
                <ArrowUndoIcon aria-hidden />
              </VerktøyKnapp>
              <VerktøyKnapp
                etikett="Gjenta"
                disabled={editor.history.redos.length === 0}
                onClick={() => editor.redo()}
              >
                <ArrowRedoIcon aria-hidden />
              </VerktøyKnapp>
              <Skillelinje />
              <Select
                label="Skrifttype"
                hideLabel
                aria-label="Skrifttype"
                size="small"
                value={hentGjeldendeBloktype(editor)}
                tabIndex={aktivEtikett === "Skrifttype" ? 0 : -1}
                onFocus={() => settAktivEtikett("Skrifttype")}
                onChange={(e) => {
                  const type = e.target.value;
                  const current = hentGjeldendeBloktype(editor);
                  // For normaltekst: toggle av gjeldende overskrift. For overskrifter: toggle på.
                  editor.tf.toggleBlock(type === "p" ? current : type);
                }}
              >
                {BLOKTYPER.map(({ verdi, etikett }) => (
                  <option key={verdi} value={verdi}>
                    {etikett}
                  </option>
                ))}
              </Select>
              <Skillelinje />
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
                etikett="Understreket"
                aktiv={!!editor.api.mark(UnderlinePlugin.key)}
                onClick={() => editor.tf.toggleMark(UnderlinePlugin.key)}
              >
                <span className="underline">U</span>
              </VerktøyKnapp>
              <VerktøyKnapp
                etikett="Gjennomstreket"
                aktiv={!!editor.api.mark(StrikethroughPlugin.key)}
                onClick={() => editor.tf.toggleMark(StrikethroughPlugin.key)}
              >
                <span className="line-through">S</span>
              </VerktøyKnapp>
              <Skillelinje />
              <VerktøyKnapp etikett="Indenter" onClick={() => indent(editor)}>
                <IndenterIkon aria-hidden />
              </VerktøyKnapp>
              <VerktøyKnapp etikett="Avindenter" onClick={() => outdent(editor)}>
                <AvindenterIkon aria-hidden />
              </VerktøyKnapp>
              <Skillelinje />
              <VerktøyKnapp
                etikett="Sitat"
                aktiv={editor.api.some({ match: { type: BlockquotePlugin.key } })}
                onClick={() => editor.tf.toggleBlock(BlockquotePlugin.key)}
              >
                <span aria-hidden>&rdquo;</span>
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
              <Skillelinje />
              <VerktøyKnapp
                etikett="Sett inn tabell"
                onClick={() => insertTable(editor, { rowCount: 3, colCount: 3, header: true })}
              >
                <TableIcon aria-hidden />
              </VerktøyKnapp>
              {erITabell && (
                <>
                  <VerktøyKnapp
                    etikett="Legg til kolonne"
                    onClick={() => insertTableColumn(editor)}
                  >
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
        </SettAktivEtikettContext.Provider>
      </AktivEtikettContext.Provider>
    </FormaterContext.Provider>
  );
}

const PLUGINS = [
  BoldPlugin,
  ItalicPlugin,
  UnderlinePlugin,
  StrikethroughPlugin,
  IndentPlugin,
  H1Plugin,
  H2Plugin,
  H3Plugin,
  BlockquotePlugin,
  BulletedListPlugin,
  NumberedListPlugin,
  TrailingBlockPlugin.configure({ options: { type: "p" } }),
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
      {/* Grå flate bak «arket», slik skissen viser. Den negative margen nuller ut
      gutterne til PageBlock-en i AppLayout (space-16, space-48 fra lg), slik at flaten
      går helt ut til kantene av innholdsområdet, mens px-en legger paddingen tilbake. */}
      <div className="mt-[var(--ax-space-12)] bg-ax-bg-neutral-moderate py-[var(--ax-space-32)] mx-[calc(var(--ax-space-16)_*_-1)] px-[var(--ax-space-16)] lg:mx-[calc(var(--ax-space-48)_*_-1)] lg:px-[var(--ax-space-48)]">
        <Kort
          padding={{ xs: "space-24", md: "space-64" }}
          className="mx-auto w-full max-w-[210mm] shadow-[var(--ax-shadow-dialog)]"
        >
          <PlateContent
            role="textbox"
            aria-multiline
            aria-label="Dokumentinnhold"
            className={
              "min-h-[60vh] focus:outline-none [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:text-xl [&_h2]:font-bold [&_h3]:text-lg " +
              "[&_h3]:font-semibold [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 " +
              "[&_blockquote]:border-l-4 [&_blockquote]:border-ax-border-neutral-subtle " +
              "[&_blockquote]:pl-4 [&_blockquote]:italic [&_p]:my-2 " +
              "[&_table]:border-collapse [&_table]:my-3 [&_table]:w-full " +
              "[&_td]:border [&_td]:border-ax-border-neutral-subtle [&_td]:p-2 [&_td]:align-top " +
              "[&_th]:border [&_th]:border-ax-border-neutral-subtle [&_th]:p-2 [&_th]:align-top " +
              "[&_th]:bg-ax-bg-neutral-soft [&_th]:text-left [&_th]:font-semibold " +
              "[&_u]:underline [&_s]:line-through"
            }
          />
        </Kort>
      </div>
    </Plate>
  );
}
