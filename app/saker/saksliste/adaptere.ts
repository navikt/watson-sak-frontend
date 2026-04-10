import { RouteConfig } from "~/routeConfig";
import type { FordelingSak } from "~/fordeling/typer";
import { getSaksreferanse } from "~/saker/id";
import {
  getKategoriText,
  getMisbrukstyper,
  getNavn,
  getOppdatertDato,
  getOpprettetDato,
} from "~/saker/selectors";
import type { KontrollsakResponse } from "~/saker/types.backend";
import type { SakslisteRad } from "./Saksliste";

export function mapKontrollsakTilSakslisteRad(sak: KontrollsakResponse): SakslisteRad {
  const saksreferanse = getSaksreferanse(sak.id);

  return {
    id: sak.id,
    saksreferanse,
    detaljHref: RouteConfig.SAKER_DETALJ.replace(":sakId", saksreferanse),
    navn: getNavn(sak),
    kategori: getKategoriText(sak),
    misbrukstyper: getMisbrukstyper(sak),
    opprettet: getOpprettetDato(sak),
    oppdatert: getOppdatertDato(sak),
  };
}

export function mapFordelingSakTilSakslisteRad(sak: FordelingSak): SakslisteRad {
  const saksreferanse = getSaksreferanse(sak.id);

  return {
    id: sak.id,
    saksreferanse,
    detaljHref: RouteConfig.SAKER_DETALJ.replace(":sakId", saksreferanse),
    navn: sak.navn,
    kategori: sak.kategori,
    misbrukstyper: sak.misbrukstyper,
    opprettet: sak.opprettetDato,
    oppdatert: sak.oppdatertDato,
  };
}
