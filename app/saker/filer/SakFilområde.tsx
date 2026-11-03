import { FilePlusIcon, FolderPlusIcon, NotePencilIcon, UploadIcon } from "@navikt/aksel-icons";
import { BodyShort, Box, Button, Heading, HStack, Link, Loader, VStack } from "@navikt/ds-react";
import { useEffect, useRef, useState } from "react";
import { Link as RouterLink, useFetcher } from "react-router";
import { sporHendelse } from "~/analytics/analytics";
import { Kort } from "~/komponenter/Kort";
import type { MalId } from "~/saker/filer/dokument/maler";
import type { KontrollsakSteg } from "~/saker/types.backend";
import { RouteConfig } from "~/routeConfig";
import { formaterDato } from "~/utils/date-utils";
import { erTekniskFeilSvar, Innsendingsfeil } from "~/feilhåndtering/Innsendingsfeil";
import { TILLATTE_FILTYPER } from "./fil-type-utils";
import { FilerSeksjonCaption } from "./FilerRad";
import { flatMappeliste, byggFilTre } from "./mapper/bygg-filtre";
import { FilTre } from "./mapper/FilTre";
import { OpprettMappeModal } from "./mapper/MappeModaler";
import { OpprettDokumentModal } from "./OpprettDokumentModal";
import type { DokumentNode, FilResponse } from "./typer";

function OpprettDokumentKnapp({ sakId, steg }: { sakId: string; steg: KontrollsakSteg }) {
  const action = RouteConfig.API.SAK_DOKUMENTER.replace(":sakId", sakId);
  const fetcher = useFetcher<{ ok?: boolean; teknisk?: boolean; feilId?: string }>();
  const [åpen, settÅpen] = useState(false);
  const [tekniskFeilSvar, settTekniskFeilSvar] = useState<unknown>();
  const forrigeState = useRef(fetcher.state);

  useEffect(() => {
    const varIgang = forrigeState.current !== "idle";
    forrigeState.current = fetcher.state;
    if (!varIgang || fetcher.state !== "idle") return;
    settTekniskFeilSvar(erTekniskFeilSvar(fetcher.data) ? fetcher.data : undefined);
  }, [fetcher.state, fetcher.data]);

  function opprett(valg?: { malId: MalId; erStraffesak: boolean }) {
    sporHendelse("dokument opprettet", { malId: valg?.malId ?? "tom" });
    settTekniskFeilSvar(undefined);
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
        variant="primary"
        icon={<FilePlusIcon aria-hidden />}
        onClick={() => settÅpen(true)}
      >
        Opprett dokument
      </Button>
      {åpen && (
        <OpprettDokumentModal
          åpen
          steg={steg}
          oppretter={fetcher.state !== "idle"}
          svar={tekniskFeilSvar}
          onClose={() => {
            settÅpen(false);
            settTekniskFeilSvar(undefined);
          }}
          onVelg={opprett}
        />
      )}
    </>
  );
}

function OpprettMappeKnapp({ sakId, mapper }: { sakId: string; mapper: string[] }) {
  const [åpen, settÅpen] = useState(false);
  return (
    <>
      <Button
        type="button"
        size="xsmall"
        variant="tertiary"
        icon={<FolderPlusIcon aria-hidden />}
        onClick={() => settÅpen(true)}
      >
        Opprett mappe
      </Button>
      {åpen && <OpprettMappeModal sakId={sakId} mapper={mapper} onClose={() => settÅpen(false)} />}
    </>
  );
}

interface SakFilområdeProps {
  dokumenter: DokumentNode[];
  filer: FilResponse[];
  /** Alle mappestier på saken, også tomme mapper. */
  mapper?: string[];
  /** Saksreferansen, brukt til å bygge lenker og opprette-handlingen. */
  sakId: string;
  /** Sakens steg. Styrer hvilke dokumentmaler som kan velges. */
  steg: KontrollsakSteg;
  /** Om brukeren kan opprette og redigere dokumenter. Standard: `true` */
  redigerbar?: boolean;
  /** Om brukeren kan laste opp filer og endre mapper. Standard: samme verdi som `redigerbar`. */
  kanLasteOppFiler?: boolean;
  /**
   * Om brukeren kan slette filer og mapper og flytte dokumenter. Krever endretilgang
   * (eier eller delt med på en fordelt sak), se `kanEndreSak` i `sakstilgang.ts`. Standard: `false`
   */
  kanEndreFiler?: boolean;
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
  mapper = [],
  sakId,
  steg,
  redigerbar = true,
  kanLasteOppFiler = redigerbar,
  kanEndreFiler = false,
  visMigreringsnotatForhandsvisning = false,
  migreringsnotatEksempel = null,
}: SakFilområdeProps) {
  // Filopplasting eies her, siden «Last opp fil»-knappen ligger i den felles headeren for hele
  // «Filer»-kortet, mens opplastingsstatus (spinner/feilmelding) vises nede i mappetreet.
  const opplastingFetcher = useFetcher<
    FilResponse | { message: string } | { ok: false; feil?: string; feilId: string; teknisk: true }
  >();
  const inputRef = useRef<HTMLInputElement>(null);
  const lasterOpp = opplastingFetcher.state !== "idle";
  const url = RouteConfig.API.SAK_FILER.replace(":sakId", sakId);

  // Det syntetiske migreringsnotatet vises som eget kort (kun i lokal mock), ikke også i mappetreet.
  const synligeDokumenter = dokumenter.filter(
    (dokument) => dokument.id !== migreringsnotatEksempel?.id,
  );
  const alleMapper = flatMappeliste(byggFilTre(mapper, synligeDokumenter, filer)).map((m) => m.sti);

  const [klientfeil, settKlientfeil] = useState<string | null>(null);
  const feilFraServer =
    klientfeil ??
    (opplastingFetcher.state === "idle" &&
    opplastingFetcher.data &&
    !erTekniskFeilSvar(opplastingFetcher.data) &&
    "message" in opplastingFetcher.data
      ? opplastingFetcher.data.message
      : null);

  function håndterFilvalg(event: React.ChangeEvent<HTMLInputElement>) {
    const fil = event.target.files?.[0];
    if (!fil) return;

    // Nullstill input slik at samme fil kan lastes opp igjen
    event.target.value = "";

    if (fil.size === 0) {
      settKlientfeil("Filen er tom og kan ikke lastes opp.");
      return;
    }
    settKlientfeil(null);

    const formData = new FormData();
    formData.append("fil", fil);
    sporHendelse("vedlegg lastet opp");
    opplastingFetcher.submit(formData, {
      method: "post",
      action: url,
      encType: "multipart/form-data",
    });
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
              {kanLasteOppFiler && (
                <>
                  <input
                    ref={inputRef}
                    type="file"
                    accept={TILLATTE_FILTYPER}
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
              {kanLasteOppFiler && <OpprettMappeKnapp sakId={sakId} mapper={alleMapper} />}
              {redigerbar && <OpprettDokumentKnapp sakId={sakId} steg={steg} />}
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

        <VStack gap="space-4">
          <FilerSeksjonCaption tittel="Mapper" />
          <FilTre
            mapper={mapper}
            dokumenter={synligeDokumenter}
            filer={filer}
            sakId={sakId}
            redigerbar={redigerbar}
            kanEndreMapper={kanLasteOppFiler}
            kanEndreFiler={kanEndreFiler}
            lasterOpp={lasterOpp}
            feilFraServer={feilFraServer}
            tekniskFeilSvar={opplastingFetcher.data}
          />
        </VStack>
      </VStack>
    </Kort>
  );
}
