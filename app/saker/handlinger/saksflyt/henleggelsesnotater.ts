import type {
  Henleggelsesnotattype,
  HenleggelsesnotatResultat,
  RegistrertHenleggelsesnotat,
} from "~/saker/types.backend";

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
  låste: readonly Henleggelsesnotattype[] = [],
): { notattype: Henleggelsesnotattype; tekst: string | null }[] {
  return NOTATTYPER.filter((type) => valg.valgt[type] && !låste.includes(type)).map(
    (notattype) => ({
      notattype,
      tekst: valg.tekst[notattype].trim() === "" ? null : valg.tekst[notattype],
    }),
  );
}

function erJournalført(resultat: HenleggelsesnotatResultat): boolean {
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

/** Notater som allerede er journalført, slik loaderen har dem. */
export function resultaterFraRegistrerte(
  registrerte: readonly RegistrertHenleggelsesnotat[],
): HenleggelsesnotatResultat[] {
  return registrerte
    .filter((notat) => notat.journalpostId !== null)
    .map((notat) => ({
      notattype: notat.notattype,
      utfall: "ALLEREDE_JOURNALFORT",
      journalpostId: notat.journalpostId,
    }));
}

/**
 * Slår sammen resultater per notattype. Et journalført notat blir stående, slik at tidligere
 * suksesser og journalpost-ID-er ikke går tapt når et senere forsøk bare gjelder andre notater.
 */
export function slåSammenResultater(
  forrige: readonly HenleggelsesnotatResultat[],
  nye: readonly HenleggelsesnotatResultat[],
): HenleggelsesnotatResultat[] {
  return NOTATTYPER.flatMap((type) => {
    const gammel = forrige.find((resultat) => resultat.notattype === type);
    const ny = nye.find((resultat) => resultat.notattype === type);
    if (gammel && erJournalført(gammel) && !(ny && erJournalført(ny) && ny.journalpostId)) {
      return [gammel];
    }
    return ny ? [ny] : gammel ? [gammel] : [];
  });
}
