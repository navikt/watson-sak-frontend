import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSaksreferanse } from "~/saker/id";
import type { KontrollsakSaksbehandler, KontrollsakStatus } from "~/saker/types.backend";
import { hentFordelingssaker } from "~/testing/mock-store/alle-saker.server";
import { hentDokument, opprettDokument } from "~/testing/mock-store/dokumenter.server";
import { hentMockState, resetDefaultSession } from "~/testing/mock-store/session.server";
import type { Route } from "./+types/dokumenter.api";
import { action } from "./dokumenter.api";

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
const annenSaksbehandler: KontrollsakSaksbehandler = {
  navIdent: "Z123456",
  navn: "Kari Nordmann",
  enhet: "4812",
};

function settOppSakMedDokument(opts: {
  eier: KontrollsakSaksbehandler | null;
  deltMed: KontrollsakSaksbehandler[];
  status: KontrollsakStatus;
}) {
  const sak = hentFordelingssaker(state())[0];
  sak.saksbehandlere.eier = opts.eier;
  sak.saksbehandlere.deltMed = opts.deltMed;
  sak.status = opts.status;

  const ref = getSaksreferanse(sak.id);
  const { id: docId } = opprettDokument(state(), String(sak.id), "Test Saksbehandler");
  return { sak, ref, docId };
}

function deleteRequest(docId: string) {
  const formData = new FormData();
  formData.set("docId", docId);
  return new Request("http://localhost", { method: "DELETE", body: formData });
}

describe("dokumenter.api DELETE", () => {
  beforeEach(() => {
    resetDefaultSession();
  });

  it("sletter dokumentet når eier har tilgang på aktiv sak", async () => {
    const { sak, ref, docId } = settOppSakMedDokument({
      eier: eierMeg,
      deltMed: [],
      status: "UTREDES",
    });

    const resultat = await action({
      request: deleteRequest(docId),
      params: { sakId: ref },
    } as Route.ActionArgs);

    expect(resultat).toEqual({ ok: true });
    expect(hentDokument(state(), String(sak.id), docId)).toBeUndefined();
  });

  it("avviser sletting uten tilgang med 403", async () => {
    const { ref, docId } = settOppSakMedDokument({
      eier: annenSaksbehandler,
      deltMed: [],
      status: "UTREDES",
    });

    await expect(
      action({ request: deleteRequest(docId), params: { sakId: ref } } as Route.ActionArgs),
    ).rejects.toMatchObject({ init: { status: 403 } });
  });

  it("avviser sletting på avsluttet sak med 403", async () => {
    const { ref, docId } = settOppSakMedDokument({
      eier: eierMeg,
      deltMed: [],
      status: "AVSLUTTET",
    });

    await expect(
      action({ request: deleteRequest(docId), params: { sakId: ref } } as Route.ActionArgs),
    ).rejects.toMatchObject({ init: { status: 403 } });
  });

  it("svarer 404 når dokumentet ikke finnes", async () => {
    const { ref } = settOppSakMedDokument({ eier: eierMeg, deltMed: [], status: "UTREDES" });

    await expect(
      action({ request: deleteRequest("finnes-ikke"), params: { sakId: ref } } as Route.ActionArgs),
    ).rejects.toMatchObject({ init: { status: 404 } });
  });
});
