import {
  ChevronDownIcon,
  ChevronUpIcon,
  ExclamationmarkTriangleIcon,
  PadlockLockedIcon,
} from "@navikt/aksel-icons";
import {
  BodyShort,
  Button,
  Detail,
  Heading,
  HStack,
  InfoCard,
  Loader,
  VStack,
} from "@navikt/ds-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Kort } from "~/komponenter/Kort";
import { JournalpostTabell } from "./JournalpostTabell";
import type { ArkivJournalpost, OpprettetJournalpost } from "./typer";
import {
  useArkivJournalposter,
  type ArkivOversikt,
  type ArkivTilstand,
} from "./useArkivJournalposter";
import { antallNyeSisteDager, tilJournalposttypekode } from "./visning";

interface GosysDokumentpanelProps {
  sakId: string;
  saksreferanse: string;
  /** Om brukeren har tilgang til å se journalposter i Gosys (`tilgang.kanSeArkiv`). */
  kanSeArkiv: boolean;
  /** Handlingsknapper som vises ved siden av «Åpne dokumentoversikt». */
  /**
   * Gir eieren funksjonen som viser en ny journalpost i oversikten, for journalposter som
   * opprettes utenfor panelet. Kalles med `null` når panelet fjernes.
   */
  registrerJournalpostHandler?: (
    handler: ((journalpost: OpprettetJournalpost) => void) | null,
  ) => void;
  renderHandlinger?: (props: {
    onJournalpostOpprettet: (journalpost: OpprettetJournalpost) => void;
    arkiv: ArkivOversikt;
  }) => ReactNode;
}

const feilmeldinger: Record<Extract<ArkivTilstand, { status: "feil" }>["årsak"], string> = {
  utilgjengelig: "Kunne ikke hente dokumentoversikten fra Gosys. Prøv igjen.",
  "for-mange-forespørsler": "Du har gjort for mange oppslag. Vent et par minutter og prøv igjen.",
  utlogget: "Sesjonen din er utløpt. Last inn siden på nytt for å logge inn.",
};

export function GosysDokumentpanel({
  sakId,
  saksreferanse,
  kanSeArkiv,
  registrerJournalpostHandler,
  renderHandlinger,
}: GosysDokumentpanelProps) {
  const [åpen, settÅpen] = useState(false);
  const { tilstand, ventende, ventendeIder, synkUttømt, hent, oppdater, journalpostOpprettet } =
    useArkivJournalposter(sakId);

  // Henter når panelet er åpent og ikke hentet, også om tilgangen kommer etter åpning.
  useEffect(() => {
    if (åpen && kanSeArkiv && tilstand.status === "ikke-hentet") void hent();
  }, [åpen, kanSeArkiv, tilstand.status, hent]);

  function veksleOversikt() {
    const skalÅpnes = !åpen;
    settÅpen(skalÅpnes);
    if (skalÅpnes && kanSeArkiv && tilstand.status === "feil") void hent();
  }

  const onJournalpostOpprettet = useCallback(
    (journalpost: OpprettetJournalpost) => {
      if (!kanSeArkiv) return;
      settÅpen(true);
      journalpostOpprettet(tilVentendeJournalpost(journalpost));
    },
    [kanSeArkiv, journalpostOpprettet],
  );

  useEffect(() => {
    registrerJournalpostHandler?.(onJournalpostOpprettet);
    return () => registrerJournalpostHandler?.(null);
  }, [registrerJournalpostHandler, onJournalpostOpprettet]);

  const hentOversikt = useCallback(() => void hent(), [hent]);
  const arkiv: ArkivOversikt = { kanSeArkiv, tilstand, hent: hentOversikt };

  const overskriftId = `gosys-dokumentoversikt-${sakId}`;
  const innholdId = `${overskriftId}-innhold`;

  return (
    <section aria-labelledby={overskriftId}>
      <Kort>
        <VStack gap="space-16">
          <VStack gap="space-4">
            <Heading level="2" size="small" id={overskriftId}>
              Dokumentoversikt i Gosys for sak {saksreferanse}
            </Heading>
            <BodyShort size="small">
              Alle journalføringer i Gosys for sak {saksreferanse}. Om du ønsker å se annet i Gosys
              må du gjøre dette i Gosys.
            </BodyShort>
          </VStack>

          <HStack gap="space-8" justify="space-between" align="center" wrap>
            <Button
              type="button"
              variant="tertiary"
              size="xsmall"
              icon={åpen ? <ChevronUpIcon aria-hidden /> : <ChevronDownIcon aria-hidden />}
              aria-expanded={åpen}
              aria-controls={åpen ? innholdId : undefined}
              onClick={veksleOversikt}
            >
              {åpen ? "Lukk dokumentoversikt" : "Åpne dokumentoversikt"}
            </Button>
            {renderHandlinger?.({ onJournalpostOpprettet, arkiv })}
          </HStack>

          {kanSeArkiv && tilstand.status === "ok" ? (
            <Detail textColor="subtle" align="end">
              {formaterAntallJournalføringer(tilstand.journalposter)}
            </Detail>
          ) : null}

          {åpen ? (
            <div id={innholdId}>
              <Innhold
                kanSeArkiv={kanSeArkiv}
                tilstand={tilstand}
                ventende={ventende}
                ventendeIder={ventendeIder}
                synkUttømt={synkUttømt}
                onPrøvIgjen={() => void hent()}
                onOppdater={oppdater}
              />
            </div>
          ) : null}
        </VStack>
      </Kort>
    </section>
  );
}

