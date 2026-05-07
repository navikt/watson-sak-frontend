import { beforeEach, describe, expect, it } from "vitest";
import { hentMockState, resetDefaultSession } from "~/testing/mock-store/session.server";
import {
  hentFilerForSak as _hentFilerForSak,
  registrerTomtFilområdeForSak as _registrerTomtFilområdeForSak,
} from "./filer.server";

const testRequest = new Request("http://localhost");

function hentFilerForSak(sakId: string) {
  return _hentFilerForSak(hentMockState(testRequest), sakId);
}
function registrerTomtFilområdeForSak(sakId: string) {
  return _registrerTomtFilområdeForSak(hentMockState(testRequest), sakId);
}

describe("mock-store filer", () => {
  beforeEach(() => {
    resetDefaultSession();
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

    resetDefaultSession();

    expect(hentFilerForSak("102")).not.toEqual([]);
  });
});
