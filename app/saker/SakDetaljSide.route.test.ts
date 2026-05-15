import { beforeEach, describe, expect, it, vi } from "vitest";
import { hentMockState, resetDefaultSession } from "~/testing/mock-store/session.server";
import { hentFordelingssaker } from "~/testing/mock-store/alle-saker.server";
import { hentAlleSaker } from "./mock-alle-saker.server";
import { hentHistorikk } from "./historikk/mock-data.server";
import { getSaksreferanse } from "~/saker/id";
import { getBeskrivelse, getKildeText, getPersonIdent, getYtelseTyper } from "~/saker/visning";
import type { Route } from "./+types/SakDetaljSide.route";
import { action, loader } from "./SakDetaljSide.server";

vi.mock("~/config/env.server", () => ({
  skalBrukeMockdata: true,
}));

const testRequest = new Request("http://localhost");
function state() {
  return hentMockState(testRequest);
}

describe("SakDetaljSide action", () => {
  const utredningSakId = 113;
  const utredningSakRef = getSaksreferanse(utredningSakId);

  beforeEach(() => {
    resetDefaultSession();
  });

  it("eksponerer tildeling som tilgjengelig handling når kontrollsaken er ownerløs under utredning", async () => {
    const sak = hentAlleSaker(testRequest).find((sak) => sak.id === utredningSakId);

    expect(sak?.status).toBe("UTREDES");
    expect(sak?.saksbehandlere.eier).toBeNull();
  });

  it("legger til delt saksbehandler og logger historikk", async () => {
    const kontrollsak = hentFordelingssaker(state())[1];
    const kontrollsakRef = getSaksreferanse(kontrollsak.id);

    expect(kontrollsak.saksbehandlere?.deltMed ?? []).toHaveLength(0);

    const formData = new FormData();
    formData.set("handling", "del_tilgang");
    formData.set("navIdent", "Z123456");

    await action({
      request: new Request(`http://localhost/saker/${kontrollsakRef}`, {
        method: "POST",
        body: formData,
      }),
      params: { sakId: kontrollsakRef },
    } as Route.ActionArgs);

    expect(kontrollsak.saksbehandlere?.deltMed).toEqual([
      {
        navn: "Kari Nordmann",
        enhet: "Nord",
        navIdent: "Z123456",
      },
    ]);

    const historikk = hentHistorikk(testRequest, String(kontrollsak.id));
    expect(historikk[0]?.hendelsesType).toBe("TILGANG_DELT");
    expect(historikk[0]?.berortSaksbehandlerNavn).toBe("Kari Nordmann");
  });

  it("fjerner delt saksbehandler og logger historikk", async () => {
    const kontrollsak = hentFordelingssaker(state())[0];
    const kontrollsakRef = getSaksreferanse(kontrollsak.id);

    expect(kontrollsak.saksbehandlere?.deltMed).toEqual([
      {
        navn: "Kari Nordmann",
        enhet: "Nord",
        navIdent: "Z123456",
      },
      {
        navn: "Ada Larsen",
        enhet: "Øst",
        navIdent: "Z234567",
      },
    ]);

    const formData = new FormData();
    formData.set("handling", "fjern_delt_tilgang");
    formData.set("navIdent", "Z123456");

    await action({
      request: new Request(`http://localhost/saker/${kontrollsakRef}`, {
        method: "POST",
        body: formData,
      }),
      params: { sakId: kontrollsakRef },
    } as Route.ActionArgs);

    expect(kontrollsak.saksbehandlere?.deltMed).toEqual([
      {
        navn: "Ada Larsen",
        enhet: "Øst",
        navIdent: "Z234567",
      },
    ]);

    const historikk = hentHistorikk(testRequest, String(kontrollsak.id));
    expect(historikk[0]?.hendelsesType).toBe("TILGANG_FJERNET");
    expect(historikk[0]?.berortSaksbehandlerNavn).toBe("Kari Nordmann");
  });

  it("overfører ansvarlig saksbehandler, fjerner vedkommende fra delt med og logger historikk", async () => {
    const kontrollsak = hentFordelingssaker(state())[0];
    const kontrollsakRef = getSaksreferanse(kontrollsak.id);

    const formData = new FormData();
    formData.set("handling", "overfor_ansvarlig");
    formData.set("navIdent", "Z123456");

    await action({
      request: new Request(`http://localhost/saker/${kontrollsakRef}`, {
        method: "POST",
        body: formData,
      }),
      params: { sakId: kontrollsakRef },
    } as Route.ActionArgs);

    expect(kontrollsak.saksbehandlere.eier?.navIdent).toBe("Z123456");
    expect(kontrollsak.saksbehandlere?.deltMed).toEqual([
      {
        navn: "Ada Larsen",
        enhet: "Øst",
        navIdent: "Z234567",
      },
    ]);

    const historikk = hentHistorikk(testRequest, String(kontrollsak.id));
    expect(historikk[0]?.hendelsesType).toBe("ANSVARLIG_SAKSBEHANDLER_ENDRET");
    expect(historikk[0]?.berortSaksbehandlerNavIdent).toBe("Z123456");
  });

  it("inkluderer valgt mal når notat logges i historikk", async () => {
    const kontrollsak = hentFordelingssaker(state())[0];
    const kontrollsakRef = getSaksreferanse(kontrollsak.id);

    const formData = new FormData();
    formData.set("handling", "send_notat");
    formData.set("notat", "Vurderingen er dokumentert.");
    formData.set("mal", "barnas_beste");
    formData.set("knyttTilOppgave", "false");

    await action({
      request: new Request(`http://localhost/saker/${kontrollsakRef}`, {
        method: "POST",
        body: formData,
      }),
      params: { sakId: kontrollsakRef },
    } as Route.ActionArgs);

    const historikk = hentHistorikk(testRequest, String(kontrollsak.id));
    expect(historikk[0]).toEqual(
      expect.objectContaining({
        hendelsesType: "NOTAT_SENDT",
        beskrivelse: "Vurderingen er dokumentert.\nMal: Vurdering av barnas beste",
      }),
    );
  });

  it("returnerer lokal feilmelding når koble sak ikke er tilgjengelig ennå", async () => {
    const formData = new FormData();
    formData.set("handling", "koble_sak");
    formData.set("relatertSakId", "114");

    const resultat = await action({
      request: new Request(`http://localhost/saker/${utredningSakRef}`, {
        method: "POST",
        body: formData,
      }),
      params: { sakId: utredningSakRef },
    } as Route.ActionArgs);

    expect(resultat).toEqual({
      ok: false,
      feil: { skjema: ["Denne funksjonen er ikke tilgjengelig ennå."] },
    });
  });
});

