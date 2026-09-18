import {
  ArchiveIcon,
  ChatIcon,
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
import { BodyShort, Link, VStack } from "@navikt/ds-react";
import { Link as RouterLink } from "react-router";
import { byggKommentarLenke } from "~/saker/filer/dokument/kommentarer/lenker";
import { getSaksreferanse } from "~/saker/id";
import {
  formaterBlokkeringsarsak,
  formaterHenleggelsesarsak,
  formaterStatus,
} from "~/saker/visning";
import { NORSK_TIDSSONE } from "~/utils/date-utils";
import type { KommentarAktivitet, SakHendelse } from "./typer";

export function erManuellHendelse(hendelse: SakHendelse): boolean {
  return hendelse.hendelsesType === "MANUELL_HENDELSE";
}

/**
 * Bygger et oppslag fra hendelseId til foregående hendelse (kronologisk),
 * gitt en full, usortert/uslicet liste med hendelser (nyeste først).
 *
 * Trengs fordi backend kun sender ett generisk `SAK_STATUS_ENDRET` for både
 * statusendringer og arbeidsstatus(blokkering)-endringer – vi må sammenligne
 * med forrige hendelse sin status/blokkert-snapshot for å vite hva som
 * faktisk endret seg.
 */
export function lagForrigeHendelseKart(hendelser: SakHendelse[]): Map<string, SakHendelse> {
  const kart = new Map<string, SakHendelse>();
  for (let i = 0; i < hendelser.length - 1; i++) {
    kart.set(hendelser[i].hendelseId, hendelser[i + 1]);
  }
  return kart;
}

function diffStatusOgArbeidsstatus(hendelse: SakHendelse, forrigeHendelse?: SakHendelse) {
  const forrigeBlokkert = forrigeHendelse?.blokkert ?? null;
  return {
    statusEndret: !forrigeHendelse || hendelse.status !== (forrigeHendelse.status ?? null),
    arbeidsstatusEndret: !!forrigeHendelse && (hendelse.blokkert ?? null) !== forrigeBlokkert,
    forrigeBlokkert,
  };
}

function statusTittel(status: SakHendelse["status"]): string {
  return `Sak ${formaterStatus(status).toLocaleLowerCase("nb-NO")}`;
}

function arbeidsstatusKortTittel(
  blokkert: SakHendelse["blokkert"],
  forrigeBlokkert: SakHendelse["blokkert"],
): string {
  if (!blokkert) {
    return forrigeBlokkert === "I_BERO" ? "tatt ut av bero" : "gjenopptatt";
  }
  return blokkert === "I_BERO" ? "satt i bero" : "satt på vent";
}

function statusOgArbeidsstatusTittel(hendelse: SakHendelse, forrigeHendelse?: SakHendelse): string {
  const { statusEndret, arbeidsstatusEndret, forrigeBlokkert } = diffStatusOgArbeidsstatus(
    hendelse,
    forrigeHendelse,
  );

  if (statusEndret && arbeidsstatusEndret) {
    return `${statusTittel(hendelse.status)} og ${arbeidsstatusKortTittel(hendelse.blokkert, forrigeBlokkert)}`;
  }
  if (arbeidsstatusEndret) {
    const kort = arbeidsstatusKortTittel(hendelse.blokkert, forrigeBlokkert);
    return `Sak ${kort}`;
  }
  return statusTittel(hendelse.status);
}

function statusOgArbeidsstatusBeskrivelse(
  hendelse: SakHendelse,
  forrigeHendelse?: SakHendelse,
): string {
  const { arbeidsstatusEndret } = diffStatusOgArbeidsstatus(hendelse, forrigeHendelse);
  const deler: string[] = [];

  if (hendelse.beskrivelse) {
    deler.push(hendelse.beskrivelse);
  }

  if (arbeidsstatusEndret) {
    deler.push(
      hendelse.blokkert
        ? `Arbeidsstatus: ${formaterBlokkeringsarsak(hendelse.blokkert)}`
        : "Arbeidsstatus: Aktiv",
    );
  }

  deler.push(`Status: ${formaterStatus(hendelse.status)}`);

  return deler.join(" – ");
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
    case "STATUS_ENDRET":
    case "SAK_STATUS_ENDRET":
      return statusOgArbeidsstatusTittel(hendelse, forrigeHendelse);
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
    case "DOKUMENT_KOMMENTAR_OPPRETTET":
      return "Kommenterte dokument";
    case "DOKUMENT_KOMMENTAR_SVAR":
      return "Svarte på kommentarer";
    case "DOKUMENT_KOMMENTAR_ADRESSERT":
      return "Adresserte kommentarer";
    case "DOKUMENT_KOMMENTAR_GJENAAPNET":
      return "Gjenåpnet kommentarer";
    // Fanger en eventuell samlet gruppetype fra backend.
    case "DOKUMENT_KOMMENTARER":
    case "DOKUMENT_KOMMENTERT":
      return "Kommentaraktivitet på dokument";
    default:
      return hendelse.hendelsesType;
  }
}

