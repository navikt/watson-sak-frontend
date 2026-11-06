import type { AlleSakerKolonne, Sorteringsretning } from "~/alle-saker/saker-utils";

export type Sakssortering = {
  kolonne: AlleSakerKolonne;
  retning: Sorteringsretning;
};

export const STANDARD_SAKSSORTERING: Sakssortering = {
  kolonne: "opprettet",
  retning: "desc",
};

export const SORTERBARE_SAKSKOLONNER: AlleSakerKolonne[] = [
  "saksid",
  "kategori",
  "steg",
  "status",
  "opprettet",
  "oppdatert",
];

export const SAKSLISTE_OPPSETT = {
  kolonner: [
    "saksid",
    "kategori",
    "misbrukstype",
    "steg",
    "status",
    "opprettet",
    "oppdatert",
    "saksbehandler",
  ] satisfies AlleSakerKolonne[],
  kolonneHeaderProps: {
    saksid: { className: "min-w-[100px]" },
    kategori: { className: "min-w-[165px]" },
    misbrukstype: { className: "min-w-[210px]" },
    status: { className: "min-w-[200px]" },
    steg: { className: "min-w-[170px]" },
    opprettet: { className: "min-w-[140px]" },
    oppdatert: { className: "min-w-[140px]" },
    saksbehandler: { className: "min-w-[165px]" },
  },
};

export function erSorterbarSakskolonne(kolonne: string): kolonne is AlleSakerKolonne {
  return SORTERBARE_SAKSKOLONNER.some((sorterbar) => sorterbar === kolonne);
}

export function standardRetningForKolonne(kolonne: AlleSakerKolonne): Sorteringsretning {
  return kolonne === "opprettet" || kolonne === "oppdatert" ? "desc" : "asc";
}
