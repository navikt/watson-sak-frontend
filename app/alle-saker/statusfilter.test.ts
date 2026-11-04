import { describe, expect, it } from "vitest";
import type { KontrollsakResponse } from "~/saker/types.backend";
import { matcherStatusfilter, parseStatusfilter, tilBackendStatusfilter } from "./statusfilter";

describe("statusfilter", () => {
  it("oversetter «Uten status» til utenStatus, sammen med andre statuser", () => {
    expect(
      tilBackendStatusfilter(parseStatusfilter(["AKTIV", "PAAKLAGET", "UTEN_STATUS"])),
    ).toEqual({
      status: ["AKTIV", "PAAKLAGET"],
      statusSteg: undefined,
      utenStatus: true,
    });
  });

  it("utelater utenStatus når «Uten status» ikke er valgt", () => {
    expect(tilBackendStatusfilter(["AKTIV"]).utenStatus).toBeUndefined();
  });

  it("matcher saker uten status bare med «Uten status»", () => {
    const sak = { steg: "UTREDNING", status: null } as KontrollsakResponse;
    expect(matcherStatusfilter(sak, ["UTEN_STATUS"])).toBe(true);
    expect(matcherStatusfilter(sak, ["AKTIV"])).toBe(false);
  });
});
