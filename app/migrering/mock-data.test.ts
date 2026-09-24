import { describe, expect, it } from "vitest";
import {
  kategoriEtikett,
  kildeEtikett,
  type MigreringKategori,
  type Migreringskilde,
} from "./types";
import { hentMockMigreringKandidater } from "./mock-data.server";

describe("Migrering typer og mock-data", () => {
  it("har oppdaterte kandidatfelter iht 2.a kontrakten (kategori, legacyKilde, legacyPid, enhet, ekskluderFraStatistikk)", () => {
    const kandidater = hentMockMigreringKandidater("Z999999");
    expect(kandidater.length).toBeGreaterThan(0);

    const kandidat = kandidater[0];
    expect(kandidat.kandidatId).toBeDefined();
    expect(kandidat.kilde).toBeDefined();
    expect(kandidat.legacyKilde).toBe(kandidat.kilde);
    expect(kandidat.legacyPid).toBe(kandidat.pid);
    expect(kandidat.kategori).toBeDefined();
    expect(typeof kandidat.ekskluderFraStatistikk).toBe("boolean");
    expect(kandidat.enhet).toBeDefined();
  });

  it("dekker alle seks kategorier i mockdata uten reelle FNR", () => {
    const kandidater = hentMockMigreringKandidater("Z999999");

    const alleKategorier: MigreringKategori[] = [
      "TIPS_RESTANSE",
      "TIPS_VENTER_RESULTAT",
      "SV_RESTANSE",
      "SV_VENTER_RESULTAT",
      "REGISTER_DAGPENGER",
      "REGISTER_AAP",
    ];

    const representerteKategorier = new Set(kandidater.map((k) => k.kategori));
    for (const kategori of alleKategorier) {
      expect(representerteKategorier.has(kategori)).toBe(true);
      expect(kategoriEtikett[kategori]).toBeDefined();
    }

    // Valider at ingen syntetiske kildefelter eller felter inneholder 11-sifrede fødselsnumre
    const fnrRegex = /\b\d{11}\b/;
    for (const k of kandidater) {
      expect(fnrRegex.test(k.navn)).toBe(false);
      expect(fnrRegex.test(k.begrunnelse)).toBe(false);
      for (const felt of k.kildefelter) {
        if (felt.verdi) {
          expect(fnrRegex.test(felt.verdi)).toBe(false);
        }
      }
    }
  });

  it("støtter alle fire migreringskilder i kildeEtikett", () => {
    const alleKilder: Migreringskilde[] = ["UTREDNING", "SV", "NKA_DAGPENGER", "NKA_AAP"];
    for (const kilde of alleKilder) {
      expect(kildeEtikett[kilde]).toBeDefined();
    }
  });

  it("setter ekskluderFraStatistikk = true for arbeidsgiveranmeldelse i SV_VENTER_RESULTAT", () => {
    const kandidater = hentMockMigreringKandidater("Z999999");
    const agiverKandidat = kandidater.find(
      (k) => k.kategori === "SV_VENTER_RESULTAT" && k.ekskluderFraStatistikk,
    );
    expect(agiverKandidat).toBeDefined();
    expect(
      agiverKandidat?.kildefelter.some((f) => f.felt === "SVRES" && f.verdi === "Anm. Agiver"),
    ).toBe(true);
  });

  it("har kandidater med vurdering MA_AVKLARES i mockdata", () => {
    const kandidater = hentMockMigreringKandidater("Z999999");
    const maAvklares = kandidater.filter((k) => k.vurdering === "MA_AVKLARES");
    expect(maAvklares.length).toBeGreaterThan(0);
  });
});
