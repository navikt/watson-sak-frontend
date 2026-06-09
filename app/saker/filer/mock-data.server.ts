import { hentMockState } from "~/testing/mock-store/session.server";
import {
  hentDokument as _hentDokument,
  hentDokumenttreForSak as _hentDokumenttreForSak,
  lagreDokument as _lagreDokument,
  opprettDokument as _opprettDokument,
  slettDokument as _slettDokument,
} from "~/testing/mock-store/dokumenter.server";
import type { DokumentInnhold } from "./typer";

export function hentDokumenttreForSak(request: Request, sakId: string) {
  return _hentDokumenttreForSak(hentMockState(request), sakId);
}

export function hentDokument(request: Request, sakId: string, docId: string) {
  return _hentDokument(hentMockState(request), sakId, docId);
}

export function opprettDokument(request: Request, sakId: string, opprettetAv: string) {
  return _opprettDokument(hentMockState(request), sakId, opprettetAv);
}

export function lagreDokument(
  request: Request,
  sakId: string,
  docId: string,
  endringer: { tittel: string; innhold: DokumentInnhold; endretAv: string },
) {
  return _lagreDokument(hentMockState(request), sakId, docId, endringer);
}

export function slettDokument(request: Request, sakId: string, docId: string) {
  return _slettDokument(hentMockState(request), sakId, docId);
}
