import { describe, expect, test } from "vitest";
import type { KontrollsakResponse } from "~/saker/types.backend";
import { lagVelkomstOppsummering } from "./velkomst";

function lagKontrollsak(overstyringer: Partial<KontrollsakResponse> = {}): KontrollsakResponse {
  return {
    id: 3,
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
    blokkert: null,
    ytelser: [],
    merking: null,
    opprettet: "2026-03-01T00:00:00Z",
    oppdatert: null,
    oppgaver: [],
    ...overstyringer,
  };
}

describe("lagVelkomstOppsummering", () => {
  test("oppsummerer de to mest relevante arbeidstypene", () => {
    const saker = [
      lagKontrollsak({ id: 101, status: "OPPRETTET" }),
      lagKontrollsak({ id: 102, status: "OPPRETTET" }),
      lagKontrollsak({ id: 103, status: "UTREDES" }),
      lagKontrollsak({ id: 104, status: "UTREDES" }),
      lagKontrollsak({ id: 105, status: "UTREDES", blokkert: "VENTER_PA_VEDTAK" }),
    ];

    expect(lagVelkomstOppsummering(saker)).toBe(
      "Akkurat nå har du 4 aktive saker og 1 sak på vent.",
    );
  });

  test("viser en oppmuntrende tekst når brukeren ikke har aktive saker", () => {
    const saker = [
      lagKontrollsak({ id: 106, status: "AVSLUTTET" }),
      lagKontrollsak({ id: 107, status: "AVSLUTTET" }),
      lagKontrollsak({ id: 108, status: "AVSLUTTET" }),
    ];

    expect(lagVelkomstOppsummering(saker)).toBe(
      "Er du klar for nye oppgaver? Du har ingen saker hos deg akkurat nå.",
    );
  });

  test("tar med ventende saker når de utgjør en større del av arbeidsbildet", () => {
    const saker = [
      lagKontrollsak({ id: 109, status: "UTREDES", blokkert: "VENTER_PA_VEDTAK" }),
      lagKontrollsak({ id: 110, status: "UTREDES", blokkert: "VENTER_PA_VEDTAK" }),
      lagKontrollsak({ id: 111, status: "UTREDES", blokkert: "VENTER_PA_VEDTAK" }),
      lagKontrollsak({ id: 112, status: "UTREDES" }),
    ];

    expect(lagVelkomstOppsummering(saker)).toBe(
      "Akkurat nå har du 3 saker på vent og 1 aktiv sak.",
    );
  });

  test("oppsummerer backend-statuser med samme arbeidsbilde", () => {
    const saker = [
      lagKontrollsak({ id: 113, status: "OPPRETTET" }),
      lagKontrollsak({ id: 114, status: "OPPRETTET" }),
      lagKontrollsak({ id: 115, status: "UTREDES" }),
      lagKontrollsak({ id: 116, status: "UTREDES" }),
      lagKontrollsak({ id: 117, status: "UTREDES", blokkert: "VENTER_PA_VEDTAK" }),
    ];

    expect(lagVelkomstOppsummering(saker)).toBe(
      "Akkurat nå har du 4 aktive saker og 1 sak på vent.",
    );
  });

  test("behandler saker i bero som egen oppsummeringskategori", () => {
    const saker = [
      lagKontrollsak({ id: 118, status: "OPPRETTET", blokkert: "I_BERO" }),
      lagKontrollsak({ id: 119, status: "UTREDES", blokkert: "I_BERO" }),
      lagKontrollsak({ id: 120, status: "OPPRETTET" }),
    ];

    expect(lagVelkomstOppsummering(saker)).toBe(
      "Akkurat nå har du 3 aktive saker og 2 saker i bero.",
    );
  });

  test("behandler opprettede saker som aktive i velkomstoppsummeringen", () => {
    const saker = [lagKontrollsak({ id: 121, status: "OPPRETTET" })];

    expect(lagVelkomstOppsummering(saker)).toBe("Akkurat nå har du 1 aktiv sak.");
  });

  test("behandler anmeldte saker som aktive i velkomstoppsummeringen", () => {
    const saker = [lagKontrollsak({ id: 122, status: "ANMELDT" })];

    expect(lagVelkomstOppsummering(saker)).toBe("Akkurat nå har du 1 aktiv sak.");
  });
});
