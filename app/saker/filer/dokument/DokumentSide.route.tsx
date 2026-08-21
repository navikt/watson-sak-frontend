import { PaperplaneIcon, TrashIcon } from "@navikt/aksel-icons";
import { Button, Detail, HStack, VStack } from "@navikt/ds-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { isRouteErrorResponse, useLoaderData, useParams, useRevalidator } from "react-router";
import { Brødsmulesti } from "~/komponenter/Brødsmulesti";
import { DokumentIkkeFunnet } from "~/feilhåndtering/DokumentIkkeFunnet";
import { MiljøtilpassetTittel } from "~/layout/MiljøtilpassetTittel";
import { RouteConfig } from "~/routeConfig";
import { DokumentTre } from "~/saker/filer/DokumentTre";
import type { Dokument, DokumentHistorikk, DokumentInnhold } from "~/saker/filer/typer";
import { formaterRelativTid } from "~/utils/date-utils";
import { DokumentEditor } from "./DokumentEditor";
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
  dokumentHistorikk = [],
  sakReferanse,
  kanRedigere,
  variabelVerdier,
}: {
  dokument: LoaderData["dokument"];
  dokumenter: LoaderData["dokumenter"];
  dokumentHistorikk: LoaderData["dokumentHistorikk"];
  sakReferanse: string;
  kanRedigere: boolean;
  variabelVerdier: LoaderData["variabelVerdier"];
}) {
  const [tittel, setTittel] = useState(dokument.tittel);
  const tittelRef = useRef(dokument.tittel);
  const innholdRef = useRef<DokumentInnhold>(dokument.innhold);
  const historikkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maksHistorikkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const historikkData = useRef<Autolagringsdata | null>(null);
  const [editorVersjon, settEditorVersjon] = useState(0);
  const [historikkFeil, settHistorikkFeil] = useState<string | null>(null);
  const revalidator = useRevalidator();
  const revalidatorRef = useRef(revalidator);

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

  const lagreUrl = RouteConfig.SAKER_DOKUMENT.replace(":sakId", sakReferanse).replace(
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

  const lagre = useCallback(
    async (data: Autolagringsdata, { forlater }: { forlater: boolean }) => {
      const respons = await fetch(lagreUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        // `keepalive` brukes kun ved navigasjon/lukking, slik at kallet rekker ut selv
        // om siden rives ned. Det har en 64 KB body-grense, så vanlige (debouncede)
        // lagringer bruker vanlig fetch – ellers kunne store dokumenter (f.eks. tabeller)
        // feile lagringen.
        keepalive: forlater,
      });
      if (!respons.ok) {
        throw new Error("Lagring feilet");
      }
    },
    [lagreUrl],
  );

  const { status, sistLagret, registrerEndring } = useAutolagring({ lagre });

  const lagreHistorikkpunkt = useCallback(
    async (forlater = false) => {
      const data = historikkData.current;
      if (!data) return;
      if (historikkTimer.current) clearTimeout(historikkTimer.current);
      if (maksHistorikkTimer.current) clearTimeout(maksHistorikkTimer.current);
      historikkTimer.current = null;
      maksHistorikkTimer.current = null;
      historikkData.current = null;

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

  const håndterTittel = useCallback(
    (nyTittel: string) => {
      setTittel(nyTittel);
      tittelRef.current = nyTittel;
      registrerEndring({ tittel: nyTittel, innhold: innholdRef.current });
      registrerHistorikk({ tittel: nyTittel, innhold: innholdRef.current });
    },
    [registrerEndring, registrerHistorikk],
  );

  const håndterInnhold = useCallback(
    (innhold: DokumentInnhold) => {
      innholdRef.current = innhold;
      registrerEndring({ tittel: tittelRef.current, innhold });
      registrerHistorikk({ tittel: tittelRef.current, innhold });
    },
    [registrerEndring, registrerHistorikk],
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
        <Brødsmulesti
          smuler={[
            { etikett: `Sak #${sakReferanse}`, til: sakUrl },
            { etikett: "Dokumenter" },
            { etikett: tittel || "Uten tittel" },
          ]}
        />

        <HStack justify="space-between" align="center" gap="space-4" wrap>
          <div className="min-w-0 flex-1">
            <DokumentTittel tittel={tittel} redigerbar={kanRedigere} onEndre={håndterTittel} />
          </div>

          <HStack gap="space-2" align="center" wrap>
            {/* Medunderskriving er ikke bygget ennå – knappen er med for å vise plasseringen
            fra skissen, og er deaktivert til flyten finnes. */}
            {kanRedigere && (
              <Button
                type="button"
                variant="secondary"
                size="small"
                disabled
                icon={<PaperplaneIcon aria-hidden />}
              >
                Send til medunderskriver
              </Button>
            )}

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
        redigerbar={kanRedigere}
        onEndring={håndterInnhold}
        sakId={sakReferanse}
        docId={dokument.id}
        variabelVerdier={variabelVerdier}
        dokumentliste={
          dokumenter.length > 0 ? (
            <DokumentTre
              noder={dokumenter}
              sakId={sakReferanse}
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
        lagreStatus={<LagreStatusVisning status={status} sistLagret={sistLagret} />}
        renderForhåndsvisning={() => (
          <PdfForhåndsvisning url={pdfForhåndsvisningUrl} sistLagret={sistLagret} />
        )}
      />

      <SlettDokumentModal
        kandidat={sletting.kandidat}
        sletter={sletting.sletter}
        onBekreft={sletting.bekreft}
        onAvbryt={sletting.avbryt}
      />
    </>
  );
}

export default function DokumentSide() {
  const { dokument, dokumenter, dokumentHistorikk, sakReferanse, kanRedigere, variabelVerdier } =
    useLoaderData<typeof loader>();

  // `key` på dokument-id sørger for at all lokal redigeringstilstand (tittel, innhold,
  // editor-instans og autolagring) nullstilles når man navigerer til et annet dokument
  // på samme route.
  return (
    <DokumentRedigering
      key={dokument.id}
      dokument={dokument}
      dokumenter={dokumenter}
      dokumentHistorikk={dokumentHistorikk}
      sakReferanse={sakReferanse}
      kanRedigere={kanRedigere}
      variabelVerdier={variabelVerdier}
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
