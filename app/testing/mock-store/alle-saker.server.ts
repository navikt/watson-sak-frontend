import type { KontrollsakResponse } from "~/saker/types.backend";
import { finnSakMedReferanse } from "~/saker/id";
import {
  mockMineSakerAvslutningsdatoer,
  mockMineSakerInnloggetNavIdent,
} from "./saker/mine-saker.server";
import type { MockState } from "./session.server";
export { leggTilMockSakIFordeling } from "./saker/fordeling.server";

export function hentAlleSaker(state: MockState): KontrollsakResponse[] {
  return [...state.kontrollsaker, ...state.mineKontrollsaker];
}

export function hentFordelingssaker(state: MockState): KontrollsakResponse[] {
  return state.kontrollsaker;
}

export function hentMineSaker(
  state: MockState,
  navIdent: string = mockMineSakerInnloggetNavIdent,
): KontrollsakResponse[] {
  return hentAlleSaker(state).filter((sak) => sak.saksbehandlere.eier?.navIdent === navIdent);
}

export function hentSakMedReferanse(
  state: MockState,
  sakId: string,
): KontrollsakResponse | undefined {
  return finnSakMedReferanse(hentAlleSaker(state), sakId);
}

export function hentAvslutningsdatoer(state: MockState): Record<string, string> {
  const avslutningsdatoer = { ...mockMineSakerAvslutningsdatoer };

  for (const sak of hentAlleSaker(state)) {
    if (
      (sak.status === "AVSLUTTET" || sak.status === "HENLAGT") &&
      avslutningsdatoer[sak.id] === undefined
    ) {
      avslutningsdatoer[sak.id] = (sak.oppdatert ?? sak.opprettet).slice(0, 10);
    }
  }

  return avslutningsdatoer;
}
