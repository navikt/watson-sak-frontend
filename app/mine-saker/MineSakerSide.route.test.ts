import { describe, expect, it, vi } from "vitest";
import { loader } from "./MineSakerSide.route";
import { filtrerMineSaker } from "./filtre";
import type { KontrollsakResponse } from "~/saker/types.backend";
import { hentInnloggetBruker } from "~/auth/innlogget-bruker.server";
import { hentAlleSaker, hentMineSaker } from "~/saker/mock-alle-saker.server";

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

vi.mock("~/saker/mock-alle-saker.server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("~/saker/mock-alle-saker.server")>();
  return {
    ...actual,
    hentAlleSaker: vi.fn(actual.hentAlleSaker),
    hentMineSaker: vi.fn(actual.hentMineSaker),
  };
});

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
    steg: "OPPRETTET",
    kategori: "ARBEID",
    kilde: "NAV_KONTROLL",
    misbruktype: [],
    prioritet: "NORMAL",
    status: null,
    ytelser: [],
    merking: [],
    arbeidsgivere: [],
    opprettet: "2026-02-03T10:11:12Z",
    oppdatert: null,
    oppgaver: [],
    kobledeSaker: [],
    dokumenter: [],
    adresseskjermet: false,
    gjeldendePersonIdent: null,
    historiskeIdenter: [],
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

  it("returnerer filteralternativer for steg og status", async () => {
    const resultat = await loader(loaderArgs);

    expect(resultat.filterAlternativer.steg).toContainEqual({
      verdi: "UTREDNING",
      etikett: "Utredning",
    });
    expect(resultat.filterAlternativer.steg).toHaveLength(6);
    expect(resultat.filterAlternativer.steg).toContainEqual({
      verdi: "AVSLUTTET",
      etikett: "Avsluttet",
    });
    expect(resultat.filterAlternativer.status.length).toBe(6);
    expect(resultat.filterAlternativer.status).toContainEqual({
      verdi: "INGEN",
      etikett: "Aktiv",
    });
  });

  it("filtrerer bort avsluttede saker når ingen URL-parametere er satt", async () => {
    const resultat = await loader(loaderArgs);

    expect(resultat.aktivtFilter.steg).not.toContain("AVSLUTTET");
    expect(resultat.aktivtFilter.steg.length).toBeGreaterThan(0);
    expect(resultat.saker.every((sak) => sak.steg !== "AVSLUTTET")).toBe(true);
    expect(resultat.aktivtFilter.status).toEqual([]);
  });

  it("bruker URL-parametere for filtrering når de er satt", async () => {
    const args = {
      request: new Request("http://localhost/mine-saker?steg=UTREDES"),
      params: {},
      context: {},
    } as Parameters<typeof loader>[0];

    const resultat = await loader(args);

    expect(resultat.aktivtFilter.steg).toEqual(["UTREDNING"]);
    expect(resultat.aktivtFilter.status).toEqual([]);
  });

  it("bruker avsluttet fra URL-en som stegfilter", async () => {
    const args = {
      request: new Request("http://localhost/mine-saker?steg=AVSLUTTET"),
      params: {},
      context: {},
    } as Parameters<typeof loader>[0];

    const resultat = await loader(args);

    expect(resultat.aktivtFilter.steg).toEqual(["AVSLUTTET"]);
  });

  it("viser delte mock-saker med mock-ident når innlogget Azure-ident er ulik", async () => {
    const azureIdent = "A123456";
    const egneSaker = [
      lagKontrollsak({ id: 101 }),
      lagKontrollsak({
        id: 102,
        saksbehandlere: {
          eier: { navIdent: azureIdent, navn: "Saks Behandlersen", enhet: "4812" },
          deltMed: [],
          opprettetAv: { navIdent: azureIdent, navn: "Saks Behandlersen", enhet: "4812" },
        },
      }),
    ];
    const delteSaker = [
      lagKontrollsak({
        id: 201,
        saksbehandlere: {
          eier: null,
          deltMed: [{ navIdent: "Z999999", navn: "Saks Behandlersen", enhet: "4812" }],
          opprettetAv: { navIdent: "Y111111", navn: "Annen Behandler", enhet: "4812" },
        },
      }),
      lagKontrollsak({
        id: 202,
        saksbehandlere: {
          eier: { navIdent: "Y111111", navn: "Annen Behandler", enhet: "4812" },
          deltMed: [{ navIdent: azureIdent, navn: "Saks Behandlersen", enhet: "4812" }],
          opprettetAv: { navIdent: "Y111111", navn: "Annen Behandler", enhet: "4812" },
        },
      }),
    ];
    vi.mocked(hentInnloggetBruker).mockResolvedValueOnce({
      preferredUsername: azureIdent,
      name: "Saks Behandlersen",
      navIdent: azureIdent,
      enhet: "4812",
      enhetId: null,
      erLeder: false,
    });
    vi.mocked(hentAlleSaker).mockReturnValueOnce([...egneSaker, ...delteSaker]);
    vi.mocked(hentMineSaker).mockReturnValueOnce(egneSaker);

    const resultat = await loader({
      ...loaderArgs,
      request: new Request("http://localhost/mine-saker?fane=delt"),
    });

    expect(resultat.deltMedSaker.map((sak) => sak.id)).toEqual([201, 202]);
    expect(resultat.antallDelteSaker).toBe(2);
  });

  it.each(["mine", "delt"] as const)(
    "paginérer %s-saker med 20 treff per side i sorteringsrekkefølge",
    async (fane) => {
      const mine = Array.from({ length: 25 }, (_, index) => lagKontrollsak({ id: 100 + index }));
      const delte = Array.from({ length: 23 }, (_, index) =>
        lagKontrollsak({
          id: 200 + index,
          saksbehandlere: {
            eier: { navIdent: "Y111111", navn: "Annen Behandler", enhet: "4812" },
            deltMed: [{ navIdent: "Z999999", navn: "Saks Behandlersen", enhet: "4812" }],
            opprettetAv: { navIdent: "Y111111", navn: "Annen Behandler", enhet: "4812" },
          },
        }),
      );
      const alle = [...mine, ...delte];
      const hentSide = async (side: number) => {
        vi.mocked(hentAlleSaker).mockReturnValueOnce(alle);
        vi.mocked(hentMineSaker).mockReturnValueOnce(mine);
        return loader({
          ...loaderArgs,
          request: new Request(
            `http://localhost/mine-saker?fane=${fane}&side=${side}&sorter=saksid&retning=asc`,
          ),
        });
      };

      const side1 = await hentSide(1);
      const side2 = await hentSide(2);
      const treff1 = fane === "mine" ? side1.saker : side1.deltMedSaker;
      const treff2 = fane === "mine" ? side2.saker : side2.deltMedSaker;
      const forventedeIder =
        fane === "mine" ? mine.map((sak) => sak.id) : delte.map((sak) => sak.id);

      expect(treff1).toHaveLength(20);
      expect(treff2).toHaveLength(fane === "mine" ? 5 : 3);
      expect([...treff1, ...treff2].map((sak) => sak.id)).toEqual(forventedeIder);
      expect(side1.sorteringskolonne).toBe("saksid");
      expect(side1.sorteringsretning).toBe("asc");
      expect(side1.totalAntall).toBe(fane === "mine" ? 25 : 23);
      expect(side1.totalSider).toBe(2);
      expect(side2.aktivSide).toBe(2);
    },
  );

  it.each([
    { fane: "mine", mineAntall: 12, delteAntall: 7 },
    { fane: "delt", mineAntall: 12, delteAntall: 7 },
  ] as const)(
    "returnerer filtrerte treffantall for aktiv og inaktiv fane når fane er %s",
    async ({ fane, mineAntall, delteAntall }) => {
      const mine = Array.from({ length: 25 }, (_, index) =>
        lagKontrollsak({ id: 300 + index, status: index < mineAntall ? null : "I_BERO" }),
      );
      const delte = Array.from({ length: 23 }, (_, index) =>
        lagKontrollsak({
          id: 400 + index,
          status: index < delteAntall ? null : "I_BERO",
          saksbehandlere: {
            eier: { navIdent: "Y111111", navn: "Annen Behandler", enhet: "4812" },
            deltMed: [{ navIdent: "Z999999", navn: "Saks Behandlersen", enhet: "4812" }],
            opprettetAv: { navIdent: "Y111111", navn: "Annen Behandler", enhet: "4812" },
          },
        }),
      );
      vi.mocked(hentAlleSaker).mockReturnValueOnce([...mine, ...delte]);
      vi.mocked(hentMineSaker).mockReturnValueOnce(mine);

      const resultat = await loader({
        ...loaderArgs,
        request: new Request(`http://localhost/mine-saker?fane=${fane}&status=INGEN`),
      });

      expect(resultat.antallMineSaker).toBe(mineAntall);
      expect(resultat.antallDelteSaker).toBe(delteAntall);
      expect(resultat.totalAntall).toBe(fane === "mine" ? mineAntall : delteAntall);
    },
  );
});

