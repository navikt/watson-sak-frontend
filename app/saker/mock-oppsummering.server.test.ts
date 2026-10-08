import { describe, expect, test } from "vitest";
import type { KontrollsakResponse } from "~/saker/types.backend";
import { lagMockMineSakerOppsummering, lagMockOyeblikksbilde } from "./mock-oppsummering.server";

type Steg = KontrollsakResponse["steg"];
type Status = KontrollsakResponse["status"];

const eier = { navIdent: "Z123456", navn: "Ola Saksbehandler", enhet: "4812" };

function lagSak(steg: Steg, status: Status, harEier = true): KontrollsakResponse {
  return {
    id: 1,
    personIdent: "12345678901",
    personNavn: "Ola Nordmann",
    saksbehandlere: {
      eier: harEier ? eier : null,
      deltMed: [],
      opprettetAv: eier,
    },
    steg,
    kategori: "ANNET",
    kilde: "NAV_KONTROLL",
    misbruktype: [],
    prioritet: "NORMAL",
    status,
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
  } as KontrollsakResponse;
}

// Samme lovlige kombinasjoner som SaksoversiktTest.kt i watson-admin-api.
const kombinasjoner: [Steg, Status, string | null][] = [
  ["OPPRETTET", null, "nye"],
  ["OPPRETTET", "I_BERO", "iBero"],
  ["UTREDNING", "AKTIV", "aktive"],
  ["UTREDNING", "VENTER_PA_INFORMASJON", "venter"],
  ["UTREDNING", "I_BERO", "iBero"],
  ["FORVALTNING", "VENTER_PA_VEDTAK", "venter"],
  ["FORVALTNING", "I_BERO", "iBero"],
  ["STRAFFERETTSLIG_VURDERING", "AKTIV", "aktive"],
  ["STRAFFERETTSLIG_VURDERING", "I_BERO", "iBero"],
  ["POLITI", "VENTER_PA_RESULTAT", "venter"],
  ["POLITI", "PAAKLAGET", "venter"],
  ["POLITI", "I_BERO", "iBero"],
  ["AVSLUTTET", null, null],
];

describe("lagMockMineSakerOppsummering", () => {
  test.each(kombinasjoner)("%s + %s havner i %s", (steg, status, forventet) => {
    const oppsummering = lagMockMineSakerOppsummering([lagSak(steg, status)]);
    const treff = Object.entries(oppsummering).filter(([, antall]) => antall > 0);

    expect(treff).toEqual(forventet ? [[forventet, 1]] : []);
  });
});

describe("lagMockOyeblikksbilde", () => {
  test("følger statistikksidens definisjoner", () => {
    const saker = [
      lagSak("UTREDNING", "AKTIV"),
      lagSak("STRAFFERETTSLIG_VURDERING", "AKTIV", false),
      lagSak("UTREDNING", null),
      lagSak("UTREDNING", "VENTER_PA_INFORMASJON"),
      lagSak("STRAFFERETTSLIG_VURDERING", "I_BERO"),
      lagSak("FORVALTNING", "VENTER_PA_VEDTAK"),
      lagSak("POLITI", "PAAKLAGET"),
      lagSak("OPPRETTET", null, false),
      lagSak("AVSLUTTET", null, false),
    ];

    expect(lagMockOyeblikksbilde(saker)).toEqual({
      totalt: 8,
      aktive: 2,
      venterPåAndre: 4,
      ikkeFordelt: 2,
    });
  });
});
