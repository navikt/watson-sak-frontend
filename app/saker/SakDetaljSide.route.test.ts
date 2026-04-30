import { beforeEach, describe, expect, it } from "vitest";
import { mockKontrollsaker } from "~/fordeling/mock-data.server";
import { resetMockSaker } from "~/fordeling/mock-data.server";
import { resetMockMineSaker } from "~/mine-saker/mock-data.server";
import { getSaksreferanse } from "~/saker/id";
import { lagMockSakUuid } from "~/saker/mock-uuid";
import { getBeskrivelse, getKildeText, getPersonIdent, getYtelseTyper } from "~/saker/visning";
import type { Route } from "./+types/SakDetaljSide.route";
import { hentHistorikk, resetHistorikk } from "./historikk/mock-data.server";
import { hentAlleSaker } from "./mock-alle-saker.server";
import { action, loader } from "./SakDetaljSide.route";

describe("SakDetaljSide action", () => {
  const utredningSakId = lagMockSakUuid("113", 1);
  const utredningSakRef = getSaksreferanse(utredningSakId);

  beforeEach(() => {
    resetMockSaker();
    resetMockMineSaker();
    resetHistorikk();
  });

  it("eksponerer tildeling som tilgjengelig handling når kontrollsaken er ownerløs under utredning", async () => {
    const sak = hentAlleSaker().find((sak) => sak.id === utredningSakId);

    expect(sak?.status).toBe("UTREDES");

    expect(sak?.tilgjengeligeHandlinger.some((handling) => handling.handling === "TILDEL")).toBe(
      true,
    );
  });

  it("legger til delt saksbehandler og logger historikk", async () => {
    const kontrollsak = mockKontrollsaker[1];
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
        enhet: "Seksjon A",
        navIdent: "Z123456",
      },
    ]);

    const historikk = hentHistorikk(kontrollsak.id);
    expect(historikk[0]?.hendelsesType).toBe("TILGANG_DELT");
    expect(historikk[0]?.berortSaksbehandlerNavn).toBe("Kari Nordmann");
  });

  it("fjerner delt saksbehandler og logger historikk", async () => {
    const kontrollsak = mockKontrollsaker[0];
    const kontrollsakRef = getSaksreferanse(kontrollsak.id);

    expect(kontrollsak.saksbehandlere?.deltMed).toEqual([
      {
        navn: "Kari Nordmann",
        enhet: "Seksjon A",
        navIdent: "Z123456",
      },
      {
        navn: "Ada Larsen",
        enhet: "Seksjon B",
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
        enhet: "Seksjon B",
        navIdent: "Z234567",
      },
    ]);

    const historikk = hentHistorikk(kontrollsak.id);
    expect(historikk[0]?.hendelsesType).toBe("TILGANG_FJERNET");
    expect(historikk[0]?.berortSaksbehandlerNavn).toBe("Kari Nordmann");
  });

  it("overfører ansvarlig saksbehandler, fjerner vedkommende fra delt med og logger historikk", async () => {
    const kontrollsak = mockKontrollsaker[0];
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
        enhet: "Seksjon B",
        navIdent: "Z234567",
      },
    ]);

    const historikk = hentHistorikk(kontrollsak.id);
    expect(historikk[0]?.hendelsesType).toBe("ANSVARLIG_SAKSBEHANDLER_ENDRET");
    expect(historikk[0]?.berortSaksbehandlerNavIdent).toBe("Z123456");
  });

  it("returnerer lokal feilmelding når koble sak ikke er tilgjengelig ennå", async () => {
    const formData = new FormData();
    formData.set("handling", "koble_sak");
    formData.set("relatertSakId", lagMockSakUuid("114", 1));

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
  const fordelingSakId = lagMockSakUuid("101", 1);

  beforeEach(() => {
    resetMockSaker();
    resetMockMineSaker();
  });

  it("leser personident, kilde, ytelser og beskrivelse via helpers for backend-shapede saker", () => {
    const sak = hentAlleSaker().find((sak) => sak.id === fordelingSakId);

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
    const sak = hentAlleSaker().find((eksisterendeSak) => eksisterendeSak.id === fordelingSakId);

    expect(sak).toBeDefined();

    if (!sak) {
      throw new Error("Fant ikke forventet legacy-sak i testdata");
    }

    expect("personIdent" in sak).toBe(true);
  });
});

