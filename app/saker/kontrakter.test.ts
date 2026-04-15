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
        saksbehandlere: {
          eier: {
            navIdent: "Z123456",
            navn: "Eier Navn",
          },
          deltMed: [
            {
              navIdent: "Z654321",
              navn: "Delt Saksbehandler",
            },
          ],
          opprettetAv: {
            navIdent: "Z111111",
            navn: "Oppretter Navn",
          },
        },
        status: "UFORDELT",
        kategori: "MISBRUK",
        kilde: "EKSTERN",
        misbruktype: ["Skjult samliv"],
        prioritet: "NORMAL",
        ytelser: [
          {
            id: "2fa85f64-5717-4562-b3fc-2c963f66afa6",
            type: "Dagpenger",
            periodeFra: "2026-01-01",
            periodeTil: "2026-12-31",
            belop: 1200,
          },
        ],
        merking: "SENSITIV",
        resultat: {
          utredning: {
            id: "8fa85f64-5717-4562-b3fc-2c963f66afa6",
            opprettet: "2026-03-20T11:00:00Z",
            resultat: "IKKE_MISBRUK",
          },
          forvaltning: {
            id: "7fa85f64-5717-4562-b3fc-2c963f66afa6",
            dato: "2026-03-21",
            resultat: "TILBAKEKREVING",
          },
          strafferettsligVurdering: {
            id: "6fa85f64-5717-4562-b3fc-2c963f66afa6",
            dato: "2026-03-22",
            resultat: "ANMELDES",
          },
        },
        opprettet: "2026-03-20T12:34:56Z",
        oppdatert: null,
      }),
    ).toMatchObject({
      status: "UFORDELT",
      saksbehandlere: { eier: { navIdent: "Z123456" } },
      kilde: "EKSTERN",
      misbruktype: ["Skjult samliv"],
      ytelser: [{ type: "Dagpenger", belop: 1200 }],
    });
  });

  it("tillater nullable resultat, merking og oppdatert", () => {
    expect(
      kontrollsakResponseSchema.parse({
        id: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
        personIdent: "12345678901",
        saksbehandlere: {
          eier: null,
          deltMed: [],
          opprettetAv: {
            navIdent: "Z111111",
            navn: "Oppretter Navn",
          },
        },
        status: "UFORDELT",
        kategori: "UDEFINERT",
        kilde: "INTERN",
        misbruktype: [],
        prioritet: "HOY",
        ytelser: [],
        merking: null,
        resultat: null,
        opprettet: "2026-03-20T12:34:56Z",
        oppdatert: null,
      }),
    ).toMatchObject({
      merking: null,
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
            saksbehandlere: {
              eier: null,
              deltMed: [],
              opprettetAv: {
                navIdent: "Z123456",
                navn: "Oppretter Navn",
              },
            },
            status: "UFORDELT",
            kategori: "FEILUTBETALING",
            kilde: "INTERN",
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
        kategori: "MISBRUK",
        prioritet: "NORMAL",
        status: "UFORDELT",
        ytelseTyper: ["Sykepenger"],
        kilde: "ANONYM_TIPS",
        avklaringResultat: null,
      }),
    ).toMatchObject({
      hendelsesType: "SAK_OPPRETTET",
      status: "UFORDELT",
      kategori: "MISBRUK",
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
