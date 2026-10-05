import { afterEach, describe, expect, it, vi } from "vitest";

const testState = vi.hoisted(() => ({ skalBrukeMockdata: false }));

vi.mock("~/config/env.server", () => ({
  get skalBrukeMockdata() {
    return testState.skalBrukeMockdata;
  },
}));

const getBackendOboTokenMock = vi.fn().mockResolvedValue("token-123");
vi.mock("~/auth/access-token", () => ({
  getBackendOboToken: getBackendOboTokenMock,
}));

const hentInnloggetBrukerMock = vi
  .fn()
  .mockResolvedValue({ name: "Bjarte Byråkratsen", navIdent: "Z999999" });
vi.mock("~/auth/innlogget-bruker.server", () => ({
  hentInnloggetBruker: hentInnloggetBrukerMock,
}));

const opprettDokumentMock = vi.fn().mockResolvedValue({ id: "doc-1" });
const lagreDokumentMock = vi.fn().mockResolvedValue({});
const slettDokumentMock = vi.fn().mockResolvedValue(undefined);
const hentKontrollsakMock = vi.fn();
vi.mock("~/saker/api.server", () => ({
  opprettDokument: opprettDokumentMock,
  lagreDokument: lagreDokumentMock,
  slettDokument: slettDokumentMock,
  hentKontrollsak: hentKontrollsakMock,
}));

const hentMigreringskandidatMock = vi.fn();
vi.mock("~/migrering/api.server", () => ({
  hentMigreringskandidat: hentMigreringskandidatMock,
}));

const hentAlleSakerMock = vi.fn().mockReturnValue([]);
vi.mock("~/saker/mock-alle-saker.server", () => ({ hentAlleSaker: hentAlleSakerMock }));

const opprettMockDokumentMock = vi.fn().mockReturnValue({ id: "mock-doc-1" });
const lagreMockDokumentMock = vi.fn();
const slettMockDokumentMock = vi.fn();
const hentMockDokumenttreMock = vi.fn().mockReturnValue([]);
vi.mock("~/saker/filer/mock-data.server", () => ({
  opprettDokument: opprettMockDokumentMock,
  lagreDokument: lagreMockDokumentMock,
  slettDokument: slettMockDokumentMock,
  hentDokumenttreForSak: hentMockDokumenttreMock,
}));

const request = new Request("http://localhost/registrer-sak");

describe("lagreNotatFraOpprettelse", () => {
  afterEach(() => {
    vi.clearAllMocks();
    testState.skalBrukeMockdata = false;
  });

  it("oppretter og lagrer dokument via backend-API i local-backend/dev", async () => {
    const { lagreNotatFraOpprettelse } = await import("./notat-fra-opprettelse.server");

    await lagreNotatFraOpprettelse(request, "42", "Internt notat om saken.");

    expect(opprettDokumentMock).toHaveBeenCalledWith("token-123", "42");
    expect(lagreDokumentMock).toHaveBeenCalledWith("token-123", "42", "doc-1", {
      tittel: "Notat fra opprettelse",
      innhold: [{ type: "p", children: [{ text: "Internt notat om saken." }] }],
      opprettHistorikk: true,
    });
  });

  it("bruker mock-lageret i mockmodus", async () => {
    testState.skalBrukeMockdata = true;
    const { lagreNotatFraOpprettelse } = await import("./notat-fra-opprettelse.server");

    await lagreNotatFraOpprettelse(request, "42", "Internt notat om saken.");

    expect(hentInnloggetBrukerMock).toHaveBeenCalled();
    expect(opprettMockDokumentMock).toHaveBeenCalledWith(request, "42", "Bjarte Byråkratsen");
    expect(lagreMockDokumentMock).toHaveBeenCalledWith(request, "42", "mock-doc-1", {
      tittel: "Notat fra opprettelse",
      innhold: [{ type: "p", children: [{ text: "Internt notat om saken." }] }],
      endretAv: "Bjarte Byråkratsen",
    });
  });
});

