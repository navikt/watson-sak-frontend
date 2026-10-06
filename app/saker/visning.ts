import type {
  KontrollsakKategori,
  KontrollsakKilde,
  KontrollsakMisbrukstype,
  KontrollsakResponse,
  KontrollsakStatus,
  KontrollsakSteg,
  KontrollsakYtelse,
  ResultatType,
} from "./types.backend";
import {
  kontrollsakKategoriEtiketter,
  kontrollsakKildeEtiketter,
  kontrollsakMisbrukstypeEtiketter,
  kontrollsakYtelseTypeEtiketter,
} from "./kategorier";

export type { KontrollsakSteg };

const stegEtiketter: Record<KontrollsakSteg, string> = {
  OPPRETTET: "Opprettet",
  UTREDNING: "Utredning",
  UTREDES: "Utredning",
  FORVALTNING: "Forvaltning",
  STRAFFERETTSLIG_VURDERING: "Strafferettslig vurdering",
  POLITI: "Politi",
  ANMELDT: "Politi",
  AVSLUTTET: "Avsluttet",
};

const statusEtiketter: Record<KontrollsakStatus, string> = {
  AKTIV: "Aktiv",
  VENTER_PA_INFORMASJON: "Venter på informasjon",
  VENTER_PA_VEDTAK: "Venter på vedtak",
  VENTER_PA_RESULTAT: "Venter på resultat",
  PAAKLAGET: "Påklaget",
  I_BERO: "I bero",
};

export function formaterSteg(steg: KontrollsakSteg | null | undefined): string {
  if (!steg) return "Ukjent";
  return stegEtiketter[steg];
}

/** Tag-farge for steg. Alle steg har samme farge overalt i løsningen. */
export const STEG_FARGE = "info";

export type StatusFarge = "success" | "warning" | "neutral";

/** Tag-farge for status: «Aktiv» (eller ingen status) er success, alle ventestatuser er warning. */
export function hentStatusFarge(status: KontrollsakStatus | null | undefined): StatusFarge {
  return !status || status === "AKTIV" ? "success" : "warning";
}

export function formaterStatus(status: KontrollsakStatus): string {
  return statusEtiketter[status];
}

export const resultatEtiketter: Record<ResultatType, string> = {
  KONTROLLNOTAT: "Kontrollnotat",
  FEILUTBETALINGSSAK_ORDINAER: "Feilutbetalingssak, ordinær",
  FEILUTBETALINGSSAK_POTENSIELL_STRAFFESAK: "Feilutbetalingssak, potensiell straffesak",
  HENLAGT: "Henlagt",
  SAKEN_SKAL_VURDERES_FOR_ANMELDELSE: "Saken skal vurderes for anmeldelse",
  SAKEN_SKAL_IKKE_VURDERES_FOR_ANMELDELSE: "Saken skal ikke vurderes for anmeldelse",
  ANMELDT: "Anmeldt",
  FORELEGG: "Forelegg",
  BOT: "Bot",
  PATALEUNNLATELSE: "Påtaleunnlatelse",
  FRIFINNELSE: "Frifinnelse",
  DOMFELLELSE: "Domfellelse",
};

function formaterResultattype(type: string): string {
  return resultatEtiketter[type as ResultatType] ?? type;
}

/**
 * Resultatet saken ble avsluttet med: det siste steget som har et avsluttende resultat.
 * Returnerer `null` når saken ikke har et slikt resultat.
 */
export function hentSluttresultat(resultat: KontrollsakResponse["resultat"]): string | null {
  if (!resultat) return null;
  if (resultat.politi?.type) return formaterResultattype(resultat.politi.type);
  const sv = resultat.strafferettsligVurdering?.type;
  if (sv && sv !== "ANMELDT") return formaterResultattype(sv);
  const endeligUtfall = resultat.forvaltning?.endeligUtfall ?? resultat.endeligUtfall;
  if (endeligUtfall?.type) return formaterResultattype(endeligUtfall.type);
  const utredning = resultat.utredning?.type;
  if (utredning === "HENLAGT" || utredning === "KONTROLLNOTAT") {
    return formaterResultattype(utredning);
  }
  return null;
}

/**
 * Tekst og farge for status-taggen til en sak. Avsluttede saker viser resultatet i stedet
 * for status, i nøytral farge.
 */
