import { hentMockState } from "~/testing/mock-store/session.server";
import {
  hentAlleSaker as _hentAlleSaker,
  hentAvslutningsdatoer as _hentAvslutningsdatoer,
  hentFordelingssaker as _hentFordelingssaker,
  hentMineSaker as _hentMineSaker,
  leggTilMockSakIFordeling as _leggTilMockSakIFordeling,
} from "~/testing/mock-store/alle-saker.server";

export function hentAlleSaker(request: Request) {
  return _hentAlleSaker(hentMockState(request));
}

export function hentFordelingssaker(request: Request) {
  return _hentFordelingssaker(hentMockState(request));
}

export function hentMineSaker(request: Request, navIdent?: string) {
  return _hentMineSaker(hentMockState(request), navIdent);
}

export function hentAvslutningsdatoer(request: Request) {
  return _hentAvslutningsdatoer(hentMockState(request));
}

export function leggTilMockSakIFordeling(
  request: Request,
  ...args: Parameters<typeof _leggTilMockSakIFordeling> extends [unknown, ...infer Rest]
    ? Rest
    : never
) {
  return _leggTilMockSakIFordeling(hentMockState(request), ...args);
}
