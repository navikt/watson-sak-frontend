import { kontrollsakResponseSchema, type KontrollsakResponse } from "~/saker/types.backend";
import { normaliserLegacyKontrollsak, oppdaterTilgjengeligeHandlinger } from "~/saker/mock-uuid";
import { registrerTomtFilområdeForSak } from "~/testing/mock-store/filer.server";
import { berikLegacySakMedPerson } from "~/testing/mock-store/personer.server";
import type { MockState } from "~/testing/mock-store/session.server";

const deltMedEksempel = [
  {
    navn: "Kari Nordmann",
    enhet: "Nord",
    navIdent: "Z123456",
  },
  {
    navn: "Ada Larsen",
    enhet: "Øst",
    navIdent: "Z234567",
  },
];

const initialeMockKontrollsaker = [
  {
    id: "101",
    personIdent: "12345678901",
    saksbehandler: "Z999999",
    saksbehandlere: { deltMed: deltMedEksempel },
    status: "OPPRETTET",
    kategori: "SAMLIV",
    prioritet: "NORMAL",
    mottakEnhet: "Nord",
    mottakSaksbehandler: "Z999999",
    ytelser: [
      {
        id: "101-ytelse-1",
        type: "Barnetrygd",
        periodeFra: "2026-01-13",
        periodeTil: "2026-01-13",
      },
    ],
    bakgrunn: {
      id: "00000000-0000-4000-8000-000000000001",
      kilde: "EKSTERN",
      innhold: "Tips om mulig feil i barnetrygd-sak.",
      avsender: null,
      vedlegg: [],
      tilleggsopplysninger: null,
    },
    misbrukstyper: ["Endret sivilstatus"],
    resultat: null,
    opprettet: "2026-01-13T00:00:00Z",
    oppdatert: null,
  },
  {
    id: "102",
    personIdent: "23456789012",
    saksbehandler: "Z999999",
    saksbehandlere: { deltMed: [] },
    status: "OPPRETTET",
    kategori: "ARBEID",
    prioritet: "NORMAL",
    mottakEnhet: "Øst",
    mottakSaksbehandler: "Z999999",
    ytelser: [
      {
        id: "102-ytelse-1",
        type: "Dagpenger",
        periodeFra: "2026-01-13",
        periodeTil: "2026-01-13",
      },
    ],
    bakgrunn: {
      id: "00000000-0000-4000-8000-000000000002",
      kilde: "INTERN",
      innhold: "Tips fra arbeidsgiver om mulig feil registrering.",
      avsender: null,
      vedlegg: [],
      tilleggsopplysninger: null,
    },
    misbrukstyper: ["Fiktivt arbeidsforhold"],
    resultat: null,
    opprettet: "2026-01-13T00:00:00Z",
    oppdatert: null,
  },
  {
    id: "103",
    personIdent: "34567890123",
    saksbehandler: "Z999999",
    saksbehandlere: { deltMed: [] },
    status: "AVKLART",
    kategori: "SAMLIV",
    prioritet: "NORMAL",
    mottakEnhet: "Nord",
    mottakSaksbehandler: "Z999999",
    ytelser: [
      {
        id: "103-ytelse-1",
        type: "Barnetrygd",
        periodeFra: "2026-02-16",
        periodeTil: "2026-02-16",
      },
    ],
    bakgrunn: {
      id: "00000000-0000-4000-8000-000000000003",
      kilde: "INTERN",
      innhold: "Intern gjennomgang av barnetrygd.",
      avsender: null,
      vedlegg: [],
      tilleggsopplysninger: null,
    },
    misbrukstyper: ["Endret sivilstatus"],
    resultat: null,
    opprettet: "2026-02-16T00:00:00Z",
    oppdatert: null,
  },
  {
    id: "104",
    personIdent: "45678901234",
    saksbehandler: "Z999999",
    saksbehandlere: { deltMed: [] },
    status: "OPPRETTET",
    kategori: "UTLAND",
    prioritet: "NORMAL",
    mottakEnhet: "Vest",
    mottakSaksbehandler: "Z999999",
    ytelser: [
      {
        id: "104-ytelse-1",
        type: "Dagpenger",
        periodeFra: "2026-01-13",
        periodeTil: "2026-01-13",
      },
    ],
    bakgrunn: {
      id: "00000000-0000-4000-8000-000000000004",
      kilde: "EKSTERN",
      innhold: "Tips om utenlandsopphold under dagpengeperiode.",
      avsender: null,
      vedlegg: [],
      tilleggsopplysninger: null,
    },
    misbrukstyper: ["Utenfor EØS"],
    resultat: null,
    opprettet: "2026-01-13T00:00:00Z",
    oppdatert: null,
  },
  {
    id: "105",
    personIdent: "56789012345",
    navn: "Birger Egil Lorumipsum-Olsen",
    alder: 43,
    saksbehandler: "Z999999",
    saksbehandlere: { deltMed: [] },
    status: "OPPRETTET",
    kategori: "ARBEID",
    prioritet: "NORMAL",
    mottakEnhet: "Øst",
    mottakSaksbehandler: "Z999999",
    ytelser: [
      {
        id: "105-ytelse-1",
        type: "Dagpenger",
        periodeFra: "2022-01-01",
        periodeTil: "2025-01-01",
      },
      {
        id: "105-ytelse-2",
        type: "AAP",
        periodeFra: "2022-01-01",
        periodeTil: "2025-01-01",
      },
      {
        id: "105-ytelse-3",
        type: "Foreldrepenger",
        periodeFra: "2022-01-01",
        periodeTil: "2025-01-01",
      },
    ],
    misbrukstyper: ["Fiktivt arbeidsforhold"],
    belop: 300000,
    merking: ["Utelivsbransje"],
    bakgrunn: {
      id: "00000000-0000-4000-8000-000000000005",
      kilde: "EKSTERN",
      innhold: "Tips om arbeidsforhold og sykepenger.",
      avsender: {
        id: "105-avsender",
        navn: "Publikum",
        telefon: null,
        adresse: null,
        anonym: false,
      },
      vedlegg: [],
      tilleggsopplysninger: null,
    },
    resultat: null,
    opprettet: "2026-01-13T00:00:00Z",
    oppdatert: null,
  },
  {
    id: "106",
    personIdent: "67890123456",
    saksbehandler: "Z999999",
    saksbehandlere: { deltMed: [] },
    status: "AVKLART",
    kategori: "SAMLIV",
    prioritet: "NORMAL",
    mottakEnhet: "Nord",
    mottakSaksbehandler: "Z999999",
    ytelser: [
      {
        id: "106-ytelse-1",
        type: "Barnetrygd",
        periodeFra: "2026-02-16",
        periodeTil: "2026-02-16",
      },
    ],
    bakgrunn: {
      id: "00000000-0000-4000-8000-000000000006",
      kilde: "EKSTERN",
      innhold: "Opplysning om samlivsendring i barnetrygdsak.",
      avsender: null,
      vedlegg: [],
      tilleggsopplysninger: null,
    },
    misbrukstyper: ["Endret sivilstatus"],
    resultat: null,
    opprettet: "2026-02-16T00:00:00Z",
    oppdatert: null,
  },
  {
    id: "107",
    personIdent: "78901234567",
    saksbehandler: "Z999999",
    saksbehandlere: { deltMed: [] },
    status: "OPPRETTET",
    kategori: "ANNET",
    prioritet: "NORMAL",
    mottakEnhet: "Vest",
    mottakSaksbehandler: "Z999999",
    ytelser: [
      {
        id: "107-ytelse-1",
        type: "AAP",
        periodeFra: "2026-01-13",
        periodeTil: "2026-01-13",
      },
    ],
    bakgrunn: {
      id: "00000000-0000-4000-8000-000000000007",
      kilde: "EKSTERN",
      innhold: "Tips om AAP med manglende dokumentasjon.",
      avsender: null,
      vedlegg: [],
      tilleggsopplysninger: null,
    },
    resultat: null,
    opprettet: "2026-01-13T00:00:00Z",
    oppdatert: null,
  },
  {
    id: "108",
    personIdent: "89012345678",
    saksbehandler: "Z999999",
    saksbehandlere: { deltMed: [] },
    status: "OPPRETTET",
    kategori: "DOKUMENTFALSK",
    prioritet: "NORMAL",
    mottakEnhet: "Øst",
    mottakSaksbehandler: "Z999999",
    ytelser: [
      {
        id: "108-ytelse-1",
        type: "Foreldrepenger",
        periodeFra: "2026-01-13",
        periodeTil: "2026-01-13",
      },
    ],
    bakgrunn: {
      id: "00000000-0000-4000-8000-000000000008",
      kilde: "EKSTERN",
      innhold: "Tips om mulig falsk dokumentasjon i foreldrepengesak.",
      avsender: null,
      vedlegg: [],
      tilleggsopplysninger: null,
    },
    resultat: null,
    opprettet: "2026-01-13T00:00:00Z",
    oppdatert: null,
  },
  {
    id: "109",
    personIdent: "90123456789",
    saksbehandler: "Z999999",
    saksbehandlere: { deltMed: [] },
    status: "AVKLART",
    kategori: "ARBEID",
    prioritet: "NORMAL",
    mottakEnhet: "Nord",
    mottakSaksbehandler: "Z999999",
    ytelser: [
      {
        id: "109-ytelse-1",
        type: "Dagpenger",
        periodeFra: "2026-01-13",
        periodeTil: "2026-01-13",
      },
    ],
    bakgrunn: {
      id: "00000000-0000-4000-8000-000000000009",
      kilde: "EKSTERN",
      innhold: "Oppfølging av dagpengesak fra a-ordningen.",
      avsender: null,
      vedlegg: [],
      tilleggsopplysninger: null,
    },
    misbrukstyper: ["Feil inntektsgrunnlag"],
    resultat: null,
    opprettet: "2026-01-13T00:00:00Z",
    oppdatert: null,
  },
  {
    id: "110",
    personIdent: "11223344556",
    saksbehandler: "Z999999",
    saksbehandlere: { deltMed: [] },
    status: "OPPRETTET",
    kategori: "UTLAND",
    prioritet: "NORMAL",
    mottakEnhet: "Vest",
    mottakSaksbehandler: "Z999999",
    ytelser: [
      {
        id: "110-ytelse-1",
        type: "Sykepenger",
        periodeFra: "2026-01-13",
        periodeTil: "2026-01-13",
      },
    ],
    bakgrunn: {
      id: "00000000-0000-4000-8000-000000000010",
      kilde: "EKSTERN",
      innhold: "Tips om sykepenger under utenlandsopphold.",
      avsender: null,
      vedlegg: [],
      tilleggsopplysninger: null,
    },
    misbrukstyper: ["Utenfor EØS"],
    resultat: null,
    opprettet: "2026-01-13T00:00:00Z",
    oppdatert: null,
  },
  {
    id: "111",
    personIdent: "22334455667",
    saksbehandler: "Z999999",
    saksbehandlere: { deltMed: [] },
    status: "OPPRETTET",
    kategori: "TILTAK",
    prioritet: "NORMAL",
    mottakEnhet: "Analyse",
    mottakSaksbehandler: "Z999999",
    ytelser: [
      {
        id: "111-ytelse-1",
        type: "Foreldrepenger",
        periodeFra: "2026-01-13",
        periodeTil: "2026-01-13",
      },
    ],
    bakgrunn: {
      id: "00000000-0000-4000-8000-000000000011",
      kilde: "EKSTERN",
      innhold: "Tips om foreldrepenger knyttet til tiltak.",
      avsender: null,
      vedlegg: [],
      tilleggsopplysninger: null,
    },
    misbrukstyper: ["Misbruk av tiltaksplass"],
    resultat: null,
    opprettet: "2026-01-13T00:00:00Z",
    oppdatert: null,
  },
  {
    id: "112",
    personIdent: "33445566778",
    saksbehandler: "Z999999",
    saksbehandlere: { deltMed: [] },
    status: "AVKLART",
    kategori: "IDENTITET",
    prioritet: "NORMAL",
    mottakEnhet: "Nord",
    mottakSaksbehandler: "Z999999",
    ytelser: [
      {
        id: "112-ytelse-1",
        type: "Barnetrygd",
        periodeFra: "2026-02-16",
        periodeTil: "2026-02-16",
      },
    ],
    bakgrunn: {
      id: "00000000-0000-4000-8000-000000000012",
      kilde: "INTERN",
      innhold: "Avklart tips om identitet og barnetrygd.",
      avsender: null,
      vedlegg: [],
      tilleggsopplysninger: null,
    },
    misbrukstyper: ["Identitetsmisbruk"],
    resultat: null,
    opprettet: "2026-02-16T00:00:00Z",
    oppdatert: null,
  },
  {
    id: "113",
    personIdent: "44556677889",
    saksbehandler: "Z999999",
    saksbehandlere: { deltMed: [] },
    status: "UTREDES",
    kategori: "ANNET",
    prioritet: "NORMAL",
    mottakEnhet: "Nord",
    mottakSaksbehandler: "Z999999",
    ytelser: [
      {
        id: "113-ytelse-1",
        type: "Barnetrygd",
        periodeFra: "2026-02-10",
        periodeTil: "2026-02-10",
      },
    ],
    bakgrunn: {
      id: "00000000-0000-4000-8000-000000000013",
      kilde: "INTERN",
      innhold: "Sak er allerede under utredning og skal ikke vises.",
      avsender: null,
      vedlegg: [],
      tilleggsopplysninger: null,
    },
    resultat: null,
    opprettet: "2026-02-10T00:00:00Z",
    oppdatert: null,
  },
  {
    id: "114",
    personIdent: "55667788990",
    saksbehandler: "Z999999",
    saksbehandlere: { deltMed: [] },
    status: "AVSLUTTET",
    kategori: "ANNET",
    prioritet: "NORMAL",
    mottakEnhet: "Øst",
    mottakSaksbehandler: "Z999999",
    ytelser: [
      {
        id: "114-ytelse-1",
        type: "Dagpenger",
        periodeFra: "2026-02-18",
        periodeTil: "2026-02-18",
      },
    ],
    bakgrunn: {
      id: "00000000-0000-4000-8000-000000000014",
      kilde: "EKSTERN",
      innhold: "Sak er avsluttet og skal ikke vises.",
      avsender: null,
      vedlegg: [],
      tilleggsopplysninger: null,
    },
    resultat: null,
    opprettet: "2026-02-18T00:00:00Z",
    oppdatert: null,
  },
];

