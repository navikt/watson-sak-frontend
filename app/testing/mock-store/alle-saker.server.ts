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
  // I demo bruker mockdata "Z999999" som eier, mens innlogget bruker har sin
  // ekte Azure-ident. Normaliser slik at begge behandles som samme bruker.
  const effektivIdent = normaliserTilMockIdent(navIdent);
  return hentAlleSaker(state).filter((sak) => sak.saksbehandlere.eier?.navIdent === effektivIdent);
}

/**
 * Mapper innlogget brukers navIdent til mock-identen brukt i testdata.
 * I local-mock er identen allerede "Z999999". I demo (Azure AD) er den noe
 * annet, men representerer samme bruker — så vi normaliserer til mock-identen.
 */
function normaliserTilMockIdent(navIdent: string): string {
  // Alle mock-saker er eid av mockMineSakerInnloggetNavIdent.
  // Enhver annen ident som ikke finnes i mockdata behandles som innlogget bruker.
  return navIdent === mockMineSakerInnloggetNavIdent ? navIdent : mockMineSakerInnloggetNavIdent;
}

export function hentSakMedReferanse(
  state: MockState,
  sakId: string,
): KontrollsakResponse | undefined {
  return finnSakMedReferanse(hentAlleSaker(state), sakId);
}

export function hentAvslutningsdatoer(state: MockState): Record<string, string> {
  const avslutningsdatoer: Record<string, string> = { ...mockMineSakerAvslutningsdatoer };

  for (const sak of hentAlleSaker(state)) {
    if (
      (sak.status === "AVSLUTTET" || sak.status === "HENLAGT") &&
      avslutningsdatoer[String(sak.id)] === undefined
    ) {
      avslutningsdatoer[String(sak.id)] = (sak.oppdatert ?? sak.opprettet).slice(0, 10);
    }
  }

  return avslutningsdatoer;
}
