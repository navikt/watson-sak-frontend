import { hentInnloggetBruker } from "~/auth/innlogget-bruker.server";
import { hentAlleSaker, medInnloggetEier } from "~/saker/mock-alle-saker.server";
import type { KontrollsakResponse } from "~/saker/types.backend";
import { erSakseier } from "./handlinger/tilgjengeligeHandlinger";
import { finnSakMedReferanse } from "./id";
import { hentStegbaserteSaksregler } from "./stegregler";

export type Sakstilgang = {
  sak: KontrollsakResponse;
  /** Eier, delt-med eller leder: kan se saken og dens dokumenter. */
  kanSe: boolean;
  /** Kan redigere dokumenter: eier, delt-med eller leder etter at utredning er startet. */
  kanRedigereDokumenter: boolean;
  /** Kan laste opp filer: eier, delt-med eller leder på en aktiv sak. */
  kanLasteOppFiler: boolean;
};

/**
 * Direkte tilgang til saken: eier, delt med eller leder. Gir rett til å se og endre filområdet.
 * Tilgang via kontrollobjekt eller koblet sak regnes ikke med.
 */
export function harDirekteSakstilgang(
  sak: KontrollsakResponse,
  innlogget: { navIdent: string; erLeder: boolean },
): boolean {
  return (
    erSakseier(sak, innlogget.navIdent) ||
    sak.saksbehandlere.deltMed.some((s) => s.navIdent === innlogget.navIdent) ||
    innlogget.erLeder
  );
}

/**
 * Slår opp en sak i mockdata og avgjør tilgang for innlogget bruker.
 *
 * Tilgangsreglene speiler dem som brukes for filområdet i saksvisningen, og
 * gjenbrukes av editor-routen siden den kan nås direkte via URL.
 *
 * Returnerer `null` når saken ikke finnes.
 */
export async function hentSakstilgangFraMock(
  request: Request,
  sakReferanse: string,
): Promise<Sakstilgang | null> {
  const rawSak = finnSakMedReferanse(hentAlleSaker(request), sakReferanse);
  if (!rawSak) {
    return null;
  }

  const innlogget = await hentInnloggetBruker({ request });
  const sak = medInnloggetEier(rawSak, innlogget.navIdent, innlogget.name);

  const kanSe = harDirekteSakstilgang(sak, innlogget);
  const stegregler = hentStegbaserteSaksregler(sak.steg);

  return {
    sak,
    kanSe,
    kanRedigereDokumenter: kanSe && stegregler.kanRedigereDokumenter,
    kanLasteOppFiler: kanSe && stegregler.kanLasteOppFiler,
  };
}
