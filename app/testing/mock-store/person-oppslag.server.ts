import { getSaksreferanse } from "~/saker/id";
import { getSaksenhet } from "~/saker/selectors";
import type { KontrollsakResponse } from "~/saker/types.backend";
import { getStatus } from "~/saker/visning";
import { hentAlleSaker } from "./alle-saker.server";
import { hentMockState } from "./session.server";
import {
  formaterMockPersonnummer,
  hentMockPerson,
  løsOppGjeldendeIdent,
  type MockPerson,
} from "./personer.server";

export type PersonOppslagResultat = {
  person: Person;
  eksisterendeSaker: EksisterendeSak[];
  /** true dersom det ble søkt med en historisk ident som ble løst opp til personens gjeldende ident. */
  søktMedHistoriskIdent: boolean;
};

type Person = {
  navn: string;
  personnummer: string;
  aktørId: string;
  alder: number;
  adresseskjermet: boolean;
  kanOppretteSak: boolean;
};

type EksisterendeSak = {
  sakId?: string;
  opprettetDato: string;
  personNavn: string;
  saksbehandler: string;
  enhet: string;
  status: string;
};

const manuelleEksisterendeSaker: Record<string, EksisterendeSak[]> = {
  "03117845975": [
    {
      opprettetDato: "2025-10-12",
      personNavn: "Birger Egil Lorumipsum-Olsen",
      saksbehandler: "Lise Raus",
      enhet: "ky153k",
      status: "Til utredning",
    },
  ],
};

function normaliserPersonIdent(fnr: string): string {
  return fnr.replace(/\s/g, "");
}

function mapPerson(person: MockPerson): Person {
  const adresseskjermet = person.skjermet ?? false;
  return {
    navn: person.navn,
    personnummer: formaterMockPersonnummer(person.personIdent),
    aktørId: person.aktørId,
    alder: person.alder,
    adresseskjermet,
    // Mockdata skiller ikke mellom Basic/Utvidet tilgang — en skjermet mock-person
    // representerer derfor alltid scenariet der saksbehandler mangler tilgang til å
    // opprette sak (kanOppretteSak=false), se RAILS-9.
    kanOppretteSak: !adresseskjermet,
  };
}

function mapEksisterendeSak(sak: KontrollsakResponse): EksisterendeSak {
  return {
    sakId: getSaksreferanse(sak.id),
    opprettetDato: sak.opprettet.slice(0, 10),
    personNavn: sak.personNavn ?? "Ukjent navn",
    saksbehandler: sak.saksbehandlere.eier?.navn ?? sak.saksbehandlere.opprettetAv.navn,
    enhet: getSaksenhet(sak) || "Ukjent",
    status: getStatus(sak),
  };
}

function hentEksisterendeSaker(request: Request, personIdent: string): EksisterendeSak[] {
  const normalisertIdent = normaliserPersonIdent(personIdent);
  const sakerFraMockStore = hentAlleSaker(hentMockState(request))
    .filter((sak) => sak.personIdent === normalisertIdent)
    .map(mapEksisterendeSak);
  const manuelleSaker = manuelleEksisterendeSaker[normalisertIdent] ?? [];

  return [...sakerFraMockStore, ...manuelleSaker].sort((a, b) =>
    b.opprettetDato.localeCompare(a.opprettetDato),
  );
}

export function slaOppPerson(request: Request, fnr: string): PersonOppslagResultat | null {
  const søktIdent = normaliserPersonIdent(fnr);
  const gjeldendeIdent = løsOppGjeldendeIdent(søktIdent);
  const person = hentMockPerson(gjeldendeIdent);

  if (!person) {
    return null;
  }

  return {
    person: mapPerson(person),
    eksisterendeSaker: hentEksisterendeSaker(request, gjeldendeIdent),
    søktMedHistoriskIdent: gjeldendeIdent !== søktIdent,
  };
}
