import type {
  KontrollsakKategori,
  KontrollsakKilde,
  KontrollsakResponse,
  KontrollsakStatus,
  KontrollsakYtelse,
} from "./types.backend";
import { kontrollsakKategoriEtiketter } from "./kategorier";

export type { KontrollsakStatus };

type StatusVariant = "info" | "warning" | "success" | "neutral";

const statusEtiketter: Record<KontrollsakStatus, string> = {
  UFORDELT: "Ufordelt",
  UTREDES: "Utredes",
  FORVALTNING: "Forvaltning",
  I_BERO: "I bero",
  AVSLUTTET: "Avsluttet",
};

const statusVarianter: Record<KontrollsakStatus, StatusVariant> = {
  UFORDELT: "info",
  UTREDES: "warning",
  FORVALTNING: "success",
  I_BERO: "neutral",
  AVSLUTTET: "neutral",
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
  return formaterStatus(sak.status);
}

export function getYtelseTyper(sak: KontrollsakResponse): string[] {
  return hentYtelseTyper(sak.ytelser);
}

export function getUtredningsresultat(sak: KontrollsakResponse): string | null {
  return sak.resultat?.utredning?.resultat ?? null;
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
