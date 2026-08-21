import {
  AlignCenterIcon,
  AlignLeftIcon,
  AlignRightIcon,
  ArrowRedoIcon,
  ArrowUndoIcon,
  BulletListIcon,
  ImageIcon,
  NumberListIcon,
  TableIcon,
  TagIcon,
} from "@navikt/aksel-icons";
import { ActionMenu, Alert, Button, HStack, Loader, Select, Tooltip } from "@navikt/ds-react";
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
import { DocxPlugin } from "@platejs/docx";
import { JuicePlugin } from "@platejs/juice";
import { ImagePlugin } from "@platejs/media/react";
import { TrailingBlockPlugin } from "platejs";
import {
  TableCellHeaderPlugin,
  TableCellPlugin,
  TablePlugin,
  TableRowPlugin,
} from "@platejs/table/react";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent, PointerEvent, ReactNode } from "react";
import { useRevalidator } from "react-router";
import {
  ParagraphPlugin,
  Plate,
  PlateContent,
  PlateElement,
  useEditorState,
  usePlateEditor,
} from "platejs/react";
import type { TElement } from "platejs";
import type { PlateElementProps } from "platejs/react";
import { sporHendelse } from "~/analytics/analytics";
import { Kort } from "~/komponenter/Kort";
import type { DokumentInnhold, FilResponse } from "~/saker/filer/typer";
import { BildeElement } from "./BildeElement";
import { SettInnBildeModal } from "./SettInnBildeModal";
import {
  BildeOpplastingFeil,
  BILDE_FLYTT_MIMETYPE,
  byggBildeUrl,
  filtrerBildefiler,
  lastOppBilde,
} from "./bilde-opplasting";
import {
  LeggTilKolonneIkon,
  LeggTilRadIkon,
  SlettKolonneIkon,
  SlettRadIkon,
  SlettTabellIkon,
} from "./tabell-ikoner";
import { AvindenterIkon, IndenterIkon } from "./verktøylinje-ikoner";
import {
  Sidepanel,
  SidepanelMeny,
  STANDARD_SIDEPANEL,
  type SidepanelValg,
} from "./DokumentSidepanel";
import { VariabelElement, VariabelVerdierProvider } from "./variabler/VariabelElement";
import { VariabelListe } from "./variabler/VariabelListe";
import { VARIABEL_FLYTT_MIMETYPE, VariabelPlugin } from "./variabler/VariabelPlugin";
import {
  STANDARD_VARIABLER,
  type VariabelId,
  type VariabelVerdier,
} from "./variabler/variabel-typer";

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

type HorisontalJustering = "left" | "center" | "right";
type JusterbartElement = TElement & {
  justering?: HorisontalJustering;
  bevarLinjeskift?: boolean;
};

function justeringsstil(element: JusterbartElement) {
  return {
    textAlign: element.justering,
    whiteSpace: element.bevarLinjeskift ? "pre-line" : undefined,
  };
}

function JustertAvsnitt({ children, element, ...props }: PlateElementProps<JusterbartElement>) {
  return (
    <PlateElement as="p" {...props} element={element} style={justeringsstil(element)}>
      {children}
    </PlateElement>
  );
}

function JustertOverskrift1({ children, element, ...props }: PlateElementProps<JusterbartElement>) {
  return (
    <PlateElement as="h1" {...props} element={element} style={justeringsstil(element)}>
      {children}
    </PlateElement>
  );
}

function JustertOverskrift2({ children, element, ...props }: PlateElementProps<JusterbartElement>) {
  return (
    <PlateElement as="h2" {...props} element={element} style={justeringsstil(element)}>
      {children}
    </PlateElement>
  );
}

function JustertOverskrift3({ children, element, ...props }: PlateElementProps<JusterbartElement>) {
  return (
    <PlateElement as="h3" {...props} element={element} style={justeringsstil(element)}>
      {children}
    </PlateElement>
  );
}

function JustertSitat({ children, element, ...props }: PlateElementProps<JusterbartElement>) {
  return (
    <PlateElement as="blockquote" {...props} element={element} style={justeringsstil(element)}>
      {children}
    </PlateElement>
  );
}

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

