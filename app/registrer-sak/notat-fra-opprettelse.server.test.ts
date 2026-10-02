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

const hentInnloggetBrukerMock = vi.fn().mockResolvedValue({ name: "Bjarte Byråkratsen" });
vi.mock("~/auth/innlogget-bruker.server", () => ({
  hentInnloggetBruker: hentInnloggetBrukerMock,
}));

const opprettDokumentMock = vi.fn().mockResolvedValue({ id: "doc-1" });
const lagreDokumentMock = vi.fn().mockResolvedValue({});
vi.mock("~/saker/api.server", () => ({
  opprettDokument: opprettDokumentMock,
  lagreDokument: lagreDokumentMock,
}));

const opprettMockDokumentMock = vi.fn().mockReturnValue({ id: "mock-doc-1" });
const lagreMockDokumentMock = vi.fn();
vi.mock("~/saker/filer/mock-data.server", () => ({
  opprettDokument: opprettMockDokumentMock,
  lagreDokument: lagreMockDokumentMock,
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
