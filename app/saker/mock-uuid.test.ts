import { describe, expect, it } from "vitest";
import { normaliserLegacyKontrollsak } from "./mock-uuid";

describe("normaliserLegacyKontrollsak", () => {
  it("mapper legacy-felter til backend-shape og lager stabile mock-uuid-er", () => {
    const sak = normaliserLegacyKontrollsak(
      {
        id: "201",
        personIdent: "12345678901",
        navn: "Ola Nordmann",
        saksbehandler: "Z123456",
        mottakEnhet: "4812",
        status: "TIL_FORVALTNING",
        kategori: "ARBEID",
        prioritet: "NORMAL",
        bakgrunn: { kilde: "ANONYM_TIPS" },
        misbrukstyper: ["Svart arbeid"],
        belop: 123456,
        ytelser: [
          {
            id: "ytelse-1",
            type: "Dagpenger",
            periodeFra: "2026-01-01",
            periodeTil: "2026-01-31",
          },
        ],
        opprettet: "2026-01-01T00:00:00Z",
      },
      2,
    );

    expect(sak.id).toBe("00000000-0000-4000-8000-000002201000");
    expect(sak.status).toBe("FORVALTNING");
    expect(sak.kilde).toBe("PUBLIKUM");
    expect(sak.misbruktype).toEqual(["SVART_ARBEID"]);
    expect(sak.personNavn).toBe("Ola Nordmann");
    expect(sak.saksbehandlere.eier).toEqual({
      navIdent: "Z123456",
      navn: "Z123456",
      enhet: "4812",
    });
    expect(sak.ytelser).toEqual([
      {
        id: "00000000-0000-4000-8000-000002201101",
        type: "Dagpenger",
        periodeFra: "2026-01-01",
        periodeTil: "2026-01-31",
        belop: 123456,
      },
    ]);
  });

  it("faller tilbake trygt når legacy-eier og kategorifelter mangler", () => {
    const sak = normaliserLegacyKontrollsak(
      {
        id: "xyz-7",
        personIdent: "12345678901",
        status: "AVKLART",
        kategori: "UKJENT",
        ytelser: [
          {
            type: "Sykepenger",
            periodeFra: "2026-02-01",
            periodeTil: "2026-02-28",
          },
        ],
        opprettet: "2026-02-01T00:00:00Z",
      },
      4,
    );

    expect(sak.id).toBe("00000000-0000-4000-8000-000004007000");
    expect(sak.status).toBe("UFORDELT");
    expect(sak.kategori).toBe("ANNET");
    expect(sak.kilde).toBe("ANNET");
    expect(sak.misbruktype).toEqual([]);
    expect(sak.personNavn).toBe("Ukjent navn");
    expect(sak.saksbehandlere.eier).toBeNull();
    expect(sak.saksbehandlere.opprettetAv).toEqual({
      navIdent: "Z999999",
      navn: "Ukjent",
      enhet: null,
    });
    expect(sak.ytelser[0]?.id).toBe("00000000-0000-4000-8000-000004007101");
    expect(sak.ytelser[0]?.belop).toBeNull();
  });

  it("setter eier til null når legacy-status normaliseres til ufordelt", () => {
    const sak = normaliserLegacyKontrollsak(
      {
        id: "101",
        personIdent: "12345678901",
        navn: "Ola Nordmann",
        saksbehandler: "Z123456",
        mottakEnhet: "4812",
        status: "OPPRETTET",
        kategori: "ARBEID",
        ytelser: [
          {
            type: "Dagpenger",
            periodeFra: "2026-01-01",
            periodeTil: "2026-01-31",
          },
        ],
        opprettet: "2026-01-01T00:00:00Z",
      },
      1,
    );

    expect(sak.status).toBe("UFORDELT");
    expect(sak.saksbehandlere.eier).toBeNull();
    expect(sak.saksbehandlere.opprettetAv).toEqual({
      navIdent: "Z123456",
      navn: "Z123456",
      enhet: "4812",
    });
  });
});
