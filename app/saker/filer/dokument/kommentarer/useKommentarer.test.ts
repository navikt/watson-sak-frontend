import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { lagKommentar, lagListe, lagTraad, TEKSTANKER } from "./kommentar-fixtures";
import { useKommentarer } from "./useKommentarer";

const URL = "/api/saker/ABC-1/dokumenter/d1/kommentarer";

/** Backendens råform for en tråd – det hooken faktisk får tilbake fra BFF-en. */
function råTraad(overstyringer: Record<string, unknown> = {}) {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    dokumentId: "d1",
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
    versjon: 1,
    synlig: true,
    kommentarer: [
      {
        id: "22222222-2222-4222-8222-222222222222",
        traadId: "11111111-1111-4111-8111-111111111111",
        erRot: true,
        tekst: "Original",
        forfatterIdent: "Z999999",
        forfatterNavn: "Test Saksbehandler",
        opprettet: "2026-03-01T09:00:00Z",
        endret: "2026-03-01T09:00:00Z",
        versjon: 1,
        erEgen: true,
      },
    ],
    ...overstyringer,
  };
}

function svar(kropp: unknown, status = 200) {
  return new Response(JSON.stringify(kropp), { status });
}

function stubFetch(...svarene: Response[]) {
  const mock = vi.fn(async (_url: string, _init?: RequestInit) => {
    const neste = svarene.shift();
    if (!neste) throw new Error("Uventet ekstra fetch-kall");
    return neste;
  });
  vi.stubGlobal("fetch", mock);
  return mock;
}

function kropp(mock: ReturnType<typeof stubFetch>, indeks = 0) {
  const init = mock.mock.calls[indeks][1];
  return JSON.parse(init?.body as string) as Record<string, unknown>;
}

