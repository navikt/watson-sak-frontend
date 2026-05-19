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
  TasklistIcon,
  XMarkOctagonIcon,
} from "@navikt/aksel-icons";
import { BodyShort, VStack } from "@navikt/ds-react";
import { formaterBlokkeringsarsak, formaterStatus } from "~/saker/visning";
import { NORSK_TIDSSONE } from "~/utils/date-utils";
import type { SakHendelse } from "./typer";

export function formaterTidspunkt(isoString: string): string {
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

export function hendelseTittel(hendelse: SakHendelse): string {
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
    case "JOURNALPOST_OPPRETTET":
      return "Journalpost opprettet";
    case "OPPGAVE_OPPRETTET":
      return "Oppgave opprettet";
    default:
      return hendelse.hendelsesType;
  }
}

export function hendelseBeskrivelse(hendelse: SakHendelse): string | null {
  if (hendelse.hendelsesType === "MANUELL_NOTAT") {
    return hendelse.notat ?? null;
  }

  if (hendelse.hendelsesType === "NOTAT_SENDT") {
    return hendelse.beskrivelse ?? null;
  }

  if (
    hendelse.hendelsesType === "JOURNALPOST_OPPRETTET" ||
    hendelse.hendelsesType === "OPPGAVE_OPPRETTET"
  ) {
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

export function HendelseBullet({ hendelse }: { hendelse: SakHendelse }) {
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
    case "JOURNALPOST_OPPRETTET":
      return <DocPencilIcon {...iconProps} />;
    case "OPPGAVE_OPPRETTET":
      return <TasklistIcon {...iconProps} />;
    default:
      return <ClockIcon {...iconProps} />;
  }
}

export function HendelseInnhold({
  hendelse,
  beskrivelse,
}: {
  hendelse: SakHendelse;
  beskrivelse: string | null;
}) {
  if (
    (hendelse.hendelsesType === "JOURNALPOST_OPPRETTET" ||
      hendelse.hendelsesType === "OPPGAVE_OPPRETTET") &&
    hendelse.tittel
  ) {
    return (
      <VStack gap="space-1">
        <BodyShort size="small" weight="semibold">
          {hendelse.tittel}
        </BodyShort>
        {hendelse.beskrivelse && <BodyShort size="small">{hendelse.beskrivelse}</BodyShort>}
      </VStack>
    );
  }

  if (!beskrivelse) return null;

  return (
    <VStack gap="space-1">
      <BodyShort size="small">{beskrivelse}</BodyShort>
    </VStack>
  );
}
