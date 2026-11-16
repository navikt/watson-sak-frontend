import type { Henleggelsesnotattype, HenleggelsesnotatResultat } from "~/saker/types.backend";

export const NOTATTYPER: readonly Henleggelsesnotattype[] = [
  "HENLEGGELSESNOTAT",
  "ORIENTERINGSNOTAT",
];

export type Notatvalg = {
  valgt: Record<Henleggelsesnotattype, boolean>;
  tekst: Record<Henleggelsesnotattype, string>;
};

export const tomtNotatvalg: Notatvalg = {
  valgt: { HENLEGGELSESNOTAT: false, ORIENTERINGSNOTAT: false },
  tekst: { HENLEGGELSESNOTAT: "", ORIENTERINGSNOTAT: "" },
};

/** Innholdet i `notater`-feltet. Bare avkryssede notater tas med, og tomme tekster sendes som `null`. */
export function byggNotater(
  valg: Notatvalg,
): { notattype: Henleggelsesnotattype; tekst: string | null }[] {
  return NOTATTYPER.filter((type) => valg.valgt[type]).map((notattype) => ({
    notattype,
    tekst: valg.tekst[notattype].trim() === "" ? null : valg.tekst[notattype],
  }));
}

export function erJournalført(resultat: HenleggelsesnotatResultat): boolean {
  return resultat.utfall === "JOURNALFORT" || resultat.utfall === "ALLEREDE_JOURNALFORT";
}

export function journalførteNotattyper(
  resultater: readonly HenleggelsesnotatResultat[],
): Henleggelsesnotattype[] {
  return NOTATTYPER.filter((type) =>
    resultater.some((resultat) => resultat.notattype === type && erJournalført(resultat)),
  );
}

/** Orienteringsnotatets journalpost, hvis notatet ble journalført. */
export function orienteringsnotatJournalpostId(
  resultater: readonly HenleggelsesnotatResultat[],
): string | null {
  const resultat = resultater.find(
    (kandidat) => kandidat.notattype === "ORIENTERINGSNOTAT" && erJournalført(kandidat),
  );
  return resultat?.journalpostId ?? null;
}

export function kvitteringstekst(typer: readonly Henleggelsesnotattype[]): string | null {
  const henleggelse = typer.includes("HENLEGGELSESNOTAT");
  const orientering = typer.includes("ORIENTERINGSNOTAT");
  if (henleggelse && orientering) {
    return "Henleggelsesnotatet og orienteringsnotatet er arkivert og journalført i Gosys";
  }
  if (henleggelse) return "Henleggelsesnotatet er arkivert og journalført i Gosys";
  if (orientering) return "Orienteringsnotat er arkivert og journalført i Gosys";
  return null;
}
