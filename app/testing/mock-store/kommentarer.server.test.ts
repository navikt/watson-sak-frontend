import { beforeEach, describe, expect, it } from "vitest";
import { slettDokument } from "~/testing/mock-store/dokumenter.server";
import {
  hentKommentarliste,
  opprettKommentar,
  opprettKommentartraad,
  redigerKommentar,
  settAdressering,
  slettKommentar,
} from "~/testing/mock-store/kommentarer.server";
import { hentMockState, resetDefaultSession } from "~/testing/mock-store/session.server";

const request = new Request("http://localhost");
function state() {
  return hentMockState(request);
}

const SAK = "1";
const DOC = "test-dok";
const MEG = "Z999999";

function liste(sakId = SAK, docId = DOC, innloggetIdent = MEG) {
  return hentKommentarliste(state(), sakId, docId, { innloggetIdent, arkivert: null });
}

function nyTraad(overstyringer: Partial<Parameters<typeof opprettKommentartraad>[3]> = {}) {
  const resultat = opprettKommentartraad(state(), SAK, DOC, {
    traadId: crypto.randomUUID(),
    kommentarId: crypto.randomUUID(),
    ankertype: "DOCUMENT",
    anker: { type: "DOCUMENT" },
    opprinneligSitat: null,
    tekst: "En kommentar",
    forfatterIdent: MEG,
    forfatterNavn: "Test Saksbehandler",
    ...overstyringer,
  });
  if (resultat.status !== "ok") throw new Error(`Forventet ok, fikk ${resultat.status}`);
  return resultat.traad;
}

