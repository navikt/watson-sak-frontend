import { beforeEach, describe, expect, it, vi } from "vitest";
import { hentMockState, resetDefaultSession } from "~/testing/mock-store/session.server";
import { hentUlesteVarsler, markerVarselSomLest } from "~/testing/mock-store/varsler.server";
import { slaOppPerson } from "~/registrer-sak/person-oppslag.mock.server";
import { leggTilMockSakIFordeling } from "~/testing/mock-store/alle-saker.server";

vi.mock("~/config/env.server", () => ({
  skalBrukeMockdata: true,
}));

import { action } from "./reset-api";

const testRequest = new Request("http://localhost");
function state() {
  return hentMockState(testRequest);
}

function lagRequestMedCookie(setCookieHeader: string): Request {
  const match = setCookieHeader.match(/^([^;]+)/);
  return new Request("http://localhost", {
    headers: { Cookie: match![1] },
  });
}

describe("reset-api", () => {
  beforeEach(() => {
    resetDefaultSession();
  });

  it("tilbakestiller varsler som er markert som lest", () => {
    markerVarselSomLest(state(), "varsel-107");

    expect(hentUlesteVarsler(state()).map((varsel) => varsel.id)).not.toContain("varsel-107");

    const response = action({ request: testRequest });
    const setCookie = response.headers.get("Set-Cookie")!;
    const requestMedCookie = lagRequestMedCookie(setCookie);

    expect(hentUlesteVarsler(hentMockState(requestMedCookie)).map((v) => v.id)).toContain(
      "varsel-107",
    );
  });

  it("tilbakestiller mock personoppslag etter ny sak er lagt til", () => {
    const opprinneligAntall =
      slaOppPerson(testRequest, "12345678901")?.eksisterendeSaker.length ?? 0;
    leggTilMockSakIFordeling(state(), {
      personIdent: "12345678901",
      personNavn: "Ola Testesen",
      kategori: "ARBEID",
      kilde: "NAV_KONTROLL",
      misbruktype: [],
      prioritet: "NORMAL",
      ytelser: [],
    });

    const resultatFørReset = slaOppPerson(testRequest, "12345678901");
    expect(resultatFørReset?.eksisterendeSaker).toHaveLength(opprinneligAntall + 1);

    const response = action({ request: testRequest });
    const setCookie = response.headers.get("Set-Cookie")!;
    const requestMedCookie = lagRequestMedCookie(setCookie);

    const resultatEtterReset = slaOppPerson(requestMedCookie, "12345678901");
    expect(resultatEtterReset?.eksisterendeSaker).toHaveLength(opprinneligAntall);
  });
});
