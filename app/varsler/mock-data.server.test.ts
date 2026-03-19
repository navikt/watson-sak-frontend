import { describe, expect, it } from "vitest";
import * as varslerModule from "./mock-data.server";

describe("varsler mock-data", () => {
  it("kan markere et varsel som lest uten å slette det fra datalaget", () => {
    const resetMockVarsler = Reflect.get(varslerModule, "resetMockVarsler");
    const markerVarselSomLest = Reflect.get(varslerModule, "markerVarselSomLest");

    expect(resetMockVarsler).toBeTypeOf("function");
    expect(markerVarselSomLest).toBeTypeOf("function");

    if (typeof resetMockVarsler !== "function" || typeof markerVarselSomLest !== "function") {
      throw new Error("Forventet funksjoner for å nullstille og markere varsler som lest");
    }

    resetMockVarsler();

    const antallVarslerFør = varslerModule.mockVarsler.length;
    markerVarselSomLest("varsel-107");

    expect(varslerModule.mockVarsler).toHaveLength(antallVarslerFør);
    expect(varslerModule.mockVarsler.find((varsel) => varsel.id === "varsel-107")?.erLest).toBe(
      true,
    );
    expect(varslerModule.hentUlesteVarsler().map((varsel) => varsel.id)).not.toContain(
      "varsel-107",
    );
  });
});
