import type { Dokument, DokumentInnhold, DokumentNode } from "~/saker/filer/typer";
import type { MockState } from "./session.server";

function innholdsnøkkel(sakId: string, docId: string): string {
  return `${sakId}:${docId}`;
}

function iDag(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Bygger et enkelt Tiptap-dokument med brødtekst (ufarlig dummytekst). Tittelen
 * rendres separat (inline h1), så vi tar den bevisst ikke med som overskrift her –
 * det ville gitt dobbel tittel og innhold som ikke følger tittelendringer.
 */
function lagDummyInnhold(avsnitt: string[]): DokumentInnhold {
  return {
    type: "doc",
    content: avsnitt.map((tekst) => ({
      type: "paragraph",
      content: [{ type: "text", text: tekst }],
    })),
  };
}

/** Et tomt Tiptap-dokument (ett tomt avsnitt). */
function tomtInnhold(): DokumentInnhold {
  return { type: "doc", content: [{ type: "paragraph" }] };
}

type DokumentSeed = {
  id: string;
  tittel: string;
  endretAv: string;
  endretDato: string;
  avsnitt: string[];
};

const dokumentSeeds: Array<{ mappe?: string; mappeId?: string; barn: DokumentSeed[] }> = [
  {
    mappe: "Dokumentasjon",
    mappeId: "1",
    barn: [
      {
        id: "1-1",
        tittel: "Saksframlegg",
        endretAv: "Ola Nordmann",
        endretDato: "2026-02-15",
        avsnitt: [
          "Dette er et eksempeldokument som beskriver bakgrunnen for kontrollsaken.",
          "Teksten her er kun dummyinnhold for det lokale utviklingsmiljøet.",
        ],
      },
      {
        id: "1-2",
        tittel: "Vedtak",
        endretAv: "Kari Hansen",
        endretDato: "2026-02-20",
        avsnitt: ["Foreløpig vurdering og konklusjon. Eksempeltekst uten reelle opplysninger."],
      },
      {
        id: "1-3",
        tittel: "Notat fra møte",
        endretAv: "Per Olsen",
        endretDato: "2026-03-01",
        avsnitt: ["Oppsummering fra et internt møte. Dette er dummytekst."],
      },
    ],
  },
  {
    mappe: "Bevismateriale",
    mappeId: "2",
    barn: [
      {
        id: "2-1",
        tittel: "Oversikt ytelser",
        endretAv: "Ola Nordmann",
        endretDato: "2026-01-10",
        avsnitt: ["Beskrivelse av relevante ytelser. Eksempeltekst for lokal utvikling."],
      },
    ],
  },
  {
    barn: [
      {
        id: "3",
        tittel: "Presentasjon til ledelsen",
        endretAv: "Per Olsen",
        endretDato: "2026-03-05",
        avsnitt: ["Punkter til en presentasjon. Dette er dummyinnhold."],
      },
      {
        id: "4",
        tittel: "Sammendrag",
        endretAv: "Ola Nordmann",
        endretDato: "2026-03-10",
        avsnitt: ["Kort sammendrag av saken. Eksempeltekst uten personopplysninger."],
      },
    ],
  },
];

/** Bygger demo-dokumenttreet for en sak og fyller innholdslageret. */
function seedDokumenter(state: MockState, sakId: string): DokumentNode[] {
  const noder: DokumentNode[] = [];

  function leggTilDokument(seed: DokumentSeed): DokumentNode {
    state.dokumentInnhold.set(innholdsnøkkel(sakId, seed.id), lagDummyInnhold(seed.avsnitt));
    return {
      id: seed.id,
      type: "dokument",
      tittel: seed.tittel,
      endretAv: seed.endretAv,
      endretDato: seed.endretDato,
    };
  }

  for (const gruppe of dokumentSeeds) {
    if (gruppe.mappe && gruppe.mappeId) {
      noder.push({
        id: gruppe.mappeId,
        type: "mappe",
        navn: gruppe.mappe,
        barn: gruppe.barn.map(leggTilDokument),
      });
    } else {
      for (const seed of gruppe.barn) {
        noder.push(leggTilDokument(seed));
      }
    }
  }

  return noder;
}

/**
 * Henter den lagrede (muterbare) dokumentlisten for en sak, og seeder demo-data
 * første gang dersom saken «har dokumenter» og ikke er registrert som tom.
 */
function hentEllerSeed(state: MockState, sakId: string): DokumentNode[] {
  const eksisterende = state.dokumenter.get(sakId);
  if (eksisterende) {
    return eksisterende;
  }

  let tre: DokumentNode[] = [];
  if (!state.tommeDokumentområder.has(sakId)) {
    const sisteTegn = sakId.at(-1) ?? "0";
    const harDokumenter = Number.parseInt(sisteTegn, 36) % 2 === 0;
    if (harDokumenter) {
      tre = seedDokumenter(state, sakId);
    }
  }

  state.dokumenter.set(sakId, tre);
  return tre;
}

function finnDokumentNode(
  noder: DokumentNode[],
  docId: string,
): Extract<DokumentNode, { type: "dokument" }> | undefined {
  for (const node of noder) {
    if (node.type === "dokument" && node.id === docId) {
      return node;
    }
    if (node.type === "mappe") {
      const funnet = finnDokumentNode(node.barn, docId);
      if (funnet) {
        return funnet;
      }
    }
  }
  return undefined;
}

/** Returnerer dokumenttreet (mapper + dokumenter) for en sak. */
export function hentDokumenttreForSak(state: MockState, sakId: string): DokumentNode[] {
  return hentEllerSeed(state, sakId);
}

/** Henter ett dokument inkludert innhold, eller `undefined` om det ikke finnes. */
export function hentDokument(state: MockState, sakId: string, docId: string): Dokument | undefined {
  const node = finnDokumentNode(hentEllerSeed(state, sakId), docId);
  if (!node) {
    return undefined;
  }

  const innhold = state.dokumentInnhold.get(innholdsnøkkel(sakId, docId)) ?? tomtInnhold();
  return {
    id: node.id,
    tittel: node.tittel,
    innhold,
    endretAv: node.endretAv,
    endretDato: node.endretDato,
  };
}

/** Oppretter et tomt dokument på rot og returnerer id-en. */
export function opprettDokument(
  state: MockState,
  sakId: string,
  opprettetAv: string,
): { id: string } {
  const tre = hentEllerSeed(state, sakId);
  const id = crypto.randomUUID();

  tre.push({
    id,
    type: "dokument",
    tittel: "Uten tittel",
    endretAv: opprettetAv,
    endretDato: iDag(),
  });
  state.dokumentInnhold.set(innholdsnøkkel(sakId, id), tomtInnhold());

  // Saken har nå dokumenter, så den skal ikke lenger regnes som tom.
  state.tommeDokumentområder.delete(sakId);

  return { id };
}

/** Lagrer tittel og innhold for et dokument. Returnerer oppdatert dokument. */
export function lagreDokument(
  state: MockState,
  sakId: string,
  docId: string,
  endringer: { tittel: string; innhold: DokumentInnhold; endretAv: string },
): Dokument | undefined {
  const node = finnDokumentNode(hentEllerSeed(state, sakId), docId);
  if (!node) {
    return undefined;
  }

  node.tittel = endringer.tittel;
  node.endretAv = endringer.endretAv;
  node.endretDato = iDag();
  state.dokumentInnhold.set(innholdsnøkkel(sakId, docId), endringer.innhold);

  return {
    id: node.id,
    tittel: node.tittel,
    innhold: endringer.innhold,
    endretAv: node.endretAv,
    endretDato: node.endretDato,
  };
}

/** Markerer at en sak (typisk nyopprettet) starter uten dokumenter. */
export function registrerTomtDokumentområdeForSak(state: MockState, sakId: string) {
  state.tommeDokumentområder.add(sakId);
  state.dokumenter.set(sakId, []);
}

/** Fjerner en dokumentnode (rekursivt) fra en nodeliste. Returnerer true om den ble funnet. */
function fjernDokumentNode(noder: DokumentNode[], docId: string): boolean {
  const indeks = noder.findIndex((node) => node.type === "dokument" && node.id === docId);
  if (indeks !== -1) {
    noder.splice(indeks, 1);
    return true;
  }
  for (const node of noder) {
    if (node.type === "mappe" && fjernDokumentNode(node.barn, docId)) {
      return true;
    }
  }
  return false;
}

/** Sletter et dokument og dets innhold. Returnerer true om dokumentet fantes. */
export function slettDokument(state: MockState, sakId: string, docId: string): boolean {
  const tre = hentEllerSeed(state, sakId);
  const fjernet = fjernDokumentNode(tre, docId);
  if (fjernet) {
    state.dokumentInnhold.delete(innholdsnøkkel(sakId, docId));
  }
  return fjernet;
}
