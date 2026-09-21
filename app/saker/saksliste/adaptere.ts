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
import { formaterSteg, formaterStatus } from "~/saker/visning";
import type { SakslisteRad } from "./Saksliste";

export function mapKontrollsakTilSakslisteRad(
  sak: KontrollsakResponse,
  detaljSti = RouteConfig.SAKER_DETALJ.replace("/:sakId", ""),
): SakslisteRad {
  const saksreferanse = getSaksreferanse(sak.id);

  return {
    id: sak.id,
    saksreferanse,
    detaljHref: `${detaljSti}/${saksreferanse}`,
    navn: getNavn(sak),
    kategori: getKategoriText(sak),
    misbrukstyper: getMisbrukstyper(sak),
    steg: formaterSteg(sak.steg),
    status: sak.status ? formaterStatus(sak.status) : null,
    opprettet: getOpprettetDato(sak),
    oppdatert: getOppdatertDato(sak),
    saksbehandler: sak.saksbehandlere.eier?.navn ?? null,
  };
}

export function mapFordelingSakTilSakslisteRad(
  sak: FordelingSak,
  detaljSti = RouteConfig.SAKER_DETALJ.replace("/:sakId", ""),
): SakslisteRad {
  const saksreferanse = getSaksreferanse(sak.id);

  return {
    id: sak.id,
    saksreferanse,
    detaljHref: `${detaljSti}/${saksreferanse}`,
    navn: sak.navn,
    kategori: sak.kategori,
    misbrukstyper: sak.misbrukstyper,
    steg: sak.steg,
    status: sak.status,
    opprettet: sak.opprettetDato,
    oppdatert: sak.oppdatertDato,
    saksbehandler: null,
  };
}
