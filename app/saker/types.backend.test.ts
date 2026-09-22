import { describe, expect, it } from "vitest";
import {
  kontrollsakStatusSchema,
  kontrollsakResponseSchema,
  kontrollsakHendelseResponseSchema,
} from "./types.backend";

const basisSak = {
  id: 1,
  kontrollobjekt: {
    personIdent: "12345678901",
    navn: "Ola Nordmann",
  },
  saksbehandlere: {
    ansvarlig: { navIdent: "Z123456", navn: "Ola Saksbehandler", enhet: "4812" },
    deltMed: [],
    opprettetAv: { navIdent: "Z654321", navn: "Kari Oppretter", enhet: "4812" },
  },
  status: null,
  kategori: "ARBEID",
  kilde: "NAV_KONTROLL",
  misbruktype: [],
  prioritet: "NORMAL",
  ytelser: [],
  merking: [],
  kobledeSaker: [],
  opprettet: "2026-01-01T00:00:00Z",
  oppdatert: null,
} as const;

describe("kontrollsakResponseSchema – ny kontraktmodell", () => {
  it("parser sak med steg OPPRETTET og status null", () => {
    const resultat = kontrollsakResponseSchema.safeParse({ ...basisSak, steg: "OPPRETTET" });
    expect(resultat.success).toBe(true);
    if (resultat.success) {
      expect(resultat.data.steg).toBe("OPPRETTET");
      expect(resultat.data.status).toBeNull();
    }
  });

  it("parser sak med alle gyldige steg", () => {
    const gyldige = [
      "OPPRETTET",
      "UTREDES",
      "FORVALTNING",
      "STRAFFERETTSLIG_VURDERING",
      "POLITI",
      "AVSLUTTET",
    ] as const;

    for (const steg of gyldige) {
      const resultat = kontrollsakResponseSchema.safeParse({ ...basisSak, steg });
      expect(resultat.success, `Steg ${steg} skal være gyldig`).toBe(true);
    }
  });

  it("parser historisk steg ANMELDT under utrullingen til POLITI", () => {
    const resultat = kontrollsakResponseSchema.safeParse({ ...basisSak, steg: "ANMELDT" });

    expect(resultat.success).toBe(true);
  });

  it("avviser gamle steg VENTER_PA_INFORMASJON, VENTER_PA_VEDTAK og ANMELDELSE_VURDERES", () => {
    for (const steg of ["VENTER_PA_INFORMASJON", "VENTER_PA_VEDTAK", "ANMELDELSE_VURDERES"]) {
      const resultat = kontrollsakResponseSchema.safeParse({ ...basisSak, steg });
      expect(resultat.success, `Steg ${steg} skal være ugyldig`).toBe(false);
    }
  });

  it("parser sak med alle gyldige statuser", () => {
    const statuser = ["VENTER_PA_INFORMASJON", "VENTER_PA_VEDTAK", "I_BERO"] as const;

    for (const status of statuser) {
      const resultat = kontrollsakResponseSchema.safeParse({
        ...basisSak,
        steg: "UTREDES",
        status,
      });
      expect(resultat.success, `Status ${status} skal være gyldig`).toBe(true);
    }
  });

  it("har ikke iBero, tilgjengeligeHandlinger eller avslutningskonklusjon i parsede data", () => {
    const resultat = kontrollsakResponseSchema.safeParse({ ...basisSak, steg: "UTREDES" });
    expect(resultat.success).toBe(true);
    if (resultat.success) {
      expect("iBero" in resultat.data).toBe(false);
      expect("tilgjengeligeHandlinger" in resultat.data).toBe(false);
      expect("avslutningskonklusjon" in resultat.data).toBe(false);
    }
  });
});

describe("kontrollsakStatusSchema", () => {
  it("godtar alle fire statuser", () => {
    expect(kontrollsakStatusSchema.safeParse("VENTER_PA_INFORMASJON").success).toBe(true);
    expect(kontrollsakStatusSchema.safeParse("VENTER_PA_VEDTAK").success).toBe(true);
    expect(kontrollsakStatusSchema.safeParse("I_BERO").success).toBe(true);
    expect(kontrollsakStatusSchema.safeParse("VENTER_PA_RESULTAT").success).toBe(true);
  });

  it("avviser ukjent status", () => {
    expect(kontrollsakStatusSchema.safeParse("UKJENT").success).toBe(false);
  });
});

describe("adresseskjermet i kontrollobjekt", () => {
  it("defaulter adresseskjermet til false når feltet mangler", () => {
    const resultat = kontrollsakResponseSchema.safeParse({ ...basisSak, steg: "UTREDES" });
    expect(resultat.success).toBe(true);
    if (resultat.success) {
      expect(resultat.data.adresseskjermet).toBe(false);
    }
  });

  it("parser adresseskjermet = true fra kontrollobjektet", () => {
    const resultat = kontrollsakResponseSchema.safeParse({
      ...basisSak,
      steg: "UTREDES",
      kontrollobjekt: {
        personIdent: "12345678901",
        navn: "Ola Nordmann",
        adresseskjermet: true,
      },
    });
    expect(resultat.success).toBe(true);
    if (resultat.success) {
      expect(resultat.data.adresseskjermet).toBe(true);
    }
  });

  it("parser adresseskjermet = false fra kontrollobjektet", () => {
    const resultat = kontrollsakResponseSchema.safeParse({
      ...basisSak,
      steg: "UTREDES",
      kontrollobjekt: {
        personIdent: "12345678901",
        navn: "Ola Nordmann",
        adresseskjermet: false,
      },
    });
    expect(resultat.success).toBe(true);
    if (resultat.success) {
      expect(resultat.data.adresseskjermet).toBe(false);
    }
  });
});

describe("kontrollsakHendelseResponseSchema – historikkfelt", () => {
  const basisHendelse = {
    hendelseId: "00000000-0000-4000-8000-000000000099",
    tidspunkt: "2026-01-01T10:00:00Z",
    hendelsesType: "STATUS_ENDRET",
    sakId: 1,
    kategori: "ARBEID",
    prioritet: "NORMAL",
    steg: "UTREDES",
    ytelseTyper: [],
  } as const;

  it("parser hendelse med status og beskrivelse", () => {
    const resultat = kontrollsakHendelseResponseSchema.safeParse({
      ...basisHendelse,
      status: "VENTER_PA_INFORMASJON",
      beskrivelse: "Venter på svar fra bruker",
    });
    expect(resultat.success).toBe(true);
    if (resultat.success) {
      expect(resultat.data.status).toBe("VENTER_PA_INFORMASJON");
      expect(resultat.data.beskrivelse).toBe("Venter på svar fra bruker");
    }
  });

  it("parser hendelse uten status og beskrivelse", () => {
    const resultat = kontrollsakHendelseResponseSchema.safeParse(basisHendelse);
    expect(resultat.success).toBe(true);
  });
});