describe("lagreNotatFraOpprettelseTrygt", () => {
  afterEach(() => {
    vi.clearAllMocks();
    testState.skalBrukeMockdata = false;
  });

  it("returnerer true når lagringen lykkes", async () => {
    const { lagreNotatFraOpprettelseTrygt } = await import("./notat-fra-opprettelse.server");

    await expect(lagreNotatFraOpprettelseTrygt(request, "42", "Tekst")).resolves.toBe(true);
  });

  it("returnerer false og kaster ikke videre når lagringen feiler", async () => {
    lagreDokumentMock.mockRejectedValueOnce(new Error("nettverksfeil"));
    const { lagreNotatFraOpprettelseTrygt } = await import("./notat-fra-opprettelse.server");

    await expect(lagreNotatFraOpprettelseTrygt(request, "42", "Tekst")).resolves.toBe(false);
  });
});

describe("lagreNotatFraOpprettelse, retry uten duplikater", () => {
  afterEach(() => {
    vi.clearAllMocks();
    testState.skalBrukeMockdata = false;
  });

  it("oppdaterer eksisterende notatdokument i stedet for å opprette et nytt", async () => {
    hentKontrollsakMock.mockResolvedValue({
      dokumenter: [{ id: "doc-eksisterende", tittel: "Notat fra opprettelse" }],
    });
    const { lagreNotatFraOpprettelse } = await import("./notat-fra-opprettelse.server");

    await lagreNotatFraOpprettelse(request, "42", "Tekst", { gjenbrukEksisterende: true });

    expect(opprettDokumentMock).not.toHaveBeenCalled();
    expect(lagreDokumentMock).toHaveBeenCalledWith(
      "token-123",
      "42",
      "doc-eksisterende",
      expect.objectContaining({ tittel: "Notat fra opprettelse" }),
    );
  });

  it("ignorerer arkivert notatdokument og oppretter nytt", async () => {
    hentKontrollsakMock.mockResolvedValue({
      dokumenter: [{ id: "gammelt", tittel: "Notat fra opprettelse", arkivert: "2026-01-01" }],
    });
    const { lagreNotatFraOpprettelse } = await import("./notat-fra-opprettelse.server");

    await lagreNotatFraOpprettelse(request, "42", "Tekst", { gjenbrukEksisterende: true });

    expect(opprettDokumentMock).toHaveBeenCalled();
  });

  it("sletter det nye, tomme dokumentet når lagringen feiler", async () => {
    lagreDokumentMock.mockRejectedValueOnce(new Error("feil"));
    const { lagreNotatFraOpprettelse } = await import("./notat-fra-opprettelse.server");

    await expect(lagreNotatFraOpprettelse(request, "42", "Tekst")).rejects.toThrow("feil");

    expect(slettDokumentMock).toHaveBeenCalledWith("token-123", "42", "doc-1");
  });

  it("sletter ikke et eksisterende notatdokument når oppdateringen feiler", async () => {
    hentKontrollsakMock.mockResolvedValue({
      dokumenter: [{ id: "doc-eksisterende", tittel: "Notat fra opprettelse" }],
    });
    lagreDokumentMock.mockRejectedValueOnce(new Error("feil"));
    const { lagreNotatFraOpprettelse } = await import("./notat-fra-opprettelse.server");

    await expect(
      lagreNotatFraOpprettelse(request, "42", "Tekst", { gjenbrukEksisterende: true }),
    ).rejects.toThrow("feil");

    expect(slettDokumentMock).not.toHaveBeenCalled();
  });

  it("gjenbruker eksisterende notatdokument i mockmodus", async () => {
    testState.skalBrukeMockdata = true;
    hentMockDokumenttreMock.mockReturnValueOnce([
      { id: "mock-eksisterende", tittel: "Notat fra opprettelse" },
    ]);
    const { lagreNotatFraOpprettelse } = await import("./notat-fra-opprettelse.server");

    await lagreNotatFraOpprettelse(request, "42", "Tekst", { gjenbrukEksisterende: true });

    expect(opprettMockDokumentMock).not.toHaveBeenCalled();
    expect(lagreMockDokumentMock).toHaveBeenCalledWith(
      request,
      "42",
      "mock-eksisterende",
      expect.anything(),
    );
  });
});

