import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  hentUlesteVarsler,
  markerVarselSomLest,
  resetMockVarsler,
} from "~/varsler/mock-data.server";

vi.mock("~/config/env.server", () => ({
  skalBrukeMockdata: true,
}));

import { action } from "./reset-api";

describe("reset-api", () => {
  beforeEach(() => {
    resetMockVarsler();
  });

  it("tilbakestiller varsler som er markert som lest", () => {
    markerVarselSomLest("varsel-107");

    expect(hentUlesteVarsler().map((varsel) => varsel.id)).not.toContain("varsel-107");

    action();

    expect(hentUlesteVarsler().map((varsel) => varsel.id)).toContain("varsel-107");
  });
});
