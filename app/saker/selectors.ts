import { formaterDato } from "~/utils/date-utils";
import type { KontrollsakResponse } from "./types.backend";
import {
  formaterKategori,
  formaterMisbrukstype,
  formaterPeriodeForYtelser,
  getYtelseTyper,
  hentStegVariant as hentKontrollsakStegVariant,
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

export function getStegVariantForSak(sak: KontrollsakResponse) {
  return hentKontrollsakStegVariant(sak.steg);
}

export function getSaksenhet(sak: KontrollsakResponse): string {
  return sak.enhet ?? sak.saksbehandlere.eier?.enhet ?? sak.saksbehandlere.opprettetAv.enhet ?? "";
}

export function getAvdeling(_sak: KontrollsakResponse): string | null {
  return null;
}

export function getTags(sak: KontrollsakResponse): string[] {
  return sak.merking;
}

export function getNavn(sak: KontrollsakResponse): string | null {
  return sak.personNavn ?? null;
}

export function getAlder(_sak: KontrollsakResponse): number | null {
  return null;
}

export function getMisbrukstyper(sak: KontrollsakResponse): string[] {
  return sak.misbruktype.map(formaterMisbrukstype);
}

export function getBelop(sak: KontrollsakResponse): number | null {
  return sak.ytelser.find((ytelse) => ytelse.belop !== null)?.belop ?? null;
}

export function getMineSakerGruppeStatus(sak: KontrollsakResponse): MineSakerGruppeStatus {
  if (sak.status !== null && sak.status !== "AKTIV") {
    return "ventende";
  }

  switch (sak.steg) {
    case "OPPRETTET":
    case "UTREDNING":
    case "UTREDES":
    case "FORVALTNING":
    case "STRAFFERETTSLIG_VURDERING":
      return "aktive";
    case "POLITI":
    case "ANMELDT":
    case "AVSLUTTET":
      return "fullførte";
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
    case "POLITIET":
      return "buildings";
    case "PUBLIKUM":
      return "tasklist";
    case "NAV_KONTROLL":
    case "NAV_OVRIG":
    case "REGISTERSAMKJORING":
      return "files";
    default:
      return "files";
  }
}

function formaterTallDato(dato: string | null) {
  if (!dato) return "ukjent dato";
  return new Intl.DateTimeFormat("nb-NO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(dato));
}
