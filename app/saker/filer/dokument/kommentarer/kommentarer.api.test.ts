import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSaksreferanse } from "~/saker/id";
import type { KontrollsakSaksbehandler, KontrollsakStatus } from "~/saker/types.backend";
import { hentFordelingssaker } from "~/testing/mock-store/alle-saker.server";
import { arkiverDokument, opprettDokument } from "~/testing/mock-store/dokumenter.server";
import { hentKommentarliste } from "~/testing/mock-store/kommentarer.server";
import { hentMockState, resetDefaultSession } from "~/testing/mock-store/session.server";
import { action, loader } from "./kommentarer.api";
import { kommentarlisteKlientSchema, type Kommentarliste, type Kommentartraad } from "./typer";

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

function settOppSak(
  opts: { eier?: KontrollsakSaksbehandler | null; status?: KontrollsakStatus } = {},
) {
  const sak = hentFordelingssaker(state())[0];
  sak.saksbehandlere.eier = opts.eier === undefined ? eierMeg : opts.eier;
  sak.saksbehandlere.deltMed = [];
  sak.status = opts.status ?? "UTREDES";

  const { id: docId } = opprettDokument(state(), String(sak.id), "Test Saksbehandler");
  return { sak, ref: getSaksreferanse(sak.id), docId, sakId: String(sak.id) };
}

function postRequest(kropp: unknown) {
  return new Request("http://localhost", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(kropp),
  });
}

async function kjørAction(ref: string, docId: string, kropp: unknown): Promise<Response> {
  return (await action({
    request: postRequest(kropp),
    params: { sakId: ref, docId },
  } as never)) as Response;
}

const DOKUMENTANKER_BODY = { handling: "opprett_traad", ankerType: "DOCUMENT", anker: {} } as const;

async function opprettTraad(ref: string, docId: string, tekst = "Første kommentar") {
  const traadId = crypto.randomUUID();
  const respons = await kjørAction(ref, docId, {
    ...DOKUMENTANKER_BODY,
    traadId,
    kommentarId: crypto.randomUUID(),
    tekst,
  });
  const kropp = (await respons.json()) as { traad: Kommentartraad };
  return { traadId, traad: kropp.traad };
}

function mockliste(sakId: string, docId: string): Kommentarliste {
  return hentKommentarliste(state(), sakId, docId, {
    innloggetIdent: "Z999999",
    arkivert: null,
  });
}

describe("kommentarer.api loader", () => {
  beforeEach(() => {
    resetDefaultSession();
  });

  it("returnerer hele wrapperen med dokumentId, arkivert, kanKommentere og traader", async () => {
    const { ref, docId } = settOppSak();
    await opprettTraad(ref, docId, "Hei på deg");

    const respons = (await loader({
      request: testRequest,
      params: { sakId: ref, docId },
    } as never)) as Response;

    expect(respons.status).toBe(200);
    const kropp = kommentarlisteKlientSchema.parse(await respons.json());
    expect(kropp.dokumentId).toBe(docId);
    expect(kropp.arkivert).toBeNull();
    expect(kropp.kanKommentere).toBe(true);
    expect(kropp.traader).toHaveLength(1);
    expect(kropp.traader[0].kommentarer[0].tekst).toBe("Hei på deg");
    expect(kropp.traader[0].kommentarer[0].erEgen).toBe(true);
  });

  it("melder kanKommentere: false for arkivert dokument", async () => {
    const { ref, docId, sakId } = settOppSak();
    arkiverDokument(state(), sakId, docId, "Test Saksbehandler", "jp-1");

    const respons = (await loader({
      request: testRequest,
      params: { sakId: ref, docId },
    } as never)) as Response;

    const kropp = kommentarlisteKlientSchema.parse(await respons.json());
    expect(kropp.kanKommentere).toBe(false);
    expect(kropp.arkivert).not.toBeNull();
  });

  it("gir 400 når sak eller dokument mangler", async () => {
    await expect(loader({ request: testRequest, params: {} } as never)).rejects.toMatchObject({
      init: { status: 400 },
    });
  });

  it("gir 403 uten tilgang til saken", async () => {
    const { ref, docId } = settOppSak({ eier: annenSaksbehandler });

    await expect(
      loader({ request: testRequest, params: { sakId: ref, docId } } as never),
    ).rejects.toMatchObject({ init: { status: 403 } });
  });

  it("gir 404 når dokumentet ikke finnes", async () => {
    const { ref } = settOppSak();

    await expect(
      loader({ request: testRequest, params: { sakId: ref, docId: "finnes-ikke" } } as never),
    ).rejects.toMatchObject({ init: { status: 404 } });
  });

  it("lar lesetilgang hente kommentarer på en avsluttet sak", async () => {
    const { ref, docId } = settOppSak({ status: "AVSLUTTET" });

    const respons = (await loader({
      request: testRequest,
      params: { sakId: ref, docId },
    } as never)) as Response;

    expect(respons.status).toBe(200);
  });
});

