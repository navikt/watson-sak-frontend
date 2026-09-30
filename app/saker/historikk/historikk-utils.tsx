import {
  ArchiveIcon,
  CheckmarkCircleIcon,
  ArrowRightIcon,
  ArrowUndoIcon,
  ClockDashedIcon,
  ClockIcon,
  DocPencilIcon,
  DownloadIcon,
  FilesIcon,
  GavelIcon,
  PaperplaneIcon,
  PencilIcon,
  PersonGroupIcon,
  PersonIcon,
  PlusCircleIcon,
  TasklistIcon,
  TrashIcon,
  XMarkOctagonIcon,
} from "@navikt/aksel-icons";
import { BodyShort, VStack } from "@navikt/ds-react";
import { formaterStatus } from "~/saker/visning";
import { formaterSteg } from "~/saker/visning";
import { NORSK_TIDSSONE } from "~/utils/date-utils";
import type { SakHendelse } from "./typer";

export function erManuellHendelse(hendelse: SakHendelse): boolean {
  return hendelse.hendelsesType === "MANUELL_HENDELSE";
}

/**
 * Bygger et oppslag fra hendelseId til foregående hendelse (kronologisk),
 * gitt en full, usortert/uslicet liste med hendelser (nyeste først).
 *
 * Trengs fordi backend kun sender ett generisk `SAK_STATUS_ENDRET` for både
 * stegendringer og arbeidsstatus(status)-endringer – vi må sammenligne
 * med forrige hendelse sitt steg/status-snapshot for å vite hva som
 * faktisk endret seg.
 */
export function lagForrigeHendelseKart(hendelser: SakHendelse[]): Map<string, SakHendelse> {
  const kart = new Map<string, SakHendelse>();
  let forrigeMedSnapshot: SakHendelse | undefined;

  for (let i = hendelser.length - 1; i >= 0; i--) {
    const hendelse = hendelser[i];
    if (forrigeMedSnapshot) {
      kart.set(hendelse.hendelseId, forrigeMedSnapshot);
    }
    if (hendelse.steg != null) {
      forrigeMedSnapshot = hendelse;
    }
  }
  return kart;
}

function diffStegOgStatus(hendelse: SakHendelse, forrigeHendelse?: SakHendelse) {
  const forrigeStatus = forrigeHendelse?.status ?? null;
  const normalisertStatus = hendelse.status ?? "AKTIV";
  const normalisertForrigeStatus = forrigeStatus ?? "AKTIV";
  return {
    stegEndret: !forrigeHendelse || hendelse.steg !== (forrigeHendelse.steg ?? null),
    statusEndret: !!forrigeHendelse && normalisertStatus !== normalisertForrigeStatus,
    forrigeStatus,
  };
}

function stegTittel(steg: SakHendelse["steg"]): string {
  if (steg === "UTREDNING" || steg === "FORVALTNING") {
    return `Sak til ${formaterSteg(steg).toLocaleLowerCase("nb-NO")}`;
  }
  return `Sak ${formaterSteg(steg).toLocaleLowerCase("nb-NO")}`;
}

function statusKortTittel(
  status: SakHendelse["status"],
  forrigeStatus: SakHendelse["status"],
): string {
  if (!status || status === "AKTIV") {
    return forrigeStatus === "I_BERO" ? "tatt ut av bero" : "gjenopptatt";
  }
  return status === "I_BERO" ? "satt i bero" : "satt på vent";
}

function stegOgStatusTittel(hendelse: SakHendelse, forrigeHendelse?: SakHendelse): string {
  const { stegEndret, statusEndret, forrigeStatus } = diffStegOgStatus(hendelse, forrigeHendelse);

  if (stegEndret) {
    return stegTittel(hendelse.steg);
  }
  if (statusEndret) {
    const kort = statusKortTittel(hendelse.status, forrigeStatus);
    return `Sak ${kort}`;
  }
  return stegTittel(hendelse.steg);
}

function stegOgStatusBeskrivelse(hendelse: SakHendelse, forrigeHendelse?: SakHendelse): string {
  const { statusEndret } = diffStegOgStatus(hendelse, forrigeHendelse);
  const deler: string[] = [];

  if (hendelse.hendelsesType !== "SAK_STATUS_ENDRET" && hendelse.beskrivelse) {
    deler.push(hendelse.beskrivelse);
  }

  if (statusEndret) {
    deler.push(hendelse.status ? `Status: ${formaterStatus(hendelse.status)}` : "Status: Aktiv");
  }

  deler.push(`Steg: ${formaterSteg(hendelse.steg)}`);

  return deler.join(hendelse.hendelsesType === "SAK_STATUS_ENDRET" ? "\n" : " – ");
}

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

