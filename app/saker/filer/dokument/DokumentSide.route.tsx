import { ArrowLeftIcon } from "@navikt/aksel-icons";
import { Detail, HStack, Link as AkselLink, VStack } from "@navikt/ds-react";
import { useCallback, useRef, useState } from "react";
import { Link, useLoaderData } from "react-router";
import { sporHendelse } from "~/analytics/analytics";
import { Kort } from "~/komponenter/Kort";
import { RouteConfig } from "~/routeConfig";
import type { DokumentInnhold } from "~/saker/filer/typer";
import { DokumentEditor } from "./DokumentEditor";
import { DokumentTittel } from "./DokumentTittel";
import { action, loader } from "./DokumentSide.server";
import { useAutolagring, type Autolagringsdata, type LagreStatus } from "./useAutolagring";

export { action, loader };

function formaterKlokkeslett(dato: Date): string {
  return new Intl.DateTimeFormat("nb-NO", { hour: "2-digit", minute: "2-digit" }).format(dato);
}

function LagreStatusVisning({
  status,
  sistLagret,
}: {
  status: LagreStatus;
  sistLagret: Date | null;
}) {
  const tekst =
    status === "lagrer"
      ? "Lagrer…"
      : status === "endret"
        ? "Ulagrede endringer"
        : status === "feil"
          ? "Kunne ikke lagre – prøver igjen"
          : sistLagret
            ? `Lagret kl. ${formaterKlokkeslett(sistLagret)}`
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

export default function DokumentSide() {
  const { dokument, sakReferanse, kanRedigere } = useLoaderData<typeof loader>();

  const [tittel, setTittel] = useState(dokument.tittel);
  const tittelRef = useRef(dokument.tittel);
  const innholdRef = useRef<DokumentInnhold>(dokument.innhold);

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
        sporHendelse("dokument lagring feilet", { sakId: sakReferanse, docId: dokument.id });
        throw new Error("Lagring feilet");
      }
      sporHendelse("dokument lagret", { sakId: sakReferanse, docId: dokument.id });
    },
    [lagreUrl, sakReferanse, dokument.id],
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
    <VStack gap="space-16" className="py-6">
      <div>
        <AkselLink as={Link} to={RouteConfig.SAKER_DETALJ.replace(":sakId", sakReferanse)}>
          <ArrowLeftIcon aria-hidden />
          Tilbake til saken
        </AkselLink>
      </div>

      <Kort>
        <VStack gap="space-16">
          <HStack justify="space-between" align="start" gap="space-16" wrap>
            <DokumentTittel tittel={tittel} redigerbar={kanRedigere} onEndre={håndterTittel} />
            {kanRedigere && <LagreStatusVisning status={status} sistLagret={sistLagret} />}
          </HStack>

          <DokumentEditor
            startInnhold={dokument.innhold}
            redigerbar={kanRedigere}
            onEndring={håndterInnhold}
          />
        </VStack>
      </Kort>
    </VStack>
  );
}
