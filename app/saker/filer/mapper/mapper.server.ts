import * as backendApi from "~/saker/api.server";
import { logger } from "~/logging/logging";
import { hentMapperForSak } from "~/testing/mock-store/mapper.server";
import { hentMockState } from "~/testing/mock-store/session.server";

/**
 * Henter mappestiene for en sak fra backend. Mapper er ikke kritiske for å vise saken, så en
 * kjent feil fra backend (f.eks. manglende tilgang) gir en tom liste i stedet for en feilside.
 * Dokumenter og filer vises da på rotnivå. Utlogging og nettverksfeil kastes videre.
 */
export async function hentMapperstier(token: string, sakId: string): Promise<string[]> {
  try {
    const mapper = await backendApi.hentMapper(token, sakId);
    return mapper.map((mappe) => mappe.sti);
  } catch (feil) {
    if (feil instanceof backendApi.BackendFeilException) {
      logger.warn("Kunne ikke hente mapper, viser filene uten mapper", {
        sakId,
        status: feil.status,
      });
      return [];
    }
    throw feil;
  }
}

export function hentMapperstierFraMock(request: Request, sakId: string): string[] {
  return hentMapperForSak(hentMockState(request), sakId).map((mappe) => mappe.sti);
}
