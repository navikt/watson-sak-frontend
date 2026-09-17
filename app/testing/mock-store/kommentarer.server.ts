import type {
  Anker,
  Ankertype,
  Kommentar,
  Kommentarliste,
  Kommentartraad,
} from "~/saker/filer/dokument/kommentarer/typer";
import { ANKER_VERSJON } from "~/saker/filer/dokument/kommentarer/typer";
import type { MockState } from "./session.server";

/**
 * Muterbar mocktilstand for dokumentkommentarer (local-mock og demo).
 *
 * Datamodellen speiler `DokumentKommentarService` i watson-admin-api:
 * - kommentarer har `tekst`, `erRot`, `endret` og egen `versjon`,
 * - tråder har `resolved` (tidspunkt eller null) og avledet `synlig`,
 * - sletting er **soft delete**: kommentaren skjules, tråden beholdes med
 *   `synlig: false` og filtreres bort fra GET-lista,
 * - versjonskonflikt og arkivert dokument gir 409, ikke 403.
 */

/** Lagret form: som API-responsen, men uten det brukeravhengige `erEgen`. */
type LagretKommentar = Omit<Kommentar, "erEgen"> & { slettet: boolean };

type LagretTraad = Omit<Kommentartraad, "kommentarer" | "adressert" | "synlig"> & {
  kommentarer: LagretKommentar[];
};

export type KommentarResultat =
  | { status: "ok"; traad: Kommentartraad }
  | { status: "ikke_funnet" }
  | { status: "konflikt"; melding: string };

function nøkkel(sakId: string, docId: string): string {
  return `${sakId}:${docId}`;
}

function mockIdentFraNavn(navn: string): string {
  return `mock-${navn.toLowerCase().replaceAll(" ", "-")}`;
}

/** Bygger API-formen for en tråd, med `erEgen` og `synlig` sett for denne brukeren. */
function tilRespons(traad: LagretTraad, innloggetIdent: string): Kommentartraad {
  const synlige = traad.kommentarer.filter((kommentar) => !kommentar.slettet);
  return {
    ...traad,
    adressert: traad.resolved !== null,
    synlig: synlige.length > 0,
    kommentarer: synlige.map(({ slettet: _slettet, ...kommentar }) => ({
      ...kommentar,
      erEgen: kommentar.forfatterIdent === innloggetIdent,
    })),
  };
}

function seedKommentarer(sakId: string, docId: string): LagretTraad[] {
  // Bare det første seedede dokumentet får eksempelkommentarer, slik at vi har
  // både en forankret, en generell og en adressert tråd å utvikle mot.
  if (docId !== "1-1") return [];

  const opprettet = "2026-02-16T09:15:00.000Z";
  const suffiks = sakId.padStart(12, "0");
  const traadIdText = `00000000-0000-4000-9000-${suffiks}`;
  const traadIdDoc = `00000000-0000-4000-9002-${suffiks}`;
  const traadIdElement = `00000000-0000-4000-9004-${suffiks}`;

  const tekstAnker: Anker = {
    type: "TEXT",
    path: [0],
    startOffset: 11,
    sluttOffset: 27,
    exact: "eksempeldokument",
    prefix: "Dette er et ",
    suffix: " som beskriver",
  };
  const elementAnker: Anker = {
    type: "ELEMENT",
    path: [1],
    elementtype: "p",
    fingerprint: "Teksten her er kun dummyinnhold for det lokale utviklingsmiljøet.",
  };

  return [
    {
      id: traadIdText,
      dokumentId: docId,
      ankertype: "TEXT",
      anker: tekstAnker,
      ankerVersjon: ANKER_VERSJON,
      opprinneligSitat: "eksempeldokument",
      opprettetAvIdent: mockIdentFraNavn("Kari Hansen"),
      opprettetAvNavn: "Kari Hansen",
      opprettet,
      resolved: null,
      resolvedAvIdent: null,
      resolvedAvNavn: null,
      versjon: 1,
      kommentarer: [
        {
          id: `00000000-0000-4000-9001-${suffiks}`,
          traadId: traadIdText,
          erRot: true,
          tekst: "Bør vi presisere hva slags dokument dette er?",
          forfatterIdent: mockIdentFraNavn("Kari Hansen"),
          forfatterNavn: "Kari Hansen",
          opprettet,
          endret: opprettet,
          versjon: 1,
          slettet: false,
        },
      ],
    },
    {
      id: traadIdDoc,
      dokumentId: docId,
      ankertype: "DOCUMENT",
      anker: { type: "DOCUMENT" },
      ankerVersjon: ANKER_VERSJON,
      opprinneligSitat: null,
      opprettetAvIdent: mockIdentFraNavn("Per Olsen"),
      opprettetAvNavn: "Per Olsen",
      opprettet: "2026-02-17T11:00:00.000Z",
      resolved: null,
      resolvedAvIdent: null,
      resolvedAvNavn: null,
      versjon: 1,
      kommentarer: [
        {
          id: `00000000-0000-4000-9003-${suffiks}`,
          traadId: traadIdDoc,
          erRot: true,
          tekst: "Husk å gå gjennom hele dokumentet før journalføring.",
          forfatterIdent: mockIdentFraNavn("Per Olsen"),
          forfatterNavn: "Per Olsen",
          opprettet: "2026-02-17T11:00:00.000Z",
          endret: "2026-02-17T11:00:00.000Z",
          versjon: 1,
          slettet: false,
        },
      ],
    },
    {
      id: traadIdElement,
      dokumentId: docId,
      ankertype: "ELEMENT",
      anker: elementAnker,
      ankerVersjon: ANKER_VERSJON,
      opprinneligSitat: "Teksten her er kun dummyinnhold for det lokale utviklingsmiljøet.",
      opprettetAvIdent: mockIdentFraNavn("Ola Nordmann"),
      opprettetAvNavn: "Ola Nordmann",
      opprettet: "2026-02-18T08:30:00.000Z",
      resolved: "2026-02-19T08:30:00.000Z",
      resolvedAvIdent: mockIdentFraNavn("Ola Nordmann"),
      resolvedAvNavn: "Ola Nordmann",
      versjon: 2,
      kommentarer: [
        {
          id: `00000000-0000-4000-9005-${suffiks}`,
          traadId: traadIdElement,
          erRot: true,
          tekst: "Dette avsnittet kan fjernes før vi sender rapporten.",
          forfatterIdent: mockIdentFraNavn("Ola Nordmann"),
          forfatterNavn: "Ola Nordmann",
          opprettet: "2026-02-18T08:30:00.000Z",
          endret: "2026-02-18T08:30:00.000Z",
          versjon: 1,
          slettet: false,
        },
      ],
    },
  ];
}

