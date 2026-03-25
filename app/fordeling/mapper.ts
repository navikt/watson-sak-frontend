import type { KontrollsakResponse } from "./types.backend";
import type { FordelingSak } from "./typer";

const ufordelteStatuser = new Set(["OPPRETTET", "AVKLART"]);

const kategoriEtiketter: Record<string, string> = {
  UDEFINERT: "Udefinert",
  FEILUTBETALING: "Feilutbetaling",
  MISBRUK: "Misbruk",
  OPPFØLGING: "Oppfølging",
};

export function erUfordeltKontrollsak(kontrollsak: KontrollsakResponse) {
  return ufordelteStatuser.has(kontrollsak.status);
}

export function mapKontrollsakTilFordelingSak(kontrollsak: KontrollsakResponse): FordelingSak {
  return {
    id: kontrollsak.id,
    opprettetDato: kontrollsak.opprettet.slice(0, 10),
    kategori: kategoriEtikett(kontrollsak.kategori),
    kategoriVariant: "neutral",
    ytelser: kontrollsak.ytelser.map((ytelse) => ytelse.type),
  };
}

function kategoriEtikett(kategori: string) {
  return kategoriEtiketter[kategori] ?? "Ukjent kategori";
}
