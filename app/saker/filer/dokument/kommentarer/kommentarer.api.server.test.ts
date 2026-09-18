import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  adresserKommentartraad,
  gjenaapneKommentartraad,
  hentKommentarliste,
  KommentarBackendFeil,
  KommentarKonfliktFeil,
  opprettKommentar,
  opprettKommentartraad,
  redigerKommentar,
  slettKommentar,
} from "./kommentarer.api.server";
import type { Anker } from "./typer";

vi.mock("~/config/env.server", () => ({
  BACKEND_API_URL: "http://backend",
  skalBrukeMockdata: false,
  env: { ENVIRONMENT: "dev" },
}));

const TOKEN = "test-token";
const SAK = "102";
const DOC = "6d1f2f70-0000-4000-8000-000000000001";
const TRAAD = "11111111-1111-4111-8111-111111111111";
const KOMMENTAR = "22222222-2222-4222-8222-222222222222";
const BASIS = `http://backend/api/v1/kontrollsaker/${SAK}/dokumenter/${DOC}`;

/** Eksakt kopi av `KommentarResponse` slik backend serialiserer den. */
const kommentarFixture = {
  id: KOMMENTAR,
  traadId: TRAAD,
  erRot: true,
  tekst: "Bør vi presisere dette?",
  forfatterIdent: "Z999999",
  forfatterNavn: "Test Saksbehandler",
  opprettet: "2026-03-01T09:00:00Z",
  endret: "2026-03-01T09:00:00Z",
  versjon: 1,
  erEgen: true,
};

/** Eksakt kopi av `KommentarTraadResponse`. */
const traadFixture = {
  id: TRAAD,
  dokumentId: DOC,
  ankerType: "TEXT",
  anker: {
    nodeId: "blokk-1",
    path: [1],
    startOffset: 18,
    sluttOffset: 30,
    exact: "viktig poeng",
    prefix: "Brødtekst med et ",
    suffix: ".",
  },
  ankerVersjon: 1,
  opprinneligSitat: "viktig poeng",
  opprettetAvIdent: "Z999999",
  opprettetAvNavn: "Test Saksbehandler",
  opprettet: "2026-03-01T09:00:00Z",
  resolved: null,
  resolvedAvIdent: null,
  resolvedAvNavn: null,
  versjon: 3,
  synlig: true,
  kommentarer: [kommentarFixture],
};

/** Eksakt kopi av `KommentarTraadListeResponse`. */
const listeFixture = {
  dokumentId: DOC,
  arkivert: null,
  kanKommentere: true,
  traader: [traadFixture],
};

