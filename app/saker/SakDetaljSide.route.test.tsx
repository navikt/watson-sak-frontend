import { describe, expect, it, beforeEach, vi } from "vitest";
import type { KontrollsakResponse } from "./types.backend";
import { action } from "./SakDetaljSide.server";
import { hentHistorikk } from "./historikk/mock-data.server";
import { hentAlleSaker } from "./mock-alle-saker.server";
import { hentMockTillatteHandlinger } from "./mock-tillatte-handlinger.server";
import { resetDefaultSession } from "~/testing/mock-store/session.server";
import { getSaksreferanse } from "./id";

vi.mock("~/config/env.server", () => ({
  skalBrukeMockdata: true,
}));

vi.mock("~/auth/innlogget-bruker.server", () => ({
  hentInnloggetBruker: () =>
    Promise.resolve({
      preferredUsername: "test",
      name: "Saks Behandlersen",
      navIdent: "Z999999",
      enhet: "4812",
    }),
}));

const testRequest = new Request("http://localhost");

/** Setter innlogget bruker som eier av saken, slik at tilgangskontroll tillater mutasjoner. */
function settInnloggetSomEier(sak: KontrollsakResponse) {
  sak.saksbehandlere.eier = { navIdent: "Z999999", navn: "Test Saksbehandler", enhet: "4812" };
}

function lagFormData(felter: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(felter)) {
    formData.append(key, value);
  }
  return formData;
}

async function utforAction(sakId: string, felter: Record<string, string>) {
  const request = new Request("http://localhost", {
    method: "POST",
    body: lagFormData(felter),
  });

  return action({ request, params: { sakId } } as never);
}

