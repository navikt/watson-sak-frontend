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
  status: "UTREDES",
} as KontrollsakResponse;

function uploadRequest(): Request {
  const formData = new FormData();
  formData.set("fil", new File(["innhold"], "bevis.pdf", { type: "application/pdf" }));
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

  it("laster opp fil når statusen tillater det", async () => {
    await actionMedBackend();

    expect(mockLastOppFil).toHaveBeenCalledWith("mock-token", "SAK-1", expect.any(File));
  });

  it("avviser opplasting på avsluttet sak før fil-API-et kalles", async () => {
    mockHentKontrollsak.mockResolvedValue({ ...sak, status: "AVSLUTTET" });

    await expect(actionMedBackend()).rejects.toMatchObject({ init: { status: 403 } });
    expect(mockLastOppFil).not.toHaveBeenCalled();
  });
});

async function actionMedBackend() {
  const { action } = await import("./filer.api");
  return action({
    request: uploadRequest(),
    params: { sakId: "SAK-1" },
  } as Route.ActionArgs);
}