export function hendelseTittel(hendelse: SakHendelse, forrigeHendelse?: SakHendelse): string {
  switch (hendelse.hendelsesType) {
    case "SAK_OPPRETTET":
      return "Sak opprettet";
    case "AVKLARING_OPPRETTET":
      return "Avklaring opprettet";
    case "SAK_TILDELT":
      return "Sak tildelt";
    case "SAK_REDIGERT":
      return "Saksdetaljer oppdatert";
    case "STATUS_ENDRET":
    case "SAK_STATUS_ENDRET":
      return stegOgStatusTittel(hendelse, forrigeHendelse);
    case "SAKSINFORMASJON_ENDRET":
      return "Saksinformasjon endret";
    case "MOTTAKSENHET_ENDRET":
      return "Mottaksenhet endret";
    case "VIDERESENDT_TIL_NAY_NFP":
      return "Videresendt til NAY/NFP";
    case "POLITIANMELDT":
      return "Politianmeldt";
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
      return hendelse.status === "I_BERO" ? "Sak tatt ut av bero" : "Sak gjenopptatt";
    case "MANUELL_HENDELSE":
      return hendelse.tittel ?? "Notat";
    case "NOTAT_SENDT":
      return "Notat opprettet i Gosys";
    case "JOURNALPOST_OPPRETTET":
      return "Journalpost opprettet";
    case "OPPGAVE_OPPRETTET":
      return "Oppgave opprettet";
    case "FIL_LASTET_OPP":
      return "Fil lastet opp";
    case "FIL_SLETTET":
      return "Fil slettet";
    case "FIL_OMDØPT":
      return "Filnavn endret";
    case "FIL_ÅPNET":
      return "Fil åpnet";
    case "FIL_ARKIVERT":
      return "Fil arkivert";
    default:
      return hendelse.hendelsesType;
  }
}

export function hendelseBeskrivelse(
  hendelse: SakHendelse,
  forrigeHendelse?: SakHendelse,
): string | null {
  if (hendelse.hendelsesType === "MANUELL_HENDELSE") {
    return hendelse.beskrivelse ?? null;
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

  if (hendelse.hendelsesType === "SAKSINFORMASJON_ENDRET") {
    return hendelse.beskrivelse ?? `Steg: ${formaterSteg(hendelse.steg)}`;
  }

  if (
    hendelse.hendelsesType === "STATUS_ENDRET" ||
    hendelse.hendelsesType === "SAK_STATUS_ENDRET"
  ) {
    return stegOgStatusBeskrivelse(hendelse, forrigeHendelse);
  }

  if (hendelse.hendelsesType === "POLITIANMELDT") {
    const deler: string[] = [];

    if (hendelse.beskrivelse) {
      deler.push(hendelse.beskrivelse);
    }

    deler.push(`Steg: ${formaterSteg(hendelse.steg)}`);

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
    hendelse.status
  ) {
    const deler = [
      `På vent: ${formaterStatus(hendelse.status)}`,
      `Steg: ${formaterSteg(hendelse.steg)}`,
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

  if (
    hendelse.hendelsesType === "FIL_LASTET_OPP" ||
    hendelse.hendelsesType === "FIL_SLETTET" ||
    hendelse.hendelsesType === "FIL_OMDØPT" ||
    hendelse.hendelsesType === "FIL_ÅPNET" ||
    hendelse.hendelsesType === "FIL_ARKIVERT"
  ) {
    return hendelse.beskrivelse ?? null;
  }

  return `Steg: ${formaterSteg(hendelse.steg)}`;
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
    case "SAK_STATUS_ENDRET":
      if (hendelse.steg === "POLITI" || hendelse.steg === "ANMELDT") {
        return <GavelIcon {...iconProps} />;
      }
      if (hendelse.status) return <ClockDashedIcon {...iconProps} />;
      return <ClockIcon {...iconProps} />;
    case "NOTAT_SENDT":
      return <DocPencilIcon {...iconProps} />;
    case "JOURNALPOST_OPPRETTET":
      return <DocPencilIcon {...iconProps} />;
    case "OPPGAVE_OPPRETTET":
      return <TasklistIcon {...iconProps} />;
    case "FIL_LASTET_OPP":
      return <FilesIcon {...iconProps} />;
    case "FIL_SLETTET":
      return <TrashIcon {...iconProps} />;
    case "FIL_OMDØPT":
      return <PencilIcon {...iconProps} />;
    case "FIL_ÅPNET":
      return <DownloadIcon {...iconProps} />;
    case "FIL_ARKIVERT":
      return <ArchiveIcon {...iconProps} />;
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
  const aktør = hendelse.opprettetAvNavn === "SYSTEM" ? null : hendelse.opprettetAvNavn;
  const innhold = (() => {
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
        {beskrivelse.split("\n").map((linje) => (
          <BodyShort key={linje} size="small">
            {linje}
          </BodyShort>
        ))}
      </VStack>
    );
  })();

  if (!aktør && !innhold) return null;

  return (
    <VStack gap="space-1">
      {innhold}
      {aktør && <BodyShort size="small">Utført av: {aktør}</BodyShort>}
    </VStack>
  );
}
