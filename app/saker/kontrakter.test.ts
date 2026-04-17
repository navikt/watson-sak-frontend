import { describe, expect, it } from "vitest";
import { mockKontrollsaker } from "~/fordeling/mock-data.server";
import { mockMineKontrollsaker } from "~/mine-saker/mock-data.server";
import { mockStatistikkSaker } from "~/statistikk/mock-data.server";
import { hentHistorikk } from "./historikk/mock-data.server";
import {
  kontrollsakHendelseResponseSchema,
  kontrollsakPageResponseSchema,
  kontrollsakResponseSchema,
} from "./types.backend";

const uuidMønster = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe("Kontrollsak-kontrakter", () => {
  it("parser en backend-shapet kontrollsak", () => {
    expect(
      kontrollsakResponseSchema.parse({
        id: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
        personIdent: "12345678901",
        personNavn: "Ola Nordmann",
        saksbehandlere: {
          eier: {
            navIdent: "Z123456",
            navn: "Saks Behandler",
            enhet: "4812",
          },
          deltMed: [],
          opprettetAv: {
            navIdent: "Z654321",
            navn: "Oppretter",
            enhet: "4801",
          },
        },
        status: "UFORDELT",
        kategori: "ARBEID",
        kilde: "NAV_KONTROLL",
        misbruktype: ["FIKTIVT_ARBEIDSFORHOLD"],
        prioritet: "NORMAL",
        ytelser: [
          {
            id: "2fa85f64-5717-4562-b3fc-2c963f66afa6",
            type: "Dagpenger",
            periodeFra: "2026-01-01",
            periodeTil: "2026-12-31",
            belop: 1000,
          },
        ],
        merking: "PRIORITERT",
        resultat: {
          utredning: {
            id: "8fa85f64-5717-4562-b3fc-2c963f66afa6",
            opprettet: "2026-03-20T12:34:56Z",
            resultat: "INFOSAK",
          },
          forvaltning: null,
          strafferettsligVurdering: null,
        },
        opprettet: "2026-03-20T12:34:56Z",
        oppdatert: null,
      }),
    ).toMatchObject({
      status: "UFORDELT",
      personNavn: "Ola Nordmann",
      ytelser: [{ type: "Dagpenger" }],
      kilde: "NAV_KONTROLL",
    });
  });

  it("tillater nullable resultat og oppdatert", () => {
    expect(
      kontrollsakResponseSchema.parse({
        id: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
        personIdent: "12345678901",
        personNavn: "Ola Nordmann",
        saksbehandlere: {
          eier: null,
          deltMed: [],
          opprettetAv: {
            navIdent: "Z123456",
            navn: "Oppretter",
            enhet: null,
          },
        },
        status: "UFORDELT",
        kategori: "ARBEID",
        kilde: "PUBLIKUM",
        misbruktype: [],
        prioritet: "NORMAL",
        ytelser: [],
        merking: null,
        resultat: null,
        opprettet: "2026-03-20T12:34:56Z",
        oppdatert: null,
      }),
    ).toMatchObject({
      resultat: null,
      oppdatert: null,
    });
  });

  it("parser side-respons med kontrollsaker", () => {
    expect(
      kontrollsakPageResponseSchema.parse({
        items: [
          {
            id: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
            personIdent: "12345678901",
            personNavn: "Ola Nordmann",
            saksbehandlere: {
              eier: null,
              deltMed: [],
              opprettetAv: {
                navIdent: "Z123456",
                navn: "Oppretter",
                enhet: null,
              },
            },
            status: "UFORDELT",
            kategori: "ARBEID",
            kilde: "PUBLIKUM",
            misbruktype: [],
            prioritet: "NORMAL",
            ytelser: [],
            merking: null,
            resultat: null,
            opprettet: "2026-03-20T12:34:56Z",
            oppdatert: null,
          },
        ],
        page: 0,
        size: 20,
        totalItems: 1,
        totalPages: 1,
      }),
    ).toMatchObject({
      totalItems: 1,
      items: [{ status: "UFORDELT" }],
    });
  });

  it("parser backend-shapet kontrollsak-hendelse", () => {
    expect(
      kontrollsakHendelseResponseSchema.parse({
        hendelseId: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
        tidspunkt: "2026-03-31T10:15:00Z",
        hendelsesType: "SAK_OPPRETTET",
        sakId: "4fa85f64-5717-4562-b3fc-2c963f66afa6",
        kategori: "ARBEID",
        prioritet: "NORMAL",
        status: "UFORDELT",
        ytelseTyper: ["Sykepenger"],
      }),
    ).toMatchObject({
      hendelsesType: "SAK_OPPRETTET",
      status: "UFORDELT",
    });
  });

  it("parser runtime-mockene som native backend-shapede kontrollsaker", () => {
    expect(() => {
      for (const sak of [...mockKontrollsaker, ...mockMineKontrollsaker, ...mockStatistikkSaker]) {
        kontrollsakResponseSchema.parse(sak);
      }
    }).not.toThrow();
  });

  it("bruker backend-valide UUID-er i aktive mock-kontrollsaker og generert historikk", () => {
    const aktiveMockSaker = [...mockKontrollsaker, ...mockMineKontrollsaker];

    for (const sak of aktiveMockSaker) {
      expect(sak.id).toMatch(uuidMønster);

      for (const ytelse of sak.ytelser) {
        expect(ytelse.id).toMatch(uuidMønster);
      }

      for (const hendelse of hentHistorikk(sak.id)) {
        expect(hendelse.hendelseId).toMatch(uuidMønster);
        expect(hendelse.sakId).toMatch(uuidMønster);
      }
    }
  });
});
