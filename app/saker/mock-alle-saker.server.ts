import { hentMockState } from "~/testing/mock-store/session.server";
import {
  hentAlleSaker as _hentAlleSaker,
  hentFordelingssaker as _hentFordelingssaker,
  hentMineSaker as _hentMineSaker,
  leggTilMockSakIFordeling as _leggTilMockSakIFordeling,
  medInnloggetEier,
} from "~/testing/mock-store/alle-saker.server";

export { medInnloggetEier };

export function hentAlleSaker(request: Request) {
  return _hentAlleSaker(hentMockState(request));
}

export function hentFordelingssaker(request: Request) {
  return _hentFordelingssaker(hentMockState(request));
}

export function hentMineSaker(request: Request, navIdent?: string, navn?: string) {
  return _hentMineSaker(hentMockState(request), navIdent, navn);
}

export function leggTilMockSakIFordeling(
  request: Request,
  ...args: Parameters<typeof _leggTilMockSakIFordeling> extends [unknown, ...infer Rest]
    ? Rest
    : never
) {
  return _leggTilMockSakIFordeling(hentMockState(request), ...args);
}
