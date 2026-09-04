import type { FilResponse } from "~/saker/filer/typer";
import { hentMockState } from "~/testing/mock-store/session.server";
import {
  arkiverFil as _arkiverFil,
  hentFilerForSak as _hentFilerForSak,
  hentFilInnhold as _hentFilInnhold,
  leggTilFil as _leggTilFil,
  opprettArkivertFilFraDokument as _opprettArkivertFilFraDokument,
  slettFil as _slettFil,
} from "~/testing/mock-store/filer.server";

export function hentFilerForSak(request: Request, sakId: string): FilResponse[] {
  return _hentFilerForSak(hentMockState(request), sakId);
}

export function hentFilInnhold(request: Request, sakId: string, filId: string): Promise<Response> {
  return _hentFilInnhold(hentMockState(request), sakId, filId);
}

export function leggTilFil(
  request: Request,
  sakId: string,
  fil: File,
  opprettetAv: string,
): FilResponse {
  return _leggTilFil(hentMockState(request), sakId, fil, opprettetAv);
}

export function slettFil(request: Request, sakId: string, filId: string): FilResponse | null {
  return _slettFil(hentMockState(request), sakId, filId);
}

export function arkiverFil(
  request: Request,
  sakId: string,
  filId: string,
  arkivertAv: string,
  journalpostId: string,
): FilResponse | null {
  return _arkiverFil(hentMockState(request), sakId, filId, arkivertAv, journalpostId);
}

export function opprettArkivertFilFraDokument(
  request: Request,
  sakId: string,
  dokument: { id: string; tittel: string },
  arkivertAv: string,
  journalpostId: string,
): FilResponse {
  return _opprettArkivertFilFraDokument(
    hentMockState(request),
    sakId,
    dokument,
    arkivertAv,
    journalpostId,
  );
}
