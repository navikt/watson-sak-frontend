import { describe, expect, it } from "vitest";
import { parseMultiValueParam } from "./parseMultiValueParam";

describe("parseMultiValueParam", () => {
  it("returnerer tom liste når param ikke finnes", () => {
    const params = new URLSearchParams();
    expect(parseMultiValueParam(params, "kategori")).toEqual([]);
  });

  it("parser repeated params", () => {
    const params = new URLSearchParams("kategori=Arbeid&kategori=Samliv");
    expect(parseMultiValueParam(params, "kategori")).toEqual(["Arbeid", "Samliv"]);
  });

  it("bevarer verdier som inneholder komma", () => {
    const params = new URLSearchParams("enhet=Kontroll Medlemskap og avgift, avgift");
    expect(parseMultiValueParam(params, "enhet")).toEqual([
      "Kontroll Medlemskap og avgift, avgift",
    ]);
  });

  it("berører ikke andre params", () => {
    const params = new URLSearchParams("kategori=Arbeid&ytelse=Dagpenger");
    expect(parseMultiValueParam(params, "kategori")).toEqual(["Arbeid"]);
    expect(parseMultiValueParam(params, "ytelse")).toEqual(["Dagpenger"]);
  });
});