describe("kreverEgenMigreringssak", () => {
  const migreringssak = {
    id: 42,
    legacyKilde: "UTREDNING",
    legacyPid: "200001",
    saksbehandlere: { eier: { navIdent: "Z999999" } },
  };

  afterEach(() => {
    vi.clearAllMocks();
    testState.skalBrukeMockdata = false;
  });

  it("godtar egen sak som er under migrering", async () => {
    hentKontrollsakMock.mockResolvedValue(migreringssak);
    hentMigreringskandidatMock.mockResolvedValue({
      alleredeMigrertTilKontrollsakId: 42,
      migreringsstatus: "UNDER_MIGRERING",
    });
    const { kreverEgenMigreringssak } = await import("./notat-fra-opprettelse.server");

    await expect(kreverEgenMigreringssak(request, "42")).resolves.toBeUndefined();
    expect(hentMigreringskandidatMock).toHaveBeenCalledWith(request, "UTREDNING:200001");
  });

  it("avviser sak som ikke har migreringskobling", async () => {
    hentKontrollsakMock.mockResolvedValue({ ...migreringssak, legacyKilde: null, legacyPid: null });
    const { kreverEgenMigreringssak } = await import("./notat-fra-opprettelse.server");

    await expect(kreverEgenMigreringssak(request, "42")).rejects.toMatchObject({
      init: { status: 403 },
    });
    expect(hentMigreringskandidatMock).not.toHaveBeenCalled();
  });

  it("avviser sak der innlogget bruker ikke er eier", async () => {
    hentKontrollsakMock.mockResolvedValue({
      ...migreringssak,
      saksbehandlere: { eier: { navIdent: "Z000001" } },
    });
    const { kreverEgenMigreringssak } = await import("./notat-fra-opprettelse.server");

    await expect(kreverEgenMigreringssak(request, "42")).rejects.toMatchObject({
      init: { status: 403 },
    });
  });

  it("avviser sak som kandidaten ikke er koblet til", async () => {
    hentKontrollsakMock.mockResolvedValue(migreringssak);
    hentMigreringskandidatMock.mockResolvedValue({
      alleredeMigrertTilKontrollsakId: 7,
      migreringsstatus: "UNDER_MIGRERING",
    });
    const { kreverEgenMigreringssak } = await import("./notat-fra-opprettelse.server");

    await expect(kreverEgenMigreringssak(request, "42")).rejects.toMatchObject({
      init: { status: 403 },
    });
  });

  it("avviser sak som er ferdig migrert", async () => {
    hentKontrollsakMock.mockResolvedValue(migreringssak);
    hentMigreringskandidatMock.mockResolvedValue({
      alleredeMigrertTilKontrollsakId: 42,
      migreringsstatus: "FULLSTENDIG",
    });
    const { kreverEgenMigreringssak } = await import("./notat-fra-opprettelse.server");

    await expect(kreverEgenMigreringssak(request, "42")).rejects.toMatchObject({
      init: { status: 403 },
    });
  });

  it("gir 404 når saken ikke finnes", async () => {
    hentKontrollsakMock.mockRejectedValue(new Error("fant ikke"));
    const { kreverEgenMigreringssak } = await import("./notat-fra-opprettelse.server");

    await expect(kreverEgenMigreringssak(request, "42")).rejects.toMatchObject({
      init: { status: 404 },
    });
  });

  it("bevarer 401 fra backend", async () => {
    hentKontrollsakMock.mockRejectedValue({ status: 401 });
    const { kreverEgenMigreringssak } = await import("./notat-fra-opprettelse.server");

    await expect(kreverEgenMigreringssak(request, "42")).rejects.toMatchObject({ status: 401 });
  });

  it("sjekker eierskap og migreringskobling i mockmodus", async () => {
    testState.skalBrukeMockdata = true;
    hentAlleSakerMock.mockReturnValue([
      {
        id: 42,
        legacyKilde: "UTREDNING",
        legacyPid: "200001",
        saksbehandlere: { eier: { navIdent: "Z999999" } },
      },
      {
        id: 43,
        legacyKilde: null,
        legacyPid: null,
        saksbehandlere: { eier: { navIdent: "Z999999" } },
      },
      { id: 44, legacyKilde: "UTREDNING", legacyPid: "200002", saksbehandlere: { eier: null } },
    ]);
    const { kreverEgenMigreringssak } = await import("./notat-fra-opprettelse.server");

    await expect(kreverEgenMigreringssak(request, "42")).resolves.toBeUndefined();
    await expect(kreverEgenMigreringssak(request, "43")).rejects.toMatchObject({
      init: { status: 403 },
    });
    await expect(kreverEgenMigreringssak(request, "44")).rejects.toMatchObject({
      init: { status: 403 },
    });
    await expect(kreverEgenMigreringssak(request, "99")).rejects.toMatchObject({
      init: { status: 404 },
    });
  });
});
