import { describe, expect, it } from "vitest";
import { parseMultiValueParam } from "./useFilterParam";

describe("parseMultiValueParam", () => {
  it("returnerer tom liste når param ikke finnes", () => {
    const params = new URLSearchParams();
    expect(parseMultiValueParam(params, "kategori")).toEqual([]);
  });

  it("parser repeated params", () => {
    const params = new URLSearchParams("kategori=Arbeid&kategori=Samliv");
    expect(parseMultiValueParam(params, "kategori")).toEqual(["Arbeid", "Samliv"]);
  });

  it("parser komma-separerte verdier for bakoverkompatibilitet", () => {
    const params = new URLSearchParams("kategori=Arbeid,Samliv");
    expect(parseMultiValueParam(params, "kategori")).toEqual(["Arbeid", "Samliv"]);
  });

  it("håndterer blanding av repeated og komma-separerte", () => {
    const params = new URLSearchParams("kategori=Arbeid,Samliv&kategori=Helse");
    expect(parseMultiValueParam(params, "kategori")).toEqual(["Arbeid", "Samliv", "Helse"]);
  });

  it("filtrerer bort tomme verdier", () => {
    const params = new URLSearchParams("kategori=Arbeid,,Samliv");
    expect(parseMultiValueParam(params, "kategori")).toEqual(["Arbeid", "Samliv"]);
  });

  it("berører ikke andre params", () => {
    const params = new URLSearchParams("kategori=Arbeid&ytelse=Dagpenger");
    expect(parseMultiValueParam(params, "kategori")).toEqual(["Arbeid"]);
    expect(parseMultiValueParam(params, "ytelse")).toEqual(["Dagpenger"]);
  });
});
