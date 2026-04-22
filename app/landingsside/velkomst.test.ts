import { describe, expect, test } from "vitest";
import type { KontrollsakResponse } from "~/saker/types.backend";
import { lagVelkomstOppsummering } from "./velkomst";

function lagKontrollsak(overstyringer: Partial<KontrollsakResponse> = {}): KontrollsakResponse {
  return {
    id: "ks-1",
    personIdent: "12345678901",
    personNavn: "Ola Nordmann",
    saksbehandlere: {
      eier: { navIdent: "Z123456", navn: "Ola Saksbehandler", enhet: "4812" },
      deltMed: [],
      opprettetAv: { navIdent: "Z654321", navn: "Kari Oppretter", enhet: "4812" },
    },
    status: "OPPRETTET",
    kategori: "ANNET",
    kilde: "NAV_KONTROLL",
    misbruktype: [],
    prioritet: "NORMAL",
    iBero: false,
    avslutningskonklusjon: null,
    tilgjengeligeHandlinger: [],
    ytelser: [],
    merking: null,
    resultat: null,
    opprettet: "2026-03-01T00:00:00Z",
    oppdatert: null,
    ...overstyringer,
  };
}

describe("lagVelkomstOppsummering", () => {
  test("oppsummerer de to mest relevante arbeidstypene", () => {
    const saker = [
      lagKontrollsak({ id: "1", status: "OPPRETTET" }),
      lagKontrollsak({ id: "2", status: "OPPRETTET" }),
      lagKontrollsak({ id: "3", status: "UTREDES" }),
      lagKontrollsak({ id: "4", status: "UTREDES" }),
      lagKontrollsak({ id: "5", status: "VENTER_PA_VEDTAK" }),
    ];

    expect(lagVelkomstOppsummering(saker)).toBe(
      "Akkurat nå har du 4 aktive saker og 1 sak på vent.",
    );
  });

  test("viser en oppmuntrende tekst når brukeren ikke har aktive saker", () => {
    const saker = [
      lagKontrollsak({ id: "1", status: "AVSLUTTET" }),
      lagKontrollsak({ id: "2", status: "AVSLUTTET" }),
      lagKontrollsak({ id: "3", status: "AVSLUTTET" }),
    ];

    expect(lagVelkomstOppsummering(saker)).toBe(
      "Er du klar for nye oppgaver? Du har ingen saker hos deg akkurat nå.",
    );
  });

  test("tar med ventende saker når de utgjør en større del av arbeidsbildet", () => {
    const saker = [
      lagKontrollsak({ id: "1", status: "VENTER_PA_VEDTAK" }),
      lagKontrollsak({ id: "2", status: "VENTER_PA_VEDTAK" }),
      lagKontrollsak({ id: "3", status: "VENTER_PA_VEDTAK" }),
      lagKontrollsak({ id: "4", status: "UTREDES" }),
    ];

    expect(lagVelkomstOppsummering(saker)).toBe(
      "Akkurat nå har du 3 saker på vent og 1 aktiv sak.",
    );
  });

  test("oppsummerer backend-statuser med samme arbeidsbilde", () => {
    const saker = [
      lagKontrollsak({ id: "ks-1", status: "OPPRETTET" }),
      lagKontrollsak({ id: "ks-2", status: "OPPRETTET" }),
      lagKontrollsak({ id: "ks-3", status: "UTREDES" }),
      lagKontrollsak({ id: "ks-4", status: "UTREDES" }),
      lagKontrollsak({ id: "ks-5", status: "VENTER_PA_VEDTAK" }),
    ];

    expect(lagVelkomstOppsummering(saker)).toBe(
      "Akkurat nå har du 4 aktive saker og 1 sak på vent.",
    );
  });

  test("behandler saker i bero som egen oppsummeringskategori", () => {
    const saker = [
      lagKontrollsak({ id: "1", status: "OPPRETTET", iBero: true }),
      lagKontrollsak({ id: "2", status: "UTREDES", iBero: true }),
      lagKontrollsak({ id: "3", status: "OPPRETTET" }),
    ];

    expect(lagVelkomstOppsummering(saker)).toBe(
      "Akkurat nå har du 3 aktive saker og 2 saker i bero.",
    );
  });

  test("behandler opprettede saker som aktive i velkomstoppsummeringen", () => {
    const saker = [lagKontrollsak({ id: "1", status: "OPPRETTET" })];

    expect(lagVelkomstOppsummering(saker)).toBe(
      "Akkurat nå har du 1 aktiv sak.",
    );
  });
});
