import type { Dokument, DokumentInnhold, DokumentNode } from "~/saker/filer/typer";
import type { MockState } from "./session.server";

function innholdsnøkkel(sakId: string, docId: string): string {
  return `${sakId}:${docId}`;
}

function iDag(): string {
  return new Date().toISOString().slice(0, 10);
}

function lagDummyInnhold(avsnitt: string[]): DokumentInnhold {
  return {
    type: "doc",
    content: avsnitt.map((tekst) => ({
      type: "paragraph",
      content: [{ type: "text", text: tekst }],
    })),
  };
}

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

const dokumentSeeds: DokumentSeed[] = [
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
  {
    id: "2-1",
    tittel: "Oversikt ytelser",
    endretAv: "Ola Nordmann",
    endretDato: "2026-01-10",
    avsnitt: ["Beskrivelse av relevante ytelser. Eksempeltekst for lokal utvikling."],
  },
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
];

function seedDokumenter(state: MockState, sakId: string): DokumentNode[] {
  const noder = dokumentSeeds.map((seed) => {
    state.dokumentInnhold.set(innholdsnøkkel(sakId, seed.id), lagDummyInnhold(seed.avsnitt));
    return {
      id: seed.id,
      tittel: seed.tittel,
      endretAv: seed.endretAv,
      endretDato: seed.endretDato,
      låsAv: null,
    };
  });
  return noder;
}

function hentEllerSeed(state: MockState, sakId: string): DokumentNode[] {
  const eksisterende = state.dokumenter.get(sakId);
  if (eksisterende) {
    return eksisterende;
  }

  let dokumenter: DokumentNode[] = [];
  if (!state.tommeDokumentområder.has(sakId)) {
    const sisteTegn = sakId.at(-1) ?? "0";
    const harDokumenter = Number.parseInt(sisteTegn, 36) % 2 === 0;
    if (harDokumenter) {
      dokumenter = seedDokumenter(state, sakId);
    }
  }

  state.dokumenter.set(sakId, dokumenter);
  return dokumenter;
}

function finnDokument(dokumenter: DokumentNode[], docId: string): DokumentNode | undefined {
  return dokumenter.find((dokument) => dokument.id === docId);
}

export function hentDokumenttreForSak(state: MockState, sakId: string): DokumentNode[] {
  return hentEllerSeed(state, sakId);
}

export function hentDokument(state: MockState, sakId: string, docId: string): Dokument | undefined {
  const node = finnDokument(hentEllerSeed(state, sakId), docId);
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
    låsAv: node.låsAv,
  };
}

export function opprettDokument(
  state: MockState,
  sakId: string,
  opprettetAv: string,
): { id: string } {
  const dokumenter = hentEllerSeed(state, sakId);
  const id = crypto.randomUUID();

  dokumenter.push({
    id,
    tittel: "Uten tittel",
    endretAv: opprettetAv,
    endretDato: iDag(),
    låsAv: null,
  });
  state.dokumentInnhold.set(innholdsnøkkel(sakId, id), tomtInnhold());
  state.tommeDokumentområder.delete(sakId);

  return { id };
}

export function lagreDokument(
  state: MockState,
  sakId: string,
  docId: string,
  endringer: { tittel: string; innhold: DokumentInnhold; endretAv: string },
): Dokument | undefined {
  const node = finnDokument(hentEllerSeed(state, sakId), docId);
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
    låsAv: node.låsAv,
  };
}

export function registrerTomtDokumentområdeForSak(state: MockState, sakId: string) {
  state.tommeDokumentområder.add(sakId);
  state.dokumenter.set(sakId, []);
}

export function slettDokument(state: MockState, sakId: string, docId: string): boolean {
  const dokumenter = hentEllerSeed(state, sakId);
  const indeks = dokumenter.findIndex((dokument) => dokument.id === docId);
  if (indeks === -1) {
    return false;
  }

  dokumenter.splice(indeks, 1);
  state.dokumentInnhold.delete(innholdsnøkkel(sakId, docId));
  return true;
}
