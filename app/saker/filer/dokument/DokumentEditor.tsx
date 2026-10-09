import { Alert } from "@navikt/ds-react";
import { ImagePlugin } from "@platejs/media/react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent, PointerEvent, ReactNode } from "react";
import { useRevalidator } from "react-router";
import { Plate, PlateContent, usePlateEditor } from "platejs/react";
import type { TElement } from "platejs";
import { sporHendelse } from "~/analytics/analytics";
import { Kort } from "~/komponenter/Kort";
import type { DokumentInnhold, FilResponse } from "~/saker/filer/typer";
import { SettInnBildeModal } from "./SettInnBildeModal";
import { ElementKommentarHandling } from "./kommentarer/ElementKommentarHandling";
import { KommentarFlytendeMeny } from "./kommentarer/KommentarFlytendeMeny";
import { KommentarMarkeringProvider } from "./kommentarer/KommentarMarkering";
import { KommentarPanel } from "./kommentarer/KommentarPanel";
import { kommentarAnalytics } from "./kommentarer/kommentarer.analytics";
import { antallUloste } from "./kommentarer/sortering";
import type { Kommentarliste } from "./kommentarer/typer";
import { useKommentarer } from "./kommentarer/useKommentarer";
import { useKommentarforankring } from "./kommentarer/useKommentarforankring";
import {
  BildeOpplastingFeil,
  BILDE_FLYTT_MIMETYPE,
  byggBildeUrl,
  filtrerBildefiler,
  lastOppBilde,
} from "./bilde-opplasting";
import {
  Sidepanel,
  SidepanelMeny,
  STANDARD_SIDEPANEL,
  type SidepanelValg,
} from "./DokumentSidepanel";
import { VariabelVerdierProvider } from "./variabler/VariabelElement";
import { VariabelListe } from "./variabler/VariabelListe";
import { VARIABEL_FLYTT_MIMETYPE, VariabelPlugin } from "./variabler/VariabelPlugin";
import {
  STANDARD_VARIABLER,
  type VariabelId,
  type VariabelVerdier,
} from "./variabler/variabel-typer";
import { Verktøylinje } from "./Verktøylinje";
import { PLUGINS } from "./dokument-plugins";
import { useTilgjengeligHøyde } from "./useTilgjengeligHøyde";

function erOrdtegn(tegn: string | undefined) {
  return !!tegn && /[\p{L}\p{N}]/u.test(tegn);
}

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
  /**
   * Kommentarene hentet i loaderen, parallelt med dokument og historikk.
   * Wrapperen bærer backendens `kanKommentere` og `arkivert` – frontend regner
   * aldri ut kommenterbarhet selv. Kommentering er bevisst skilt fra
   * `redigerbar`: lesetilgang holder, også på låste dokumenter og avsluttede
   * saker. Arkiverte dokumenter kan derimot ikke muteres.
   */
  kommentarliste?: Kommentarliste;
  /** Om første innlasting av kommentarer feilet mens dokumentet fortsatt kunne vises. */
  kommentarinnlastingFeilet?: boolean;
  onLastKommentarerPåNytt?: () => void;
  /** URL til kommentar-BFF-en for dette dokumentet. */
  kommentarUrl?: string;
  /** Sidepanelet som skal være åpent ved første render (f.eks. fra query-parameter). */
  startSidepanel?: SidepanelValg;
  /** Kommentartråd som skal markeres og fokuseres ved første render. */
  startKommentartraadId?: string | null;
  /** Renderer innholdet for «Forhåndsvisning» i sidepanelet. Sendes inn som en funksjon
   * (ikke ferdig innhold) slik at f.eks. PDF-genereringen bare kjører mens fanen er
   * valgt, ikke ved hver render av siden. */
  renderForhåndsvisning?: () => ReactNode;
};

