import * as backendApi from "~/saker/api.server";
import { logger } from "~/logging/logging";
import { hentMapperForSak } from "~/testing/mock-store/mapper.server";
import { hentMockState } from "~/testing/mock-store/session.server";

/**
 * Henter mappestiene for en sak fra backend. Manglende tilgang (403) gir en tom liste, slik at
 * saken kan vises uten filområdet. Andre feil kastes videre, så et backendbrudd ikke ser ut som
 * en sak uten mapper.
 */
export async function hentMapperstier(token: string, sakId: string): Promise<string[]> {
  try {
    const mapper = await backendApi.hentMapper(token, sakId);
    return mapper.map((mappe) => mappe.sti);
  } catch (feil) {
    if (feil instanceof backendApi.BackendFeilException && feil.status === 403) {
      logger.info("Ingen tilgang til mappene på saken", {
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
