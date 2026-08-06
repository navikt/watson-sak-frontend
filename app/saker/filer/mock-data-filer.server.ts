import type { FilResponse } from "~/saker/filer/typer";
import { hentMockState } from "~/testing/mock-store/session.server";
import {
  hentFilerForSak as _hentFilerForSak,
  leggTilFil as _leggTilFil,
  slettFil as _slettFil,
} from "~/testing/mock-store/filer.server";

export function hentFilerForSak(request: Request, sakId: string): FilResponse[] {
  return _hentFilerForSak(hentMockState(request), sakId);
}

export function leggTilFil(
  request: Request,
  sakId: string,
  fil: File,
  opprettetAv: string,
): FilResponse {
  return _leggTilFil(hentMockState(request), sakId, fil, opprettetAv);
}

export function slettFil(request: Request, sakId: string, filId: string): boolean {
  return _slettFil(hentMockState(request), sakId, filId);
}
