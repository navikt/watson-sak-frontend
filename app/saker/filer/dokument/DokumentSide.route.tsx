import { ArrowLeftIcon } from "@navikt/aksel-icons";
import { Button, Detail, VStack } from "@navikt/ds-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLoaderData, useNavigate } from "react-router";
import { Kort } from "~/komponenter/Kort";
import { RouteConfig } from "~/routeConfig";
import type { DokumentInnhold } from "~/saker/filer/typer";
import { formaterRelativTid } from "~/utils/date-utils";
import { DokumentEditor } from "./DokumentEditor";
import { DokumentTittel } from "./DokumentTittel";
import { action, loader } from "./DokumentSide.server";
import { useAutolagring, type Autolagringsdata, type LagreStatus } from "./useAutolagring";

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

type DokumentData = Awaited<ReturnType<typeof loader>>["dokument"];

function DokumentRedigering({
  dokument,
  sakReferanse,
  kanRedigere,
}: {
  dokument: DokumentData;
  sakReferanse: string;
  kanRedigere: boolean;
}) {
  const [tittel, setTittel] = useState(dokument.tittel);
  const tittelRef = useRef(dokument.tittel);
  const innholdRef = useRef<DokumentInnhold>(dokument.innhold);
  const navigate = useNavigate();

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
        <div>
          <Button
            type="button"
            variant="tertiary"
            size="small"
            icon={<ArrowLeftIcon aria-hidden />}
            onClick={() => navigate(-1)}
          >
            Tilbake
          </Button>
        </div>

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
    </>
  );
}

export default function DokumentSide() {
  const { dokument, sakReferanse, kanRedigere } = useLoaderData<typeof loader>();

  // `key` på dokument-id sørger for at all lokal redigeringstilstand (tittel, innhold,
  // editor-instans og autolagring) nullstilles når man navigerer til et annet dokument
  // på samme route.
  return (
    <DokumentRedigering
      key={dokument.id}
      dokument={dokument}
      sakReferanse={sakReferanse}
      kanRedigere={kanRedigere}
    />
  );
}
