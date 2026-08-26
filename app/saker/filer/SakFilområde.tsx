import { FilePlusIcon, UploadIcon } from "@navikt/aksel-icons";
import { BodyShort, Button, Heading, HStack, Loader, VStack } from "@navikt/ds-react";
import { useRef, useState } from "react";
import { useFetcher } from "react-router";
import { sporHendelse } from "~/analytics/analytics";
import { Kort } from "~/komponenter/Kort";
import type { MalId } from "~/saker/filer/dokument/maler";
import { RouteConfig } from "~/routeConfig";
import { ArkivertSeksjon } from "./ArkivertSeksjon";
import { DokumentTabell } from "./DokumentTabell";
import { FilerSeksjonCaption } from "./FilerRad";
import { OpprettDokumentModal } from "./OpprettDokumentModal";
import type { DokumentNode, FilResponse } from "./typer";
import { VedleggSeksjon } from "./VedleggSeksjon";

function OpprettDokumentKnapp({ sakId }: { sakId: string }) {
  const action = RouteConfig.API.SAK_DOKUMENTER.replace(":sakId", sakId);
  const fetcher = useFetcher();
  const [åpen, settÅpen] = useState(false);

  function opprett(valg?: { malId: MalId; erStraffesak: boolean }) {
    sporHendelse("dokument opprettet", { sakId, malId: valg?.malId ?? "tom" });
    const formData = new FormData();
    if (valg) {
      formData.set("malId", valg.malId);
      formData.set("erStraffesak", String(valg.erStraffesak));
    }
    fetcher.submit(formData, { method: "post", action });
  }

  return (
    <>
      <Button
        size="xsmall"
        variant="tertiary"
        icon={<FilePlusIcon aria-hidden />}
        onClick={() => settÅpen(true)}
      >
        Opprett dokument
      </Button>
      {åpen && (
        <OpprettDokumentModal
          åpen
          oppretter={fetcher.state !== "idle"}
          onClose={() => settÅpen(false)}
          onVelg={opprett}
        />
      )}
    </>
  );
}

interface SakFilområdeProps {
  dokumenter: DokumentNode[];
  filer: FilResponse[];
  /** Saksreferansen, brukt til å bygge lenker og opprette-handlingen. */
  sakId: string;
  /** Om brukeren kan opprette og redigere dokumenter. Standard: `true` */
  redigerbar?: boolean;
  /** Om innlogget bruker er sakseier og kan slette vedlegg. Standard: `false` */
  erSakseier?: boolean;
}

export function SakFilområde({
  dokumenter,
  filer,
  sakId,
  redigerbar = true,
  erSakseier = false,
}: SakFilområdeProps) {
  // Filopplasting eies her, siden «Last opp fil»-knappen ligger i den felles headeren for hele
  // «Filer»-kortet, mens opplastingsstatus (spinner/feilmelding) vises nede i Opplastede filer.
  const opplastingFetcher = useFetcher<FilResponse | { message: string }>();
  const inputRef = useRef<HTMLInputElement>(null);
  const lasterOpp = opplastingFetcher.state !== "idle";
  const url = RouteConfig.API.SAK_FILER.replace(":sakId", sakId);

  const redigerbareDokumenter = dokumenter.filter((dokument) => !dokument.arkivert);
  const aktiveFiler = filer.filter((fil) => !fil.arkivert);
  const arkiverteFiler = filer.filter((fil) => fil.arkivert);
  const arkiverteDokumenterUtenFil = dokumenter.filter(
    (dokument) =>
      dokument.arkivert && !filer.some((fil) => fil.arkivertFraDokumentId === dokument.id),
  );

  const feilFraServer =
    opplastingFetcher.state === "idle" &&
    opplastingFetcher.data &&
    "message" in opplastingFetcher.data
      ? opplastingFetcher.data.message
      : null;

  function håndterFilvalg(event: React.ChangeEvent<HTMLInputElement>) {
    const fil = event.target.files?.[0];
    if (!fil) return;

    const formData = new FormData();
    formData.append("fil", fil);
    sporHendelse("vedlegg lastet opp", { sakId });
    opplastingFetcher.submit(formData, {
      method: "post",
      action: url,
      encType: "multipart/form-data",
    });
    // Nullstill input slik at samme fil kan lastes opp igjen
    event.target.value = "";
  }

  return (
    <Kort>
      <VStack gap="space-8">
        <HStack justify="space-between" align="center">
          <Heading level="2" size="small">
            Filer
          </Heading>
          {redigerbar && (
            <HStack gap="space-2" align="center">
              <OpprettDokumentKnapp sakId={sakId} />
              <input
                ref={inputRef}
                type="file"
                className="sr-only"
                aria-hidden
                tabIndex={-1}
                onChange={håndterFilvalg}
              />
              <Button
                type="button"
                size="xsmall"
                variant="tertiary"
                icon={lasterOpp ? <Loader size="xsmall" aria-hidden /> : <UploadIcon aria-hidden />}
                disabled={lasterOpp}
                onClick={() => inputRef.current?.click()}
              >
                Last opp fil
              </Button>
            </HStack>
          )}
        </HStack>

        <VStack gap="space-4">
          <FilerSeksjonCaption
            tittel="Redigerbare dokumenter"
            undertekst="Opprettet i Watson Sak"
          />
          {redigerbareDokumenter.length === 0 ? (
            <BodyShort size="small" className="text-ax-text-neutral-subtle">
              Ingen redigerbare dokumenter ennå
            </BodyShort>
          ) : (
            <DokumentTabell
              dokumenter={redigerbareDokumenter}
              sakId={sakId}
              redigerbar={redigerbar}
            />
          )}
        </VStack>

        <VedleggSeksjon
          filer={aktiveFiler}
          sakId={sakId}
          erSakseier={erSakseier}
          lasterOpp={lasterOpp}
          feilFraServer={feilFraServer}
        />

        <ArkivertSeksjon
          filer={arkiverteFiler}
          dokumenterUtenFil={arkiverteDokumenterUtenFil}
          sakId={sakId}
        />
      </VStack>
    </Kort>
  );
}
