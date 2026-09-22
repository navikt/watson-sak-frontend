import { describe, expect, it, beforeEach, vi } from "vitest";
import type { KontrollsakResponse } from "./types.backend";
import { action } from "./SakDetaljSide.server";
import { hentHistorikk } from "./historikk/mock-data.server";
import { hentAlleSaker } from "./mock-alle-saker.server";
import { resetDefaultSession } from "~/testing/mock-store/session.server";

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
    const sak = saker.find((s: KontrollsakResponse) => s.steg !== "AVSLUTTET" && s.status === null);
    expect(sak).toBeDefined();
    if (!sak) return;
    settInnloggetSomEier(sak);

    const { getSaksreferanse } = await import("./id");
    const sakId = getSaksreferanse(sak.id);

    const resultat = await utforAction(sakId, {
      handling: "endre_steg",
      steg: "POLITI",
    });

    expect(resultat).toEqual({ ok: true });
    expect(sak.steg).toBe("POLITI");

    const historikk = hentHistorikk(testRequest, sak.id);
    expect(historikk[0]?.hendelsesType).toBe("POLITIANMELDT");
  });

  it("endre_steg med beskrivelse lagrer hendelse med beskrivelse", async () => {
    const saker = hentAlleSaker(testRequest);
    const sak = saker.find((s: KontrollsakResponse) => s.steg !== "AVSLUTTET" && s.status === null);
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

  it("endre_steg til AVSLUTTET nullstiller status", async () => {
    const saker = hentAlleSaker(testRequest);
    const sak = saker.find((s: KontrollsakResponse) => s.steg === "UTREDES");
    expect(sak).toBeDefined();
    if (!sak) return;
    settInnloggetSomEier(sak);

    sak.status = "I_BERO";

    const { getSaksreferanse } = await import("./id");
    const sakId = getSaksreferanse(sak.id);

    await utforAction(sakId, {
      handling: "endre_steg",
      steg: "AVSLUTTET",
    });

    expect(sak.status).toBeNull();
    expect(sak.steg).toBe("AVSLUTTET");

    const historikk = hentHistorikk(testRequest, sak.id);
    expect(historikk[0]?.hendelsesType).toBe("STATUS_ENDRET");
    expect(historikk[0]?.status).toBe("I_BERO");
  });

  it("endre_status setter status på saken", async () => {
    const saker = hentAlleSaker(testRequest);
    const sak = saker.find((s: KontrollsakResponse) => s.steg !== "AVSLUTTET" && s.status === null);
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
    const sak = saker.find((s: KontrollsakResponse) => s.steg !== "AVSLUTTET" && s.status === null);
    expect(sak).toBeDefined();
    if (!sak) return;
    settInnloggetSomEier(sak);

    const { getSaksreferanse } = await import("./id");
    const sakId = getSaksreferanse(sak.id);

    const resultat = await utforAction(sakId, {
      handling: "endre_status",
      status: "I_BERO",
    });

    expect(resultat).toEqual({ ok: true });

    const historikk = hentHistorikk(testRequest, sak.id);
    expect(historikk[0]?.hendelsesType).toBe("SAK_SATT_I_BERO");
    expect(historikk[0]?.status).toBe("I_BERO");
  });

  it("gjenoppta nullstiller status uten modaldata", async () => {
    const saker = hentAlleSaker(testRequest);
    const sak = saker.find((s: KontrollsakResponse) => s.steg === "UTREDES");
    expect(sak).toBeDefined();
    if (!sak) return;
    settInnloggetSomEier(sak);

    sak.status = "VENTER_PA_VEDTAK";

    const { getSaksreferanse } = await import("./id");
    const sakId = getSaksreferanse(sak.id);

    const resultat = await utforAction(sakId, {
      handling: "gjenoppta",
    });

    expect(resultat).toEqual({ ok: true });
    expect(sak.status).toBeNull();

    const historikk = hentHistorikk(testRequest, sak.id);
    expect(historikk[0]?.hendelsesType).toBe("SAK_GJENOPPTATT");
    expect(historikk[0]?.status).toBe("VENTER_PA_VEDTAK");
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
    const sak = saker.find((s: KontrollsakResponse) => s.steg === "UTREDES" && s.status === null);
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

  it("endre_steg_dialog oppdaterer både steg og status", async () => {
    const saker = hentAlleSaker(testRequest);
    const sak = saker.find((s: KontrollsakResponse) => s.steg === "UTREDES" && s.status === null);
    expect(sak).toBeDefined();
    if (!sak) return;
    settInnloggetSomEier(sak);

    const { getSaksreferanse } = await import("./id");
    const sakId = getSaksreferanse(sak.id);

    const resultat = await utforAction(sakId, {
      handling: "endre_steg_dialog",
      steg: "POLITI",
      status: "VENTER_PA_INFORMASJON",
      beskrivelse: "Oppdatert fra ny dialog",
    });

    expect(resultat).toEqual({ ok: true });
    expect(sak.steg).toBe("POLITI");
    expect(sak.status).toBe("VENTER_PA_INFORMASJON");
  });

  it("endre_steg_dialog tillater no-op uten feil", async () => {
    const saker = hentAlleSaker(testRequest);
    const sak = saker.find((s: KontrollsakResponse) => s.steg === "UTREDES");
    expect(sak).toBeDefined();
    if (!sak) return;
    settInnloggetSomEier(sak);
    sak.status = "I_BERO";

    const { getSaksreferanse } = await import("./id");
    const sakId = getSaksreferanse(sak.id);

    const resultat = await utforAction(sakId, {
      handling: "endre_steg_dialog",
      steg: "UTREDES",
      status: "I_BERO",
    });

    expect(resultat).toEqual({ ok: true });
    expect(sak.steg).toBe("UTREDES");
    expect(sak.status).toBe("I_BERO");
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
