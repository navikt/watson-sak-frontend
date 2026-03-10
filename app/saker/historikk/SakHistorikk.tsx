import {
  ArrowRightIcon,
  ClockIcon,
  PersonIcon,
  PlusCircleIcon,
} from "@navikt/aksel-icons";
import { BodyShort, Box, Heading, Process, VStack } from "@navikt/ds-react";
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
  }
}

function hendelseBeskrivelse(hendelse: SakHendelse): string | null {
  if (!hendelse.detaljer) return null;

  const { fra, til } = hendelse.detaljer;

  if (fra && til) return `${fra} → ${til}`;
  if (til) return til;
  return null;
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
  }
}

export function SakHistorikk({ hendelser }: SakHistorikkProps) {
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
        {hendelser.map((hendelse, index) => {
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
    </Box>
  );
}
