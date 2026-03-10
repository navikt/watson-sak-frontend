import {
  ArrowRightIcon,
  ClockIcon,
  PersonIcon,
  PlusCircleIcon,
  XMarkOctagonIcon,
} from "@navikt/aksel-icons";
import { BodyShort, Box, Button, Heading, Process, VStack } from "@navikt/ds-react";
import { useState } from "react";
import type { SakHendelse } from "./typer";

interface SakHistorikkProps {
  hendelser: SakHendelse[];
}

function formaterTidspunkt(isoString: string): string {
  try {
    return new Intl.DateTimeFormat("nb-NO", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(isoString));
  } catch {
    return isoString;
  }
}

function hendelseTittel(hendelse: SakHendelse): string {
  switch (hendelse.type) {
    case "opprettet":
      return "Sak opprettet";
    case "status_endret":
      return "Status endret";
    case "tildelt":
      return "Sak tildelt";
    case "seksjon_endret":
      return "Seksjon endret";
    case "avdeling_endret":
      return "Avdeling endret";
    case "henlagt":
      return "Sak henlagt";
  }
}

function hendelseBeskrivelse(hendelse: SakHendelse): string | null {
  if (!hendelse.detaljer) return null;

  const { fra, til, notat } = hendelse.detaljer;
  const deler: string[] = [];

  if (fra && til) deler.push(`${fra} → ${til}`);
  else if (til) deler.push(til);

  if (notat) deler.push(notat);

  return deler.length > 0 ? deler.join(" – ") : null;
}

function HendelseBullet({ type }: { type: SakHendelse["type"] }) {
  const iconProps = { "aria-hidden": true as const, fontSize: "1.25rem" };
  switch (type) {
    case "opprettet":
      return <PlusCircleIcon {...iconProps} />;
    case "status_endret":
      return <ClockIcon {...iconProps} />;
    case "tildelt":
      return <PersonIcon {...iconProps} />;
    case "seksjon_endret":
    case "avdeling_endret":
      return <ArrowRightIcon {...iconProps} />;
    case "henlagt":
      return <XMarkOctagonIcon {...iconProps} />;
  }
}

const MAKS_SYNLIGE_HENDELSER = 5;

export function SakHistorikk({ hendelser }: SakHistorikkProps) {
  const [visAlle, setVisAlle] = useState(false);
  const harFlere = hendelser.length > MAKS_SYNLIGE_HENDELSER;
  const synligeHendelser = visAlle ? hendelser : hendelser.slice(0, MAKS_SYNLIGE_HENDELSER);

  if (hendelser.length === 0) {
    return (
      <Box padding="space-6" borderRadius="8" background="raised">
        <Heading level="2" size="small" spacing>
          Historikk
        </Heading>
        <BodyShort>Ingen historikk for denne saken.</BodyShort>
      </Box>
    );
  }

  return (
    <Box padding="space-6" borderRadius="8" background="raised">
      <Heading level="2" size="small" spacing>
        Historikk
      </Heading>
      <Process>
        {synligeHendelser.map((hendelse, index) => {
          const beskrivelse = hendelseBeskrivelse(hendelse);
          return (
            <Process.Event
              key={hendelse.id}
              title={hendelseTittel(hendelse)}
              timestamp={formaterTidspunkt(hendelse.tidspunkt)}
              status={index === 0 ? "active" : "completed"}
              bullet={<HendelseBullet type={hendelse.type} />}
            >
              <VStack gap="space-1">
                {beskrivelse && <BodyShort size="small">{beskrivelse}</BodyShort>}
                <BodyShort size="small" className="text-text-subtle">
                  {hendelse.utførtAv}
                </BodyShort>
              </VStack>
            </Process.Event>
          );
        })}
      </Process>
      {harFlere && (
        <Button
          variant="tertiary"
          size="small"
          onClick={() => setVisAlle((prev) => !prev)}
          className="mt-2"
        >
          {visAlle
            ? "Vis færre"
            : `Vis ${hendelser.length - MAKS_SYNLIGE_HENDELSER} flere`}
        </Button>
      )}
    </Box>
  );
}
