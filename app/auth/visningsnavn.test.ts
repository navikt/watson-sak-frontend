import { describe, expect, it } from "vitest";
import { visningsnavn } from "./visningsnavn";

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