describe("mock-store for kommentarer", () => {
  beforeEach(() => {
    resetDefaultSession();
  });

  it("returnerer wrapperen med dokumentId, arkivert og kanKommentere", () => {
    const svar = hentKommentarliste(state(), SAK, DOC, {
      innloggetIdent: MEG,
      arkivert: "2026-04-01T10:00:00Z",
    });

    expect(svar).toMatchObject({
      dokumentId: DOC,
      arkivert: "2026-04-01T10:00:00Z",
      // Arkivert dokument er aldri kommenterbart – samme regel som i backend.
      kanKommentere: false,
      traader: [],
    });
  });

  it("seeder eksempelkommentarer på det første seedede dokumentet", () => {
    const traader = liste("2", "1-1").traader;

    expect(traader).toHaveLength(3);
    expect(traader.map((traad) => traad.ankertype)).toEqual(["TEXT", "DOCUMENT", "ELEMENT"]);
    expect(traader.filter((traad) => traad.adressert)).toHaveLength(1);
    // Rotkommentaren er markert, og teksten ligger i `tekst` – ikke `innhold`.
    expect(traader[0].kommentarer[0].erRot).toBe(true);
    expect(traader[0].kommentarer[0].tekst).toContain("presisere");
  });

  it("setter erEgen ut fra innlogget ident", () => {
    const somMeg = liste("2", "1-1", "mock-kari-hansen").traader[0];
    const somAndre = liste("2", "1-1", MEG).traader[0];

    expect(somMeg.kommentarer[0].erEgen).toBe(true);
    expect(somAndre.kommentarer[0].erEgen).toBe(false);
  });

  it("tilbakestilles av resetDefaultSession", () => {
    nyTraad();
    expect(liste().traader).toHaveLength(1);

    resetDefaultSession();
    expect(liste().traader).toHaveLength(0);
  });

  it("øker trådversjonen når et svar legges til", () => {
    const traad = nyTraad();
    expect(traad.versjon).toBe(1);

    const resultat = opprettKommentar(state(), SAK, DOC, traad.id, {
      kommentarId: crypto.randomUUID(),
      tekst: "Svar",
      traadVersjon: traad.versjon,
      forfatterIdent: MEG,
      forfatterNavn: "Test Saksbehandler",
    });

    expect(resultat.status).toBe("ok");
    expect(resultat.status === "ok" && resultat.traad.versjon).toBe(2);
    expect(resultat.status === "ok" && resultat.traad.kommentarer[1].erRot).toBe(false);
  });

  it("gir konflikt når traadVersjon er utdatert", () => {
    const traad = nyTraad();

    const resultat = opprettKommentar(state(), SAK, DOC, traad.id, {
      kommentarId: crypto.randomUUID(),
      tekst: "Svar",
      traadVersjon: 99,
      forfatterIdent: MEG,
      forfatterNavn: "Test Saksbehandler",
    });

    expect(resultat.status).toBe("konflikt");
  });

  it("gir konflikt når kommentarversjonen er utdatert", () => {
    const traad = nyTraad();

    const resultat = redigerKommentar(state(), SAK, DOC, traad.kommentarer[0].id, {
      tekst: "Endret",
      versjon: 99,
      innloggetIdent: MEG,
    });

    expect(resultat.status).toBe("konflikt");
    expect(liste().traader[0].kommentarer[0].tekst).toBe("En kommentar");
  });

  it("gir ikke_forfatter når man forsøker å endre en annens kommentar", () => {
    const traad = nyTraad({ forfatterIdent: "Z111111" });

    const resultat = redigerKommentar(state(), SAK, DOC, traad.kommentarer[0].id, {
      tekst: "Kapret",
      versjon: traad.kommentarer[0].versjon,
      innloggetIdent: MEG,
    });

    expect(resultat.status).toBe("ikke_forfatter");
  });

  it("gir konflikt når tråden er adressert", () => {
    const traad = nyTraad();
    settAdressering(state(), SAK, DOC, traad.id, {
      adressert: true,
      versjon: traad.versjon,
      innloggetIdent: MEG,
      navn: "Test Saksbehandler",
    });

    const resultat = redigerKommentar(state(), SAK, DOC, traad.kommentarer[0].id, {
      tekst: "Endret",
      versjon: traad.kommentarer[0].versjon,
      innloggetIdent: MEG,
    });

    expect(resultat.status).toBe("konflikt");
  });

  it("soft-sletter kommentaren og returnerer tråden med synlig: false", () => {
    const traad = nyTraad();

    const resultat = slettKommentar(state(), SAK, DOC, traad.kommentarer[0].id, {
      versjon: traad.kommentarer[0].versjon,
      innloggetIdent: MEG,
    });

    expect(resultat.status).toBe("ok");
    expect(resultat.status === "ok" && resultat.traad.synlig).toBe(false);
    expect(resultat.status === "ok" && resultat.traad.kommentarer).toEqual([]);
    // Tråden filtreres bort fra GET-lista, akkurat som i backend.
    expect(liste().traader).toHaveLength(0);
  });

  it("beholder tråden når den fortsatt har synlige kommentarer", () => {
    const traad = nyTraad();
    opprettKommentar(state(), SAK, DOC, traad.id, {
      kommentarId: crypto.randomUUID(),
      tekst: "Svar",
      traadVersjon: traad.versjon,
      forfatterIdent: MEG,
      forfatterNavn: "Test Saksbehandler",
    });

    slettKommentar(state(), SAK, DOC, traad.kommentarer[0].id, {
      versjon: traad.kommentarer[0].versjon,
      innloggetIdent: MEG,
    });

    const igjen = liste().traader;
    expect(igjen).toHaveLength(1);
    expect(igjen[0].kommentarer).toHaveLength(1);
    expect(igjen[0].synlig).toBe(true);
  });

  it("er idempotent på tråd-id ved identisk tekst, og konflikt ved ulik tekst", () => {
    const traadId = crypto.randomUUID();
    const kommentarId = crypto.randomUUID();
    const felles = {
      traadId,
      kommentarId,
      ankertype: "DOCUMENT" as const,
      anker: { type: "DOCUMENT" as const },
      opprinneligSitat: null,
      forfatterIdent: MEG,
      forfatterNavn: "Test Saksbehandler",
    };

    opprettKommentartraad(state(), SAK, DOC, { ...felles, tekst: "Bare én gang" });
    const retry = opprettKommentartraad(state(), SAK, DOC, { ...felles, tekst: "Bare én gang" });
    expect(retry.status).toBe("ok");
    expect(liste().traader).toHaveLength(1);

    const annet = opprettKommentartraad(state(), SAK, DOC, { ...felles, tekst: "Noe annet" });
    expect(annet.status).toBe("konflikt");
  });

  it("lagrer resolved-tidspunkt og hvem som adresserte, og nullstiller ved gjenåpning", () => {
    const traad = nyTraad();

    const løst = settAdressering(state(), SAK, DOC, traad.id, {
      adressert: true,
      versjon: traad.versjon,
      innloggetIdent: MEG,
      navn: "Test Saksbehandler",
    });
    if (løst.status !== "ok") throw new Error("Forventet ok");
    expect(løst.traad.resolved).not.toBeNull();
    expect(løst.traad.adressert).toBe(true);
    expect(løst.traad.resolvedAvNavn).toBe("Test Saksbehandler");

    const gjenåpnet = settAdressering(state(), SAK, DOC, traad.id, {
      adressert: false,
      versjon: løst.traad.versjon,
      innloggetIdent: MEG,
      navn: "Test Saksbehandler",
    });
    if (gjenåpnet.status !== "ok") throw new Error("Forventet ok");
    expect(gjenåpnet.traad.resolved).toBeNull();
    expect(gjenåpnet.traad.adressert).toBe(false);
    expect(gjenåpnet.traad.resolvedAvNavn).toBeNull();
  });

  it("rydder bort kommentarer når dokumentet slettes", () => {
    expect(liste("2", "1-1").traader.length).toBeGreaterThan(0);

    slettDokument(state(), "2", "1-1");

    expect(liste("2", "1-1").traader).toEqual([]);
  });
});
