import type {
  Henleggelsesarsak,
  KontrollsakKategori,
  KontrollsakKilde,
  KontrollsakMisbrukstype,
  KontrollsakResponse,
  KontrollsakStatus,
  KontrollsakSteg,
  KontrollsakYtelse,
} from "./types.backend";
import { henleggelsesarsakSchema } from "./types.backend";
import {
  kontrollsakKategoriEtiketter,
  kontrollsakKildeEtiketter,
  kontrollsakMisbrukstypeEtiketter,
  kontrollsakYtelseTypeEtiketter,
} from "./kategorier";

export type { KontrollsakSteg };

type StegVariant = "info" | "warning" | "success" | "neutral";

const stegEtiketter: Record<KontrollsakSteg, string> = {
  OPPRETTET: "Opprettet",
  UTREDES: "Utredes",
  STRAFFERETTSLIG_VURDERING: "Strafferettslig vurdering",
  ANMELDT: "Anmeldt",
  HENLAGT: "Henlagt",
  AVSLUTTET: "Avsluttet",
};

const stegVarianter: Record<KontrollsakSteg, StegVariant> = {
  OPPRETTET: "info",
  UTREDES: "warning",
  STRAFFERETTSLIG_VURDERING: "warning",
  ANMELDT: "success",
  HENLAGT: "neutral",
  AVSLUTTET: "neutral",
};

const statusEtiketter: Record<KontrollsakStatus, string> = {
  VENTER_PA_INFORMASJON: "Venter på informasjon",
  VENTER_PA_VEDTAK: "Venter på vedtak",
  I_BERO: "I bero",
};

const henleggelsesarsakEtiketter: Record<Henleggelsesarsak, string> = {
  IKKE_KAPASITET: "Ikke kapasitet",
  IKKE_TILSTREKKELIG_BEVISGRUNNLAG: "Ikke tilstrekkelig bevisgrunnlag",
  IKKE_TILSTREKKELIG_SKYLD: "Ikke tilstrekkelig skyld",
  INGEN_UTREDNING: "Ingen utredning",
  FORELDET: "Foreldet",
};

export function formaterSteg(steg: KontrollsakSteg | null | undefined): string {
  if (!steg) return "Ukjent";
  return stegEtiketter[steg];
}

export function hentStegVariant(steg: KontrollsakSteg | null | undefined): StegVariant {
  if (!steg) return "neutral";
  return stegVarianter[steg];
}

export function formaterStatus(status: KontrollsakStatus): string {
  return statusEtiketter[status];
}

export function formaterHenleggelsesarsak(arsak: Henleggelsesarsak | null | undefined): string {
  if (!arsak) return "Ukjent";
  return henleggelsesarsakEtiketter[arsak] ?? "Ukjent";
}

export const henleggelsesarsakAlternativer: Henleggelsesarsak[] = [
  ...henleggelsesarsakSchema.options,
];

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