/**
 * Kommentarhendelser gjenkjennes på at backend har fylt `kommentarAktivitet`,
 * ikke på hendelsestypen. Da tåler frontend at backend legger til flere
 * kommentartyper uten at vi må endre koden.
 */
function erKommentarhendelse(
  hendelse: SakHendelse,
): hendelse is SakHendelse & { kommentarAktivitet: KommentarAktivitet } {
  return !!hendelse.kommentarAktivitet;
}

/**
 * Kommentar- og kommentarløsningsaktivitet logges som egne hendelser, men
 * skal ikke vises i sakshistorikken – de er allerede synlige der
 * kommentarene lever (dokumentets kommentarpanel), og gjør historikklisten
 * masete når saksbehandlere kommenterer/adresserer mye.
 */
export function skalVisesIHistorikk(hendelse: SakHendelse): boolean {
  return !erKommentarhendelse(hendelse);
}

export function hendelseBeskrivelse(
  hendelse: SakHendelse,
  forrigeHendelse?: SakHendelse,
): string | null {
  if (erKommentarhendelse(hendelse)) {
    // Backend har allerede formulert setningen, og den inneholder aldri
    // kommentarinnhold. Vi viser den som den er i stedet for å bygge vår egen.
    return hendelse.kommentarAktivitet.visningstekst;
  }

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
    return hendelse.beskrivelse ?? `Status: ${formaterStatus(hendelse.status)}`;
  }

  if (
    hendelse.hendelsesType === "STATUS_ENDRET" ||
    hendelse.hendelsesType === "SAK_STATUS_ENDRET"
  ) {
    return statusOgArbeidsstatusBeskrivelse(hendelse, forrigeHendelse);
  }

  if (hendelse.hendelsesType === "SAK_HENLAGT") {
    const deler: string[] = [`Status: ${formaterStatus(hendelse.status)}`];

    if (hendelse.beskrivelse) {
      deler.push(hendelse.beskrivelse);
    }

    return deler.join(" – ");
  }

  if (hendelse.hendelsesType === "POLITIANMELDT") {
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

  if (
    hendelse.hendelsesType === "FIL_LASTET_OPP" ||
    hendelse.hendelsesType === "FIL_SLETTET" ||
    hendelse.hendelsesType === "FIL_OMDØPT" ||
    hendelse.hendelsesType === "FIL_ÅPNET" ||
    hendelse.hendelsesType === "FIL_ARKIVERT"
  ) {
    return hendelse.beskrivelse ?? null;
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
    case "SAK_STATUS_ENDRET":
      if (hendelse.status === "HENLAGT") return <XMarkOctagonIcon {...iconProps} />;
      if (hendelse.status === "ANMELDT") return <GavelIcon {...iconProps} />;
      if (hendelse.blokkert) return <ClockDashedIcon {...iconProps} />;
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
    case "DOKUMENT_KOMMENTAR_OPPRETTET":
    case "DOKUMENT_KOMMENTAR_SVAR":
    case "DOKUMENT_KOMMENTARER":
    case "DOKUMENT_KOMMENTERT":
      return <ChatIcon {...iconProps} />;
    case "DOKUMENT_KOMMENTAR_ADRESSERT":
      return <CheckmarkCircleIcon {...iconProps} />;
    case "DOKUMENT_KOMMENTAR_GJENAAPNET":
      return <ArrowUndoIcon {...iconProps} />;
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
  if (erKommentarhendelse(hendelse) && hendelse.sakId) {
    // Gruppert aktivitet har ingen trådId, så lenken åpner dokumentets
    // kommentarpanel uten å peke på en enkelt tråd.
    return (
      <VStack gap="space-2">
        {beskrivelse && <BodyShort size="small">{beskrivelse}</BodyShort>}
        <Link
          as={RouterLink}
          to={byggKommentarLenke(
            getSaksreferanse(hendelse.sakId),
            hendelse.kommentarAktivitet.dokumentId,
          )}
        >
          Åpne kommentarene
        </Link>
      </VStack>
    );
  }

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

  if (
    hendelse.hendelsesType === "SAK_HENLAGT" ||
    (hendelse.hendelsesType === "SAK_STATUS_ENDRET" && hendelse.status === "HENLAGT")
  ) {
    return (
      <VStack gap="space-1">
        {beskrivelse && <BodyShort size="small">{beskrivelse}</BodyShort>}
        {hendelse.henleggelsesarsak && (
          <BodyShort size="small">
            Årsak: {formaterHenleggelsesarsak(hendelse.henleggelsesarsak)}
          </BodyShort>
        )}
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
