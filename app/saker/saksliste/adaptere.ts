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
import { getStatus, hentStatusVariant } from "~/saker/visning";
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
    status: { tekst: getStatus(sak), variant: hentStatusVariant(sak.status) },
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
    status: sak.status,
    opprettet: sak.opprettetDato,
    oppdatert: sak.oppdatertDato,
    saksbehandler: null,
  };
}
