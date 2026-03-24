import type { Sak, SakStatus } from "~/saker/typer";
import { forskjellIDager } from "~/utils/date-utils";

const ufordelteStatuser = new Set<SakStatus>(["tips mottatt", "tips avklart"]);
export const ufordelteSorteringskolonner = ["kategori", "ytelse", "opprettet"] as const;
export type UfordeltSorteringskolonne = (typeof ufordelteSorteringskolonner)[number];
export type UfordeltSorteringsretning = "stigende" | "synkende";

interface UfordelteFiltre {
  kategorier: string[];
  ytelser: string[];
}

export function hentUfordelteSaker(saker: Sak[]): Sak[] {
  return saker.filter((sak) => ufordelteStatuser.has(sak.status));
}

export function hentUfordelteFiltervalg(saker: Sak[]) {
  const ufordelteSaker = hentUfordelteSaker(saker);

  return {
    kategorier: hentSorterteUnikeVerdier(
      ufordelteSaker.flatMap((sak) => (sak.kategori ? [sak.kategori] : [])),
    ),
    ytelser: hentSorterteUnikeVerdier(ufordelteSaker.flatMap((sak) => sak.ytelser)),
  };
}

export function filtrerUfordelteSaker(saker: Sak[], filtre: UfordelteFiltre): Sak[] {
  return hentUfordelteSaker(saker).filter((sak) => {
    const matcherKategori =
      filtre.kategorier.length === 0 ||
      (sak.kategori ? filtre.kategorier.includes(sak.kategori) : false);
    const matcherYtelse =
      filtre.ytelser.length === 0 || sak.ytelser.some((ytelse) => filtre.ytelser.includes(ytelse));

    return matcherKategori && matcherYtelse;
  });
}

export function paginerElementer<T>(elementer: T[], ønsketSide: number, sideStørrelse: number) {
  const totalSider = Math.max(1, Math.ceil(elementer.length / sideStørrelse));
  const aktivSide = Math.min(Math.max(ønsketSide, 1), totalSider);
  const startIndex = (aktivSide - 1) * sideStørrelse;

  return {
    aktivSide,
    totalSider,
    elementer: elementer.slice(startIndex, startIndex + sideStørrelse),
  };
}

export function lagUfordelteOppsummering(saker: Sak[], dagensDato = new Date()) {
  const ufordelteSaker = hentUfordelteSaker(saker);
  const antallSaker = ufordelteSaker.length;
  const eldsteDato = ufordelteSaker.reduce<string | null>((eldste, sak) => {
    if (!eldste || sak.datoInnmeldt < eldste) {
      return sak.datoInnmeldt;
    }

    return eldste;
  }, null);
  const eldsteLiggetid = eldsteDato ? forskjellIDager(eldsteDato, dagensDato) : 0;
  const ytelser = hentSorterteUnikeVerdier(ufordelteSaker.flatMap((sak) => sak.ytelser));

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
  saker: Sak[],
  kolonne: UfordeltSorteringskolonne,
  retning: UfordeltSorteringsretning,
) {
  const retningFaktor = retning === "stigende" ? 1 : -1;

  return [...hentUfordelteSaker(saker)].sort((a, b) => {
    const verdiA = hentSorteringsverdi(a, kolonne);
    const verdiB = hentSorteringsverdi(b, kolonne);

    return verdiA.localeCompare(verdiB, "nb", { sensitivity: "base" }) * retningFaktor;
  });
}

function hentSorterteUnikeVerdier(verdier: string[]) {
  return [...new Set(verdier)].sort((a, b) => a.localeCompare(b, "nb"));
}

function hentSorteringsverdi(sak: Sak, kolonne: UfordeltSorteringskolonne) {
  switch (kolonne) {
    case "kategori":
      return sak.kategori ?? "Uten kategori";
    case "ytelse":
      return sak.ytelser.join(", ");
    case "opprettet":
      return sak.datoInnmeldt;
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
