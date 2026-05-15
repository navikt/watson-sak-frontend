import { describe, expect, it, vi } from "vitest";
import { loader } from "./MineSakerSide.route";
import { filtrerMineSaker } from "./filtre";
import type { KontrollsakResponse } from "~/saker/types.backend";

vi.mock("~/config/env.server", () => ({
  skalBrukeMockdata: true,
}));

vi.mock("~/auth/innlogget-bruker.server", () => ({
  hentInnloggetBruker: vi.fn().mockResolvedValue({
    preferredUsername: "test",
    name: "Saks Behandlersen",
    navIdent: "Z999999",
    enhet: "4812",
  }),
}));

function lagKontrollsak(overrides: Partial<KontrollsakResponse> = {}): KontrollsakResponse {
  return {
    id: 9,
    personIdent: "10987654321",
    personNavn: "Test Person",
    saksbehandlere: {
      eier: { navIdent: "Z999999", navn: "Saks Behandlersen", enhet: "4812" },
      deltMed: [],
      opprettetAv: { navIdent: "Z999999", navn: "Saks Behandlersen", enhet: "4812" },
    },
    status: "OPPRETTET",
    kategori: "ARBEID",
    kilde: "NAV_KONTROLL",
    misbruktype: [],
    prioritet: "NORMAL",
    blokkert: null,
    ytelser: [],
    merking: null,
    opprettet: "2026-02-03T10:11:12Z",
    oppdatert: null,
    oppgaver: [],
    ...overrides,
  };
}

describe("MineSakerSide loader", () => {
  const loaderArgs = {
    request: new Request("http://localhost/mine-saker"),
    params: {},
    context: {},
  } as Parameters<typeof loader>[0];

  it("returnerer backend-shapede kontrollsaker for mine saker", async () => {
    const resultat = await loader(loaderArgs);

    expect(resultat.saker.length).toBeGreaterThan(0);
    expect("personIdent" in resultat.saker[0]).toBe(true);
  });

  it("returnerer bare saker eid av innlogget bruker", async () => {
    const resultat = await loader(loaderArgs);

    expect(resultat.saker.every((sak) => sak.saksbehandlere.eier?.navIdent === "Z999999")).toBe(
      true,
    );
  });

  it("returnerer filteralternativer for status og ventestatus", async () => {
    const resultat = await loader(loaderArgs);

    expect(resultat.filterAlternativer.status.length).toBe(6);
    expect(resultat.filterAlternativer.ventestatus.length).toBe(4);
  });

  it("bruker default-filter når ingen URL-parametere er satt", async () => {
    const resultat = await loader(loaderArgs);

    expect(resultat.aktivtFilter.status).toEqual([
      "OPPRETTET",
      "UTREDES",
      "STRAFFERETTSLIG_VURDERING",
    ]);
    expect(resultat.aktivtFilter.ventestatus).toEqual(["INGEN", "VENTER_PA_INFORMASJON"]);
  });

  it("bruker URL-parametere for filtrering når de er satt", async () => {
    const args = {
      request: new Request("http://localhost/mine-saker?status=AVSLUTTET"),
      params: {},
      context: {},
    } as Parameters<typeof loader>[0];

    const resultat = await loader(args);

    expect(resultat.aktivtFilter.status).toEqual(["AVSLUTTET"]);
    expect(resultat.aktivtFilter.ventestatus).toEqual([]);
  });
});

describe("filtrerMineSaker", () => {
  it("filtrerer på status", () => {
    const saker = [
      lagKontrollsak({ status: "OPPRETTET" }),
      lagKontrollsak({ status: "AVSLUTTET" }),
    ];

    const resultat = filtrerMineSaker(saker, ["OPPRETTET"], []);
    expect(resultat).toHaveLength(1);
    expect(resultat[0].status).toBe("OPPRETTET");
  });

  it("filtrerer på ventestatus INGEN (ikke blokkert)", () => {
    const saker = [
      lagKontrollsak({ blokkert: null }),
      lagKontrollsak({ blokkert: "VENTER_PA_VEDTAK" }),
    ];

    const resultat = filtrerMineSaker(saker, [], ["INGEN"]);
    expect(resultat).toHaveLength(1);
    expect(resultat[0].blokkert).toBeNull();
  });

  it("filtrerer på ventestatus med blokkeringsårsak", () => {
    const saker = [
      lagKontrollsak({ blokkert: null }),
      lagKontrollsak({ blokkert: "VENTER_PA_INFORMASJON" }),
      lagKontrollsak({ blokkert: "I_BERO" }),
    ];

    const resultat = filtrerMineSaker(saker, [], ["VENTER_PA_INFORMASJON"]);
    expect(resultat).toHaveLength(1);
    expect(resultat[0].blokkert).toBe("VENTER_PA_INFORMASJON");
  });

  it("kombinerer status- og ventestatusfiltre", () => {
    const saker = [
      lagKontrollsak({ status: "OPPRETTET", blokkert: null }),
      lagKontrollsak({ status: "OPPRETTET", blokkert: "I_BERO" }),
      lagKontrollsak({ status: "AVSLUTTET", blokkert: null }),
    ];

    const resultat = filtrerMineSaker(saker, ["OPPRETTET"], ["INGEN"]);
    expect(resultat).toHaveLength(1);
    expect(resultat[0].status).toBe("OPPRETTET");
    expect(resultat[0].blokkert).toBeNull();
  });

  it("returnerer alle saker når ingen filtre er satt", () => {
    const saker = [
      lagKontrollsak({ status: "OPPRETTET" }),
      lagKontrollsak({ status: "AVSLUTTET" }),
    ];

    const resultat = filtrerMineSaker(saker, [], []);
    expect(resultat).toHaveLength(2);
  });
});
