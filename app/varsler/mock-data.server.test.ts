import { beforeEach, describe, expect, it } from "vitest";
import { lagMockSakUuid } from "~/saker/mock-uuid";
import { hentMockState, resetDefaultSession } from "~/testing/mock-store/session.server";
import { hentUlesteVarsler, markerVarselSomLest } from "~/testing/mock-store/varsler.server";

const testRequest = new Request("http://localhost");
function state() {
  return hentMockState(testRequest);
}

describe("varsler mock-data", () => {
  beforeEach(() => {
    resetDefaultSession();
  });

  it("kan markere et varsel som lest uten å slette det fra datalaget", () => {
    const antallVarslerFør = state().varsler.length;
    markerVarselSomLest(state(), "varsel-107");

    expect(state().varsler).toHaveLength(antallVarslerFør);
    expect(state().varsler.find((varsel) => varsel.id === "varsel-107")?.erLest).toBe(true);
    expect(hentUlesteVarsler(state()).map((varsel) => varsel.id)).not.toContain("varsel-107");
  });

  it("bruker normaliserte kontrollsak-UUID-er i varsel-lenker", () => {
    const varsler = hentUlesteVarsler(state());

    expect(varsler.find((varsel) => varsel.id === "varsel-101")?.sakId).toBe(
      lagMockSakUuid("101", 1),
    );
    expect(varsler.find((varsel) => varsel.id === "varsel-102")?.sakId).toBe(
      lagMockSakUuid("102", 1),
    );
    expect(varsler.find((varsel) => varsel.id === "varsel-103")?.sakId).toBe(
      lagMockSakUuid("103", 1),
    );
    expect(varsler.find((varsel) => varsel.id === "varsel-104")?.sakId).toBe(
      lagMockSakUuid("104", 1),
    );
  });
});
