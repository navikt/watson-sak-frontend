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
    status: "UFORDELT",
    kategori: "ANNET",
    kilde: "NAV_KONTROLL",
    misbruktype: [],
    prioritet: "NORMAL",
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
      lagKontrollsak({ id: "1", status: "UFORDELT" }),
      lagKontrollsak({ id: "2", status: "UFORDELT" }),
      lagKontrollsak({ id: "3", status: "UTREDES" }),
      lagKontrollsak({ id: "4", status: "UTREDES" }),
      lagKontrollsak({ id: "5", status: "FORVALTNING" }),
    ];

    expect(lagVelkomstOppsummering(saker)).toBe(
      "Akkurat nå har du 2 tips til vurdering og 2 saker til utredning.",
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
      lagKontrollsak({ id: "1", status: "FORVALTNING" }),
      lagKontrollsak({ id: "2", status: "FORVALTNING" }),
      lagKontrollsak({ id: "3", status: "FORVALTNING" }),
      lagKontrollsak({ id: "4", status: "UTREDES" }),
    ];

    expect(lagVelkomstOppsummering(saker)).toBe(
      "Akkurat nå har du 3 saker som venter på svar fra NAY/NFP og 1 sak til utredning.",
    );
  });

  test("oppsummerer backend-statuser med samme arbeidsbilde", () => {
    const saker = [
      lagKontrollsak({ id: "ks-1", status: "UFORDELT" }),
      lagKontrollsak({ id: "ks-2", status: "UFORDELT" }),
      lagKontrollsak({ id: "ks-3", status: "UTREDES" }),
      lagKontrollsak({ id: "ks-4", status: "UTREDES" }),
      lagKontrollsak({ id: "ks-5", status: "FORVALTNING" }),
    ];

    expect(lagVelkomstOppsummering(saker)).toBe(
      "Akkurat nå har du 2 tips til vurdering og 2 saker til utredning.",
    );
  });

  test("behandler I_BERO som sak til utredning i oppsummeringen", () => {
    const saker = [
      lagKontrollsak({ id: "1", status: "I_BERO" }),
      lagKontrollsak({ id: "2", status: "I_BERO" }),
      lagKontrollsak({ id: "3", status: "UFORDELT" }),
    ];

    expect(lagVelkomstOppsummering(saker)).toBe(
      "Akkurat nå har du 2 saker til utredning og 1 tips til vurdering.",
    );
  });
});
