import { afterEach, describe, expect, it, vi } from "vitest";
import { logger } from "~/logging/logging";
import { BackendFeilException, håndterFeil } from "./api-core.server";

vi.mock("~/config/env.server", () => ({ BACKEND_API_URL: "http://backend" }));

describe("håndterFeil", () => {
  afterEach(() => vi.restoreAllMocks());

  it("logger ikke backendens detail utenfor lokal utvikling, men gir den videre i feilen", async () => {
    const error = vi.spyOn(logger, "error").mockImplementation(() => {});
    const respons = Response.json({ detail: "Fant ikke person 12345678901" }, { status: 500 });

    const feil = await håndterFeil(respons, "Kunne ikke hente sak").catch((e: unknown) => e);

    expect(JSON.stringify(error.mock.calls)).not.toContain("12345678901");
    expect(error).toHaveBeenCalledWith("Kunne ikke hente sak — status 500");
    expect(feil).toBeInstanceOf(BackendFeilException);
    expect((feil as BackendFeilException).message).toBe("Fant ikke person 12345678901");
  });
});
