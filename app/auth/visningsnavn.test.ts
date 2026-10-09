import { describe, expect, it } from "vitest";
import { visningsnavn, visningsnavnFraNavn } from "./visningsnavn";

describe("visningsnavn", () => {
  it("overstyrer navnet til brukertest-identene", () => {
    expect(visningsnavn("Z993376", "Ekte Navn")).toBe("Petter Saksbehandlersen");
    expect(visningsnavn("z993376", "Ekte Navn")).toBe("Petter Saksbehandlersen");
    expect(visningsnavn("Z990778", "Ekte Navn")).toBe("Kari Ledersen");
  });

  it("beholder navnet til andre identer", () => {
    expect(visningsnavn("Z999999", "Saks Behandlersen")).toBe("Saks Behandlersen");
  });

  it("beholder navnet når identen mangler", () => {
    expect(visningsnavn(undefined, "Saks Behandlersen")).toBe("Saks Behandlersen");
    expect(visningsnavn(null, null)).toBeNull();
  });
});

describe("visningsnavnFraNavn", () => {
  it("overstyrer det registrerte navnet til brukertest-identene", () => {
    expect(visningsnavnFraNavn("Test Z993376")).toBe("Petter Saksbehandlersen");
    expect(visningsnavnFraNavn("TEST Z990778")).toBe("Kari Ledersen");
  });

  it("overstyrer ren ident, som backend bruker når navnet mangler", () => {
    expect(visningsnavnFraNavn("Z993376")).toBe("Petter Saksbehandlersen");
  });

  it("beholder andre navn", () => {
    expect(visningsnavnFraNavn("Saks Behandlersen")).toBe("Saks Behandlersen");
    expect(visningsnavnFraNavn("SYSTEM")).toBe("SYSTEM");
    expect(visningsnavnFraNavn(null)).toBeNull();
  });
});
