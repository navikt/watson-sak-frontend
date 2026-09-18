import type { Anker, Kommentar, Kommentarliste, Kommentartraad } from "./typer";
import { ANKER_VERSJON } from "./typer";

/**
 * Testfikstur som speiler backendens `KommentarTraadResponse` etter
 * Zod-transformasjonen. Samlet her slik at alle tester bruker samme,
 * kontraktriktige form – og slik at et kontraktbrudd bare må rettes ett sted.
 */

export const TEKSTANKER: Anker = {
  type: "TEXT",
  nodeId: "blokk-1",
  path: [1],
  startOffset: 18,
  sluttOffset: 30,
  exact: "viktig poeng",
  prefix: "Brødtekst med et ",
  suffix: ".",
};

export function lagKommentar(overstyringer: Partial<Kommentar> = {}): Kommentar {
  const opprettet = overstyringer.opprettet ?? "2026-03-01T09:00:00Z";
  return {
    id: "22222222-2222-4222-8222-222222222222",
    traadId: "11111111-1111-4111-8111-111111111111",
    erRot: true,
    tekst: "Dette bør presiseres.",
    forfatterIdent: "Z999999",
    forfatterNavn: "Test Saksbehandler",
    opprettet,
    endret: opprettet,
    versjon: 1,
    erEgen: true,
    ...overstyringer,
  };
}

export function lagTraad(overstyringer: Partial<Kommentartraad> = {}): Kommentartraad {
  const resolved = overstyringer.resolved ?? null;
  return {
    id: "11111111-1111-4111-8111-111111111111",
    dokumentId: "d1",
    ankertype: "TEXT",
    anker: TEKSTANKER,
    ankerVersjon: ANKER_VERSJON,
    opprinneligSitat: "viktig poeng",
    opprettetAvIdent: "Z999999",
    opprettetAvNavn: "Test Saksbehandler",
    opprettet: "2026-03-01T09:00:00Z",
    resolved,
    // `adressert` er avledet av `resolved`, akkurat som i Zod-transformasjonen.
    adressert: resolved !== null,
    resolvedAvIdent: null,
    resolvedAvNavn: null,
    versjon: 1,
    synlig: true,
    kommentarer: [lagKommentar()],
    ...overstyringer,
    ...(overstyringer.resolved !== undefined ? { adressert: overstyringer.resolved !== null } : {}),
  };
}

export function lagListe(overstyringer: Partial<Kommentarliste> = {}): Kommentarliste {
  return {
    dokumentId: "d1",
    arkivert: null,
    kanKommentere: true,
    traader: [lagTraad()],
    ...overstyringer,
  };
}
