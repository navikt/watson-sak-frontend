import type { KontrollsakResponse, KontrollsakStatus } from "~/saker/types.backend";
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
  | "MANUELL_HENDELSE"
  | "NOTAT_SENDT"
  | "JOURNALPOST_OPPRETTET"
  | "OPPGAVE_OPPRETTET"
  | "FIL_LASTET_OPP"
  | "FIL_SLETTET";

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
  overstyringer: Partial<
    Pick<SakHendelse, "status" | "blokkert" | "henleggelsesarsak" | "beskrivelse">
  > = {},
): Omit<SakHendelse, "hendelseId" | "tidspunkt" | "hendelsesType" | "sakId"> {
  return {
    kategori: sak.kategori,
    prioritet: sak.prioritet,
    status: sak.status,
    blokkert: sak.blokkert,
    henleggelsesarsak: sak.henleggelsesarsak,
    ytelseTyper: sak.ytelser.map((ytelse) => ytelse.type),
    ...overstyringer,
  };
}

export function leggTilHendelse(
  state: MockState,
  sak: KontrollsakResponse,
  type: Exclude<BackendHendelsestype, "SAK_OPPRETTET" | "AVKLARING_OPPRETTET" | "MANUELL_HENDELSE">,
  tidspunkt?: string,
  metadata?: Pick<
    SakHendelse,
    | "berortSaksbehandlerNavn"
    | "berortSaksbehandlerNavIdent"
    | "berortSaksbehandlerEnhet"
    | "blokkert"
    | "beskrivelse"
    | "tittel"
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
  beskrivelse: string,
  tidspunkt: string,
  opprettetAvNavIdent?: string,
): SakHendelse {
  const sakIdKey = String(sak.id);
  const hendelse: SakHendelse = {
    hendelseId: lagId(state),
    tidspunkt,
    hendelsesType: "MANUELL_HENDELSE",
    sakId: sak.id,
    tittel,
    beskrivelse,
    opprettetAvNavIdent,
    ...lagSnapshotFraKontrollsak(sak),
  };

  const eksisterende = state.historikk.get(sakIdKey) ?? [];
  eksisterende.push(hendelse);
  state.historikk.set(sakIdKey, eksisterende);

  return hendelse;
}

export function redigerManuellHendelse(
  state: MockState,
  sakId: string,
  hendelseId: string,
  tittel: string,
  beskrivelse: string,
  tidspunkt: string,
): SakHendelse | null {
  const hendelser = state.historikk.get(sakId) ?? [];
  const hendelse = hendelser.find(
    (h) => h.hendelseId === hendelseId && h.hendelsesType === "MANUELL_HENDELSE",
  );

  if (!hendelse) return null;

  hendelse.tittel = tittel;
  hendelse.beskrivelse = beskrivelse;
  hendelse.tidspunkt = tidspunkt;

  return hendelse;
}

export function slettManuellHendelse(state: MockState, sakId: string, hendelseId: string): boolean {
  const hendelser = state.historikk.get(sakId) ?? [];
  const index = hendelser.findIndex(
    (h) => h.hendelseId === hendelseId && h.hendelsesType === "MANUELL_HENDELSE",
  );

  if (index === -1) return false;

  hendelser.splice(index, 1);
  return true;
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
    tommeDokumentområder: new Set(),
    dokumenter: new Map(),
    dokumentInnhold: new Map(),
    dokumentHistorikk: new Map(),
    filer: new Map(),
    varsler: [],
    nesteFordelingssakId: 0,
    nesteHistorikkId: nesteId,
  };

  for (const sak of saker) {
    const opprettetSnapshot: Partial<
      Pick<SakHendelse, "status" | "blokkert" | "henleggelsesarsak">
    > = {
      status: "OPPRETTET",
      blokkert: null,
      henleggelsesarsak: null,
    };

    leggTilBackendHendelse(
      tempState,
      String(sak.id),
      "SAK_OPPRETTET",
      lagSnapshotFraKontrollsak(sak, opprettetSnapshot),
      sak.opprettet,
    );

    const tidspunkt = lagTidspunkter(sak);

    if (sak.saksbehandlere.eier) {
      leggTilBackendHendelse(
        tempState,
        String(sak.id),
        "SAK_TILDELT",
        lagSnapshotFraKontrollsak(sak, opprettetSnapshot),
        tidspunkt.tildelt,
      );
    }

    for (const saksbehandler of sak.saksbehandlere.deltMed) {
      leggTilBackendHendelse(
        tempState,
        String(sak.id),
        "TILGANG_DELT",
        {
          ...lagSnapshotFraKontrollsak(sak, opprettetSnapshot),
          berortSaksbehandlerNavn: saksbehandler.navn,
          berortSaksbehandlerNavIdent: saksbehandler.navIdent,
          berortSaksbehandlerEnhet: saksbehandler.enhet ?? undefined,
        },
        tidspunkt.delt,
      );
    }

    leggTilStatushistorikk(tempState, sak, tidspunkt);
  }

  return tempState.nesteHistorikkId;
}