function Verktøylinje({
  onFormater,
  aktivtSidepanel,
  onVelgSidepanel,
  lasterOppBilde,
  onÅpneBildeModal,
  onSettInnVariabel,
}: {
  onFormater: (etikett: string) => void;
  aktivtSidepanel: SidepanelValg;
  onVelgSidepanel: (valg: SidepanelValg) => void;
  lasterOppBilde: boolean;
  onÅpneBildeModal: () => void;
  onSettInnVariabel: (variabelId: VariabelId) => void;
}) {
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
          {/* Verktøylinja ligger over «arket» og er et eget kort, slik skissen viser.
          Den står i ro fordi det er dokumentflaten under som scroller, ikke siden. */}
          <HStack
            justify="space-between"
            align="center"
            gap="space-4"
            wrap
            className="shrink-0 rounded-lg border border-ax-border-neutral-subtle bg-ax-bg-raised px-[var(--ax-space-8)] py-[var(--ax-space-6)]"
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
              <HStack gap="space-2" role="group" aria-label="Horisontal justering">
                <VerktøyKnapp
                  etikett="Venstrejuster"
                  aktiv={editor.api.some({ match: { justering: "left" } })}
                  onClick={() => editor.tf.setNodes({ justering: "left" })}
                >
                  <AlignLeftIcon aria-hidden />
                </VerktøyKnapp>
                <VerktøyKnapp
                  etikett="Sentrer"
                  aktiv={editor.api.some({ match: { justering: "center" } })}
                  onClick={() => editor.tf.setNodes({ justering: "center" })}
                >
                  <AlignCenterIcon aria-hidden />
                </VerktøyKnapp>
                <VerktøyKnapp
                  etikett="Høyrejuster"
                  aktiv={editor.api.some({ match: { justering: "right" } })}
                  onClick={() => editor.tf.setNodes({ justering: "right" })}
                >
                  <AlignRightIcon aria-hidden />
                </VerktøyKnapp>
              </HStack>
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
              <Skillelinje />
              <VerktøyKnapp
                etikett="Sett inn bilde"
                disabled={lasterOppBilde}
                onClick={onÅpneBildeModal}
              >
                {lasterOppBilde ? <Loader size="xsmall" aria-hidden /> : <ImageIcon aria-hidden />}
              </VerktøyKnapp>
              <ActionMenu>
                <ActionMenu.Trigger>
                  <Button
                    type="button"
                    size="small"
                    variant="tertiary"
                    aria-label="Sett inn variabel"
                    icon={<TagIcon aria-hidden />}
                  />
                </ActionMenu.Trigger>
                <ActionMenu.Content>
                  <ActionMenu.Group label="Sett inn variabel">
                    {STANDARD_VARIABLER.map(({ id, etikett }) => (
                      <ActionMenu.Item
                        key={id}
                        icon={<TagIcon aria-hidden />}
                        onSelect={() => onSettInnVariabel(id)}
                      >
                        {etikett}
                      </ActionMenu.Item>
                    ))}
                  </ActionMenu.Group>
                </ActionMenu.Content>
              </ActionMenu>
            </HStack>

            <SidepanelMeny aktivt={aktivtSidepanel} onVelg={onVelgSidepanel} />
          </HStack>
        </SettAktivEtikettContext.Provider>
      </AktivEtikettContext.Provider>
    </FormaterContext.Provider>
  );
}

/** Under denne bredden bruker vi vanlig sidescroll – da stables flatene under hverandre. */
const MINSTE_BREDDE_FOR_EGEN_SCROLL = 1024;

function erOrdtegn(tegn: string | undefined) {
  return !!tegn && /[\p{L}\p{N}]/u.test(tegn);
}

/**
 * Måler hvor høy editorflaten kan være for at siden akkurat fyller vinduet, uten å
 * scrolle. Vi måler plassen over og under flaten – begge er uavhengige av flatens egen
 * høyde, så målingen gir samme svar hver gang og kan trygt kjøres på nytt.
 */
function useTilgjengeligHøyde(ref: React.RefObject<HTMLDivElement | null>) {
  const [høyde, settHøyde] = useState<number>();

  useEffect(() => {
    function mål() {
      const el = ref.current;
      if (!el || window.innerWidth < MINSTE_BREDDE_FOR_EGEN_SCROLL) {
        settHøyde(undefined);
        return;
      }

      const boks = el.getBoundingClientRect();
      const over = boks.top + window.scrollY;
      const under = document.documentElement.scrollHeight - (boks.bottom + window.scrollY);
      settHøyde(Math.max(320, window.innerHeight - over - under));
    }

    mål();
    window.addEventListener("resize", mål);
    return () => window.removeEventListener("resize", mål);
  }, [ref]);

  return høyde;
}

