import { forskjellIDager } from "~/utils/date-utils";
import { getSaksreferanse } from "~/saker/id";
export { paginerElementer } from "~/utils/paginering";
import type { FordelingSak } from "./typer";
import { ALLE_STEG, matcherSteg } from "~/saker/steg";
import type { KontrollsakSteg } from "~/saker/types.backend";

/** Alle åpne steg, inkludert historiske saker som mangler ansvarlig. */
export const UFORDELTE_STEG: KontrollsakSteg[] = ALLE_STEG;

export const ufordelteSorteringskolonner = [
  "saksid",
  "kategori",
  "misbrukstype",
  "status",
  "steg",
  "opprettet",
  "oppdatert",
] as const;
export type UfordeltSorteringskolonne = (typeof ufordelteSorteringskolonner)[number];
export type UfordeltSorteringsretning = "stigende" | "synkende";

interface UfordelteFiltre {
  kategorier: string[];
  misbrukstyper: string[];
  merkinger: string[];
  steg: KontrollsakSteg[];
}

export function hentUfordelteFiltervalg(saker: FordelingSak[]) {
  return {
    kategorier: hentSorterteUnikeVerdier(
      saker.flatMap((sak) => (sak.kategori ? [sak.kategori] : [])),
    ),
    misbrukstyper: hentSorterteUnikeVerdier(saker.flatMap((sak) => sak.misbrukstyper)),
    merkinger: hentSorterteUnikeVerdier(saker.flatMap((sak) => sak.merking)),
  };
}

export function filtrerUfordelteSaker(
  saker: FordelingSak[],
  filtre: UfordelteFiltre,
): FordelingSak[] {
  return saker.filter((sak) => {
    const matcherKategori =
      filtre.kategorier.length === 0 ||
      (sak.kategori ? filtre.kategorier.includes(sak.kategori) : false);
    const matcherMisbrukstype =
      filtre.misbrukstyper.length === 0 ||
      sak.misbrukstyper.some((type) => filtre.misbrukstyper.includes(type));
    const matcherMerking =
      filtre.merkinger.length === 0 ||
      sak.merking.some((merking) => filtre.merkinger.includes(merking));

    const matcherValgtSteg = matcherSteg(sak.stegKode, filtre.steg);

    return matcherKategori && matcherMisbrukstype && matcherMerking && matcherValgtSteg;
  });
}

export function lagUfordelteOppsummering(saker: FordelingSak[], dagensDato = new Date()) {
  const antallSaker = saker.length;
  const eldsteDato = saker.reduce<string | null>((eldste, sak) => {
    if (!eldste || sak.opprettetDato < eldste) {
      return sak.opprettetDato;
    }

    return eldste;
  }, null);
  const eldsteLiggetidDager = eldsteDato ? forskjellIDager(eldsteDato, dagensDato) : 0;

  return { antallSaker, eldsteLiggetidDager };
}

export function sorterUfordelteSaker(
  saker: FordelingSak[],
  kolonne: UfordeltSorteringskolonne,
  retning: UfordeltSorteringsretning,
) {
  const retningFaktor = retning === "stigende" ? 1 : -1;
  const collator = new Intl.Collator("nb", {
    sensitivity: "base",
    numeric: kolonne === "saksid",
  });

  return [...saker].sort((a, b) => {
    const verdiA = hentSorteringsverdi(a, kolonne);
    const verdiB = hentSorteringsverdi(b, kolonne);
    return collator.compare(verdiA, verdiB) * retningFaktor;
  });
}

function hentSorterteUnikeVerdier(verdier: string[]) {
  return [...new Set(verdier)].sort((a, b) => a.localeCompare(b, "nb"));
}

function hentSorteringsverdi(sak: FordelingSak, kolonne: UfordeltSorteringskolonne) {
  switch (kolonne) {
    case "saksid":
      return getSaksreferanse(sak.id);
    case "kategori":
      return sak.kategori ?? "Uten kategori";
    case "misbrukstype":
      return sak.misbrukstyper.join(", ");
    case "status":
      return sak.status ?? "Aktiv";
    case "steg":
      return sak.steg;
    case "opprettet":
      return sak.opprettetDato;
    case "oppdatert":
      return sak.oppdatertDato;
  }
}
