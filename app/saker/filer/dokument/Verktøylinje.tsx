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
import { ActionMenu, Button, HStack, Loader, Select, Tooltip } from "@navikt/ds-react";
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
import { TablePlugin } from "@platejs/table/react";
import { indent, outdent } from "@platejs/indent";
import { useCallback, useContext, useRef, useState, createContext } from "react";
import { useEditorState } from "platejs/react";
import type { VariabelId } from "./variabler/variabel-typer";
import { STANDARD_VARIABLER } from "./variabler/variabel-typer";
import { SidepanelMeny } from "./DokumentSidepanel";
import type { SidepanelValg } from "./DokumentSidepanel";
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

export function Verktøylinje({
  onFormater,
  aktivtSidepanel,
  onVelgSidepanel,
  antallKommentarer,
  lasterOppBilde,
  onÅpneBildeModal,
  onSettInnVariabel,
}: {
  onFormater: (etikett: string) => void;
  aktivtSidepanel: SidepanelValg;
  onVelgSidepanel: (valg: SidepanelValg) => void;
  antallKommentarer: number;
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
                <Tooltip content="Sett inn variabel">
                  <ActionMenu.Trigger>
                    <Button
                      type="button"
                      size="small"
                      variant="tertiary"
                      aria-label="Sett inn variabel"
                      icon={<TagIcon aria-hidden />}
                    />
                  </ActionMenu.Trigger>
                </Tooltip>
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

            <SidepanelMeny
              aktivt={aktivtSidepanel}
              onVelg={onVelgSidepanel}
              antallKommentarer={antallKommentarer}
            />
          </HStack>
        </SettAktivEtikettContext.Provider>
      </AktivEtikettContext.Provider>
    </FormaterContext.Provider>
  );
}
