import { describe, expect, it, beforeEach } from "vitest";
import { action } from "./SakDetaljSide.route";
import { hentHistorikk, resetHistorikk } from "./historikk/mock-data.server";
import { hentAlleSaker } from "./mock-alle-saker.server";

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
    const sak = saker.find((s) => s.status !== "AVSLUTTET" && s.blokkert === null);
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
  });

  it("endre_status med beskrivelse lagrer hendelse med beskrivelse", async () => {
    const saker = hentAlleSaker();
    const sak = saker.find((s) => s.status !== "AVSLUTTET" && s.blokkert === null);
    expect(sak).toBeDefined();
    if (!sak) return;

    const { getSaksreferanse } = await import("./id");
    const sakId = getSaksreferanse(sak.id);

    const resultat = await utforAction(sakId, {
      handling: "endre_status",
      status: "UTREDES",
      beskrivelse: "Saken tas videre til utredning",
    });

    expect(resultat).toEqual({ ok: true });
  });

  it("endre_status til AVSLUTTET nullstiller blokkert", async () => {
    const saker = hentAlleSaker();
    const sak = saker.find((s) => s.status !== "AVSLUTTET");
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
    const sak = saker.find((s) => s.status !== "AVSLUTTET" && s.blokkert === null);
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
    const sak = saker.find((s) => s.status !== "AVSLUTTET" && s.blokkert === null);
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
    const sak = saker.find((s) => s.status !== "AVSLUTTET");
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
    const sak = saker.find((s) => s.status !== "AVSLUTTET");
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

  it("endre_blokkering avviser ugyldig årsak", async () => {
    const saker = hentAlleSaker();
    const sak = saker.find((s) => s.status !== "AVSLUTTET");
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
});
