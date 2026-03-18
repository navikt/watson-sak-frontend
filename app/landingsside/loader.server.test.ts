import { describe, expect, it } from "vitest";
import { loader } from "./loader.server";

describe("landingsside-loader", () => {
  it("returnerer alle uleste varsler sortert nyest først", () => {
    const data = loader();

    expect(data.varsler).toHaveLength(7);
    expect(data.varsler.map((varsel) => varsel.id)).toEqual([
      "varsel-107",
      "varsel-106",
      "varsel-105",
      "varsel-104",
      "varsel-103",
      "varsel-102",
      "varsel-101",
    ]);
    expect(data.varsler.every((varsel) => !varsel.erLest)).toBe(true);
  });
});
