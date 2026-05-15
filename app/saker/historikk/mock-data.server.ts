import { hentMockState } from "~/testing/mock-store/session.server";
import {
  hentHistorikk as _hentHistorikk,
  leggTilHendelse as _leggTilHendelse,
  leggTilManuellHendelse as _leggTilManuellHendelse,
} from "~/testing/mock-store/historikk.server";

export function hentHistorikk(request: Request, sakId: number | string) {
  return _hentHistorikk(hentMockState(request), String(sakId));
}

export function leggTilHendelse(
  request: Request,
  ...args: Parameters<typeof _leggTilHendelse> extends [unknown, ...infer Rest] ? Rest : never
) {
  return _leggTilHendelse(hentMockState(request), ...args);
}

export function leggTilManuellHendelse(
  request: Request,
  ...args: Parameters<typeof _leggTilManuellHendelse> extends [unknown, ...infer Rest]
    ? Rest
    : never
) {
  return _leggTilManuellHendelse(hentMockState(request), ...args);
}
