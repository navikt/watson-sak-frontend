import { describe, expect, it } from "vitest";
import type { KontrollsakStatus } from "~/saker/types.backend";
import { hentStatusbaserteSaksregler } from "./statusregler";

describe("hentStatusbaserteSaksregler", () => {
  it("begrenser Opprettet til klargjøring av saken", () => {
    expect(hentStatusbaserteSaksregler("OPPRETTET")).toEqual({
      erAktiv: true,
      kanUtføreUtredningsarbeid: false,
      kanLasteOppFiler: true,
      kanRedigereDokumenter: false,
      kanLeggeTilHistorikk: false,
      kanEndreDeltTilgang: false,
    });
  });

  it("tillater utredningsarbeid for aktive statuser etter Opprettet", () => {
    const aktiveStatuser: KontrollsakStatus[] = [
      "UTREDES",
      "STRAFFERETTSLIG_VURDERING",
      "ANMELDT",
      "HENLAGT",
    ];

    for (const status of aktiveStatuser) {
      expect(hentStatusbaserteSaksregler(status)).toEqual({
        erAktiv: true,
        kanUtføreUtredningsarbeid: true,
        kanLasteOppFiler: true,
        kanRedigereDokumenter: true,
        kanLeggeTilHistorikk: true,
        kanEndreDeltTilgang: true,
      });
    }
  });

  it("sperrer endringer for Avsluttet", () => {
    expect(hentStatusbaserteSaksregler("AVSLUTTET")).toEqual({
      erAktiv: false,
      kanUtføreUtredningsarbeid: false,
      kanLasteOppFiler: false,
      kanRedigereDokumenter: false,
      kanLeggeTilHistorikk: false,
      kanEndreDeltTilgang: false,
    });
  });
});
