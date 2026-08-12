import type { DokumentInnhold } from "~/saker/filer/typer";
import { arbeidRapportmal } from "./arbeid";
import { ensligForsørgerRapportmal } from "./enslig-forsørger";
import { utlandRapportmal } from "./utland";

/** Identifiserer hvilken rapportmal som skal brukes til å opprette et nytt dokument. */
export type MalId = "arbeid" | "enslig-forsørger" | "utland";

export type MalValg = {
  malId: MalId;
  erStraffesak: boolean;
};

/** Menneskelesbare navn på malene, til bruk i velgere i UI. */
export const MAL_NAVN: Record<MalId, string> = {
  arbeid: "Arbeid",
  "enslig-forsørger": "Enslig forsørger",
  utland: "Utland",
};

const MAL_BYGGERE: Record<MalId, (valg: { erStraffesak: boolean }) => DokumentInnhold> = {
  arbeid: arbeidRapportmal,
  "enslig-forsørger": ensligForsørgerRapportmal,
  utland: utlandRapportmal,
};

/** Bygger dokumentinnhold for en gitt rapportmal og straffesak-variant. */
export function byggMalInnhold({ malId, erStraffesak }: MalValg): DokumentInnhold {
  return MAL_BYGGERE[malId]({ erStraffesak });
}