function svar(kropp: unknown, status = 200) {
  return new Response(JSON.stringify(kropp), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function problemDetail(status: number, detail: string) {
  return new Response(JSON.stringify({ status, detail, title: "Feil" }), {
    status,
    headers: { "Content-Type": "application/problem+json" },
  });
}

function fetchMock(respons: Response) {
  const mock = vi.fn(async (_url: string, _init?: RequestInit) => respons);
  vi.stubGlobal("fetch", mock);
  return mock;
}

function kallet(mock: ReturnType<typeof fetchMock>) {
  const [url, init] = mock.mock.calls[0];
  return {
    url,
    metode: init?.method ?? "GET",
    kropp: init?.body ? (JSON.parse(init.body as string) as Record<string, unknown>) : undefined,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("hentKommentarliste", () => {
  it("kaller GET /kommentartraader og transformerer svaret", async () => {
    const mock = fetchMock(svar(listeFixture));

    const liste = await hentKommentarliste(TOKEN, SAK, DOC);

    expect(kallet(mock)).toMatchObject({
      url: `${BASIS}/kommentartraader`,
      metode: "GET",
    });
    expect(liste.kanKommentere).toBe(true);
    expect(liste.arkivert).toBeNull();
    // ankerType + anker settes sammen til den interne unionen.
    expect(liste.traader[0].ankertype).toBe("TEXT");
    expect(liste.traader[0].anker).toMatchObject({ type: "TEXT", exact: "viktig poeng" });
    expect(liste.traader[0].adressert).toBe(false);
    expect(liste.traader[0].kommentarer[0].tekst).toBe("Bør vi presisere dette?");
    expect(liste.traader[0].kommentarer[0].erEgen).toBe(true);
  });

  it("utleder adressert fra resolved-tidspunktet", async () => {
    fetchMock(
      svar({
        ...listeFixture,
        arkivert: "2026-04-01T10:00:00Z",
        kanKommentere: false,
        traader: [
          {
            ...traadFixture,
            resolved: "2026-03-02T09:00:00Z",
            resolvedAvIdent: "Z111111",
            resolvedAvNavn: "Kari Hansen",
          },
        ],
      }),
    );

    const liste = await hentKommentarliste(TOKEN, SAK, DOC);

    expect(liste.kanKommentere).toBe(false);
    expect(liste.arkivert).toBe("2026-04-01T10:00:00Z");
    expect(liste.traader[0].adressert).toBe(true);
    expect(liste.traader[0].resolvedAvNavn).toBe("Kari Hansen");
  });

  it("kaster tydelig feil når svaret ikke følger kontrakten", async () => {
    fetchMock(svar({ traader: [] }));

    await expect(hentKommentarliste(TOKEN, SAK, DOC)).rejects.toThrow(
      /Ugyldig svar fra watson-admin-api/,
    );
  });
});

describe("opprettKommentartraad", () => {
  it("sender eksakt request-body med ankerType, anker og ankerVersjon", async () => {
    const mock = fetchMock(svar(traadFixture, 201));
    const anker: Anker = {
      type: "TEXT",
      nodeId: "blokk-1",
      path: [1],
      startOffset: 18,
      sluttOffset: 30,
      exact: "viktig poeng",
      prefix: "Brødtekst med et ",
      suffix: ".",
    };

    await opprettKommentartraad(TOKEN, SAK, DOC, {
      traadId: TRAAD,
      kommentarId: KOMMENTAR,
      anker,
      opprinneligSitat: "viktig poeng",
      tekst: "Bør vi presisere dette?",
    });

    const kall = kallet(mock);
    expect(kall.url).toBe(`${BASIS}/kommentartraader`);
    expect(kall.metode).toBe("POST");
    expect(kall.kropp).toEqual({
      traadId: TRAAD,
      kommentarId: KOMMENTAR,
      ankerType: "TEXT",
      // `type` ligger i ankerType, ikke i den ugjennomsiktige anker-mapen.
      anker: {
        nodeId: "blokk-1",
        path: [1],
        startOffset: 18,
        sluttOffset: 30,
        exact: "viktig poeng",
        prefix: "Brødtekst med et ",
        suffix: ".",
      },
      ankerVersjon: 1,
      opprinneligSitat: "viktig poeng",
      tekst: "Bør vi presisere dette?",
    });
  });

  it("sender tomt anker-objekt for dokumentkommentarer", async () => {
    const mock = fetchMock(svar(traadFixture, 201));

    await opprettKommentartraad(TOKEN, SAK, DOC, {
      traadId: TRAAD,
      kommentarId: KOMMENTAR,
      anker: { type: "DOCUMENT" },
      tekst: "Generell merknad",
    });

    expect(kallet(mock).kropp).toEqual({
      traadId: TRAAD,
      kommentarId: KOMMENTAR,
      ankerType: "DOCUMENT",
      anker: {},
      ankerVersjon: 1,
      opprinneligSitat: null,
      tekst: "Generell merknad",
    });
  });
});

describe("opprettKommentar", () => {
  it("sender kommentarId, tekst og traadVersjon til riktig URL", async () => {
    const mock = fetchMock(svar(traadFixture, 201));

    await opprettKommentar(TOKEN, SAK, DOC, TRAAD, {
      kommentarId: KOMMENTAR,
      tekst: "Enig",
      traadVersjon: 3,
    });

    expect(kallet(mock)).toEqual({
      url: `${BASIS}/kommentartraader/${TRAAD}/kommentarer`,
      metode: "POST",
      kropp: { kommentarId: KOMMENTAR, tekst: "Enig", traadVersjon: 3 },
    });
  });
});

describe("redigerKommentar", () => {
  it("sender tekst og versjon som PUT", async () => {
    const mock = fetchMock(svar(traadFixture));

    await redigerKommentar(TOKEN, SAK, DOC, KOMMENTAR, { tekst: "Endret", versjon: 1 });

    expect(kallet(mock)).toEqual({
      url: `${BASIS}/kommentarer/${KOMMENTAR}`,
      metode: "PUT",
      kropp: { tekst: "Endret", versjon: 1 },
    });
  });
});

describe("slettKommentar", () => {
  it("sender versjon som query-parameter og leser tilbake tråden", async () => {
    const mock = fetchMock(svar({ ...traadFixture, synlig: false, kommentarer: [] }));

    const traad = await slettKommentar(TOKEN, SAK, DOC, KOMMENTAR, 2);

    expect(kallet(mock)).toEqual({
      url: `${BASIS}/kommentarer/${KOMMENTAR}?versjon=2`,
      metode: "DELETE",
      kropp: undefined,
    });
    expect(traad.synlig).toBe(false);
  });
});

describe("adressering", () => {
  it("PUT-er versjon i body når tråden adresseres", async () => {
    const mock = fetchMock(svar({ ...traadFixture, resolved: "2026-03-02T09:00:00Z" }));

    const traad = await adresserKommentartraad(TOKEN, SAK, DOC, TRAAD, 3);

    expect(kallet(mock)).toEqual({
      url: `${BASIS}/kommentartraader/${TRAAD}/adressering`,
      metode: "PUT",
      kropp: { versjon: 3 },
    });
    expect(traad.adressert).toBe(true);
  });

  it("DELETE-er med versjon som query når tråden gjenåpnes", async () => {
    const mock = fetchMock(svar(traadFixture));

    const traad = await gjenaapneKommentartraad(TOKEN, SAK, DOC, TRAAD, 4);

    expect(kallet(mock)).toEqual({
      url: `${BASIS}/kommentartraader/${TRAAD}/adressering?versjon=4`,
      metode: "DELETE",
      kropp: undefined,
    });
    expect(traad.adressert).toBe(false);
  });
});

describe("feilhåndtering", () => {
  it("oversetter 409 til KommentarKonfliktFeil med detail fra ProblemDetail", async () => {
    fetchMock(
      problemDetail(409, "Ressursen er endret av en annen bruker. Last inn på nytt og prøv igjen."),
    );

    await expect(
      redigerKommentar(TOKEN, SAK, DOC, KOMMENTAR, { tekst: "Endret", versjon: 1 }),
    ).rejects.toMatchObject({
      name: "KommentarKonfliktFeil",
      status: 409,
      message: "Ressursen er endret av en annen bruker. Last inn på nytt og prøv igjen.",
    });
  });

  it("gir 409 også når dokumentet er arkivert", async () => {
    fetchMock(problemDetail(409, "Dokumentet er arkivert og kan ikke endres"));

    await expect(
      opprettKommentar(TOKEN, SAK, DOC, TRAAD, {
        kommentarId: KOMMENTAR,
        tekst: "Hei",
        traadVersjon: 1,
      }),
    ).rejects.toBeInstanceOf(KommentarKonfliktFeil);
  });

  it("oversetter 403 til KommentarBackendFeil", async () => {
    fetchMock(problemDetail(403, "Bare forfatteren kan endre eller slette kommentaren"));

    await expect(slettKommentar(TOKEN, SAK, DOC, KOMMENTAR, 1)).rejects.toMatchObject({
      name: "KommentarBackendFeil",
      status: 403,
    });
  });

  it("oversetter 404 til KommentarBackendFeil", async () => {
    fetchMock(problemDetail(404, "Tråden finnes ikke"));

    await expect(hentKommentarliste(TOKEN, SAK, DOC)).rejects.toBeInstanceOf(KommentarBackendFeil);
  });
});
