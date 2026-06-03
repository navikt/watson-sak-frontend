import { hentMockState } from "~/testing/mock-store/session.server";
import {
  hentUlesteVarsler as _hentUlesteVarsler,
  hentVarsler as _hentVarsler,
  markerAlleVarslerSomLest as _markerAlleVarslerSomLest,
  markerVarselSomLest as _markerVarselSomLest,
} from "~/testing/mock-store/varsler.server";

export function hentUlesteVarsler(request: Request) {
  return _hentUlesteVarsler(hentMockState(request));
}

export function hentVarsler(request: Request) {
  return _hentVarsler(hentMockState(request));
}

export function markerVarselSomLest(request: Request, varselId: string) {
  return _markerVarselSomLest(hentMockState(request), varselId);
}

export function markerAlleVarslerSomLest(request: Request) {
  return _markerAlleVarslerSomLest(hentMockState(request));
}
