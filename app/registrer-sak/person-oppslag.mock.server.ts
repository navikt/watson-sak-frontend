export type PersonOppslagResultat = {
  person: Person;
  eksisterendeSaker: EksisterendeSak[];
};

export type Person = {
  navn: string;
  personnummer: string;
  aktørId: string;
  alder: number;
};

export type EksisterendeSak = {
  sakId: string;
  opprettetDato: string;
  personNavn: string;
  saksbehandler: string;
  enhet: string;
  status: string;
};

const mockPersoner: Record<string, PersonOppslagResultat> = {
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
};

export function slaOppPerson(fnr: string): PersonOppslagResultat | null {
  return mockPersoner[fnr] ?? null;
}

let nesteMockSakId = 200;

export function leggTilMockSak(
  personIdent: string,
  saksbehandler: string,
  enhet: string,
): void {
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
