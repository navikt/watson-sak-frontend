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
  getSaksenhet,
  getStatusVariantForSak,
  getTags,
} from "./selectors";

function lagKontrollsak(overrides: Partial<KontrollsakResponse> = {}): KontrollsakResponse {
  return {
    id: 6,
    personIdent: "10987654321",
    personNavn: "Ola Nordmann",
    saksbehandlere: {
      eier: {
        navIdent: "Z123456",
        navn: "Saks Behandler",
        enhet: "4812",
      },
      deltMed: [],
      opprettetAv: {
        navIdent: "Z654321",
        navn: "Oppretter",
        enhet: "4801",
      },
    },
    status: "UTREDES",
    kategori: "ARBEID",
    kilde: "NAV_KONTROLL",
    misbruktype: [],
    prioritet: "NORMAL",
    blokkert: null,
    ytelser: [
      {
        id: "ytelse-1",
        type: "Sykepenger",
        periodeFra: "2026-01-01",
        periodeTil: "2026-01-31",
        belop: null,
      },
      {
        id: "ytelse-2",
        type: "Dagpenger",
        periodeFra: "2026-01-01",
        periodeTil: "2026-01-31",
        belop: null,
      },
    ],
    merking: null,
    opprettet: "2026-02-03T10:11:12Z",
    oppdatert: null,
    oppgaver: [],
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

    expect(getKategoriText(sak)).toBe("Arbeid");
    expect(getStatusVariantForSak(sak)).toBe("warning");
  });

  it("bruker enhet fra saksbehandler som saksenhet og skjuler legacy-only metadata for kontrollsak", () => {
    const sak = lagKontrollsak();

    expect(getSaksenhet(sak)).toBe("4812");
    expect(getAvdeling(sak)).toBeNull();
    expect(getTags(sak)).toEqual([]);
  });

  it("returnerer merking fra sak når feltet er satt", () => {
    const sak = lagKontrollsak({ merking: "PRIORITERT" });
    expect(getTags(sak)).toEqual(["PRIORITERT"]);
  });

  it("returnerer personnavn når feltet er satt", () => {
    const sak = lagKontrollsak({ personNavn: "Ola Nordmann" });
    expect(getNavn(sak)).toBe("Ola Nordmann");
    expect(getAlder(sak)).toBeNull();
  });

  it("returnerer null for alder når backend ikke lenger sender alder", () => {
    const sak = lagKontrollsak();
    expect(getNavn(sak)).toBe("Ola Nordmann");
    expect(getAlder(sak)).toBeNull();
  });

  it("returnerer misbrukstyper når feltet er satt", () => {
    const sak = lagKontrollsak({
      kategori: "UTLAND",
      misbruktype: ["UTENFOR_EOS", "INNENFOR_EOS"],
    });
    expect(getMisbrukstyper(sak)).toEqual(["Utenfor EØS", "Innenfor EØS"]);
  });

  it("returnerer tomt array for misbrukstyper når feltet mangler", () => {
    expect(getMisbrukstyper(lagKontrollsak())).toEqual([]);
  });

  it("returnerer beløp når feltet er satt", () => {
    const sak = lagKontrollsak({ ytelser: [{ ...lagKontrollsak().ytelser[0], belop: 300000 }] });
    expect(getBelop(sak)).toBe(300000);
  });

  it("returnerer null for beløp når feltet mangler", () => {
    expect(getBelop(lagKontrollsak())).toBeNull();
  });
});
