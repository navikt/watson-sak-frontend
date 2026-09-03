import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSaksreferanse } from "~/saker/id";
import { hentHistorikk } from "~/saker/historikk/mock-data.server";
import type { KontrollsakSaksbehandler } from "~/saker/types.backend";
import { hentFordelingssaker } from "~/testing/mock-store/alle-saker.server";
import { hentMockState, resetDefaultSession } from "~/testing/mock-store/session.server";
import type { Route } from "./+types/filer.api";
import { action } from "./filer.api";

vi.mock("~/config/env.server", () => ({
  skalBrukeMockdata: true,
  env: { ENVIRONMENT: "local-mock" },
}));

vi.mock("~/auth/innlogget-bruker.server", () => ({
  hentInnloggetBruker: async () => ({
    navIdent: "Z999999",
    name: "Test Saksbehandler",
    preferredUsername: "test@nav.no",
    enhet: "4812",
  }),
}));

const testRequest = new Request("http://localhost");
function state() {
  return hentMockState(testRequest);
}

const eierMeg: KontrollsakSaksbehandler = {
  navIdent: "Z999999",
  navn: "Test Saksbehandler",
  enhet: "4812",
};

function settOppAktivSak() {
  const sak = hentFordelingssaker(state())[0];
  sak.saksbehandlere.eier = eierMeg;
  sak.saksbehandlere.deltMed = [];
  sak.status = "UTREDES";
  return { sak, ref: getSaksreferanse(sak.id) };
}

/**
 * Bygger en minimal request-lignende verdi med et ekte FormData/File-innhold.
 *
 * Vi kan ikke sende FormData som body til en ekte `Request` her: jsdom sitt
 * File-objekt krysser ikke uendret gjennom undici sin multipart-(de)koding,
 * så `request.formData()` feiler med en intern webidl-sjekk. Actionen bruker
 * kun `method` og `formData()`, så vi mocker akkurat det.
 */
function uploadRequest(filnavn: string): Request {
  const formData = new FormData();
  formData.set("fil", new File(["innhold"], filnavn, { type: "application/pdf" }));
  return {
    method: "POST",
    headers: new Headers(),
    formData: async () => formData,
  } as unknown as Request;
}

describe("filer.api POST", () => {
  beforeEach(() => {
    resetDefaultSession();
  });

  it("legger til en FIL_LASTET_OPP-hendelse i sakshistorikken ved opplasting", async () => {
    const { sak, ref } = settOppAktivSak();
    const antallFør = hentHistorikk(testRequest, sak.id).length;

    const respons = (await action({
      request: uploadRequest("bevis.pdf"),
      params: { sakId: ref },
    } as Route.ActionArgs)) as { filnavn: string };

    expect(respons.filnavn).toBe("bevis.pdf");

    const historikk = hentHistorikk(testRequest, sak.id);
    expect(historikk).toHaveLength(antallFør + 1);
    expect(historikk[0]).toMatchObject({
      hendelsesType: "FIL_LASTET_OPP",
      beskrivelse: "bevis.pdf",
    });
  });
});
