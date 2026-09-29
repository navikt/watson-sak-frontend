import { hentMockTillatteHandlinger } from "~/saker/mock-tillatte-handlinger.server";
import type {
  KontrollsakResponse,
  KontrollsakYtelse,
  TillatteHandlingerResponse,
} from "~/saker/types.backend";

export const dagpengerId = "00000000-0000-4000-8000-000000000001";
export const aapId = "00000000-0000-4000-8000-000000000002";

export function lagYtelse(overstyr: Partial<KontrollsakYtelse> = {}): KontrollsakYtelse {
  return {
    id: dagpengerId,
    type: "Dagpenger",
    periodeFra: "2025-01-01",
    periodeTil: "2025-06-30",
    belop: null,
    endeligBelop: null,
    ...overstyr,
  };
}

function lagSak(overstyr: Partial<KontrollsakResponse> = {}): KontrollsakResponse {
  return {
    id: 101,
    personIdent: "10987654321",
    personNavn: "Ola Nordmann",
    saksbehandlere: {
      eier: { navIdent: "Z123456", navn: "Sara Saksbehandler", enhet: "4812" },
      deltMed: [],
      opprettetAv: { navIdent: "Z654321", navn: "Kari Oppretter", enhet: "4812" },
    },
    steg: "UTREDNING",
    status: "AKTIV",
    kategori: "ARBEID",
    kilde: "NAV_KONTROLL",
    misbruktype: [],
    prioritet: "NORMAL",
    ytelser: [lagYtelse()],
    merking: [],
    arbeidsgivere: [],
    opprettet: "2026-02-03T10:11:12Z",
    oppdatert: null,
    oppgaver: [],
    kobledeSaker: [],
    dokumenter: [],
    adresseskjermet: false,
    gjeldendePersonIdent: null,
    historiskeIdenter: [],
    ...overstyr,
  };
}

/** Tillatte handlinger slik mock-backenden beregner dem for saken. */
export function lagTillatteHandlinger(
  overstyr: Partial<KontrollsakResponse> = {},
): TillatteHandlingerResponse {
  return hentMockTillatteHandlinger(lagSak(overstyr));
}
