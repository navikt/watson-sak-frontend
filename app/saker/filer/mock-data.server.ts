import { hentMockState } from "~/testing/mock-store/session.server";
import {
  hentDokument as _hentDokument,
  hentDokumentHistorikk as _hentDokumentHistorikk,
  hentDokumentHistorikkpunkt as _hentDokumentHistorikkpunkt,
  gjenopprettDokumentHistorikk as _gjenopprettDokumentHistorikk,
  hentDokumenttreForSak as _hentDokumenttreForSak,
  lagreDokument as _lagreDokument,
  opprettEllerOppdaterDokumentHistorikk as _opprettEllerOppdaterDokumentHistorikk,
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

export function hentDokumentHistorikk(request: Request, sakId: string, docId: string) {
  return _hentDokumentHistorikk(hentMockState(request), sakId, docId);
}

export function hentDokumentHistorikkpunkt(
  request: Request,
  sakId: string,
  docId: string,
  historikkId: string,
) {
  return _hentDokumentHistorikkpunkt(hentMockState(request), sakId, docId, historikkId);
}

export function opprettEllerOppdaterDokumentHistorikk(
  request: Request,
  sakId: string,
  docId: string,
  endretAv: string,
) {
  const state = hentMockState(request);
  const dokument = _hentDokument(state, sakId, docId);
  if (dokument) {
    _opprettEllerOppdaterDokumentHistorikk(state, sakId, docId, dokument, endretAv);
  }
}

export function gjenopprettDokumentHistorikk(
  request: Request,
  sakId: string,
  docId: string,
  historikkId: string,
  endretAv: string,
) {
  return _gjenopprettDokumentHistorikk(hentMockState(request), sakId, docId, historikkId, endretAv);
}

export function slettDokument(request: Request, sakId: string, docId: string) {
  return _slettDokument(hentMockState(request), sakId, docId);
}
