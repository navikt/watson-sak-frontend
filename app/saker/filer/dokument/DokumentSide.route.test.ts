import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSaksreferanse } from "~/saker/id";
import type { KontrollsakSaksbehandler, KontrollsakStatus } from "~/saker/types.backend";
import { hentFordelingssaker } from "~/testing/mock-store/alle-saker.server";
import { hentDokument, opprettDokument } from "~/testing/mock-store/dokumenter.server";
import { hentMockState, resetDefaultSession } from "~/testing/mock-store/session.server";
import type { Route } from "./+types/DokumentSide.route";
import { action, loader } from "./DokumentSide.server";

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

function settOppSak(opts: {
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

function putRequest(kropp: unknown) {
  return new Request("http://localhost", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(kropp),
  });
}

const enkeltInnhold = {
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text: "Hei" }] }],
};

describe("DokumentSide loader", () => {
  beforeEach(() => {
    resetDefaultSession();
  });

  it("gir eier på aktiv sak full redigeringstilgang", async () => {
    const { ref, docId } = settOppSak({ eier: eierMeg, deltMed: [], status: "UTREDES" });

    const resultat = await loader({
      request: testRequest,
      params: { sakId: ref, docId },
    } as Route.LoaderArgs);

    expect(resultat.dokument.id).toBe(docId);
    expect(resultat.kanRedigere).toBe(true);
  });

  it("gir delt-med skrivetilgang på aktiv sak", async () => {
    const { ref, docId } = settOppSak({
      eier: annenSaksbehandler,
      deltMed: [eierMeg],
      status: "UTREDES",
    });

    const resultat = await loader({
      request: testRequest,
      params: { sakId: ref, docId },
    } as Route.LoaderArgs);

    expect(resultat.kanRedigere).toBe(true);
  });

  it("gir kun lesetilgang når saken er avsluttet", async () => {
    const { ref, docId } = settOppSak({ eier: eierMeg, deltMed: [], status: "AVSLUTTET" });

    const resultat = await loader({
      request: testRequest,
      params: { sakId: ref, docId },
    } as Route.LoaderArgs);

    expect(resultat.dokument.id).toBe(docId);
    expect(resultat.kanRedigere).toBe(false);
  });

  it("avviser bruker uten tilgang med 403", async () => {
    const { ref, docId } = settOppSak({
      eier: annenSaksbehandler,
      deltMed: [],
      status: "UTREDES",
    });

    await expect(
      loader({ request: testRequest, params: { sakId: ref, docId } } as Route.LoaderArgs),
    ).rejects.toMatchObject({ init: { status: 403 } });
  });

  it("svarer 404 når dokumentet ikke finnes", async () => {
    const { ref } = settOppSak({ eier: eierMeg, deltMed: [], status: "UTREDES" });

    await expect(
      loader({
        request: testRequest,
        params: { sakId: ref, docId: "finnes-ikke" },
      } as Route.LoaderArgs),
    ).rejects.toMatchObject({ init: { status: 404 } });
  });
});

describe("DokumentSide action", () => {
  beforeEach(() => {
    resetDefaultSession();
  });

  it("lagrer tittel og innhold ved PUT", async () => {
    const { sak, ref, docId } = settOppSak({ eier: eierMeg, deltMed: [], status: "UTREDES" });

    const resultat = await action({
      request: putRequest({ tittel: "Oppdatert tittel", innhold: enkeltInnhold }),
      params: { sakId: ref, docId },
    } as Route.ActionArgs);

    expect(resultat).toMatchObject({ ok: true, tittel: "Oppdatert tittel" });

    const lagret = hentDokument(state(), String(sak.id), docId);
    expect(lagret?.tittel).toBe("Oppdatert tittel");
    expect(lagret?.innhold).toEqual(enkeltInnhold);
  });

  it("normaliserer tom tittel til 'Uten tittel'", async () => {
    const { sak, ref, docId } = settOppSak({ eier: eierMeg, deltMed: [], status: "UTREDES" });

    await action({
      request: putRequest({ tittel: "   ", innhold: enkeltInnhold }),
      params: { sakId: ref, docId },
    } as Route.ActionArgs);

    expect(hentDokument(state(), String(sak.id), docId)?.tittel).toBe("Uten tittel");
  });

  it("avviser redigering på avsluttet sak med 403", async () => {
    const { ref, docId } = settOppSak({ eier: eierMeg, deltMed: [], status: "AVSLUTTET" });

    await expect(
      action({
        request: putRequest({ tittel: "Forsøk", innhold: enkeltInnhold }),
        params: { sakId: ref, docId },
      } as Route.ActionArgs),
    ).rejects.toMatchObject({ init: { status: 403 } });
  });

  it("avviser ikke-PUT-metoder med 405", async () => {
    const { ref, docId } = settOppSak({ eier: eierMeg, deltMed: [], status: "UTREDES" });

    await expect(
      action({
        request: new Request("http://localhost", { method: "DELETE" }),
        params: { sakId: ref, docId },
      } as Route.ActionArgs),
    ).rejects.toMatchObject({ init: { status: 405 } });
  });
});
