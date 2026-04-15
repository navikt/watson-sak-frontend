import { formaterDato } from "~/utils/date-utils";
import type { KontrollsakResponse } from "./types.backend";
import {
  formaterKategori,
  formaterPeriodeForYtelser,
  getYtelseTyper,
  hentStatusVariant as hentKontrollsakStatusVariant,
} from "./visning";

type MineSakerGruppeStatus = "aktive" | "ventende" | "fullførte";

export function getOpprettetDato(sak: KontrollsakResponse): string {
  return sak.opprettet;
}

export function getOppdatertDato(sak: KontrollsakResponse): string {
  return sak.oppdatert ?? sak.opprettet;
}

export function getPeriodeText(sak: KontrollsakResponse): string | null {
  const periodeText = formaterPeriodeForYtelser(sak.ytelser);

  if (!periodeText) {
    return null;
  }

  return periodeText
    .split(", ")
    .map((periode) => {
      const [fra, til] = periode.split(" – ");
      return `${formaterDato(fra)} – ${formaterDato(til)}`;
    })
    .join(", ");
}

export function getKategoriText(sak: KontrollsakResponse): string | null {
  return formaterKategori(sak.kategori);
}

export function getStatusVariantForSak(sak: KontrollsakResponse) {
  return hentKontrollsakStatusVariant(sak.status);
}

export function getOpprettetAv(sak: KontrollsakResponse): string {
  return sak.saksbehandlere.opprettetAv.navn ?? sak.saksbehandlere.opprettetAv.navIdent;
}

export function getAvdeling(_sak: KontrollsakResponse): string | null {
  return null;
}

export function getMerkinger(sak: KontrollsakResponse): string[] {
  return sak.merking ? [sak.merking] : [];
}

export function getNavn(_sak: KontrollsakResponse): string | null {
  return null;
}

export function getAlder(_sak: KontrollsakResponse): number | null {
  return null;
}

export function getMisbrukstyper(sak: KontrollsakResponse): string[] {
  return sak.misbruktype;
}

export function getBelop(sak: KontrollsakResponse): number | null {
  return sak.ytelser.reduce<number | null>((sum, ytelse) => {
    if (ytelse.belop === null) {
      return sum;
    }

    return (sum ?? 0) + ytelse.belop;
  }, null);
}

export function getResultatstruktur(sak: KontrollsakResponse) {
  return sak.resultat;
}

export function getMineSakerGruppeStatus(sak: KontrollsakResponse): MineSakerGruppeStatus {
  switch (sak.status) {
    case "UFORDELT":
    case "UTREDES":
      return "aktive";
    case "FORVALTNING":
      return "ventende";
    case "AVSLUTTET":
      return "fullførte";
    default:
      return "aktive";
  }
}

export function getMineSakerTittel(sak: KontrollsakResponse): string {
  const ytelser = getYtelseTyper(sak).join(" / ");
  const kategori = getKategoriText(sak);

  return kategori ? `${kategori} - ${ytelser}` : ytelser;
}

export function getMineSakerPeriodeTekst(sak: KontrollsakResponse): string {
  const førsteYtelse = sak.ytelser[0];

  if (!førsteYtelse) {
    return "Ytelser i perioden ukjent periode";
  }

  return `Ytelser i perioden ${formaterTallDato(førsteYtelse.periodeFra)} - ${formaterTallDato(førsteYtelse.periodeTil)}`;
}

export function getMineSakerOpprettetTekst(sak: KontrollsakResponse): string {
  return `Opprettet ${formaterTallDato(getOpprettetDato(sak))}`;
}

export function getMineSakerIkonType(
  sak: KontrollsakResponse,
): "tasklist" | "envelope" | "buildings" | "files" | "folder" {
  switch (sak.kilde) {
    case "ANONYM_TIPS":
      return "tasklist";
    case "EKSTERN":
      return "buildings";
    case "INTERN":
      return "files";
    default:
      return "files";
  }
}

function formaterTallDato(dato: string) {
  return new Intl.DateTimeFormat("nb-NO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(dato));
}
