import { ArrowLeftIcon, FilesIcon, TrashIcon } from "@navikt/aksel-icons";
import { Button, Detail, Dialog, Heading, HStack, VStack } from "@navikt/ds-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLoaderData, useNavigate } from "react-router";
import { Kort } from "~/komponenter/Kort";
import { RouteConfig } from "~/routeConfig";
import { DokumentTre } from "~/saker/filer/DokumentTre";
import type { DokumentInnhold } from "~/saker/filer/typer";
import { formaterRelativTid } from "~/utils/date-utils";
import { DokumentEditor } from "./DokumentEditor";
import { DokumentTittel } from "./DokumentTittel";
import { action, loader } from "./DokumentSide.server";
import { SlettDokumentModal } from "./SlettDokumentModal";
import { useAutolagring, type Autolagringsdata, type LagreStatus } from "./useAutolagring";
import { useDokumentSletting } from "./useDokumentSletting";

export { action, loader };

function LagreStatusVisning({
  status,
  sistLagret,
}: {
  status: LagreStatus;
  sistLagret: Date | null;
}) {
  // Oppdater jevnlig så den relative tiden («for 32 sekunder siden») holder seg fersk
  // mens dokumentet ligger åpent uten endringer.
  const [nå, setNå] = useState(() => Date.now());
  useEffect(() => {
    setNå(Date.now());
    const id = setInterval(() => setNå(Date.now()), 15_000);
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
  sakReferanse,
  kanRedigere,
}: {
  dokument: LoaderData["dokument"];
  dokumenter: LoaderData["dokumenter"];
  sakReferanse: string;
  kanRedigere: boolean;
}) {
  const [tittel, setTittel] = useState(dokument.tittel);
  const tittelRef = useRef(dokument.tittel);
  const innholdRef = useRef<DokumentInnhold>(dokument.innhold);
  const navigate = useNavigate();

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

  const lagre = useCallback(
    async (data: Autolagringsdata) => {
      const respons = await fetch(lagreUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        keepalive: true,
      });
      if (!respons.ok) {
        throw new Error("Lagring feilet");
      }
    },
    [lagreUrl],
  );

  const { status, sistLagret, registrerEndring } = useAutolagring({ lagre });

  const håndterTittel = useCallback(
    (nyTittel: string) => {
      setTittel(nyTittel);
      tittelRef.current = nyTittel;
      registrerEndring({ tittel: nyTittel, innhold: innholdRef.current });
    },
    [registrerEndring],
  );

  const håndterInnhold = useCallback(
    (innhold: DokumentInnhold) => {
      innholdRef.current = innhold;
      registrerEndring({ tittel: tittelRef.current, innhold });
    },
    [registrerEndring],
  );

  return (
    <>
      <title>{`${tittel || "Uten tittel"} – Sak ${sakReferanse} – Watson Sak`}</title>
      <VStack gap="space-12" className="mt-4 mb-8">
        <HStack justify="space-between" align="center" gap="space-4" wrap>
          <Button
            type="button"
            variant="tertiary"
            size="small"
            icon={<ArrowLeftIcon aria-hidden />}
            onClick={() => navigate(-1)}
          >
            Tilbake
          </Button>

          <HStack gap="space-2" align="center" wrap>
            <Dialog>
              <Dialog.Trigger>
                <Button
                  type="button"
                  variant="secondary"
                  size="small"
                  icon={<FilesIcon aria-hidden />}
                >
                  Se andre dokumenter
                </Button>
              </Dialog.Trigger>
              <Dialog.Popup position="right" width="medium">
                <Dialog.Header>
                  <Dialog.Title>
                    <Heading level="2" size="small">
                      Dokumenter
                    </Heading>
                  </Dialog.Title>
                </Dialog.Header>
                <Dialog.Body>
                  {dokumenter.length > 0 ? (
                    <DokumentTre
                      noder={dokumenter}
                      sakId={sakReferanse}
                      redigerbar={kanRedigere}
                      fremhevetId={dokument.id}
                      redirectVedSletting={(docId) => (docId === dokument.id ? sakUrl : undefined)}
                    />
                  ) : (
                    <Detail className="text-ax-text-neutral-subtle">Ingen andre dokumenter.</Detail>
                  )}
                </Dialog.Body>
              </Dialog.Popup>
            </Dialog>

            {kanRedigere && (
              <Button
                type="button"
                variant="tertiary"
                data-color="danger"
                size="small"
                icon={<TrashIcon aria-hidden />}
                onClick={() => sletting.start({ id: dokument.id, tittel })}
              >
                Slett dokument
              </Button>
            )}
          </HStack>
        </HStack>

        <Kort>
          <VStack gap="space-16">
            <DokumentTittel tittel={tittel} redigerbar={kanRedigere} onEndre={håndterTittel} />

            <DokumentEditor
              startInnhold={dokument.innhold}
              redigerbar={kanRedigere}
              onEndring={håndterInnhold}
              verktøylinjeSlutt={<LagreStatusVisning status={status} sistLagret={sistLagret} />}
            />
          </VStack>
        </Kort>
      </VStack>

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
  const { dokument, dokumenter, sakReferanse, kanRedigere } = useLoaderData<typeof loader>();

  // `key` på dokument-id sørger for at all lokal redigeringstilstand (tittel, innhold,
  // editor-instans og autolagring) nullstilles når man navigerer til et annet dokument
  // på samme route.
  return (
    <DokumentRedigering
      key={dokument.id}
      dokument={dokument}
      dokumenter={dokumenter}
      sakReferanse={sakReferanse}
      kanRedigere={kanRedigere}
    />
  );
}