describe("SakDetaljSide kontrollsak-runtime", () => {
  const mineSakId = lagMockSakUuid("201", 2);
  const mineSakRef = getSaksreferanse(mineSakId);

  beforeEach(() => {
    resetMockSaker();
    resetMockMineSaker();
    resetHistorikk();
  });

  it("loader returnerer backend-shapet kontrollsak når sakId peker på kontrollsak", () => {
    const kontrollsakId = mockKontrollsaker[0].id;
    const kontrollsakRef = getSaksreferanse(kontrollsakId);

    const resultat = loader({ params: { sakId: kontrollsakRef } } as Route.LoaderArgs);

    expect(resultat.sak.id).toBe(kontrollsakId);
    expect("personIdent" in resultat.sak).toBe(true);
    expect(Array.isArray(resultat.andreSaker)).toBe(true);
    expect(resultat.andreSaker.every((s) => s.personIdent === resultat.sak.personIdent)).toBe(true);
    expect(resultat.andreSaker.every((s) => s.id !== resultat.sak.id)).toBe(true);
  });

  it("loader returnerer backend-shapet mine sak når sakId peker på backend-shaped mine saker", () => {
    const resultat = loader({ params: { sakId: mineSakRef } } as Route.LoaderArgs);

    expect(resultat.sak.id).toBe(mineSakId);
    expect("personIdent" in resultat.sak).toBe(true);
    expect(Array.isArray(resultat.andreSaker)).toBe(true);
  });

  it("beholder hentAlleSaker som backend-shaped aggregat", () => {
    const saker = hentAlleSaker();

    expect(saker.length).toBeGreaterThan(0);
    expect(saker.every((sak) => "personIdent" in sak)).toBe(true);
  });

  it("beholder kontrollsak-status og setter owner ved tildeling", async () => {
    const kontrollsak = mockKontrollsaker[0];
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
    const kontrollsak = mockKontrollsaker[0];
    const kontrollsakRef = getSaksreferanse(kontrollsak.id);

    kontrollsak.status = "OPPRETTET";
    kontrollsak.saksbehandlere.eier = null;
    kontrollsak.saksbehandlere.opprettetAv = {
      navn: "Tidligere Saksbehandler",
      navIdent: "Z999999",
      enhet: "Seksjon A",
    };

    expect(kontrollsak.status).toBe("OPPRETTET");
    expect(kontrollsak.saksbehandlere.eier).toBeNull();
    kontrollsak.tilgjengeligeHandlinger = [
      {
        handling: "TILDEL",
        pakrevdeFelter: [{ felt: "navIdent", tillatteVerdier: [] }],
        resultatStatus: "OPPRETTET",
      },
    ];

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
      enhet: "Seksjon A",
    });
  });

  it("tildeler ownerløs sak til lokal mock-bruker", async () => {
    const kontrollsak = mockKontrollsaker[0];
    const kontrollsakRef = getSaksreferanse(kontrollsak.id);

    kontrollsak.status = "OPPRETTET";
    kontrollsak.iBero = false;
    kontrollsak.saksbehandlere.eier = null;
    kontrollsak.tilgjengeligeHandlinger = [
      {
        handling: "TILDEL",
        pakrevdeFelter: [{ felt: "navIdent", tillatteVerdier: [] }],
        resultatStatus: "OPPRETTET",
      },
    ];

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
      enhet: "Seksjon A",
    });
  });

  it("oppdaterer fallback-enhet når ownerløs sak videresendes til seksjon", async () => {
    const kontrollsak = mockKontrollsaker[0];
    const kontrollsakRef = getSaksreferanse(kontrollsak.id);

    kontrollsak.status = "OPPRETTET";
    kontrollsak.saksbehandlere.eier = null;
    kontrollsak.saksbehandlere.opprettetAv = {
      navn: "Tidligere Saksbehandler",
      navIdent: "Z999999",
      enhet: "Seksjon A",
    };

    expect(kontrollsak.saksbehandlere.eier).toBeNull();
    expect(kontrollsak.saksbehandlere.opprettetAv.enhet).toBe("Seksjon A");

    const formData = new FormData();
    formData.set("handling", "videresend_seksjon");
    formData.set("seksjon", "Seksjon B");

    await action({
      request: new Request(`http://localhost/saker/${kontrollsakRef}`, {
        method: "POST",
        body: formData,
      }),
      params: { sakId: kontrollsakRef },
    } as Route.ActionArgs);

    expect(kontrollsak.saksbehandlere.opprettetAv.enhet).toBe("Seksjon B");
  });

  it("oppdaterer redigerbare saksdetaljer uten å endre låste felt", async () => {
    const kontrollsak = mockKontrollsaker[0];
    const kontrollsakRef = getSaksreferanse(kontrollsak.id);

    const opprinneligPersonIdent = kontrollsak.personIdent;
    const opprinneligStatus = kontrollsak.status;
    const opprinneligSaksbehandler = kontrollsak.saksbehandlere.eier?.navn ?? null;

    const formData = new FormData();
    formData.set("handling", "rediger_saksinformasjon");
    formData.set("kategori", "ARBEID");
    formData.set("misbruktype", "SVART_ARBEID");
    formData.set("merking", "PRIORITERT");
    formData.set("kilde", "PUBLIKUM");
    formData.set("fraDato", "2026-02-01");
    formData.set("tilDato", "2026-02-28");
    formData.append("ytelser", "Dagpenger");
    formData.append("ytelser", "Sykepenger");
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

    const historikk = hentHistorikk(kontrollsak.id);
    expect(historikk[0]?.hendelsesType).toBe("SAKSINFORMASJON_ENDRET");
  });

  it("oppdaterer kilde når sak får oppdatert kilde", async () => {
    const kontrollsak = mockKontrollsaker[0];
    const kontrollsakRef = getSaksreferanse(kontrollsak.id);

    const formData = new FormData();
    formData.set("handling", "rediger_saksinformasjon");
    formData.set("kategori", kontrollsak.kategori);
    formData.set("misbruktype", "ENDRET_SIVILSTATUS");
    formData.set("kilde", "PUBLIKUM");
    formData.set("fraDato", "2026-01-13");
    formData.set("tilDato", "2026-01-13");
    formData.append("ytelser", "Barnetrygd");

    await action({
      request: new Request(`http://localhost/saker/${kontrollsakRef}`, {
        method: "POST",
        body: formData,
      }),
      params: { sakId: kontrollsakRef },
    } as Route.ActionArgs);

    const oppdatertSak = hentAlleSaker().find((sak) => sak.id === kontrollsak.id);

    if (!oppdatertSak) {
      throw new Error("Forventet at saken finnes etter oppdatering");
    }

    expect(oppdatertSak.kilde).toBe("PUBLIKUM");
  });

  it("avviser redigering når saken ikke følger støttet redigeringsmodell", async () => {
    const kontrollsak = mockKontrollsaker[0];
    const kontrollsakRef = getSaksreferanse(kontrollsak.id);

    kontrollsak.misbruktype = ["ENDRET_SIVILSTATUS", "SKJULT_SAMLIV"];

    const formData = new FormData();
    formData.set("handling", "rediger_saksinformasjon");
    formData.set("kategori", "ARBEID");
    formData.set("misbruktype", "SVART_ARBEID");
    formData.set("merking", "PRIORITERT");
    formData.set("kilde", "PUBLIKUM");
    formData.set("fraDato", "2026-02-01");
    formData.set("tilDato", "2026-02-28");
    formData.append("ytelser", "Dagpenger");

    const resultat = await action({
      request: new Request(`http://localhost/saker/${kontrollsakRef}`, {
        method: "POST",
        body: formData,
      }),
      params: { sakId: kontrollsakRef },
    } as Route.ActionArgs);

    expect(resultat).toEqual({
      ok: false,
      feil: { skjema: ["Saken kan ikke redigeres med denne løsningen ennå."] },
    });
    expect(kontrollsak.kategori).not.toBe("ARBEID");
    expect(kontrollsak.misbruktype).toEqual(["ENDRET_SIVILSTATUS", "SKJULT_SAMLIV"]);
  });

  it("avviser redigering når saken er inaktiv selv om payloaden er gyldig", async () => {
    const kontrollsak = mockKontrollsaker[0];
    const kontrollsakRef = getSaksreferanse(kontrollsak.id);
    kontrollsak.status = "AVSLUTTET";

    const formData = new FormData();
    formData.set("handling", "rediger_saksinformasjon");
    formData.set("kategori", "ARBEID");
    formData.set("misbruktype", "SVART_ARBEID");
    formData.set("merking", "PRIORITERT");
    formData.set("kilde", "PUBLIKUM");
    formData.set("fraDato", "2026-02-01");
    formData.set("tilDato", "2026-02-28");
    formData.append("ytelser", "Dagpenger");

    const resultat = await action({
      request: new Request(`http://localhost/saker/${kontrollsakRef}`, {
        method: "POST",
        body: formData,
      }),
      params: { sakId: kontrollsakRef },
    } as Route.ActionArgs);

    expect(resultat).toEqual({
      ok: false,
      feil: { skjema: ["Saken kan ikke redigeres med denne løsningen ennå."] },
    });
    expect(kontrollsak.status).toBe("AVSLUTTET");
    expect(kontrollsak.kategori).not.toBe("ARBEID");
  });

  it("avviser redigering når saken har ulike perioder per ytelse", async () => {
    const kontrollsak = mockKontrollsaker[0];
    const kontrollsakRef = getSaksreferanse(kontrollsak.id);
    kontrollsak.ytelser = [
      {
        id: crypto.randomUUID(),
        type: "Dagpenger",
        periodeFra: "2026-02-01",
        periodeTil: "2026-02-15",
        belop: null,
      },
      {
        id: crypto.randomUUID(),
        type: "Sykepenger",
        periodeFra: "2026-03-01",
        periodeTil: "2026-03-31",
        belop: null,
      },
    ];

    const formData = new FormData();
    formData.set("handling", "rediger_saksinformasjon");
    formData.set("kategori", "ARBEID");
    formData.set("misbruktype", "SVART_ARBEID");
    formData.set("merking", "PRIORITERT");
    formData.set("kilde", "PUBLIKUM");
    formData.set("fraDato", "2026-02-01");
    formData.set("tilDato", "2026-02-28");
    formData.append("ytelser", "Dagpenger");

    const resultat = await action({
      request: new Request(`http://localhost/saker/${kontrollsakRef}`, {
        method: "POST",
        body: formData,
      }),
      params: { sakId: kontrollsakRef },
    } as Route.ActionArgs);

    expect(resultat).toEqual({
      ok: false,
      feil: { skjema: ["Saken kan ikke redigeres med denne løsningen ennå."] },
    });
    expect(kontrollsak.ytelser.map((ytelse) => ytelse.type)).toEqual(["Dagpenger", "Sykepenger"]);
  });
});
