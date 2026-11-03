import { describe, expect, it, vi } from "vitest";

vi.mock("~/config/env.server", () => ({
  BACKEND_API_URL: "http://backend",
  skalBrukeMockdata: false,
  env: { ENVIRONMENT: "local-dev" },
}));

describe("dokument-lagring.api", () => {
  it("bruker samme action som dokumentsiden, med samme tilgangssjekk og validering", async () => {
    const ressursrute = await import("./dokument-lagring.api");
    const side = await import("./DokumentSide.server");

    expect(ressursrute.action).toBe(side.action);
  });
});
