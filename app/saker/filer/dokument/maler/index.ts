import type { DokumentInnhold } from "~/saker/filer/typer";
import { arbeidRapportmal } from "./arbeid";
import { ensligForsørgerRapportmal } from "./enslig-forsørger";
import { innhentingsbrevmal } from "./innhentingsbrev";
import { utlandRapportmal } from "./utland";

/** Identifiserer hvilken mal som skal brukes til å opprette et nytt dokument. */
export type MalId = "arbeid" | "enslig-forsørger" | "utland" | "innhentingsbrev";

export type MalValg = {
  malId: MalId;
  erStraffesak: boolean;
};

/**
 * Rapportmaler finnes i en straffesak- og en ikke-straffesak-variant.
 * Brevmaler har bare én variant og brukes i begge sakstyper.
 */
export type MalKategori = "rapport" | "brev";

/** Menneskelesbare navn på malene, til bruk i velgere i UI. */
export const MAL_NAVN: Record<MalId, string> = {
  arbeid: "Kontrollrapport – Arbeid",
  "enslig-forsørger": "Kontrollrapport – Enslig forsørger",
  utland: "Kontrollrapport – Utland",
  innhentingsbrev: "Innhentingsbrev",
};

/** Undertekst for brevmaler i velgeren. Rapportmaler viser sakstypen i stedet. */
export const BREVMAL_BESKRIVELSE: Partial<Record<MalId, string>> = {
  innhentingsbrev: "Hente inn opplysninger fra eksterne parter",
};

export const MAL_KATEGORI: Record<MalId, MalKategori> = {
  arbeid: "rapport",
  "enslig-forsørger": "rapport",
  utland: "rapport",
  innhentingsbrev: "brev",
};

const MAL_BYGGERE: Record<MalId, (valg: { erStraffesak: boolean }) => DokumentInnhold> = {
  arbeid: arbeidRapportmal,
  "enslig-forsørger": ensligForsørgerRapportmal,
  utland: utlandRapportmal,
  innhentingsbrev: innhentingsbrevmal,
};

/** Bygger dokumentinnhold for en gitt mal. `erStraffesak` ignoreres for brevmaler. */
export function byggMalInnhold({ malId, erStraffesak }: MalValg): DokumentInnhold {
  return MAL_BYGGERE[malId]({ erStraffesak });
}
