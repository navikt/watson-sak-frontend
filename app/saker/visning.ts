import type {
  KontrollsakKategori,
  KontrollsakKilde,
  KontrollsakResponse,
  KontrollsakStatus,
  KontrollsakYtelse,
} from "./types.backend";

export type { KontrollsakStatus };

type StatusVariant = "info" | "warning" | "success" | "neutral";

const statusEtiketter: Record<KontrollsakStatus, string> = {
  OPPRETTET: "Opprettet",
  AVKLART: "Avklart",
  UTREDES: "Utredes",
  TIL_FORVALTNING: "Til forvaltning",
  HENLAGT: "Henlagt",
  AVSLUTTET: "Avsluttet",
};

const statusVarianter: Record<KontrollsakStatus, StatusVariant> = {
  OPPRETTET: "info",
  AVKLART: "warning",
  UTREDES: "warning",
  TIL_FORVALTNING: "success",
  HENLAGT: "neutral",
  AVSLUTTET: "neutral",
};

const kategoriEtiketter: Record<KontrollsakKategori, string> = {
  UDEFINERT: "Udefinert",
  FEILUTBETALING: "Feilutbetaling",
  MISBRUK: "Misbruk",
  OPPFØLGING: "Oppfølging",
};

const kildeEtiketter: Record<KontrollsakKilde, string> = {
  INTERN: "Intern",
  EKSTERN: "Ekstern",
  ANONYM_TIPS: "Anonymt tips",
};

export function formaterStatus(status: KontrollsakStatus): string {
  return statusEtiketter[status];
}

export function hentStatusVariant(status: KontrollsakStatus): StatusVariant {
  return statusVarianter[status];
}

export function formaterKategori(kategori: KontrollsakKategori | null | undefined): string | null {
  if (!kategori) {
    return null;
  }

  return kategoriEtiketter[kategori] ?? kategori;
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
  return formaterStatus(sak.status);
}

export function getYtelseTyper(sak: KontrollsakResponse): string[] {
  return hentYtelseTyper(sak.ytelser);
}

export function getBeskrivelse(sak: KontrollsakResponse): string | null {
  return sak.bakgrunn?.innhold ?? null;
}

export function getKildeText(sak: KontrollsakResponse): string {
  return formaterKilde(sak.bakgrunn?.kilde);
}

export function getKontaktinformasjon(sak: KontrollsakResponse) {
  const avsender = sak.bakgrunn?.avsender;

  if (!avsender) {
    return null;
  }

  return {
    navn: avsender.navn ?? undefined,
    telefon: avsender.telefon ?? undefined,
    epost: undefined,
    anonymt: avsender.anonym,
  };
}