const startListe = lagListe({
  traader: [lagTraad({ kommentarer: [lagKommentar({ tekst: "Original" })] })],
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useKommentarer", () => {
  it("sender eksakt body for ny tråd, med ankerType og anker delt opp", async () => {
    const mock = stubFetch(svar({ ok: true, traad: råTraad() }));
    const { result } = renderHook(() => useKommentarer({ url: URL, startListe }));

    await act(async () => {
      await result.current.opprettTraad({
        anker: TEKSTANKER,
        opprinneligSitat: "viktig poeng",
        tekst: "Ny kommentar",
      });
    });

    const sendt = kropp(mock);
    expect(sendt).toMatchObject({
      handling: "opprett_traad",
      ankerType: "TEXT",
      anker: {
        nodeId: "blokk-1",
        path: [1],
        startOffset: 18,
        sluttOffset: 30,
        exact: "viktig poeng",
      },
      opprinneligSitat: "viktig poeng",
      tekst: "Ny kommentar",
    });
    // `type` hører hjemme i ankerType, ikke i anker-mapen.
    expect(sendt.anker).not.toHaveProperty("type");
    const uuidMønster = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    expect(sendt.traadId).toMatch(uuidMønster);
    expect(sendt.kommentarId).toMatch(uuidMønster);
  });

  it("sender traadVersjon ved svar", async () => {
    const mock = stubFetch(svar({ ok: true, traad: råTraad({ versjon: 2 }) }));
    const { result } = renderHook(() => useKommentarer({ url: URL, startListe }));

    await act(async () => {
      await result.current.svar(lagTraad({ versjon: 7 }), "Enig");
    });

    expect(kropp(mock)).toMatchObject({
      handling: "opprett_kommentar",
      tekst: "Enig",
      traadVersjon: 7,
    });
  });

  it("sender kommentarens versjon ved redigering og sletting", async () => {
    const mock = stubFetch(
      svar({ ok: true, traad: råTraad() }),
      svar({ ok: true, traad: råTraad({ synlig: false, kommentarer: [] }) }),
    );
    const { result } = renderHook(() => useKommentarer({ url: URL, startListe }));

    await act(async () => {
      await result.current.rediger(lagKommentar({ versjon: 3 }), "Endret");
    });
    expect(kropp(mock, 0)).toMatchObject({
      handling: "rediger_kommentar",
      tekst: "Endret",
      versjon: 3,
    });

    await act(async () => {
      await result.current.slett(lagKommentar({ versjon: 4 }));
    });
    expect(kropp(mock, 1)).toMatchObject({ handling: "slett_kommentar", versjon: 4 });
  });

  it("sender trådens versjon ved adressering", async () => {
    const mock = stubFetch(
      svar({ ok: true, traad: råTraad({ resolved: "2026-03-02T09:00:00Z" }) }),
    );
    const { result } = renderHook(() => useKommentarer({ url: URL, startListe }));

    await act(async () => {
      await result.current.settAdressering(lagTraad({ versjon: 5 }), true);
    });

    expect(kropp(mock)).toMatchObject({
      handling: "sett_adressering",
      adressert: true,
      versjon: 5,
    });
    await waitFor(() => {
      expect(result.current.traader[0].adressert).toBe(true);
    });
  });

  it("fjerner tråden fra lista når svaret sier synlig: false", async () => {
    stubFetch(svar({ ok: true, traad: råTraad({ synlig: false, kommentarer: [] }) }));
    const { result } = renderHook(() => useKommentarer({ url: URL, startListe }));

    await act(async () => {
      await result.current.slett(lagKommentar());
    });

    expect(result.current.traader).toHaveLength(0);
  });

  it("henter lista på nytt ved 409, siden ProblemDetail ikke bærer fersk tråd", async () => {
    const mock = stubFetch(
      svar({ ok: false, feil: "konflikt", melding: "Endret av andre" }, 409),
      svar({
        dokumentId: "d1",
        arkivert: null,
        kanKommentere: true,
        traader: [råTraad({ versjon: 9, kommentarer: [], synlig: true })],
      }),
    );
    const { result } = renderHook(() => useKommentarer({ url: URL, startListe }));

    let resultat!: Awaited<ReturnType<typeof result.current.rediger>>;
    await act(async () => {
      resultat = await result.current.rediger(lagKommentar({ versjon: 1 }), "Min endring");
    });

    expect(resultat).toMatchObject({ ok: false, konflikt: true, melding: "Endret av andre" });
    // Andre kallet er en ren GET mot samme URL.
    expect(mock.mock.calls[1][0]).toBe(URL);
    expect(mock.mock.calls[1][1]?.method).toBeUndefined();
    await waitFor(() => {
      expect(result.current.traader[0].versjon).toBe(9);
    });
  });

  it("returnerer feilmeldingen fra serveren ved 400", async () => {
    stubFetch(new Response("Kommentaren kan ikke være tom.", { status: 400 }));
    const { result } = renderHook(() =>
      useKommentarer({ url: URL, startListe: lagListe({ traader: [] }) }),
    );

    let resultat!: Awaited<ReturnType<typeof result.current.opprettTraad>>;
    await act(async () => {
      resultat = await result.current.opprettTraad({ anker: { type: "DOCUMENT" }, tekst: "" });
    });

    expect(resultat).toMatchObject({ ok: false, konflikt: false });
    expect(resultat.ok === false && resultat.melding).toBe("Kommentaren kan ikke være tom.");
  });

  it("speiler backendens kanKommentere fra GET-wrapperen", () => {
    const { result } = renderHook(() =>
      useKommentarer({
        url: URL,
        startListe: lagListe({ kanKommentere: false, arkivert: "2026-04-01T10:00:00Z" }),
      }),
    );

    expect(result.current.kanKommentere).toBe(false);
  });

  it("håndterer nettverksfeil uten å kaste", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("Nettverket er nede");
      }),
    );
    const { result } = renderHook(() => useKommentarer({ url: URL, startListe }));

    let resultat!: Awaited<ReturnType<typeof result.current.settAdressering>>;
    await act(async () => {
      resultat = await result.current.settAdressering(lagTraad(), true);
    });

    expect(resultat).toMatchObject({ ok: false, konflikt: false });
    expect(result.current.traader[0].adressert).toBe(false);
  });
});
