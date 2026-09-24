import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LoaderFunctionArgs } from "react-router";
import { skalBrukeMockdataForMiljø, type Miljø } from "~/config/backend-config";
import type { MigreringKandidat } from "./types";

const mocks = vi.hoisted(() => ({
  mockmodus: true,
  bruker: vi.fn(),
  kandidater: vi.fn(),
}));
vi.mock("~/config/env.server", () => ({
  get skalBrukeMockdata() {
    return mocks.mockmodus;
  },
}));
vi.mock("~/auth/innlogget-bruker.server", () => ({ hentInnloggetBruker: mocks.bruker }));
vi.mock("./mock-data.server", () => ({ hentMockMigreringKandidater: mocks.kandidater }));

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
  mocks.bruker.mockResolvedValue({ navIdent: "L999999" });
  mocks.kandidater.mockReturnValue([
    basis,
    { ...basis, pid: "100246", ansvar: { type: "BEKREFTET", navIdent: "Z000001" } },
    { ...basis, pid: "100247", ansvar: { type: "LOGGTREFF", navIdent: "L999999" } },
    { ...basis, pid: "100248", ansvar: { type: "UKJENT" } },
  ]);
});

describe("Migreringsprototypens loader", () => {
  it.each<Miljø>(["dev", "prod", "local-dev", "local-backend"])(
    "avviser %s før mockdata hentes",
    async (miljø) => {
      mocks.mockmodus = skalBrukeMockdataForMiljø(miljø);
      await expect(loader(args())).rejects.toMatchObject({ status: 404 });
      expect(mocks.bruker).not.toHaveBeenCalled();
      expect(mocks.kandidater).not.toHaveBeenCalled();
    },
  );

  it.each<Miljø>(["local-mock", "demo"])("tillater prototypen i %s", async (miljø) => {
    mocks.mockmodus = skalBrukeMockdataForMiljø(miljø);
    expect((await loader(args())).mine).toHaveLength(1);
  });

  it("bruker ident fra innlogging, ikke queryparameter, og returnerer ikke andres bekreftede saker", async () => {
    const resultat = await loader(args());
    expect(mocks.kandidater).toHaveBeenCalledWith("L999999");
    expect(resultat.mine.map((k) => k.pid)).toEqual(["100245"]);
    expect(JSON.stringify(resultat)).not.toContain("100246");
  });

  it("søkeloggtreff er ikke eierskap, selv for innlogget bruker", async () => {
    const resultat = await loader(args());
    expect(resultat.utenBekreftetAnsvarlig.map((k) => k.pid)).toEqual(["100247", "100248"]);
    expect(resultat.mine.every((k) => k.ansvar.type === "BEKREFTET")).toBe(true);
  });

  it("bevarer autentiseringsfeil og henter ikke kandidater ved feil", async () => {
    mocks.bruker.mockRejectedValue(new Response(null, { status: 401 }));
    await expect(loader(args())).rejects.toMatchObject({ status: 401 });
    expect(mocks.kandidater).not.toHaveBeenCalled();
  });
});
