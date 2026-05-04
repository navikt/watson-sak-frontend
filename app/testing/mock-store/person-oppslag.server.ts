export type PersonOppslagResultat = {
  person: Person;
  eksisterendeSaker: EksisterendeSak[];
};

type Person = {
  navn: string;
  personnummer: string;
  aktørId: string;
  alder: number;
};

type EksisterendeSak = {
  sakId: string;
  opprettetDato: string;
  personNavn: string;
  saksbehandler: string;
  enhet: string;
  status: string;
};

const opprinneligeMockPersoner: Record<string, PersonOppslagResultat> = {
  "03117845975": {
    person: {
      navn: "Birger Egil Lorumipsum-Olsen",
      personnummer: "031178 45975",
      aktørId: "12345678910113",
      alder: 43,
    },
    eksisterendeSaker: [
      {
        sakId: "103",
        opprettetDato: "2025-10-12",
        personNavn: "Birger Egil Lorumipsum-Olsen",
        saksbehandler: "Lise Raus",
        enhet: "Øst",
        status: "Til utredning",
      },
    ],
  },
  "12345678901": {
    person: {
      navn: "Ola Testesen",
      personnummer: "123456 78901",
      aktørId: "98765432100001",
      alder: 30,
    },
    eksisterendeSaker: [],
  },
  "23456789012": {
    person: {
      navn: "Kari Nordmann",
      personnummer: "234567 89012",
      aktørId: "11223344556677",
      alder: 55,
    },
    eksisterendeSaker: [],
  },
  "34567890123": {
    person: {
      navn: "Ingrid Testdatter",
      personnummer: "345678 90123",
      aktørId: "22334455667788",
      alder: 28,
    },
    eksisterendeSaker: [],
  },
  "45678901234": {
    person: {
      navn: "Per Mockesen",
      personnummer: "456789 01234",
      aktørId: "33445566778899",
      alder: 39,
    },
    eksisterendeSaker: [],
  },
  "56789012345": {
    person: {
      navn: "Anne Eksempel",
      personnummer: "567890 12345",
      aktørId: "44556677889900",
      alder: 46,
    },
    eksisterendeSaker: [],
  },
  "67890123456": {
    person: {
      navn: "Morten Demo",
      personnummer: "678901 23456",
      aktørId: "55667788990011",
      alder: 33,
    },
    eksisterendeSaker: [],
  },
  "78901234567": {
    person: {
      navn: "Lena Prøvesen",
      personnummer: "789012 34567",
      aktørId: "66778899001122",
      alder: 41,
    },
    eksisterendeSaker: [],
  },
  "89012345678": {
    person: {
      navn: "Thomas Fiktiv",
      personnummer: "890123 45678",
      aktørId: "77889900112233",
      alder: 52,
    },
    eksisterendeSaker: [],
  },
  "90123456789": {
    person: {
      navn: "Heidi Illustrasjon",
      personnummer: "901234 56789",
      aktørId: "88990011223344",
      alder: 36,
    },
    eksisterendeSaker: [],
  },
  "01234567890": {
    person: {
      navn: "Jonas Scenario",
      personnummer: "012345 67890",
      aktørId: "99001122334455",
      alder: 24,
    },
    eksisterendeSaker: [],
  },
  "11223344556": {
    person: {
      navn: "Silje Variasjon",
      personnummer: "112233 44556",
      aktørId: "10112233445566",
      alder: 31,
    },
    eksisterendeSaker: [],
  },
  "22334455667": {
    person: {
      navn: "Eirik Søkbar",
      personnummer: "223344 55667",
      aktørId: "12131415161718",
      alder: 48,
    },
    eksisterendeSaker: [],
  },
};

let mockPersoner: Record<string, PersonOppslagResultat> = lagKopiAvMockPersoner();
let nesteMockSakId = 200;

function lagKopiAvMockPersoner(): Record<string, PersonOppslagResultat> {
  return Object.fromEntries(
    Object.entries(opprinneligeMockPersoner).map(([fnr, data]) => [
      fnr,
      { ...data, eksisterendeSaker: [...data.eksisterendeSaker] },
    ]),
  );
}

export function resetMockPersonOppslag(): void {
  mockPersoner = lagKopiAvMockPersoner();
  nesteMockSakId = 200;
}

export function slaOppPerson(fnr: string): PersonOppslagResultat | null {
  return mockPersoner[fnr] ?? null;
}

export function leggTilMockSak(personIdent: string, saksbehandler: string, enhet: string): void {
  const eksisterende = mockPersoner[personIdent];
  if (!eksisterende) return;

  const sakId = String(nesteMockSakId++);
  eksisterende.eksisterendeSaker.push({
    sakId,
    opprettetDato: new Date().toISOString().split("T")[0],
    personNavn: eksisterende.person.navn,
    saksbehandler,
    enhet,
    status: "Til utredning",
  });
}