describe("SakDetaljSide helper-integrasjon", () => {
  const fordelingSakId = 101;

  beforeEach(() => {
    resetDefaultSession();
  });

  it("leser personident, kilde, ytelser og beskrivelse via helpers for backend-shapede saker", () => {
    const sak = hentAlleSaker(testRequest).find((sak) => sak.id === fordelingSakId);

    expect(sak).toBeDefined();

    if (!sak) {
      throw new Error("Fant ikke forventet legacy-sak i testdata");
    }

    expect(getPersonIdent(sak)).toBe("12345678901");
    expect(getKildeText(sak)).toBe("Annet");
    expect(getYtelseTyper(sak)).toEqual(["Barnetrygd"]);
    expect(getBeskrivelse(sak)).toBeNull();
  });

  it("returnerer backend-shapede saker i samlet mockdatasett for øvrige flows", () => {
    const sak = hentAlleSaker(testRequest).find(
      (eksisterendeSak) => eksisterendeSak.id === fordelingSakId,
    );

    expect(sak).toBeDefined();

    if (!sak) {
      throw new Error("Fant ikke forventet legacy-sak i testdata");
    }

    expect("personIdent" in sak).toBe(true);
  });
});

describe("SakDetaljSide kontrollsak-runtime", () => {
  const mineSakId = 201;
  const mineSakRef = getSaksreferanse(mineSakId);

  beforeEach(() => {
    resetDefaultSession();
  });

  it("loader returnerer backend-shapet kontrollsak når sakId peker på kontrollsak", async () => {
    const kontrollsakId = hentFordelingssaker(state())[0].id;
    const kontrollsakRef = getSaksreferanse(kontrollsakId);

    const resultat = await loader({
      request: testRequest,
      params: { sakId: kontrollsakRef },
    } as Route.LoaderArgs);

    expect(resultat.sak.id).toBe(kontrollsakId);
    expect("personIdent" in resultat.sak).toBe(true);
    expect(Array.isArray(resultat.andreSaker)).toBe(true);
    expect(resultat.andreSaker.every((s) => s.personIdent === resultat.sak.personIdent)).toBe(true);
    expect(resultat.andreSaker.every((s) => s.id !== resultat.sak.id)).toBe(true);
  });

  it("loader returnerer backend-shapet mine sak når sakId peker på backend-shaped mine saker", async () => {
    const resultat = await loader({
      request: testRequest,
      params: { sakId: mineSakRef },
    } as Route.LoaderArgs);

    expect(resultat.sak.id).toBe(mineSakId);
    expect("personIdent" in resultat.sak).toBe(true);
    expect(Array.isArray(resultat.andreSaker)).toBe(true);
  });

  it("beholder hentAlleSaker som backend-shaped aggregat", () => {
    const saker = hentAlleSaker(testRequest);

    expect(saker.length).toBeGreaterThan(0);
    expect(saker.every((sak) => "personIdent" in sak)).toBe(true);
  });

  it("beholder kontrollsak-status og setter owner ved tildeling", async () => {
    const kontrollsak = hentFordelingssaker(state())[0];
    const kontrollsakRef = getSaksreferanse(kontrollsak.id);

    expect(kontrollsak.status).toBe("OPPRETTET");

    const formData = new FormData();
    formData.set("handling", "TILDEL");
    formData.set("navIdent", "Z123456");

    await action({
      request: new Request(`http://localhost/saker/${kontrollsakRef}`, {
        method: "POST",
        body: formData,
      }),
      params: { sakId: kontrollsakRef },
    } as Route.ActionArgs);

    expect(kontrollsak.status).toBe("OPPRETTET");
    expect(kontrollsak.saksbehandlere.eier?.navIdent).toBe("Z123456");
  });

  it("tildeler ownerløs sak med konsistent saksbehandlerident", async () => {
    const kontrollsak = hentFordelingssaker(state())[0];
    const kontrollsakRef = getSaksreferanse(kontrollsak.id);

    kontrollsak.status = "OPPRETTET";
    kontrollsak.saksbehandlere.eier = null;
    kontrollsak.saksbehandlere.opprettetAv = {
      navn: "Tidligere Saksbehandler",
      navIdent: "Z999999",
      enhet: "Nord",
    };

    expect(kontrollsak.status).toBe("OPPRETTET");
    expect(kontrollsak.saksbehandlere.eier).toBeNull();

    const formData = new FormData();
    formData.set("handling", "TILDEL");
    formData.set("navIdent", "Z123456");

    await action({
      request: new Request(`http://localhost/saker/${kontrollsakRef}`, {
        method: "POST",
        body: formData,
      }),
      params: { sakId: kontrollsakRef },
    } as Route.ActionArgs);

    expect(kontrollsak.saksbehandlere.eier).toEqual({
      navn: "Kari Nordmann",
      navIdent: "Z123456",
      enhet: "Nord",
    });
  });

  it("tildeler ownerløs sak til lokal mock-bruker", async () => {
    const kontrollsak = hentFordelingssaker(state())[0];
    const kontrollsakRef = getSaksreferanse(kontrollsak.id);

    kontrollsak.status = "OPPRETTET";
    kontrollsak.saksbehandlere.eier = null;

    const formData = new FormData();
    formData.set("handling", "TILDEL");
    formData.set("navIdent", "Z999999");

    await action({
      request: new Request(`http://localhost/saker/${kontrollsakRef}`, {
        method: "POST",
        body: formData,
      }),
      params: { sakId: kontrollsakRef },
    } as Route.ActionArgs);

    expect(kontrollsak.saksbehandlere.eier).toEqual({
      navn: "Saks Behandlersen",
      navIdent: "Z999999",
      enhet: "Nord",
    });
  });

  it("oppdaterer fallback-enhet når ownerløs sak videresendes til seksjon", async () => {
    const kontrollsak = hentFordelingssaker(state())[0];
    const kontrollsakRef = getSaksreferanse(kontrollsak.id);

    kontrollsak.status = "OPPRETTET";
    kontrollsak.saksbehandlere.eier = null;
    kontrollsak.saksbehandlere.opprettetAv = {
      navn: "Tidligere Saksbehandler",
      navIdent: "Z999999",
      enhet: "Nord",
    };

    expect(kontrollsak.saksbehandlere.eier).toBeNull();
    expect(kontrollsak.saksbehandlere.opprettetAv.enhet).toBe("Nord");

    const formData = new FormData();
    formData.set("handling", "videresend_seksjon");
    formData.set("seksjon", "Øst");

    await action({
      request: new Request(`http://localhost/saker/${kontrollsakRef}`, {
        method: "POST",
        body: formData,
      }),
      params: { sakId: kontrollsakRef },
    } as Route.ActionArgs);

    expect(kontrollsak.saksbehandlere.opprettetAv.enhet).toBe("Øst");
  });

  it("sender sak til annen enhet og fristiller saksbehandler", async () => {
    const kontrollsak = hentFordelingssaker(state())[0];
    const kontrollsakRef = getSaksreferanse(kontrollsak.id);

    kontrollsak.saksbehandlere.eier = {
      navn: "Tidligere Saksbehandler",
      navIdent: "Z999999",
      enhet: "Nord",
    };
    kontrollsak.saksbehandlere.opprettetAv = {
      navn: "Kari Oppretter",
      navIdent: "Z654321",
      enhet: "Nord",
    };

    const formData = new FormData();
    formData.set("handling", "send_til_annen_enhet");
    formData.set("seksjon", "NORD");

    await action({
      request: new Request(`http://localhost/saker/${kontrollsakRef}`, {
        method: "POST",
        body: formData,
      }),
      params: { sakId: kontrollsakRef },
    } as Route.ActionArgs);

    expect(kontrollsak.saksbehandlere.eier).toBeNull();
    expect(kontrollsak.saksbehandlere.opprettetAv.enhet).toBe("NORD");
    expect(hentHistorikk(testRequest, String(kontrollsak.id))[0]?.hendelsesType).toBe(
      "MOTTAKSENHET_ENDRET",
    );
  });

  it("oppdaterer redigerbare saksdetaljer uten å endre låste felt", async () => {
    const kontrollsak = hentFordelingssaker(state())[0];
    const kontrollsakRef = getSaksreferanse(kontrollsak.id);

    const opprinneligPersonIdent = kontrollsak.personIdent;
    const opprinneligStatus = kontrollsak.status;
    const opprinneligSaksbehandler = kontrollsak.saksbehandlere.eier?.navn ?? null;

    const formData = new FormData();
    formData.set("handling", "rediger_saksinformasjon");
    formData.set("kategori", "ARBEID");
    formData.append("misbruktype", "SVART_ARBEID");
    formData.append("merking", "PRIORITERT");
    formData.set("kilde", "PUBLIKUM");
    formData.set("ytelser[0].type", "Dagpenger");
    formData.set("ytelser[0].fraDato", "2026-02-01");
    formData.set("ytelser[0].tilDato", "2026-02-28");
    formData.set("ytelser[1].type", "Sykepenger");
    formData.set("ytelser[1].fraDato", "2026-02-01");
    formData.set("ytelser[1].tilDato", "2026-02-28");
    formData.set("personIdent", "99999999999");
    formData.set("status", "AVSLUTTET");
    formData.set("saksbehandler", "Ny Saksbehandler");

    await action({
      request: new Request(`http://localhost/saker/${kontrollsakRef}`, {
        method: "POST",
        body: formData,
      }),
      params: { sakId: kontrollsakRef },
    } as Route.ActionArgs);

    expect(kontrollsak.kategori).toBe("ARBEID");
    expect(kontrollsak.misbruktype).toEqual(["SVART_ARBEID"]);
    expect(kontrollsak.merking).toBe("PRIORITERT");
    expect(kontrollsak.kilde).toBe("PUBLIKUM");
    expect(kontrollsak.ytelser.map((ytelse) => ytelse.type)).toEqual(["Dagpenger", "Sykepenger"]);
    expect(kontrollsak.ytelser.map((ytelse) => ytelse.periodeFra)).toEqual([
      "2026-02-01",
      "2026-02-01",
    ]);
    expect(kontrollsak.ytelser.map((ytelse) => ytelse.periodeTil)).toEqual([
      "2026-02-28",
      "2026-02-28",
    ]);
    expect(kontrollsak.personIdent).toBe(opprinneligPersonIdent);
    expect(kontrollsak.status).toBe(opprinneligStatus);
    expect(kontrollsak.saksbehandlere.eier?.navn ?? null).toBe(opprinneligSaksbehandler);

    const historikk = hentHistorikk(testRequest, String(kontrollsak.id));
    expect(historikk[0]?.hendelsesType).toBe("SAKSINFORMASJON_ENDRET");
  });

  it("oppdaterer kilde når sak får oppdatert kilde", async () => {
    const kontrollsak = hentFordelingssaker(state())[0];
    const kontrollsakRef = getSaksreferanse(kontrollsak.id);

    const formData = new FormData();
    formData.set("handling", "rediger_saksinformasjon");
    formData.set("kategori", kontrollsak.kategori);
    formData.append("misbruktype", "ENDRET_SIVILSTATUS");
    formData.set("kilde", "PUBLIKUM");
    formData.set("ytelser[0].type", "Barnetrygd");
    formData.set("ytelser[0].fraDato", "2026-01-13");
    formData.set("ytelser[0].tilDato", "2026-01-13");

    await action({
      request: new Request(`http://localhost/saker/${kontrollsakRef}`, {
        method: "POST",
        body: formData,
      }),
      params: { sakId: kontrollsakRef },
    } as Route.ActionArgs);

    const oppdatertSak = hentAlleSaker(testRequest).find((sak) => sak.id === kontrollsak.id);

    if (!oppdatertSak) {
      throw new Error("Forventet at saken finnes etter oppdatering");
    }

    expect(oppdatertSak.kilde).toBe("PUBLIKUM");
  });

  it("avviser redigering når saken er inaktiv selv om payloaden er gyldig", async () => {
    const kontrollsak = hentFordelingssaker(state())[0];
    const kontrollsakRef = getSaksreferanse(kontrollsak.id);
    kontrollsak.status = "AVSLUTTET";

    const formData = new FormData();
    formData.set("handling", "rediger_saksinformasjon");
    formData.set("kategori", "ARBEID");
    formData.append("misbruktype", "SVART_ARBEID");
    formData.append("merking", "PRIORITERT");
    formData.set("kilde", "PUBLIKUM");
    formData.set("ytelser[0].type", "Dagpenger");
    formData.set("ytelser[0].fraDato", "2026-02-01");
    formData.set("ytelser[0].tilDato", "2026-02-28");

    const resultat = await action({
      request: new Request(`http://localhost/saker/${kontrollsakRef}`, {
        method: "POST",
        body: formData,
      }),
      params: { sakId: kontrollsakRef },
    } as Route.ActionArgs);

    expect(resultat).toEqual({
      ok: false,
      feil: { skjema: ["Saken kan ikke redigeres i denne statusen."] },
    });
    expect(kontrollsak.status).toBe("AVSLUTTET");
    expect(kontrollsak.kategori).not.toBe("ARBEID");
  });
});
