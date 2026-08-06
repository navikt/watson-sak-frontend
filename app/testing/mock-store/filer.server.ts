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
      },
      {
        id: "fil-1-2",
        filnavn: "screenshot-nettbank.png",
        storrelse: 512000,
        contentType: "image/png",
        opprettetAv: "Kari Hansen",
        opprettet: "2026-03-01T14:15:00Z",
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
  };
  liste.unshift(nyFil);
  return nyFil;
}

export function hentFilInnhold(state: MockState, sakId: string, filId: string): Response {
  const liste = initialiserFilerForSak(state, sakId);
  const fil = liste.find((f) => f.id === filId);
  const filnavn = fil?.filnavn ?? `fil-${filId}`;
  const contentType = fil?.contentType ?? "application/octet-stream";
  return new Response(new Uint8Array([37, 80, 68, 70]), {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filnavn}"`,
    },
  });
}

export function slettFil(state: MockState, sakId: string, filId: string): boolean {
  const liste = initialiserFilerForSak(state, sakId);
  const indeks = liste.findIndex((f) => f.id === filId);
  if (indeks === -1) return false;
  liste.splice(indeks, 1);
  return true;
}
