import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  hentUlesteVarsler,
  markerVarselSomLest,
  resetMockVarsler,
} from "~/varsler/mock-data.server";
import {
  leggTilMockSak,
  resetMockPersonOppslag,
  slaOppPerson,
} from "~/registrer-sak/person-oppslag.mock.server";

vi.mock("~/config/env.server", () => ({
  skalBrukeMockdata: true,
}));

import { action } from "./reset-api";

describe("reset-api", () => {
  beforeEach(() => {
    resetMockVarsler();
    resetMockPersonOppslag();
  });

  it("tilbakestiller varsler som er markert som lest", () => {
    markerVarselSomLest("varsel-107");

    expect(hentUlesteVarsler().map((varsel) => varsel.id)).not.toContain("varsel-107");

    action();

    expect(hentUlesteVarsler().map((varsel) => varsel.id)).toContain("varsel-107");
  });

  it("tilbakestiller mock personoppslag etter ny sak er lagt til", () => {
    leggTilMockSak("12345678901", "Testperson", "Øst");

    const resultatFørReset = slaOppPerson("12345678901");
    expect(resultatFørReset?.eksisterendeSaker).toHaveLength(1);

    action();

    const resultatEtterReset = slaOppPerson("12345678901");
    expect(resultatEtterReset?.eksisterendeSaker).toHaveLength(0);
  });
});