function hentEllerSeed(state: MockState, sakId: string, docId: string): LagretTraad[] {
  const key = nøkkel(sakId, docId);
  const eksisterende = state.dokumentKommentarer.get(key);
  if (eksisterende) return eksisterende as LagretTraad[];

  const seeded = seedKommentarer(sakId, docId);
  state.dokumentKommentarer.set(key, seeded);
  return seeded;
}

/** GET-wrapperen: samme form som `KommentarTraadListeResponse`. */
export function hentKommentarliste(
  state: MockState,
  sakId: string,
  docId: string,
  opts: { innloggetIdent: string; arkivert: string | null },
): Kommentarliste {
  const traader = hentEllerSeed(state, sakId, docId)
    .map((traad) => tilRespons(traad, opts.innloggetIdent))
    // Tråder uten synlige kommentarer utelates, akkurat som i backend.
    .filter((traad) => traad.synlig);

  return {
    dokumentId: docId,
    arkivert: opts.arkivert,
    kanKommentere: opts.arkivert === null,
    traader,
  };
}

export function opprettKommentartraad(
  state: MockState,
  sakId: string,
  docId: string,
  data: {
    traadId: string;
    kommentarId: string;
    ankertype: Ankertype;
    anker: Anker;
    opprinneligSitat: string | null;
    tekst: string;
    forfatterIdent: string;
    forfatterNavn: string;
  },
): KommentarResultat {
  const traader = hentEllerSeed(state, sakId, docId);
  const eksisterende = traader.find((traad) => traad.id === data.traadId);
  if (eksisterende) {
    // Idempotent retry: samme innhold gir samme tråd, ulikt innhold gir 409.
    const rot = eksisterende.kommentarer.find((kommentar) => kommentar.erRot);
    if (rot?.tekst !== data.tekst) {
      return { status: "konflikt", melding: "Ressursen finnes allerede med et annet innhold." };
    }
    return { status: "ok", traad: tilRespons(eksisterende, data.forfatterIdent) };
  }

  const nå = new Date().toISOString();
  const traad: LagretTraad = {
    id: data.traadId,
    dokumentId: docId,
    ankertype: data.ankertype,
    anker: data.anker,
    ankerVersjon: ANKER_VERSJON,
    opprinneligSitat: data.opprinneligSitat,
    opprettetAvIdent: data.forfatterIdent,
    opprettetAvNavn: data.forfatterNavn,
    opprettet: nå,
    resolved: null,
    resolvedAvIdent: null,
    resolvedAvNavn: null,
    versjon: 1,
    kommentarer: [
      {
        id: data.kommentarId,
        traadId: data.traadId,
        erRot: true,
        tekst: data.tekst,
        forfatterIdent: data.forfatterIdent,
        forfatterNavn: data.forfatterNavn,
        opprettet: nå,
        endret: nå,
        versjon: 1,
        slettet: false,
      },
    ],
  };
  traader.push(traad);
  state.dokumentKommentarer.set(nøkkel(sakId, docId), traader);
  return { status: "ok", traad: tilRespons(traad, data.forfatterIdent) };
}

