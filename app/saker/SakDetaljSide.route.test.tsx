import { describe, expect, it, beforeEach, vi } from "vitest";
import type { KontrollsakResponse } from "./types.backend";
import { action } from "./SakDetaljSide.server";
import { hentHistorikk, resetHistorikk } from "./historikk/mock-data.server";
import { hentAlleSaker } from "./mock-alle-saker.server";

vi.mock("~/config/env.server", () => ({
  skalBrukeMockdata: true,
}));

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

describe("SakDetaljSide route action – ny statusflyt", () => {
  beforeEach(() => {
    resetHistorikk();
  });

  it("endre_status oppdaterer sakens status", async () => {
    const saker = hentAlleSaker();
    const sak = saker.find(
      (s: KontrollsakResponse) => s.status !== "AVSLUTTET" && s.blokkert === null,
    );
    expect(sak).toBeDefined();
    if (!sak) return;

    const { getSaksreferanse } = await import("./id");
    const sakId = getSaksreferanse(sak.id);

    const resultat = await utforAction(sakId, {
      handling: "endre_status",
      status: "ANMELDT",
    });

    expect(resultat).toEqual({ ok: true });
    expect(sak.status).toBe("ANMELDT");

    const historikk = hentHistorikk(sak.id);
    expect(historikk[0]?.hendelsesType).toBe("POLITIANMELDT");
  });

  it("endre_status til HENLAGT logger henleggelse", async () => {
    const saker = hentAlleSaker();
    const sak = saker.find(
      (s: KontrollsakResponse) => s.status !== "AVSLUTTET" && s.blokkert === null,
    );
    expect(sak).toBeDefined();
    if (!sak) return;

    const { getSaksreferanse } = await import("./id");
    const sakId = getSaksreferanse(sak.id);

    const resultat = await utforAction(sakId, {
      handling: "endre_status",
      status: "HENLAGT",
    });

    expect(resultat).toEqual({ ok: true });
    expect(sak.status).toBe("HENLAGT");

    const historikk = hentHistorikk(sak.id);
    expect(historikk[0]?.hendelsesType).toBe("SAK_HENLAGT");
  });

  it("endre_status med beskrivelse lagrer hendelse med beskrivelse", async () => {
    const saker = hentAlleSaker();
    const sak = saker.find(
      (s: KontrollsakResponse) => s.status !== "AVSLUTTET" && s.blokkert === null,
    );
    expect(sak).toBeDefined();
    if (!sak) return;

    const { getSaksreferanse } = await import("./id");
    const sakId = getSaksreferanse(sak.id);

    const resultat = await utforAction(sakId, {
      handling: "endre_status",
      status: "STRAFFERETTSLIG_VURDERING",
      beskrivelse: "Saken tas videre til utredning",
    });

    expect(resultat).toEqual({ ok: true });

    const historikk = hentHistorikk(sak.id);
    expect(historikk[0]?.beskrivelse).toBe("Saken tas videre til utredning");
  });

  it("endre_status til AVSLUTTET nullstiller blokkert", async () => {
    const saker = hentAlleSaker();
    const sak = saker.find((s: KontrollsakResponse) => s.status !== "AVSLUTTET");
    expect(sak).toBeDefined();
    if (!sak) return;

    sak.blokkert = "I_BERO";

    const { getSaksreferanse } = await import("./id");
    const sakId = getSaksreferanse(sak.id);

    await utforAction(sakId, {
      handling: "endre_status",
      status: "AVSLUTTET",
    });

    expect(sak.blokkert).toBeNull();
    expect(sak.status).toBe("AVSLUTTET");

    const historikk = hentHistorikk(sak.id);
    expect(historikk[0]?.hendelsesType).toBe("STATUS_ENDRET");
    expect(historikk[0]?.blokkert).toBe("I_BERO");
  });

  it("endre_blokkering setter blokkeringsårsak på saken", async () => {
    const saker = hentAlleSaker();
    const sak = saker.find(
      (s: KontrollsakResponse) => s.status !== "AVSLUTTET" && s.blokkert === null,
    );
    expect(sak).toBeDefined();
    if (!sak) return;

    const { getSaksreferanse } = await import("./id");
    const sakId = getSaksreferanse(sak.id);

    const resultat = await utforAction(sakId, {
      handling: "endre_blokkering",
      blokkert: "VENTER_PA_INFORMASJON",
    });

    expect(resultat).toEqual({ ok: true });
    expect(sak.blokkert).toBe("VENTER_PA_INFORMASJON");

    const historikk = hentHistorikk(sak.id);
    expect(historikk[0]?.hendelsesType).toBe("SAK_SATT_PA_VENT");
    expect(historikk[0]?.blokkert).toBe("VENTER_PA_INFORMASJON");
  });

  it("endre_blokkering med I_BERO logger bero-hendelse", async () => {
    const saker = hentAlleSaker();
    const sak = saker.find(
      (s: KontrollsakResponse) => s.status !== "AVSLUTTET" && s.blokkert === null,
    );
    expect(sak).toBeDefined();
    if (!sak) return;

    const { getSaksreferanse } = await import("./id");
    const sakId = getSaksreferanse(sak.id);

    const resultat = await utforAction(sakId, {
      handling: "endre_blokkering",
      blokkert: "I_BERO",
    });

    expect(resultat).toEqual({ ok: true });

    const historikk = hentHistorikk(sak.id);
    expect(historikk[0]?.hendelsesType).toBe("SAK_SATT_I_BERO");
    expect(historikk[0]?.blokkert).toBe("I_BERO");
  });

  it("gjenoppta nullstiller blokkert uten modaldata", async () => {
    const saker = hentAlleSaker();
    const sak = saker.find((s: KontrollsakResponse) => s.status !== "AVSLUTTET");
    expect(sak).toBeDefined();
    if (!sak) return;

    sak.blokkert = "VENTER_PA_VEDTAK";

    const { getSaksreferanse } = await import("./id");
    const sakId = getSaksreferanse(sak.id);

    const resultat = await utforAction(sakId, {
      handling: "gjenoppta",
    });

    expect(resultat).toEqual({ ok: true });
    expect(sak.blokkert).toBeNull();

    const historikk = hentHistorikk(sak.id);
    expect(historikk[0]?.hendelsesType).toBe("SAK_GJENOPPTATT");
    expect(historikk[0]?.blokkert).toBe("VENTER_PA_VEDTAK");
  });

  it("endre_status avviser ugyldig status", async () => {
    const saker = hentAlleSaker();
    const sak = saker.find((s: KontrollsakResponse) => s.status !== "AVSLUTTET");
    expect(sak).toBeDefined();
    if (!sak) return;

    const { getSaksreferanse } = await import("./id");
    const sakId = getSaksreferanse(sak.id);

    await expect(
      utforAction(sakId, {
        handling: "endre_status",
        status: "VENTER_PA_INFORMASJON",
      }),
    ).rejects.toBeDefined();
  });

  it("endre_status avviser uendret status", async () => {
    const saker = hentAlleSaker();
    const sak = saker.find(
      (s: KontrollsakResponse) => s.status === "UTREDES" && s.blokkert === null,
    );
    expect(sak).toBeDefined();
    if (!sak) return;

    const { getSaksreferanse } = await import("./id");
    const sakId = getSaksreferanse(sak.id);

    await expect(
      utforAction(sakId, {
        handling: "endre_status",
        status: "UTREDES",
      }),
    ).rejects.toBeDefined();
  });

  it("endre_blokkering avviser ugyldig årsak", async () => {
    const saker = hentAlleSaker();
    const sak = saker.find((s: KontrollsakResponse) => s.status !== "AVSLUTTET");
    expect(sak).toBeDefined();
    if (!sak) return;

    const { getSaksreferanse } = await import("./id");
    const sakId = getSaksreferanse(sak.id);

    await expect(
      utforAction(sakId, {
        handling: "endre_blokkering",
        blokkert: "UGYLDIG_AARSAK",
      }),
    ).rejects.toBeDefined();
  });

  it("legger til manuelt historikkinnslag", async () => {
    const saker = hentAlleSaker();
    const sak = saker.find((s: KontrollsakResponse) => s.status !== "AVSLUTTET");
    expect(sak).toBeDefined();
    if (!sak) return;

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

    const historikk = hentHistorikk(sak.id);
    expect(historikk[0]?.hendelsesType).toBe("MANUELL_NOTAT");
    expect(historikk[0]?.tittel).toBe("Ringte bruker");
    expect(historikk[0]?.notat).toBe("Avklarte dokumentasjon og neste steg.");
    expect(historikk[0]?.tidspunkt).toBe("2026-05-04T10:34:00.000Z");
  });

  it("sorterer manuelle historikkinnslag stabilt når de har samme tidspunkt", async () => {
    const saker = hentAlleSaker();
    const sak = saker.find((s: KontrollsakResponse) => s.status !== "AVSLUTTET");
    expect(sak).toBeDefined();
    if (!sak) return;

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

    const historikk = hentHistorikk(sak.id);
    expect(historikk[0]?.tittel).toBe("Andre innslag");
    expect(historikk[1]?.tittel).toBe("Første innslag");
  });

  it("endre_status avviser for avsluttet sak", async () => {
    const saker = hentAlleSaker();
    const sak = saker.find((s: KontrollsakResponse) => s.status !== "AVSLUTTET");
    expect(sak).toBeDefined();
    if (!sak) return;

    sak.status = "AVSLUTTET";

    const { getSaksreferanse } = await import("./id");
    const sakId = getSaksreferanse(sak.id);

    await expect(
      utforAction(sakId, {
        handling: "endre_status",
        status: "UTREDES",
      }),
    ).rejects.toBeDefined();
  });

  it("endre_blokkering avviser for avsluttet sak", async () => {
    const saker = hentAlleSaker();
    const sak = saker.find((s: KontrollsakResponse) => s.status !== "AVSLUTTET");
    expect(sak).toBeDefined();
    if (!sak) return;

    sak.status = "AVSLUTTET";

    const { getSaksreferanse } = await import("./id");
    const sakId = getSaksreferanse(sak.id);

    await expect(
      utforAction(sakId, {
        handling: "endre_blokkering",
        blokkert: "I_BERO",
      }),
    ).rejects.toBeDefined();
  });

  it("gjenoppta avviser for avsluttet sak", async () => {
    const saker = hentAlleSaker();
    const sak = saker.find((s: KontrollsakResponse) => s.status !== "AVSLUTTET");
    expect(sak).toBeDefined();
    if (!sak) return;

    sak.status = "AVSLUTTET";
    sak.blokkert = "VENTER_PA_VEDTAK";

    const { getSaksreferanse } = await import("./id");
    const sakId = getSaksreferanse(sak.id);

    await expect(
      utforAction(sakId, {
        handling: "gjenoppta",
      }),
    ).rejects.toBeDefined();
  });
});
