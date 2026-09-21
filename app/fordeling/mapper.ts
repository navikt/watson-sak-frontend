import type { KontrollsakResponse } from "./types.backend";
import type { FordelingSak } from "./typer";
import { kontrollsakKategoriEtiketter } from "~/saker/kategorier";
import {
  formaterSteg,
  formaterMisbrukstype,
  formaterStatus,
  formaterYtelseType,
} from "~/saker/visning";

export function erEierlosKontrollsak(kontrollsak: KontrollsakResponse) {
  return kontrollsak.saksbehandlere.eier === null;
}

export function mapKontrollsakTilFordelingSak(kontrollsak: KontrollsakResponse): FordelingSak {
  return {
    id: kontrollsak.id,
    navn: kontrollsak.personNavn ?? null,
    opprettetDato: kontrollsak.opprettet.slice(0, 10),
    oppdatertDato: (kontrollsak.oppdatert ?? kontrollsak.opprettet).slice(0, 10),
    kategori: kategoriEtikett(kontrollsak.kategori),
    misbrukstyper: kontrollsak.misbruktype.map(formaterMisbrukstype),
    ytelser: kontrollsak.ytelser.map((ytelse) => formaterYtelseType(ytelse.type)),
    merking: kontrollsak.merking,
    steg: formaterSteg(kontrollsak.steg),
    stegKode: kontrollsak.steg,
    status: kontrollsak.status ? formaterStatus(kontrollsak.status) : null,
  };
}

function kategoriEtikett(kategori: string) {
  return (
    kontrollsakKategoriEtiketter[kategori as keyof typeof kontrollsakKategoriEtiketter] ??
    "Ukjent kategori"
  );
}
