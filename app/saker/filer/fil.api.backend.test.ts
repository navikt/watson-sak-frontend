import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Route } from "./+types/fil.api";

const mockOmdøpFil = vi.fn();
const mockSlettFil = vi.fn();

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
  omdøpFil: mockOmdøpFil,
  slettFil: mockSlettFil,
}));

function patchRequest(navn = "nytt navn"): Request {
  return new Request("http://localhost", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ navn }),
  });
}

async function actionMedBackend() {
  const { action } = await import("./fil.api");
  return action({
    request: patchRequest(),
    params: { sakId: "1", filId: "00000000-0000-4000-8000-00000000f001" },
  } as Route.ActionArgs);
}

describe("fil.api PATCH — backend-sti", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOmdøpFil.mockResolvedValue({
      id: "00000000-0000-4000-8000-00000000f001",
      filnavn: "nytt navn.pdf",
    });
  });

  it("kaller backend og returnerer den omdøpte filen", async () => {
    const resultat = await actionMedBackend();

    expect(mockOmdøpFil).toHaveBeenCalledWith(
      "mock-token",
      "1",
      "00000000-0000-4000-8000-00000000f001",
      "nytt navn",
    );
    expect(resultat).toEqual({
      ok: true,
      fil: { id: "00000000-0000-4000-8000-00000000f001", filnavn: "nytt navn.pdf" },
    });
  });

  it("returnerer en håndterbar modalfeil når filen ikke finnes lenger", async () => {
    mockOmdøpFil.mockRejectedValue(new MockBackendFeilException(404, "Fil ikke funnet"));

    const resultat = await actionMedBackend();

    expect(resultat).toMatchObject({
      data: { ok: false, melding: "Fil ikke funnet" },
      init: { status: 404 },
    });
  });

  it("returnerer et teknisk feilsvar ved backendfeil", async () => {
    mockOmdøpFil.mockRejectedValue(new MockBackendFeilException(500, "Intern backendfeil"));

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
});
