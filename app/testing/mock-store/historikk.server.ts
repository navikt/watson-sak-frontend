import type { KontrollsakResponse } from "~/saker/types.backend";
import type { SakHendelse } from "~/saker/historikk/typer";
import type { MockState } from "./session.server";

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

function lagId(state: MockState): string {
  return `00000000-0000-4000-8000-${String(state.nesteHistorikkId++).padStart(12, "0")}`;
}

function leggTilBackendHendelse(
  state: MockState,
  sakId: string,
  type: BackendHendelsestype,
  snapshot: Omit<SakHendelse, "hendelseId" | "tidspunkt" | "hendelsesType" | "sakId">,
  tidspunkt?: string,
): SakHendelse {
  const numeriskSakId = Number(sakId);
  const hendelse: SakHendelse = {
    hendelseId: lagId(state),
    tidspunkt: tidspunkt ?? new Date().toISOString(),
    hendelsesType: type,
    sakId: Number.isNaN(numeriskSakId) ? null : numeriskSakId,
    ...snapshot,
  };

  const eksisterende = state.historikk.get(sakId) ?? [];
  eksisterende.push(hendelse);
  state.historikk.set(sakId, eksisterende);

  return hendelse;
}

/** Hent historikken for en sak, sortert med nyeste først */
export function hentHistorikk(state: MockState, sakId: string): SakHendelse[] {
  const hendelser = state.historikk.get(sakId) ?? [];
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
  state: MockState,
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
    state,
    String(sak.id),
    type,
    {
      ...lagSnapshotFraKontrollsak(sak),
      ...metadata,
    },
    tidspunkt,
  );
}

export function leggTilManuellHendelse(
  state: MockState,
  sak: KontrollsakResponse,
  tittel: string,
  notat: string,
  tidspunkt: string,
): SakHendelse {
  const sakIdKey = String(sak.id);
  const hendelse: SakHendelse = {
    hendelseId: lagId(state),
    tidspunkt,
    hendelsesType: "MANUELL_NOTAT",
    sakId: sak.id,
    tittel,
    notat,
    ...lagSnapshotFraKontrollsak(sak),
  };

  const eksisterende = state.historikk.get(sakIdKey) ?? [];
  eksisterende.push(hendelse);
  state.historikk.set(sakIdKey, eksisterende);

  return hendelse;
}

/** Generer initial historikk for et sett med saker. Returnerer oppdatert nesteId. */
export function genererHistorikkForSaker(
  saker: KontrollsakResponse[],
  historikk: Map<string, SakHendelse[]>,
  nesteId: number,
): number {
  const tempState: MockState = {
    kontrollsaker: [],
    mineKontrollsaker: [],
    historikk,
    tommeFilområder: new Set(),
    varsler: [],
    nesteFordelingssakId: 0,
    nesteHistorikkId: nesteId,
  };

  for (const sak of saker) {
    leggTilBackendHendelse(
      tempState,
      String(sak.id),
      "SAK_OPPRETTET",
      lagSnapshotFraKontrollsak(sak),
      sak.opprettet,
    );
  }

  return tempState.nesteHistorikkId;
}
