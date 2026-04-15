import { kontrollsakResponseSchema, type KontrollsakResponse } from "~/saker/types.backend";
import { lagMockKontrollsak, lagMockSakUuid } from "~/saker/mock-uuid";

function lagSaksbehandlere(eierNavIdent: string | null, eierNavn: string | null) {
  return {
    eier: eierNavIdent && eierNavn ? { navIdent: eierNavIdent, navn: eierNavn } : null,
    deltMed: [],
    opprettetAv: { navIdent: "Z999999", navn: "Test Saksbehandler" },
  };
}

function lagYtelse(
  id: string,
  type: string,
  periodeFra: string,
  periodeTil: string,
  belop?: number,
) {
  return { id, type, periodeFra, periodeTil, belop: belop ?? null };
}

const initialeMockMineKontrollsaker = [
  {
    id: "201",
    personIdent: "11223344556",
    saksbehandlere: lagSaksbehandlere("Z999999", "Test Saksbehandler"),
    status: "UTREDES",
    kategori: "FEILUTBETALING",
    kilde: "INTERN",
    misbruktype: ["Feil inntektsgrunnlag"],
    prioritet: "NORMAL",
    ytelser: [lagYtelse("201-ytelse-1", "Dagpenger", "2025-08-01", "2026-01-31")],
    merking: null,
    resultat: {
      utredning: {
        id: "201-utredning-1",
        opprettet: "2026-01-16T00:00:00Z",
        resultat: "Mulig dobbeltutbetaling av dagpenger. Kontrollert mot A-ordning.",
      },
      forvaltning: null,
      strafferettsligVurdering: null,
    },
    opprettet: "2026-01-10T00:00:00Z",
    oppdatert: "2026-01-16T00:00:00Z",
  },
  {
    id: "202",
    personIdent: "22334455667",
    saksbehandlere: lagSaksbehandlere("Z999999", "Test Saksbehandler"),
    status: "FORVALTNING",
    kategori: "FEILUTBETALING",
    kilde: "INTERN",
    misbruktype: ["Feil inntektsgrunnlag"],
    prioritet: "NORMAL",
    ytelser: [lagYtelse("202-ytelse-1", "Sykepenger", "2026-02-05", "2026-02-05")],
    merking: null,
    resultat: {
      utredning: {
        id: "202-utredning-1",
        opprettet: "2026-02-07T00:00:00Z",
        resultat: "Registersamkjøring avdekket avvik i sykepengegrunnlag.",
      },
      forvaltning: {
        id: "202-forvaltning-1",
        dato: "2026-02-08",
        resultat: "Sendt til forvaltning",
      },
      strafferettsligVurdering: null,
    },
    opprettet: "2026-02-05T00:00:00Z",
    oppdatert: "2026-02-07T00:00:00Z",
  },
  {
    id: "203",
    personIdent: "56789012345",
    saksbehandlere: lagSaksbehandlere("Z123456", "Lise Raus"),
    status: "UTREDES",
    kategori: "MISBRUK",
    kilde: "EKSTERN",
    misbruktype: ["Skjult samliv"],
    prioritet: "NORMAL",
    ytelser: [lagYtelse("203-ytelse-1", "Foreldrepenger", "2022-01-01", "2025-01-01", 300000)],
    merking: "PRIORITERT",
    resultat: {
      utredning: {
        id: "203-utredning-1",
        opprettet: "2026-02-20T00:00:00Z",
        resultat: "Tips om mulig misbruk av foreldrepenger. Oppfølging pågår.",
      },
      forvaltning: null,
      strafferettsligVurdering: null,
    },
    opprettet: "2026-02-20T00:00:00Z",
    oppdatert: null,
  },
  {
    id: "204",
    personIdent: "44556677889",
    saksbehandlere: lagSaksbehandlere(null, null),
    status: "UFORDELT",
    kategori: "FEILUTBETALING",
    kilde: "EKSTERN",
    misbruktype: ["Feil inntektsgrunnlag"],
    prioritet: "NORMAL",
    ytelser: [
      lagYtelse("204-ytelse-1", "Arbeidsavklaringspenger", "2026-03-01", "2026-03-01"),
      lagYtelse("204-ytelse-2", "Sykepenger", "2026-03-01", "2026-03-01"),
    ],
    merking: null,
    resultat: null,
    opprettet: "2026-03-01T00:00:00Z",
    oppdatert: "2026-03-03T00:00:00Z",
  },
  {
    id: "207",
    personIdent: "77889900112",
    saksbehandlere: lagSaksbehandlere("Z999999", "Test Saksbehandler"),
    status: "AVSLUTTET",
    kategori: "OPPFOLGING",
    kilde: "EKSTERN",
    misbruktype: [],
    prioritet: "NORMAL",
    ytelser: [lagYtelse("207-ytelse-1", "Foreldrepenger", "2026-03-08", "2026-03-08")],
    merking: null,
    resultat: {
      utredning: {
        id: "207-utredning-1",
        opprettet: "2026-03-11T00:00:00Z",
        resultat: "Henlagt tips etter vurdering av dokumentasjon.",
      },
      forvaltning: null,
      strafferettsligVurdering: null,
    },
    opprettet: "2026-03-08T00:00:00Z",
    oppdatert: "2026-03-11T00:00:00Z",
  },
  {
    id: "209",
    personIdent: "99001122334",
    saksbehandlere: lagSaksbehandlere("Z999999", "Test Saksbehandler"),
    status: "AVSLUTTET",
    kategori: "UDEFINERT",
    kilde: "EKSTERN",
    misbruktype: [],
    prioritet: "NORMAL",
    ytelser: [
      lagYtelse("209-ytelse-1", "Dagpenger", "2026-03-12", "2026-03-12"),
      lagYtelse("209-ytelse-2", "Sykepenger", "2026-03-12", "2026-03-12"),
    ],
    merking: null,
    resultat: {
      utredning: {
        id: "209-utredning-1",
        opprettet: "2026-03-15T00:00:00Z",
        resultat: "Sak avsluttet etter ferdig behandling.",
      },
      forvaltning: null,
      strafferettsligVurdering: null,
    },
    opprettet: "2026-03-12T00:00:00Z",
    oppdatert: "2026-03-15T00:00:00Z",
  },
  {
    id: "210",
    personIdent: "00112233445",
    saksbehandlere: lagSaksbehandlere("Z999999", "Test Saksbehandler"),
    status: "AVSLUTTET",
    kategori: "MISBRUK",
    kilde: "INTERN",
    misbruktype: ["Identitetsmisbruk"],
    prioritet: "NORMAL",
    ytelser: [lagYtelse("210-ytelse-1", "Pleiepenger", "2026-03-14", "2026-03-14")],
    merking: null,
    resultat: {
      utredning: {
        id: "210-utredning-1",
        opprettet: "2026-03-17T00:00:00Z",
        resultat: "Henlagt sak etter intern kontroll.",
      },
      forvaltning: null,
      strafferettsligVurdering: null,
    },
    opprettet: "2026-03-14T00:00:00Z",
    oppdatert: "2026-03-17T00:00:00Z",
  },
] satisfies KontrollsakResponse[];

function lagMockMineKontrollsaker() {
  return initialeMockMineKontrollsaker.map((sak) =>
    kontrollsakResponseSchema.parse(lagMockKontrollsak(sak, 2)),
  );
}

export let mockMineKontrollsaker: KontrollsakResponse[] = lagMockMineKontrollsaker();

export const mockMineSakerAvslutningsdatoer = {
  [lagMockSakUuid("207", 2)]: "2026-03-12",
  [lagMockSakUuid("209", 2)]: "2026-03-16",
  [lagMockSakUuid("210", 2)]: "2026-03-18",
};

export const mockMineSakerTidligereTipsSakIder = [lagMockSakUuid("207", 2)];

export function resetMockMineSaker() {
  mockMineKontrollsaker = lagMockMineKontrollsaker();
}