const PLUGINS = [
  BoldPlugin,
  ItalicPlugin,
  UnderlinePlugin,
  StrikethroughPlugin,
  IndentPlugin,
  // ParagraphPlugin mangler egen render.as-konfigurasjon (i motsetning til
  // heading-pluginene), så vi må selv be den rendre som ekte <p>-tag.
  ParagraphPlugin.withComponent(JustertAvsnitt),
  H1Plugin.withComponent(JustertOverskrift1),
  H2Plugin.withComponent(JustertOverskrift2),
  H3Plugin.withComponent(JustertOverskrift3),
  BlockquotePlugin.withComponent(JustertSitat),
  BulletedListPlugin,
  NumberedListPlugin,
  // Håndterer lim inn fra Word: DocxPlugin konverterer DOCX-utklipp til Plate-format,
  // JuicePlugin inliner CSS-stiler i utklippet så formateringen bevares ved konverteringen.
  DocxPlugin,
  JuicePlugin,
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
  ImagePlugin.withComponent(BildeElement),
  VariabelPlugin.withComponent(VariabelElement),
];

type DokumentEditorProps = {
  startInnhold: DokumentInnhold;
  redigerbar: boolean;
  onEndring: (innhold: DokumentInnhold) => void;
  /** Brukes til å knytte «dokument formatert»-analytics til riktig dokument. */
  sakId: string;
  docId: string;
  /** Dokumenttreet som vises i sidepanelet. Eies av siden, ikke av editoren. */
  dokumentliste: ReactNode;
  /** Lagrestatusen som vises nederst i sidepanelet. Eies av siden som lagrer. */
  lagreStatus?: ReactNode;
  /** Historikkinnholdet eies av siden som henter og gjenoppretter dokumentet. */
  historikkInnhold?: ReactNode;
  /** Verdier fra saken og innlogget bruker som levende variabler løses mot. */
  variabelVerdier: VariabelVerdier;
  /** Renderer innholdet for «Forhåndsvisning» i sidepanelet. Sendes inn som en funksjon
   * (ikke ferdig innhold) slik at f.eks. PDF-genereringen bare kjører mens fanen er
   * valgt, ikke ved hver render av siden. */
  renderForhåndsvisning?: () => ReactNode;
};

const MINSTE_EDITORBREDDE = 25;
const STØRSTE_EDITORBREDDE = 75;
// Forhåndsvisning skal se ut som editoren, altså 50/50. De andre fanene
// (dokumenter/variabler/historikk) er tekstlister som ikke trenger like mye plass,
// så sidepanelet starter smalere (25 %) for dem.
const STANDARD_EDITORBREDDE_FORHÅNDSVISNING = 50;
const STANDARD_EDITORBREDDE_ANNET = 75;