function formaterAntallJournalføringer(journalposter: ArkivJournalpost[]): string {
  const antall = journalposter.length;
  const nye = antallNyeSisteDager(journalposter, 7, nåSomLokalIso());
  return `${antall} ${antall === 1 ? "journalføring" : "journalføringer"}, ${nye} ${nye === 1 ? "ny" : "nye"} siste 7 dager`;
}

/** Lokal tid uten tidssone, samme format som `datoOpprettet` fra SAF. */
function nåSomLokalIso(): string {
  const nå = new Date();
  return new Date(nå.getTime() - nå.getTimezoneOffset() * 60_000).toISOString().slice(0, 19);
}

function tilVentendeJournalpost(journalpost: OpprettetJournalpost): ArkivJournalpost | null {
  const { journalpostId } = journalpost;
  if (!journalpostId) return null;
  return {
    journalpostId,
    datoOpprettet: nåSomLokalIso(),
    journalposttype: tilJournalposttypekode(journalpost.journalposttype),
    journalstatus: null,
    tittel: journalpost.tittel,
    tema: null,
    temanavn: null,
    avsenderMottaker: null,
    dokumenter: journalpost.dokumenttitler.map((tittel, indeks) => ({
      dokumentInfoId: `${journalpostId}-${indeks}`,
      tittel,
    })),
  };
}

function Innhold({
  kanSeArkiv,
  tilstand,
  ventende,
  ventendeIder,
  synkUttømt,
  onPrøvIgjen,
  onOppdater,
}: {
  kanSeArkiv: boolean;
  tilstand: ArkivTilstand;
  ventende: readonly ArkivJournalpost[];
  ventendeIder: ReadonlySet<string>;
  synkUttømt: boolean;
  onPrøvIgjen: () => void;
  onOppdater: () => void;
}) {
  if (!kanSeArkiv) {
    return (
      <VStack gap="space-4" align="center" className="py-4 text-center">
        <PadlockLockedIcon aria-hidden fontSize="1.5rem" />
        <BodyShort size="small">
          Du har ikke tilgang til dokumentoversikten i Gosys for denne saken.
        </BodyShort>
      </VStack>
    );
  }

  // Ventende journalposter vises selv om oversikten ikke er hentet ennå, eller feilet.
  const ventendeTabell =
    ventende.length > 0 ? (
      <JournalpostTabell journalposter={[...ventende]} ventendeIder={ventendeIder} />
    ) : null;

  switch (tilstand.status) {
    case "ikke-hentet":
    case "laster":
      return (
        <VStack gap="space-8">
          {ventendeTabell}
          <HStack justify="center" className="py-4">
            <Loader size="medium" title="Henter dokumentoversikten fra Gosys" />
          </HStack>
        </VStack>
      );
    case "feil":
      return (
        <VStack gap="space-8" align="start">
          {ventendeTabell ? <div className="w-full">{ventendeTabell}</div> : null}
          <InfoCard size="small" data-color="warning" className="w-full">
            <InfoCard.Message icon={<ExclamationmarkTriangleIcon aria-hidden />}>
              {feilmeldinger[tilstand.årsak]}
            </InfoCard.Message>
          </InfoCard>
          {tilstand.årsak !== "utlogget" ? (
            <Button type="button" size="small" variant="secondary" onClick={onPrøvIgjen}>
              Prøv igjen
            </Button>
          ) : null}
        </VStack>
      );
    case "ok":
      return tilstand.journalposter.length === 0 ? (
        <BodyShort size="small" textColor="subtle" className="py-4 text-center">
          Ingen journalføringer å vise for denne saken.
        </BodyShort>
      ) : (
        <VStack gap="space-8">
          {synkUttømt ? (
            <HStack gap="space-8" align="center" justify="space-between" wrap>
              <BodyShort size="small" textColor="subtle">
                Gosys har ikke registrert den nye journalposten ennå.
              </BodyShort>
              <Button type="button" size="small" variant="secondary" onClick={onOppdater}>
                Oppdater
              </Button>
            </HStack>
          ) : null}
          <JournalpostTabell journalposter={tilstand.journalposter} ventendeIder={ventendeIder} />
        </VStack>
      );
  }
}
