import { describe, expect, it } from "vitest";
import { visningsnavn } from "./visningsnavn";

describe("visningsnavn", () => {
  it("overstyrer navnet til brukertest-identen", () => {
    expect(visningsnavn("Z993376", "Ekte Navn")).toBe("Line Skalle");
    expect(visningsnavn("z993376", "Ekte Navn")).toBe("Line Skalle");
  });

  it("beholder navnet til andre identer", () => {
    expect(visningsnavn("Z999999", "Saks Behandlersen")).toBe("Saks Behandlersen");
  });

  it("beholder navnet når identen mangler", () => {
    expect(visningsnavn(undefined, "Saks Behandlersen")).toBe("Saks Behandlersen");
    expect(visningsnavn(null, null)).toBeNull();
  });
});
