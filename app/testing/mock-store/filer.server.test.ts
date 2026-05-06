import { beforeEach, describe, expect, it } from "vitest";
import { hentFilerForSak, registrerTomtFilområdeForSak, resetMockFiler } from "./filer.server";

describe("mock-store filer", () => {
  beforeEach(() => {
    resetMockFiler();
  });

  it("viser eksempelfiler for eksisterende demosaker med filer", () => {
    expect(hentFilerForSak("102")).not.toEqual([]);
  });

  it("lar nyopprettede saker starte med tom filliste", () => {
    registrerTomtFilområdeForSak("102");

    expect(hentFilerForSak("102")).toEqual([]);
  });

  it("tilbakestiller tomme filområder", () => {
    registrerTomtFilområdeForSak("102");

    resetMockFiler();

    expect(hentFilerForSak("102")).not.toEqual([]);
  });
});
