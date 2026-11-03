import { describe, expect, test } from "vitest";
import type { KontrollsakResponse } from "~/saker/types.backend";
import {
  lagMockMineSakerOppsummering,
  lagMockOyeblikksbilde,
  velgSakKategori,
} from "./mock-oppsummering.server";

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

// Samme kombinasjoner som SaksoversiktTest.kt i watson-admin-api.
const kombinasjoner: [Steg, Status, string | null][] = [
  ["OPPRETTET", null, "nye"],
  ["OPPRETTET", "I_BERO", "venter"],
  ["UTREDNING", "AKTIV", "aktive"],
  ["UTREDNING", null, "aktive"],
  ["UTREDNING", "PAAKLAGET", "aktive"],
  ["UTREDNING", "VENTER_PA_INFORMASJON", "venter"],
  ["UTREDNING", "I_BERO", "venter"],
  ["FORVALTNING", "VENTER_PA_VEDTAK", "venter"],
  ["FORVALTNING", "I_BERO", "venter"],
  ["STRAFFERETTSLIG_VURDERING", "AKTIV", "aktive"],
  ["STRAFFERETTSLIG_VURDERING", "VENTER_PA_INFORMASJON", "venter"],
  ["STRAFFERETTSLIG_VURDERING", "I_BERO", "venter"],
  ["POLITI", "VENTER_PA_RESULTAT", "venter"],
  ["POLITI", "PAAKLAGET", "venter"],
  ["POLITI", "I_BERO", "venter"],
  ["AVSLUTTET", null, null],
];

describe("velgSakKategori", () => {
  test.each(kombinasjoner)("%s + %s gir %s", (steg, status, forventet) => {
    expect(velgSakKategori(lagSak(steg, status))).toBe(forventet);
  });
});

describe("lagMockMineSakerOppsummering", () => {
  test.each(kombinasjoner)("%s + %s havner i %s", (steg, status, forventet) => {
    const oppsummering = lagMockMineSakerOppsummering([lagSak(steg, status)]);
    const treff = Object.entries(oppsummering).filter(([, antall]) => antall > 0);

    expect(treff).toEqual(forventet ? [[forventet, 1]] : []);
  });
});

describe("lagMockOyeblikksbilde", () => {
  const saker = [
    lagSak("UTREDNING", "AKTIV"),
    lagSak("STRAFFERETTSLIG_VURDERING", "AKTIV", false),
    lagSak("UTREDNING", null),
    lagSak("UTREDNING", "VENTER_PA_INFORMASJON"),
    lagSak("STRAFFERETTSLIG_VURDERING", "I_BERO"),
    lagSak("FORVALTNING", "VENTER_PA_VEDTAK"),
    lagSak("POLITI", "PAAKLAGET"),
    lagSak("OPPRETTET", null, false),
    lagSak("OPPRETTET", "I_BERO"),
    lagSak("AVSLUTTET", null, false),
  ];

  test("summerer til totalt, og ikke fordelt går på tvers", () => {
    const bilde = lagMockOyeblikksbilde(saker);
    expect(bilde).toEqual({ totalt: 9, nye: 1, aktive: 3, venterPåAndre: 5, ikkeFordelt: 2 });
    expect(bilde.nye + bilde.aktive + bilde.venterPåAndre).toBe(bilde.totalt);
  });

  test("gir samme kategoritall som mine saker", () => {
    const bilde = lagMockOyeblikksbilde(saker);
    expect(lagMockMineSakerOppsummering(saker)).toEqual({
      nye: bilde.nye,
      aktive: bilde.aktive,
      venter: bilde.venterPåAndre,
    });
  });
});