export function opprettKommentar(
  state: MockState,
  sakId: string,
  docId: string,
  traadId: string,
  data: {
    kommentarId: string;
    tekst: string;
    traadVersjon: number;
    forfatterIdent: string;
    forfatterNavn: string;
  },
): KommentarResultat {
  const traad = hentEllerSeed(state, sakId, docId).find((kandidat) => kandidat.id === traadId);
  if (!traad) return { status: "ikke_funnet" };
  if (traad.resolved !== null) {
    return {
      status: "konflikt",
      melding: "Tråden er adressert. Gjenåpne den for å endre kommentarer.",
    };
  }
  if (traad.kommentarer.some((kommentar) => kommentar.id === data.kommentarId)) {
    return { status: "ok", traad: tilRespons(traad, data.forfatterIdent) };
  }
  if (traad.versjon !== data.traadVersjon) {
    return { status: "konflikt", melding: UTDATERT_VERSJON };
  }

  const nå = new Date().toISOString();
  traad.kommentarer.push({
    id: data.kommentarId,
    traadId,
    erRot: false,
    tekst: data.tekst,
    forfatterIdent: data.forfatterIdent,
    forfatterNavn: data.forfatterNavn,
    opprettet: nå,
    endret: nå,
    versjon: 1,
    slettet: false,
  });
  traad.versjon += 1;
  return { status: "ok", traad: tilRespons(traad, data.forfatterIdent) };
}

const UTDATERT_VERSJON = "Ressursen er endret av en annen bruker. Last inn på nytt og prøv igjen.";

function finnKommentar(
  traader: LagretTraad[],
  kommentarId: string,
): { traad: LagretTraad; kommentar: LagretKommentar } | undefined {
  for (const traad of traader) {
    const kommentar = traad.kommentarer.find(
      (kandidat) => kandidat.id === kommentarId && !kandidat.slettet,
    );
    if (kommentar) return { traad, kommentar };
  }
  return undefined;
}

export function redigerKommentar(
  state: MockState,
  sakId: string,
  docId: string,
  kommentarId: string,
  data: { tekst: string; versjon: number; innloggetIdent: string },
): KommentarResultat | { status: "ikke_forfatter" } {
  const treff = finnKommentar(hentEllerSeed(state, sakId, docId), kommentarId);
  if (!treff) return { status: "ikke_funnet" };
  if (treff.kommentar.forfatterIdent !== data.innloggetIdent) return { status: "ikke_forfatter" };
  if (treff.traad.resolved !== null) {
    return {
      status: "konflikt",
      melding: "Tråden er adressert. Gjenåpne den for å endre kommentarer.",
    };
  }
  if (treff.kommentar.versjon !== data.versjon) {
    return { status: "konflikt", melding: UTDATERT_VERSJON };
  }

  treff.kommentar.tekst = data.tekst;
  treff.kommentar.endret = new Date().toISOString();
  treff.kommentar.versjon += 1;
  treff.traad.versjon += 1;
  return { status: "ok", traad: tilRespons(treff.traad, data.innloggetIdent) };
}

export function slettKommentar(
  state: MockState,
  sakId: string,
  docId: string,
  kommentarId: string,
  data: { versjon: number; innloggetIdent: string },
): KommentarResultat | { status: "ikke_forfatter" } {
  const treff = finnKommentar(hentEllerSeed(state, sakId, docId), kommentarId);
  if (!treff) return { status: "ikke_funnet" };
  if (treff.kommentar.forfatterIdent !== data.innloggetIdent) return { status: "ikke_forfatter" };
  if (treff.traad.resolved !== null) {
    return {
      status: "konflikt",
      melding: "Tråden er adressert. Gjenåpne den for å endre kommentarer.",
    };
  }
  if (treff.kommentar.versjon !== data.versjon) {
    return { status: "konflikt", melding: UTDATERT_VERSJON };
  }

  // Soft delete – kommentaren beholdes i «revisjonsloggen», men skjules.
  treff.kommentar.slettet = true;
  treff.kommentar.versjon += 1;
  treff.traad.versjon += 1;
  return { status: "ok", traad: tilRespons(treff.traad, data.innloggetIdent) };
}

export function settAdressering(
  state: MockState,
  sakId: string,
  docId: string,
  traadId: string,
  data: { adressert: boolean; versjon: number; innloggetIdent: string; navn: string },
): KommentarResultat {
  const traad = hentEllerSeed(state, sakId, docId).find((kandidat) => kandidat.id === traadId);
  if (!traad) return { status: "ikke_funnet" };
  if (traad.versjon !== data.versjon) {
    return { status: "konflikt", melding: UTDATERT_VERSJON };
  }

  traad.resolved = data.adressert ? new Date().toISOString() : null;
  traad.resolvedAvIdent = data.adressert ? data.innloggetIdent : null;
  traad.resolvedAvNavn = data.adressert ? data.navn : null;
  traad.versjon += 1;
  return { status: "ok", traad: tilRespons(traad, data.innloggetIdent) };
}

/**
 * Kalles når et dokument slettes. Vi setter en tom liste i stedet for å fjerne
 * nøkkelen, slik at seed-dataene ikke dukker opp igjen ved neste oppslag.
 */
export function slettKommentarerForDokument(state: MockState, sakId: string, docId: string) {
  state.dokumentKommentarer.set(nøkkel(sakId, docId), []);
}
