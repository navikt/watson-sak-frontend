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
  | "MOTTAKSENHET_ENDRET"
  | "VIDERESENDT_TIL_NAY_NFP"
  | "POLITIANMELDT"
  | "SAK_HENLAGT";

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
  return [...hendelser].sort(
    (a, b) => new Date(b.tidspunkt).getTime() - new Date(a.tidspunkt).getTime(),
  );
}

function lagSnapshotFraKontrollsak(
  sak: KontrollsakResponse,
): Omit<SakHendelse, "hendelseId" | "tidspunkt" | "hendelsesType" | "sakId"> {
  return {
    kategori: sak.kategori,
    prioritet: sak.prioritet,
    status: sak.status,
    ytelseTyper: sak.ytelser.map((ytelse) => ytelse.type),
    kilde: sak.bakgrunn?.kilde ?? null,
    avklaringResultat: sak.resultat?.avklaring?.resultat ?? null,
    mottakEnhet: sak.mottakEnhet,
  };
}

export function leggTilHendelse(
  sak: KontrollsakResponse,
  type: Exclude<BackendHendelsestype, "SAK_OPPRETTET" | "AVKLARING_OPPRETTET">,
  tidspunkt?: string,
) {
  return leggTilBackendHendelse(sak.id, type, lagSnapshotFraKontrollsak(sak), tidspunkt);
}

function genererHistorikk(saker: KontrollsakResponse[]) {
  for (const sak of saker) {
    leggTilBackendHendelse(sak.id, "SAK_OPPRETTET", lagSnapshotFraKontrollsak(sak), sak.opprettet);

    if (sak.resultat?.avklaring) {
      leggTilBackendHendelse(
        sak.id,
        "AVKLARING_OPPRETTET",
        lagSnapshotFraKontrollsak(sak),
        `${sak.resultat.avklaring.dato}T00:00:00Z`,
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
