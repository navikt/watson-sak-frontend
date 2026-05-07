import {
  CheckmarkCircleIcon,
  ArrowRightIcon,
  ArrowUndoIcon,
  ClockDashedIcon,
  ClockIcon,
  DocPencilIcon,
  GavelIcon,
  PaperplaneIcon,
  PencilIcon,
  PersonGroupIcon,
  PersonIcon,
  PlusCircleIcon,
  XMarkOctagonIcon,
} from "@navikt/aksel-icons";
import { BodyShort, Box, Button, Heading, HStack, Process, VStack } from "@navikt/ds-react";
import { useState } from "react";
import { formaterBlokkeringsarsak, formaterStatus } from "~/saker/visning";
import { NORSK_TIDSSONE } from "~/utils/date-utils";
import { useDisclosure } from "~/utils/useDisclosure";
import { LeggTilHistorikkModal } from "./LeggTilHistorikkModal";
import type { SakHendelse } from "./typer";

interface SakHistorikkProps {
  sakId: string;
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
      timeZone: NORSK_TIDSSONE,
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
      return `Sak ${formaterStatus(hendelse.status).toLocaleLowerCase("nb-NO")}`;
    case "SAKSINFORMASJON_ENDRET":
      return "Saksinformasjon endret";
    case "MOTTAKSENHET_ENDRET":
      return "Mottaksenhet endret";
    case "VIDERESENDT_TIL_NAY_NFP":
      return "Videresendt til NAY/NFP";
    case "POLITIANMELDT":
      return "Politianmeldt";
    case "SAK_HENLAGT":
      return "Sak henlagt";
    case "TILGANG_DELT":
      return "Tilgang delt";
    case "TILGANG_FJERNET":
      return "Tilgang fjernet";
    case "ANSVARLIG_SAKSBEHANDLER_ENDRET":
      return "Ansvarlig saksbehandler endret";
    case "YTELSE_STANSET":
      return "Ytelse stanset";
    case "SAK_SATT_PA_VENT":
      return "Sak satt på vent";
    case "SAK_SATT_I_BERO":
      return "Sak satt i bero";
    case "SAK_GJENOPPTATT":
      return hendelse.blokkert === "I_BERO" ? "Sak tatt ut av bero" : "Sak gjenopptatt";
    case "MANUELL_NOTAT":
      return hendelse.tittel ?? "Notat";
    case "NOTAT_SENDT":
      return "Notat opprettet i Gosys";
    default:
      return hendelse.hendelsesType;
  }
}

