import { RouteConfig } from "~/routeConfig";
import type { FilResponse } from "~/saker/filer/typer";

/** Kun disse bildeformatene kan settes inn i et dokument. */
export const TILLATTE_BILDETYPER = ["image/png", "image/jpeg", "image/webp"] as const;

/** Grense i frontend for å unngå at store filer henger opplastingen — backend tillater opp til 50 MB. */
export const MAKS_BILDESTØRRELSE_BYTES = 10 * 1024 * 1024;

/**
 * Egen `dataTransfer`-MIME-type brukt til å skille «flytt et bilde som allerede står i
 * dokumentet» fra vanlig fil-/bilde-drop (som skal lastes opp som nytt vedlegg). Verdien
 * som sendes er JSON-serialisert Slate-path til bildenoden som dras.
 */
export const BILDE_FLYTT_MIMETYPE = "application/x-watson-bilde-path";

/** Validerer at filen kan settes inn som bilde. Returnerer feilmelding, eller `null` om gyldig. */
export function validerBildefil(fil: File): string | null {
  if (!TILLATTE_BILDETYPER.includes(fil.type as (typeof TILLATTE_BILDETYPER)[number])) {
    return "Bare PNG-, JPEG- og WebP-bilder kan settes inn i dokumentet.";
  }
  if (fil.size > MAKS_BILDESTØRRELSE_BYTES) {
    return "Bildet er for stort. Maks størrelse er 10 MB.";
  }
  return null;
}

/** Feil kastet når opplasting av et bilde mislykkes, med en brukervennlig melding. */
export class BildeOpplastingFeil extends Error {}

/**
 * Filtrerer ut de faktiske bildefilene fra en liste med filer – brukes til å avgjøre om
 * en dra-og-slipp- eller lim inn-hendelse inneholder noe editoren skal sette inn som
 * bilde, uten å røre resten av filene (f.eks. tekst limt inn sammen med et bilde).
 */
export function filtrerBildefiler(filer: FileList | File[]): File[] {
  return Array.from(filer).filter((fil) => fil.type.startsWith("image/"));
}

/**
 * Laster opp et bilde som et vanlig vedlegg via det eksisterende vedleggs-API-et
 * (samme resource route som `VedleggSeksjon` bruker), slik at bildet blir søkbart
 * og synlig i vedleggslisten som alle andre filer.
 */
export async function lastOppBilde(sakId: string, fil: File): Promise<FilResponse> {
  const feilmelding = validerBildefil(fil);
  if (feilmelding) {
    throw new BildeOpplastingFeil(feilmelding);
  }

  const url = RouteConfig.API.SAK_FILER.replace(":sakId", sakId);
  const formData = new FormData();
  formData.append("fil", fil);

  const respons = await fetch(url, { method: "POST", body: formData });
  const kropp: unknown = await respons.json().catch(() => null);

  if (!respons.ok || !kropp || typeof kropp !== "object" || !("id" in kropp)) {
    const melding =
      kropp && typeof kropp === "object" && "message" in kropp && typeof kropp.message === "string"
        ? kropp.message
        : "Kunne ikke laste opp bildet. Prøv igjen.";
    throw new BildeOpplastingFeil(melding);
  }

  return kropp as FilResponse;
}

/** Bygger den samme streaming-URL-en som `VedleggSeksjon` bruker for nedlasting/visning av et vedlegg. */
export function byggBildeUrl(sakId: string, filId: string): string {
  return RouteConfig.API.SAK_FIL.replace(":sakId", sakId).replace(":filId", filId);
}

/** Henter alle bildevedlegg (contentType image/*) for saken, til bruk i «sett inn eksisterende bilde»-velgeren. */
export async function hentBildevedlegg(sakId: string): Promise<FilResponse[]> {
  const url = RouteConfig.API.SAK_FILER.replace(":sakId", sakId);
  const respons = await fetch(url);
  if (!respons.ok) {
    throw new BildeOpplastingFeil("Kunne ikke hente vedlegg.");
  }
  const filer = (await respons.json()) as FilResponse[];
  return filer.filter((fil) => fil.contentType.startsWith("image/"));
}
