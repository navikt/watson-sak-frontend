import { describe, expect, it } from "vitest";
import { visningsnavn } from "./visning";

describe("visningsnavn", () => {
  it("viser eldre kontrollnotatverdier som orienteringsnotat", () => {
    expect(visningsnavn("KONTROLLNOTAT")).toBe("Orienteringsnotat");
  });
});