const MINSTE_EDITORBREDDE = 25;
const STØRSTE_EDITORBREDDE = 75;
/** Stabil referanse, slik at en manglende kommentarliste ikke gir nytt objekt hver render. */
const TOM_KOMMENTARLISTE: Kommentarliste = {
  dokumentId: "",
  arkivert: null,
  kanKommentere: false,
  traader: [],
};
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
  kommentarliste = TOM_KOMMENTARLISTE,
  kommentarinnlastingFeilet = false,
  onLastKommentarerPåNytt,
  kommentarUrl = "",
  startSidepanel,
  startKommentartraadId = null,
  renderForhåndsvisning,
}: DokumentEditorProps) {
  const editor = usePlateEditor({
    plugins: PLUGINS,
    value: startInnhold as TElement[],
  });
  const [aktivtSidepanel, settAktivtSidepanel] = useState<SidepanelValg>(
    startSidepanel ?? STANDARD_SIDEPANEL,
  );
  const erForhåndsvisningAktiv = aktivtSidepanel === "forhåndsvisning";
  const flateRef = useRef<HTMLDivElement>(null);
  const arkRef = useRef<HTMLDivElement>(null);
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

  const kommentarer = useKommentarer({ url: kommentarUrl, startListe: kommentarliste });
  // Backendfasit: kun arkiverte dokumenter blokkerer kommentering.
  const kanKommentere = kommentarer.kanKommentere;
  const arkivert = (kommentarliste.arkivert ?? null) !== null;
  const forankring = useKommentarforankring({
    editor,
    traader: kommentarer.traader,
    kanKommentere,
  });
  const antallUløsteKommentarer = antallUloste(kommentarer.traader);

  /** Panelet skal alltid være synlig når man begynner å kommentere. */
  const åpneKommentarpanel = useCallback(
    (kilde: Parameters<typeof kommentarAnalytics.panelÅpnet>[0]) => {
      settAktivtSidepanel((gjeldende) => {
        if (gjeldende !== "kommentarer") kommentarAnalytics.panelÅpnet(kilde);
        return "kommentarer";
      });
    },
    [],
  );

  useEffect(() => {
    if (startSidepanel) settAktivtSidepanel(startSidepanel);
  }, [startSidepanel]);

  // Synkroniser dyplenker også når søkeparametrene endres på en allerede montert
  // dokumentrute. Editoren remountes ikke, så ulagrede dokumentendringer beholdes.
  const sistValgteDyplenke = useRef<string | null>(null);
  useEffect(() => {
    if (!startKommentartraadId) {
      sistValgteDyplenke.current = null;
      return;
    }
    if (sistValgteDyplenke.current === startKommentartraadId) return;
    if (!kommentarer.traader.some((traad) => traad.id === startKommentartraadId)) return;
    sistValgteDyplenke.current = startKommentartraadId;
    settAktivtSidepanel("kommentarer");
    forankring.velgTraad(startKommentartraadId);
    kommentarAnalytics.ankernavigasjon("DOCUMENT", "til_traad");
  }, [forankring, kommentarer.traader, startKommentartraadId]);

  // Cmd/Ctrl + Shift + M kommenterer markeringen, eller blokken skrivemerket står i.
  const håndterSnarvei = forankring.håndterSnarvei;
  useEffect(() => {
    if (!kanKommentere) return;
    function lytter(event: globalThis.KeyboardEvent) {
      const før = event.defaultPrevented;
      håndterSnarvei(event);
      if (!før && event.defaultPrevented) åpneKommentarpanel("tastatursnarvei");
    }
    document.addEventListener("keydown", lytter);
    return () => document.removeEventListener("keydown", lytter);
  }, [håndterSnarvei, kanKommentere, åpneKommentarpanel]);

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
      <KommentarMarkeringProvider
        aktivTraadId={forankring.aktivTraadId}
        onVelgTraad={(traadId) => {
          forankring.velgTraad(traadId);
          åpneKommentarpanel("markering");
          kommentarAnalytics.ankernavigasjon("TEXT", "til_traad");
        }}
      >
        <Plate
          editor={editor}
          readOnly={!redigerbar}
          onChange={({ value }) => {
            onEndring(value as DokumentInnhold);
            forankring.registrerDokumentendring();
          }}
        >
          {/* Editorflaten fyller resten av vinduet og scroller selv, slik at verktøylinja og
      sidepanelet står stille mens man jobber i et langt dokument. */}
          <div
            ref={flateRef}
            style={høyde ? { height: høyde } : undefined}
            className="flex flex-col gap-[var(--ax-space-12)] overflow-hidden"
          >
            {redigerbar ? (
              <div className="px-[var(--ax-space-16)] lg:px-[var(--ax-space-24)]">
                <Verktøylinje
                  onFormater={(format) =>
                    sporHendelse("dokument formatert", { sakId, docId, format })
                  }
                  aktivtSidepanel={aktivtSidepanel}
                  onVelgSidepanel={settAktivtSidepanel}
                  antallKommentarer={antallUløsteKommentarer}
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
            ) : (
              // Uten skrivetilgang finnes ingen verktøylinje, men man skal likevel
              // kunne bytte sidepanel – blant annet for å lese og skrive kommentarer.
              <div className="flex justify-end px-[var(--ax-space-16)] lg:px-[var(--ax-space-24)]">
                <SidepanelMeny
                  aktivt={aktivtSidepanel}
                  onVelg={settAktivtSidepanel}
                  antallKommentarer={antallUløsteKommentarer}
                />
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
                ref={arkRef}
                // Flaten scroller selv, og må derfor kunne få tastaturfokus (WCAG 2.1.1).
                tabIndex={0}
                className={
                  "relative ml-[var(--ax-space-16)] flex min-w-0 flex-1 justify-center overflow-y-auto rounded-lg " +
                  "bg-ax-bg-neutral-moderate px-[var(--ax-space-16)] py-[var(--ax-space-32)] " +
                  "lg:ml-[var(--ax-space-24)] lg:px-[var(--ax-space-48)] " +
                  "lg:shrink-0 lg:flex-none lg:basis-[var(--editor-bredde)]"
                }
                onMouseOver={
                  kanKommentere
                    ? (event) => forankring.oppdaterAktivtElementFraDom(event.target)
                    : undefined
                }
                onFocusCapture={
                  kanKommentere
                    ? (event) => {
                        if (
                          event.target instanceof Element &&
                          event.target.closest("[data-element-kommentar-handling]")
                        ) {
                          return;
                        }
                        forankring.oppdaterAktivtElementFraDom(event.target);
                      }
                    : undefined
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
                    onKeyUp={
                      kanKommentere
                        ? (event) => forankring.oppdaterAktivtElementFraDom(event.target)
                        : undefined
                    }
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

                <KommentarFlytendeMeny
                  beholderRef={arkRef}
                  aktiv={kanKommentere}
                  onKommenter={() => {
                    if (forankring.startTekstutkast("tekstmarkering")) {
                      åpneKommentarpanel("tekstmarkering");
                    }
                  }}
                />
                <ElementKommentarHandling
                  beholderRef={arkRef}
                  aktivt={forankring.aktivtElement}
                  aktiv={kanKommentere}
                  onKommenter={(element) => {
                    if (forankring.startElementutkast(element, "element")) {
                      åpneKommentarpanel("element");
                    }
                  }}
                />
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
                variabelInnhold={
                  <VariabelListe onSettInn={settInnVariabel} disabled={!redigerbar} />
                }
                historikkInnhold={historikkInnhold ?? null}
                kommentarInnhold={
                  <KommentarPanel
                    traader={kommentarer.traader}
                    treffPerTraad={forankring.treffPerTraad}
                    aktivTraadId={forankring.aktivTraadId}
                    kanKommentere={kanKommentere}
                    arkivert={arkivert}
                    innlastingFeilet={kommentarinnlastingFeilet}
                    onLastPåNytt={onLastKommentarerPåNytt}
                    sender={kommentarer.sender}
                    utkast={forankring.utkast}
                    handlinger={kommentarer}
                    onStartGenereltUtkast={() => forankring.startGenereltUtkast("panel")}
                    onAvbrytUtkast={forankring.avbrytUtkast}
                    onVelgTraad={forankring.velgTraad}
                    onGåTilAnker={forankring.gåTilAnker}
                  />
                }
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
      </KommentarMarkeringProvider>
    </VariabelVerdierProvider>
  );
}