export function hentStatusTag(sak: Pick<KontrollsakResponse, "steg" | "status" | "resultat">): {
  tekst: string;
  farge: StatusFarge;
} {
  if (sak.steg === "AVSLUTTET") {
    return { tekst: hentSluttresultat(sak.resultat) ?? "Ikke registrert", farge: "neutral" };
  }
  return { tekst: formaterStatus(sak.status ?? "AKTIV"), farge: hentStatusFarge(sak.status) };
}

export function formaterKategori(kategori: KontrollsakKategori | null | undefined): string | null {
  if (!kategori) {
    return null;
  }

  return kontrollsakKategoriEtiketter[kategori] ?? kategori;
}

function formaterKilde(kilde: KontrollsakKilde | null | undefined): string {
  if (!kilde) {
    return "Ukjent kilde";
  }

  return kontrollsakKildeEtiketter[kilde] ?? kilde;
}

export function formaterYtelseType(type: string): string {
  return (
    kontrollsakYtelseTypeEtiketter[type as keyof typeof kontrollsakYtelseTypeEtiketter] ?? type
  );
}

function hentYtelseTyper(ytelser: KontrollsakYtelse[]): string[] {
  return ytelser.map((ytelse) => formaterYtelseType(ytelse.type));
}

function formaterPeriode(fra: string | null, til: string | null): string {
  return `${fra ?? "ukjent"} – ${til ?? "ukjent"}`;
}

export function formaterPeriodeForYtelser(ytelser: KontrollsakYtelse[]): string | null {
  if (ytelser.length === 0) {
    return null;
  }

  const perioder = [
    ...new Set(ytelser.map((ytelse) => formaterPeriode(ytelse.periodeFra, ytelse.periodeTil))),
  ];

  return perioder.join(", ");
}

/**
 * Formaterer en ISO-datostreng (YYYY-MM-DD) til norsk kort format (dd.mm.yyyy)
 *
 * @example
 * formaterIsoTilNorskDato("2023-01-05") // "05.01.2023"
 */
export function formaterIsoTilNorskDato(iso: string | undefined | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso ?? "";
  const dag = `${date.getDate()}`.padStart(2, "0");
  const måned = `${date.getMonth() + 1}`.padStart(2, "0");
  const år = date.getFullYear();
  return `${dag}.${måned}.${år}`;
}

/**
 * Formaterer periode for en enkelt ytelse til norsk kort format, med bindestrek
 * som fallback for manglende fra-/til-dato.
 *
 * @example
 * formaterYtelsePeriode("2023-01-05", "2023-06-01") // "05.01.2023 – 01.06.2023"
 * formaterYtelsePeriode("2023-01-05", null) // "05.01.2023 –"
 */
export function formaterYtelsePeriode(
  fra: string | null | undefined,
  til: string | null | undefined,
): string {
  const fraTekst = formaterIsoTilNorskDato(fra);
  const tilTekst = formaterIsoTilNorskDato(til);
  if (fraTekst && tilTekst) return `${fraTekst} – ${tilTekst}`;
  if (fraTekst) return `${fraTekst} –`;
  if (tilTekst) return `– ${tilTekst}`;
  return "–";
}

export function getPersonIdent(sak: KontrollsakResponse): string {
  return sak.personIdent;
}

export function getStegOgStatusTekst(sak: KontrollsakResponse): string {
  if (sak.status) {
    return `${formaterStatus(sak.status)} · ${formaterSteg(sak.steg)}`;
  }

  return formaterSteg(sak.steg);
}

export function getYtelseTyper(sak: KontrollsakResponse): string[] {
  return hentYtelseTyper(sak.ytelser);
}

export function getBeskrivelse(_sak: KontrollsakResponse): string | null {
  return null;
}

export function getKildeText(sak: KontrollsakResponse): string {
  return formaterKilde(sak.kilde);
}

export function getKontaktinformasjon(_sak: KontrollsakResponse) {
  return null;
}

export function formaterBelop(belop: number): string {
  return new Intl.NumberFormat("nb-NO").format(belop);
}

export function formaterMisbrukstype(misbrukstype: KontrollsakMisbrukstype): string {
  return kontrollsakMisbrukstypeEtiketter[misbrukstype] ?? misbrukstype;
}

const prioritetEtiketter: Record<KontrollsakResponse["prioritet"], string> = {
  LAV: "Lav",
  NORMAL: "Normal",
  HOY: "Høy",
};

export function formaterPrioritet(prioritet: KontrollsakResponse["prioritet"]): string {
  return prioritetEtiketter[prioritet] ?? prioritet;
}
