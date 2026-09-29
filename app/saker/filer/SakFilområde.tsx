import { FilePlusIcon, NotePencilIcon, UploadIcon } from "@navikt/aksel-icons";
import { BodyShort, Box, Button, Heading, HStack, Link, Loader, VStack } from "@navikt/ds-react";
import { useRef, useState } from "react";
import { Link as RouterLink, useFetcher } from "react-router";
import { sporHendelse } from "~/analytics/analytics";
import { Kort } from "~/komponenter/Kort";
import type { MalId } from "~/saker/filer/dokument/maler";
import { RouteConfig } from "~/routeConfig";
import { formaterDato } from "~/utils/date-utils";
import { ArkivertSeksjon } from "./ArkivertSeksjon";
import { DokumentListe } from "./DokumentListe";
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
  /** Om brukeren kan laste opp filer. Standard: samme verdi som `redigerbar`. */
  kanLasteOppFiler?: boolean;
  /** Om innlogget bruker er sakseier og kan slette vedlegg. Standard: `false` */
  erSakseier?: boolean;
  /** Bare lokal mock: vis hvor migreringsnotatet skal ligge, uten å lagre innhold. */
  visMigreringsnotatForhandsvisning?: boolean;
  /** Bare lokal mock: syntetisk notat som vises som et dokumentkort under Filer. */
  migreringsnotatEksempel?: {
    id: string;
    tittel: string;
    tekst: string;
    opprettetDato: string;
  } | null;
}

export function SakFilområde({
  dokumenter,
  filer,
  sakId,
  redigerbar = true,
  kanLasteOppFiler = redigerbar,
  erSakseier = false,
  visMigreringsnotatForhandsvisning = false,
  migreringsnotatEksempel = null,
}: SakFilområdeProps) {
  // Filopplasting eies her, siden «Last opp fil»-knappen ligger i den felles headeren for hele
  // «Filer»-kortet, mens opplastingsstatus (spinner/feilmelding) vises nede i Opplastede filer.
  const opplastingFetcher = useFetcher<FilResponse | { message: string }>();
  const inputRef = useRef<HTMLInputElement>(null);
  const lasterOpp = opplastingFetcher.state !== "idle";
  const url = RouteConfig.API.SAK_FILER.replace(":sakId", sakId);

  const redigerbareDokumenter = dokumenter.filter(
    (dokument) => !dokument.arkivert && dokument.id !== migreringsnotatEksempel?.id,
  );
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
          {(redigerbar || kanLasteOppFiler) && (
            <HStack gap="space-2" align="center">
              {redigerbar && <OpprettDokumentKnapp sakId={sakId} />}
              {kanLasteOppFiler && (
                <>
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
                    icon={
                      lasterOpp ? <Loader size="xsmall" aria-hidden /> : <UploadIcon aria-hidden />
                    }
                    disabled={lasterOpp}
                    onClick={() => inputRef.current?.click()}
                  >
                    Last opp fil
                  </Button>
                </>
              )}
            </HStack>
          )}
        </HStack>

        {visMigreringsnotatForhandsvisning && (
          <VStack gap="space-4">
            <BodyShort size="small" weight="semibold">
              Migreringsnotat (forhåndsvisning)
            </BodyShort>
            <BodyShort size="small">Notatet vises her når lagring er tilgjengelig.</BodyShort>
          </VStack>
        )}

        {migreringsnotatEksempel && (
          <Box
            background="default"
            borderColor="neutral-subtle"
            borderWidth="1"
            borderRadius="8"
            padding="space-16"
          >
            <HStack gap="space-8" align="start">
              <NotePencilIcon fontSize="1.5rem" aria-hidden />
              <VStack gap="space-4" className="min-w-0 flex-1">
                <Link
                  as={RouterLink}
                  to={RouteConfig.SAKER_DOKUMENT.replace(":sakId", sakId).replace(
                    ":docId",
                    migreringsnotatEksempel.id,
                  )}
                >
                  {migreringsnotatEksempel.tittel}
                </Link>
                <BodyShort size="small" textColor="subtle">
                  Notat · Opprettet i Watson Sak ·{" "}
                  {formaterDato(migreringsnotatEksempel.opprettetDato)}
                </BodyShort>
                <hr className="w-full border-ax-border-neutral-subtle" />
                <BodyShort size="small">{migreringsnotatEksempel.tekst}</BodyShort>
              </VStack>
            </HStack>
          </Box>
        )}

        {(redigerbareDokumenter.length > 0 || !migreringsnotatEksempel) && (
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
              <DokumentListe
                dokumenter={redigerbareDokumenter}
                sakId={sakId}
                redigerbar={redigerbar}
              />
            )}
          </VStack>
        )}

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
