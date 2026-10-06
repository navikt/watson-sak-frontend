import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LoaderFunctionArgs } from "react-router";
import { skalBrukeMockdataForMiljø, type Miljø } from "~/config/backend-config";
import type { MigreringKandidat } from "./types";

const mocks = vi.hoisted(() => ({
  mockmodus: true,
  miljø: "local-mock" as Miljø,
  bruker: vi.fn(),
  kandidater: vi.fn(),
  backend: vi.fn(),
}));
vi.mock("~/config/env.server", () => ({
  get skalBrukeMockdata() {
    return mocks.mockmodus;
  },
  get env() {
    return { ENVIRONMENT: mocks.miljø };
  },
}));
vi.mock("~/auth/innlogget-bruker.server", () => ({ hentInnloggetBruker: mocks.bruker }));
vi.mock("./mock-data.server", () => ({ hentMockMigreringKandidater: mocks.kandidater }));
vi.mock("./api.server", () => ({ hentMigreringsliste: mocks.backend }));

import { loader } from "./MigreringSide.server";

const basis: MigreringKandidat = {
  kandidatId: "UTREDNING:100245",
  kilde: "UTREDNING",
  legacyKilde: "UTREDNING",
  pid: "100245",
  legacyPid: "100245",
  kategori: "TIPS_RESTANSE",
  navn: "Eksempel",
  ansvar: { type: "BEKREFTET", navIdent: "L999999" },
  enhet: "4812",
  vurdering: "MULIG_KANDIDAT",
  ekskluderFraStatistikk: false,
  referansedato: "2023-01-01",
  referansedatoFelt: "TIPSINNDATO",
  fase: "Utredning",
  begrunnelse: "Eksempel",
  kildefelter: [],
};
function args() {
  return {
    request: new Request("http://localhost/migrering?navIdent=Z000001"),
    params: {},
    context: {},
  } as LoaderFunctionArgs;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.mockmodus = true;
  mocks.miljø = "local-mock";
  mocks.bruker.mockResolvedValue({ navIdent: "L999999" });
  mocks.kandidater.mockReturnValue([
    basis,
    { ...basis, pid: "100246", ansvar: { type: "BEKREFTET", navIdent: "Z000001" } },
    { ...basis, pid: "100247", ansvar: { type: "LOGGTREFF", navIdent: "L999999" } },
    { ...basis, pid: "100248", ansvar: { type: "UKJENT" } },
  ]);
});

const side = (
  kandidater: MigreringKandidat[],
  sideNr = 1,
  totalSider = 1,
  totalAntall = kandidater.length,
) => ({
  kandidater,
  utilgjengelig: false,
  side: sideNr,
  totalSider,
  totalAntall,
});
const tomSide = { kandidater: [], side: 1, totalSider: 0, totalAntall: 0 };

