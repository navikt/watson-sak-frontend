import { formaterFødselsnummer } from "~/utils/string-utils";

export type MockPerson = {
  personIdent: string;
  navn: string;
  aktørId: string;
  alder: number;
};

const opprinneligeMockPersoner: MockPerson[] = [
  {
    personIdent: "03117845975",
    navn: "Birger Egil Lorumipsum-Olsen",
    aktørId: "12345678910113",
    alder: 43,
  },
  {
    personIdent: "12345678901",
    navn: "Ola Testesen",
    aktørId: "98765432100001",
    alder: 30,
  },
  {
    personIdent: "23456789012",
    navn: "Kari Nordmann",
    aktørId: "11223344556677",
    alder: 55,
  },
  {
    personIdent: "34567890123",
    navn: "Ingrid Testdatter",
    aktørId: "22334455667788",
    alder: 28,
  },
  {
    personIdent: "45678901234",
    navn: "Per Mockesen",
    aktørId: "33445566778899",
    alder: 39,
  },
  {
    personIdent: "56789012345",
    navn: "Birger Egil Lorumipsum-Olsen",
    aktørId: "44556677889900",
    alder: 43,
  },
  {
    personIdent: "67890123456",
    navn: "Morten Demo",
    aktørId: "55667788990011",
    alder: 33,
  },
  {
    personIdent: "78901234567",
    navn: "Lena Prøvesen",
    aktørId: "66778899001122",
    alder: 41,
  },
  {
    personIdent: "89012345678",
    navn: "Thomas Fiktiv",
    aktørId: "77889900112233",
    alder: 52,
  },
  {
    personIdent: "90123456789",
    navn: "Heidi Illustrasjon",
    aktørId: "88990011223344",
    alder: 36,
  },
  {
    personIdent: "01234567890",
    navn: "Jonas Scenario",
    aktørId: "99001122334455",
    alder: 24,
  },
  {
    personIdent: "11223344556",
    navn: "Kari Nordmann",
    aktørId: "10112233445566",
    alder: 31,
  },
  {
    personIdent: "22334455667",
    navn: "Siri Hansen",
    aktørId: "12131415161718",
    alder: 48,
  },
  {
    personIdent: "33445566778",
    navn: "Ingrid Berg",
    aktørId: "13141516171819",
    alder: 37,
  },
  {
    personIdent: "44556677889",
    navn: "Nora Berg",
    aktørId: "14151617181920",
    alder: 34,
  },
  {
    personIdent: "55667788990",
    navn: "Lars Nilsen",
    aktørId: "15161718192021",
    alder: 46,
  },
  {
    personIdent: "66778899001",
    navn: "Anne Lunde",
    aktørId: "16171819202122",
    alder: 42,
  },
  {
    personIdent: "77889900112",
    navn: "Mona Lie",
    aktørId: "17181920212223",
    alder: 51,
  },
  {
    personIdent: "88990011223",
    navn: "Jonas Vik",
    aktørId: "18192021222324",
    alder: 29,
  },
  {
    personIdent: "99001122334",
    navn: "Fatima Rahman",
    aktørId: "19202122232425",
    alder: 44,
  },
  {
    personIdent: "00112233445",
    navn: "Thomas Solberg",
    aktørId: "20212223242526",
    alder: 58,
  },
  // Backend-genererte demo-personer (1002–1028)
  {
    personIdent: "12345678902",
    navn: "Lena Kristiansen",
    aktørId: "30000000000002",
    alder: 34,
  },
  {
    personIdent: "12345678903",
    navn: "Petter Haugen",
    aktørId: "30000000000003",
    alder: 47,
  },
  {
    personIdent: "12345678904",
    navn: "Silje Moen",
    aktørId: "30000000000004",
    alder: 29,
  },
  {
    personIdent: "12345678905",
    navn: "Geir Andreassen",
    aktørId: "30000000000005",
    alder: 52,
  },
  {
    personIdent: "12345678906",
    navn: "Maria Larsen",
    aktørId: "30000000000006",
    alder: 38,
  },
  {
    personIdent: "12345678907",
    navn: "Espen Dahl",
    aktørId: "30000000000007",
    alder: 24,
  },
  {
    personIdent: "12345678908",
    navn: "Hanne Olsen",
    aktørId: "30000000000008",
    alder: 41,
  },
  {
    personIdent: "12345678909",
    navn: "Rune Johansen",
    aktørId: "30000000000009",
    alder: 63,
  },
  {
    personIdent: "12345678910",
    navn: "Camilla Berg",
    aktørId: "30000000000010",
    alder: 36,
  },
  {
    personIdent: "12345678911",
    navn: "Anders Vik",
    aktørId: "30000000000011",
    alder: 45,
  },
  {
    personIdent: "12345678912",
    navn: "Ida Strand",
    aktørId: "30000000000012",
    alder: 31,
  },
  {
    personIdent: "12345678913",
    navn: "Thomas Bakke",
    aktørId: "30000000000013",
    alder: 50,
  },
  {
    personIdent: "12345678914",
    navn: "Kristin Lund",
    aktørId: "30000000000014",
    alder: 42,
  },
  {
    personIdent: "12345678915",
    navn: "Ole Martin Svendsen",
    aktørId: "30000000000015",
    alder: 27,
  },
  {
    personIdent: "12345678916",
    navn: "Nina Pedersen",
    aktørId: "30000000000016",
    alder: 55,
  },
  {
    personIdent: "12345678917",
    navn: "Stian Eriksen",
    aktørId: "30000000000017",
    alder: 22,
  },
  {
    personIdent: "12345678918",
    navn: "Elisabeth Hagen",
    aktørId: "30000000000018",
    alder: 48,
  },
  {
    personIdent: "12345678919",
    navn: "Knut Sandvik",
    aktørId: "30000000000019",
    alder: 39,
  },
  {
    personIdent: "12345678920",
    navn: "Marte Brekke",
    aktørId: "30000000000020",
    alder: 33,
  },
  {
    personIdent: "12345678921",
    navn: "Torbjørn Lie",
    aktørId: "30000000000021",
    alder: 61,
  },
  {
    personIdent: "12345678922",
    navn: "Vibeke Aas",
    aktørId: "30000000000022",
    alder: 44,
  },
  {
    personIdent: "12345678923",
    navn: "Henrik Solheim",
    aktørId: "30000000000023",
    alder: 37,
  },
  {
    personIdent: "12345678924",
    navn: "Tone Nilsen",
    aktørId: "30000000000024",
    alder: 26,
  },
  {
    personIdent: "12345678925",
    navn: "Magnus Iversen",
    aktørId: "30000000000025",
    alder: 49,
  },
  {
    personIdent: "12345678926",
    navn: "Sofie Gulbrandsen",
    aktørId: "30000000000026",
    alder: 35,
  },
  {
    personIdent: "12345678927",
    navn: "Bjørn Engen",
    aktørId: "30000000000027",
    alder: 57,
  },
  {
    personIdent: "12345678928",
    navn: "Line Fossum",
    aktørId: "30000000000028",
    alder: 40,
  },
];

const personerByIdent = new Map(
  opprinneligeMockPersoner.map((person) => [normaliserPersonIdent(person.personIdent), person]),
);

function normaliserPersonIdent(personIdent: string): string {
  return personIdent.replace(/\s/g, "");
}

export function hentMockPerson(personIdent: string): MockPerson | null {
  return personerByIdent.get(normaliserPersonIdent(personIdent)) ?? null;
}

export function hentAlleMockPersoner(): MockPerson[] {
  return [...opprinneligeMockPersoner];
}

export function hentMockPersonNavn(personIdent: string): string | null {
  return hentMockPerson(personIdent)?.navn ?? null;
}

export function formaterMockPersonnummer(personIdent: string): string {
  return formaterFødselsnummer(normaliserPersonIdent(personIdent));
}

export function berikLegacySakMedPerson<T extends { personIdent?: unknown; navn?: unknown }>(
  sak: T,
): T {
  const personIdent = typeof sak.personIdent === "string" ? sak.personIdent : "";
  const person = hentMockPerson(personIdent);

  if (!person) {
    return sak;
  }

  return {
    ...sak,
    navn: person.navn,
    alder: person.alder,
  };
}
