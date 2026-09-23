/**
 * Tester for SakDetaljSide loader — backend-sti (skalBrukeMockdata: false).
 *
 * Dekker spesifikt regresjonen der `hentFiler` sitt HTTP 403-svar (bruker mangler
 * fil-tilgang, se `FilTilgangService` i watson-admin-api) forkastet hele
 * `Promise.all` i loaderen og krasjet hele sakssiden i stedet for å skjule
 * filområdet. Se `hentFilerMedTilgangskontroll` i `SakDetaljSide.server.ts`.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

const mockHentKontrollsak = vi.fn();
const mockHentHendelser = vi.fn();
const mockHentJournalposter = vi.fn();
const mockHentSaksbehandlere = vi.fn();
const mockHentFiler = vi.fn();
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

  it("tildeler innlogget bruker og flytter Opprettet til Utredning", async () => {
    const sak = {
      ...grunnleggendeSak,
      saksbehandlere: { ...grunnleggendeSak.saksbehandlere, eier: null },
    };
    mockHentTillatteHandlinger.mockResolvedValue({
      tilstand: { steg: "OPPRETTET" },
      tillatteSteg: ["UTREDNING", "STRAFFERETTSLIG_VURDERING"],
    });
    mockTildelKontrollsak.mockResolvedValue({
      ...sak,
      saksbehandlere: { ...sak.saksbehandlere, eier: grunnleggendeSak.saksbehandlere.eier },
    });
    mockEndreSteg.mockResolvedValue({ ...sak, steg: "UTREDNING", status: "AKTIV" });

    const formData = new FormData();
    formData.set("handling", "TILDEL_MEG");
    formData.set("navIdent", "Z111111");
    const request = new Request("http://localhost/saker/1", { method: "POST", body: formData });
    const { action } = await import("./SakDetaljSide.server");
    const resultat = await action({ request, params: { sakId: "1" } } as Parameters<
      typeof action
    >[0]);

    expect(mockTildelKontrollsak).toHaveBeenCalledWith("mock-token", "1", "Z999999");
    expect(mockEndreSteg).toHaveBeenCalledWith("mock-token", "1", 1, "UTREDNING");
    expect(resultat).toMatchObject({ ok: true, sak: { steg: "UTREDNING", status: "AKTIV" } });
  });

  it("avviser Tildel meg før tildeling dersom Utredning ikke er tillatt", async () => {
    mockHentTillatteHandlinger.mockResolvedValue({
      tilstand: { steg: "OPPRETTET" },
      tillatteSteg: [],
    });
    const formData = new FormData();
    formData.set("handling", "TILDEL_MEG");
    const request = new Request("http://localhost/saker/1", { method: "POST", body: formData });
    const { action } = await import("./SakDetaljSide.server");

    await expect(
      action({ request, params: { sakId: "1" } } as Parameters<typeof action>[0]),
    ).rejects.toMatchObject({ init: { status: 409 } });
    expect(mockTildelKontrollsak).not.toHaveBeenCalled();
    expect(mockEndreSteg).not.toHaveBeenCalled();
  });

  it("beholder steget når Tildel meg brukes etter Opprettet", async () => {
    mockHentTillatteHandlinger.mockResolvedValue({
      tilstand: { steg: "UTREDNING" },
      tillatteSteg: [],
    });
    mockTildelKontrollsak.mockResolvedValue({ ...grunnleggendeSak, steg: "UTREDNING" });
    const formData = new FormData();
    formData.set("handling", "TILDEL_MEG");
    const request = new Request("http://localhost/saker/1", { method: "POST", body: formData });
    const { action } = await import("./SakDetaljSide.server");

    const resultat = await action({ request, params: { sakId: "1" } } as Parameters<
      typeof action
    >[0]);

    expect(resultat).toMatchObject({ ok: true, sak: { steg: "UTREDNING" } });
    expect(mockEndreSteg).not.toHaveBeenCalled();
  });

  it("melder fra hvis stegbyttet feiler etter at saken er tildelt", async () => {
    mockHentTillatteHandlinger.mockResolvedValue({
      tilstand: { steg: "OPPRETTET" },
      tillatteSteg: ["UTREDNING"],
    });
    mockTildelKontrollsak.mockResolvedValue(grunnleggendeSak);
    mockEndreSteg.mockRejectedValue(new MockBackendFeilException(409, "Ugyldig stegbytte"));
    const formData = new FormData();
    formData.set("handling", "TILDEL_MEG");
    const request = new Request("http://localhost/saker/1", { method: "POST", body: formData });
    const { action } = await import("./SakDetaljSide.server");

    await expect(
      action({ request, params: { sakId: "1" } } as Parameters<typeof action>[0]),
    ).rejects.toMatchObject({
      data: expect.stringContaining("Saken ble tildelt deg, men kunne ikke flyttes"),
      init: { status: 409 },
    });
    expect(mockTildelKontrollsak).toHaveBeenCalledOnce();
    expect(mockEndreSteg).toHaveBeenCalledOnce();
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

  it("avviser stegbytte til Avsluttet når forvaltningsresultatet ikke tillater det", async () => {
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

    await expect(
      action({ request, params: { sakId: "1" }, context: {} } as Parameters<typeof action>[0]),
    ).rejects.toMatchObject({ init: { status: 409 } });
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

    await expect(
      action({ request, params: { sakId: "1" }, context: {} } as Parameters<typeof action>[0]),
    ).rejects.toMatchObject({ init: { status: 409 } });
    expect(mockEndreSteg).not.toHaveBeenCalled();
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
