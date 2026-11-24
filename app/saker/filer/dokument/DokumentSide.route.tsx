import { ArrowLeftIcon, TrashIcon } from "@navikt/aksel-icons";
import { Button, Detail, HStack, VStack } from "@navikt/ds-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  isRouteErrorResponse,
  Link as RouterLink,
  useLoaderData,
  useParams,
  useRevalidator,
  useSearchParams,
} from "react-router";
import { DokumentIkkeFunnet } from "~/feilhåndtering/DokumentIkkeFunnet";
import { Feilmelding } from "~/feilhåndtering/Feilmelding";
import { INNSENDINGSFEIL } from "~/feilhåndtering/feilmeldinger";
import { hentTekniskFeilId } from "./lagringsfeil";
import { finnEnhetsnavn } from "~/kodeverk/enheter";
import { useKodeverk } from "~/kodeverk/useKodeverk";
import { MiljøtilpassetTittel } from "~/layout/MiljøtilpassetTittel";
import { RouteConfig } from "~/routeConfig";
import { DokumentTre } from "~/saker/filer/DokumentTre";
import type { Dokument, DokumentHistorikk, DokumentInnhold } from "~/saker/filer/typer";
import { formaterRelativTid } from "~/utils/date-utils";
import { DokumentEditor } from "./DokumentEditor";
import type { SidepanelValg } from "./DokumentSidepanel";
import {
  KOMMENTARTRAAD_QUERY,
  KOMMENTAR_SIDEPANEL_VERDI,
  SIDEPANEL_QUERY,
} from "./kommentarer/lenker";
import { PdfForhåndsvisning } from "./PdfForhåndsvisning";
import { DokumentHistorikkPanel } from "./DokumentHistorikkPanel";
import { DokumentTittel } from "./DokumentTittel";
import { action, loader } from "./DokumentSide.server";
import { SlettDokumentModal } from "./SlettDokumentModal";
import { useAutolagring, type Autolagringsdata, type LagreStatus } from "./useAutolagring";
import { useDokumentSletting } from "./useDokumentSletting";

export { action, loader };

/** Editoren skal bruke hele flaten og er en arbeidsflate uten behov for footer, så
 * layouten dropper bredde-begrensningen og footeren her. */
export const handle = { fullbredde: true, skjulFooter: true };

function LagreStatusVisning({
  status,
  sistLagret,
}: {
  status: LagreStatus;
  sistLagret: Date | null;
}) {
  // Oppdater jevnlig så den relative tiden («for noen sekunder siden») holder seg fersk
  // mens dokumentet ligger åpent uten endringer.
  const [nå, setNå] = useState(() => Date.now());
  useEffect(() => {
    setNå(Date.now());
    const id = setInterval(() => setNå(Date.now()), 5_000);
    return () => clearInterval(id);
  }, [sistLagret]);

  const tekst =
    status === "lagrer"
      ? "Lagrer…"
      : status === "endret"
        ? "Ulagrede endringer"
        : status === "feil"
          ? "Kunne ikke lagre – endringene er beholdt"
          : sistLagret
            ? `Lagret ${formaterRelativTid(sistLagret, new Date(nå))}`
            : "Lagret";

  return (
    <Detail
      aria-live="polite"
      className={status === "feil" ? "text-ax-text-danger" : "text-ax-text-neutral-subtle"}
    >
      {tekst}
    </Detail>
  );
}

type LoaderData = Awaited<ReturnType<typeof loader>>;

