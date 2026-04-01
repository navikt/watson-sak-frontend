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
        saksbehandler: "Z123456",
        status: "OPPRETTET",
        kategori: "FEILUTBETALING",
        prioritet: "NORMAL",
        mottakEnhet: "4812",
        mottakSaksbehandler: "Z654321",
        ytelser: [
          {
            id: "2fa85f64-5717-4562-b3fc-2c963f66afa6",
            type: "Dagpenger",
            periodeFra: "2026-01-01",
            periodeTil: "2026-12-31",
          },
        ],
        bakgrunn: {
          id: "1fa85f64-5717-4562-b3fc-2c963f66afa6",
          kilde: "telefon",
          innhold: "Tips mottatt",
          avsender: {
            id: "0fa85f64-5717-4562-b3fc-2c963f66afa6",
            navn: "Ola Nordmann",
            telefon: "12345678",
            adresse: null,
            anonym: false,
          },
          vedlegg: [
            {
              id: "9fa85f64-5717-4562-b3fc-2c963f66afa6",
              filnavn: "tips.pdf",
              lokasjon: "gs://bucket/tips.pdf",
            },
          ],
          tilleggsopplysninger: null,
        },
        resultat: {
          avklaring: {
            id: "8fa85f64-5717-4562-b3fc-2c963f66afa6",
            saksbehandler: "Z123456",
            dato: "2026-03-20",
            resultat: "IKKE_RELEVANT",
            begrunnelse: null,
          },
          utredning: null,
          forvaltning: null,
        },
        opprettet: "2026-03-20T12:34:56Z",
        oppdatert: null,
      }),
    ).toMatchObject({
      status: "OPPRETTET",
      ytelser: [{ type: "Dagpenger" }],
      bakgrunn: { kilde: "telefon" },
    });
  });

  it("tillater nullable bakgrunn, resultat og oppdatert", () => {
    expect(
      kontrollsakResponseSchema.parse({
        id: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
        personIdent: "12345678901",
        saksbehandler: "Z123456",
        status: "OPPRETTET",
        kategori: "FEILUTBETALING",
        prioritet: "NORMAL",
        mottakEnhet: "4812",
        mottakSaksbehandler: "Z654321",
        ytelser: [],
        bakgrunn: null,
        resultat: null,
        opprettet: "2026-03-20T12:34:56Z",
        oppdatert: null,
      }),
    ).toMatchObject({
      bakgrunn: null,
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
            saksbehandler: "Z123456",
            status: "OPPRETTET",
            kategori: "FEILUTBETALING",
            prioritet: "NORMAL",
            mottakEnhet: "4812",
            mottakSaksbehandler: "Z654321",
            ytelser: [],
            bakgrunn: null,
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
      items: [{ status: "OPPRETTET" }],
    });
  });

  it("parser backend-shapet kontrollsak-hendelse", () => {
    expect(
      kontrollsakHendelseResponseSchema.parse({
        hendelseId: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
        tidspunkt: "2026-03-31T10:15:00Z",
        hendelsesType: "SAK_OPPRETTET",
        sakId: "4fa85f64-5717-4562-b3fc-2c963f66afa6",
        kategori: "FEILUTBETALING",
        prioritet: "NORMAL",
        status: "OPPRETTET",
        ytelseTyper: ["Sykepenger"],
        kilde: "ANONYM_TIPS",
        avklaringResultat: null,
        mottakEnhet: "4812",
      }),
    ).toMatchObject({
      hendelsesType: "SAK_OPPRETTET",
      status: "OPPRETTET",
      mottakEnhet: "4812",
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

      if (sak.bakgrunn?.avsender) {
        expect(sak.bakgrunn.avsender.id).toMatch(uuidMønster);
      }

      for (const hendelse of hentHistorikk(sak.id)) {
        expect(hendelse.hendelseId).toMatch(uuidMønster);
        expect(hendelse.sakId).toMatch(uuidMønster);
      }
    }
  });
});