describe("Migreringsprototypens loader", () => {
  it.each<Miljø>(["prod", "local-dev"])("avviser %s før data hentes", async (miljø) => {
    mocks.miljø = miljø;
    mocks.mockmodus = skalBrukeMockdataForMiljø(miljø);
    await expect(loader(args())).rejects.toMatchObject({ status: 404 });
    expect(mocks.bruker).not.toHaveBeenCalled();
    expect(mocks.kandidater).not.toHaveBeenCalled();
    expect(mocks.backend).not.toHaveBeenCalled();
  });

  it.each<Miljø>(["local-backend", "dev"])("bruker beskyttet backend-API i %s", async (miljø) => {
    mocks.miljø = miljø;
    mocks.mockmodus = false;
    mocks.backend.mockResolvedValue(side([basis]));
    mocks.bruker.mockResolvedValue({ navIdent: "L999999", erLeder: false });
    const argumenter = args();

    const resultat = await loader(argumenter);

    expect(mocks.backend).toHaveBeenCalledTimes(1);
    expect(mocks.backend).toHaveBeenCalledWith(argumenter.request, "MINE", 1);
    expect(mocks.kandidater).not.toHaveBeenCalled();
    expect(resultat.mine.kandidater.map((k) => k.kandidatId)).toEqual(["UTREDNING:100245"]);
    expect(resultat.ansatte).toEqual(tomSide);
    expect(resultat.utilgjengelig).toBe(false);
  });

  it("henter ansattlisten bare for ledere", async () => {
    mocks.miljø = "local-backend";
    mocks.mockmodus = false;
    mocks.bruker.mockResolvedValue({ navIdent: "L999999", erLeder: true });
    mocks.backend.mockImplementation(async (_request: Request, visning: string) =>
      visning === "ANSATTE" ? side([{ ...basis, personIdent: null }]) : side([]),
    );

    const resultat = await loader(args());

    expect(mocks.backend).toHaveBeenCalledWith(expect.anything(), "ANSATTE", 1);
    expect(resultat.ansatte.kandidater).toHaveLength(1);
  });

  it("starter begge listekallene for ledere før noen av dem er ferdig", async () => {
    mocks.miljø = "local-backend";
    mocks.mockmodus = false;
    mocks.bruker.mockResolvedValue({ navIdent: "L999999", erLeder: true });
    let slippMine: () => void = () => {};
    mocks.backend.mockImplementation((_request: Request, visning: string) =>
      visning === "MINE"
        ? new Promise((løs) => {
            slippMine = () => løs(side([]));
          })
        : Promise.resolve(side([])),
    );

    const lastet = loader(args());
    await Promise.resolve();
    await Promise.resolve();

    // ANSATTE er startet mens MINE fortsatt venter, så kallene kjører parallelt.
    expect(mocks.backend).toHaveBeenCalledWith(expect.anything(), "ANSATTE", 1);
    slippMine();
    await lastet;
  });

  it("henter siden fra URL-en, hver liste med sin egen parameter", async () => {
    mocks.miljø = "local-backend";
    mocks.mockmodus = false;
    mocks.bruker.mockResolvedValue({ navIdent: "L999999", erLeder: true });
    mocks.backend.mockImplementation(async (_r: Request, _v: string, sideNr: number) =>
      side([basis], sideNr, 5, 100),
    );

    await loader({
      request: new Request("http://localhost/migrering?side=3&ansatteSide=2"),
      params: {},
      context: {},
    } as LoaderFunctionArgs);

    expect(mocks.backend).toHaveBeenCalledWith(expect.anything(), "MINE", 3);
    expect(mocks.backend).toHaveBeenCalledWith(expect.anything(), "ANSATTE", 2);
  });

  it.each(["0", "-4", "abc", "", "3abc", "99999999999999999999"])(
    "ugyldig sideparameter «%s» gir side 1",
    async (verdi) => {
      mocks.miljø = "local-backend";
      mocks.mockmodus = false;
      mocks.bruker.mockResolvedValue({ navIdent: "L999999", erLeder: false });
      mocks.backend.mockResolvedValue(side([basis]));

      await loader({
        request: new Request(`http://localhost/migrering?side=${verdi}`),
        params: {},
        context: {},
      } as LoaderFunctionArgs);

      expect(mocks.backend).toHaveBeenCalledWith(expect.anything(), "MINE", 1);
    },
  );

  it("viser siste side når siden i URL-en er forbi siste side", async () => {
    mocks.miljø = "local-backend";
    mocks.mockmodus = false;
    mocks.bruker.mockResolvedValue({ navIdent: "L999999", erLeder: false });
    mocks.backend.mockImplementation(async (_r: Request, _v: string, sideNr: number) =>
      sideNr > 2 ? side([], sideNr, 2, 30) : side([basis], sideNr, 2, 30),
    );

    const resultat = await loader({
      request: new Request("http://localhost/migrering?side=9"),
      params: {},
      context: {},
    } as LoaderFunctionArgs);

    expect(mocks.backend).toHaveBeenCalledWith(expect.anything(), "MINE", 9);
    expect(mocks.backend).toHaveBeenCalledWith(expect.anything(), "MINE", 2);
    expect(resultat.mine.side).toBe(2);
  });

  it("gir tom liste og utilgjengelig når backend feiler, men bevarer utløpt sesjon", async () => {
    mocks.miljø = "local-backend";
    mocks.mockmodus = false;
    mocks.bruker.mockResolvedValue({ navIdent: "L999999", erLeder: false });
    mocks.backend.mockRejectedValueOnce(new Response(null, { status: 502 }));

    const resultat = await loader(args());
    expect(resultat).toEqual({ mine: tomSide, ansatte: tomSide, utilgjengelig: true });

    mocks.backend.mockRejectedValueOnce(new Response(null, { status: 401 }));
    await expect(loader(args())).rejects.toMatchObject({ status: 401 });
  });

  it.each<Miljø>(["local-mock", "demo"])("tillater prototypen i %s", async (miljø) => {
    mocks.miljø = miljø;
    mocks.mockmodus = skalBrukeMockdataForMiljø(miljø);
    expect((await loader(args())).mine.kandidater).toHaveLength(1);
  });

  it("bruker ident fra innlogging, ikke queryparameter, og returnerer ikke andres bekreftede saker", async () => {
    const resultat = await loader(args());
    expect(mocks.kandidater).toHaveBeenCalledWith("L999999");
    expect(resultat.mine.kandidater.map((k) => k.pid)).toEqual(["100245"]);
    expect(JSON.stringify(resultat)).not.toContain("100246");
  });

  it("søkeloggtreff er ikke eierskap, selv for innlogget bruker", async () => {
    const resultat = await loader(args());
    expect(resultat.mine.kandidater.map((k) => k.pid)).toEqual(["100245"]);
    expect(resultat.mine.kandidater.every((k) => k.ansvar.type === "BEKREFTET")).toBe(true);
    expect(resultat.ansatte).toEqual(tomSide);
  });

  it("deler mock-data i sider og viser siste side når siden er for høy", async () => {
    const mange = Array.from({ length: 45 }, (_, i) => ({
      ...basis,
      pid: String(100000 + i),
      kandidatId: `UTREDNING:${100000 + i}`,
      legacyPid: String(100000 + i),
    }));
    mocks.kandidater.mockReturnValue(mange);

    const forste = await loader(args());
    expect(forste.mine.kandidater).toHaveLength(20);
    expect(forste.mine.totalSider).toBe(3);
    expect(forste.mine.totalAntall).toBe(45);

    const forHoy = await loader({
      request: new Request("http://localhost/migrering?side=99"),
      params: {},
      context: {},
    } as LoaderFunctionArgs);
    expect(forHoy.mine.side).toBe(3);
    expect(forHoy.mine.kandidater).toHaveLength(5);
  });

  it("bevarer autentiseringsfeil og henter ikke kandidater ved feil", async () => {
    mocks.bruker.mockRejectedValue(new Response(null, { status: 401 }));
    await expect(loader(args())).rejects.toMatchObject({ status: 401 });
    expect(mocks.kandidater).not.toHaveBeenCalled();
  });
});
