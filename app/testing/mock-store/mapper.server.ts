import type { MappeResponse } from "~/saker/filer/typer";
import { byttPrefiks, erLikEllerUnder, forfedre } from "~/saker/filer/mapper/mappesti";
import { hentDokumenttreForSak } from "./dokumenter.server";
import { hentFilerForSak } from "./filer.server";
import type { MockState } from "./session.server";

/** Resultatet av en mappeoperasjon. Statuskodene speiler watson-admin-api. */
export type MappeResultat = { ok: true } | { ok: false; status: 400 | 404 | 409; melding: string };

/**
 * Første gang mappene på en sak hentes, opprettes mappene som seedede dokumenter og filer
 * allerede ligger i. Da har mappevisningen innhold lokalt uten egne mappeseeds.
 */
function hentEllerSeed(state: MockState, sakId: string): MappeResponse[] {
  const eksisterende = state.mapper.get(sakId);
  if (eksisterende) return eksisterende;

  const mapper: MappeResponse[] = [];
  const brukteMapper = [
    ...hentDokumenttreForSak(state, sakId).map((dokument) => dokument.mappe),
    ...hentFilerForSak(state, sakId).map((fil) => fil.mappe),
  ];
  for (const sti of brukteMapper) {
    if (sti) leggTilMedForfedre(mapper, sti, "Ola Nordmann");
  }
  state.mapper.set(sakId, mapper);
  return mapper;
}

function finnes(mapper: MappeResponse[], sti: string): boolean {
  return mapper.some((mappe) => mappe.sti === sti);
}

function leggTilMedForfedre(mapper: MappeResponse[], sti: string, opprettetAv: string) {
  for (const kandidat of [...forfedre(sti), sti]) {
    if (!finnes(mapper, kandidat)) {
      mapper.push({ sti: kandidat, opprettetAv, opprettet: new Date().toISOString() });
    }
  }
}

export function hentMapperForSak(state: MockState, sakId: string): MappeResponse[] {
  return [...hentEllerSeed(state, sakId)].sort((a, b) => a.sti.localeCompare(b.sti, "nb"));
}

export function opprettMappe(
  state: MockState,
  sakId: string,
  sti: string,
  opprettetAv: string,
): MappeResultat {
  const mapper = hentEllerSeed(state, sakId);
  if (finnes(mapper, sti)) {
    return { ok: false, status: 409, melding: "Det finnes allerede en mappe med dette navnet" };
  }
  leggTilMedForfedre(mapper, sti, opprettetAv);
  return { ok: true };
}

/** Gir mappen nytt navn eller flytter den. Undermapper, dokumenter og filer følger med. */
export function endreMappe(
  state: MockState,
  sakId: string,
  fraSti: string,
  tilSti: string,
  endretAv: string,
): MappeResultat {
  const mapper = hentEllerSeed(state, sakId);
  if (!finnes(mapper, fraSti)) {
    return { ok: false, status: 404, melding: "Mappen finnes ikke" };
  }
  if (erLikEllerUnder(tilSti, fraSti)) {
    return { ok: false, status: 400, melding: "En mappe kan ikke flyttes inn i seg selv" };
  }
  if (mapper.some((mappe) => erLikEllerUnder(mappe.sti, tilSti))) {
    return { ok: false, status: 409, melding: "Det finnes allerede en mappe med dette navnet" };
  }

  for (const mappe of mapper) {
    mappe.sti = byttPrefiks(mappe.sti, fraSti, tilSti);
  }
  leggTilMedForfedre(mapper, tilSti, endretAv);
  for (const dokument of hentDokumenttreForSak(state, sakId)) {
    if (dokument.mappe) dokument.mappe = byttPrefiks(dokument.mappe, fraSti, tilSti);
  }
  for (const fil of hentFilerForSak(state, sakId)) {
    if (fil.mappe) fil.mappe = byttPrefiks(fil.mappe, fraSti, tilSti);
  }
  return { ok: true };
}

/** Sletter en tom mappe. Mapper med innhold eller undermapper avvises med 409. */
export function slettMappe(state: MockState, sakId: string, sti: string): MappeResultat {
  const mapper = hentEllerSeed(state, sakId);
  const indeks = mapper.findIndex((mappe) => mappe.sti === sti);
  if (indeks === -1) {
    return { ok: false, status: 404, melding: "Mappen finnes ikke" };
  }
  const harUndermapper = mapper.some(
    (mappe) => mappe.sti !== sti && erLikEllerUnder(mappe.sti, sti),
  );
  const harDokumenter = hentDokumenttreForSak(state, sakId).some(
    (dokument) => !dokument.arkivert && dokument.mappe === sti,
  );
  const harFiler = hentFilerForSak(state, sakId).some((fil) => !fil.arkivert && fil.mappe === sti);
  if (harUndermapper || harDokumenter || harFiler) {
    return { ok: false, status: 409, melding: "Bare tomme mapper kan slettes" };
  }
  mapper.splice(indeks, 1);
  return { ok: true };
}

function validerMålmappe(state: MockState, sakId: string, mappe: string | null) {
  return mappe === null || finnes(hentEllerSeed(state, sakId), mappe);
}

export function flyttDokumentTilMappe(
  state: MockState,
  sakId: string,
  docId: string,
  mappe: string | null,
): MappeResultat {
  const dokument = hentDokumenttreForSak(state, sakId).find((kandidat) => kandidat.id === docId);
  if (!dokument) return { ok: false, status: 404, melding: "Dokumentet finnes ikke" };
  if (dokument.arkivert) return { ok: false, status: 409, melding: "Dokumentet er arkivert" };
  if (!validerMålmappe(state, sakId, mappe)) {
    return { ok: false, status: 404, melding: "Mappen finnes ikke" };
  }
  dokument.mappe = mappe;
  return { ok: true };
}

export function flyttFilTilMappe(
  state: MockState,
  sakId: string,
  filId: string,
  mappe: string | null,
): MappeResultat {
  const fil = hentFilerForSak(state, sakId).find((kandidat) => kandidat.id === filId);
  if (!fil) return { ok: false, status: 404, melding: "Filen finnes ikke" };
  if (fil.arkivert) return { ok: false, status: 409, melding: "Filen er arkivert" };
  if (!validerMålmappe(state, sakId, mappe)) {
    return { ok: false, status: 404, melding: "Mappen finnes ikke" };
  }
  fil.mappe = mappe;
  return { ok: true };
}