function DokumentRedigering({
  dokument,
  dokumenter,
  mapper = [],
  dokumentHistorikk = [],
  kommentarliste,
  kommentarinnlastingFeilet,
  sakReferanse,
  kanRedigere,
  kanEndreMapper,
  kanFlytteDokumenter,
  variabelVerdier,
  erDemo,
  startSidepanel,
  startKommentartraadId,
}: {
  dokument: LoaderData["dokument"];
  dokumenter: LoaderData["dokumenter"];
  mapper?: string[];
  dokumentHistorikk: LoaderData["dokumentHistorikk"];
  kommentarliste: LoaderData["kommentarliste"];
  kommentarinnlastingFeilet: LoaderData["kommentarinnlastingFeilet"];
  sakReferanse: string;
  kanRedigere: boolean;
  kanEndreMapper?: boolean;
  kanFlytteDokumenter?: boolean;
  variabelVerdier: LoaderData["variabelVerdier"];
  erDemo: boolean;
  startSidepanel?: SidepanelValg;
  startKommentartraadId: string | null;
}) {
  const [tittel, setTittel] = useState(dokument.tittel);
  const tittelRef = useRef(dokument.tittel);
  const innholdRef = useRef<DokumentInnhold>(dokument.innhold);
  const historikkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maksHistorikkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const historikkData = useRef<Autolagringsdata | null>(null);
  const [editorVersjon, settEditorVersjon] = useState(0);
  const [historikkFeil, settHistorikkFeil] = useState<string | null>(null);
  // Satt når siste lagring feilet. feilId finnes bare når serveren svarte med teknisk feil.
  const [lagringsfeil, settLagringsfeil] = useState<{ feilId?: string } | null>(null);
  const revalidator = useRevalidator();
  const revalidatorRef = useRef(revalidator);
  // Innhold fra serveren som skal vises i editoren etter at fanen fikk fokus igjen.
  const [eksterntInnhold, settEksterntInnhold] = useState<{
    versjon: number;
    innhold: DokumentInnhold;
  } | null>(null);
  // Settes til lokal endringsversjon når en fokushenting starter. Avvises svaret hvis
  // brukeren har endret noe siden, så et eldre svar aldri overskriver nyere lokalt arbeid.
  const fokusHentingVersjon = useRef<number | null>(null);
  const lokalEndringsversjon = useRef(0);
  const pågåendeHistorikk = useRef<Promise<void> | null>(null);
  const historikkUtsatt = useRef(false);
  const [pdfOppdateringssignal, settPdfOppdateringssignal] = useState(0);
  // Innholdet vi nettopp har skrevet inn i editoren utenfra. Editoren melder det tilbake som
  // en endring, og det skal ikke lagres på nytt (det ville oppdatert endretDato for ingenting).
  const ignorerInnhold = useRef<string | null>(null);

  useEffect(() => {
    revalidatorRef.current = revalidator;
  }, [revalidator]);

  const sakUrl = RouteConfig.SAKER_DETALJ.replace(":sakId", sakReferanse);
  const sletting = useDokumentSletting({
    sakId: sakReferanse,
    kilde: "dokumentside",
    // Etter sletting finnes ikke dokumentet lenger – redirect til saken via action-en,
    // slik at den døde dokument-loaderen ikke revalideres (som ville gitt 404).
    redirectTo: () => sakUrl,
  });

  const lagreUrl = RouteConfig.API.SAK_DOKUMENT_LAGRE.replace(":sakId", sakReferanse).replace(
    ":docId",
    dokument.id,
  );
  const historikkUrl = RouteConfig.API.SAK_DOKUMENT_HISTORIKK.replace(
    ":sakId",
    sakReferanse,
  ).replace(":docId", dokument.id);
  const pdfForhåndsvisningUrl = RouteConfig.API.PDF_FORHÅNDSVISNING.replace(
    ":sakId",
    sakReferanse,
  ).replace(":docId", dokument.id);
  const kommentarUrl = RouteConfig.API.SAK_DOKUMENT_KOMMENTARER.replace(
    ":sakId",
    sakReferanse,
  ).replace(":docId", dokument.id);

  const lagre = useCallback(
    async (data: Autolagringsdata, { forlater }: { forlater: boolean }) => {
      let respons: Response;
      try {
        respons = await fetch(lagreUrl, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
          // `keepalive` brukes kun ved navigasjon/lukking, slik at kallet rekker ut selv
          // om siden rives ned. Det har en 64 KB body-grense, så vanlige (debouncede)
          // lagringer bruker vanlig fetch – ellers kunne store dokumenter (f.eks. tabeller)
          // feile lagringen.
          keepalive: forlater,
        });
      } catch (feil) {
        // Nettverksbrudd: fetch avviser før serveren svarer, så det finnes ingen feil-ID.
        settLagringsfeil({});
        throw feil;
      }
      if (!respons.ok) {
        settLagringsfeil({ feilId: await hentTekniskFeilId(respons) });
        throw new Error("Lagring feilet");
      }
      settLagringsfeil(null);
    },
    [lagreUrl],
  );

  const { status, sistLagret, registrerEndring, prøvIgjen } = useAutolagring({ lagre });
  const statusRef = useRef(status);
  statusRef.current = status;

  const lagreHistorikkpunkt = useCallback(
    async (forlater = false) => {
      const data = historikkData.current;
      if (!data) return;
      // Pauset mens dokumentet hentes på nytt etter fokus. Dataene beholdes, og skrives
      // først når hentingen er ferdig og vi vet om de fortsatt er gyldige.
      if (fokusHentingVersjon.current !== null) {
        historikkUtsatt.current = true;
        return;
      }
      if (historikkTimer.current) clearTimeout(historikkTimer.current);
      if (maksHistorikkTimer.current) clearTimeout(maksHistorikkTimer.current);
      historikkTimer.current = null;
      maksHistorikkTimer.current = null;
      historikkData.current = null;

      const kall = (async () => {
        try {
          const respons = await fetch(lagreUrl, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...data, opprettHistorikk: true }),
            keepalive: forlater,
          });
          if (!respons.ok) {
            if (!forlater) settHistorikkFeil("Kunne ikke opprette historikkpunkt.");
            return;
          }
          if (!forlater) {
            settHistorikkFeil(null);
            revalidatorRef.current.revalidate();
          }
        } catch {
          if (!forlater) settHistorikkFeil("Kunne ikke opprette historikkpunkt.");
        }
      })();
      pågåendeHistorikk.current = kall;
      await kall;
      if (pågåendeHistorikk.current === kall) pågåendeHistorikk.current = null;
    },
    [lagreUrl],
  );

  const registrerHistorikk = useCallback(
    (data: Autolagringsdata) => {
      historikkData.current = data;
      if (historikkTimer.current) clearTimeout(historikkTimer.current);
      historikkTimer.current = setTimeout(() => {
        void lagreHistorikkpunkt();
      }, 30_000);
      if (!maksHistorikkTimer.current) {
        maksHistorikkTimer.current = setTimeout(() => {
          void lagreHistorikkpunkt();
        }, 15 * 60_000);
      }
    },
    [lagreHistorikkpunkt],
  );

  useEffect(
    () => () => {
      void lagreHistorikkpunkt(true);
    },
    [lagreHistorikkpunkt],
  );

  useEffect(() => {
    function håndterLukking() {
      void lagreHistorikkpunkt(true);
    }
    window.addEventListener("beforeunload", håndterLukking);
    return () => window.removeEventListener("beforeunload", håndterLukking);
  }, [lagreHistorikkpunkt]);

  // Samme dokument kan stå åpent i flere faner. Når fanen får fokus igjen henter vi
  // dokumentet på nytt, slik at man ikke skriver videre på en utdatert versjon og
  // overskriver det som er gjort i den andre fanen. Har fanen ulagrede endringer
  // (eller en lagring som feilet) lar vi være, for å ikke kaste dem.
  // Mens hentingen pågår er historikkskriving satt på pause (se `lagreHistorikkpunkt`),
  // fordi et historikkpunkt sender hele dokumentet og ville overskrevet det vi henter.
  useEffect(() => {
    async function henting() {
      if (document.visibilityState !== "visible") return;
      if (statusRef.current !== "lagret") return;
      if (fokusHentingVersjon.current !== null) return;
      fokusHentingVersjon.current = lokalEndringsversjon.current;
      // Et historikkpunkt som allerede er sendt må bli ferdig før vi leser serverversjonen.
      await pågåendeHistorikk.current;
      revalidatorRef.current.revalidate();
    }
    document.addEventListener("visibilitychange", henting);
    window.addEventListener("focus", henting);
    return () => {
      document.removeEventListener("visibilitychange", henting);
      window.removeEventListener("focus", henting);
    };
  }, []);

  const revalidatorState = revalidator.state;
  useEffect(() => {
    const hentetVedVersjon = fokusHentingVersjon.current;
    if (hentetVedVersjon === null || revalidatorState !== "idle") return;
    fokusHentingVersjon.current = null;

    // Brukeren kan ha endret noe mens hentingen pågikk, selv om autolagringen har rukket å
    // bli ferdig. Da er svaret utdatert, og det lokale vinner.
    const utdatert =
      statusRef.current !== "lagret" || hentetVedVersjon !== lokalEndringsversjon.current;
    const innholdEndret =
      !utdatert && JSON.stringify(dokument.innhold) !== JSON.stringify(innholdRef.current);
    const tittelEndret = !utdatert && dokument.tittel !== tittelRef.current;

    if (innholdEndret || tittelEndret) {
      // Ventende historikkpunkt inneholder den gamle versjonen. Sendes den senere, overskriver
      // den det vi nå har hentet fra serveren.
      historikkData.current = null;
      historikkUtsatt.current = false;
      if (historikkTimer.current) clearTimeout(historikkTimer.current);
      if (maksHistorikkTimer.current) clearTimeout(maksHistorikkTimer.current);
      historikkTimer.current = null;
      maksHistorikkTimer.current = null;

      if (tittelEndret) {
        setTittel(dokument.tittel);
        tittelRef.current = dokument.tittel;
      }
      if (innholdEndret) {
        innholdRef.current = dokument.innhold;
        ignorerInnhold.current = JSON.stringify(dokument.innhold);
        settEksterntInnhold((forrige) => ({
          versjon: (forrige?.versjon ?? 0) + 1,
          innhold: dokument.innhold,
        }));
      }
      settPdfOppdateringssignal((signal) => signal + 1);
      return;
    }

    // Ingen ny serverversjon (eller svaret ble avvist): historikkpunktet som ble utsatt
    // under hentingen skal fortsatt lagres.
    if (historikkUtsatt.current) {
      historikkUtsatt.current = false;
      void lagreHistorikkpunkt();
    }
  }, [dokument, revalidatorState, lagreHistorikkpunkt]);

  const håndterTittel = useCallback(
    (nyTittel: string) => {
      // Skrivebeskyttet (avsluttet sak eller arkivert dokument): ingen lagring.
      if (!kanRedigere) return;
      lokalEndringsversjon.current += 1;
      setTittel(nyTittel);
      tittelRef.current = nyTittel;
      registrerEndring({ tittel: nyTittel, innhold: innholdRef.current });
      registrerHistorikk({ tittel: nyTittel, innhold: innholdRef.current });
    },
    [kanRedigere, registrerEndring, registrerHistorikk],
  );

  const håndterInnhold = useCallback(
    (innhold: DokumentInnhold) => {
      if (ignorerInnhold.current !== null) {
        const ventet = ignorerInnhold.current;
        ignorerInnhold.current = null;
        if (JSON.stringify(innhold) === ventet) return;
      }
      // Plate kaller onChange også ved ren markeringsendring, og da er innholdet det samme
      // objektet. Det er ingen endring å lagre, og den skal ikke regnes som lokalt arbeid.
      if (innhold === innholdRef.current) return;
      innholdRef.current = innhold;
      // Plate kaller onChange også ved markering i skrivebeskyttet modus. Det skal ikke lagres.
      if (!kanRedigere) return;
      lokalEndringsversjon.current += 1;
      registrerEndring({ tittel: tittelRef.current, innhold });
      registrerHistorikk({ tittel: tittelRef.current, innhold });
    },
    [kanRedigere, registrerEndring, registrerHistorikk],
  );

  const historikkKall = useCallback(
    async (handling: "hent_historikkpunkt" | "gjenopprett_historikkpunkt", historikkId: string) => {
      const respons = await fetch(historikkUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handling, historikkId }),
      });
      if (!respons.ok) throw new Error("Historikkallet feilet");
      return (await respons.json()) as { historikkpunkt?: DokumentHistorikk; dokument?: Dokument };
    },
    [historikkUrl],
  );

  const håndterGjenopprettet = useCallback(
    (gjenopprettet: Dokument) => {
      lokalEndringsversjon.current += 1;
      setTittel(gjenopprettet.tittel);
      tittelRef.current = gjenopprettet.tittel;
      innholdRef.current = gjenopprettet.innhold;
      settEditorVersjon((versjon) => versjon + 1);
      revalidator.revalidate();
    },
    [revalidator],
  );

  return (
    <>
      <MiljøtilpassetTittel>
        {`${tittel || "Uten tittel"} – Sak ${sakReferanse} – Watson Sak`}
      </MiljøtilpassetTittel>
      <VStack
        gap="space-8"
        className="mt-4 mb-4 px-[var(--ax-space-16)] lg:px-[var(--ax-space-24)]"
      >
        <Button
          as={RouterLink}
          to={sakUrl}
          role="link"
          variant="tertiary"
          size="small"
          icon={<ArrowLeftIcon aria-hidden />}
          className="self-start"
        >
          Tilbake til sak {sakReferanse}
        </Button>

        <HStack justify="space-between" align="center" gap="space-4" wrap>
          <div className="min-w-0 flex-1">
            <DokumentTittel tittel={tittel} redigerbar={kanRedigere} onEndre={håndterTittel} />
          </div>

          <HStack gap="space-2" align="center" wrap>
            {kanRedigere && (
              <Button
                type="button"
                variant="tertiary"
                data-color="danger"
                size="small"
                icon={<TrashIcon aria-hidden />}
                onClick={() => sletting.start({ id: dokument.id, tittel })}
              >
                Slett
              </Button>
            )}
          </HStack>
        </HStack>
      </VStack>

      <DokumentEditor
        key={editorVersjon}
        startInnhold={innholdRef.current}
        eksterntInnhold={eksterntInnhold}
        redigerbar={kanRedigere}
        onEndring={håndterInnhold}
        sakId={sakReferanse}
        variabelVerdier={variabelVerdier}
        kommentarliste={kommentarliste}
        kommentarinnlastingFeilet={kommentarinnlastingFeilet}
        onLastKommentarerPåNytt={() => revalidator.revalidate()}
        kommentarUrl={kommentarUrl}
        startSidepanel={startSidepanel}
        startKommentartraadId={startKommentartraadId}
        dokumentliste={
          dokumenter.length > 0 ? (
            <DokumentTre
              noder={dokumenter}
              mapper={mapper}
              sakId={sakReferanse}
              kanEndreMapper={kanEndreMapper ?? false}
              kanFlytteDokumenter={kanFlytteDokumenter ?? false}
              redigerbar={kanRedigere}
              fremhevetId={dokument.id}
              kompakt
              redirectVedSletting={(docId) => (docId === dokument.id ? sakUrl : undefined)}
            />
          ) : (
            <Detail className="text-ax-text-neutral-subtle">Ingen andre dokumenter.</Detail>
          )
        }
        historikkInnhold={
          <>
            <DokumentHistorikkPanel
              historikk={dokumentHistorikk}
              kanGjenopprette={kanRedigere}
              hentHistorikkpunkt={async (historikkId) => {
                const resultat = await historikkKall("hent_historikkpunkt", historikkId);
                if (!resultat.historikkpunkt) throw new Error("Historikkpunkt mangler i svaret");
                return resultat.historikkpunkt;
              }}
              gjenopprett={async (historikkId) => {
                const resultat = await historikkKall("gjenopprett_historikkpunkt", historikkId);
                if (!resultat.dokument) throw new Error("Dokument mangler i svaret");
                return resultat.dokument;
              }}
              onGjenopprettet={håndterGjenopprettet}
            />
            {historikkFeil && <Detail className="text-ax-text-danger">{historikkFeil}</Detail>}
          </>
        }
        lagreStatus={
          <VStack gap="space-4">
            <LagreStatusVisning status={status} sistLagret={sistLagret} />
            {lagringsfeil && (
              <Feilmelding
                tittel={INNSENDINGSFEIL.lagreDokument.tittel}
                feilId={lagringsfeil.feilId}
                onPrøvIgjen={prøvIgjen}
              >
                {INNSENDINGSFEIL.lagreDokument.tekst}
              </Feilmelding>
            )}
          </VStack>
        }
        renderForhåndsvisning={() => (
          <PdfForhåndsvisning
            url={pdfForhåndsvisningUrl}
            sistLagret={sistLagret}
            erDemo={erDemo}
            oppdateringssignal={pdfOppdateringssignal}
          />
        )}
      />

      <SlettDokumentModal
        kandidat={sletting.kandidat}
        sletter={sletting.sletter}
        onBekreft={sletting.bekreft}
        onAvbryt={sletting.avbryt}
        feil={sletting.feil}
      />
    </>
  );
}

