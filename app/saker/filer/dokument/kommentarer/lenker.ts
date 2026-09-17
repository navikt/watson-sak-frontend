import { RouteConfig } from "~/routeConfig";

/**
 * Dyplenker til kommentarpanelet.
 *
 * Både sakshistorikken og Watson-varsler lenker hit, slik at man kan gå rett fra
 * «Ny kommentar på dokumentet» til riktig tråd i riktig dokument.
 */

/** Query-parameteret som velger sidepanel. Verdien må matche en `SidepanelValg`. */
export const SIDEPANEL_QUERY = "sidepanel";
/** Query-parameteret som peker på en bestemt kommentartråd. */
export const KOMMENTARTRAAD_QUERY = "kommentartraad";
/** Verdien `sidepanel` må ha for at kommentarpanelet skal åpnes. */
export const KOMMENTAR_SIDEPANEL_VERDI = "kommentarer";

export function byggKommentarLenke(
  sakReferanse: string,
  docId: string,
  traadId?: string | null,
): string {
  const sti = RouteConfig.SAKER_DOKUMENT.replace(":sakId", sakReferanse).replace(":docId", docId);
  const query = new URLSearchParams({ [SIDEPANEL_QUERY]: KOMMENTAR_SIDEPANEL_VERDI });
  if (traadId) {
    query.set(KOMMENTARTRAAD_QUERY, traadId);
  }
  return `${sti}?${query}`;
}
