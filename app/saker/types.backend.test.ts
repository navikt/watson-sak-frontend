import { describe, expect, it } from "vitest";
import {
  kontrollsakStatusSchema,
  kontrollsakResponseSchema,
  kontrollsakHendelseResponseSchema,
  tillatteHandlingerResponseSchema,
  normaliserKontrollnotat,
  registrerHenleggelsesnotaterRequestSchema,
  registrerHenleggelsesnotaterResponseSchema,
  registrerteHenleggelsesnotaterResponseSchema,
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
  it("bevarer valgt visningsnavn når skjemaet parses på nytt i nettleseren", () => {
    const sak = kontrollsakResponseSchema.parse({ ...basisSak, steg: "OPPRETTET" });
    const valgtNavn = "Petter Øst";
    const medValgtNavn = {
      ...sak,
      saksbehandlere: {
        ...sak.saksbehandlere,
        eier: { ...basisSak.saksbehandlere.ansvarlig, navn: valgtNavn },
      },
    };

    const reparsert = kontrollsakResponseSchema.parse(medValgtNavn);

    expect(reparsert.saksbehandlere.eier?.navn).toBe(valgtNavn);
  });

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
    expect(kontrollsakStatusSchema.safeParse("AKTIV").success).toBe(true);
    expect(kontrollsakStatusSchema.safeParse("VENTER_PA_INFORMASJON").success).toBe(true);
    expect(kontrollsakStatusSchema.safeParse("VENTER_PA_VEDTAK").success).toBe(true);
    expect(kontrollsakStatusSchema.safeParse("I_BERO").success).toBe(true);
    expect(kontrollsakStatusSchema.safeParse("VENTER_PA_RESULTAT").success).toBe(true);
  });

  describe("tillatteHandlingerResponseSchema", () => {
    const svar = {
      versjon: 1,
      tilstand: {
        steg: "UTREDNING",
        status: "AKTIV",
        statusFørBero: null,
        resultat: null,
        ytelser: [],
      },
      handlinger: [
        {
          type: "FLYTT_TIL_NESTE_STEG",
          metode: "POST",
          sti: "/api/v1/kontrollsaker/1/steg",
        },
        {
          type: "REGISTRER_RESULTAT",
          metode: "PUT",
          sti: "/api/v1/kontrollsaker/1/resultat",
        },
      ],
      tillatteSteg: ["FORVALTNING"],
      tillatteStatuser: ["AKTIV", "I_BERO"],
      tillatteResultater: ["HENLAGT"],
      paakrevdeRegistreringer: ["utredning.type"],
      paakrevdeRegistreringerPerSteg: { FORVALTNING: ["utredning.type", "ytelser[].belop"] },
      feltskjema: [
        {
          felt: "utredning.type",
          etikett: "Resultat fra utredningen",
          datatype: "enum",
          paakrevd: true,
          verdier: [{ verdi: "HENLAGT", etikett: "Henlagt" }],
        },
        {
          felt: "utredning.henleggelsesarsak",
          etikett: "Årsak til henleggelse",
          datatype: "enum",
          paakrevd: false,
          paakrevdNar: "utredning.type=HENLAGT",
          verdier: [{ verdi: "IKKE_TILSTREKKELIG_SKYLD", etikett: "Ikke tilstrekkelig skyld" }],
        },
      ],
    };

    it("parser tillatte handlinger, steg, statuser og fasefelter", () => {
      const resultat = tillatteHandlingerResponseSchema.safeParse(svar);

      expect(resultat.success).toBe(true);
      if (resultat.success) {
        expect(resultat.data.tilstand.steg).toBe("UTREDNING");
        expect(resultat.data.handlinger.map((handling) => handling.type)).toEqual([
          "FLYTT_TIL_NESTE_STEG",
          "REGISTRER_RESULTAT",
        ]);
        expect(resultat.data.feltskjema[0]?.verdier[0]?.etikett).toBe("Henlagt");
      }
    });

    it("normaliserer eldre kontrollnotatverdier i feltskjemaet", () => {
      const resultat = tillatteHandlingerResponseSchema.safeParse({
        ...svar,
        feltskjema: [
          {
            ...svar.feltskjema[0],
            verdier: [{ verdi: "KONTROLLNOTAT", etikett: "Kontrollnotat" }],
          },
        ],
      });

      expect(resultat.success).toBe(true);
      if (resultat.success) {
        expect(resultat.data.feltskjema[0]?.verdier[0]).toEqual({
          verdi: "ORIENTERINGSNOTAT",
          etikett: "Orienteringsnotat",
        });
      }
    });

    it("avviser ukjent feltdatatype og handlingstype", () => {
      expect(
        tillatteHandlingerResponseSchema.safeParse({
          ...svar,
          feltskjema: [{ felt: "x", etikett: "X", datatype: "ukjent", paakrevd: false }],
        }).success,
      ).toBe(false);
      expect(
        tillatteHandlingerResponseSchema.safeParse({
          ...svar,
          handlinger: [{ type: "KJOR_NOE", metode: "POST", sti: "/ukjent" }],
        }).success,
      ).toBe(false);
    });
  });

  it("avviser ukjent status", () => {
    expect(kontrollsakStatusSchema.safeParse("UKJENT").success).toBe(false);
  });
});

