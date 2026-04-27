import {
  getKategoriText,
  getMisbrukstyper,
  getOppdatertDato,
  getOpprettetDato,
  getSaksenhet,
} from "~/saker/selectors";
import type { KontrollsakResponse, KontrollsakStatus } from "~/saker/types.backend";
import { formaterStatus, getStatus } from "~/saker/visning";
import { getSaksreferanse } from "~/saker/id";

export const sorteringskolonner = [
  "saksid",
  "kategori",
  "misbrukstype",
  "status",
  "opprettet",
  "oppdatert",
  "saksbehandler",
] as const;

export type AlleSakerKolonne = (typeof sorteringskolonner)[number];
export type Sorteringsretning = "asc" | "desc";

type FilterState = {
  enhet: string[];
  saksbehandler: string[];
  kategori: string[];
  misbrukstype: string[];
  merking: string[];
};

const TRAKT_STATUS_REKKEFOLGE: KontrollsakStatus[] = [
  "OPPRETTET",
  "UTREDES",
  "VENTER_PA_INFORMASJON",
  "VENTER_PA_VEDTAK",
  "ANMELDELSE_VURDERES",
  "ANMELDT",
  "AVSLUTTET",
  "HENLAGT",
];

export function normaliserFilterVerdier(verdier: string[]): string[] {
  return [...new Set(verdier.filter((v) => v.trim() !== ""))];
}

export function unikeVerdier(verdier: string[]): string[] {
  return [...new Set(verdier.filter(Boolean))].sort((a, b) => a.localeCompare(b, "nb"));
}

export function beregnTraktSteg(saker: KontrollsakResponse[]) {
  const teller = new Map<KontrollsakStatus, number>();
  for (const sak of saker) {
    teller.set(sak.status, (teller.get(sak.status) ?? 0) + 1);
  }
  return TRAKT_STATUS_REKKEFOLGE.filter((status) => (teller.get(status) ?? 0) > 0).map(
    (status) => ({ label: formaterStatus(status), antall: teller.get(status) ?? 0 }),
  );
}

export function filtrerSaker(
  saker: KontrollsakResponse[],
  filter: FilterState,
): KontrollsakResponse[] {
  return saker.filter((sak) => {
    if (filter.enhet.length > 0 && !filter.enhet.includes(getSaksenhet(sak))) return false;
    if (
      filter.saksbehandler.length > 0 &&
      !filter.saksbehandler.includes(sak.saksbehandlere.eier?.navn ?? "")
    )
      return false;
    if (filter.kategori.length > 0 && !filter.kategori.includes(getKategoriText(sak) ?? ""))
      return false;
    if (
      filter.misbrukstype.length > 0 &&
      !getMisbrukstyper(sak).some((m) => filter.misbrukstype.includes(m))
    )
      return false;
    if (filter.merking.length > 0 && !filter.merking.includes(sak.merking ?? "")) return false;
    return true;
  });
}

function hentSorteringsverdi(sak: KontrollsakResponse, kolonne: AlleSakerKolonne): string {
  switch (kolonne) {
    case "saksid":
      return getSaksreferanse(sak.id);
    case "kategori":
      return getKategoriText(sak) ?? "";
    case "misbrukstype":
      return getMisbrukstyper(sak).join(", ");
    case "status":
      return getStatus(sak);
    case "opprettet":
      return getOpprettetDato(sak);
    case "oppdatert":
      return getOppdatertDato(sak);
    case "saksbehandler":
      return sak.saksbehandlere.eier?.navn ?? "";
  }
}

export function sorterSaker(
  saker: KontrollsakResponse[],
  kolonne: AlleSakerKolonne,
  retning: Sorteringsretning,
): KontrollsakResponse[] {
  const faktor = retning === "asc" ? 1 : -1;
  const collator = new Intl.Collator("nb", { sensitivity: "base", numeric: kolonne === "saksid" });

  return [...saker].sort((a, b) => {
    const verdiA = hentSorteringsverdi(a, kolonne);
    const verdiB = hentSorteringsverdi(b, kolonne);
    return collator.compare(verdiA, verdiB) * faktor;
  });
}
