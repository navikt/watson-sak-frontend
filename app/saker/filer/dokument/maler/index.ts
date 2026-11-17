import type { DokumentInnhold } from "~/saker/filer/typer";
import type { KontrollsakSteg } from "~/saker/types.backend";
import { anmeldelsemal } from "./anmeldelse";
import { arbeidRapportmal } from "./arbeid";
import { ensligForsørgerRapportmal } from "./enslig-forsørger";
import { innhentingsbrevmal } from "./innhentingsbrev";
import {
  orienteringAnmeldelseMal,
  orienteringAvsluttetInnhentingKontoMal,
  orienteringHenleggelseMal,
  orienteringInnhentingKontoMal,
  orienteringInnhentingValutaregisterMal,
} from "./orienteringsbrev";
import { utlandRapportmal } from "./utland";

/** Identifiserer hvilken mal som skal brukes til å opprette et nytt dokument. */
export type MalId =
  | "arbeid"
  | "enslig-forsørger"
  | "utland"
  | "innhentingsbrev"
  | "anmeldelse"
  | "orientering-innhenting-konto"
  | "orientering-innhenting-valutaregister"
  | "orientering-avsluttet-innhenting-konto"
  | "orientering-anmeldelse"
  | "orientering-henleggelse";

export type MalValg = {
  malId: MalId;
  erStraffesak: boolean;
};

/**
 * Rapportmaler finnes i en straffesak- og en ikke-straffesak-variant.
 * Brevmaler har bare én variant og brukes i begge sakstyper.
 */
export type MalKategori = "rapport" | "brev";

const UTREDNINGSSTEG: KontrollsakSteg[] = ["UTREDNING", "UTREDES"];
const STRAFFERETTSLIG_STEG: KontrollsakSteg[] = ["STRAFFERETTSLIG_VURDERING"];

/**
 * Hvilke steg malen kan brukes i. Kontrollrapporter hører til utredningen,
 * anmeldelsen til strafferettslig vurdering. Orienteringsbrev til bruker følger
 * steget de hører til, og sendes før saken avsluttes. `null` betyr alle steg.
 */
const MAL_STEG: Record<MalId, KontrollsakSteg[] | null> = {
  arbeid: UTREDNINGSSTEG,
  "enslig-forsørger": UTREDNINGSSTEG,
  utland: UTREDNINGSSTEG,
  innhentingsbrev: null,
  anmeldelse: STRAFFERETTSLIG_STEG,
  "orientering-innhenting-konto": UTREDNINGSSTEG,
  "orientering-innhenting-valutaregister": UTREDNINGSSTEG,
  "orientering-avsluttet-innhenting-konto": UTREDNINGSSTEG,
  "orientering-anmeldelse": STRAFFERETTSLIG_STEG,
  "orientering-henleggelse": STRAFFERETTSLIG_STEG,
};

export function erMalTilgjengelig(malId: MalId, steg: KontrollsakSteg): boolean {
  const tillatteSteg = MAL_STEG[malId];
  return tillatteSteg === null || tillatteSteg.includes(steg);
}

/** Menneskelesbare navn på malene, til bruk i velgere i UI. */
export const MAL_NAVN: Record<MalId, string> = {
  arbeid: "Kontrollrapport – Arbeid",
  "enslig-forsørger": "Kontrollrapport – Enslig forsørger",
  utland: "Kontrollrapport – Utland",
  innhentingsbrev: "Innhentingsbrev",
  anmeldelse: "Anmeldelse",
  "orientering-innhenting-konto": "Orientering om innhenting av kontoopplysninger",
  "orientering-innhenting-valutaregister": "Orientering om innhenting fra Valutaregisteret",
  "orientering-avsluttet-innhenting-konto": "Orientering om avsluttet undersøkelse",
  "orientering-anmeldelse": "Orientering om anmeldelse",
  "orientering-henleggelse": "Orientering om at saken ikke anmeldes",
};

/** Undertekst for brevmaler i velgeren. Rapportmaler viser sakstypen i stedet. */
export const BREVMAL_BESKRIVELSE: Partial<Record<MalId, string>> = {
  innhentingsbrev: "Hente inn opplysninger fra eksterne parter",
  anmeldelse: "Anmelde forholdet til politiet",
  "orientering-innhenting-konto": "Orientere bruker om at vi henter kontoopplysninger",
  "orientering-innhenting-valutaregister": "Orientere bruker om oppslag i Valutaregisteret",
  "orientering-avsluttet-innhenting-konto": "Orientere bruker om at undersøkelsen er avsluttet",
  "orientering-anmeldelse": "Orientere bruker om at saken er anmeldt",
  "orientering-henleggelse": "Orientere bruker om at saken ikke anmeldes",
};

export const MAL_KATEGORI: Record<MalId, MalKategori> = {
  arbeid: "rapport",
  "enslig-forsørger": "rapport",
  utland: "rapport",
  innhentingsbrev: "brev",
  anmeldelse: "brev",
  "orientering-innhenting-konto": "brev",
  "orientering-innhenting-valutaregister": "brev",
  "orientering-avsluttet-innhenting-konto": "brev",
  "orientering-anmeldelse": "brev",
  "orientering-henleggelse": "brev",
};

const MAL_BYGGERE: Record<MalId, (valg: { erStraffesak: boolean }) => DokumentInnhold> = {
  arbeid: arbeidRapportmal,
  "enslig-forsørger": ensligForsørgerRapportmal,
  utland: utlandRapportmal,
  innhentingsbrev: innhentingsbrevmal,
  anmeldelse: anmeldelsemal,
  "orientering-innhenting-konto": orienteringInnhentingKontoMal,
  "orientering-innhenting-valutaregister": orienteringInnhentingValutaregisterMal,
  "orientering-avsluttet-innhenting-konto": orienteringAvsluttetInnhentingKontoMal,
  "orientering-anmeldelse": orienteringAnmeldelseMal,
  "orientering-henleggelse": orienteringHenleggelseMal,
};

/** Bygger dokumentinnhold for en gitt mal. `erStraffesak` ignoreres for brevmaler. */
export function byggMalInnhold({ malId, erStraffesak }: MalValg): DokumentInnhold {
  return MAL_BYGGERE[malId]({ erStraffesak });
}
