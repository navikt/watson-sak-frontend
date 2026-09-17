import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Route } from "./+types/fil.api";

const mockOmdøpFil = vi.fn();

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
    params: { sakId: "SAK-1", filId: "fil-1" },
  } as Route.ActionArgs);
}

describe("fil.api PATCH — backend-sti", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOmdøpFil.mockResolvedValue({ id: "fil-1", filnavn: "nytt navn.pdf" });
  });

  it("kaller backend og returnerer den omdøpte filen", async () => {
    const resultat = await actionMedBackend();

    expect(mockOmdøpFil).toHaveBeenCalledWith("mock-token", "SAK-1", "fil-1", "nytt navn");
    expect(resultat).toEqual({
      ok: true,
      fil: { id: "fil-1", filnavn: "nytt navn.pdf" },
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
});
