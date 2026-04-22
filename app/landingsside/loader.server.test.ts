import { afterEach, describe, expect, it, vi } from "vitest";
import { loader } from "./loader.server";

describe("landingsside-loader", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

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

  it("returnerer nøkkeltall for dine saker siste 14 dager", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-18T12:00:00Z"));

    const data = loader();

    expect(data.dineSakerSiste14Dager).toEqual({
      antallSakerJobbetMed: 3,
      antallTipsTilVurdering: 0,
      antallSendtTilNayNfp: 1,
      snittBehandlingstidPerSak: null,
      antallHenlagteSaker: 0,
      antallHenlagteTips: 0,
      antallSakerIBero: 0,
    });
  });

  it("returnerer kun aktive saker (ikke avsluttede)", () => {
    const data = loader();

    expect(data.mineSaker.every((sak) => sak.status !== "AVSLUTTET")).toBe(true);
  });

  it("returnerer bare saker eid av innlogget bruker i dashboardets mine saker-liste", () => {
    const data = loader();

    expect(data.mineSaker.every((sak) => sak.saksbehandlere.eier?.navIdent === "Z999999")).toBe(true);
  });

  it("returnerer en velkomstoppsummering basert på sakene dine", () => {
    const data = loader();

    expect(data.velkomstOppsummering).toBe("Akkurat nå har du 5 aktive saker og 1 sak på vent.");
  });
});