function hendelseBeskrivelse(hendelse: SakHendelse): string | null {
  if (hendelse.hendelsesType === "MANUELL_NOTAT") {
    return hendelse.notat ?? null;
  }

  if (hendelse.hendelsesType === "NOTAT_SENDT") {
    return hendelse.beskrivelse ?? null;
  }

  if (hendelse.hendelsesType === "STATUS_ENDRET") {
    const deler: string[] = [];

    if (hendelse.beskrivelse) {
      deler.push(hendelse.beskrivelse);
    }

    deler.push(`Status: ${formaterStatus(hendelse.status)}`);

    return deler.join(" – ");
  }

  if (hendelse.hendelsesType === "POLITIANMELDT" || hendelse.hendelsesType === "SAK_HENLAGT") {
    const deler: string[] = [];

    if (hendelse.beskrivelse) {
      deler.push(hendelse.beskrivelse);
    }

    deler.push(`Status: ${formaterStatus(hendelse.status)}`);

    return deler.join(" – ");
  }

  if (
    hendelse.hendelsesType === "ANSVARLIG_SAKSBEHANDLER_ENDRET" &&
    hendelse.berortSaksbehandlerNavn &&
    hendelse.berortSaksbehandlerNavIdent &&
    hendelse.berortSaksbehandlerEnhet
  ) {
    return `Ansvarlig saksbehandler: ${hendelse.berortSaksbehandlerNavn} (${hendelse.berortSaksbehandlerNavIdent}) · ${hendelse.berortSaksbehandlerEnhet}`;
  }

  if (
    hendelse.hendelsesType === "TILGANG_DELT" &&
    hendelse.berortSaksbehandlerNavn &&
    hendelse.berortSaksbehandlerNavIdent &&
    hendelse.berortSaksbehandlerEnhet
  ) {
    return `Delt med: ${hendelse.berortSaksbehandlerNavn} (${hendelse.berortSaksbehandlerNavIdent}) · ${hendelse.berortSaksbehandlerEnhet}`;
  }

  if (
    (hendelse.hendelsesType === "SAK_SATT_PA_VENT" ||
      hendelse.hendelsesType === "SAK_SATT_I_BERO") &&
    hendelse.blokkert
  ) {
    const deler = [
      `På vent: ${formaterBlokkeringsarsak(hendelse.blokkert)}`,
      `Status: ${formaterStatus(hendelse.status)}`,
    ];

    if (hendelse.beskrivelse) {
      deler.push(hendelse.beskrivelse);
    }

    return deler.join(" – ");
  }

  if (
    hendelse.hendelsesType === "TILGANG_FJERNET" &&
    hendelse.berortSaksbehandlerNavn &&
    hendelse.berortSaksbehandlerNavIdent &&
    hendelse.berortSaksbehandlerEnhet
  ) {
    return `Fjernet deling med: ${hendelse.berortSaksbehandlerNavn} (${hendelse.berortSaksbehandlerNavIdent}) · ${hendelse.berortSaksbehandlerEnhet}`;
  }

  return `Status: ${formaterStatus(hendelse.status)}`;
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
    case "SAKSINFORMASJON_ENDRET":
      return <PencilIcon {...iconProps} />;
    case "MOTTAKSENHET_ENDRET":
      return <ArrowRightIcon {...iconProps} />;
    case "SAK_HENLAGT":
      return <XMarkOctagonIcon {...iconProps} />;
    case "VIDERESENDT_TIL_NAY_NFP":
      return <PaperplaneIcon {...iconProps} />;
    case "POLITIANMELDT":
      return <GavelIcon {...iconProps} />;
    case "TILGANG_DELT":
    case "TILGANG_FJERNET":
      return <PersonGroupIcon {...iconProps} />;
    case "ANSVARLIG_SAKSBEHANDLER_ENDRET":
      return <PersonIcon {...iconProps} />;
    case "YTELSE_STANSET":
      return <XMarkOctagonIcon {...iconProps} />;
    case "SAK_SATT_PA_VENT":
      return <ClockDashedIcon {...iconProps} />;
    case "SAK_SATT_I_BERO":
      return <ClockDashedIcon {...iconProps} />;
    case "SAK_GJENOPPTATT":
      return <ArrowUndoIcon {...iconProps} />;
    case "NOTAT_SENDT":
      return <DocPencilIcon {...iconProps} />;
    default:
      return <ClockIcon {...iconProps} />;
  }
}

const MAKS_SYNLIGE_HENDELSER = 5;

export function SakHistorikk({ sakId, hendelser }: SakHistorikkProps) {
  const [visAlle, setVisAlle] = useState(false);
  const { erÅpen, onÅpne, onLukk } = useDisclosure();
  const harFlere = hendelser.length > MAKS_SYNLIGE_HENDELSER;
  const synligeHendelser = visAlle ? hendelser : hendelser.slice(0, MAKS_SYNLIGE_HENDELSER);

  return (
    <Box padding="space-6" borderRadius="8" background="raised">
      <HStack justify="space-between" align="center" className="mb-3">
        <Heading level="2" size="small">
          Historikk
        </Heading>
        <Button
          variant="tertiary"
          size="small"
          icon={<PlusCircleIcon aria-hidden />}
          onClick={onÅpne}
        >
          Legg til
        </Button>
      </HStack>
      {hendelser.length === 0 ? (
        <BodyShort>Ingen historikk for denne saken.</BodyShort>
      ) : (
        <>
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
        </>
      )}
      <LeggTilHistorikkModal sakId={sakId} åpen={erÅpen} onClose={onLukk} />
    </Box>
  );
}
