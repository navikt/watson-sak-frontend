import { describe, expect, it } from "vitest";
import type { KontrollsakSteg } from "~/saker/types.backend";
import { hentStegbaserteSaksregler } from "./stegregler";

describe("hentStegbaserteSaksregler", () => {
  it("begrenser Opprettet til klargjøring av saken", () => {
    expect(hentStegbaserteSaksregler("OPPRETTET")).toEqual({
      erAktiv: true,
      kanUtføreUtredningsarbeid: false,
      kanLasteOppFiler: true,
      kanRedigereDokumenter: false,
      kanLeggeTilHistorikk: false,
      kanEndreDeltTilgang: false,
    });
  });

  it("tillater utredningsarbeid for aktive steg etter Opprettet", () => {
    const aktiveSteg: KontrollsakSteg[] = ["UTREDES", "STRAFFERETTSLIG_VURDERING", "POLITI"];

    for (const steg of aktiveSteg) {
      expect(hentStegbaserteSaksregler(steg)).toEqual({
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
    expect(hentStegbaserteSaksregler("AVSLUTTET")).toEqual({
      erAktiv: false,
      kanUtføreUtredningsarbeid: false,
      kanLasteOppFiler: false,
      kanRedigereDokumenter: false,
      kanLeggeTilHistorikk: false,
      kanEndreDeltTilgang: false,
    });
  });
});
