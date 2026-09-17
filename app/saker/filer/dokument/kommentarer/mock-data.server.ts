import { hentMockState } from "~/testing/mock-store/session.server";
import {
  hentKommentarliste as _hentKommentarliste,
  opprettKommentar as _opprettKommentar,
  opprettKommentartraad as _opprettKommentartraad,
  redigerKommentar as _redigerKommentar,
  settAdressering as _settAdressering,
  slettKommentar as _slettKommentar,
} from "~/testing/mock-store/kommentarer.server";

/**
 * Tynn request-basert innpakning rundt mock-storen, slik at rutene ikke må
 * kjenne til sesjonshåndteringen. Samme mønster som `filer/mock-data.server.ts`.
 */

export function hentKommentarliste(
  request: Request,
  sakId: string,
  docId: string,
  opts: Parameters<typeof _hentKommentarliste>[3],
) {
  return _hentKommentarliste(hentMockState(request), sakId, docId, opts);
}

export function opprettKommentartraad(
  request: Request,
  sakId: string,
  docId: string,
  data: Parameters<typeof _opprettKommentartraad>[3],
) {
  return _opprettKommentartraad(hentMockState(request), sakId, docId, data);
}

export function opprettKommentar(
  request: Request,
  sakId: string,
  docId: string,
  traadId: string,
  data: Parameters<typeof _opprettKommentar>[4],
) {
  return _opprettKommentar(hentMockState(request), sakId, docId, traadId, data);
}

export function redigerKommentar(
  request: Request,
  sakId: string,
  docId: string,
  kommentarId: string,
  data: Parameters<typeof _redigerKommentar>[4],
) {
  return _redigerKommentar(hentMockState(request), sakId, docId, kommentarId, data);
}

export function slettKommentar(
  request: Request,
  sakId: string,
  docId: string,
  kommentarId: string,
  data: Parameters<typeof _slettKommentar>[4],
) {
  return _slettKommentar(hentMockState(request), sakId, docId, kommentarId, data);
}

export function settAdressering(
  request: Request,
  sakId: string,
  docId: string,
  traadId: string,
  data: Parameters<typeof _settAdressering>[4],
) {
  return _settAdressering(hentMockState(request), sakId, docId, traadId, data);
}
