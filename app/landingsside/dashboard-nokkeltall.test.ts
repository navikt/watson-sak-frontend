import { describe, expect, test } from "vitest";
import type { KontrollsakResponse } from "~/saker/types.backend";
import { beregnDashboardNokkeltall } from "./dashboard-nokkeltall";

function lagKontrollsak(overstyringer: Partial<KontrollsakResponse> = {}): KontrollsakResponse {
  return {
    id: 1,
    personIdent: "12345678901",
    personNavn: "Ola Nordmann",
    saksbehandlere: {
      eier: { navIdent: "Z123456", navn: "Ola Saksbehandler", enhet: "4812" },
      deltMed: [],
      opprettetAv: { navIdent: "Z654321", navn: "Kari Oppretter", enhet: "4812" },
    },
    status: "OPPRETTET",
    kategori: "ANNET",
    kilde: "NAV_KONTROLL",
    misbruktype: [],
    prioritet: "NORMAL",
    blokkert: null,
    henleggelsesarsak: null,
    ytelser: [],
    merking: [],
    arbeidsgivere: [],
    opprettet: "2026-03-18T00:00:00Z",
    oppdatert: null,
    oppgaver: [],
    kobledeSaker: [],
    dokumenter: [],
    adresseskjermet: false,
    ...overstyringer,
  };
}

const referansedato = new Date("2026-05-01T12:00:00Z");

describe("beregnDashboardNokkeltall", () => {
  test("teller totalt antall åpne saker (ekskluderer HENLAGT og AVSLUTTET)", () => {
    const saker = [
      lagKontrollsak({ id: 1, status: "OPPRETTET" }),
      lagKontrollsak({ id: 2, status: "UTREDES" }),
      lagKontrollsak({ id: 3, status: "STRAFFERETTSLIG_VURDERING" }),
      lagKontrollsak({ id: 4, status: "ANMELDT" }),
      lagKontrollsak({ id: 5, status: "HENLAGT" }),
      lagKontrollsak({ id: 6, status: "AVSLUTTET" }),
    ];

    const resultat = beregnDashboardNokkeltall(saker, referansedato);

    expect(resultat.totalt).toBe(4);
  });

  test("teller saker opprettet i siste 30 dager", () => {
    const saker = [
      lagKontrollsak({ id: 1, opprettet: "2026-04-15T00:00:00Z" }), // innenfor
      lagKontrollsak({ id: 2, opprettet: "2026-04-02T00:00:00Z" }), // innenfor (akkurat)
      lagKontrollsak({ id: 3, opprettet: "2026-03-01T00:00:00Z" }), // utenfor
    ];

    const resultat = beregnDashboardNokkeltall(saker, referansedato);

    expect(resultat.opprettetIPerioden).toBe(2);
  });

  test("teller aktive saker (UTREDES eller STRAFFERETTSLIG_VURDERING uten blokkering)", () => {
    const saker = [
      lagKontrollsak({ id: 1, status: "UTREDES", blokkert: null }),
      lagKontrollsak({ id: 2, status: "STRAFFERETTSLIG_VURDERING", blokkert: null }),
      lagKontrollsak({ id: 3, status: "UTREDES", blokkert: "VENTER_PA_INFORMASJON" }),
      lagKontrollsak({ id: 4, status: "OPPRETTET", blokkert: null }),
    ];

    const resultat = beregnDashboardNokkeltall(saker, referansedato);

    expect(resultat.aktive).toBe(2);
  });

  test("teller saker avsluttet i siste 30 dager", () => {
    const saker = [
      lagKontrollsak({ id: 1, status: "AVSLUTTET", oppdatert: "2026-04-20T00:00:00Z" }),
      lagKontrollsak({ id: 2, status: "HENLAGT", oppdatert: "2026-04-10T00:00:00Z" }),
      lagKontrollsak({ id: 3, status: "AVSLUTTET", oppdatert: "2026-02-01T00:00:00Z" }),
      lagKontrollsak({ id: 4, status: "AVSLUTTET", oppdatert: null }),
    ];

    const resultat = beregnDashboardNokkeltall(saker, referansedato);

    expect(resultat.avsluttetIPerioden).toBe(2);
  });

  test("teller saker som venter på andre (VENTER_PA_INFORMASJON, VENTER_PA_VEDTAK, ANMELDT)", () => {
    const saker = [
      lagKontrollsak({ id: 1, blokkert: "VENTER_PA_INFORMASJON" }),
      lagKontrollsak({ id: 2, blokkert: "VENTER_PA_VEDTAK" }),
      lagKontrollsak({ id: 3, status: "ANMELDT" }),
      lagKontrollsak({ id: 4, blokkert: "I_BERO" }),
      lagKontrollsak({ id: 5, blokkert: null }),
    ];

    const resultat = beregnDashboardNokkeltall(saker, referansedato);

    expect(resultat.venterPaAndre).toBe(3);
  });

  test("finner eldste åpne sak og beregner antall dager", () => {
    const saker = [
      lagKontrollsak({ id: 100, opprettet: "2026-04-01T00:00:00Z" }),
      lagKontrollsak({ id: 200, opprettet: "2025-12-01T00:00:00Z" }),
      lagKontrollsak({ id: 300, opprettet: "2026-03-01T00:00:00Z" }),
      lagKontrollsak({ id: 400, status: "AVSLUTTET", opprettet: "2025-01-01T00:00:00Z" }),
    ];

    const resultat = beregnDashboardNokkeltall(saker, referansedato);

    expect(resultat.eldsteApneSakId).toBe(200);
    expect(resultat.eldsteApneSakDager).toBe(152); // 2025-12-01T00:00 til 2026-05-01T12:00
  });

  test("returnerer null for eldste åpne sak når ingen åpne saker finnes", () => {
    const saker = [
      lagKontrollsak({ id: 1, status: "AVSLUTTET" }),
      lagKontrollsak({ id: 2, status: "HENLAGT" }),
    ];

    const resultat = beregnDashboardNokkeltall(saker, referansedato);

    expect(resultat.eldsteApneSakId).toBeNull();
    expect(resultat.eldsteApneSakDager).toBeNull();
  });

  test("håndterer tom saksliste", () => {
    const resultat = beregnDashboardNokkeltall([], referansedato);

    expect(resultat).toEqual({
      totalt: 0,
      opprettetIPerioden: 0,
      aktive: 0,
      avsluttetIPerioden: 0,
      venterPaAndre: 0,
      eldsteApneSakId: null,
      eldsteApneSakDager: null,
    });
  });
});