function lagTidspunkter(sak: KontrollsakResponse) {
  const opprettet = new Date(sak.opprettet).getTime();
  const oppdatert = sak.oppdatert ? new Date(sak.oppdatert).getTime() : Number.NaN;
  const slutt =
    Number.isFinite(oppdatert) && oppdatert > opprettet
      ? oppdatert
      : opprettet + 4 * 60 * 60 * 1000;
  const tidspunktVed = (andel: number) =>
    new Date(opprettet + (slutt - opprettet) * andel).toISOString();

  return {
    tildelt: tidspunktVed(0.15),
    delt: tidspunktVed(0.25),
    utredes: tidspunktVed(0.5),
    avsluttet: tidspunktVed(1),
  };
}

function leggTilStatushistorikk(
  state: MockState,
  sak: KontrollsakResponse,
  tidspunkt: ReturnType<typeof lagTidspunkter>,
) {
  const sakId = String(sak.id);
  const leggTil = (
    type: BackendHendelsestype,
    status: KontrollsakStatus,
    hendelseTidspunkt: string,
    beskrivelse?: string,
  ) =>
    leggTilBackendHendelse(
      state,
      sakId,
      type,
      lagSnapshotFraKontrollsak(sak, {
        status,
        blokkert: type === "SAK_SATT_PA_VENT" || type === "SAK_SATT_I_BERO" ? sak.blokkert : null,
        henleggelsesarsak: type === "SAK_HENLAGT" ? sak.henleggelsesarsak : null,
        beskrivelse,
      }),
      hendelseTidspunkt,
    );

  if (sak.status === "OPPRETTET") {
    return;
  }

  leggTil("STATUS_ENDRET", "UTREDES", tidspunkt.utredes, "Saken er satt under utredning.");

  switch (sak.status) {
    case "UTREDES":
      if (sak.blokkert) {
        leggTil(
          sak.blokkert === "I_BERO" ? "SAK_SATT_I_BERO" : "SAK_SATT_PA_VENT",
          "UTREDES",
          tidspunkt.avsluttet,
          "Avventer nødvendig avklaring før arbeidet kan fortsette.",
        );
      }
      return;
    case "STRAFFERETTSLIG_VURDERING":
      leggTil(
        "STATUS_ENDRET",
        "STRAFFERETTSLIG_VURDERING",
        tidspunkt.avsluttet,
        "Saken er sendt til strafferettslig vurdering.",
      );
      return;
    case "ANMELDT":
      leggTil(
        "POLITIANMELDT",
        "ANMELDT",
        tidspunkt.avsluttet,
        "Forholdet er anmeldt til politiet.",
      );
      return;
    case "HENLAGT":
      leggTil("SAK_HENLAGT", "HENLAGT", tidspunkt.avsluttet, "Saken er henlagt etter vurdering.");
      return;
    case "AVSLUTTET":
      leggTil(
        "STATUS_ENDRET",
        "AVSLUTTET",
        tidspunkt.avsluttet,
        "Saken er ferdigbehandlet og avsluttet.",
      );
      return;
  }
}
