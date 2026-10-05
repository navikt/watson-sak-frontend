import { hentInnloggetBruker } from "~/auth/innlogget-bruker.server";
import { hentAlleSaker, medInnloggetEier } from "~/saker/mock-alle-saker.server";
import type { KontrollsakResponse } from "~/saker/types.backend";
import { finnSakMedReferanse } from "./id";
import { harDirekteSakstilgang, kanLeseSaksinnhold } from "./sakstilgang";
import { hentStegbaserteSaksregler } from "./stegregler";

export type Sakstilgang = {
  sak: KontrollsakResponse;
  /** Eier, delt-med eller leder, eller hvem som helst når saken er avsluttet. */
  kanSe: boolean;
  /** Kan redigere dokumenter: eier, delt-med eller leder etter at utredning er startet. */
  kanRedigereDokumenter: boolean;
  /** Kan laste opp filer: eier, delt-med eller leder på en aktiv sak. */
  kanLasteOppFiler: boolean;
};

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

  const harDirekteTilgang = harDirekteSakstilgang(sak, innlogget);
  const stegregler = hentStegbaserteSaksregler(sak.steg);

  return {
    sak,
    kanSe: kanLeseSaksinnhold(sak, innlogget),
    kanRedigereDokumenter: harDirekteTilgang && stegregler.kanRedigereDokumenter,
    kanLasteOppFiler: harDirekteTilgang && stegregler.kanLasteOppFiler,
  };
}
