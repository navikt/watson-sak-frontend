import { mockKontrollsaker } from "~/testing/mock-store/saker/fordeling.server";
import { mockMineKontrollsaker } from "~/testing/mock-store/saker/mine-saker.server";
import type { KontrollsakResponse } from "~/saker/types.backend";
import type { SakHendelse } from "~/saker/historikk/typer";

const historikkMap = new Map<string, SakHendelse[]>();

type BackendHendelsestype =
  | "SAK_OPPRETTET"
  | "AVKLARING_OPPRETTET"
  | "SAK_TILDELT"
  | "STATUS_ENDRET"
  | "SAKSINFORMASJON_ENDRET"
  | "MOTTAKSENHET_ENDRET"
  | "VIDERESENDT_TIL_NAY_NFP"
  | "POLITIANMELDT"
  | "SAK_HENLAGT"
  | "TILGANG_DELT"
  | "TILGANG_FJERNET"
  | "ANSVARLIG_SAKSBEHANDLER_ENDRET"
  | "YTELSE_STANSET"
  | "SAK_SATT_PA_VENT"
  | "SAK_SATT_I_BERO"
  | "SAK_GJENOPPTATT"
  | "MANUELL_NOTAT"
  | "NOTAT_SENDT";

let nesteId = 1;

function lagId(): string {
  return `00000000-0000-4000-8000-${String(nesteId++).padStart(12, "0")}`;
}

function leggTilBackendHendelse(
  sakId: string,
  type: BackendHendelsestype,
  snapshot: Omit<SakHendelse, "hendelseId" | "tidspunkt" | "hendelsesType" | "sakId">,
  tidspunkt?: string,
): SakHendelse {
  const hendelse: SakHendelse = {
    hendelseId: lagId(),
    tidspunkt: tidspunkt ?? new Date().toISOString(),
    hendelsesType: type,
    sakId,
    ...snapshot,
  };

  const eksisterende = historikkMap.get(sakId) ?? [];
  eksisterende.push(hendelse);
  historikkMap.set(sakId, eksisterende);

  return hendelse;
}

/** Hent historikken for en sak, sortert med nyeste først */
export function hentHistorikk(sakId: string): SakHendelse[] {
  const hendelser = historikkMap.get(sakId) ?? [];
  return [...hendelser].sort((a, b) => {
    const tidspunktSortering = new Date(b.tidspunkt).getTime() - new Date(a.tidspunkt).getTime();

    if (tidspunktSortering !== 0) {
      return tidspunktSortering;
    }

    return b.hendelseId.localeCompare(a.hendelseId);
  });
}

function lagSnapshotFraKontrollsak(
  sak: KontrollsakResponse,
): Omit<SakHendelse, "hendelseId" | "tidspunkt" | "hendelsesType" | "sakId"> {
  return {
    kategori: sak.kategori,
    prioritet: sak.prioritet,
    status: sak.status,
    blokkert: sak.blokkert,
    ytelseTyper: sak.ytelser.map((ytelse) => ytelse.type),
  };
}

export function leggTilHendelse(
  sak: KontrollsakResponse,
  type: Exclude<BackendHendelsestype, "SAK_OPPRETTET" | "AVKLARING_OPPRETTET" | "MANUELL_NOTAT">,
  tidspunkt?: string,
  metadata?: Pick<
    SakHendelse,
    | "berortSaksbehandlerNavn"
    | "berortSaksbehandlerNavIdent"
    | "berortSaksbehandlerEnhet"
    | "blokkert"
    | "beskrivelse"
  >,
) {
  return leggTilBackendHendelse(
    sak.id,
    type,
    {
      ...lagSnapshotFraKontrollsak(sak),
      ...metadata,
    },
    tidspunkt,
  );
}

export function leggTilManuellHendelse(
  sak: KontrollsakResponse,
  tittel: string,
  notat: string,
  tidspunkt: string,
): SakHendelse {
  const hendelse: SakHendelse = {
    hendelseId: lagId(),
    tidspunkt,
    hendelsesType: "MANUELL_NOTAT",
    sakId: sak.id,
    tittel,
    notat,
    ...lagSnapshotFraKontrollsak(sak),
  };

  const eksisterende = historikkMap.get(sak.id) ?? [];
  eksisterende.push(hendelse);
  historikkMap.set(sak.id, eksisterende);

  return hendelse;
}

function genererHistorikk(saker: KontrollsakResponse[]) {
  for (const sak of saker) {
    leggTilBackendHendelse(sak.id, "SAK_OPPRETTET", lagSnapshotFraKontrollsak(sak), sak.opprettet);

    if (sak.resultat?.utredning) {
      leggTilBackendHendelse(
        sak.id,
        "AVKLARING_OPPRETTET",
        lagSnapshotFraKontrollsak(sak),
        sak.resultat.utredning.opprettet,
      );
    }
  }
}

genererHistorikk(mockKontrollsaker);
genererHistorikk(mockMineKontrollsaker);

/** Tilbakestill historikk til opprinnelig tilstand */
export function resetHistorikk() {
  historikkMap.clear();
  nesteId = 1;
  genererHistorikk(mockKontrollsaker);
  genererHistorikk(mockMineKontrollsaker);
}
