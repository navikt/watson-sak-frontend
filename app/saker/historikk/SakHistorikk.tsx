import {
  CheckmarkCircleIcon,
  ArrowRightIcon,
  ClockIcon,
  GavelIcon,
  PaperplaneIcon,
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
  switch (hendelse.hendelsesType) {
    case "SAK_OPPRETTET":
      return "Sak opprettet";
    case "AVKLARING_OPPRETTET":
      return "Avklaring opprettet";
    case "SAK_TILDELT":
      return "Sak tildelt";
    case "STATUS_ENDRET":
      return "Status endret";
    case "MOTTAKSENHET_ENDRET":
      return "Mottaksenhet endret";
    case "VIDERESENDT_TIL_NAY_NFP":
      return "Videresendt til NAY/NFP";
    case "POLITIANMELDT":
      return "Politianmeldt";
    case "SAK_HENLAGT":
      return "Sak henlagt";
    default:
      return hendelse.hendelsesType;
  }
}

function hendelseBeskrivelse(hendelse: SakHendelse): string | null {
  const deler: string[] = [];

  deler.push(`Status: ${formaterTekst(hendelse.status)}`);
  deler.push(`Mottaksenhet: ${hendelse.mottakEnhet}`);

  if (hendelse.avklaringResultat) {
    deler.push(`Avklaringsresultat: ${hendelse.avklaringResultat}`);
  }

  return deler.length > 0 ? deler.join(" – ") : null;
}

function formaterTekst(verdi: string): string {
  return verdi.charAt(0) + verdi.slice(1).toLowerCase().replaceAll("_", " ");
}

function HendelseBullet({ hendelse }: { hendelse: SakHendelse }) {
  const iconProps = { "aria-hidden": true as const, fontSize: "1.25rem" };
  switch (hendelse.hendelsesType) {
    case "SAK_OPPRETTET":
      return <PlusCircleIcon {...iconProps} />;
    case "AVKLARING_OPPRETTET":
      return <CheckmarkCircleIcon {...iconProps} />;
    case "SAK_TILDELT":
      return <PersonIcon {...iconProps} />;
    case "MOTTAKSENHET_ENDRET":
      return <ArrowRightIcon {...iconProps} />;
    case "SAK_HENLAGT":
      return <XMarkOctagonIcon {...iconProps} />;
    case "VIDERESENDT_TIL_NAY_NFP":
      return <PaperplaneIcon {...iconProps} />;
    case "POLITIANMELDT":
      return <GavelIcon {...iconProps} />;
    default:
      return <ClockIcon {...iconProps} />;
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
              key={hendelse.hendelseId}
              title={hendelseTittel(hendelse)}
              timestamp={formaterTidspunkt(hendelse.tidspunkt)}
              status={index === 0 ? "active" : "completed"}
              bullet={<HendelseBullet hendelse={hendelse} />}
            >
              <VStack gap="space-1">
                {beskrivelse && <BodyShort size="small">{beskrivelse}</BodyShort>}
                <BodyShort size="small" className="text-ax-text-neutral-subtle">
                  {`${formaterTekst(hendelse.kategori)} · ${formaterTekst(hendelse.prioritet)}`}
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
          {visAlle ? "Vis færre" : `Vis ${hendelser.length - MAKS_SYNLIGE_HENDELSER} flere`}
        </Button>
      )}
    </Box>
  );
}
