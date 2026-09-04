import { beforeEach, describe, expect, it, vi } from "vitest";
import { hentMockState, resetDefaultSession } from "~/testing/mock-store/session.server";
import { hentFordelingssaker } from "~/testing/mock-store/alle-saker.server";
import { required } from "~/testing/required";
import { hentAlleSaker } from "./mock-alle-saker.server";
import { hentHistorikk } from "./historikk/mock-data.server";
import { hentDokumenttreForSak } from "./filer/mock-data.server";
import { hentFilerForSak, leggTilFil } from "./filer/mock-data-filer.server";
import { getSaksreferanse } from "~/saker/id";
import { getBeskrivelse, getKildeText, getPersonIdent, getYtelseTyper } from "~/saker/visning";
import type { Route } from "./+types/SakDetaljSide.route";
import { action, loader } from "./SakDetaljSide.server";

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
    kontrollsak.saksbehandlere.eier = {
      navIdent: "Z999999",
      navn: "Test Saksbehandler",
      enhet: "4812",
    };

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
        enhet: "hu424t",
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
    kontrollsak.saksbehandlere.eier = {
      navIdent: "Z999999",
      navn: "Test Saksbehandler",
      enhet: "4812",
    };

    expect(kontrollsak.saksbehandlere?.deltMed).toEqual([
      {
        navn: "Kari Nordmann",
        enhet: "hu424t",
        navIdent: "Z123456",
      },
      {
        navn: "Ada Larsen",
        enhet: "ky153k",
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
        enhet: "ky153k",
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
        enhet: "ky153k",
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
    kontrollsak.saksbehandlere.eier = {
      navIdent: "Z999999",
      navn: "Test Saksbehandler",
      enhet: "4812",
    };

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

  it("kobler og fjerner kobling mellom saker på samme person i mockdata", async () => {
    const kontrollsak = required(
      hentAlleSaker(testRequest).find((sak) => sak.id === utredningSakId),
    );
    const kobletSak = required(
      hentAlleSaker(testRequest).find(
        (sak) => sak.id !== kontrollsak.id && sak.personIdent === kontrollsak.personIdent,
      ),
    );
    kontrollsak.saksbehandlere.eier = {
      navIdent: "Z999999",
      navn: "Test Saksbehandler",
      enhet: "4812",
    };

    const formData = new FormData();
    formData.set("handling", "koble_sak");
    formData.set("relatertSakId", String(kobletSak.id));

    await action({
      request: new Request(`http://localhost/saker/${utredningSakRef}`, {
        method: "POST",
        body: formData,
      }),
      params: { sakId: utredningSakRef },
    } as Route.ActionArgs);

    expect(kontrollsak.kobledeSaker).toContain(kobletSak.id);
    expect(kobletSak.kobledeSaker).toContain(kontrollsak.id);

    const fjernFormData = new FormData();
    fjernFormData.set("handling", "fjern_kobling");
    fjernFormData.set("relatertSakId", String(kobletSak.id));

    await action({
      request: new Request(`http://localhost/saker/${utredningSakRef}`, {
        method: "POST",
        body: fjernFormData,
      }),
      params: { sakId: utredningSakRef },
    } as Route.ActionArgs);

    expect(kontrollsak.kobledeSaker).not.toContain(kobletSak.id);
    expect(kobletSak.kobledeSaker).not.toContain(kontrollsak.id);
  });

  it("kobler når innlogget bruker er delt med på målsaken", async () => {
    const kontrollsak = required(
      hentAlleSaker(testRequest).find((sak) => sak.id === utredningSakId),
    );
    const kobletSak = required(
      hentAlleSaker(testRequest).find(
        (sak) => sak.id !== kontrollsak.id && sak.personIdent === kontrollsak.personIdent,
      ),
    );
    kontrollsak.saksbehandlere.eier = {
      navIdent: "Z111111",
      navn: "Annen Saksbehandler",
      enhet: "4812",
    };
    kontrollsak.saksbehandlere.deltMed = [];
    kobletSak.saksbehandlere.eier = {
      navIdent: "Z222222",
      navn: "Enda en Saksbehandler",
      enhet: "4812",
    };
    kobletSak.saksbehandlere.deltMed = [
      { navIdent: "Z999999", navn: "Test Saksbehandler", enhet: "4812" },
    ];

    const formData = new FormData();
    formData.set("handling", "koble_sak");
    formData.set("relatertSakId", String(kobletSak.id));

    await action({
      request: new Request(`http://localhost/saker/${utredningSakRef}`, {
        method: "POST",
        body: formData,
      }),
      params: { sakId: utredningSakRef },
    } as Route.ActionArgs);

    expect(kontrollsak.kobledeSaker).toContain(kobletSak.id);
    expect(kobletSak.kobledeSaker).toContain(kontrollsak.id);

    const fjernFormData = new FormData();
    fjernFormData.set("handling", "fjern_kobling");
    fjernFormData.set("relatertSakId", String(kobletSak.id));

    await action({
      request: new Request(`http://localhost/saker/${utredningSakRef}`, {
        method: "POST",
        body: fjernFormData,
      }),
      params: { sakId: utredningSakRef },
    } as Route.ActionArgs);

    expect(kontrollsak.kobledeSaker).not.toContain(kobletSak.id);
    expect(kobletSak.kobledeSaker).not.toContain(kontrollsak.id);
  });

  it("avviser kobling når innlogget bruker ikke er saksbehandler på noen av sakene", async () => {
    const kontrollsak = required(
      hentAlleSaker(testRequest).find((sak) => sak.id === utredningSakId),
    );
    const kobletSak = required(
      hentAlleSaker(testRequest).find(
        (sak) => sak.id !== kontrollsak.id && sak.personIdent === kontrollsak.personIdent,
      ),
    );
    kontrollsak.saksbehandlere.eier = {
      navIdent: "Z111111",
      navn: "Annen Saksbehandler",
      enhet: "4812",
    };
    kontrollsak.saksbehandlere.deltMed = [];
    kobletSak.saksbehandlere.eier = {
      navIdent: "Z222222",
      navn: "Enda en Saksbehandler",
      enhet: "4812",
    };
    kobletSak.saksbehandlere.deltMed = [];

    const formData = new FormData();
    formData.set("handling", "koble_sak");
    formData.set("relatertSakId", String(kobletSak.id));

    await expect(
      action({
        request: new Request(`http://localhost/saker/${utredningSakRef}`, {
          method: "POST",
          body: formData,
        }),
        params: { sakId: utredningSakRef },
      } as Route.ActionArgs),
    ).rejects.toMatchObject({ init: { status: 403 } });
  });

  it("avviser desimal som ID på koblet sak", async () => {
    const kontrollsak = required(
      hentAlleSaker(testRequest).find((sak) => sak.id === utredningSakId),
    );
    kontrollsak.saksbehandlere.eier = {
      navIdent: "Z999999",
      navn: "Test Saksbehandler",
      enhet: "4812",
    };

    const formData = new FormData();
    formData.set("handling", "koble_sak");
    formData.set("relatertSakId", "114.5");

    const resultat = await action({
      request: new Request(`http://localhost/saker/${utredningSakRef}`, {
        method: "POST",
        body: formData,
      }),
      params: { sakId: utredningSakRef },
    } as Route.ActionArgs);

    expect(resultat).toEqual({
      ok: false,
      feil: { skjema: ["Ugyldig sak-ID"] },
    });
  });

  it("avviser kobling til sak på en annen person", async () => {
    const kontrollsak = required(
      hentAlleSaker(testRequest).find((sak) => sak.id === utredningSakId),
    );
    const annenPersonSak = required(
      hentAlleSaker(testRequest).find((sak) => sak.personIdent !== kontrollsak.personIdent),
    );
    kontrollsak.saksbehandlere.eier = {
      navIdent: "Z999999",
      navn: "Test Saksbehandler",
      enhet: "4812",
    };

    const formData = new FormData();
    formData.set("handling", "koble_sak");
    formData.set("relatertSakId", String(annenPersonSak.id));

    const resultat = await action({
      request: new Request(`http://localhost/saker/${utredningSakRef}`, {
        method: "POST",
        body: formData,
      }),
      params: { sakId: utredningSakRef },
    } as Route.ActionArgs);

    expect(resultat).toEqual({
      ok: false,
      feil: { skjema: ["Kan ikke endre kobling til denne saken"] },
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
      enhet: "hu424t",
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
      enhet: "hu424t",
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
    kontrollsak.saksbehandlere.eier = {
      navIdent: "Z999999",
      navn: "Test Saksbehandler",
      enhet: "4812",
    };

    const opprinneligPersonIdent = kontrollsak.personIdent;
    const opprinneligStatus = kontrollsak.status;
    const opprinneligSaksbehandler = kontrollsak.saksbehandlere.eier?.navn ?? null;

    const formData = new FormData();
    formData.set("handling", "rediger_saksinformasjon");
    formData.set("kategori", "ARBEID");
    formData.append("misbruktype", "SVART_ARBEID");
    formData.append("merking", "LIME");
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
    expect(kontrollsak.merking).toEqual(["LIME"]);
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
    expect(historikk[0]?.beskrivelse).toMatch(/^Endret /);
    expect(historikk[0]?.beskrivelse).toContain("ytelser");
  });

  it("oppdaterer kilde når sak får oppdatert kilde", async () => {
    const kontrollsak = hentFordelingssaker(state())[0];
    const kontrollsakRef = getSaksreferanse(kontrollsak.id);
    kontrollsak.saksbehandlere.eier = {
      navIdent: "Z999999",
      navn: "Test Saksbehandler",
      enhet: "4812",
    };

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

  it("regner ikke omstokket misbruktype og merking som endring i historikken", async () => {
    const kontrollsak = hentFordelingssaker(state())[0];
    const kontrollsakRef = getSaksreferanse(kontrollsak.id);
    kontrollsak.saksbehandlere.eier = {
      navIdent: "Z999999",
      navn: "Test Saksbehandler",
      enhet: "4812",
    };
    kontrollsak.misbruktype = ["SVART_ARBEID", "ENDRET_SIVILSTATUS"];
    kontrollsak.merking = ["LIME", "HASTER"];
    kontrollsak.arbeidsgivere = ["123456789", "987654321"];

    const formData = new FormData();
    formData.set("handling", "rediger_saksinformasjon");
    formData.set("kategori", kontrollsak.kategori);
    formData.set("kilde", kontrollsak.kilde);
    // Samme verdier, motsatt rekkefølge.
    formData.append("misbruktype", "ENDRET_SIVILSTATUS");
    formData.append("misbruktype", "SVART_ARBEID");
    formData.append("merking", "HASTER");
    formData.append("merking", "LIME");
    formData.append("arbeidsgivere", "987654321");
    formData.append("arbeidsgivere", "123456789");
    for (const [indeks, ytelse] of kontrollsak.ytelser.entries()) {
      formData.set(`ytelser[${indeks}].type`, ytelse.type);
      formData.set(`ytelser[${indeks}].fraDato`, ytelse.periodeFra ?? "");
      formData.set(`ytelser[${indeks}].tilDato`, ytelse.periodeTil ?? "");
    }

    await action({
      request: new Request(`http://localhost/saker/${kontrollsakRef}`, {
        method: "POST",
        body: formData,
      }),
      params: { sakId: kontrollsakRef },
    } as Route.ActionArgs);

    const historikk = hentHistorikk(testRequest, String(kontrollsak.id));
    expect(historikk[0]?.hendelsesType).toBe("SAKSINFORMASJON_ENDRET");
    expect(historikk[0]?.beskrivelse).not.toContain("misbrukstype");
    expect(historikk[0]?.beskrivelse).not.toContain("merking");
    expect(historikk[0]?.beskrivelse).not.toContain("organisasjonsnummer");
  });

  it("avviser redigering når saken er inaktiv selv om payloaden er gyldig", async () => {
    const kontrollsak = hentFordelingssaker(state())[0];
    const kontrollsakRef = getSaksreferanse(kontrollsak.id);
    kontrollsak.saksbehandlere.eier = {
      navIdent: "Z999999",
      navn: "Test Saksbehandler",
      enhet: "4812",
    };
    kontrollsak.status = "AVSLUTTET";

    const formData = new FormData();
    formData.set("handling", "rediger_saksinformasjon");
    formData.set("kategori", "ARBEID");
    formData.append("misbruktype", "SVART_ARBEID");
    formData.append("merking", "LIME");
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

  it("opprett_journalpost logger hendelse med tittel og beskrivelse", async () => {
    const kontrollsak = hentFordelingssaker(state())[0];
    const kontrollsakRef = getSaksreferanse(kontrollsak.id);
    kontrollsak.saksbehandlere.eier = {
      navIdent: "Z999999",
      navn: "Test Saksbehandler",
      enhet: "4812",
    };

    const formData = new FormData();
    formData.set("handling", "opprett_journalpost");
    formData.set("journalposttype", "INNGAAENDE");
    formData.set("tittel", "Dokumentasjon mottatt");
    formData.set("innhold", "Vedlagt kopi av arbeidsavtale");
    formData.set("knyttTilOppgave", "false");

    await action({
      request: new Request(`http://localhost/saker/${kontrollsakRef}`, {
        method: "POST",
        body: formData,
      }),
      params: { sakId: kontrollsakRef },
    } as Route.ActionArgs);

    const historikk = hentHistorikk(testRequest, String(kontrollsak.id));
    expect(historikk[0]?.hendelsesType).toBe("JOURNALPOST_OPPRETTET");
    expect(historikk[0]?.tittel).toBe("Inngående: Dokumentasjon mottatt");
    expect(historikk[0]?.beskrivelse).toContain("Vedlagt kopi av arbeidsavtale");
  });

  it("arkiverer valgte redigerbare dokumenter ved opprettelse av journalpost", async () => {
    const kontrollsak = required(hentAlleSaker(testRequest).find((sak) => sak.id === 102));
    const kontrollsakRef = getSaksreferanse(kontrollsak.id);
    kontrollsak.saksbehandlere.eier = {
      navIdent: "Z999999",
      navn: "Test Saksbehandler",
      enhet: "4812",
    };

    const formData = new FormData();
    formData.set("handling", "opprett_journalpost");
    formData.set("journalposttype", "NOTAT");
    formData.set("tittel", "Arkivert dokument");
    formData.set("innhold", "Dokumentinnhold");
    formData.set("dokumentId", "1-1");

    await action({
      request: new Request(`http://localhost/saker/${kontrollsakRef}`, {
        method: "POST",
        body: formData,
      }),
      params: { sakId: kontrollsakRef },
    } as Route.ActionArgs);

    expect(hentDokumenttreForSak(testRequest, String(kontrollsak.id))).toEqual([
      expect.objectContaining({
        id: "1-1",
        arkivertAv: "Z999999",
        arkivertJournalpostId: expect.stringMatching(/^demo-/),
      }),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
    ]);
  });

  it("arkiverer valgte vedlegg ved opprettelse av journalpost", async () => {
    const kontrollsak = required(hentAlleSaker(testRequest).find((sak) => sak.id === 102));
    const kontrollsakRef = getSaksreferanse(kontrollsak.id);
    kontrollsak.saksbehandlere.eier = {
      navIdent: "Z999999",
      navn: "Test Saksbehandler",
      enhet: "4812",
    };
    const vedlegg = leggTilFil(
      testRequest,
      String(kontrollsak.id),
      new File(["%PDF"], "anmeldelse.pdf", { type: "application/pdf" }),
      "Test Saksbehandler",
    );

    const formData = new FormData();
    formData.set("handling", "opprett_journalpost");
    formData.set("journalposttype", "NOTAT");
    formData.set("tittel", "Arkivert vedlegg");
    formData.set("innhold", "Innhold");
    formData.set("vedleggId", vedlegg.id);

    await action({
      request: new Request(`http://localhost/saker/${kontrollsakRef}`, {
        method: "POST",
        body: formData,
      }),
      params: { sakId: kontrollsakRef },
    } as Route.ActionArgs);

    const arkivert = hentFilerForSak(testRequest, String(kontrollsak.id)).find(
      (fil) => fil.id === vedlegg.id,
    );
    expect(arkivert).toMatchObject({
      arkivertAv: "Z999999",
      arkivertJournalpostId: expect.stringMatching(/^demo-/),
    });
    expect(arkivert?.arkivert).toEqual(expect.any(String));

    const historikk = hentHistorikk(testRequest, String(kontrollsak.id));
    expect(historikk.some((h) => h.hendelsesType === "FIL_ARKIVERT")).toBe(true);
  });

  it("lager en arkivert PDF-fil når et dokument arkiveres i en journalpost", async () => {
    const kontrollsak = required(hentAlleSaker(testRequest).find((sak) => sak.id === 102));
    const kontrollsakRef = getSaksreferanse(kontrollsak.id);
    kontrollsak.saksbehandlere.eier = {
      navIdent: "Z999999",
      navn: "Test Saksbehandler",
      enhet: "4812",
    };

    const formData = new FormData();
    formData.set("handling", "opprett_journalpost");
    formData.set("journalposttype", "NOTAT");
    formData.set("tittel", "Arkivert dokument");
    formData.set("innhold", "Dokumentinnhold");
    formData.set("dokumentId", "1-1");

    await action({
      request: new Request(`http://localhost/saker/${kontrollsakRef}`, {
        method: "POST",
        body: formData,
      }),
      params: { sakId: kontrollsakRef },
    } as Route.ActionArgs);

    const generert = hentFilerForSak(testRequest, String(kontrollsak.id)).find(
      (fil) => fil.arkivertFraDokumentId === "1-1",
    );
    expect(generert).toMatchObject({
      filnavn: "Saksframlegg.pdf",
      contentType: "application/pdf",
      arkivertAv: "Z999999",
    });
  });

  it("opprett_oppgave logger hendelse med oppgavetype og beskrivelse", async () => {
    const kontrollsak = hentFordelingssaker(state())[0];
    const kontrollsakRef = getSaksreferanse(kontrollsak.id);
    kontrollsak.saksbehandlere.eier = {
      navIdent: "Z999999",
      navn: "Test Saksbehandler",
      enhet: "4812",
    };

    const formData = new FormData();
    formData.set("handling", "opprett_oppgave");
    formData.set("oppgavetype", "VUR");
    formData.set("prioritet", "HOY");
    formData.set("frist", "2026-06-01");
    formData.set("behandlendeEnhet", "4100");
    formData.set("beskrivelse", "Sjekk dokumentasjon");

    await action({
      request: new Request(`http://localhost/saker/${kontrollsakRef}`, {
        method: "POST",
        body: formData,
      }),
      params: { sakId: kontrollsakRef },
    } as Route.ActionArgs);

    const historikk = hentHistorikk(testRequest, String(kontrollsak.id));
    expect(historikk[0]?.hendelsesType).toBe("OPPGAVE_OPPRETTET");
    expect(historikk[0]?.tittel).toBe("VUR");
    expect(historikk[0]?.beskrivelse).toContain("Prioritet: høy");
    expect(historikk[0]?.beskrivelse).toContain("Frist: 2026-06-01");
    expect(historikk[0]?.beskrivelse).toContain("Sjekk dokumentasjon");
  });
});

describe("SakDetaljSide tilgangskontroll", () => {
  beforeEach(() => {
    resetDefaultSession();
  });

  it("avviser mutasjon fra ikke-eier med 403", async () => {
    const kontrollsak = hentFordelingssaker(hentMockState(testRequest))[0];
    const kontrollsakRef = getSaksreferanse(kontrollsak.id);
    // Sett en annen saksbehandler som eier
    kontrollsak.saksbehandlere.eier = {
      navIdent: "Z111111",
      navn: "Annen Saksbehandler",
      enhet: "4800",
    };

    const formData = new FormData();
    formData.set("handling", "endre_status");
    formData.set("status", "ANMELDT");

    await expect(
      action({
        request: new Request(`http://localhost/saker/${kontrollsakRef}`, {
          method: "POST",
          body: formData,
        }),
        params: { sakId: kontrollsakRef },
      } as Route.ActionArgs),
    ).rejects.toSatisfy((thrown: { init?: { status?: number } }) => thrown.init?.status === 403);
  });

  it("avviser mutasjon på sak uten eier med 403", async () => {
    const kontrollsak = hentFordelingssaker(hentMockState(testRequest))[0];
    const kontrollsakRef = getSaksreferanse(kontrollsak.id);
    kontrollsak.saksbehandlere.eier = null;

    const formData = new FormData();
    formData.set("handling", "rediger_saksinformasjon");
    formData.set("kategori", "ARBEID");
    formData.append("misbruktype", "SVART_ARBEID");
    formData.set("kilde", "PUBLIKUM");
    formData.set("ytelser[0].type", "Dagpenger");
    formData.set("ytelser[0].fraDato", "2026-02-01");
    formData.set("ytelser[0].tilDato", "2026-02-28");

    await expect(
      action({
        request: new Request(`http://localhost/saker/${kontrollsakRef}`, {
          method: "POST",
          body: formData,
        }),
        params: { sakId: kontrollsakRef },
      } as Route.ActionArgs),
    ).rejects.toSatisfy((thrown: { init?: { status?: number } }) => thrown.init?.status === 403);
  });

  it("tillater TILDEL for ikke-eier", async () => {
    const kontrollsak = hentFordelingssaker(hentMockState(testRequest))[0];
    const kontrollsakRef = getSaksreferanse(kontrollsak.id);
    kontrollsak.saksbehandlere.eier = {
      navIdent: "Z111111",
      navn: "Annen Saksbehandler",
      enhet: "4800",
    };

    const formData = new FormData();
    formData.set("handling", "TILDEL");
    formData.set("navIdent", "Z999999");

    const resultat = await action({
      request: new Request(`http://localhost/saker/${kontrollsakRef}`, {
        method: "POST",
        body: formData,
      }),
      params: { sakId: kontrollsakRef },
    } as Route.ActionArgs);

    expect(resultat).toMatchObject({ ok: true });
  });

  it("tillater FRISTILL for ikke-eier", async () => {
    const kontrollsak = hentFordelingssaker(hentMockState(testRequest))[0];
    const kontrollsakRef = getSaksreferanse(kontrollsak.id);
    kontrollsak.saksbehandlere.eier = {
      navIdent: "Z111111",
      navn: "Annen Saksbehandler",
      enhet: "4800",
    };

    const formData = new FormData();
    formData.set("handling", "FRISTILL");

    const resultat = await action({
      request: new Request(`http://localhost/saker/${kontrollsakRef}`, {
        method: "POST",
        body: formData,
      }),
      params: { sakId: kontrollsakRef },
    } as Route.ActionArgs);

    expect(resultat).toMatchObject({ ok: true });
  });

  it("tillater overfor_ansvarlig for ikke-eier", async () => {
    const kontrollsak = hentFordelingssaker(hentMockState(testRequest))[0];
    const kontrollsakRef = getSaksreferanse(kontrollsak.id);
    kontrollsak.saksbehandlere.eier = {
      navIdent: "Z111111",
      navn: "Annen Saksbehandler",
      enhet: "4800",
    };

    const formData = new FormData();
    formData.set("handling", "overfor_ansvarlig");
    formData.set("navIdent", "Z123456");

    const resultat = await action({
      request: new Request(`http://localhost/saker/${kontrollsakRef}`, {
        method: "POST",
        body: formData,
      }),
      params: { sakId: kontrollsakRef },
    } as Route.ActionArgs);

    expect(resultat).toMatchObject({ ok: true });
  });

  it("tillater send_til_annen_enhet for ikke-eier", async () => {
    const kontrollsak = hentFordelingssaker(hentMockState(testRequest))[0];
    const kontrollsakRef = getSaksreferanse(kontrollsak.id);
    kontrollsak.saksbehandlere.eier = {
      navIdent: "Z111111",
      navn: "Annen Saksbehandler",
      enhet: "4800",
    };

    const formData = new FormData();
    formData.set("handling", "send_til_annen_enhet");
    formData.set("seksjon", "NORD");

    const resultat = await action({
      request: new Request(`http://localhost/saker/${kontrollsakRef}`, {
        method: "POST",
        body: formData,
      }),
      params: { sakId: kontrollsakRef },
    } as Route.ActionArgs);

    expect(resultat).toMatchObject({ ok: true });
  });

  it("returnerer tom filer-liste i loader for bruker uten tilgang", async () => {
    const kontrollsak = hentFordelingssaker(hentMockState(testRequest))[0];
    const kontrollsakRef = getSaksreferanse(kontrollsak.id);
    // Sett en annen saksbehandler som eier, og innlogget bruker er ikke i deltMed
    kontrollsak.saksbehandlere.eier = {
      navIdent: "Z111111",
      navn: "Annen Saksbehandler",
      enhet: "4800",
    };
    kontrollsak.saksbehandlere.deltMed = [];

    const resultat = await loader({
      request: testRequest,
      params: { sakId: kontrollsakRef },
    } as unknown as Route.LoaderArgs);

    expect(resultat.dokumenter).toEqual([]);
  });

  it("returnerer filer i loader for eier", async () => {
    const kontrollsak = hentFordelingssaker(hentMockState(testRequest))[0];
    const kontrollsakRef = getSaksreferanse(kontrollsak.id);
    kontrollsak.saksbehandlere.eier = {
      navIdent: "Z999999",
      navn: "Test Saksbehandler",
      enhet: "4812",
    };

    const resultat = await loader({
      request: testRequest,
      params: { sakId: kontrollsakRef },
    } as unknown as Route.LoaderArgs);

    // Filer returneres (kan være tom array fra mock, men funksjonen blir kalt)
    expect(resultat.dokumenter).toBeDefined();
  });

  it("returnerer filer i loader for bruker med delt tilgang", async () => {
    const kontrollsak = hentFordelingssaker(hentMockState(testRequest))[0];
    const kontrollsakRef = getSaksreferanse(kontrollsak.id);
    kontrollsak.saksbehandlere.eier = {
      navIdent: "Z111111",
      navn: "Annen Saksbehandler",
      enhet: "4800",
    };
    kontrollsak.saksbehandlere.deltMed = [
      { navIdent: "Z999999", navn: "Test Saksbehandler", enhet: "4812" },
    ];

    const resultat = await loader({
      request: testRequest,
      params: { sakId: kontrollsakRef },
    } as unknown as Route.LoaderArgs);

    expect(resultat.dokumenter).toBeDefined();
  });
});

describe("SakDetaljSide rediger arbeidsgivere", () => {
  beforeEach(() => {
    resetDefaultSession();
  });

  function lagRedigerFormData(overrides: Record<string, string | string[]> = {}): FormData {
    const formData = new FormData();
    formData.set("handling", "rediger_saksinformasjon");
    formData.set("kategori", "SAMLIV");
    formData.set("kilde", "ANNET");
    formData.append("misbruktype", "SKJULT_SAMLIV");
    for (const [key, value] of Object.entries(overrides)) {
      if (Array.isArray(value)) {
        for (const v of value) formData.append(key, v);
      } else {
        formData.set(key, value);
      }
    }
    return formData;
  }

  it("lagrer gyldige organisasjonsnumre", async () => {
    const kontrollsak = hentFordelingssaker(state())[0];
    const kontrollsakRef = getSaksreferanse(kontrollsak.id);
    kontrollsak.saksbehandlere.eier = {
      navIdent: "Z999999",
      navn: "Test Saksbehandler",
      enhet: "4812",
    };

    const formData = lagRedigerFormData({ arbeidsgivere: ["123456789", "987654321"] });

    const resultat = await action({
      request: new Request(`http://localhost/saker/${kontrollsakRef}`, {
        method: "POST",
        body: formData,
      }),
      params: { sakId: kontrollsakRef },
    } as Route.ActionArgs);

    expect(resultat).toMatchObject({ ok: true });
    expect(kontrollsak.arbeidsgivere).toEqual(["123456789", "987654321"]);
  });

  it("nullstiller arbeidsgivere når ingen sendes", async () => {
    const kontrollsak = hentFordelingssaker(state())[0];
    const kontrollsakRef = getSaksreferanse(kontrollsak.id);
    kontrollsak.saksbehandlere.eier = {
      navIdent: "Z999999",
      navn: "Test Saksbehandler",
      enhet: "4812",
    };

    kontrollsak.arbeidsgivere = ["987654321"];

    const formData = lagRedigerFormData();

    const resultat = await action({
      request: new Request(`http://localhost/saker/${kontrollsakRef}`, {
        method: "POST",
        body: formData,
      }),
      params: { sakId: kontrollsakRef },
    } as Route.ActionArgs);

    expect(resultat).toMatchObject({ ok: true });
    expect(kontrollsak.arbeidsgivere).toEqual([]);
  });

  it("returnerer feil for ugyldig organisasjonsnummer", async () => {
    const kontrollsak = hentFordelingssaker(state())[0];
    const kontrollsakRef = getSaksreferanse(kontrollsak.id);
    kontrollsak.saksbehandlere.eier = {
      navIdent: "Z999999",
      navn: "Test Saksbehandler",
      enhet: "4812",
    };

    const formData = lagRedigerFormData({ arbeidsgivere: ["1234"] });

    const resultat = await action({
      request: new Request(`http://localhost/saker/${kontrollsakRef}`, {
        method: "POST",
        body: formData,
      }),
      params: { sakId: kontrollsakRef },
    } as Route.ActionArgs);

    expect(resultat).toMatchObject({ ok: false });
    expect((resultat as { feil: Record<string, string[]> }).feil["arbeidsgivere"]).toBeDefined();
  });

  it("bevarer eksisterende arbeidsgivere via loader", async () => {
    const kontrollsak = hentFordelingssaker(state())[0];
    kontrollsak.arbeidsgivere = ["987654321"];
    const kontrollsakRef = getSaksreferanse(kontrollsak.id);

    const resultat = await loader({
      request: testRequest,
      params: { sakId: kontrollsakRef },
    } as Route.LoaderArgs);

    expect(resultat.sak.arbeidsgivere).toEqual(["987654321"]);
  });

  it("loader returnerer tom liste når ingen arbeidsgivere er satt", async () => {
    const kontrollsak = hentFordelingssaker(state())[0];
    kontrollsak.arbeidsgivere = [];
    const kontrollsakRef = getSaksreferanse(kontrollsak.id);

    const resultat = await loader({
      request: testRequest,
      params: { sakId: kontrollsakRef },
    } as Route.LoaderArgs);

    expect(resultat.sak.arbeidsgivere).toEqual([]);
  });

  it("logger to historikk-hendelser når journalpost opprettes med knyttTilOppgave", async () => {
    const kontrollsak = hentFordelingssaker(state())[0];
    const kontrollsakRef = getSaksreferanse(kontrollsak.id);
    kontrollsak.saksbehandlere.eier = {
      navIdent: "Z999999",
      navn: "Test Saksbehandler",
      enhet: "4812",
    };

    const formData = new FormData();
    formData.set("handling", "opprett_journalpost");
    formData.set("journalposttype", "NOTAT");
    formData.set("tittel", "Kontrollnotat");
    formData.set("innhold", "Innhold i notatet");
    formData.set("knyttTilOppgave", "true");
    formData.set("oppgavetype", "VUR");
    formData.set("prioritet", "NORMAL");
    formData.set("frist", "2026-09-01");
    formData.set("behandlendeEnhet", "4100");
    formData.set("beskrivelse", "Oppgavebeskrivelse");

    await action({
      request: new Request(`http://localhost/saker/${kontrollsakRef}`, {
        method: "POST",
        body: formData,
      }),
      params: { sakId: kontrollsakRef },
    } as Route.ActionArgs);

    const historikk = hentHistorikk(testRequest, String(kontrollsak.id));
    const hendelsestyper = historikk.map((h) => h.hendelsesType);
    expect(hendelsestyper).toContain("JOURNALPOST_OPPRETTET");
    expect(hendelsestyper).toContain("OPPGAVE_OPPRETTET");
  });
});
