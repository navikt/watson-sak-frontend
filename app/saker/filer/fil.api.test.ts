import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSaksreferanse } from "~/saker/id";
import { hentHistorikk } from "~/saker/historikk/mock-data.server";
import type { KontrollsakSaksbehandler } from "~/saker/types.backend";
import { hentFordelingssaker } from "~/testing/mock-store/alle-saker.server";
import { hentMockState, resetDefaultSession } from "~/testing/mock-store/session.server";
import type { Route as FilerRoute } from "./+types/filer.api";
import type { Route } from "./+types/fil.api";
import { action } from "./fil.api";
import { action as filerAction } from "./filer.api";

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

async function lastOppFil(ref: string, filnavn: string): Promise<string> {
  const formData = new FormData();
  formData.set("fil", new File(["innhold"], filnavn, { type: "application/pdf" }));
  const request = {
    method: "POST",
    headers: new Headers(),
    formData: async () => formData,
  } as unknown as Request;
  const respons = (await filerAction({
    request,
    params: { sakId: ref },
  } as FilerRoute.ActionArgs)) as { id: string };
  return respons.id;
}

describe("fil.api PATCH", () => {
  beforeEach(() => {
    resetDefaultSession();
  });

  it("endrer navn, bevarer endelsen og legger til FIL_OMDØPT i historikken", async () => {
    const { sak, ref } = settOppAktivSak();
    const filId = await lastOppFil(ref, "gammelt.navn.pdf");
    const antallFør = hentHistorikk(testRequest, sak.id).length;

    const resultat = await action({
      request: new Request("http://localhost", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ navn: "nytt navn" }),
      }),
      params: { sakId: ref, filId },
    } as Route.ActionArgs);

    expect(resultat).toMatchObject({ ok: true, fil: { filnavn: "nytt navn.pdf" } });
    expect(hentHistorikk(testRequest, sak.id)).toHaveLength(antallFør + 1);
    expect(hentHistorikk(testRequest, sak.id)[0]).toMatchObject({
      hendelsesType: "FIL_OMDØPT",
    });
  });

  it("returnerer 400 for ugyldig navn", async () => {
    const { ref } = settOppAktivSak();
    const filId = await lastOppFil(ref, "bevis.pdf");

    const respons = await action({
      request: new Request("http://localhost", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ navn: "../bevis" }),
      }),
      params: { sakId: ref, filId },
    } as Route.ActionArgs);

    expect(respons).toMatchObject({ init: { status: 400 } });
  });

  it("returnerer en håndterbar 404 når filen er arkivert", async () => {
    const { sak, ref } = settOppAktivSak();
    const filId = await lastOppFil(ref, "bevis.pdf");
    const fil = state()
      .filer.get(String(sak.id))
      ?.find((kandidat) => kandidat.id === filId);
    if (!fil) throw new Error("Testfil mangler");
    fil.arkivert = new Date().toISOString();

    const respons = await action({
      request: new Request("http://localhost", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ navn: "nytt navn" }),
      }),
      params: { sakId: ref, filId },
    } as Route.ActionArgs);

    expect(respons).toMatchObject({
      data: { ok: false, melding: "Filen finnes ikke lenger eller er arkivert" },
      init: { status: 404 },
    });
  });
});

describe("fil.api DELETE", () => {
  beforeEach(() => {
    resetDefaultSession();
  });

  it("legger til en FIL_SLETTET-hendelse i sakshistorikken ved sletting", async () => {
    const { sak, ref } = settOppAktivSak();
    const filId = await lastOppFil(ref, "bevis.pdf");
    const antallFør = hentHistorikk(testRequest, sak.id).length;

    const resultat = await action({
      request: new Request("http://localhost", { method: "DELETE" }),
      params: { sakId: ref, filId },
    } as Route.ActionArgs);

    expect(resultat).toEqual({ ok: true });

    const historikk = hentHistorikk(testRequest, sak.id);
    expect(historikk).toHaveLength(antallFør + 1);
    expect(historikk[0]).toMatchObject({
      hendelsesType: "FIL_SLETTET",
      beskrivelse: "bevis.pdf",
    });
  });
});