describe("normaliserKontrollnotat", () => {
  it.each(["KONTROLLNOTAT", "ORIENTERINGSNOTAT"])(
    "normaliserer %s til ORIENTERINGSNOTAT",
    (verdi) => {
      expect(normaliserKontrollnotat(verdi)).toBe("ORIENTERINGSNOTAT");
    },
  );
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

  it("parser markering for filopplasting ved saksopprettelse", () => {
    const resultat = kontrollsakHendelseResponseSchema.safeParse({
      ...basisHendelse,
      hendelsesType: "FIL_LASTET_OPP",
      opprettetVedSaksopprettelse: true,
    });

    expect(resultat.success).toBe(true);
    if (resultat.success) {
      expect(resultat.data.opprettetVedSaksopprettelse).toBe(true);
    }
  });

  it("normaliserer historisk HENLAGT-steg til AVSLUTTET", () => {
    const resultat = kontrollsakHendelseResponseSchema.safeParse({
      ...basisHendelse,
      steg: "HENLAGT",
    });

    expect(resultat.success).toBe(true);
    expect(resultat.data?.steg).toBe("AVSLUTTET");
  });

  it("parser hendelse uten status og beskrivelse", () => {
    const resultat = kontrollsakHendelseResponseSchema.safeParse(basisHendelse);
    expect(resultat.success).toBe(true);
  });
});

describe("henleggelsesnotat-skjemaer", () => {
  it("godtar ett eller to notater med unike typer", () => {
    expect(
      registrerHenleggelsesnotaterRequestSchema.safeParse({
        notater: [
          { notattype: "HENLEGGELSESNOTAT", tekst: "a" },
          { notattype: "ORIENTERINGSNOTAT", tekst: null },
        ],
      }).success,
    ).toBe(true);
  });

  it.each([
    ["ingen notater", []],
    [
      "tre notater",
      [
        { notattype: "HENLEGGELSESNOTAT", tekst: null },
        { notattype: "ORIENTERINGSNOTAT", tekst: null },
        { notattype: "ORIENTERINGSNOTAT", tekst: null },
      ],
    ],
    [
      "like typer",
      [
        { notattype: "HENLEGGELSESNOTAT", tekst: null },
        { notattype: "HENLEGGELSESNOTAT", tekst: null },
      ],
    ],
    ["for lang tekst", [{ notattype: "HENLEGGELSESNOTAT", tekst: "x".repeat(10_001) }]],
    ["ukjent type", [{ notattype: "KONTROLLNOTAT", tekst: null }]],
  ])("avviser %s", (_, notater) => {
    expect(registrerHenleggelsesnotaterRequestSchema.safeParse({ notater }).success).toBe(false);
  });

  it("godtar tekst på nøyaktig 10 000 tegn", () => {
    expect(
      registrerHenleggelsesnotaterRequestSchema.safeParse({
        notater: [{ notattype: "HENLEGGELSESNOTAT", tekst: "x".repeat(10_000) }],
      }).success,
    ).toBe(true);
  });

  it("parser svar på registrering", () => {
    const svar = {
      notater: [
        { notattype: "HENLEGGELSESNOTAT", utfall: "JOURNALFORT", journalpostId: "1" },
        { notattype: "ORIENTERINGSNOTAT", utfall: "FEILET", journalpostId: null },
      ],
    };
    expect(registrerHenleggelsesnotaterResponseSchema.parse(svar)).toEqual(svar);
    expect(
      registrerHenleggelsesnotaterResponseSchema.safeParse({
        notater: [{ notattype: "HENLEGGELSESNOTAT", utfall: "UKJENT", journalpostId: null }],
      }).success,
    ).toBe(false);
  });

  it("parser registrerte notater", () => {
    const svar = {
      notater: [
        {
          notattype: "ORIENTERINGSNOTAT",
          journalpostId: null,
          registrertTidspunkt: "2026-11-16T10:00:00Z",
        },
      ],
    };
    expect(registrerteHenleggelsesnotaterResponseSchema.parse(svar)).toEqual(svar);
    expect(
      registrerteHenleggelsesnotaterResponseSchema.safeParse({
        notater: [{ notattype: "ORIENTERINGSNOTAT", journalpostId: null }],
      }).success,
    ).toBe(false);
  });
});
