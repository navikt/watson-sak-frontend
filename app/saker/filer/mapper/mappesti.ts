import { z } from "zod";

/** Skilletegnet mellom nivåene i en mappesti, f.eks. «Bank/Kontoutskrifter». */
const SKILLETEGN = "/";

const MAKS_SEGMENTLENGDE = 100;
const MAKS_STILENGDE = 1000;
const KONTROLLTEGN = /\p{Cc}/u;

/**
 * Validerer ett mappenavn (ett nivå i stien). Speiler `Mappesti` i watson-admin-api, slik at
 * brukeren får feilmelding før skjemaet sendes.
 */
export const mappenavnSchema = z
  .string()
  .trim()
  .min(1, "Mappenavnet kan ikke være tomt")
  .max(MAKS_SEGMENTLENGDE, `Mappenavnet kan ikke være lengre enn ${MAKS_SEGMENTLENGDE} tegn`)
  .refine((navn) => navn !== "." && navn !== "..", "Mappenavnet er ugyldig")
  .refine(
    (navn) => !navn.includes("/") && !navn.includes("\\") && !KONTROLLTEGN.test(navn),
    "Mappenavnet kan ikke inneholde / eller \\",
  );

/** Validerer og normaliserer en hel mappesti (trimmer hvert nivå). */
export const mappestiSchema = z
  .string()
  .max(MAKS_STILENGDE, `Mappestien kan ikke være lengre enn ${MAKS_STILENGDE} tegn`)
  .transform((sti, ctx) => {
    const segmenter = sti.split(SKILLETEGN).map((segment) => segment.trim());
    for (const segment of segmenter) {
      const resultat = mappenavnSchema.safeParse(segment);
      if (!resultat.success) {
        ctx.addIssue({ code: "custom", message: resultat.error.issues[0]?.message });
        return z.NEVER;
      }
    }
    return segmenter.join(SKILLETEGN);
  });

/** Siste nivå i stien, dvs. navnet som vises for mappen. */
export function mappenavn(sti: string): string {
  return sti.slice(sti.lastIndexOf(SKILLETEGN) + 1);
}

/** Stien til overordnet mappe, eller `null` hvis mappen ligger på rotnivå. */
export function forelder(sti: string): string | null {
  const indeks = sti.lastIndexOf(SKILLETEGN);
  return indeks === -1 ? null : sti.slice(0, indeks);
}

/** Alle forfedre til stien, fra rot og nedover, uten stien selv. */
export function forfedre(sti: string): string[] {
  const segmenter = sti.split(SKILLETEGN);
  return segmenter.slice(0, -1).map((_, indeks) => segmenter.slice(0, indeks + 1).join(SKILLETEGN));
}

/** Setter sammen en sti av en (valgfri) forelder og et mappenavn. */
export function slåSammen(forelderSti: string | null, navn: string): string {
  return forelderSti ? `${forelderSti}${SKILLETEGN}${navn}` : navn;
}

/** Om `sti` er lik `annen` eller ligger et sted under den. */
export function erLikEllerUnder(sti: string, annen: string): boolean {
  return sti === annen || sti.startsWith(`${annen}${SKILLETEGN}`);
}

/**
 * Bytter prefikset `fra` med `til` i `sti`. Returnerer `sti` uendret hvis den ikke ligger under
 * `fra`. Brukes når en mappe får nytt navn eller flyttes, slik at undermapper og innhold følger med.
 */
export function byttPrefiks(sti: string, fra: string, til: string): string {
  if (!erLikEllerUnder(sti, fra)) return sti;
  return `${til}${sti.slice(fra.length)}`;
}

/**
 * Om mappen `sti` kan flyttes inn i `målMappe` (`null` = rotnivå). En mappe kan ikke flyttes inn i
 * seg selv eller i en av sine egne undermapper, og det er ingen endring å flytte den dit den er.
 */
export function kanFlytteMappe(sti: string, målMappe: string | null): boolean {
  if (målMappe !== null && erLikEllerUnder(målMappe, sti)) return false;
  return forelder(sti) !== målMappe;
}
