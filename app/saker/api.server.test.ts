import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("~/config/env.server", () => ({
  BACKEND_API_URL: "https://backend.test",
  skalBrukeMockdata: false,
}));

describe("hentKodeverk", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("henter kodeverk fra endepunktet og returnerer alle felter", async () => {
    const mockRespons = {
      merker: ["PRIORITERT", "HASTEBEHANDLING"],
      kategorier: [{ kode: "ARBEID", beskrivelse: "Arbeid" }],
      misbrukstyper: [{ kode: "SVART_ARBEID", kategori: "ARBEID", beskrivelse: "Svart arbeid" }],
      ytelseTyper: [{ kode: "DAGPENGER", beskrivelse: "Dagpenger" }],
      kilder: [{ kode: "PUBLIKUM", beskrivelse: "Publikum" }],
      enheter: [{ kode: "ky153k", beskrivelse: "Øst" }],
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockRespons,
    });
    vi.stubGlobal("fetch", fetchMock);

    const { hentKodeverk } = await import("./api.server");
    const resultat = await hentKodeverk("token-123");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://backend.test/api/v1/kodeverk",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer token-123" }),
      }),
    );
    expect(resultat).toEqual(mockRespons);
  }, 15000);

  it("returnerer tomme lister når ingen verdier finnes", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        merker: [],
        kategorier: [],
        misbrukstyper: [],
        ytelseTyper: [],
        kilder: [],
        enheter: [],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { hentKodeverk } = await import("./api.server");
    const resultat = await hentKodeverk("token");

    expect(resultat.merker).toEqual([]);
    expect(resultat.kategorier).toEqual([]);
  }, 15000);
});

describe("søkKontrollsaker", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe("omdøpFil", () => {
    afterEach(() => {
      vi.restoreAllMocks();
      vi.unstubAllGlobals();
    });

    it("sender bare ny navnedel med PATCH", async () => {
      const omdøptFil = {
        id: "fil-1",
        filnavn: "nytt navn.pdf",
        storrelse: 100,
        contentType: "application/pdf",
        opprettetAv: "Z999999",
        opprettet: "2026-09-16T12:00:00Z",
        bruktIDokumenter: [],
      };
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => omdøptFil,
      });
      vi.stubGlobal("fetch", fetchMock);

      const { omdøpFil } = await import("./api.server");
      const resultat = await omdøpFil("token", "42", "fil-1", "nytt navn");

      expect(fetchMock).toHaveBeenCalledWith(
        "https://backend.test/api/v1/kontrollsaker/42/filer/fil-1",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ navn: "nytt navn" }),
        }),
      );
      expect(resultat.filnavn).toBe("nytt navn.pdf");
    });
  });

  it("søker mot riktig URL med page/size og personIdent i body", async () => {
    const tomSide = { items: [], page: 2, size: 20, totalItems: 0, totalPages: 1 };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => tomSide,
    });
    vi.stubGlobal("fetch", fetchMock);

    const { søkKontrollsaker } = await import("./api.server");
    const resultat = await søkKontrollsaker("token-123", "12345678901", 2, 20);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://backend.test/api/v1/kontrollsaker/sok?page=2&size=20",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ personIdent: "12345678901" }),
        headers: expect.objectContaining({ Authorization: "Bearer token-123" }),
      }),
    );
    expect(resultat).toEqual(tomSide);
  });

  it("kaster feil ved ikke-ok HTTP-svar", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    vi.stubGlobal("fetch", fetchMock);

    const { søkKontrollsaker } = await import("./api.server");

    await expect(søkKontrollsaker("token", "12345678901")).rejects.toThrow();
  });
});

describe("hentHendelser", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("beholder gruppert kommentaraktivitet fra backend", async () => {
    const kommentarAktivitet = {
      handling: "KOMMENTERTE",
      dokumentId: "dokument-1",
      dokumentTittel: "Rapport",
      utfortAvIdent: "Z999999",
      utfortAvNavn: "Test Saksbehandler",
      antall: 2,
      dato: "2026-09-17",
      visningstekst: "Test Saksbehandler kommenterte to ganger i Rapport.",
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => [
          {
            hendelseId: "11111111-1111-4111-8111-111111111111",
            tidspunkt: "2026-09-17T12:00:00Z",
            hendelsesType: "DOKUMENT_KOMMENTERT",
            sakId: 42,
            kommentarAktivitet,
          },
        ],
      }),
    );

    const { hentHendelser } = await import("./api.server");
    const resultat = await hentHendelser("token", "42");

    expect(resultat[0].kommentarAktivitet).toEqual(kommentarAktivitet);
  });
});

describe("søkKontrollsakerOrganisasjon", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("søker mot riktig URL med page/size og organisasjonsnummer i body", async () => {
    const tomSide = { items: [], page: 1, size: 20, totalItems: 0, totalPages: 1 };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => tomSide,
    });
    vi.stubGlobal("fetch", fetchMock);

    const { søkKontrollsakerOrganisasjon } = await import("./api.server");
    const resultat = await søkKontrollsakerOrganisasjon("token-123", "123456789");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://backend.test/api/v1/kontrollsaker/sok/organisasjon?page=1&size=20",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ organisasjonsnummer: "123456789" }),
        headers: expect.objectContaining({ Authorization: "Bearer token-123" }),
      }),
    );
    expect(resultat).toEqual(tomSide);
  });

  it("kaster feil ved ikke-ok HTTP-svar", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    vi.stubGlobal("fetch", fetchMock);

    const { søkKontrollsakerOrganisasjon } = await import("./api.server");

    await expect(søkKontrollsakerOrganisasjon("token", "123456789")).rejects.toThrow();
  });
});

