import type { Kodeverk } from "~/saker/api.server";
import {
  kontrollsakKategoriEtiketter,
  kontrollsakKategoriVerdier,
  kontrollsakKildeEtiketter,
  kontrollsakKildeVerdier,
  kontrollsakMisbrukstypeEtiketter,
  kontrollsakMisbrukstypeVerdier,
  kontrollsakYtelseTypeEtiketter,
  kontrollsakYtelseTypeVerdier,
  misbrukstyperPerKategori,
} from "~/saker/kategorier";
import { merkingAlternativer } from "~/registrer-sak/validering";

export const mockKodeverk: Kodeverk = {
  merker: [...merkingAlternativer],
  kategorier: [...kontrollsakKategoriVerdier].map((kode) => ({
    kode,
    beskrivelse: kontrollsakKategoriEtiketter[kode],
  })),
  misbrukstyper: [...kontrollsakMisbrukstypeVerdier].map((kode) => {
    const kategori = Object.entries(misbrukstyperPerKategori).find(([, typer]) =>
      typer?.includes(kode as never),
    )?.[0];
    return {
      kode,
      kategori: kategori ?? "ANNET",
      beskrivelse: kontrollsakMisbrukstypeEtiketter[kode],
    };
  }),
  ytelseTyper: [...kontrollsakYtelseTypeVerdier].map((kode) => ({
    kode,
    beskrivelse: kontrollsakYtelseTypeEtiketter[kode],
  })),
  kilder: [...kontrollsakKildeVerdier].map((kode) => ({
    kode,
    beskrivelse: kontrollsakKildeEtiketter[kode],
  })),
};