export function DokumentEditor({
  startInnhold,
  redigerbar,
  onEndring,
  sakId,
  docId,
  dokumentliste,
  lagreStatus,
  historikkInnhold,
  variabelVerdier,
  renderForhåndsvisning,
}: DokumentEditorProps) {
  const editor = usePlateEditor({
    plugins: PLUGINS,
    value: startInnhold as TElement[],
  });
  const [aktivtSidepanel, settAktivtSidepanel] = useState<SidepanelValg>(STANDARD_SIDEPANEL);
  const erForhåndsvisningAktiv = aktivtSidepanel === "forhåndsvisning";
  const flateRef = useRef<HTMLDivElement>(null);
  const delingsflateRef = useRef<HTMLDivElement>(null);
  const høyde = useTilgjengeligHøyde(flateRef);
  // Egne breddevalg for forhåndsvisning og de andre fanene, slik at man kan resize
  // hver av dem uavhengig av hverandre og fortsatt få riktig standardbredde når man
  // bytter fane.
  const [editorBreddeForhåndsvisning, settEditorBreddeForhåndsvisning] = useState(
    STANDARD_EDITORBREDDE_FORHÅNDSVISNING,
  );
  const [editorBreddeAnnet, settEditorBreddeAnnet] = useState(STANDARD_EDITORBREDDE_ANNET);
  const editorBredde = erForhåndsvisningAktiv ? editorBreddeForhåndsvisning : editorBreddeAnnet;
  const settEditorBredde = erForhåndsvisningAktiv
    ? settEditorBreddeForhåndsvisning
    : settEditorBreddeAnnet;

  const [lasterOppBilde, settLasterOppBilde] = useState(false);
  const [bildeFeil, settBildeFeil] = useState<string | null>(null);
  const [bildeModalÅpen, settBildeModalÅpen] = useState(false);
  const revalidator = useRevalidator();
  const settInnVariabel = useCallback(
    (variabelId: VariabelId) => {
      editor.tf.insertNodes({
        type: VariabelPlugin.key,
        variabelId,
        children: [{ text: "" }],
      });
      const etikett = STANDARD_VARIABLER.find((variabel) => variabel.id === variabelId)?.etikett;
      sporHendelse("dokument formatert", { sakId, docId, format: `Sett inn variabel: ${etikett}` });
    },
    [docId, editor, sakId],
  );

  const settInnBilde = useCallback(
    (fil: FilResponse) => {
      editor.tf.insertNodes(
        {
          type: ImagePlugin.key,
          filId: fil.id,
          url: byggBildeUrl(sakId, fil.id),
          alt: fil.filnavn,
          children: [{ text: "" }],
        },
        { nextBlock: true },
      );
      sporHendelse("dokument formatert", { sakId, docId, format: "Sett inn bilde" });
    },
    [editor, sakId, docId],
  );

  // Returnerer om opplastingen lyktes, slik at f.eks. modalen kan lukke seg selv ved
  // suksess uten å måtte lese av feil-/laste-state (som ikke er oppdatert før neste render).
  const håndterBildefiler = useCallback(
    async (filer: FileList | File[]): Promise<boolean> => {
      const bildefiler = filtrerBildefiler(filer);
      if (bildefiler.length === 0) {
        settBildeFeil("Bare PNG-, JPEG- og WebP-bilder kan settes inn i dokumentet.");
        return false;
      }
      settLasterOppBilde(true);
      settBildeFeil(null);
      // Hver fil lastes opp for seg, slik at én ugyldig/mislykket fil (f.eks. for stor,
      // eller feil format) ikke stopper opplasting av de andre gyldige bildene i samme drag.
      let feilmelding: string | null = null;
      let minstEnLyktes = false;
      for (const fil of bildefiler) {
        try {
          const opplastet = await lastOppBilde(sakId, fil);
          settInnBilde(opplastet);
          minstEnLyktes = true;
        } catch (feil) {
          feilmelding =
            feil instanceof BildeOpplastingFeil ? feil.message : "Kunne ikke laste opp bildet.";
        }
      }
      settLasterOppBilde(false);
      if (feilmelding) settBildeFeil(feilmelding);
      if (minstEnLyktes) {
        // Sørger for at f.eks. vedleggslisten på siden viser bildet uten manuell oppdatering.
        void revalidator.revalidate();
      }
      return feilmelding === null;
    },
    [sakId, settInnBilde, revalidator],
  );

  // Finner hvilken topp-nivå-indeks et punkt i dokumentet tilsvarer, ved å sammenligne
  // Y-koordinaten mot midtpunktet til hver topp-nivå-nodes DOM-element. Brukes til å
  // avgjøre hvor et bilde som dras skal slippes.
  function finnMålindeks(clientY: number): number {
    const barn = editor.children;
    for (let i = 0; i < barn.length; i++) {
      const dom = editor.api.toDOMNode(barn[i]);
      if (!dom) continue;
      const rect = dom.getBoundingClientRect();
      if (clientY < rect.top + rect.height / 2) return i;
    }
    return barn.length;
  }

  function håndterDrop(event: React.DragEvent<HTMLDivElement>) {
    if (event.dataTransfer.types.includes(BILDE_FLYTT_MIMETYPE)) {
      event.preventDefault();
      const rå = event.dataTransfer.getData(BILDE_FLYTT_MIMETYPE);
      let kildesti: number[];
      try {
        kildesti = JSON.parse(rå) as number[];
      } catch {
        // Ugyldig/uventet format på dra-dataen — avbryt rolig i stedet for å krasje editoren.
        return;
      }
      if (kildesti.length !== 1) return;
      const kildeindeks = kildesti[0];
      let målindeks = finnMålindeks(event.clientY);
      if (kildeindeks < målindeks) målindeks -= 1;
      if (målindeks === kildeindeks) return;
      editor.tf.moveNodes({ at: kildesti, to: [målindeks] });
      return;
    }

    if (event.dataTransfer.types.includes(VARIABEL_FLYTT_MIMETYPE)) {
      event.preventDefault();
      event.stopPropagation();
      const rå = event.dataTransfer.getData(VARIABEL_FLYTT_MIMETYPE);
      let kildesti: number[];
      try {
        kildesti = JSON.parse(rå) as number[];
      } catch {
        return;
      }
      const kilde = editor.api.node(kildesti);
      if (!kilde || !("variabelId" in kilde[0])) return;
      const kildeElement = editor.api.toDOMNode(kilde[0]);
      if (event.target instanceof Node && kildeElement?.contains(event.target)) return;
      const målElement =
        event.target instanceof Element
          ? event.target.closest<HTMLElement>("[data-variabel-sti]")
          : null;
      if (målElement?.dataset.variabelSti === kildesti.join(".")) return;

      let slippområde: ReturnType<typeof editor.api.findEventRange>;
      try {
        slippområde = editor.api.findEventRange(event);
      } catch {
        return;
      }
      if (!slippområde) return;

      const slipptekst = editor.api.node(slippområde.anchor)?.[0];
      const tekst =
        slipptekst && "text" in slipptekst && typeof slipptekst.text === "string"
          ? slipptekst.text
          : undefined;
      let offset = slippområde.anchor.offset;
      if (tekst && erOrdtegn(tekst[offset - 1]) && erOrdtegn(tekst[offset])) {
        let start = offset;
        let slutt = offset;
        while (erOrdtegn(tekst[start - 1])) start--;
        while (erOrdtegn(tekst[slutt])) slutt++;
        offset = offset - start < slutt - offset ? start : slutt;
      }
      const slippunkt = { ...slippområde.anchor, offset };
      const trengerMellomromFør = tekst ? erOrdtegn(tekst[offset - 1]) : false;
      const trengerMellomromEtter = tekst ? erOrdtegn(tekst[offset]) : false;

      // En point-ref følger slipppunktet mens originalnoden fjernes, så flyttingen
      // aldri kan ende opp med to kopier av samme inline-variabel.
      const slippunktReferanse = editor.api.pointRef(slippunkt);
      const flyttetVariabel = structuredClone(kilde[0]);
      editor.tf.removeNodes({ at: kildesti });
      const oppdatertSlippunkt = slippunktReferanse.unref();
      if (!oppdatertSlippunkt) return;
      editor.tf.insertNodes(
        [
          ...(trengerMellomromFør ? [{ text: " " }] : []),
          flyttetVariabel,
          ...(trengerMellomromEtter ? [{ text: " " }] : []),
        ],
        { at: oppdatertSlippunkt },
      );
      return;
    }

    const filer = event.dataTransfer?.files;
    if (!filer || filer.length === 0) return;
    // Forhindre at nettleseren åpner/navigerer til filen så snart det slippes filer i det
    // hele tatt — ikke bare når vi finner gyldige bildefiler blant dem.
    event.preventDefault();
    const bildefiler = filtrerBildefiler(filer);
    if (bildefiler.length === 0) return;
    void håndterBildefiler(bildefiler);
  }

  function håndterDragOver(event: React.DragEvent<HTMLDivElement>) {
    if (
      event.dataTransfer.types.includes("Files") ||
      event.dataTransfer.types.includes(BILDE_FLYTT_MIMETYPE) ||
      event.dataTransfer.types.includes(VARIABEL_FLYTT_MIMETYPE)
    ) {
      event.preventDefault();
    }
  }

  function håndterPaste(event: React.ClipboardEvent<HTMLDivElement>) {
    const bildefiler = filtrerBildefiler(event.clipboardData?.files ?? []);
    if (bildefiler.length === 0) return;
    // Lim inn tekst/HTML sammen med bilder (f.eks. fra Word) skal fortsatt limes inn som
    // vanlig — bare hindre standard limeoppførsel når utklippstavlen ikke også har tekst.
    if (event.clipboardData?.getData("text/plain")) return;
    event.preventDefault();
    void håndterBildefiler(bildefiler);
  }

  const oppdaterEditorbredde = useCallback(
    (clientX: number) => {
      const delingsflate = delingsflateRef.current;
      if (!delingsflate) return;

      const { left, width } = delingsflate.getBoundingClientRect();
      const bredde = Math.round(((clientX - left) / width) * 100);
      settEditorBredde(Math.min(STØRSTE_EDITORBREDDE, Math.max(MINSTE_EDITORBREDDE, bredde)));
    },
    [settEditorBredde],
  );

  const håndterSkillelinjeTastatur = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      const endringer: Record<string, number> = {
        ArrowLeft: -5,
        ArrowRight: 5,
        Home: MINSTE_EDITORBREDDE - editorBredde,
        End: STØRSTE_EDITORBREDDE - editorBredde,
      };
      const endring = endringer[event.key];
      if (endring === undefined) return;

      event.preventDefault();
      settEditorBredde((bredde) =>
        Math.min(STØRSTE_EDITORBREDDE, Math.max(MINSTE_EDITORBREDDE, bredde + endring)),
      );
    },
    [editorBredde, settEditorBredde],
  );

  const håndterSkillelinjePekerNed = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      event.currentTarget.setPointerCapture(event.pointerId);
      oppdaterEditorbredde(event.clientX);
    },
    [oppdaterEditorbredde],
  );

  const håndterSkillelinjePekerFlytt = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        oppdaterEditorbredde(event.clientX);
      }
    },
    [oppdaterEditorbredde],
  );

  return (
    <VariabelVerdierProvider
      verdier={variabelVerdier}
      erVariabelpanelÅpent={aktivtSidepanel === "variabler"}
    >
      <Plate
        editor={editor}
        readOnly={!redigerbar}
        onChange={({ value }) => onEndring(value as DokumentInnhold)}
      >
        {/* Editorflaten fyller resten av vinduet og scroller selv, slik at verktøylinja og
      sidepanelet står stille mens man jobber i et langt dokument. */}
        <div
          ref={flateRef}
          style={høyde ? { height: høyde } : undefined}
          className="flex flex-col gap-[var(--ax-space-12)] overflow-hidden"
        >
          {redigerbar && (
            <div className="px-[var(--ax-space-16)] lg:px-[var(--ax-space-24)]">
              <Verktøylinje
                onFormater={(format) =>
                  sporHendelse("dokument formatert", { sakId, docId, format })
                }
                aktivtSidepanel={aktivtSidepanel}
                onVelgSidepanel={settAktivtSidepanel}
                lasterOppBilde={lasterOppBilde}
                onÅpneBildeModal={() => settBildeModalÅpen(true)}
                onSettInnVariabel={settInnVariabel}
              />
              {bildeFeil && !bildeModalÅpen && (
                <Alert variant="error" size="small" className="mt-[var(--ax-space-8)]">
                  {bildeFeil}
                </Alert>
              )}
            </div>
          )}
          {/* Grå flate med «arket» til venstre og sidepanelet som en egen seksjon til høyre.
        Raden går helt ut til kantene fordi ruta har bedt layouten om full bredde. */}
          <div
            ref={delingsflateRef}
            className="flex min-h-0 flex-1 flex-col lg:flex-row lg:items-stretch"
            style={{ "--editor-bredde": `${editorBredde}%` } as CSSProperties}
          >
            <div
              className={
                "ml-[var(--ax-space-16)] flex min-w-0 flex-1 justify-center overflow-y-auto rounded-lg " +
                "bg-ax-bg-neutral-moderate px-[var(--ax-space-16)] py-[var(--ax-space-32)] " +
                "lg:ml-[var(--ax-space-24)] lg:px-[var(--ax-space-48)] " +
                "lg:shrink-0 lg:flex-none lg:basis-[var(--editor-bredde)]"
              }
            >
              <Kort
                padding={{ xs: "space-24", md: "space-64" }}
                className="h-fit w-full max-w-[210mm] shadow-[var(--ax-shadow-dialog)]"
              >
                <PlateContent
                  role="textbox"
                  aria-multiline
                  aria-label="Dokumentinnhold"
                  onDrop={redigerbar ? håndterDrop : undefined}
                  onDragOver={redigerbar ? håndterDragOver : undefined}
                  onPaste={redigerbar ? håndterPaste : undefined}
                  className={
                    "min-h-[60vh] focus:outline-none [&_h1]:mt-8 [&_h1]:mb-4 [&_h1]:text-2xl [&_h1]:font-bold " +
                    "[&_h2]:mt-6 [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-bold " +
                    "[&_h3]:mt-4 [&_h3]:mb-2 [&_h3]:text-lg [&_h3]:font-semibold " +
                    "[&>*:first-child]:mt-0 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 " +
                    "[&_blockquote]:border-l-4 [&_blockquote]:border-ax-border-neutral-subtle " +
                    "[&_blockquote]:pl-4 [&_blockquote]:italic [&_p]:mb-4 [&_p:last-child]:mb-0 " +
                    "[&_table]:border-collapse [&_table]:my-3 [&_table]:w-full " +
                    "[&_td]:border [&_td]:border-ax-border-neutral-subtle [&_td]:p-2 [&_td]:align-top " +
                    "[&_th]:border [&_th]:border-ax-border-neutral-subtle [&_th]:p-2 [&_th]:align-top " +
                    "[&_th]:bg-ax-bg-neutral-soft [&_th]:text-left [&_th]:font-semibold " +
                    "[&_u]:underline [&_s]:line-through"
                  }
                />
              </Kort>
            </div>

            <div
              role="separator"
              aria-label="Endre bredde mellom editor og sidepanel"
              aria-orientation="vertical"
              aria-valuemin={MINSTE_EDITORBREDDE}
              aria-valuemax={STØRSTE_EDITORBREDDE}
              aria-valuenow={editorBredde}
              aria-valuetext={`Editoren bruker ${editorBredde} prosent av arbeidsflaten`}
              tabIndex={0}
              className="group hidden shrink-0 cursor-col-resize touch-none items-center justify-center px-1 bg-ax-bg-default focus:outline-none lg:flex"
              onKeyDown={håndterSkillelinjeTastatur}
              onPointerDown={håndterSkillelinjePekerNed}
              onPointerMove={håndterSkillelinjePekerFlytt}
              onPointerUp={(event) => event.currentTarget.releasePointerCapture(event.pointerId)}
            >
              {/* Vertikalt dratthåndtak – tre punkter, slik man kjenner igjen fra
              resizable paneler. Rent dekorativt; selve interaksjonen er på forelderen. */}
              <span
                aria-hidden
                className="flex flex-col gap-[3px] rounded-full bg-ax-bg-neutral-moderate px-[1px] py-[6px] group-hover:bg-ax-bg-accent-moderate group-focus:bg-ax-bg-accent-moderate"
              >
                <span className="h-1 w-1 rounded-full bg-ax-icon-neutral group-hover:bg-ax-icon-accent group-focus:bg-ax-icon-accent" />
                <span className="h-1 w-1 rounded-full bg-ax-icon-neutral group-hover:bg-ax-icon-accent group-focus:bg-ax-icon-accent" />
                <span className="h-1 w-1 rounded-full bg-ax-icon-neutral group-hover:bg-ax-icon-accent group-focus:bg-ax-icon-accent" />
              </span>
            </div>

            <Sidepanel
              aktivt={aktivtSidepanel}
              dokumentliste={dokumentliste}
              variabelInnhold={<VariabelListe onSettInn={settInnVariabel} disabled={!redigerbar} />}
              historikkInnhold={historikkInnhold ?? null}
              forhåndsvisningInnhold={
                erForhåndsvisningAktiv ? renderForhåndsvisning?.() : undefined
              }
              lagreStatus={lagreStatus}
            />
          </div>
        </div>
        <SettInnBildeModal
          åpen={bildeModalÅpen}
          sakId={sakId}
          lasterOpp={lasterOppBilde}
          feil={bildeFeil}
          onClose={() => settBildeModalÅpen(false)}
          onVelg={settInnBilde}
          onLastOpp={(filer) => {
            void håndterBildefiler(filer).then((ok) => {
              if (ok) settBildeModalÅpen(false);
            });
          }}
        />
      </Plate>
    </VariabelVerdierProvider>
  );
}
