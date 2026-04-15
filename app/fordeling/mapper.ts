import type { KontrollsakResponse } from "./types.backend";
import type { FordelingSak } from "./typer";
import { kontrollsakKategoriEtiketter } from "~/saker/kategorier";

const ufordelteStatuser = new Set(["UFORDELT"]);

export function erUfordeltKontrollsak(kontrollsak: KontrollsakResponse) {
  return ufordelteStatuser.has(kontrollsak.status);
}

export function mapKontrollsakTilFordelingSak(kontrollsak: KontrollsakResponse): FordelingSak {
  return {
    id: kontrollsak.id,
    navn: null,
    opprettetDato: kontrollsak.opprettet.slice(0, 10),
    oppdatertDato: (kontrollsak.oppdatert ?? kontrollsak.opprettet).slice(0, 10),
    kategori: kategoriEtikett(kontrollsak.kategori),
    misbrukstyper: kontrollsak.misbruktype,
    ytelser: kontrollsak.ytelser.map((ytelse) => ytelse.type),
  };
}

function kategoriEtikett(kategori: string) {
  return (
    kontrollsakKategoriEtiketter[kategori as keyof typeof kontrollsakKategoriEtiketter] ??
    "Ukjent kategori"
  );
}
