import { beforeEach, describe, expect, it } from "vitest";
import {
  normaliserLegacyKontrollsak,
  nullstillMockStatushistorikk,
  oppdaterTilgjengeligeHandlinger,
} from "./mock-uuid";

describe("normaliserLegacyKontrollsak", () => {
  beforeEach(() => {
    nullstillMockStatushistorikk();
  });

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
    expect(sak.status).toBe("VENTER_PA_VEDTAK");
    expect(sak.kilde).toBe("PUBLIKUM");
    expect(sak.misbruktype).toEqual(["SVART_ARBEID"]);
    expect(sak.personNavn).toBe("Ola Nordmann");
    expect(sak.saksbehandlere.eier).toBeNull();
    expect(sak.ytelser).toEqual([
      {
        id: "00000000-0000-4000-8000-000002201101",
        type: "Dagpenger",
        periodeFra: "2026-01-01",
        periodeTil: "2026-01-31",
        belop: 123456,
      },
    ]);
    expect(sak.tilgjengeligeHandlinger).toEqual([
      {
        handling: "TILDEL",
        pakrevdeFelter: [{ felt: "navIdent", tillatteVerdier: [] }],
        resultatStatus: "VENTER_PA_VEDTAK",
      },
      {
        handling: "SETT_BERO",
        pakrevdeFelter: [],
        resultatStatus: "VENTER_PA_VEDTAK",
      },
    ]);
  });

  it("eksponerer vurder anmeldelse og henlegg fra VENTER_PA_VEDTAK med eier", () => {
    const sak = normaliserLegacyKontrollsak(
      {
        id: "601",
        personIdent: "12345678901",
        navn: "Ola Nordmann",
        saksbehandler: "Z123456",
        mottakEnhet: "4812",
        status: "TIL_FORVALTNING",
        kategori: "ARBEID",
        ytelser: [],
        opprettet: "2026-01-01T00:00:00Z",
      },
      6,
    );

    sak.saksbehandlere.eier = {
      navIdent: "Z123456",
      navn: "Kari Nordmann",
      enhet: "4812",
    };
    oppdaterTilgjengeligeHandlinger(sak);

    expect(sak.status).toBe("VENTER_PA_VEDTAK");
    expect(sak.tilgjengeligeHandlinger).toEqual([
      {
        handling: "SETT_ANMELDELSE_VURDERES",
        pakrevdeFelter: [],
        resultatStatus: "ANMELDELSE_VURDERES",
      },
      {
        handling: "SETT_HENLAGT",
        pakrevdeFelter: [],
        resultatStatus: "HENLAGT",
      },
      {
        handling: "SETT_BERO",
        pakrevdeFelter: [],
        resultatStatus: "VENTER_PA_VEDTAK",
      },
      {
        handling: "FRISTILL",
        pakrevdeFelter: [],
        resultatStatus: "VENTER_PA_VEDTAK",
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
    expect(sak.status).toBe("OPPRETTET");
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

  it("setter eier til null når legacy-status normaliseres til opprettet", () => {
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

    expect(sak.status).toBe("OPPRETTET");
    expect(sak.saksbehandlere.eier).toBeNull();
    expect(sak.saksbehandlere.opprettetAv).toEqual({
      navIdent: "Z123456",
      navn: "Z123456",
      enhet: "4812",
    });
  });

  it("krever tildeling for ownerløs henlagt sak i mock-tilstandsmaskinen", () => {
    const sak = normaliserLegacyKontrollsak(
      {
        id: "301",
        personIdent: "12345678901",
        status: "HENLAGT",
        kategori: "ARBEID",
        ytelser: [],
        opprettet: "2026-01-01T00:00:00Z",
      },
      3,
    );

    expect(sak.tilgjengeligeHandlinger).toEqual([
      {
        handling: "TILDEL",
        pakrevdeFelter: [{ felt: "navIdent", tillatteVerdier: [] }],
        resultatStatus: "HENLAGT",
      },
    ]);
  });

  it("lar eierløs sak i bero eksponere tildel og ta av bero", () => {
    const sak = normaliserLegacyKontrollsak(
      {
        id: "401",
        personIdent: "12345678901",
        status: "I_BERO",
        kategori: "ARBEID",
        ytelser: [],
        opprettet: "2026-01-01T00:00:00Z",
      },
      4,
    );

    oppdaterTilgjengeligeHandlinger(sak);

    expect(sak.iBero).toBe(true);
    expect(sak.status).toBe("OPPRETTET");
    expect(sak.tilgjengeligeHandlinger).toEqual([
      {
        handling: "TILDEL",
        pakrevdeFelter: [{ felt: "navIdent", tillatteVerdier: [] }],
        resultatStatus: "OPPRETTET",
      },
      {
        handling: "TA_AV_BERO",
        pakrevdeFelter: [],
        resultatStatus: "OPPRETTET",
      },
    ]);
  });

  it("bevarer underliggende status når owner fristilles i bero", () => {
    const sak = normaliserLegacyKontrollsak(
      {
        id: "501",
        personIdent: "12345678901",
        status: "VENTER_PA_VEDTAK",
        kategori: "ARBEID",
        ytelser: [],
        opprettet: "2026-01-01T00:00:00Z",
        iBero: true,
        saksbehandlere: {
          eier: {
            navn: "Kari Nordmann",
            navIdent: "Z123456",
            enhet: "4812",
          },
        },
      },
      5,
    );

    sak.iBero = true;
    sak.saksbehandlere.eier = null;
    oppdaterTilgjengeligeHandlinger(sak);

    expect(sak.status).toBe("VENTER_PA_VEDTAK");
    expect(sak.tilgjengeligeHandlinger).toEqual([
      {
        handling: "TILDEL",
        pakrevdeFelter: [{ felt: "navIdent", tillatteVerdier: [] }],
        resultatStatus: "VENTER_PA_VEDTAK",
      },
      {
        handling: "TA_AV_BERO",
        pakrevdeFelter: [],
        resultatStatus: "VENTER_PA_VEDTAK",
      },
    ]);
  });
});
