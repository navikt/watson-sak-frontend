import type { Kodeverk } from "~/saker/api.server";
import type { YtelseRadVerdier } from "./skjema-helpers";

type TilfeldigSak = {
  kategori: string;
  misbruktyper: string[];
  merkinger: string[];
  kilde: string;
  enhet: string;
  ytelser: YtelseRadVerdier[];
};

function velgTilfeldig<T>(verdier: readonly T[], tilfeldig: () => number): T {
  const verdi = verdier[Math.min(Math.floor(tilfeldig() * verdier.length), verdier.length - 1)];
  if (verdi === undefined) {
    throw new Error("Kan ikke velge tilfeldig fra en tom liste");
  }
  return verdi;
}

export function erStøttetMiljøForTilfeldigSak(miljø: string | undefined): boolean {
  return miljø?.startsWith("local") === true || miljø === "demo" || miljø === "dev";
}

export function lagTilfeldigSak(
  kodeverk: Kodeverk,
  tilfeldig: () => number = Math.random,
): TilfeldigSak | null {
  const kategorierMedMisbrukstyper = kodeverk.kategorier.filter((kategori) =>
    kodeverk.misbrukstyper.some((misbruktype) => misbruktype.kategori === kategori.kode),
  );

  if (
    kategorierMedMisbrukstyper.length === 0 ||
    kodeverk.kilder.length === 0 ||
    kodeverk.enheter.length === 0 ||
    kodeverk.ytelseTyper.length === 0
  ) {
    return null;
  }

  const kategori = velgTilfeldig(kategorierMedMisbrukstyper, tilfeldig);
  const misbruktyper = kodeverk.misbrukstyper.filter(
    (misbruktype) => misbruktype.kategori === kategori.kode,
  );
  const år = new Date().getFullYear() - 1 - Math.floor(tilfeldig() * 3);

  return {
    kategori: kategori.kode,
    misbruktyper: [velgTilfeldig(misbruktyper, tilfeldig).kode],
    merkinger: kodeverk.merker.length > 0 ? [velgTilfeldig(kodeverk.merker, tilfeldig)] : [],
    kilde: velgTilfeldig(kodeverk.kilder, tilfeldig).kode,
    enhet: velgTilfeldig(kodeverk.enheter, tilfeldig).kode,
    ytelser: [
      {
        type: velgTilfeldig(kodeverk.ytelseTyper, tilfeldig).kode,
        fraDato: `${år}-01-01`,
        tilDato: `${år}-12-31`,
        beløp: String(20_000 + Math.floor(tilfeldig() * 480_000)),
      },
    ],
  };
}
