import {
  CheckmarkCircleIcon,
  ArrowRightIcon,
  ArrowUndoIcon,
  ClockDashedIcon,
  ClockIcon,
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
import { useDisclosure } from "~/use-disclosure/useDisclosure";
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
    case "YTELSE_STANSET":
      return "Ytelse stanset";
    case "SAK_SATT_I_BERO":
      return "Sak satt i bero";
    case "SAK_GJENOPPTATT":
      return "Sak gjenopptatt";
    case "MANUELL_NOTAT":
      return hendelse.tittel ?? "Notat";
    default:
      return hendelse.hendelsesType;
  }
}

function hendelseBeskrivelse(hendelse: SakHendelse): string | null {
  if (hendelse.hendelsesType === "MANUELL_NOTAT") {
    return hendelse.notat ?? null;
  }

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
      return <PersonGroupIcon {...iconProps} />;
    case "YTELSE_STANSET":
      return <XMarkOctagonIcon {...iconProps} />;
    case "SAK_SATT_I_BERO":
      return <ClockDashedIcon {...iconProps} />;
    case "SAK_GJENOPPTATT":
      return <ArrowUndoIcon {...iconProps} />;
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
                    {hendelse.hendelsesType !== "MANUELL_NOTAT" && (
                      <BodyShort size="small" className="text-ax-text-neutral-subtle">
                        {`${formaterTekst(hendelse.kategori)} · ${formaterTekst(hendelse.prioritet)}`}
                      </BodyShort>
                    )}
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
