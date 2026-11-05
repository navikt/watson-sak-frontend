/**
 * Tester for SakDetaljSide loader — backend-sti (skalBrukeMockdata: false).
 *
 * Dekker spesifikt regresjonen der `hentFiler` sitt HTTP 403-svar (bruker mangler
 * fil-tilgang, se `FilTilgangService` i watson-admin-api) forkastet hele
 * `Promise.all` i loaderen og krasjet hele sakssiden i stedet for å skjule
 * filområdet. Se `hentFilerMedTilgangskontroll` i `SakDetaljSide.server.ts`.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { env } from "~/config/env.server";
import { BACKEND_SAK_UNDER_FLYTTING, SAK_UNDER_FLYTTING_FEIL } from "~/migrering/avslutning";

const mockHentKontrollsak = vi.fn();
const mockHentKontrollsakForDetalj = vi.fn();
const mockHentHendelser = vi.fn();
const mockHentSaksbehandlere = vi.fn();
const mockHentFiler = vi.fn();
const mockHentMapper = vi.fn().mockResolvedValue([]);
const mockEndreSteg = vi.fn();
const mockTildelKontrollsak = vi.fn();
const mockFristillKontrollsak = vi.fn();
const mockVideresend = vi.fn();
const mockRedigerKontrollsak = vi.fn();
const mockKobleSak = vi.fn();
const mockOpprettManuellHendelse = vi.fn();
const mockHentTillatteHandlinger = vi.fn().mockResolvedValue({
  versjon: 1,
  tilstand: { steg: "OPPRETTET", status: null, statusFørBero: null, resultat: null, ytelser: [] },
  handlinger: [],
  tillatteSteg: [],
  tillatteStatuser: [],
  tillatteResultater: [],
  paakrevedeRegistreringer: [],
  feltskjema: [],
});
const mockSøkKontrollsaker = vi.fn();
const mockFerdigstillMigreringskandidat = vi.fn();
const mockHentMigreringskandidat = vi.fn();
vi.mock("~/migrering/api.server", () => ({
  ferdigstillMigreringskandidat: mockFerdigstillMigreringskandidat,
  hentMigreringskandidat: mockHentMigreringskandidat,
}));

class MockBackendFeilException extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "BackendFeilException";
  }
}

vi.mock("~/config/env.server", () => ({
  skalBrukeMockdata: false,
  env: { ENVIRONMENT: "local-dev" },
}));

const mockHentInnloggetBruker = vi.fn().mockResolvedValue({
  preferredUsername: "z999999",
  name: "Saks Behandlersen",
  navIdent: "Z999999",
  enhet: "4812",
});

vi.mock("~/auth/innlogget-bruker.server", () => ({
  hentInnloggetBruker: mockHentInnloggetBruker,
}));

vi.mock("~/auth/access-token", () => ({
  getBackendOboToken: vi.fn().mockResolvedValue("mock-token"),
}));

vi.mock("~/saker/api.server", () => ({
  BackendFeilException: MockBackendFeilException,
  hentKontrollsak: mockHentKontrollsak,
  hentKontrollsakForDetalj: mockHentKontrollsakForDetalj,
  hentHendelser: mockHentHendelser,
  hentSaksbehandlere: mockHentSaksbehandlere,
  hentFiler: mockHentFiler,
  hentMapper: mockHentMapper,
  hentTillatteHandlinger: mockHentTillatteHandlinger,
  endreSteg: mockEndreSteg,
  tildelKontrollsak: mockTildelKontrollsak,
  fristillKontrollsak: mockFristillKontrollsak,
  videresend: mockVideresend,
  redigerKontrollsak: mockRedigerKontrollsak,
  kobleSak: mockKobleSak,
  opprettManuellHendelse: mockOpprettManuellHendelse,
  søkKontrollsaker: mockSøkKontrollsaker,
}));

function lagLoaderArgs(sakId = "1", query = "") {
  return {
    request: new Request("http://localhost/saker/" + sakId + query),
    params: { sakId },
    context: {},
  } as unknown as Parameters<typeof import("./SakDetaljSide.server").loader>[0];
}

const grunnleggendeSak = {
  id: 1,
  personIdent: null,
  steg: "OPPRETTET",
  status: null,
  resultat: null,
  ytelser: [],
  dokumenter: [{ id: "doc-1", tittel: "Et dokument" }],
  saksbehandlere: {
    eier: { navIdent: "Z999999", navn: "Saks Behandlersen", enhet: "4812" },
    deltMed: [],
    opprettetAv: { navIdent: "Z999999", navn: "Saks Behandlersen", enhet: "4812" },
  },
};

describe("SakDetaljSide loader — backend-sti", () => {
  beforeEach(() => {
    mockHentKontrollsak.mockReset().mockResolvedValue(grunnleggendeSak);
    mockHentKontrollsakForDetalj.mockReset().mockImplementation(async (token, sakId) => ({
      status: "ok",
      sak: await mockHentKontrollsak(token, sakId),
    }));
  });

  afterEach(() => {
    env.ENVIRONMENT = "local-dev";
    vi.clearAllMocks();
    mockTildelKontrollsak.mockReset();
    mockEndreSteg.mockReset();
    mockHentTillatteHandlinger.mockResolvedValue({
      versjon: 1,
      tilstand: {
        steg: "OPPRETTET",
        status: null,
        statusFørBero: null,
        resultat: null,
        ytelser: [],
      },
      handlinger: [],
      tillatteSteg: [],
      tillatteStatuser: [],
      tillatteResultater: [],
      paakrevdeRegistreringer: [],
      paakrevdeRegistreringerPerSteg: {},
      feltskjema: [],
    });
  });

  it("ferdigmerker bare ansvarlig etter eksplisitt bekreftelse i lokal backend", async () => {
    env.ENVIRONMENT = "local-backend";
    mockHentKontrollsak.mockResolvedValue({
      ...grunnleggendeSak,
      legacyKilde: "UTREDNING",
      legacyPid: "200001",
    });
    mockFerdigstillMigreringskandidat.mockResolvedValue(undefined);
    const formData = new FormData();
    formData.set("handling", "MIGRERING_FERDIGSTILL");
    formData.set("lastetOppFiler", "ja");
    formData.set("overfortInformasjon", "ja");
    const request = new Request("http://localhost/saker/1", { method: "POST", body: formData });
    const { action } = await import("./SakDetaljSide.server");

    expect(
      await action({ request, params: { sakId: "1" } } as Parameters<typeof action>[0]),
    ).toEqual({ ok: true });
    expect(mockFerdigstillMigreringskandidat).toHaveBeenCalledWith(request, "UTREDNING:200001");
  });

  it("avviser ferdigmerking når innlogget bruker ikke er ansvarlig", async () => {
    env.ENVIRONMENT = "local-backend";
    mockHentKontrollsak.mockResolvedValue({
      ...grunnleggendeSak,
      legacyKilde: "UTREDNING",
      legacyPid: "200001",
      saksbehandlere: {
        ...grunnleggendeSak.saksbehandlere,
        eier: { navIdent: "Z000001", navn: "Annen", enhet: "4812" },
      },
    });
    const formData = new FormData();
    formData.set("handling", "MIGRERING_FERDIGSTILL");
    formData.set("lastetOppFiler", "ja");
    formData.set("overfortInformasjon", "ja");
    const request = new Request("http://localhost/saker/1", { method: "POST", body: formData });
    const { action } = await import("./SakDetaljSide.server");

    await expect(
      action({ request, params: { sakId: "1" } } as Parameters<typeof action>[0]),
    ).rejects.toMatchObject({ init: { status: 403 } });
    expect(mockFerdigstillMigreringskandidat).not.toHaveBeenCalled();
  });

  it("tildeler innlogget bruker uten å endre steget", async () => {
    const sak = {
      ...grunnleggendeSak,
      steg: "OPPRETTET",
      saksbehandlere: { ...grunnleggendeSak.saksbehandlere, eier: null },
    };
    mockTildelKontrollsak.mockResolvedValue({
      ...sak,
      saksbehandlere: { ...sak.saksbehandlere, eier: grunnleggendeSak.saksbehandlere.eier },
    });

    const formData = new FormData();
    formData.set("handling", "TILDEL_MEG");
    formData.set("navIdent", "Z111111");
    const request = new Request("http://localhost/saker/1", { method: "POST", body: formData });
    const { action } = await import("./SakDetaljSide.server");
    const resultat = await action({ request, params: { sakId: "1" } } as Parameters<
      typeof action
    >[0]);

    expect(mockTildelKontrollsak).toHaveBeenCalledWith("mock-token", "1", "Z999999");
    expect(mockEndreSteg).not.toHaveBeenCalled();
    expect(resultat).toMatchObject({ ok: true, sak: { steg: "OPPRETTET" } });
  });

  it.each([["UTREDNING", "Z999999"]])(
    "avviser videresending uten ny ansvarlig i %s med eier %s i backend-stien",
    async (steg, navIdent) => {
      mockHentKontrollsak.mockResolvedValue({
        ...grunnleggendeSak,
        steg,
        saksbehandlere: {
          ...grunnleggendeSak.saksbehandlere,
          eier: { navIdent, navn: "Test Saksbehandler", enhet: "4812" },
        },
      });
      const formData = new FormData();
      formData.set("handling", "send_til_annen_enhet");
      formData.set("seksjon", "NORD");
      const request = new Request("http://localhost/saker/1", { method: "POST", body: formData });
      const { action } = await import("./SakDetaljSide.server");

      await expect(
        action({ request, params: { sakId: "1" } } as Parameters<typeof action>[0]),
      ).rejects.toMatchObject({ init: { status: 409 } });
      expect(mockHentKontrollsak).toHaveBeenCalledWith("mock-token", "1");
      expect(mockVideresend).not.toHaveBeenCalled();
    },
  );

  it.each(
    ["send_til_annen_enhet", "videresend_seksjon"].flatMap((handling) =>
      [true, false].flatMap((erLeder) =>
        [null, "Z999999", "Z111111"]
          .filter((eierIdent) => erLeder || eierIdent === "Z999999")
          .map((eierIdent) => ({ handling, erLeder, eierIdent })),
      ),
    ),
  )(
    "lar $handling sende sak i Opprettet uten ny ansvarlig med leder=$erLeder og eier=$eierIdent",
    async ({ handling, erLeder, eierIdent }) => {
      mockHentInnloggetBruker.mockResolvedValue({
        preferredUsername: "z999999",
        name: "Saks Behandlersen",
        navIdent: "Z999999",
        enhet: "4812",
        erLeder,
      });
      const eier = eierIdent ? { navIdent: eierIdent, navn: "Saksbehandler", enhet: "4812" } : null;
      mockHentKontrollsak.mockResolvedValue({
        ...grunnleggendeSak,
        tilgang: { erLederForSakensEnhet: erLeder, ledetEnheter: erLeder ? ["ky153k"] : [] },
        saksbehandlere: { ...grunnleggendeSak.saksbehandlere, eier },
      });
      const formData = new FormData();
      formData.set("handling", handling);
      formData.set("seksjon", "NORD");
      const request = new Request("http://localhost/saker/1", { method: "POST", body: formData });
      const { action } = await import("./SakDetaljSide.server");

      expect(
        await action({ request, params: { sakId: "1" } } as Parameters<typeof action>[0]),
      ).toMatchObject({ ok: true });
      expect(mockVideresend).toHaveBeenCalledWith("mock-token", "1", "NORD", undefined, undefined);
    },
  );

  it.each(["send_til_annen_enhet", "videresend_seksjon"])(
    "avviser %s for ikke-eier uten lederrolle i backend-stien",
    async (handling) => {
      mockHentInnloggetBruker.mockResolvedValue({
        preferredUsername: "z999999",
        name: "Saks Behandlersen",
        navIdent: "Z999999",
        enhet: "4812",
        erLeder: false,
      });
      mockHentKontrollsak.mockResolvedValue({
        ...grunnleggendeSak,
        saksbehandlere: {
          ...grunnleggendeSak.saksbehandlere,
          eier: { navIdent: "Z111111", navn: "Saksbehandler", enhet: "4812" },
        },
      });
      const formData = new FormData();
      formData.set("handling", handling);
      formData.set("seksjon", "NORD");
      const request = new Request("http://localhost/saker/1", { method: "POST", body: formData });
      const { action } = await import("./SakDetaljSide.server");

      await expect(
        action({ request, params: { sakId: "1" } } as Parameters<typeof action>[0]),
      ).resolves.toMatchObject({ data: { ok: false }, init: { status: 403 } });
      expect(mockVideresend).not.toHaveBeenCalled();
    },
  );

  it("avviser videresending for leder i en annen enhet enn saken i backend-stien", async () => {
    mockHentInnloggetBruker.mockResolvedValue({
      preferredUsername: "z999999",
      name: "Leder Lederesen",
      navIdent: "Z999999",
      enhet: "4812",
      erLeder: true,
    });
    mockHentKontrollsak.mockResolvedValue({
      ...grunnleggendeSak,
      tilgang: { erLederForSakensEnhet: false, ledetEnheter: ["ky153k"] },
      saksbehandlere: {
        ...grunnleggendeSak.saksbehandlere,
        eier: { navIdent: "Z111111", navn: "Saksbehandler", enhet: "4812" },
      },
    });
    const formData = new FormData();
    formData.set("handling", "send_til_annen_enhet");
    formData.set("seksjon", "NORD");
    const request = new Request("http://localhost/saker/1", { method: "POST", body: formData });
    const { action } = await import("./SakDetaljSide.server");

    await expect(
      action({ request, params: { sakId: "1" } } as Parameters<typeof action>[0]),
    ).resolves.toMatchObject({ data: { ok: false }, init: { status: 403 } });
    expect(mockVideresend).not.toHaveBeenCalled();
  });

  it("viser 403 fra backend som feilmelding i stedet for feilside", async () => {
    mockHentKontrollsak.mockResolvedValue(grunnleggendeSak);
    mockFristillKontrollsak.mockRejectedValueOnce(
      new MockBackendFeilException(403, "Tilgang avvist"),
    );
    const formData = new FormData();
    formData.set("handling", "FRISTILL");
    const request = new Request("http://localhost/saker/1", { method: "POST", body: formData });
    const { action } = await import("./SakDetaljSide.server");

    await expect(
      action({ request, params: { sakId: "1" } } as Parameters<typeof action>[0]),
    ).resolves.toMatchObject({
      data: { ok: false, feil: "Du har ikke tilgang til å gjøre denne endringen på saken." },
      init: { status: 403 },
    });
  });

  it("tillater FRISTILL av egen sak i Opprettet i backend-stien", async () => {
    mockHentKontrollsak.mockResolvedValue(grunnleggendeSak);
    mockFristillKontrollsak.mockResolvedValue({
      ...grunnleggendeSak,
      saksbehandlere: { ...grunnleggendeSak.saksbehandlere, eier: null },
    });
    const formData = new FormData();
    formData.set("handling", "FRISTILL");
    const request = new Request("http://localhost/saker/1", { method: "POST", body: formData });
    const { action } = await import("./SakDetaljSide.server");

    expect(
      await action({ request, params: { sakId: "1" } } as Parameters<typeof action>[0]),
    ).toMatchObject({ ok: true, sak: { saksbehandlere: { eier: null } } });
    expect(mockFristillKontrollsak).toHaveBeenCalledWith("mock-token", "1");
  });

  it.each(["AKTIV", "VENTER_PA_INFORMASJON", "I_BERO"] as const)(
    "tillater FRISTILL i Strafferettslig vurdering med status %s i backend-stien",
    async (status) => {
      mockHentKontrollsak.mockResolvedValue({
        ...grunnleggendeSak,
        steg: "STRAFFERETTSLIG_VURDERING",
        status,
      });
      mockFristillKontrollsak.mockResolvedValue({
        ...grunnleggendeSak,
        steg: "STRAFFERETTSLIG_VURDERING",
        status,
        saksbehandlere: { ...grunnleggendeSak.saksbehandlere, eier: null },
      });
      const formData = new FormData();
      formData.set("handling", "FRISTILL");
      const request = new Request("http://localhost/saker/1", { method: "POST", body: formData });
      const { action } = await import("./SakDetaljSide.server");

      expect(
        await action({ request, params: { sakId: "1" } } as Parameters<typeof action>[0]),
      ).toMatchObject({ ok: true });
      expect(mockFristillKontrollsak).toHaveBeenCalledWith("mock-token", "1");
    },
  );

  it("avviser FRISTILL etter Opprettet uten å kalle backend", async () => {
    mockHentKontrollsak.mockResolvedValue({ ...grunnleggendeSak, steg: "UTREDNING" });
    const formData = new FormData();
    formData.set("handling", "FRISTILL");
    const request = new Request("http://localhost/saker/1", { method: "POST", body: formData });
    const { action } = await import("./SakDetaljSide.server");
    await expect(
      action({ request, params: { sakId: "1" } } as Parameters<typeof action>[0]),
    ).rejects.toMatchObject({ init: { status: 409 } });
    expect(mockFristillKontrollsak).not.toHaveBeenCalled();
  });

  it("skjuler filområdet stille når hentFiler gir 403 (mangler fil-tilgang)", async () => {
    mockHentKontrollsak.mockResolvedValue(grunnleggendeSak);
    mockHentHendelser.mockResolvedValue([]);
    mockHentSaksbehandlere.mockResolvedValue([]);
    mockHentFiler.mockRejectedValue(new MockBackendFeilException(403, "Ingen tilgang til sak 1"));

    const { loader } = await import("./SakDetaljSide.server");
    const resultat = await loader(lagLoaderArgs());

    expect(resultat.harFilTilgang).toBe(false);
    expect(resultat.filer).toEqual([]);
    // Resten av siden skal fortsatt lastes — ikke kaste hele loaderen.
    expect(resultat.sak).toEqual(grunnleggendeSak);
  });

  it.each(["AVVIST_HABILITET", "AVVIST_SKJERMING"] as const)(
    "returnerer bare avvisningsgrunn ved detaljavslag %s før andre kall",
    async (avvisningsgrunn) => {
      mockHentKontrollsakForDetalj.mockResolvedValueOnce({
        status: "avvist",
        avvisningsgrunn,
      });

      const { loader } = await import("./SakDetaljSide.server");
      await expect(loader(lagLoaderArgs())).rejects.toMatchObject({
        data: { avvisningsgrunn },
        init: { status: 403 },
      });

      expect(mockHentInnloggetBruker).not.toHaveBeenCalled();
      expect(mockHentHendelser).not.toHaveBeenCalled();
      expect(mockHentSaksbehandlere).not.toHaveBeenCalled();
      expect(mockHentFiler).not.toHaveBeenCalled();
      expect(mockHentMapper).not.toHaveBeenCalled();
      expect(mockHentTillatteHandlinger).not.toHaveBeenCalled();
      expect(mockSøkKontrollsaker).not.toHaveBeenCalled();
      expect(mockHentMigreringskandidat).not.toHaveBeenCalled();
    },
  );

  it("kaster 500 med feil-ID når saken ikke kan hentes, og 403 uendret", async () => {
    mockHentHendelser.mockResolvedValue([]);
    mockHentSaksbehandlere.mockResolvedValue([]);
    mockHentFiler.mockResolvedValue([]);
    const { loader } = await import("./SakDetaljSide.server");

    mockHentKontrollsakForDetalj.mockRejectedValueOnce(
      new MockBackendFeilException(500, "Intern feil"),
    );
    await expect(loader(lagLoaderArgs())).rejects.toMatchObject({
      data: { feilId: expect.stringMatching(/^[0-9a-f]{8}$/) },
      init: { status: 500 },
    });

    const ingenTilgang = new MockBackendFeilException(403, "Ingen tilgang");
    mockHentKontrollsakForDetalj.mockRejectedValueOnce(ingenTilgang);
    await expect(loader(lagLoaderArgs())).rejects.toBe(ingenTilgang);
  });

  it("logger ikke innsendt handling med persondata ved teknisk feil", async () => {
    const konsoll = vi.spyOn(console, "error").mockImplementation(() => {});
    mockHentKontrollsak.mockRejectedValueOnce(new MockBackendFeilException(500, "Intern feil"));
    const formData = new FormData();
    formData.set("handling", "Ola Nordmann 12345678901");
    const { action } = await import("./SakDetaljSide.server");

    const resultat = await action({
      request: new Request("http://localhost/saker/1", { method: "POST", body: formData }),
      params: { sakId: "1" },
    } as Parameters<typeof action>[0]);

    expect(resultat).toMatchObject({ data: { teknisk: true }, init: { status: 500 } });
    const logg = JSON.stringify(konsoll.mock.calls);
    expect(logg).toContain("utføre ukjent handling");
    expect(logg).not.toContain("12345678901");
    expect(logg).not.toContain("Nordmann");
    konsoll.mockRestore();
  });

  it("avviser ugyldig sakId før loaderen kaller backend", async () => {
    const { loader } = await import("./SakDetaljSide.server");

    await expect(loader(lagLoaderArgs("../1"))).rejects.toMatchObject({ init: { status: 404 } });

    expect(mockHentKontrollsakForDetalj).not.toHaveBeenCalled();
    expect(mockHentHendelser).not.toHaveBeenCalled();
    expect(mockHentSaksbehandlere).not.toHaveBeenCalled();
    expect(mockHentFiler).not.toHaveBeenCalled();
    expect(mockHentMapper).not.toHaveBeenCalled();
    expect(mockHentTillatteHandlinger).not.toHaveBeenCalled();
  });

  it("setter harFilTilgang: true og returnerer filene når hentFiler lykkes", async () => {
    const filer = [{ id: "f1", filnavn: "vedlegg.pdf" }];
    mockHentKontrollsak.mockResolvedValue(grunnleggendeSak);
    mockHentHendelser.mockResolvedValue([]);
    mockHentSaksbehandlere.mockResolvedValue([]);
    mockHentFiler.mockResolvedValue(filer);

    const { loader } = await import("./SakDetaljSide.server");
    const resultat = await loader(lagLoaderArgs());

    expect(resultat.harFilTilgang).toBe(true);
    expect(resultat.filer).toEqual(filer);
  });

  it("laster saken uten handlinger når tillatte handlinger gir 403", async () => {
    mockHentKontrollsak.mockResolvedValue(grunnleggendeSak);
    mockHentHendelser.mockResolvedValue([]);
    mockHentSaksbehandlere.mockResolvedValue([]);
    mockHentFiler.mockResolvedValue([]);
    mockHentTillatteHandlinger.mockRejectedValue(
      new MockBackendFeilException(403, "Ingen tilgang"),
    );

    const { loader } = await import("./SakDetaljSide.server");
    const resultat = await loader(lagLoaderArgs());

    expect(resultat.tillatteHandlinger.handlinger).toEqual([]);
    expect(resultat.tillatteHandlinger.tillatteSteg).toEqual([]);
  });

  it("krever nytt resultat ved stegbytte til Avsluttet når lagret resultat er uforenlig", async () => {
    mockHentTillatteHandlinger.mockResolvedValue({
      versjon: 1,
      tilstand: {
        steg: "FORVALTNING",
        status: "VENTER_PA_VEDTAK",
        statusFørBero: null,
        resultat: {
          forvaltning: {
            type: "SAKEN_SKAL_IKKE_VURDERES_FOR_ANMELDELSE",
            endeligUtfall: { type: "ANMELDT" },
          },
        },
        ytelser: [],
      },
      handlinger: [
        { type: "FLYTT_TIL_NESTE_STEG", metode: "POST", sti: "/api/v1/kontrollsaker/1/steg" },
      ],
      tillatteSteg: ["AVSLUTTET"],
      feltskjema: [
        {
          felt: "forvaltning.endeligUtfall.type",
          etikett: "Endelig resultat",
          datatype: "enum",
          paakrevd: false,
          verdier: [
            { verdi: "HENLAGT", etikett: "Henlagt" },
            { verdi: "KONTROLLNOTAT", etikett: "Kontrollnotat" },
            { verdi: "FEILUTBETALINGSSAK_ORDINAER", etikett: "Feilutbetalingssak, ordinær" },
          ],
        },
      ],
    });
    const formData = new FormData();
    formData.set("handling", "endre_steg_dialog");
    formData.set("steg", "AVSLUTTET");
    const request = new Request("http://localhost/saker/1", { method: "POST", body: formData });
    const { action } = await import("./SakDetaljSide.server");

    expect(
      await action({ request, params: { sakId: "1" }, context: {} } as Parameters<
        typeof action
      >[0]),
    ).toMatchObject({ data: { ok: false }, init: { status: 400 } });
    expect(mockEndreSteg).not.toHaveBeenCalled();
  });

  it("avviser stegbytte fra henlagt Forvaltning til Strafferettslig vurdering", async () => {
    mockHentTillatteHandlinger.mockResolvedValue({
      versjon: 1,
      tilstand: {
        steg: "FORVALTNING",
        status: "VENTER_PA_VEDTAK",
        statusFørBero: null,
        resultat: {
          forvaltning: {
            type: "SAKEN_SKAL_IKKE_VURDERES_FOR_ANMELDELSE",
            endeligUtfall: { type: "HENLAGT", henleggelsesarsak: "IKKE_KAPASITET" },
          },
        },
        ytelser: [],
      },
      handlinger: [
        { type: "FLYTT_TIL_NESTE_STEG", metode: "POST", sti: "/api/v1/kontrollsaker/1/steg" },
      ],
      tillatteSteg: ["STRAFFERETTSLIG_VURDERING", "AVSLUTTET"],
      feltskjema: [
        {
          felt: "forvaltning.endeligUtfall.type",
          etikett: "Endelig resultat",
          datatype: "enum",
          paakrevd: false,
          verdier: [{ verdi: "HENLAGT", etikett: "Henlagt" }],
        },
        {
          felt: "forvaltning.endeligUtfall.henleggelsesarsak",
          etikett: "Årsak",
          datatype: "enum",
          paakrevd: false,
          verdier: [{ verdi: "IKKE_KAPASITET", etikett: "Ikke kapasitet" }],
        },
      ],
    });
    const formData = new FormData();
    formData.set("handling", "endre_steg_dialog");
    formData.set("steg", "STRAFFERETTSLIG_VURDERING");
    const request = new Request("http://localhost/saker/1", { method: "POST", body: formData });
    const { action } = await import("./SakDetaljSide.server");

    expect(
      await action({ request, params: { sakId: "1" }, context: {} } as Parameters<
        typeof action
      >[0]),
    ).toMatchObject({ data: { ok: false }, init: { status: 409 } });
    expect(mockEndreSteg).not.toHaveBeenCalled();
  });

  it("krever resultat ved stegbytte når bare en kandidatovergang er tillatt", async () => {
    mockHentTillatteHandlinger.mockResolvedValue({
      versjon: 1,
      tilstand: { steg: "UTREDNING", status: "AKTIV", resultat: null, ytelser: [] },
      handlinger: [
        { type: "FLYTT_TIL_NESTE_STEG", metode: "POST", sti: "/api/v1/kontrollsaker/1/steg" },
      ],
      tillatteSteg: [],
      muligeNesteSteg: ["FORVALTNING"],
      feltskjema: [
        {
          felt: "utredning.type",
          etikett: "Resultat fra utredningen",
          datatype: "enum",
          paakrevd: true,
          verdier: [
            { verdi: "FEILUTBETALINGSSAK_ORDINAER", etikett: "Feilutbetalingssak, ordinær" },
          ],
        },
      ],
    });
    const formData = new FormData();
    formData.set("handling", "endre_steg_dialog");
    formData.set("steg", "FORVALTNING");
    const { action } = await import("./SakDetaljSide.server");
    const request = new Request("http://localhost/saker/1", { method: "POST", body: formData });

    expect(
      await action({ request, params: { sakId: "1" } } as Parameters<typeof action>[0]),
    ).toMatchObject({ data: { ok: false }, init: { status: 400 } });
    expect(mockEndreSteg).not.toHaveBeenCalled();
  });

  it("sender resultat og steg i samme backendkall fra Utredning", async () => {
    const ytelseId = "00000000-0000-4000-8000-000000000001";
    mockHentTillatteHandlinger.mockResolvedValue({
      versjon: 1,
      tilstand: {
        steg: "UTREDNING",
        status: "AKTIV",
        resultat: null,
        ytelser: [
          {
            id: ytelseId,
            type: "SYKEPENGER",
            periodeFra: null,
            periodeTil: null,
            belop: null,
            endeligBelop: null,
          },
        ],
      },
      handlinger: [
        { type: "FLYTT_TIL_NESTE_STEG", metode: "POST", sti: "/api/v1/kontrollsaker/1/steg" },
      ],
      tillatteSteg: [],
      muligeNesteSteg: ["FORVALTNING"],
      feltskjema: [
        {
          felt: "utredning.type",
          etikett: "Resultat fra utredningen",
          datatype: "enum",
          paakrevd: true,
          verdier: [
            { verdi: "FEILUTBETALINGSSAK_ORDINAER", etikett: "Feilutbetalingssak, ordinær" },
          ],
        },
        {
          felt: "ytelser[].belop",
          etikett: "Antatt beløp",
          datatype: "belop",
          paakrevd: false,
          verdier: [],
        },
      ],
    });
    const formData = new FormData();
    formData.set("handling", "endre_steg_dialog");
    formData.set("steg", "FORVALTNING");
    formData.set("registrerResultat", "true");
    formData.set("resultat.utredning.type", "FEILUTBETALINGSSAK_ORDINAER");
    formData.set(`ytelse.${ytelseId}.belop`, "100");
    mockEndreSteg.mockResolvedValue({ ...grunnleggendeSak, steg: "FORVALTNING" });
    const { action } = await import("./SakDetaljSide.server");

    await action({
      request: new Request("http://localhost/saker/1", { method: "POST", body: formData }),
      params: { sakId: "1" },
    } as Parameters<typeof action>[0]);

    expect(mockEndreSteg).toHaveBeenCalledWith(
      "mock-token",
      "1",
      1,
      "FORVALTNING",
      {
        versjon: 1,
        steg: "UTREDNING",
        utredning: { type: "FEILUTBETALINGSSAK_ORDINAER" },
        ytelser: [{ id: ytelseId, belop: 100 }],
      },
      undefined,
    );
  });

  it("sender henleggelse og avslutning i samme backendkall", async () => {
    mockHentTillatteHandlinger.mockResolvedValue({
      versjon: 1,
      tilstand: { steg: "UTREDNING", status: "AKTIV", resultat: null, ytelser: [] },
      handlinger: [
        { type: "FLYTT_TIL_NESTE_STEG", metode: "POST", sti: "/api/v1/kontrollsaker/1/steg" },
      ],
      tillatteSteg: [],
      muligeNesteSteg: ["AVSLUTTET"],
      feltskjema: [
        {
          felt: "utredning.type",
          etikett: "Resultat fra utredningen",
          datatype: "enum",
          paakrevd: true,
          verdier: [{ verdi: "HENLAGT", etikett: "Henlagt" }],
        },
        {
          felt: "utredning.henleggelsesarsak",
          etikett: "Årsak",
          datatype: "enum",
          paakrevd: false,
          paakrevdNar: "utredning.type=HENLAGT",
          verdier: [{ verdi: "IKKE_KAPASITET", etikett: "Ikke kapasitet" }],
        },
      ],
    });
    const formData = new FormData();
    formData.set("handling", "endre_steg_dialog");
    formData.set("steg", "AVSLUTTET");
    formData.set("registrerResultat", "true");
    formData.set("resultat.utredning.type", "HENLAGT");
    formData.set("resultat.utredning.henleggelsesarsak", "IKKE_KAPASITET");
    const { action } = await import("./SakDetaljSide.server");

    await action({
      request: new Request("http://localhost/saker/1", { method: "POST", body: formData }),
      params: { sakId: "1" },
    } as Parameters<typeof action>[0]);
    expect(mockEndreSteg).toHaveBeenCalledWith(
      "mock-token",
      "1",
      1,
      "AVSLUTTET",
      {
        versjon: 1,
        steg: "UTREDNING",
        utredning: { type: "HENLAGT", henleggelsesarsak: "IKKE_KAPASITET" },
      },
      undefined,
    );
  });

  it("returnerer feil til saksflyt-modalen når backend ikke svarer", async () => {
    mockHentTillatteHandlinger.mockRejectedValueOnce(new TypeError("fetch failed"));
    const formData = new FormData();
    formData.set("handling", "endre_status");
    formData.set("status", "I_BERO");
    formData.set("hemmelighet", "FORMDATA_SKAL_IKKE_LEKKE");
    const { action } = await import("./SakDetaljSide.server");

    const resultat = await action({
      request: new Request("http://localhost/saker/1", { method: "POST", body: formData }),
      params: { sakId: "1" },
    } as Parameters<typeof action>[0]);

    expect(resultat).toMatchObject({
      data: { ok: false, teknisk: true, feilId: expect.stringMatching(/^[0-9a-f]{8}$/) },
      init: { status: 500 },
    });
    expect(JSON.stringify(resultat)).not.toContain("FORMDATA_SKAL_IKKE_LEKKE");
  });

  it("returnerer teknisk feil når backend feiler under saksflyt", async () => {
    mockHentTillatteHandlinger.mockResolvedValue({
      versjon: 1,
      tilstand: { steg: "UTREDNING", status: "AKTIV", resultat: null, ytelser: [] },
      handlinger: [
        { type: "FLYTT_TIL_NESTE_STEG", metode: "POST", sti: "/api/v1/kontrollsaker/1/steg" },
      ],
      tillatteSteg: [],
      muligeNesteSteg: ["AVSLUTTET"],
      feltskjema: [
        {
          felt: "utredning.type",
          etikett: "Resultat fra utredningen",
          datatype: "enum",
          paakrevd: true,
          verdier: [{ verdi: "HENLAGT", etikett: "Henlagt" }],
        },
        {
          felt: "utredning.henleggelsesarsak",
          etikett: "Årsak",
          datatype: "enum",
          paakrevd: false,
          paakrevdNar: "utredning.type=HENLAGT",
          verdier: [{ verdi: "IKKE_KAPASITET", etikett: "Ikke kapasitet" }],
        },
      ],
    });
    mockEndreSteg.mockRejectedValueOnce(new MockBackendFeilException(500, "Intern feil"));
    const formData = new FormData();
    formData.set("handling", "endre_steg_dialog");
    formData.set("steg", "AVSLUTTET");
    formData.set("registrerResultat", "true");
    formData.set("resultat.utredning.type", "HENLAGT");
    formData.set("resultat.utredning.henleggelsesarsak", "IKKE_KAPASITET");
    const { action } = await import("./SakDetaljSide.server");

    const resultat = await action({
      request: new Request("http://localhost/saker/1", { method: "POST", body: formData }),
      params: { sakId: "1" },
    } as Parameters<typeof action>[0]);

    expect(resultat).toMatchObject({
      data: { ok: false, teknisk: true, feilId: expect.stringMatching(/^[0-9a-f]{8}$/) },
      init: { status: 500 },
    });
    expect(JSON.stringify(resultat)).not.toContain("IKKE_KAPASITET");
  });

  it("returnerer teknisk feil når backend svarer med ugyldig JSON under saksflyt", async () => {
    mockHentTillatteHandlinger.mockResolvedValue({
      versjon: 1,
      tilstand: { steg: "UTREDNING", status: "AKTIV", resultat: null, ytelser: [] },
      handlinger: [
        { type: "FLYTT_TIL_NESTE_STEG", metode: "POST", sti: "/api/v1/kontrollsaker/1/steg" },
      ],
      tillatteSteg: [],
      muligeNesteSteg: ["AVSLUTTET"],
      feltskjema: [
        {
          felt: "utredning.type",
          etikett: "Resultat fra utredningen",
          datatype: "enum",
          paakrevd: true,
          verdier: [{ verdi: "HENLAGT", etikett: "Henlagt" }],
        },
        {
          felt: "utredning.henleggelsesarsak",
          etikett: "Årsak",
          datatype: "enum",
          paakrevd: false,
          paakrevdNar: "utredning.type=HENLAGT",
          verdier: [{ verdi: "IKKE_KAPASITET", etikett: "Ikke kapasitet" }],
        },
      ],
    });
    mockEndreSteg.mockRejectedValueOnce(new SyntaxError("Unexpected token < in JSON"));
    const formData = new FormData();
    formData.set("handling", "endre_steg_dialog");
    formData.set("steg", "AVSLUTTET");
    formData.set("registrerResultat", "true");
    formData.set("resultat.utredning.type", "HENLAGT");
    formData.set("resultat.utredning.henleggelsesarsak", "IKKE_KAPASITET");
    const { action } = await import("./SakDetaljSide.server");

    const resultat = await action({
      request: new Request("http://localhost/saker/1", { method: "POST", body: formData }),
      params: { sakId: "1" },
    } as Parameters<typeof action>[0]);

    expect(resultat).toMatchObject({
      data: { ok: false, teknisk: true, feilId: expect.stringMatching(/^[0-9a-f]{8}$/) },
      init: { status: 500 },
    });
    expect(JSON.stringify(resultat)).not.toContain("IKKE_KAPASITET");
  });

  it.each([
    ["endre_steg_dialog", BACKEND_SAK_UNDER_FLYTTING, SAK_UNDER_FLYTTING_FEIL],
    ["endre_steg", BACKEND_SAK_UNDER_FLYTTING, SAK_UNDER_FLYTTING_FEIL],
    ["endre_steg_dialog", "Versjonskonflikt", "Versjonskonflikt"],
  ])(
    "%s returnerer 409-meldingen som skjemasvar når backend avviser: %s",
    async (handling, detalj, melding) => {
      mockHentTillatteHandlinger.mockResolvedValue({
        versjon: 1,
        tilstand: { steg: "UTREDNING", status: "AKTIV", resultat: null, ytelser: [] },
        handlinger: [
          { type: "FLYTT_TIL_NESTE_STEG", metode: "POST", sti: "/api/v1/kontrollsaker/1/steg" },
        ],
        tillatteSteg: [],
        muligeNesteSteg: ["AVSLUTTET"],
        feltskjema: [
          {
            felt: "utredning.type",
            etikett: "Resultat fra utredningen",
            datatype: "enum",
            paakrevd: true,
            verdier: [{ verdi: "HENLAGT", etikett: "Henlagt" }],
          },
          {
            felt: "utredning.henleggelsesarsak",
            etikett: "Årsak",
            datatype: "enum",
            paakrevd: false,
            paakrevdNar: "utredning.type=HENLAGT",
            verdier: [{ verdi: "IKKE_KAPASITET", etikett: "Ikke kapasitet" }],
          },
        ],
      });
      const formData = new FormData();
      formData.set("handling", handling);
      formData.set("steg", "AVSLUTTET");
      formData.set("registrerResultat", "true");
      formData.set("resultat.utredning.type", "HENLAGT");
      formData.set("resultat.utredning.henleggelsesarsak", "IKKE_KAPASITET");
      const { action } = await import("./SakDetaljSide.server");
      mockEndreSteg.mockRejectedValueOnce(new MockBackendFeilException(409, detalj));

      const resultat = await action({
        request: new Request("http://localhost/saker/1", { method: "POST", body: formData }),
        params: { sakId: "1" },
      } as Parameters<typeof action>[0]);

      expect(resultat).toMatchObject({
        data: { ok: false, feil: melding },
        init: { status: 409 },
      });
    },
  );

  it("returnerer 409 fra backend som feilmelding også utenfor saksflyt-modalen", async () => {
    mockHentInnloggetBruker.mockResolvedValue({
      preferredUsername: "z999999",
      name: "Saks Behandlersen",
      navIdent: "Z999999",
      enhet: "4812",
      erLeder: true,
    });
    mockHentKontrollsak.mockResolvedValue({
      ...grunnleggendeSak,
      saksbehandlere: {
        ...grunnleggendeSak.saksbehandlere,
        eier: { navIdent: "Z999999", navn: "Saksbehandler", enhet: "4812" },
      },
    });
    mockVideresend.mockRejectedValueOnce(
      new MockBackendFeilException(409, "Saken må tas ut av bero før stegbytte"),
    );
    const formData = new FormData();
    formData.set("handling", "videresend_seksjon");
    formData.set("seksjon", "NORD");
    const { action } = await import("./SakDetaljSide.server");

    const resultat = await action({
      request: new Request("http://localhost/saker/1", { method: "POST", body: formData }),
      params: { sakId: "1" },
    } as Parameters<typeof action>[0]);

    expect(resultat).toMatchObject({
      data: { ok: false, feil: "Saken må tas ut av bero før stegbytte" },
      init: { status: 409 },
    });
  });

  it("returnerer 409 som skjemafeil for rediger_saksinformasjon", async () => {
    mockHentInnloggetBruker.mockResolvedValue({
      preferredUsername: "z999999",
      name: "Saks Behandlersen",
      navIdent: "Z999999",
      enhet: "4812",
      erLeder: true,
    });
    mockHentKontrollsak.mockResolvedValue({
      ...grunnleggendeSak,
      saksbehandlere: {
        ...grunnleggendeSak.saksbehandlere,
        eier: { navIdent: "Z999999", navn: "Saksbehandler", enhet: "4812" },
      },
    });
    mockRedigerKontrollsak.mockRejectedValueOnce(
      new MockBackendFeilException(409, "Avsluttet sak kan ikke endres"),
    );
    const formData = new FormData();
    formData.set("handling", "rediger_saksinformasjon");
    formData.set("kategori", "ANNET");
    formData.set("kilde", "ANONYM_TIPS");
    const { action } = await import("./SakDetaljSide.server");

    const resultat = await action({
      request: new Request("http://localhost/saker/1", { method: "POST", body: formData }),
      params: { sakId: "1" },
    } as Parameters<typeof action>[0]);

    expect(resultat).toMatchObject({
      data: { ok: false, feil: { skjema: ["Avsluttet sak kan ikke endres"] } },
      init: { status: 409 },
    });
  });

  it("returnerer teknisk feil uten skjemadata når redigering feiler med 500", async () => {
    mockHentInnloggetBruker.mockResolvedValue({
      preferredUsername: "z999999",
      name: "Saks Behandlersen",
      navIdent: "Z999999",
      enhet: "4812",
      erLeder: true,
    });
    mockHentKontrollsak.mockResolvedValue({
      ...grunnleggendeSak,
      saksbehandlere: {
        ...grunnleggendeSak.saksbehandlere,
        eier: { navIdent: "Z999999", navn: "Saksbehandler", enhet: "4812" },
      },
    });
    mockRedigerKontrollsak.mockRejectedValueOnce(new MockBackendFeilException(500, "Intern feil"));
    const formData = new FormData();
    formData.set("handling", "rediger_saksinformasjon");
    formData.set("kategori", "ANNET");
    formData.set("kilde", "ANONYM_TIPS");
    formData.set("hemmelighet", "FORMDATA_SKAL_IKKE_LEKKE");
    const { action } = await import("./SakDetaljSide.server");

    const resultat = await action({
      request: new Request("http://localhost/saker/1", { method: "POST", body: formData }),
      params: { sakId: "1" },
    } as Parameters<typeof action>[0]);

    expect(resultat).toMatchObject({
      data: { ok: false, teknisk: true, feilId: expect.stringMatching(/^[0-9a-f]{8}$/) },
      init: { status: 500 },
    });
    expect(JSON.stringify(resultat)).not.toContain("FORMDATA_SKAL_IKKE_LEKKE");
  });

  it("returnerer teknisk feil når opprettelse av historikk feiler med 500", async () => {
    mockHentKontrollsak.mockResolvedValue({ ...grunnleggendeSak, steg: "UTREDNING" });
    mockHentInnloggetBruker.mockResolvedValue({ navIdent: "Z999999" });
    mockOpprettManuellHendelse.mockRejectedValueOnce(
      new MockBackendFeilException(500, "Intern feil"),
    );
    const formData = new FormData();
    formData.set("handling", "legg_til_historikk");
    formData.set("tittel", "Notat");
    formData.set("dato", "2026-01-02");
    formData.set("tid", "12:00");
    const { action } = await import("./SakDetaljSide.server");

    const resultat = await action({
      request: new Request("http://localhost/saker/1", { method: "POST", body: formData }),
      params: { sakId: "1" },
    } as Parameters<typeof action>[0]);

    expect(resultat).toMatchObject({
      data: { ok: false, teknisk: true, feilId: expect.stringMatching(/^[0-9a-f]{8}$/) },
      init: { status: 500 },
    });
  });

  it("beholder skjemafeil når opprettelse av historikk avvises med 409", async () => {
    mockHentKontrollsak.mockResolvedValue({ ...grunnleggendeSak, steg: "UTREDNING" });
    mockHentInnloggetBruker.mockResolvedValue({ navIdent: "Z999999" });
    mockOpprettManuellHendelse.mockRejectedValueOnce(
      new MockBackendFeilException(409, "Historikken kan ikke endres"),
    );
    const formData = new FormData();
    formData.set("handling", "legg_til_historikk");
    formData.set("tittel", "Notat");
    formData.set("dato", "2026-01-02");
    formData.set("tid", "12:00");
    const { action } = await import("./SakDetaljSide.server");

    const resultat = await action({
      request: new Request("http://localhost/saker/1", { method: "POST", body: formData }),
      params: { sakId: "1" },
    } as Parameters<typeof action>[0]);

    expect(resultat).toMatchObject({ ok: false, feil: { skjema: expect.any(Array) } });
    expect(resultat).not.toMatchObject({ data: { teknisk: true }, init: { status: 500 } });
  });

  it("returnerer teknisk feil når kobling feiler med 500", async () => {
    const sak = { ...grunnleggendeSak, personIdent: "12345678910" };
    mockHentKontrollsak.mockResolvedValueOnce(sak).mockResolvedValueOnce({ ...sak, id: 2 });
    mockHentInnloggetBruker.mockResolvedValue({ navIdent: "Z999999" });
    mockKobleSak.mockRejectedValueOnce(new MockBackendFeilException(500, "Intern feil"));
    const formData = new FormData();
    formData.set("handling", "koble_sak");
    formData.set("relatertSakId", "2");
    const { action } = await import("./SakDetaljSide.server");

    const resultat = await action({
      request: new Request("http://localhost/saker/1", { method: "POST", body: formData }),
      params: { sakId: "1" },
    } as Parameters<typeof action>[0]);

    expect(resultat).toMatchObject({
      data: { ok: false, teknisk: true, feilId: expect.stringMatching(/^[0-9a-f]{8}$/) },
      init: { status: 500 },
    });
  });

  it("beholder skjemafeil når kobling avvises med 409", async () => {
    const sak = { ...grunnleggendeSak, personIdent: "12345678910" };
    mockHentKontrollsak.mockResolvedValueOnce(sak).mockResolvedValueOnce({ ...sak, id: 2 });
    mockHentInnloggetBruker.mockResolvedValue({ navIdent: "Z999999" });
    mockKobleSak.mockRejectedValueOnce(
      new MockBackendFeilException(409, "Koblingen kan ikke endres"),
    );
    const formData = new FormData();
    formData.set("handling", "koble_sak");
    formData.set("relatertSakId", "2");
    const { action } = await import("./SakDetaljSide.server");

    const resultat = await action({
      request: new Request("http://localhost/saker/1", { method: "POST", body: formData }),
      params: { sakId: "1" },
    } as Parameters<typeof action>[0]);

    expect(resultat).toMatchObject({ ok: false, feil: { skjema: expect.any(Array) } });
    expect(resultat).not.toMatchObject({ data: { teknisk: true }, init: { status: 500 } });
  });

  it("returnerer teknisk feil uten tildelingsdata når tildeling feiler med 500", async () => {
    mockTildelKontrollsak.mockRejectedValueOnce(new MockBackendFeilException(500, "Intern feil"));
    const formData = new FormData();
    formData.set("handling", "TILDEL_MEG");
    formData.set("navIdent", "Z111111");
    formData.set("hemmelighet", "FORMDATA_SKAL_IKKE_LEKKE");
    const { action } = await import("./SakDetaljSide.server");

    const resultat = await action({
      request: new Request("http://localhost/saker/1", { method: "POST", body: formData }),
      params: { sakId: "1" },
    } as Parameters<typeof action>[0]);

    expect(resultat).toMatchObject({
      data: { ok: false, teknisk: true, feilId: expect.stringMatching(/^[0-9a-f]{8}$/) },
      init: { status: 500 },
    });
    expect(JSON.stringify(resultat)).not.toContain("FORMDATA_SKAL_IKKE_LEKKE");
  });

  it("viser feil i filområdet når hentFiler gir 500, uten å skjule det som manglende tilgang", async () => {
    mockHentKontrollsak.mockResolvedValue(grunnleggendeSak);
    mockHentHendelser.mockResolvedValue([]);
    mockHentSaksbehandlere.mockResolvedValue([]);
    mockHentFiler.mockRejectedValue(new MockBackendFeilException(500, "Intern feil"));

    const { loader } = await import("./SakDetaljSide.server");
    const resultat = await loader(lagLoaderArgs());

    expect(resultat.seksjonsfeil.filer).toMatch(/^[0-9a-f]{8}$/);
    // 500 er ikke manglende tilgang: filområdet skal vise feil, ikke «ingen tilgang».
    expect(resultat.harFilTilgang).toBe(true);
    expect(resultat.sak).toEqual(grunnleggendeSak);
  });

  it("degraderer historikk stille når hentHendelser gir 403", async () => {
    mockHentKontrollsak.mockResolvedValue({ ...grunnleggendeSak, steg: "UTREDNING" });
    mockHentHendelser.mockRejectedValue(new MockBackendFeilException(403, "Ingen tilgang"));
    mockHentSaksbehandlere.mockResolvedValue([]);
    mockHentFiler.mockResolvedValue([]);

    const { loader } = await import("./SakDetaljSide.server");
    const resultat = await loader(lagLoaderArgs());

    expect(resultat.historikk).toEqual([]);
  });

  it("degraderer mapper stille når hentMapper gir 403", async () => {
    mockHentKontrollsak.mockResolvedValue(grunnleggendeSak);
    mockHentHendelser.mockResolvedValue([]);
    mockHentSaksbehandlere.mockResolvedValue([]);
    mockHentFiler.mockResolvedValue([]);
    mockHentMapper.mockRejectedValueOnce(new MockBackendFeilException(403, "Ingen tilgang"));

    const { loader } = await import("./SakDetaljSide.server");
    const resultat = await loader(lagLoaderArgs());

    expect(resultat.mapper).toEqual([]);
  });

  it("skjuler dokumenter/filer i loader-responsen når bruker verken er eier eller delt med, selv om backend gir filtilgang", async () => {
    const filer = [{ id: "f1", filnavn: "vedlegg.pdf" }];
    mockHentKontrollsak.mockResolvedValue({
      ...grunnleggendeSak,
      saksbehandlere: {
        eier: { navIdent: "Z111111", navn: "Annen Saksbehandler", enhet: "4812" },
        deltMed: [],
        opprettetAv: { navIdent: "Z111111", navn: "Annen Saksbehandler", enhet: "4812" },
      },
    });
    mockHentHendelser.mockResolvedValue([]);
    mockHentSaksbehandlere.mockResolvedValue([]);
    // Backend kan gi filtilgang til flere roller enn eier/delt-med (se
    // hentFilerMedTilgangskontroll), men loaderen skal likevel ikke sende
    // dokument-/filmetadata til klienten uten direkte tilgang.
    mockHentFiler.mockResolvedValue(filer);

    const { loader } = await import("./SakDetaljSide.server");
    const resultat = await loader(lagLoaderArgs());

    expect(resultat.harFilTilgang).toBe(true);
    expect(resultat.dokumenter).toEqual([]);
    expect(resultat.filer).toEqual([]);
    // Regresjonssjekk: dokumentmetadata skal heller ikke lekke nøstet i sak-objektet.
    expect(resultat.sak.dokumenter).toEqual([]);
  });

  it("eksponerer dokumenter/filer i loader-responsen når bruker har delt tilgang", async () => {
    const filer = [{ id: "f1", filnavn: "vedlegg.pdf" }];
    mockHentKontrollsak.mockResolvedValue({
      ...grunnleggendeSak,
      saksbehandlere: {
        eier: { navIdent: "Z111111", navn: "Annen Saksbehandler", enhet: "4812" },
        deltMed: [{ navIdent: "Z999999", navn: "Saks Behandlersen", enhet: "4812" }],
        opprettetAv: { navIdent: "Z111111", navn: "Annen Saksbehandler", enhet: "4812" },
      },
    });
    mockHentHendelser.mockResolvedValue([]);
    mockHentSaksbehandlere.mockResolvedValue([]);
    mockHentFiler.mockResolvedValue(filer);

    const { loader } = await import("./SakDetaljSide.server");
    const resultat = await loader(lagLoaderArgs());

    expect(resultat.dokumenter.length).toBe(1);
    expect(resultat.filer).toEqual(filer);
    expect(resultat.sak.dokumenter.length).toBe(1);
  });

  it("eksponerer dokumenter/filer for vanlig saksbehandler når saken er avsluttet", async () => {
    const filer = [{ id: "f1", filnavn: "vedlegg.pdf" }];
    mockHentKontrollsak.mockResolvedValue({
      ...grunnleggendeSak,
      steg: "AVSLUTTET",
      saksbehandlere: {
        eier: null,
        deltMed: [],
        opprettetAv: { navIdent: "Z111111", navn: "Annen Saksbehandler", enhet: "4812" },
      },
    });
    mockHentHendelser.mockResolvedValue([]);
    mockHentSaksbehandlere.mockResolvedValue([]);
    mockHentFiler.mockResolvedValue(filer);

    const { loader } = await import("./SakDetaljSide.server");
    const resultat = await loader(lagLoaderArgs());

    expect(resultat.dokumenter.length).toBe(1);
    expect(resultat.filer).toEqual(filer);
    expect(resultat.sak.dokumenter.length).toBe(1);
  });

  it("eksponerer ikke dokumenter/filer for leder som ikke er saksbehandler på saken", async () => {
    const filer = [{ id: "f1", filnavn: "vedlegg.pdf" }];
    mockHentInnloggetBruker.mockResolvedValueOnce({
      preferredUsername: "leder",
      name: "Leder",
      navIdent: "Z999999",
      enhet: "4812",
      erLeder: true,
    });
    mockHentKontrollsak.mockResolvedValue({
      ...grunnleggendeSak,
      saksbehandlere: {
        eier: { navIdent: "Z111111", navn: "Annen Saksbehandler", enhet: "4812" },
        deltMed: [],
        opprettetAv: { navIdent: "Z111111", navn: "Annen Saksbehandler", enhet: "4812" },
      },
    });
    mockHentHendelser.mockResolvedValue([]);
    mockHentSaksbehandlere.mockResolvedValue([]);
    mockHentFiler.mockResolvedValue(filer);

    const { loader } = await import("./SakDetaljSide.server");
    const resultat = await loader(lagLoaderArgs());

    expect(resultat.dokumenter).toEqual([]);
    expect(resultat.filer).toEqual([]);
    expect(resultat.sak.dokumenter).toEqual([]);
  });

  it("eksponerer filer, men ikke dokumenter, på en ufordelt sak", async () => {
    const filer = [{ id: "f1", filnavn: "tips.pdf" }];
    mockHentKontrollsak.mockResolvedValue({
      ...grunnleggendeSak,
      steg: "OPPRETTET",
      saksbehandlere: {
        eier: null,
        deltMed: [],
        opprettetAv: { navIdent: "Z111111", navn: "Annen Saksbehandler", enhet: "4812" },
      },
    });
    mockHentHendelser.mockResolvedValue([]);
    mockHentSaksbehandlere.mockResolvedValue([]);
    mockHentFiler.mockResolvedValue(filer);

    const { loader } = await import("./SakDetaljSide.server");
    const resultat = await loader(lagLoaderArgs());

    expect(resultat.filer).toEqual(filer);
    expect(resultat.dokumenter).toEqual([]);
  });

  it("eksponerer ikke dokumenter/filer/mapper for sakseier når kanSeFiler er false", async () => {
    mockHentKontrollsak.mockResolvedValue({
      ...grunnleggendeSak,
      tilgang: {
        harTilgangTilKontrollobjekt: false,
        kanSeHistorikk: false,
        kanSeRelaterteSaker: false,
        kanTildeleSak: false,
        kanSeArkiv: false,
        kanSeFiler: false,
      },
    });
    mockHentHendelser.mockResolvedValue([]);
    mockHentSaksbehandlere.mockResolvedValue([]);
    mockHentFiler.mockResolvedValue([{ id: "f1", filnavn: "vedlegg.pdf" }]);
    mockHentMapper.mockResolvedValueOnce([{ sti: "Notater" }]);

    const { loader } = await import("./SakDetaljSide.server");
    const resultat = await loader(lagLoaderArgs());

    expect(resultat.dokumenter).toEqual([]);
    expect(resultat.filer).toEqual([]);
    expect(resultat.mapper).toEqual([]);
    expect(resultat.sak.dokumenter).toEqual([]);
  });

  it("hopper over søk etter relaterte saker når kapabiliteten kanSeRelaterteSaker er false", async () => {
    mockHentKontrollsak.mockResolvedValue({
      ...grunnleggendeSak,
      personIdent: "12345678901",
      tilgang: {
        harTilgangTilKontrollobjekt: false,
        kanSeHistorikk: false,
        kanSeRelaterteSaker: false,
        kanTildeleSak: false,
      },
    });
    mockHentHendelser.mockResolvedValue([]);
    mockHentSaksbehandlere.mockResolvedValue([]);
    mockHentFiler.mockResolvedValue([]);

    const { loader } = await import("./SakDetaljSide.server");
    const resultat = await loader(lagLoaderArgs());

    expect(mockSøkKontrollsaker).not.toHaveBeenCalled();
    expect(resultat.andreSaker).toEqual([]);
    expect(resultat.andreSakerSide).toEqual({ side: 1, totalSider: 0 });
  });

  it("henter den valgte siden med sidestørrelse 10", async () => {
    mockHentKontrollsak.mockResolvedValue({ ...grunnleggendeSak, personIdent: "12345678901" });
    mockHentHendelser.mockResolvedValue([]);
    mockHentSaksbehandlere.mockResolvedValue([]);
    mockHentFiler.mockResolvedValue([]);
    mockHentMapper.mockResolvedValue([]);
    mockSøkKontrollsaker.mockResolvedValue({
      items: [],
      page: 3,
      size: 10,
      totalItems: 40,
      totalPages: 4,
    });

    const { loader } = await import("./SakDetaljSide.server");
    const resultat = await loader(lagLoaderArgs("1", "?relaterteSaker=3"));

    expect(mockSøkKontrollsaker).toHaveBeenCalledWith("mock-token", "12345678901", 3, 10);
    expect(resultat.andreSakerSide).toEqual({ side: 3, totalSider: 4 });
  });

  it("bruker side 1 når relaterteSaker-parameteren er ugyldig", async () => {
    mockHentKontrollsak.mockResolvedValue({ ...grunnleggendeSak, personIdent: "12345678901" });
    mockHentHendelser.mockResolvedValue([]);
    mockHentSaksbehandlere.mockResolvedValue([]);
    mockHentFiler.mockResolvedValue([]);
    mockHentMapper.mockResolvedValue([]);
    mockSøkKontrollsaker.mockResolvedValue({
      items: [],
      page: 1,
      size: 10,
      totalItems: 0,
      totalPages: 0,
    });

    const { loader } = await import("./SakDetaljSide.server");
    await loader(lagLoaderArgs("1", "?relaterteSaker=ugyldig"));

    expect(mockSøkKontrollsaker).toHaveBeenCalledWith("mock-token", "12345678901", 1, 10);
  });

  it("degraderer stille når søk etter relaterte saker gir 403", async () => {
    mockHentKontrollsak.mockResolvedValue({
      ...grunnleggendeSak,
      personIdent: "12345678901",
      tilgang: {
        harTilgangTilKontrollobjekt: false,
        kanSeHistorikk: false,
        kanSeRelaterteSaker: true,
        kanTildeleSak: false,
      },
    });
    mockHentHendelser.mockResolvedValue([]);
    mockHentSaksbehandlere.mockResolvedValue([]);
    mockHentFiler.mockResolvedValue([]);
    mockSøkKontrollsaker.mockRejectedValue(
      new MockBackendFeilException(403, "Ingen tilgang til å hente relaterte saker"),
    );

    const { loader } = await import("./SakDetaljSide.server");
    const resultat = await loader(lagLoaderArgs());

    expect(resultat.andreSaker).toEqual([]);
    expect(resultat.andreSakerSide).toEqual({ side: 1, totalSider: 0 });
  });
});