describe("SakDetaljSide route action – steg- og statusflyt", () => {
  beforeEach(() => {
    resetDefaultSession();
  });

  it("endre_steg oppdaterer sakens steg", async () => {
    const saker = hentAlleSaker(testRequest);
    const sak = saker.find((s: KontrollsakResponse) => s.steg === "OPPRETTET");
    expect(sak).toBeDefined();
    if (!sak) return;
    settInnloggetSomEier(sak);

    const { getSaksreferanse } = await import("./id");
    const sakId = getSaksreferanse(sak.id);

    const resultat = await utforAction(sakId, {
      handling: "endre_steg",
      steg: "UTREDNING",
    });

    expect(resultat).toEqual({ ok: true });
    expect(sak.steg).toBe("UTREDNING");
    expect(sak.status).toBe("AKTIV");

    const historikk = hentHistorikk(testRequest, sak.id);
    expect(historikk[0]?.hendelsesType).toBe("STATUS_ENDRET");
  });

  it("endre_steg med beskrivelse lagrer hendelse med beskrivelse", async () => {
    const saker = hentAlleSaker(testRequest);
    const sak = saker.find((s: KontrollsakResponse) => s.steg === "OPPRETTET");
    expect(sak).toBeDefined();
    if (!sak) return;
    settInnloggetSomEier(sak);

    const { getSaksreferanse } = await import("./id");
    const sakId = getSaksreferanse(sak.id);

    const resultat = await utforAction(sakId, {
      handling: "endre_steg",
      steg: "STRAFFERETTSLIG_VURDERING",
      beskrivelse: "Saken tas videre til utredning",
    });

    expect(resultat).toEqual({ ok: true });

    const historikk = hentHistorikk(testRequest, sak.id);
    expect(historikk[0]?.beskrivelse).toBe("Saken tas videre til utredning");
  });

  it("henlegger saken før den flyttes til avsluttet", async () => {
    const saker = hentAlleSaker(testRequest);
    const sak = saker.find((s: KontrollsakResponse) => s.steg === "UTREDES");
    expect(sak).toBeDefined();
    if (!sak) return;
    settInnloggetSomEier(sak);

    const { getSaksreferanse } = await import("./id");
    const sakId = getSaksreferanse(sak.id);

    await utforAction(sakId, {
      handling: "henlegg",
      "resultat.utredning.henleggelsesarsak": "IKKE_KAPASITET",
    });

    expect(sak.steg).toBe("UTREDES");
    expect(sak.resultat?.utredning?.type).toBe("HENLAGT");

    await expect(
      utforAction(sakId, {
        handling: "henlegg",
        "resultat.utredning.henleggelsesarsak": "FORELDET",
      }),
    ).rejects.toMatchObject({ init: { status: 409 } });
    expect(sak.resultat?.utredning?.henleggelsesarsak).toBe("IKKE_KAPASITET");

    await utforAction(sakId, {
      handling: "endre_steg",
      steg: "AVSLUTTET",
    });

    expect(sak.status).toBeNull();
    expect(sak.steg).toBe("AVSLUTTET");
    expect(sak.resultat?.utredning?.type).toBe("HENLAGT");

    const historikk = hentHistorikk(testRequest, sak.id);
    expect(historikk[0]?.hendelsesType).toBe("STATUS_ENDRET");
    expect(historikk[0]?.status).toBeNull();
  });

  it.each([
    ["HENLAGT", "IKKE_KAPASITET"],
    ["KONTROLLNOTAT", null],
  ])("avslutter fra Forvaltning som %s uten endelig beløp", async (type, arsak) => {
    const sak = hentAlleSaker(testRequest).find((s: KontrollsakResponse) => s.steg === "UTREDES");
    expect(sak).toBeDefined();
    if (!sak) return;
    settInnloggetSomEier(sak);
    sak.steg = "FORVALTNING";
    sak.status = "VENTER_PA_VEDTAK";
    sak.resultat = null;
    sak.ytelser = sak.ytelser.map((ytelse) => ({ ...ytelse, endeligBelop: null }));

    const resultat = await utforAction(getSaksreferanse(sak.id), {
      handling: "endre_steg_dialog",
      steg: "AVSLUTTET",
      registrerResultat: "true",
      "resultat.forvaltning.type": "SAKEN_SKAL_IKKE_VURDERES_FOR_ANMELDELSE",
      "resultat.forvaltning.endeligUtfall.type": type,
      ...(arsak ? { "resultat.forvaltning.endeligUtfall.henleggelsesarsak": arsak } : {}),
    });

    expect(resultat).toEqual({ ok: true });
    expect(sak.steg).toBe("AVSLUTTET");
    expect(sak.resultat?.forvaltning?.endeligUtfall?.type).toBe(type);
    expect(sak.ytelser.every((ytelse) => ytelse.endeligBelop === null)).toBe(true);
  });

  it("avslutter henlagt Forvaltning uten endelig beløp", async () => {
    const sak = hentAlleSaker(testRequest).find((s: KontrollsakResponse) => s.steg === "UTREDES");
    expect(sak).toBeDefined();
    if (!sak) return;
    settInnloggetSomEier(sak);
    sak.steg = "FORVALTNING";
    sak.status = "VENTER_PA_VEDTAK";
    sak.ytelser = sak.ytelser.map((ytelse) => ({ ...ytelse, endeligBelop: null }));

    const sakId = getSaksreferanse(sak.id);
    await utforAction(sakId, {
      handling: "henlegg",
      "resultat.forvaltning.endeligUtfall.henleggelsesarsak": "IKKE_KAPASITET",
    });

    const handlinger = hentMockTillatteHandlinger(sak);
    expect(handlinger.tillatteSteg).toEqual(["AVSLUTTET"]);
    expect(handlinger.handlinger.map((handling) => handling.type)).not.toContain("HENLEGG");
    expect(sak.ytelser.every((ytelse) => ytelse.endeligBelop === null)).toBe(true);

    await utforAction(sakId, { handling: "endre_steg", steg: "AVSLUTTET" });
    expect(sak.steg).toBe("AVSLUTTET");
  });

  it("endre_status setter status på saken", async () => {
    const saker = hentAlleSaker(testRequest);
    const sak = saker.find((s: KontrollsakResponse) => s.steg === "UTREDES" && s.status === null);
    expect(sak).toBeDefined();
    if (!sak) return;
    settInnloggetSomEier(sak);

    const { getSaksreferanse } = await import("./id");
    const sakId = getSaksreferanse(sak.id);

    const resultat = await utforAction(sakId, {
      handling: "endre_status",
      status: "VENTER_PA_INFORMASJON",
    });

    expect(resultat).toEqual({ ok: true });
    expect(sak.status).toBe("VENTER_PA_INFORMASJON");

    const historikk = hentHistorikk(testRequest, sak.id);
    expect(historikk[0]?.hendelsesType).toBe("SAK_SATT_PA_VENT");
    expect(historikk[0]?.status).toBe("VENTER_PA_INFORMASJON");
  });

  it("endre_status med I_BERO logger bero-hendelse", async () => {
    const saker = hentAlleSaker(testRequest);
    const sak = saker.find((s: KontrollsakResponse) => s.steg === "UTREDES" && s.status === null);
    expect(sak).toBeDefined();
    if (!sak) return;
    settInnloggetSomEier(sak);

    const { getSaksreferanse } = await import("./id");
    const sakId = getSaksreferanse(sak.id);

    const resultat = await utforAction(sakId, {
      handling: "sett_i_bero",
    });

    expect(resultat).toEqual({ ok: true });

    const historikk = hentHistorikk(testRequest, sak.id);
    expect(historikk[0]?.hendelsesType).toBe("SAK_SATT_I_BERO");
    expect(historikk[0]?.status).toBe("I_BERO");
  });

  it("gjenoppretter statusen saken faktisk hadde før bero i mockflyten", async () => {
    const sak = hentAlleSaker(testRequest).find(
      (s: KontrollsakResponse) => s.steg === "UTREDES" && s.status !== "I_BERO",
    );
    expect(sak).toBeDefined();
    if (!sak) return;
    settInnloggetSomEier(sak);
    sak.status = "VENTER_PA_INFORMASJON";
    const sakId = getSaksreferanse(sak.id);

    await utforAction(sakId, { handling: "sett_i_bero" });
    expect(hentMockTillatteHandlinger(sak).tilstand.statusFørBero).toBe("VENTER_PA_INFORMASJON");

    await utforAction(sakId, { handling: "ta_ut_av_bero" });
    expect(sak.status).toBe("VENTER_PA_INFORMASJON");
    expect(sak.statusFørBero).toBeNull();
  });

  it("registrerer resultat fra feltene i mockskjemaet", async () => {
    const sak = hentAlleSaker(testRequest).find(
      (s: KontrollsakResponse) => s.steg === "UTREDES" && s.status !== "I_BERO",
    );
    expect(sak).toBeDefined();
    if (!sak) return;
    settInnloggetSomEier(sak);
    const sakId = getSaksreferanse(sak.id);

    await utforAction(sakId, {
      handling: "registrer_resultat",
      "resultat.utredning.type": "KONTROLLNOTAT",
    });

    expect(sak.resultat?.utredning?.type).toBe("KONTROLLNOTAT");
  });

  it("avviser resultatfelter som ikke finnes i mockskjemaet", async () => {
    const sak = hentAlleSaker(testRequest).find((s: KontrollsakResponse) => s.steg === "UTREDES");
    expect(sak).toBeDefined();
    if (!sak) return;
    settInnloggetSomEier(sak);
    const sakId = getSaksreferanse(sak.id);

    await expect(
      utforAction(sakId, {
        handling: "registrer_resultat",
        "resultat.utredning.type": "KONTROLLNOTAT",
        "resultat.admin.godkjent": "true",
      }),
    ).rejects.toMatchObject({ init: { status: 400 } });
  });

  it("henlegger saken med årsak fra mockskjemaet", async () => {
    const sak = hentAlleSaker(testRequest).find(
      (s: KontrollsakResponse) => s.steg === "UTREDES" && s.status !== "I_BERO",
    );
    expect(sak).toBeDefined();
    if (!sak) return;
    settInnloggetSomEier(sak);
    const sakId = getSaksreferanse(sak.id);

    await utforAction(sakId, {
      handling: "henlegg",
      "resultat.utredning.henleggelsesarsak": "IKKE_TILSTREKKELIG_SKYLD",
    });

    expect(sak.resultat?.utredning?.type).toBe("HENLAGT");
    expect(sak.resultat?.utredning?.henleggelsesarsak).toBe("IKKE_TILSTREKKELIG_SKYLD");
    expect(sak.steg).toBe("UTREDES");

    await utforAction(sakId, {
      handling: "endre_steg_dialog",
      steg: "AVSLUTTET",
    });
    expect(sak.steg).toBe("AVSLUTTET");
  });

  it("gjenoppta gjenoppretter status før bero", async () => {
    const saker = hentAlleSaker(testRequest);
    const sak = saker.find((s: KontrollsakResponse) => s.steg === "UTREDES");
    expect(sak).toBeDefined();
    if (!sak) return;
    settInnloggetSomEier(sak);

    sak.status = "I_BERO";

    const { getSaksreferanse } = await import("./id");
    const sakId = getSaksreferanse(sak.id);

    const resultat = await utforAction(sakId, {
      handling: "gjenoppta",
    });

    expect(resultat).toEqual({ ok: true });
    expect(sak.status).toBe("AKTIV");

    const historikk = hentHistorikk(testRequest, sak.id);
    expect(historikk[0]?.hendelsesType).toBe("SAK_GJENOPPTATT");
    expect(historikk[0]?.status).toBe("AKTIV");
  });

  it("endre_steg avviser ugyldig steg", async () => {
    const saker = hentAlleSaker(testRequest);
    const sak = saker.find((s: KontrollsakResponse) => s.steg !== "AVSLUTTET");
    expect(sak).toBeDefined();
    if (!sak) return;
    settInnloggetSomEier(sak);

    const { getSaksreferanse } = await import("./id");
    const sakId = getSaksreferanse(sak.id);

    await expect(
      utforAction(sakId, {
        handling: "endre_steg",
        steg: "VENTER_PA_INFORMASJON",
      }),
    ).rejects.toBeDefined();
  });

  it("endre_steg avviser uendret steg", async () => {
    const saker = hentAlleSaker(testRequest);
    const sak = saker.find((s: KontrollsakResponse) => s.steg === "OPPRETTET");
    expect(sak).toBeDefined();
    if (!sak) return;
    settInnloggetSomEier(sak);

    const { getSaksreferanse } = await import("./id");
    const sakId = getSaksreferanse(sak.id);

    await expect(
      utforAction(sakId, {
        handling: "endre_steg",
        steg: "UTREDES",
      }),
    ).rejects.toBeDefined();
  });

  it("endre_steg_dialog oppdaterer bare steget", async () => {
    const saker = hentAlleSaker(testRequest);
    const sak = saker.find((s: KontrollsakResponse) => s.steg === "OPPRETTET");
    expect(sak).toBeDefined();
    if (!sak) return;
    settInnloggetSomEier(sak);

    const { getSaksreferanse } = await import("./id");
    const sakId = getSaksreferanse(sak.id);

    const resultat = await utforAction(sakId, {
      handling: "endre_steg_dialog",
      steg: "UTREDNING",
      beskrivelse: "Oppdatert fra ny dialog",
    });

    expect(resultat).toEqual({ ok: true });
    expect(sak.steg).toBe("UTREDNING");
    expect(sak.status).toBe("AKTIV");
  });

  it("avviser et steg som ikke finnes i tillatte steg", async () => {
    const saker = hentAlleSaker(testRequest);
    const sak = saker.find((s: KontrollsakResponse) => s.steg === "UTREDES");
    expect(sak).toBeDefined();
    if (!sak) return;
    settInnloggetSomEier(sak);
    sak.status = "I_BERO";

    const { getSaksreferanse } = await import("./id");
    const sakId = getSaksreferanse(sak.id);

    await expect(
      utforAction(sakId, {
        handling: "endre_steg_dialog",
        steg: "UTREDES",
        status: "I_BERO",
      }),
    ).rejects.toBeDefined();
    expect(sak.steg).toBe("UTREDES");
    expect(sak.status).toBe("I_BERO");
  });

  it("viser kandidatoverganger, men ikke ferdige stegbytter, før utredningsresultatet er registrert", () => {
    const sak = hentAlleSaker(testRequest).find((s: KontrollsakResponse) => s.steg === "UTREDES");
    expect(sak).toBeDefined();
    if (!sak) return;

    const utenResultat: KontrollsakResponse = {
      ...sak,
      steg: "UTREDNING",
      resultat: null,
    };
    const handlingerUtenResultat = hentMockTillatteHandlinger(utenResultat);
    expect(handlingerUtenResultat.tillatteSteg).toEqual([]);
    expect(handlingerUtenResultat.muligeNesteSteg).toEqual(["FORVALTNING", "AVSLUTTET"]);
    expect(handlingerUtenResultat.handlinger.map((handling) => handling.type)).toContain(
      "FLYTT_TIL_NESTE_STEG",
    );
    expect(handlingerUtenResultat.handlinger.map((handling) => handling.type)).toContain(
      "REGISTRER_RESULTAT",
    );

    const feilutbetaling: KontrollsakResponse = {
      ...utenResultat,
      ytelser: utenResultat.ytelser.map((ytelse) => ({ ...ytelse, belop: null })),
      resultat: {
        utredning: {
          type: "FEILUTBETALINGSSAK_ORDINAER",
        },
      },
    };
    expect(hentMockTillatteHandlinger(feilutbetaling).tillatteSteg).toEqual([]);
    expect(
      hentMockTillatteHandlinger({
        ...feilutbetaling,
        ytelser: feilutbetaling.ytelser.map((ytelse) => ({ ...ytelse, belop: 0 })),
      }).tillatteSteg,
    ).toEqual(["FORVALTNING"]);

    const henlagt: KontrollsakResponse = {
      ...utenResultat,
      resultat: {
        utredning: {
          type: "HENLAGT",
          henleggelsesarsak: "IKKE_KAPASITET",
        },
      },
    };
    expect(hentMockTillatteHandlinger(henlagt).tillatteSteg).toEqual(["AVSLUTTET"]);
  });

  it("tilbyr strenge steg og kandidatsteg fra forvaltning ut fra registrert resultat", () => {
    const sak = hentAlleSaker(testRequest).find((s: KontrollsakResponse) => s.steg === "UTREDES");
    expect(sak).toBeDefined();
    if (!sak) return;
    const forvaltning: KontrollsakResponse = {
      ...sak,
      steg: "FORVALTNING",
      resultat: null,
      ytelser: sak.ytelser.map((ytelse) => ({ ...ytelse, endeligBelop: 0 })),
    };
    expect(hentMockTillatteHandlinger(forvaltning).tillatteSteg).toEqual([]);
    expect(hentMockTillatteHandlinger(forvaltning).muligeNesteSteg).toEqual([
      "STRAFFERETTSLIG_VURDERING",
      "AVSLUTTET",
    ]);
    expect(
      hentMockTillatteHandlinger({
        ...forvaltning,
        resultat: { forvaltning: { type: "SAKEN_SKAL_VURDERES_FOR_ANMELDELSE" } },
      }).tillatteSteg,
    ).toEqual(["STRAFFERETTSLIG_VURDERING"]);
    expect(
      hentMockTillatteHandlinger({
        ...forvaltning,
        resultat: { forvaltning: { type: "SAKEN_SKAL_VURDERES_FOR_ANMELDELSE" } },
      }).muligeNesteSteg,
    ).toEqual(["STRAFFERETTSLIG_VURDERING", "AVSLUTTET"]);
    expect(
      hentMockTillatteHandlinger({
        ...forvaltning,
        resultat: {
          forvaltning: {
            type: "SAKEN_SKAL_IKKE_VURDERES_FOR_ANMELDELSE",
            endeligUtfall: { type: "KONTROLLNOTAT" },
          },
        },
      }).tillatteSteg,
    ).toEqual(["AVSLUTTET"]);
    expect(
      hentMockTillatteHandlinger({
        ...forvaltning,
        resultat: {
          forvaltning: {
            type: "SAKEN_SKAL_IKKE_VURDERES_FOR_ANMELDELSE",
            endeligUtfall: { type: "ANMELDT" },
          },
        },
      }).tillatteSteg,
    ).toEqual([]);
    expect(
      hentMockTillatteHandlinger({
        ...forvaltning,
        resultat: {
          forvaltning: {
            type: "SAKEN_SKAL_IKKE_VURDERES_FOR_ANMELDELSE",
            endeligUtfall: { type: "HENLAGT" },
          },
        },
      }).tillatteSteg,
    ).toEqual([]);
    expect(
      hentMockTillatteHandlinger({
        ...forvaltning,
        resultat: {
          forvaltning: {
            type: "SAKEN_SKAL_IKKE_VURDERES_FOR_ANMELDELSE",
            endeligUtfall: { type: "HENLAGT", henleggelsesarsak: "IKKE_KAPASITET" },
          },
        },
      }).tillatteSteg,
    ).toEqual(["AVSLUTTET"]);
    const henlagtUtenEndeligBelop = hentMockTillatteHandlinger({
      ...forvaltning,
      ytelser: forvaltning.ytelser.map((ytelse) => ({ ...ytelse, endeligBelop: null })),
      resultat: {
        forvaltning: {
          type: "SAKEN_SKAL_IKKE_VURDERES_FOR_ANMELDELSE",
          endeligUtfall: { type: "HENLAGT", henleggelsesarsak: "IKKE_KAPASITET" },
        },
      },
    });
    expect(henlagtUtenEndeligBelop.tillatteSteg).toEqual(["AVSLUTTET"]);
    expect(henlagtUtenEndeligBelop.muligeNesteSteg).toEqual(["AVSLUTTET"]);
    const kontrollnotatUtenEndeligBelop = hentMockTillatteHandlinger({
      ...forvaltning,
      ytelser: forvaltning.ytelser.map((ytelse) => ({ ...ytelse, endeligBelop: null })),
      resultat: {
        forvaltning: {
          type: "SAKEN_SKAL_IKKE_VURDERES_FOR_ANMELDELSE",
          endeligUtfall: { type: "KONTROLLNOTAT" },
        },
      },
    });
    expect(kontrollnotatUtenEndeligBelop.tillatteSteg).toEqual(["AVSLUTTET"]);
    expect(kontrollnotatUtenEndeligBelop.paakrevdeRegistreringerPerSteg.AVSLUTTET).not.toContain(
      "ytelser[].endeligBelop",
    );
    expect(henlagtUtenEndeligBelop.handlinger.map((handling) => handling.type)).toContain(
      "FLYTT_TIL_NESTE_STEG",
    );
    expect(henlagtUtenEndeligBelop.handlinger.map((handling) => handling.type)).not.toContain(
      "HENLEGG",
    );
    expect(henlagtUtenEndeligBelop.handlinger.map((handling) => handling.type)).toContain(
      "REGISTRER_RESULTAT",
    );
    expect(henlagtUtenEndeligBelop.paakrevdeRegistreringerPerSteg.AVSLUTTET).not.toContain(
      "ytelser[].endeligBelop",
    );
    expect(
      hentMockTillatteHandlinger({
        ...forvaltning,
        resultat: {
          forvaltning: {
            type: "SAKEN_SKAL_IKKE_VURDERES_FOR_ANMELDELSE",
            endeligUtfall: { type: "FEILUTBETALINGSSAK_ORDINAER" },
          },
        },
      }).tillatteSteg,
    ).toEqual(["AVSLUTTET"]);
    const vurdering: KontrollsakResponse = {
      ...sak,
      steg: "STRAFFERETTSLIG_VURDERING",
      resultat: null,
    };
    expect(hentMockTillatteHandlinger(vurdering).tillatteSteg).toEqual([]);
    expect(
      hentMockTillatteHandlinger({
        ...vurdering,
        resultat: { strafferettsligVurdering: { type: "ANMELDT" } },
      }).tillatteSteg,
    ).toEqual(["POLITI"]);
    expect(hentMockTillatteHandlinger({ ...vurdering, status: "I_BERO" }).tillatteSteg).toEqual([]);
  });

  it("beholder lagret resultat når stegbytte med nytt resultat avvises", async () => {
    const sak = hentAlleSaker(testRequest).find(
      (s: KontrollsakResponse) => s.steg === "UTREDES" && s.status !== "I_BERO",
    );
    expect(sak).toBeDefined();
    if (!sak) return;
    settInnloggetSomEier(sak);
    sak.resultat = { utredning: { type: "FEILUTBETALINGSSAK_ORDINAER" } };
    sak.ytelser = sak.ytelser.map((ytelse) => ({ ...ytelse, belop: 0 }));

    await expect(
      utforAction(getSaksreferanse(sak.id), {
        handling: "endre_steg_dialog",
        steg: "FORVALTNING",
        registrerResultat: "true",
        "resultat.utredning.type": "KONTROLLNOTAT",
      }),
    ).rejects.toMatchObject({ init: { status: 409 } });

    expect(sak.steg).toBe("UTREDES");
    expect(sak.resultat?.utredning?.type).toBe("FEILUTBETALINGSSAK_ORDINAER");
  });

  it("endre_status avviser ugyldig verdi", async () => {
    const saker = hentAlleSaker(testRequest);
    const sak = saker.find((s: KontrollsakResponse) => s.steg !== "AVSLUTTET");
    expect(sak).toBeDefined();
    if (!sak) return;
    settInnloggetSomEier(sak);

    const { getSaksreferanse } = await import("./id");
    const sakId = getSaksreferanse(sak.id);

    await expect(
      utforAction(sakId, {
        handling: "endre_status",
        status: "UGYLDIG_AARSAK",
      }),
    ).rejects.toBeDefined();
  });

  it("legger til manuelt historikkinnslag", async () => {
    const saker = hentAlleSaker(testRequest);
    const sak = saker.find((s: KontrollsakResponse) => s.steg === "UTREDES");
    expect(sak).toBeDefined();
    if (!sak) return;
    settInnloggetSomEier(sak);

    const { getSaksreferanse } = await import("./id");
    const sakId = getSaksreferanse(sak.id);

    const resultat = await utforAction(sakId, {
      handling: "legg_til_historikk",
      tittel: "Ringte bruker",
      notat: "Avklarte dokumentasjon og neste steg.",
      dato: "04.05.2026",
      tid: "12:34",
    });

    expect(resultat).toEqual({ ok: true });

    const historikk = hentHistorikk(testRequest, sak.id);
    expect(historikk[0]?.hendelsesType).toBe("MANUELL_HENDELSE");
    expect(historikk[0]?.tittel).toBe("Ringte bruker");
    expect(historikk[0]?.beskrivelse).toBe("Avklarte dokumentasjon og neste steg.");
    expect(historikk[0]?.tidspunkt).toBe("2026-05-04T10:34:00.000Z");
  });

  it("sorterer manuelle historikkinnslag stabilt når de har samme tidspunkt", async () => {
    const saker = hentAlleSaker(testRequest);
    const sak = saker.find((s: KontrollsakResponse) => s.steg === "UTREDES");
    expect(sak).toBeDefined();
    if (!sak) return;
    settInnloggetSomEier(sak);

    const { getSaksreferanse } = await import("./id");
    const sakId = getSaksreferanse(sak.id);
    const tidspunkt = {
      dato: "04.05.2026",
      tid: "12:34",
    };

    await utforAction(sakId, {
      handling: "legg_til_historikk",
      tittel: "Første innslag",
      notat: "Skrevet først.",
      ...tidspunkt,
    });
    await utforAction(sakId, {
      handling: "legg_til_historikk",
      tittel: "Andre innslag",
      notat: "Skrevet sist.",
      ...tidspunkt,
    });

    const historikk = hentHistorikk(testRequest, sak.id);
    expect(historikk[0]?.tittel).toBe("Andre innslag");
    expect(historikk[1]?.tittel).toBe("Første innslag");
  });

  it("endre_steg avviser for avsluttet sak", async () => {
    const saker = hentAlleSaker(testRequest);
    const sak = saker.find((s: KontrollsakResponse) => s.steg !== "AVSLUTTET");
    expect(sak).toBeDefined();
    if (!sak) return;
    settInnloggetSomEier(sak);

    sak.steg = "AVSLUTTET";

    const { getSaksreferanse } = await import("./id");
    const sakId = getSaksreferanse(sak.id);

    await expect(
      utforAction(sakId, {
        handling: "endre_steg",
        steg: "UTREDES",
      }),
    ).rejects.toBeDefined();
  });

  it("endre_status avviser for avsluttet sak", async () => {
    const saker = hentAlleSaker(testRequest);
    const sak = saker.find((s: KontrollsakResponse) => s.steg !== "AVSLUTTET");
    expect(sak).toBeDefined();
    if (!sak) return;
    settInnloggetSomEier(sak);

    sak.steg = "AVSLUTTET";

    const { getSaksreferanse } = await import("./id");
    const sakId = getSaksreferanse(sak.id);

    await expect(
      utforAction(sakId, {
        handling: "endre_status",
        status: "I_BERO",
      }),
    ).rejects.toBeDefined();
  });

  it("gjenoppta avviser for avsluttet sak", async () => {
    const saker = hentAlleSaker(testRequest);
    const sak = saker.find((s: KontrollsakResponse) => s.steg !== "AVSLUTTET");
    expect(sak).toBeDefined();
    if (!sak) return;
    settInnloggetSomEier(sak);

    sak.steg = "AVSLUTTET";
    sak.status = "VENTER_PA_VEDTAK";

    const { getSaksreferanse } = await import("./id");
    const sakId = getSaksreferanse(sak.id);

    await expect(
      utforAction(sakId, {
        handling: "gjenoppta",
      }),
    ).rejects.toBeDefined();
  });
});
