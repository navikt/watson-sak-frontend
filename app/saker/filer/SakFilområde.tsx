import { FilePlusIcon, FolderPlusIcon, UploadIcon } from "@navikt/aksel-icons";
import { Button, Heading, HStack, Loader, VStack } from "@navikt/ds-react";
import { useRef, useState } from "react";
import { useFetcher } from "react-router";
import { sporHendelse } from "~/analytics/analytics";
import { Kort } from "~/komponenter/Kort";
import type { MalId } from "~/saker/filer/dokument/maler";
import { RouteConfig } from "~/routeConfig";
import { ArkivertSeksjon } from "./ArkivertSeksjon";
import { FilerSeksjonCaption } from "./FilerRad";
import { flatMappeliste, byggFilTre } from "./mapper/bygg-filtre";
import { FilTre } from "./mapper/FilTre";
import { OpprettMappeModal } from "./mapper/MappeModaler";
import { OpprettDokumentModal } from "./OpprettDokumentModal";
import type { DokumentNode, FilResponse, JournalpostReferanse } from "./typer";

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
        variant="primary"
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
  /** Journalpostene på saken, brukt til å gruppere arkiverte elementer. */
  journalposter?: JournalpostReferanse[];
  /** Saksreferansen, brukt til å bygge lenker og opprette-handlingen. */
  sakId: string;
  /** Om brukeren kan opprette og redigere dokumenter. Standard: `true` */
  redigerbar?: boolean;
  /** Om brukeren kan laste opp filer og endre mapper. Standard: samme verdi som `redigerbar`. */
  kanLasteOppFiler?: boolean;
  /** Om innlogget bruker er sakseier og kan slette vedlegg. Standard: `false` */
  erSakseier?: boolean;
}

export function SakFilområde({
  dokumenter,
  filer,
  mapper = [],
  journalposter = [],
  sakId,
  redigerbar = true,
  kanLasteOppFiler = redigerbar,
  erSakseier = false,
}: SakFilområdeProps) {
  // Filopplasting eies her, siden «Last opp fil»-knappen ligger i den felles headeren for hele
  // «Filer»-kortet, mens opplastingsstatus (spinner/feilmelding) vises nede i mappetreet.
  const opplastingFetcher = useFetcher<FilResponse | { message: string }>();
  const inputRef = useRef<HTMLInputElement>(null);
  const lasterOpp = opplastingFetcher.state !== "idle";
  const url = RouteConfig.API.SAK_FILER.replace(":sakId", sakId);

  const alleMapper = flatMappeliste(byggFilTre(mapper, dokumenter, filer)).map((m) => m.sti);
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
              {kanLasteOppFiler && <OpprettMappeKnapp sakId={sakId} mapper={alleMapper} />}
              {redigerbar && <OpprettDokumentKnapp sakId={sakId} />}
            </HStack>
          )}
        </HStack>

        <VStack gap="space-4">
          <FilerSeksjonCaption tittel="Mapper" />
          <FilTre
            mapper={mapper}
            dokumenter={dokumenter}
            filer={filer}
            sakId={sakId}
            redigerbar={redigerbar}
            kanEndreMapper={kanLasteOppFiler}
            erSakseier={erSakseier}
            lasterOpp={lasterOpp}
            feilFraServer={feilFraServer}
          />
        </VStack>

        <ArkivertSeksjon
          filer={arkiverteFiler}
          dokumenterUtenFil={arkiverteDokumenterUtenFil}
          journalposter={journalposter}
          sakId={sakId}
        />
      </VStack>
    </Kort>
  );
}