export default function DokumentSide() {
  const {
    dokument,
    dokumenter,
    mapper,
    dokumentHistorikk,
    kommentarliste,
    kommentarinnlastingFeilet,
    sakReferanse,
    kanRedigere,
    kanEndreMapper,
    kanFlytteDokumenter,
    variabelVerdier,
    miljø,
  } = useLoaderData<typeof loader>();
  const kodeverk = useKodeverk();
  const [søkeparametre] = useSearchParams();

  // Dyplenker fra sakshistorikk og varsler kan be om kommentarpanelet og en
  // bestemt tråd: ?sidepanel=kommentarer&kommentartraad=<uuid>
  const ønsketSidepanel = søkeparametre.get(SIDEPANEL_QUERY);
  const startSidepanel =
    ønsketSidepanel === KOMMENTAR_SIDEPANEL_VERDI ? ("kommentarer" as const) : undefined;
  const startKommentartraadId = søkeparametre.get(KOMMENTARTRAAD_QUERY);

  // Saken lagrer enhetskoden, men i dokumentteksten skal «avdeling» vise enhetsnavnet.
  const variablerTilVisning = useMemo(
    () => ({
      ...variabelVerdier,
      avdeling: variabelVerdier.avdeling
        ? finnEnhetsnavn(kodeverk.enheter, variabelVerdier.avdeling)
        : variabelVerdier.avdeling,
    }),
    [variabelVerdier, kodeverk.enheter],
  );

  // `key` på dokument-id sørger for at all lokal redigeringstilstand (tittel, innhold,
  // editor-instans og autolagring) nullstilles når man navigerer til et annet dokument
  // på samme route.
  return (
    <DokumentRedigering
      key={dokument.id}
      dokument={dokument}
      dokumenter={dokumenter}
      mapper={mapper}
      dokumentHistorikk={dokumentHistorikk}
      kommentarliste={kommentarliste}
      kommentarinnlastingFeilet={kommentarinnlastingFeilet}
      sakReferanse={sakReferanse}
      kanRedigere={kanRedigere}
      kanEndreMapper={kanEndreMapper}
      kanFlytteDokumenter={kanFlytteDokumenter}
      variabelVerdier={variablerTilVisning}
      erDemo={miljø === "demo"}
      startSidepanel={startSidepanel}
      startKommentartraadId={startKommentartraadId}
    />
  );
}

export function ErrorBoundary({ error }: { error: unknown }) {
  const { sakId } = useParams();
  if (
    isRouteErrorResponse(error) &&
    error.status === 404 &&
    error.data === "Dokument ikke funnet"
  ) {
    return <DokumentIkkeFunnet sakId={sakId} />;
  }
  throw error;
}
