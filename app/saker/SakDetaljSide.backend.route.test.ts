/**
 * Tester for SakDetaljSide loader — backend-sti (skalBrukeMockdata: false).
 *
 * Dekker spesifikt regresjonen der `hentFiler` sitt HTTP 403-svar (bruker mangler
 * fil-tilgang, se `FilTilgangService` i watson-admin-api) forkastet hele
 * `Promise.all` i loaderen og krasjet hele sakssiden i stedet for å skjule
 * filområdet. Se `hentFilerMedTilgangskontroll` i `SakDetaljSide.server.ts`.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { env } from "~/config/env.server";

const mockHentKontrollsak = vi.fn();
const mockHentHendelser = vi.fn();
const mockHentJournalposter = vi.fn();
const mockHentSaksbehandlere = vi.fn();
const mockHentFiler = vi.fn();
const mockHentMapper = vi.fn().mockResolvedValue([]);
const mockEndreSteg = vi.fn();
const mockTildelKontrollsak = vi.fn();
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
  hentHendelser: mockHentHendelser,
  hentJournalposter: mockHentJournalposter,
  hentSaksbehandlere: mockHentSaksbehandlere,
  hentFiler: mockHentFiler,
  hentMapper: mockHentMapper,
  hentTillatteHandlinger: mockHentTillatteHandlinger,
  endreSteg: mockEndreSteg,
  tildelKontrollsak: mockTildelKontrollsak,
  søkKontrollsaker: mockSøkKontrollsaker,
}));

function lagLoaderArgs(sakId = "1") {
  return {
    request: new Request("http://localhost/saker/" + sakId),
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
    formData.set("bekreftet", "ja");
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
    formData.set("bekreftet", "ja");
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

  it("skjuler filområdet stille når hentFiler gir 403 (mangler fil-tilgang)", async () => {
    mockHentKontrollsak.mockResolvedValue(grunnleggendeSak);
    mockHentHendelser.mockResolvedValue([]);
    mockHentJournalposter.mockResolvedValue([]);
    mockHentSaksbehandlere.mockResolvedValue([]);
    mockHentFiler.mockRejectedValue(new MockBackendFeilException(403, "Ingen tilgang til sak 1"));

    const { loader } = await import("./SakDetaljSide.server");
    const resultat = await loader(lagLoaderArgs());

    expect(resultat.harFilTilgang).toBe(false);
    expect(resultat.filer).toEqual([]);
    // Resten av siden skal fortsatt lastes — ikke kaste hele loaderen.
    expect(resultat.sak).toEqual(grunnleggendeSak);
  });

  it("setter harFilTilgang: true og returnerer filene når hentFiler lykkes", async () => {
    const filer = [{ id: "f1", filnavn: "vedlegg.pdf" }];
    mockHentKontrollsak.mockResolvedValue(grunnleggendeSak);
    mockHentHendelser.mockResolvedValue([]);
    mockHentJournalposter.mockResolvedValue([]);
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
    mockHentJournalposter.mockResolvedValue([]);
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
    const { action } = await import("./SakDetaljSide.server");

    const resultat = await action({
      request: new Request("http://localhost/saker/1", { method: "POST", body: formData }),
      params: { sakId: "1" },
    } as Parameters<typeof action>[0]);

    expect(resultat).toMatchObject({
      data: { ok: false, feil: expect.stringContaining("Fikk ikke kontakt") },
      init: { status: 502 },
    });
  });

  it("returnerer feil til saksflyt-modalen i stedet for å kaste når backend avviser", async () => {
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
    mockEndreSteg.mockRejectedValueOnce(new MockBackendFeilException(409, "Versjonskonflikt"));

    const resultat = await action({
      request: new Request("http://localhost/saker/1", { method: "POST", body: formData }),
      params: { sakId: "1" },
    } as Parameters<typeof action>[0]);

    expect(resultat).toMatchObject({
      data: { ok: false, feil: expect.stringContaining("Last inn siden på nytt") },
      init: { status: 409 },
    });
  });

  it("lar andre feil enn 403 fra hentFiler boble opp (kaster fortsatt loaderen)", async () => {
    mockHentKontrollsak.mockResolvedValue(grunnleggendeSak);
    mockHentHendelser.mockResolvedValue([]);
    mockHentJournalposter.mockResolvedValue([]);
    mockHentSaksbehandlere.mockResolvedValue([]);
    mockHentFiler.mockRejectedValue(new MockBackendFeilException(500, "Intern feil"));

    const { loader } = await import("./SakDetaljSide.server");

    await expect(loader(lagLoaderArgs())).rejects.toThrow("Intern feil");
  });

  it("degraderer historikk stille når hentHendelser gir 403", async () => {
    mockHentKontrollsak.mockResolvedValue(grunnleggendeSak);
    mockHentHendelser.mockRejectedValue(new MockBackendFeilException(403, "Ingen tilgang"));
    mockHentJournalposter.mockResolvedValue([]);
    mockHentSaksbehandlere.mockResolvedValue([]);
    mockHentFiler.mockResolvedValue([]);

    const { loader } = await import("./SakDetaljSide.server");
    const resultat = await loader(lagLoaderArgs());

    expect(resultat.historikk).toEqual([]);
  });

  it("degraderer journalposter stille når hentJournalposter gir 403", async () => {
    mockHentKontrollsak.mockResolvedValue(grunnleggendeSak);
    mockHentHendelser.mockResolvedValue([]);
    mockHentJournalposter.mockRejectedValue(new MockBackendFeilException(403, "Ingen tilgang"));
    mockHentSaksbehandlere.mockResolvedValue([]);
    mockHentFiler.mockResolvedValue([]);

    const { loader } = await import("./SakDetaljSide.server");
    const resultat = await loader(lagLoaderArgs());

    expect(resultat.journalposter).toEqual([]);
  });

  it("degraderer mapper stille når hentMapper gir 403", async () => {
    mockHentKontrollsak.mockResolvedValue(grunnleggendeSak);
    mockHentHendelser.mockResolvedValue([]);
    mockHentJournalposter.mockResolvedValue([]);
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
    mockHentJournalposter.mockResolvedValue([]);
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
    mockHentJournalposter.mockResolvedValue([]);
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
    mockHentJournalposter.mockResolvedValue([]);
    mockHentSaksbehandlere.mockResolvedValue([]);
    mockHentFiler.mockResolvedValue(filer);

    const { loader } = await import("./SakDetaljSide.server");
    const resultat = await loader(lagLoaderArgs());

    expect(resultat.dokumenter.length).toBe(1);
    expect(resultat.filer).toEqual(filer);
    expect(resultat.sak.dokumenter.length).toBe(1);
  });

  it("eksponerer dokumenter/filer i loader-responsen når innlogget bruker er leder", async () => {
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
    mockHentJournalposter.mockResolvedValue([]);
    mockHentSaksbehandlere.mockResolvedValue([]);
    mockHentFiler.mockResolvedValue(filer);

    const { loader } = await import("./SakDetaljSide.server");
    const resultat = await loader(lagLoaderArgs());

    expect(resultat.dokumenter.length).toBe(1);
    expect(resultat.filer).toEqual(filer);
    expect(resultat.sak.dokumenter.length).toBe(1);
  });

  it("hopper over søk etter relaterte saker når kapabiliteten kanSeRelaterteSaker er false", async () => {
    mockHentKontrollsak.mockResolvedValue({
      ...grunnleggendeSak,
      personIdent: "12345678901",
      tilgang: {
        kreverUtvidetTilgang: true,
        kanSeHistorikk: false,
        kanSeRelaterteSaker: false,
        kanTildeleSak: false,
      },
    });
    mockHentHendelser.mockResolvedValue([]);
    mockHentJournalposter.mockResolvedValue([]);
    mockHentSaksbehandlere.mockResolvedValue([]);
    mockHentFiler.mockResolvedValue([]);

    const { loader } = await import("./SakDetaljSide.server");
    const resultat = await loader(lagLoaderArgs());

    expect(mockSøkKontrollsaker).not.toHaveBeenCalled();
    expect(resultat.andreSaker).toEqual([]);
  });

  it("degraderer stille når søk etter relaterte saker gir 403", async () => {
    mockHentKontrollsak.mockResolvedValue({
      ...grunnleggendeSak,
      personIdent: "12345678901",
      tilgang: {
        kreverUtvidetTilgang: true,
        kanSeHistorikk: false,
        kanSeRelaterteSaker: true,
        kanTildeleSak: false,
      },
    });
    mockHentHendelser.mockResolvedValue([]);
    mockHentJournalposter.mockResolvedValue([]);
    mockHentSaksbehandlere.mockResolvedValue([]);
    mockHentFiler.mockResolvedValue([]);
    mockSøkKontrollsaker.mockRejectedValue(
      new MockBackendFeilException(403, "Ingen tilgang til å hente relaterte saker"),
    );

    const { loader } = await import("./SakDetaljSide.server");
    const resultat = await loader(lagLoaderArgs());

    expect(resultat.andreSaker).toEqual([]);
  });
});