describe("tillatte handlinger og resultatkall", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  const tillatteHandlinger = {
    versjon: 1,
    tilstand: {
      steg: "UTREDNING",
      status: "AKTIV",
      statusFørBero: null,
      resultat: null,
      ytelser: [],
    },
    handlinger: [
      { type: "FLYTT_TIL_NESTE_STEG", metode: "POST", sti: "/api/v1/kontrollsaker/42/steg" },
      { type: "REGISTRER_RESULTAT", metode: "PUT", sti: "/api/v1/kontrollsaker/42/resultat" },
    ],
    tillatteSteg: ["FORVALTNING"],
    tillatteStatuser: ["AKTIV", "I_BERO"],
    tillatteResultater: ["KONTROLLNOTAT"],
    paakrevdeRegistreringer: ["utredning.type"],
    paakrevdeRegistreringerPerSteg: { FORVALTNING: ["utredning.type", "ytelser[].belop"] },
    feltskjema: [
      {
        felt: "utredning.type",
        etikett: "Resultat fra utredningen",
        datatype: "enum",
        paakrevd: true,
        verdier: [{ verdi: "KONTROLLNOTAT", etikett: "Kontrollnotat" }],
      },
    ],
  };

  const kontrollsak = {
    id: 42,
    kontrollobjekt: { personIdent: "12345678901", navn: "Ola Nordmann" },
    saksbehandlere: {
      ansvarlig: null,
      deltMed: [],
      opprettetAv: { navIdent: "Z123456", navn: "Ola Saksbehandler", enhet: null },
    },
    steg: "UTREDNING",
    status: "AKTIV",
    kategori: "ARBEID",
    kilde: "NAV_KONTROLL",
    misbruktype: [],
    prioritet: "NORMAL",
    ytelser: [],
    merking: [],
    oppgaver: [],
    kobledeSaker: [],
    opprettet: "2026-01-01T00:00:00Z",
    oppdatert: null,
  };

  it("henter og validerer tillatte handlinger fra GET-endepunktet", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => tillatteHandlinger,
    });
    vi.stubGlobal("fetch", fetchMock);

    const { hentTillatteHandlinger } = await import("./api.server");
    const resultat = await hentTillatteHandlinger("token-123", "42");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://backend.test/api/v1/kontrollsaker/42/tillatte-handlinger",
      expect.objectContaining({ headers: expect.any(Object) }),
    );
    expect(resultat.handlinger[0]?.type).toBe("FLYTT_TIL_NESTE_STEG");
    expect(resultat.feltskjema[0]?.verdier[0]?.etikett).toBe("Kontrollnotat");
  });

  it("sender versjonert stegrequest med valgfritt resultat og bruker POST", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => kontrollsak,
    });
    vi.stubGlobal("fetch", fetchMock);

    const { endreSteg } = await import("./api.server");
    await endreSteg("token-123", "42", 1, "FORVALTNING", {
      versjon: 1,
      steg: "UTREDNING",
      utredning: { type: "KONTROLLNOTAT" },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://backend.test/api/v1/kontrollsaker/42/steg",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          versjon: 1,
          steg: "FORVALTNING",
          resultat: {
            versjon: 1,
            steg: "UTREDNING",
            utredning: { type: "KONTROLLNOTAT" },
          },
          beskrivelse: undefined,
        }),
      }),
    );
  });
});

describe("opprettJournalpost", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it.each(["NOTAT", "INNGAAENDE", "UTGAAENDE"])(
    "kaller riktig URL og body for type %s",
    async (journalposttype) => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({ journalpostId: "99", journalpostferdigstilt: true, dokumenter: [] }),
      });
      vi.stubGlobal("fetch", fetchMock);

      const { opprettJournalpost } = await import("./api.server");
      await opprettJournalpost("token-123", "42", journalposttype, "Testtittel", "Testinnhold");

      expect(fetchMock).toHaveBeenCalledWith(
        "https://backend.test/api/v1/kontrollsaker/42/journalposter",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            journalposttype,
            tittel: "Testtittel",
            tekst: "Testinnhold",
            vedleggIds: [],
            dokumentIds: [],
          }),
          headers: expect.objectContaining({ Authorization: "Bearer token-123" }),
        }),
      );
    },
  );

  it("kaster feil ved ikke-ok HTTP-svar", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    vi.stubGlobal("fetch", fetchMock);

    const { opprettJournalpost } = await import("./api.server");
    await expect(opprettJournalpost("token", "42", "NOTAT", "Tittel", "Tekst")).rejects.toThrow();
  });
});

describe("søkKontrollsakerPåSaksnummer", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("returnerer tom liste ved 404 slik at søk viser «ingen treff»", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 404 });
    vi.stubGlobal("fetch", fetchMock);

    const { søkKontrollsakerPåSaksnummer } = await import("./api.server");

    await expect(søkKontrollsakerPåSaksnummer("token", "01027")).resolves.toEqual([]);
  });

  it("kaster feil ved andre ikke-ok HTTP-svar", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    vi.stubGlobal("fetch", fetchMock);

    const { søkKontrollsakerPåSaksnummer } = await import("./api.server");

    await expect(søkKontrollsakerPåSaksnummer("token", "01027")).rejects.toThrow();
  });
});
