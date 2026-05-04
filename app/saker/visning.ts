import type {
  Blokkeringsarsak,
  KontrollsakKategori,
  KontrollsakKilde,
  KontrollsakMisbrukstype,
  KontrollsakResponse,
  KontrollsakStatus,
  KontrollsakYtelse,
} from "./types.backend";
import { kontrollsakKategoriEtiketter, kontrollsakMisbrukstypeEtiketter } from "./kategorier";

export type { KontrollsakStatus };

type StatusVariant = "info" | "warning" | "success" | "neutral";

const statusEtiketter: Record<KontrollsakStatus, string> = {
  OPPRETTET: "Opprettet",
  UTREDES: "Utredes",
  STRAFFERETTSLIG_VURDERING: "Strafferettslig vurdering",
  ANMELDT: "Anmeldt",
  HENLAGT: "Henlagt",
  AVSLUTTET: "Avsluttet",
};

const statusVarianter: Record<KontrollsakStatus, StatusVariant> = {
  OPPRETTET: "info",
  UTREDES: "warning",
  STRAFFERETTSLIG_VURDERING: "warning",
  ANMELDT: "success",
  HENLAGT: "neutral",
  AVSLUTTET: "neutral",
};

const blokkeringsarsakEtiketter: Record<Blokkeringsarsak, string> = {
  VENTER_PA_INFORMASJON: "Venter på informasjon",
  VENTER_PA_VEDTAK: "Venter på vedtak",
  I_BERO: "I bero",
};

const kildeEtiketter: Record<KontrollsakKilde, string> = {
  PUBLIKUM: "Publikum",
  NAV_KONTROLL: "Nav kontroll",
  NAV_OVRIG: "Nav øvrig",
  REGISTERSAMKJORING: "Registersamkjøring",
  A_KRIMSAMARBEID: "A-krimsamarbeid",
  POLITIET: "Politiet",
  SKATTEETATEN: "Skatteetaten",
  UTLENDINGSMYNDIGHETEN: "Utlendingsmyndighetene",
  UTENRIKSTJENESTEN: "Utenrikstjenesten",
  STATENS_VEGVESEN: "Statens vegvesen",
  KOMMUNE: "Kommune",
  BANK_OG_FINANS: "Bank og finans",
  ANNET: "Annet",
};

export function formaterStatus(status: KontrollsakStatus): string {
  return statusEtiketter[status];
}

export function hentStatusVariant(status: KontrollsakStatus): StatusVariant {
  return statusVarianter[status];
}

export function formaterBlokkeringsarsak(arsak: Blokkeringsarsak): string {
  return blokkeringsarsakEtiketter[arsak];
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

  return kildeEtiketter[kilde] ?? kilde;
}

function hentYtelseTyper(ytelser: KontrollsakYtelse[]): string[] {
  return ytelser.map((ytelse) => ytelse.type);
}

function formaterPeriode(fra: string, til: string): string {
  return `${fra} – ${til}`;
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

export function getPersonIdent(sak: KontrollsakResponse): string {
  return sak.personIdent;
}

export function getStatus(sak: KontrollsakResponse): string {
  if (sak.blokkert) {
    return `${formaterBlokkeringsarsak(sak.blokkert)} · ${formaterStatus(sak.status)}`;
  }

  return formaterStatus(sak.status);
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
