import type { KontrollsakResponse } from "~/saker/types.backend";
import { finnSakMedReferanse } from "~/saker/id";
import { mockKontrollsaker } from "./saker/fordeling.server";
import {
  mockMineKontrollsaker,
  mockMineSakerAvslutningsdatoer,
  mockMineSakerInnloggetNavIdent,
} from "./saker/mine-saker.server";
export { leggTilMockSakIFordeling } from "./saker/fordeling.server";

export function hentAlleSaker(): KontrollsakResponse[] {
  return [...hentFordelingssaker(), ...hentAlleMineSaker()];
}

export function hentFordelingssaker(): KontrollsakResponse[] {
  return mockKontrollsaker;
}

function hentAlleMineSaker(): KontrollsakResponse[] {
  return mockMineKontrollsaker;
}

export function hentMineSaker(
  navIdent: string = mockMineSakerInnloggetNavIdent,
): KontrollsakResponse[] {
  return hentAlleSaker().filter((sak) => sak.saksbehandlere.eier?.navIdent === navIdent);
}

export function hentSakMedReferanse(sakId: string): KontrollsakResponse | undefined {
  return finnSakMedReferanse(hentAlleSaker(), sakId);
}

export function hentAvslutningsdatoer(): Record<string, string> {
  const avslutningsdatoer = { ...mockMineSakerAvslutningsdatoer };

  for (const sak of hentAlleSaker()) {
    if (
      (sak.status === "AVSLUTTET" || sak.status === "HENLAGT") &&
      avslutningsdatoer[sak.id] === undefined
    ) {
      avslutningsdatoer[sak.id] = (sak.oppdatert ?? sak.opprettet).slice(0, 10);
    }
  }

  return avslutningsdatoer;
}
