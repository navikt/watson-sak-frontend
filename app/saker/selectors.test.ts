import { describe, expect, it } from "vitest";
import type { KontrollsakResponse } from "./types.backend";
import {
  getAlder,
  getAvdeling,
  getBelop,
  getKategoriText,
  getMisbrukstyper,
  getNavn,
  getOppdatertDato,
  getOpprettetDato,
  getPeriodeText,
  getResultat,
  getSaksenhet,
  getStatusVariantForSak,
  getTags,
} from "./selectors";

function lagKontrollsak(overrides: Partial<KontrollsakResponse> = {}): KontrollsakResponse {
  return {
    id: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    personIdent: "10987654321",
    saksbehandlere: {
      eier: {
        navIdent: "Z123456",
        navn: "Saksbehandler Navn",
      },
      deltMed: [],
      opprettetAv: {
        navIdent: "Z654321",
        navn: "Oppretter Navn",
      },
    },
    status: "UTREDES",
    kategori: "FEILUTBETALING",
    kilde: "ANONYM_TIPS",
    misbruktype: [],
    prioritet: "NORMAL",
    ytelser: [
      {
        id: "2fa85f64-5717-4562-b3fc-2c963f66afa6",
        type: "Sykepenger",
        periodeFra: "2026-01-01",
        periodeTil: "2026-01-31",
        belop: 300000,
      },
      {
        id: "1fa85f64-5717-4562-b3fc-2c963f66afa6",
        type: "Dagpenger",
        periodeFra: "2026-01-01",
        periodeTil: "2026-01-31",
        belop: null,
      },
    ],
    merking: null,
    resultat: null,
    opprettet: "2026-02-03T10:11:12Z",
    oppdatert: null,
    ...overrides,
  };
}

describe("saker-selectors", () => {
  it("bruker opprettet for kontrollsak", () => {
    expect(getOpprettetDato(lagKontrollsak())).toBe("2026-02-03T10:11:12Z");
  });

  it("bruker opprettet som fallback for oppdatert", () => {
    expect(getOppdatertDato(lagKontrollsak())).toBe("2026-02-03T10:11:12Z");
    expect(getOppdatertDato(lagKontrollsak({ oppdatert: "2026-02-04T10:11:12Z" }))).toBe(
      "2026-02-04T10:11:12Z",
    );
  });

  it("bygger periodevisning fra backend-ytelser", () => {
    expect(getPeriodeText(lagKontrollsak())).toBe("1. jan. 2026 – 31. jan. 2026");
  });

  it("returnerer null når kontrollsak mangler ytelser", () => {
    expect(getPeriodeText(lagKontrollsak({ ytelser: [] }))).toBeNull();
  });

  it("mapper backend-kategori og backend-statusvariant for kontrollsak", () => {
    const sak = lagKontrollsak();

    expect(getKategoriText(sak)).toBe("Feilutbetaling");
    expect(getStatusVariantForSak(sak)).toBe("warning");
  });

  it("bruker opprettetAv som saksenhet og skjuler avdeling for kontrollsak", () => {
    const sak = lagKontrollsak();

    expect(getSaksenhet(sak)).toBe("Oppretter Navn");
    expect(getAvdeling(sak)).toBeNull();
    expect(getTags(sak)).toEqual([]);
  });

  it("returnerer merking fra sak når feltet er satt", () => {
    const sak = lagKontrollsak({ merking: "PRIORITERT" });
    expect(getTags(sak)).toEqual(["PRIORITERT"]);
  });

  it("håndterer resultat null-sikkert for kontrollsak", () => {
    expect(getResultat(lagKontrollsak())).toBeNull();
  });

  it("returnerer null for navn og alder når feltene mangler", () => {
    const sak = lagKontrollsak();
    expect(getNavn(sak)).toBeNull();
    expect(getAlder(sak)).toBeNull();
  });

  it("returnerer misbrukstyper når feltet er satt", () => {
    const sak = lagKontrollsak({
      kategori: "MISBRUK",
      misbruktype: ["Utenfor EØS", "Innenfor EØS"],
    });
    expect(getMisbrukstyper(sak)).toEqual(["Utenfor EØS", "Innenfor EØS"]);
  });

  it("returnerer tomt array for misbrukstyper når feltet mangler", () => {
    expect(getMisbrukstyper(lagKontrollsak())).toEqual([]);
  });

  it("returnerer beløp når feltet er satt", () => {
    const sak = lagKontrollsak();
    expect(getBelop(sak)).toBe(300000);
  });

  it("returnerer null for beløp når feltet mangler", () => {
    expect(
      getBelop(
        lagKontrollsak({
          ytelser: [
            {
              id: "2fa85f64-5717-4562-b3fc-2c963f66afa6",
              type: "Sykepenger",
              periodeFra: "2026-01-01",
              periodeTil: "2026-01-31",
              belop: null,
            },
          ],
        }),
      ),
    ).toBeNull();
  });
});
