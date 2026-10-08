import { describe, expect, test } from "vitest";
import type { KontrollsakResponse, KontrollsakStatus } from "~/saker/types.backend";
import { lagVelkomstOppsummering, velgBøtte } from "./velkomst";

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
    steg: "OPPRETTET",
    kategori: "ANNET",
    kilde: "NAV_KONTROLL",
    misbruktype: [],
    prioritet: "NORMAL",
    status: null,
    ytelser: [],
    merking: [],
    arbeidsgivere: [],
    opprettet: "2026-03-01T00:00:00Z",
    oppdatert: null,
    oppgaver: [],
    kobledeSaker: [],
    dokumenter: [],
    adresseskjermet: false,
    gjeldendePersonIdent: null,
    historiskeIdenter: [],
    ...overstyringer,
  };
}

type Steg = KontrollsakResponse["steg"];
type Status = KontrollsakStatus | null;

const alleStatuser: Status[] = [
  null,
  "AKTIV",
  "VENTER_PA_INFORMASJON",
  "VENTER_PA_VEDTAK",
  "VENTER_PA_RESULTAT",
  "PAAKLAGET",
  "I_BERO",
];

// Forventet bøtte for hvert steg, per status i samme rekkefølge som alleStatuser.
const matrise: Record<Steg, (string | null)[]> = {
  OPPRETTET: ["NY", "NY", "NY", "NY", "NY", "NY", "I_BERO"],
  UTREDNING: ["AKTIV", "AKTIV", "VENTER", "VENTER", "VENTER", "VENTER", "I_BERO"],
  UTREDES: ["AKTIV", "AKTIV", "VENTER", "VENTER", "VENTER", "VENTER", "I_BERO"],
  STRAFFERETTSLIG_VURDERING: ["AKTIV", "AKTIV", "VENTER", "VENTER", "VENTER", "VENTER", "I_BERO"],
  FORVALTNING: ["VENTER", "VENTER", "VENTER", "VENTER", "VENTER", "VENTER", "I_BERO"],
  POLITI: ["VENTER", "VENTER", "VENTER", "VENTER", "VENTER", "VENTER", "I_BERO"],
  ANMELDT: ["VENTER", "VENTER", "VENTER", "VENTER", "VENTER", "VENTER", "I_BERO"],
  AVSLUTTET: [null, null, null, null, null, null, null],
};

describe("velgBøtte", () => {
  const tilfeller = Object.entries(matrise).flatMap(([steg, forventet]) =>
    alleStatuser.map((status, i) => ({ steg: steg as Steg, status, forventet: forventet[i] })),
  );

  test.each(tilfeller)("$steg + $status gir $forventet", ({ steg, status, forventet }) => {
    expect(velgBøtte(lagKontrollsak({ steg, status }))).toBe(forventet);
  });
});

describe("lagVelkomstOppsummering", () => {
  test("teller hver sak i nøyaktig én bøtte", () => {
    const saker = [
      lagKontrollsak({ id: 1, steg: "OPPRETTET", status: "I_BERO" }),
      lagKontrollsak({ id: 2, steg: "UTREDNING", status: "I_BERO" }),
      lagKontrollsak({ id: 3, steg: "UTREDNING" }),
    ];

    expect(lagVelkomstOppsummering(saker)).toBe("Akkurat nå har du 2 saker i bero og 1 aktiv sak.");
  });

  test("teller saker i UTREDNING som aktive", () => {
    const saker = [lagKontrollsak({ steg: "UTREDNING", status: "AKTIV" })];

    expect(lagVelkomstOppsummering(saker)).toBe("Akkurat nå har du 1 aktiv sak.");
  });

  test("viser opprettede saker som nye saker", () => {
    const saker = [lagKontrollsak({ steg: "OPPRETTET" })];

    expect(lagVelkomstOppsummering(saker)).toBe("Akkurat nå har du 1 ny sak.");
  });

  test("viser de to største bøttene", () => {
    const saker = [
      lagKontrollsak({ id: 1, steg: "UTREDNING" }),
      lagKontrollsak({ id: 2, steg: "UTREDNING" }),
      lagKontrollsak({ id: 3, steg: "POLITI" }),
      lagKontrollsak({ id: 4, steg: "FORVALTNING" }),
      lagKontrollsak({ id: 5, steg: "UTREDNING", status: "VENTER_PA_VEDTAK" }),
      lagKontrollsak({ id: 6, steg: "OPPRETTET" }),
    ];

    expect(lagVelkomstOppsummering(saker)).toBe(
      "Akkurat nå har du 3 saker på vent og 2 aktive saker.",
    );
  });

  test("viser en oppmuntrende tekst når brukeren bare har avsluttede saker", () => {
    const saker = [lagKontrollsak({ id: 1, steg: "AVSLUTTET" })];

    expect(lagVelkomstOppsummering(saker)).toBe(
      "Er du klar for nye oppgaver? Du har ingen saker hos deg akkurat nå.",
    );
  });
});
