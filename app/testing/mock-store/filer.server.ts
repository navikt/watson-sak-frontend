import type { FilResponse } from "~/saker/filer/typer";
import type { MockState } from "./session.server";

const filSeeds: { sakId: string; filer: FilResponse[] }[] = [
  {
    sakId: "1",
    filer: [
      {
        id: "fil-1-1",
        filnavn: "anmeldelse.pdf",
        storrelse: 204800,
        contentType: "application/pdf",
        opprettetAv: "Ola Nordmann",
        opprettet: "2026-02-15T10:30:00Z",
        bruktIDokumenter: [],
      },
      {
        id: "fil-1-2",
        filnavn: "screenshot-nettbank.png",
        storrelse: 512000,
        contentType: "image/png",
        opprettetAv: "Kari Hansen",
        opprettet: "2026-03-01T14:15:00Z",
        bruktIDokumenter: [],
      },
    ],
  },
];

function initialiserFilerForSak(state: MockState, sakId: string): FilResponse[] {
  if (!state.filer.has(sakId)) {
    const seed = filSeeds.find((s) => s.sakId === sakId);
    state.filer.set(sakId, seed ? [...seed.filer] : []);
  }
  return state.filer.get(sakId) ?? [];
}

export function hentFilerForSak(state: MockState, sakId: string): FilResponse[] {
  return initialiserFilerForSak(state, sakId);
}

export function leggTilFil(
  state: MockState,
  sakId: string,
  fil: File,
  opprettetAv: string,
): FilResponse {
  const liste = initialiserFilerForSak(state, sakId);
  const nyFil: FilResponse = {
    id: crypto.randomUUID(),
    filnavn: fil.name,
    storrelse: fil.size,
    contentType: fil.type || "application/octet-stream",
    opprettetAv,
    opprettet: new Date().toISOString(),
    bruktIDokumenter: [],
  };
  liste.unshift(nyFil);
  return nyFil;
}

/**
 * Markerer en opplastet fil som arkivert i en journalpost. Speiler backend, der filen flagges
 * som arkivert etter at journalposten er opprettet — den forsvinner da fra «Opplastede filer»
 * og vises i «Arkivert» i stedet.
 *
 * Returnerer `null` hvis filen ikke finnes eller allerede er arkivert (backend svarer 409).
 */
export function arkiverFil(
  state: MockState,
  sakId: string,
  filId: string,
  arkivertAv: string,
  journalpostId: string,
): FilResponse | null {
  const liste = initialiserFilerForSak(state, sakId);
  const fil = liste.find((f) => f.id === filId);
  if (!fil || fil.arkivert) return null;

  fil.arkivert = new Date().toISOString();
  fil.arkivertAv = arkivertAv;
  fil.arkivertJournalpostId = journalpostId;
  return fil;
}

/**
 * Speiler backend sin konvertering av et Watson Sak-dokument til en arkivert PDF-fil.
 * Backend laster den genererte PDF-en opp som en egen fil med `arkivertFraDokumentId` satt,
 * slik at det arkiverte dokumentet vises som en nedlastbar fil i «Arkivert»-seksjonen.
 */
export function opprettArkivertFilFraDokument(
  state: MockState,
  sakId: string,
  dokument: { id: string; tittel: string },
  arkivertAv: string,
  journalpostId: string,
): FilResponse {
  const liste = initialiserFilerForSak(state, sakId);
  const nå = new Date().toISOString();
  const nyFil: FilResponse = {
    id: crypto.randomUUID(),
    filnavn: `${dokument.tittel || "Uten tittel"}.pdf`,
    storrelse: 48000,
    contentType: "application/pdf",
    opprettetAv: arkivertAv,
    opprettet: nå,
    bruktIDokumenter: [],
    arkivert: nå,
    arkivertAv,
    arkivertJournalpostId: journalpostId,
    arkivertFraDokumentId: dokument.id,
  };
  liste.unshift(nyFil);
  return nyFil;
}

export function hentFilInnhold(state: MockState, sakId: string, filId: string): Response {
  const liste = initialiserFilerForSak(state, sakId);
  const fil = liste.find((f) => f.id === filId);
  const filnavn = sanitiserFilnavn(fil?.filnavn ?? `fil-${filId}`);
  const contentType = fil?.contentType ?? "application/octet-stream";
  return new Response(new Uint8Array([37, 80, 68, 70]), {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `inline; filename="${filnavn}"`,
    },
  });
}

function sanitiserFilnavn(filnavn: string): string {
  return filnavn.replace(/["\\]/g, "_").replace(/[\r\n]/g, "");
}

export function slettFil(state: MockState, sakId: string, filId: string): FilResponse | null {
  const liste = initialiserFilerForSak(state, sakId);
  const indeks = liste.findIndex((f) => f.id === filId);
  if (indeks === -1) return null;
  const [slettetFil] = liste.splice(indeks, 1);
  return slettetFil;
}
