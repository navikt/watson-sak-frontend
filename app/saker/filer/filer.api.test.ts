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
  sak.steg = "UTREDES";
  return { sak, ref: getSaksreferanse(sak.id) };
}

function settOppOpprettetSak() {
  const resultat = settOppAktivSak();
  resultat.sak.steg = "OPPRETTET";
  return resultat;
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
      opprettetAvNavn: "Test Saksbehandler",
    });
  });

  it("tillater filopplasting når saken har status Opprettet", async () => {
    const { ref } = settOppOpprettetSak();

    const respons = (await action({
      request: uploadRequest("bevis.pdf"),
      params: { sakId: ref },
    } as Route.ActionArgs)) as { filnavn: string };

    expect(respons.filnavn).toBe("bevis.pdf");
  });

  it("returnerer feilmelding for tom fil og legger ikke til filen", async () => {
    const { sak, ref } = settOppAktivSak();
    const antallFør = hentHistorikk(testRequest, sak.id).length;
    const formData = new FormData();
    formData.set("fil", new File([], "tom.pdf", { type: "application/pdf" }));

    const svar = await action({
      request: {
        method: "POST",
        headers: new Headers(),
        formData: async () => formData,
      } as unknown as Request,
      params: { sakId: ref },
    } as Route.ActionArgs);

    expect(svar).toMatchObject({
      data: { message: "Filen er tom og kan ikke lastes opp." },
      init: { status: 400 },
    });
    expect(hentHistorikk(testRequest, sak.id)).toHaveLength(antallFør);
  });

  it("laster opp flere filer i én forespørsel", async () => {
    const { sak, ref } = settOppAktivSak();
    const antallFør = hentHistorikk(testRequest, sak.id).length;
    const formData = new FormData();
    formData.append("fil", new File(["a"], "en.pdf", { type: "application/pdf" }));
    formData.append("fil", new File(["b"], "to.pdf", { type: "application/pdf" }));

    const respons = (await action({
      request: {
        method: "POST",
        headers: new Headers(),
        formData: async () => formData,
      } as unknown as Request,
      params: { sakId: ref },
    } as Route.ActionArgs)) as { filnavn: string };

    expect(respons.filnavn).toBe("to.pdf");
    const historikk = hentHistorikk(testRequest, sak.id);
    expect(historikk).toHaveLength(antallFør + 2);
    expect(
      historikk
        .slice(0, 2)
        .map((h) => h.beskrivelse)
        .sort(),
    ).toEqual(["en.pdf", "to.pdf"]);
  });

  it("laster ikke opp noen filer når én av flere er tom", async () => {
    const { sak, ref } = settOppAktivSak();
    const antallFør = hentHistorikk(testRequest, sak.id).length;
    const formData = new FormData();
    formData.append("fil", new File(["a"], "en.pdf", { type: "application/pdf" }));
    formData.append("fil", new File([], "tom.pdf", { type: "application/pdf" }));

    const svar = await action({
      request: {
        method: "POST",
        headers: new Headers(),
        formData: async () => formData,
      } as unknown as Request,
      params: { sakId: ref },
    } as Route.ActionArgs);

    expect(svar).toMatchObject({
      data: { message: "Filen tom.pdf er tom. Ingen filer ble lastet opp." },
      init: { status: 400 },
    });
    expect(hentHistorikk(testRequest, sak.id)).toHaveLength(antallFør);
  });
});
