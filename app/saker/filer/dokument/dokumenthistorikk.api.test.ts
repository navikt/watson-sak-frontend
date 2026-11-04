import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSaksreferanse } from "~/saker/id";
import { hentFordelingssaker } from "~/testing/mock-store/alle-saker.server";
import {
  hentDokument,
  hentDokumentHistorikk,
  lagreDokument,
  opprettEllerOppdaterDokumentHistorikk,
  opprettDokument,
} from "~/testing/mock-store/dokumenter.server";
import { hentMockState, resetDefaultSession } from "~/testing/mock-store/session.server";
import type { Route } from "./+types/dokumenthistorikk.api";
import { action } from "./dokumenthistorikk.api";

const mocks = vi.hoisted(() => {
  class BackendFeilException extends Error {
    constructor(
      public readonly status: number,
      message: string,
    ) {
      super(message);
      this.name = "BackendFeilException";
    }
  }
  return {
    BackendFeilException,
    skalBrukeMockdata: true,
    hentDokumentHistorikkpunkt: vi.fn(),
  };
});

vi.mock("~/config/env.server", () => ({
  get skalBrukeMockdata() {
    return mocks.skalBrukeMockdata;
  },
  env: { ENVIRONMENT: "local-mock" },
}));

vi.mock("~/auth/access-token", () => ({ getBackendOboToken: vi.fn().mockResolvedValue("token") }));

vi.mock("~/saker/api.server", () => ({
  BackendFeilException: mocks.BackendFeilException,
  hentDokumentHistorikkpunkt: mocks.hentDokumentHistorikkpunkt,
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

describe("dokumenthistorikk.api", () => {
  beforeEach(() => {
    resetDefaultSession();
    mocks.skalBrukeMockdata = true;
    vi.clearAllMocks();
  });

  it("returnerer historikkpunkt som JSON", async () => {
    const state = hentMockState(testRequest);
    const sak = hentFordelingssaker(state)[0];
    sak.saksbehandlere.eier = {
      navIdent: "Z999999",
      navn: "Test Saksbehandler",
      enhet: "4812",
    };
    sak.steg = "UTREDES";
    const { id: docId } = opprettDokument(state, String(sak.id), "Test Saksbehandler");
    const innhold = [{ type: "p", children: [{ text: "Historisk innhold" }] }];
    const dokument = lagreDokument(state, String(sak.id), docId, {
      tittel: "Historisk tittel",
      innhold,
      endretAv: "Test Saksbehandler",
    });
    if (!dokument) throw new Error("Kunne ikke opprette testdokument");

    opprettEllerOppdaterDokumentHistorikk(
      state,
      String(sak.id),
      docId,
      dokument,
      "Test Saksbehandler",
    );
    const historikkpunkt = hentDokumentHistorikk(state, String(sak.id), docId)[0];

    const respons = (await action({
      request: new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handling: "hent_historikkpunkt", historikkId: historikkpunkt.id }),
      }),
      params: { sakId: getSaksreferanse(sak.id), docId },
    } as Route.ActionArgs)) as Response;

    expect(respons.headers.get("Content-Type")).toContain("application/json");
    await expect(respons.json()).resolves.toMatchObject({
      historikkpunkt: { id: historikkpunkt.id, innhold },
    });
  });

  it("avviser gjenoppretting når saken har status Opprettet", async () => {
    const state = hentMockState(testRequest);
    const sak = hentFordelingssaker(state)[0];
    sak.saksbehandlere.eier = {
      navIdent: "Z999999",
      navn: "Test Saksbehandler",
      enhet: "4812",
    };
    sak.steg = "OPPRETTET";
    const { id: docId } = opprettDokument(state, String(sak.id), "Test Saksbehandler");
    const dokument = hentDokument(state, String(sak.id), docId);
    if (!dokument) throw new Error("Kunne ikke opprette testdokument");
    opprettEllerOppdaterDokumentHistorikk(
      state,
      String(sak.id),
      docId,
      dokument,
      "Test Saksbehandler",
    );
    const historikkpunkt = hentDokumentHistorikk(state, String(sak.id), docId)[0];

    await expect(
      action({
        request: new Request("http://localhost", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            handling: "gjenopprett_historikkpunkt",
            historikkId: historikkpunkt.id,
          }),
        }),
        params: { sakId: getSaksreferanse(sak.id), docId },
      } as Route.ActionArgs),
    ).rejects.toMatchObject({ init: { status: 403 } });
  });

  it("returnerer teknisk feilsvar ved teknisk backendfeil", async () => {
    mocks.skalBrukeMockdata = false;
    mocks.hentDokumentHistorikkpunkt.mockRejectedValue(
      new mocks.BackendFeilException(500, "Intern feil"),
    );

    const svar = (await action({
      request: new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handling: "hent_historikkpunkt", historikkId: "historikk-1" }),
      }),
      params: {
        sakId: getSaksreferanse(1),
        docId: "00000000-0000-4000-8000-000000000000",
      },
    } as Route.ActionArgs)) as {
      data: { ok: boolean; teknisk: boolean; feilId: string };
      init: { status: number };
    };

    expect(svar.init.status).toBe(500);
    expect(svar.data).toMatchObject({ ok: false, teknisk: true });
    expect(svar.data.feilId).toMatch(/^[0-9a-f]{8}$/);
  });
});
