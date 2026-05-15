import { describe, expect, it } from "vitest";
import {
  blokkeringsarsakSchema,
  kontrollsakResponseSchema,
  kontrollsakHendelseResponseSchema,
} from "./types.backend";

const basisSak = {
  id: 1,
  personIdent: "12345678901",
  personNavn: "Ola Nordmann",
  saksbehandlere: {
    ansvarlig: { navIdent: "Z123456", navn: "Ola Saksbehandler", enhet: "4812" },
    deltMed: [],
    opprettetAv: { navIdent: "Z654321", navn: "Kari Oppretter", enhet: "4812" },
  },
  blokkert: null,
  kategori: "ARBEID",
  kilde: "NAV_KONTROLL",
  misbruktype: [],
  prioritet: "NORMAL",
  ytelser: [],
  merking: null,
  opprettet: "2026-01-01T00:00:00Z",
  oppdatert: null,
} as const;

describe("kontrollsakResponseSchema – ny kontraktmodell", () => {
  it("parser sak med status OPPRETTET og blokkert null", () => {
    const resultat = kontrollsakResponseSchema.safeParse({ ...basisSak, status: "OPPRETTET" });
    expect(resultat.success).toBe(true);
    if (resultat.success) {
      expect(resultat.data.status).toBe("OPPRETTET");
      expect(resultat.data.blokkert).toBeNull();
    }
  });

  it("parser sak med alle gyldige statuser", () => {
    const gyldige = [
      "OPPRETTET",
      "UTREDES",
      "STRAFFERETTSLIG_VURDERING",
      "ANMELDT",
      "HENLAGT",
      "AVSLUTTET",
    ] as const;

    for (const status of gyldige) {
      const resultat = kontrollsakResponseSchema.safeParse({ ...basisSak, status });
      expect(resultat.success, `Status ${status} skal være gyldig`).toBe(true);
    }
  });

  it("avviser gamle statuser VENTER_PA_INFORMASJON, VENTER_PA_VEDTAK og ANMELDELSE_VURDERES", () => {
    for (const status of ["VENTER_PA_INFORMASJON", "VENTER_PA_VEDTAK", "ANMELDELSE_VURDERES"]) {
      const resultat = kontrollsakResponseSchema.safeParse({ ...basisSak, status });
      expect(resultat.success, `Status ${status} skal være ugyldig`).toBe(false);
    }
  });

  it("parser sak med alle gyldige blokkeringsårsaker", () => {
    const årsaker = ["VENTER_PA_INFORMASJON", "VENTER_PA_VEDTAK", "I_BERO"] as const;

    for (const blokkert of årsaker) {
      const resultat = kontrollsakResponseSchema.safeParse({
        ...basisSak,
        status: "UTREDES",
        blokkert,
      });
      expect(resultat.success, `Blokkeringsårsak ${blokkert} skal være gyldig`).toBe(true);
    }
  });

  it("har ikke iBero, tilgjengeligeHandlinger eller avslutningskonklusjon i parsede data", () => {
    const resultat = kontrollsakResponseSchema.safeParse({ ...basisSak, status: "UTREDES" });
    expect(resultat.success).toBe(true);
    if (resultat.success) {
      expect("iBero" in resultat.data).toBe(false);
      expect("tilgjengeligeHandlinger" in resultat.data).toBe(false);
      expect("avslutningskonklusjon" in resultat.data).toBe(false);
    }
  });
});

describe("blokkeringsarsakSchema", () => {
  it("godtar alle tre blokkeringsårsaker", () => {
    expect(blokkeringsarsakSchema.safeParse("VENTER_PA_INFORMASJON").success).toBe(true);
    expect(blokkeringsarsakSchema.safeParse("VENTER_PA_VEDTAK").success).toBe(true);
    expect(blokkeringsarsakSchema.safeParse("I_BERO").success).toBe(true);
  });

  it("avviser ukjent årsak", () => {
    expect(blokkeringsarsakSchema.safeParse("UKJENT").success).toBe(false);
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
    status: "UTREDES",
    ytelseTyper: [],
  } as const;

  it("parser hendelse med blokkert og beskrivelse", () => {
    const resultat = kontrollsakHendelseResponseSchema.safeParse({
      ...basisHendelse,
      blokkert: "VENTER_PA_INFORMASJON",
      beskrivelse: "Venter på svar fra bruker",
    });
    expect(resultat.success).toBe(true);
    if (resultat.success) {
      expect(resultat.data.blokkert).toBe("VENTER_PA_INFORMASJON");
      expect(resultat.data.beskrivelse).toBe("Venter på svar fra bruker");
    }
  });

  it("parser hendelse uten blokkert og beskrivelse", () => {
    const resultat = kontrollsakHendelseResponseSchema.safeParse(basisHendelse);
    expect(resultat.success).toBe(true);
  });
});