function lagMockKontrollsaker() {
  return initialeMockKontrollsaker.map((sak) =>
    kontrollsakResponseSchema.parse(normaliserLegacyKontrollsak(berikLegacySakMedPerson(sak))),
  );
}

/** Factory som brukes av session.server.ts for å bygge initial tilstand */
export const lagInitialKontrollsaker = lagMockKontrollsaker;

type NyMockFordelingssak = {
  personIdent: string;
  personNavn: string;
  saksbehandlere?: {
    eier?: {
      navIdent: string;
      navn: string;
      enhet?: string;
    } | null;
    deltMed?: Array<{
      navIdent: string;
      navn: string;
      enhet?: string;
    }>;
  };
  kategori: KontrollsakResponse["kategori"];
  kilde: KontrollsakResponse["kilde"];
  misbruktype: KontrollsakResponse["misbruktype"];
  prioritet: KontrollsakResponse["prioritet"];
  merking?: KontrollsakResponse["merking"];
  ytelser: Array<{
    type: string;
    periodeFra: string;
    periodeTil: string;
    belop?: number;
  }>;
};

export function leggTilMockSakIFordeling(
  state: MockState,
  nySak: NyMockFordelingssak,
): KontrollsakResponse {
  const opprettet = new Date().toISOString();

  const kontrollsak = kontrollsakResponseSchema.parse({
    id: state.nesteFordelingssakId++,
    personIdent: nySak.personIdent,
    personNavn: nySak.personNavn,
    saksbehandlere: {
      eier: nySak.saksbehandlere?.eier
        ? {
            navIdent: nySak.saksbehandlere.eier.navIdent,
            navn: nySak.saksbehandlere.eier.navn,
            enhet: nySak.saksbehandlere.eier.enhet ?? null,
          }
        : null,
      deltMed: (nySak.saksbehandlere?.deltMed ?? []).map((saksbehandler) => ({
        navIdent: saksbehandler.navIdent,
        navn: saksbehandler.navn,
        enhet: saksbehandler.enhet ?? null,
      })),
      opprettetAv: {
        navIdent: "Z123456",
        navn: "Test Saksbehandler",
        enhet: null,
      },
    },
    status: "OPPRETTET",
    blokkert: null,
    kategori: nySak.kategori,
    kilde: nySak.kilde,
    misbruktype: nySak.misbruktype,
    prioritet: nySak.prioritet,
    ytelser: nySak.ytelser.map((ytelse) => ({
      id: crypto.randomUUID(),
      type: ytelse.type,
      periodeFra: ytelse.periodeFra,
      periodeTil: ytelse.periodeTil,
      belop: ytelse.belop ?? null,
    })),
    merking: nySak.merking ?? null,
    oppgaver: [],
    opprettet,
    oppdatert: null,
  });

  const kontrollsakMedHandlinger = oppdaterTilgjengeligeHandlinger(kontrollsak);

  registrerTomtFilområdeForSak(state, String(kontrollsakMedHandlinger.id));
  state.kontrollsaker.unshift(kontrollsakMedHandlinger);

  return kontrollsakMedHandlinger;
}

export const mockYtelser = ["Dagpenger", "Sykepenger", "Barnetrygd", "AAP", "Foreldrepenger"];
