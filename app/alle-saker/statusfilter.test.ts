import { describe, expect, it } from "vitest";
import type { KontrollsakResponse } from "~/saker/types.backend";
import { matcherStatusfilter, parseStatusfilter, tilBackendStatusfilter } from "./statusfilter";

describe("statusfilter", () => {
  it("sender bare statuser til backend", () => {
    expect(tilBackendStatusfilter(["AKTIV", "PAAKLAGET"])).toEqual({
      status: ["AKTIV", "PAAKLAGET"],
    });
    expect(tilBackendStatusfilter([])).toEqual({ status: undefined });
  });

  it("ignorerer ukjente verdier fra eldre bokmerker", () => {
    expect(
      parseStatusfilter(["AKTIV", "UTEN_STATUS", "HOS_FORVALTNING", "HOS_POLITI", "ukjent"]),
    ).toEqual(["AKTIV"]);
  });

  it("matcher bare saker med valgt status", () => {
    const sak = { steg: "UTREDNING", status: null } as KontrollsakResponse;
    expect(matcherStatusfilter(sak, ["AKTIV"])).toBe(false);
    expect(matcherStatusfilter({ ...sak, status: "AKTIV" } as KontrollsakResponse, ["AKTIV"])).toBe(
      true,
    );
  });
});
