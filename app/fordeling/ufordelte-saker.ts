import { forskjellIDager } from "~/utils/date-utils";
import { getSaksreferanse } from "~/saker/id";
export { paginerElementer } from "~/utils/paginering";
import type { FordelingSak } from "./typer";

export const ufordelteSorteringskolonner = [
  "saksid",
  "kategori",
  "misbrukstype",
  "status",
  "opprettet",
  "oppdatert",
] as const;
export type UfordeltSorteringskolonne = (typeof ufordelteSorteringskolonner)[number];
export type UfordeltSorteringsretning = "stigende" | "synkende";

interface UfordelteFiltre {
  kategorier: string[];
  ytelser: string[];
}

export function hentUfordelteFiltervalg(saker: FordelingSak[]) {
  return {
    kategorier: hentSorterteUnikeVerdier(
      saker.flatMap((sak) => (sak.kategori ? [sak.kategori] : [])),
    ),
    ytelser: hentSorterteUnikeVerdier(saker.flatMap((sak) => sak.ytelser)),
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
    const matcherYtelse =
      filtre.ytelser.length === 0 || sak.ytelser.some((ytelse) => filtre.ytelser.includes(ytelse));

    return matcherKategori && matcherYtelse;
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
  const eldsteLiggetid = eldsteDato ? forskjellIDager(eldsteDato, dagensDato) : 0;
  const ytelser = hentSorterteUnikeVerdier(saker.flatMap((sak) => sak.ytelser));

  return {
    antallTekst: formaterAntallSaker(antallSaker),
    eldsteTekst:
      antallSaker > 0
        ? `Eldste sak har ligget i ${eldsteLiggetid} dager`
        : "Ingen ufordelte saker akkurat nå",
    ytelserTekst:
      ytelser.length > 0
        ? `Gjelder ytelsene ${formaterListeMedOg(ytelser)}`
        : "Ingen ytelser i utvalget",
  };
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
      return sak.status.tekst;
    case "opprettet":
      return sak.opprettetDato;
    case "oppdatert":
      return sak.oppdatertDato;
  }
}

function formaterAntallSaker(antallSaker: number) {
  return `${antallSaker} ufordelt${antallSaker === 1 ? "" : "e"} sak${antallSaker === 1 ? "" : "er"}`;
}

function formaterListeMedOg(verdier: string[]) {
  if (verdier.length === 1) {
    return verdier[0];
  }

  if (verdier.length === 2) {
    return `${verdier[0]} og ${verdier[1]}`;
  }

  return `${verdier.slice(0, -1).join(", ")} og ${verdier.at(-1)}`;
}
