import type { KontrollsakResponse } from "./types.backend";
import type { FordelingSak } from "./typer";
import { kontrollsakKategoriEtiketter } from "~/saker/kategorier";
import { formaterBlokkeringsarsak, formaterMisbrukstype, getStatus } from "~/saker/visning";

export function erEierlosKontrollsak(kontrollsak: KontrollsakResponse) {
  return kontrollsak.saksbehandlere.eier === null;
}

export function mapKontrollsakTilFordelingSak(kontrollsak: KontrollsakResponse): FordelingSak {
  return {
    id: kontrollsak.id,
    navn: kontrollsak.kontrollobjekt.navn,
    opprettetDato: kontrollsak.opprettet.slice(0, 10),
    oppdatertDato: (kontrollsak.oppdatert ?? kontrollsak.opprettet).slice(0, 10),
    kategori: kategoriEtikett(kontrollsak.kategori),
    misbrukstyper: kontrollsak.misbruktype.map(formaterMisbrukstype),
    ytelser: kontrollsak.ytelser.map((ytelse) => ytelse.type),
    status: getStatus(kontrollsak),
    ventestatus: kontrollsak.blokkert ? formaterBlokkeringsarsak(kontrollsak.blokkert) : null,
  };
}

function kategoriEtikett(kategori: string) {
  return (
    kontrollsakKategoriEtiketter[kategori as keyof typeof kontrollsakKategoriEtiketter] ??
    "Ukjent kategori"
  );
}