describe("filtrerMineSaker", () => {
  it("filtrerer på steg", () => {
    const saker = [lagKontrollsak({ steg: "OPPRETTET" }), lagKontrollsak({ steg: "AVSLUTTET" })];

    const resultat = filtrerMineSaker(saker, ["OPPRETTET"], []);
    expect(resultat).toHaveLength(1);
    expect(resultat[0].steg).toBe("OPPRETTET");
  });

  it("matcher gamle UTREDES-saker når filteret bruker UTREDNING", () => {
    const saker = [
      lagKontrollsak({ steg: "UTREDES" }),
      lagKontrollsak({ id: 10, steg: "UTREDNING" }),
      lagKontrollsak({ id: 11, steg: "OPPRETTET" }),
    ];

    expect(filtrerMineSaker(saker, ["UTREDNING"], []).map((sak) => sak.id)).toEqual([9, 10]);
  });

  it("filtrerer på ventestatus INGEN (ikke blokkert)", () => {
    const saker = [
      lagKontrollsak({ status: null }),
      lagKontrollsak({ status: "VENTER_PA_VEDTAK" }),
    ];

    const resultat = filtrerMineSaker(saker, [], ["INGEN"]);
    expect(resultat).toHaveLength(1);
    expect(resultat[0].status).toBeNull();
  });

  it("filtrerer på ventestatus med blokkeringsårsak", () => {
    const saker = [
      lagKontrollsak({ status: null }),
      lagKontrollsak({ status: "VENTER_PA_INFORMASJON" }),
      lagKontrollsak({ status: "I_BERO" }),
    ];

    const resultat = filtrerMineSaker(saker, [], ["VENTER_PA_INFORMASJON"]);
    expect(resultat).toHaveLength(1);
    expect(resultat[0].status).toBe("VENTER_PA_INFORMASJON");
  });

  it("kombinerer steg- og ventestatusfiltre", () => {
    const saker = [
      lagKontrollsak({ steg: "OPPRETTET", status: null }),
      lagKontrollsak({ steg: "OPPRETTET", status: "I_BERO" }),
      lagKontrollsak({ steg: "AVSLUTTET", status: null }),
    ];

    const resultat = filtrerMineSaker(saker, ["OPPRETTET"], ["INGEN"]);
    expect(resultat).toHaveLength(1);
    expect(resultat[0].steg).toBe("OPPRETTET");
    expect(resultat[0].status).toBeNull();
  });

  it("returnerer alle saker når ingen filtre er satt", () => {
    const saker = [lagKontrollsak({ steg: "OPPRETTET" }), lagKontrollsak({ steg: "AVSLUTTET" })];

    const resultat = filtrerMineSaker(saker, [], []);
    expect(resultat).toHaveLength(2);
  });
});
