import { describe, expect, test } from "vitest";
import type { KontrollsakResponse } from "~/saker/types.backend";
import {
  beregnAnsatteOversikt,
  beregnEnhetsOppsummering,
  erOverFrist,
  erÅpenSak,
} from "./beregninger";

function lagKontrollsak(overstyringer: Partial<KontrollsakResponse> = {}): KontrollsakResponse {
  return {
    id: 3,
    personIdent: "12345678901",
    personNavn: "Ola Nordmann",
    saksbehandlere: {
      eier: { navIdent: "Z123456", navn: "Ola Saksbehandler", enhet: "hu424t" },
      deltMed: [],
      opprettetAv: { navIdent: "Z654321", navn: "Kari Oppretter", enhet: "hu424t" },
    },
    status: "OPPRETTET",
    kategori: "ANNET",
    kilde: "NAV_KONTROLL",
    misbruktype: [],
    prioritet: "NORMAL",
    blokkert: null,
    henleggelsesarsak: null,
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
    enhet: "hu424t",
    ...overstyringer,
  };
}

const NÅ = new Date("2026-03-31T00:00:00Z");

describe("erÅpenSak", () => {
  test("er sann for alle statuser unntatt anmeldt, henlagt og avsluttet", () => {
    expect(erÅpenSak(lagKontrollsak({ status: "OPPRETTET" }))).toBe(true);
    expect(erÅpenSak(lagKontrollsak({ status: "UTREDES" }))).toBe(true);
    expect(erÅpenSak(lagKontrollsak({ status: "STRAFFERETTSLIG_VURDERING" }))).toBe(true);
    expect(erÅpenSak(lagKontrollsak({ status: "ANMELDT" }))).toBe(false);
    expect(erÅpenSak(lagKontrollsak({ status: "HENLAGT" }))).toBe(false);
    expect(erÅpenSak(lagKontrollsak({ status: "AVSLUTTET" }))).toBe(false);
  });
});

describe("erOverFrist", () => {
  test("er over frist når en åpen sak ikke er oppdatert de siste 30 dagene", () => {
    const sak = lagKontrollsak({ oppdatert: "2026-02-01T00:00:00Z" });
    expect(erOverFrist(sak, NÅ)).toBe(true);
  });

  test("er ikke over frist når saken er oppdatert innenfor 30 dager", () => {
    const sak = lagKontrollsak({ oppdatert: "2026-03-15T00:00:00Z" });
    expect(erOverFrist(sak, NÅ)).toBe(false);
  });

  test("faller tilbake til opprettet-dato når saken aldri er oppdatert", () => {
    const sak = lagKontrollsak({ opprettet: "2026-01-01T00:00:00Z", oppdatert: null });
    expect(erOverFrist(sak, NÅ)).toBe(true);
  });

  test("er aldri over frist for lukkede saker, uansett alder", () => {
    const sak = lagKontrollsak({
      status: "AVSLUTTET",
      oppdatert: "2025-01-01T00:00:00Z",
    });
    expect(erOverFrist(sak, NÅ)).toBe(false);
  });
});

describe("beregnEnhetsOppsummering", () => {
  test("teller åpne saker, saker over frist og ufordelte saker", () => {
    const saker = [
      lagKontrollsak({ id: 1, status: "OPPRETTET", oppdatert: "2026-03-20T00:00:00Z" }),
      lagKontrollsak({ id: 2, status: "UTREDES", oppdatert: "2026-01-01T00:00:00Z" }),
      lagKontrollsak({
        id: 3,
        status: "OPPRETTET",
        oppdatert: "2026-01-01T00:00:00Z",
        saksbehandlere: {
          eier: null,
          deltMed: [],
          opprettetAv: { navIdent: "Z1", navn: "A", enhet: null },
        },
      }),
      lagKontrollsak({ id: 4, status: "AVSLUTTET", oppdatert: "2020-01-01T00:00:00Z" }),
    ];

    expect(beregnEnhetsOppsummering(saker, NÅ)).toEqual({
      antallÅpneSaker: 3,
      antallOverFrist: 2,
      antallUfordelte: 1,
    });
  });
});

describe("beregnAnsatteOversikt", () => {
  test("grupperer åpne saker per ansvarlig og skiller over frist fra innenfor frist", () => {
    const saker = [
      lagKontrollsak({
        id: 1,
        oppdatert: "2026-03-20T00:00:00Z",
        saksbehandlere: {
          eier: { navIdent: "Z1", navn: "Ada", enhet: "hu424t" },
          deltMed: [],
          opprettetAv: { navIdent: "Z1", navn: "Ada", enhet: "hu424t" },
        },
      }),
      lagKontrollsak({
        id: 2,
        oppdatert: "2026-01-01T00:00:00Z",
        saksbehandlere: {
          eier: { navIdent: "Z1", navn: "Ada", enhet: "hu424t" },
          deltMed: [],
          opprettetAv: { navIdent: "Z1", navn: "Ada", enhet: "hu424t" },
        },
      }),
      lagKontrollsak({
        id: 3,
        status: "AVSLUTTET",
        saksbehandlere: {
          eier: { navIdent: "Z1", navn: "Ada", enhet: "hu424t" },
          deltMed: [],
          opprettetAv: { navIdent: "Z1", navn: "Ada", enhet: "hu424t" },
        },
      }),
    ];

    const ansatte = [
      { navIdent: "Z1", navn: "Ada" },
      { navIdent: "Z2", navn: "Bjørn" },
    ];

    expect(beregnAnsatteOversikt(saker, ansatte, NÅ)).toEqual([
      { navIdent: "Z1", navn: "Ada", totalAntall: 2, innenforFrist: 1, overFrist: 1 },
      { navIdent: "Z2", navn: "Bjørn", totalAntall: 0, innenforFrist: 0, overFrist: 0 },
    ]);
  });
});
