import { hentMockState } from "~/testing/mock-store/session.server";
import { hentFilerForSak as _hentFilerForSak } from "~/testing/mock-store/filer.server";

export function hentFilerForSak(request: Request, sakId: string) {
  return _hentFilerForSak(hentMockState(request), sakId);
}
