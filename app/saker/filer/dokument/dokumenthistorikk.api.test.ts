import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSaksreferanse } from "~/saker/id";
import { hentFordelingssaker } from "~/testing/mock-store/alle-saker.server";
import {
  hentDokumentHistorikk,
  lagreDokument,
  opprettEllerOppdaterDokumentHistorikk,
  opprettDokument,
} from "~/testing/mock-store/dokumenter.server";
import { hentMockState, resetDefaultSession } from "~/testing/mock-store/session.server";
import type { Route } from "./+types/dokumenthistorikk.api";
import { action } from "./dokumenthistorikk.api";

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

describe("dokumenthistorikk.api", () => {
  beforeEach(() => {
    resetDefaultSession();
  });

  it("returnerer historikkpunkt som JSON", async () => {
    const state = hentMockState(testRequest);
    const sak = hentFordelingssaker(state)[0];
    sak.saksbehandlere.eier = {
      navIdent: "Z999999",
      navn: "Test Saksbehandler",
      enhet: "4812",
    };
    sak.status = "UTREDES";
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

    const respons = await action({
      request: new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handling: "hent_historikkpunkt", historikkId: historikkpunkt.id }),
      }),
      params: { sakId: getSaksreferanse(sak.id), docId },
    } as Route.ActionArgs);

    expect(respons.headers.get("Content-Type")).toContain("application/json");
    await expect(respons.json()).resolves.toMatchObject({
      historikkpunkt: { id: historikkpunkt.id, innhold },
    });
  });
});