describe("kommentarer.api action", () => {
  beforeEach(() => {
    resetDefaultSession();
  });

  it("oppretter en tråd med klientgenerert id og trimmet tekst", async () => {
    const { ref, docId, sakId } = settOppSak();
    const { traadId } = await opprettTraad(ref, docId, "  Ny kommentar  ");

    const traader = mockliste(sakId, docId).traader;
    expect(traader).toHaveLength(1);
    expect(traader[0].id).toBe(traadId);
    expect(traader[0].kommentarer[0].tekst).toBe("Ny kommentar");
    expect(traader[0].kommentarer[0].forfatterIdent).toBe("Z999999");
    expect(traader[0].kommentarer[0].erRot).toBe(true);
  });

  it("lagrer ankerType og anker fra requesten", async () => {
    const { ref, docId, sakId } = settOppSak();

    await kjørAction(ref, docId, {
      handling: "opprett_traad",
      traadId: crypto.randomUUID(),
      kommentarId: crypto.randomUUID(),
      ankerType: "TEXT",
      anker: {
        nodeId: "blokk-1",
        path: [1],
        startOffset: 2,
        sluttOffset: 8,
        exact: "viktig",
        prefix: "et ",
        suffix: " poeng",
      },
      opprinneligSitat: "viktig",
      tekst: "Kommentar på tekst",
    });

    const traad = mockliste(sakId, docId).traader[0];
    expect(traad.ankertype).toBe("TEXT");
    expect(traad.anker).toMatchObject({ type: "TEXT", exact: "viktig", nodeId: "blokk-1" });
    expect(traad.opprinneligSitat).toBe("viktig");
  });

  it("er idempotent på tråd-id når teksten er lik", async () => {
    const { ref, docId, sakId } = settOppSak();
    const kropp = {
      ...DOKUMENTANKER_BODY,
      traadId: crypto.randomUUID(),
      kommentarId: crypto.randomUUID(),
      tekst: "Bare én gang",
    };

    await kjørAction(ref, docId, kropp);
    const retry = await kjørAction(ref, docId, kropp);

    expect(retry.status).toBe(200);
    expect(mockliste(sakId, docId).traader).toHaveLength(1);
  });

  it("svarer 409 når samme tråd-id brukes med annen tekst", async () => {
    const { ref, docId } = settOppSak();
    const traadId = crypto.randomUUID();
    await kjørAction(ref, docId, {
      ...DOKUMENTANKER_BODY,
      traadId,
      kommentarId: crypto.randomUUID(),
      tekst: "Første",
    });

    const respons = await kjørAction(ref, docId, {
      ...DOKUMENTANKER_BODY,
      traadId,
      kommentarId: crypto.randomUUID(),
      tekst: "Noe annet",
    });

    expect(respons.status).toBe(409);
  });

  it("legger til svar med traadVersjon", async () => {
    const { ref, docId, sakId } = settOppSak();
    const { traad } = await opprettTraad(ref, docId);

    await kjørAction(ref, docId, {
      handling: "opprett_kommentar",
      traadId: traad.id,
      kommentarId: crypto.randomUUID(),
      tekst: "Enig!",
      traadVersjon: traad.versjon,
    });

    const oppdatert = mockliste(sakId, docId).traader[0];
    expect(oppdatert.kommentarer).toHaveLength(2);
    expect(oppdatert.kommentarer[1].erRot).toBe(false);
  });

  it("svarer 409 med konfliktmelding når traadVersjon er utdatert", async () => {
    const { ref, docId } = settOppSak();
    const { traad } = await opprettTraad(ref, docId);

    const respons = await kjørAction(ref, docId, {
      handling: "opprett_kommentar",
      traadId: traad.id,
      kommentarId: crypto.randomUUID(),
      tekst: "Enig!",
      traadVersjon: traad.versjon + 5,
    });

    expect(respons.status).toBe(409);
    const kropp = (await respons.json()) as { feil: string; melding: string; traad?: unknown };
    expect(kropp.feil).toBe("konflikt");
    expect(kropp.melding).toContain("endret av en annen bruker");
    // ProblemDetail fra backend bærer ikke fersk tråd – det gjør ikke vi heller.
    expect(kropp.traad).toBeUndefined();
  });

  it("redigerer egen kommentar med kommentarens versjon", async () => {
    const { ref, docId, sakId } = settOppSak();
    const { traad } = await opprettTraad(ref, docId);
    const kommentar = traad.kommentarer[0];

    await kjørAction(ref, docId, {
      handling: "rediger_kommentar",
      kommentarId: kommentar.id,
      tekst: "Endret tekst",
      versjon: kommentar.versjon,
    });

    const lagret = mockliste(sakId, docId).traader[0].kommentarer[0];
    expect(lagret.tekst).toBe("Endret tekst");
    // Versjonen øker, slik at neste redigering må sende den nye versjonen.
    expect(lagret.versjon).toBe(kommentar.versjon + 1);
  });

  it("svarer 409 ved utdatert kommentarversjon", async () => {
    const { ref, docId } = settOppSak();
    const { traad } = await opprettTraad(ref, docId);

    const respons = await kjørAction(ref, docId, {
      handling: "rediger_kommentar",
      kommentarId: traad.kommentarer[0].id,
      tekst: "Basert på en gammel versjon",
      versjon: traad.kommentarer[0].versjon + 5,
    });

    expect(respons.status).toBe(409);
  });

  it("soft-sletter egen kommentar og returnerer tråden med synlig: false", async () => {
    const { ref, docId, sakId } = settOppSak();
    const { traad } = await opprettTraad(ref, docId);

    const respons = await kjørAction(ref, docId, {
      handling: "slett_kommentar",
      kommentarId: traad.kommentarer[0].id,
      versjon: traad.kommentarer[0].versjon,
    });

    const kropp = (await respons.json()) as { traad: Kommentartraad };
    expect(kropp.traad.synlig).toBe(false);
    expect(mockliste(sakId, docId).traader).toHaveLength(0);
  });

  it("adresserer og gjenåpner tråden med trådens versjon", async () => {
    const { ref, docId, sakId } = settOppSak();
    const { traad } = await opprettTraad(ref, docId);

    const løst = await kjørAction(ref, docId, {
      handling: "sett_adressering",
      traadId: traad.id,
      adressert: true,
      versjon: traad.versjon,
    });
    const løstKropp = (await løst.json()) as { traad: Kommentartraad };
    expect(løstKropp.traad.adressert).toBe(true);
    expect(løstKropp.traad.resolved).not.toBeNull();

    await kjørAction(ref, docId, {
      handling: "sett_adressering",
      traadId: traad.id,
      adressert: false,
      versjon: løstKropp.traad.versjon,
    });

    expect(mockliste(sakId, docId).traader[0].adressert).toBe(false);
  });

  it("avviser tom tekst med 400", async () => {
    const { ref, docId } = settOppSak();

    await expect(
      kjørAction(ref, docId, {
        ...DOKUMENTANKER_BODY,
        traadId: crypto.randomUUID(),
        kommentarId: crypto.randomUUID(),
        tekst: "   ",
      }),
    ).rejects.toMatchObject({ init: { status: 400 } });
  });

  it("avviser tekst over 5000 tegn med 400", async () => {
    const { ref, docId } = settOppSak();

    await expect(
      kjørAction(ref, docId, {
        ...DOKUMENTANKER_BODY,
        traadId: crypto.randomUUID(),
        kommentarId: crypto.randomUUID(),
        tekst: "a".repeat(5001),
      }),
    ).rejects.toMatchObject({ init: { status: 400 } });
  });

  it("godtar et sitat på nøyaktig 2000 tegn", async () => {
    const { ref, docId, sakId } = settOppSak();

    await kjørAction(ref, docId, {
      ...DOKUMENTANKER_BODY,
      traadId: crypto.randomUUID(),
      kommentarId: crypto.randomUUID(),
      opprinneligSitat: "s".repeat(2000),
      tekst: "Kommentar med langt sitat",
    });

    expect(mockliste(sakId, docId).traader[0].opprinneligSitat).toHaveLength(2000);
  });

  it("avviser sitat over 2000 tegn med 400 – derfor klipper klienten før den sender", async () => {
    const { ref, docId } = settOppSak();

    await expect(
      kjørAction(ref, docId, {
        ...DOKUMENTANKER_BODY,
        traadId: crypto.randomUUID(),
        kommentarId: crypto.randomUUID(),
        opprinneligSitat: "s".repeat(2001),
        tekst: "Kommentar med for langt sitat",
      }),
    ).rejects.toMatchObject({ init: { status: 400 } });
  });

  it("avviser ukjent handling med 400", async () => {
    const { ref, docId } = settOppSak();

    await expect(kjørAction(ref, docId, { handling: "tull" })).rejects.toMatchObject({
      init: { status: 400 },
    });
  });

  it("avviser andre metoder enn POST med 405", async () => {
    const { ref, docId } = settOppSak();

    await expect(
      action({
        request: new Request("http://localhost", { method: "DELETE" }),
        params: { sakId: ref, docId },
      } as never),
    ).rejects.toMatchObject({ init: { status: 405 } });
  });

  it("gir 403 uten tilgang til saken", async () => {
    const { ref, docId } = settOppSak({ eier: annenSaksbehandler });

    await expect(
      kjørAction(ref, docId, {
        ...DOKUMENTANKER_BODY,
        traadId: crypto.randomUUID(),
        kommentarId: crypto.randomUUID(),
        tekst: "Hei",
      }),
    ).rejects.toMatchObject({ init: { status: 403 } });
  });

  it("lar lesetilgang kommentere selv om saken er avsluttet", async () => {
    const { ref, docId, sakId } = settOppSak({ status: "AVSLUTTET" });
    await opprettTraad(ref, docId, "Kommentar på avsluttet sak");

    expect(mockliste(sakId, docId).traader).toHaveLength(1);
  });

  it("svarer 409 – ikke 403 – for arkivert dokument", async () => {
    const { ref, docId, sakId } = settOppSak();
    arkiverDokument(state(), sakId, docId, "Test Saksbehandler", "jp-1");

    const respons = await kjørAction(ref, docId, {
      ...DOKUMENTANKER_BODY,
      traadId: crypto.randomUUID(),
      kommentarId: crypto.randomUUID(),
      tekst: "Hei",
    });

    expect(respons.status).toBe(409);
  });

  it("gir 404 når tråden ikke finnes", async () => {
    const { ref, docId } = settOppSak();

    await expect(
      kjørAction(ref, docId, {
        handling: "opprett_kommentar",
        traadId: crypto.randomUUID(),
        kommentarId: crypto.randomUUID(),
        tekst: "Svar på ingenting",
        traadVersjon: 1,
      }),
    ).rejects.toMatchObject({ init: { status: 404 } });
  });

  it("gir 403 når man prøver å endre en annens kommentar", async () => {
    const { ref, docId, sakId } = settOppSak();
    const { traad } = await opprettTraad(ref, docId);
    const lagrede = state().dokumentKommentarer.get(`${sakId}:${docId}`) as {
      kommentarer: { forfatterIdent: string }[];
    }[];
    lagrede[0].kommentarer[0].forfatterIdent = "Z123456";

    await expect(
      kjørAction(ref, docId, {
        handling: "rediger_kommentar",
        kommentarId: traad.kommentarer[0].id,
        tekst: "Kapret",
        versjon: traad.kommentarer[0].versjon,
      }),
    ).rejects.toMatchObject({ init: { status: 403 } });
  });
});
