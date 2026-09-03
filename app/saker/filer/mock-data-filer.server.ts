import type { FilResponse } from "~/saker/filer/typer";
import { hentMockState } from "~/testing/mock-store/session.server";
import {
  hentFilerForSak as _hentFilerForSak,
  hentFilInnhold as _hentFilInnhold,
  leggTilFil as _leggTilFil,
  slettFil as _slettFil,
} from "~/testing/mock-store/filer.server";

export function hentFilerForSak(request: Request, sakId: string): FilResponse[] {
  return _hentFilerForSak(hentMockState(request), sakId);
}

export function hentFilInnhold(request: Request, sakId: string, filId: string): Response {
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
