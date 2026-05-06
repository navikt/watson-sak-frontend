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
