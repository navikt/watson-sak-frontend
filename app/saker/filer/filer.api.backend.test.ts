import { beforeEach, describe, expect, it, vi } from "vitest";
import type { KontrollsakResponse } from "~/saker/types.backend";
import type { Route } from "./+types/filer.api";

const mockHentKontrollsak = vi.fn();
const mockLastOppFil = vi.fn();

class MockBackendFeilException extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

vi.mock("~/config/env.server", () => ({
  skalBrukeMockdata: false,
}));

vi.mock("~/auth/access-token", () => ({
  getBackendOboToken: vi.fn().mockResolvedValue("mock-token"),
}));

vi.mock("~/saker/api.server", () => ({
  BackendFeilException: MockBackendFeilException,
  hentKontrollsak: mockHentKontrollsak,
  lastOppFil: mockLastOppFil,
}));

const sak = {
  steg: "UTREDES",
} as KontrollsakResponse;

function uploadRequest(innhold = "innhold", medFil = true): Request {
  const formData = new FormData();
  if (medFil) {
    formData.set("fil", new File([innhold], "bevis.pdf", { type: "application/pdf" }));
  }
  return {
    method: "POST",
    headers: new Headers(),
    formData: async () => formData,
  } as unknown as Request;
}

describe("filer.api POST — backend-sti", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHentKontrollsak.mockResolvedValue(sak);
    mockLastOppFil.mockResolvedValue({ id: "fil-1", filnavn: "bevis.pdf" });
  });

  it("laster opp fil når steget tillater det", async () => {
    await actionMedBackend();

    expect(mockLastOppFil).toHaveBeenCalledWith("mock-token", "1", expect.any(File));
  });

  it("avviser opplasting på avsluttet sak før fil-API-et kalles", async () => {
    mockHentKontrollsak.mockResolvedValue({ ...sak, steg: "AVSLUTTET" });

    await expect(actionMedBackend()).rejects.toMatchObject({ init: { status: 403 } });
    expect(mockLastOppFil).not.toHaveBeenCalled();
  });

  it("returnerer feilmelding for tom fil uten å kalle backend", async () => {
    const svar = await actionMedBackend(uploadRequest(""));

    expect(svar).toMatchObject({
      data: { message: "Filen er tom og kan ikke lastes opp." },
      init: { status: 400 },
    });
    expect(mockLastOppFil).not.toHaveBeenCalled();
  });

  it("returnerer feilmelding når fil mangler", async () => {
    const svar = await actionMedBackend(uploadRequest("", false));

    expect(svar).toMatchObject({
      data: { message: "Velg en fil som skal lastes opp." },
      init: { status: 400 },
    });
    expect(mockLastOppFil).not.toHaveBeenCalled();
  });

  it("returnerer et teknisk feilsvar ved backendfeil", async () => {
    mockLastOppFil.mockRejectedValue(new MockBackendFeilException(500, "Intern backendfeil"));

    const svar = await actionMedBackend();

    expect(svar).toMatchObject({
      data: {
        ok: false,
        teknisk: true,
        feilId: expect.stringMatching(/^[0-9a-f]{8}$/),
      },
      init: { status: 500 },
    });
  });

  it("laster opp flere filer etter hverandre og stopper ved første brukerfeil", async () => {
    mockLastOppFil
      .mockResolvedValueOnce({ id: "fil-1", filnavn: "en.pdf" })
      .mockRejectedValueOnce(new MockBackendFeilException(400, "Filen inneholder virus."));
    const formData = new FormData();
    for (const navn of ["en.pdf", "to.pdf", "tre.pdf"]) {
      formData.append("fil", new File(["x"], navn, { type: "application/pdf" }));
    }

    const svar = await actionMedBackend({
      method: "POST",
      headers: new Headers(),
      formData: async () => formData,
    } as unknown as Request);

    expect(mockLastOppFil).toHaveBeenCalledTimes(2);
    expect(svar).toEqual({
      message: "to.pdf: Filen inneholder virus. 1 av 3 filer ble lastet opp.",
    });
  });
});

async function actionMedBackend(request: Request = uploadRequest()) {
  const { action } = await import("./filer.api");
  return action({
    request,
    params: { sakId: "1" },
  } as Route.ActionArgs);
}
