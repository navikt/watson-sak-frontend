import { hentInnloggetBruker } from "~/auth/innlogget-bruker.server";
import { hentAlleSaker, medInnloggetEier } from "~/saker/mock-alle-saker.server";
import type { KontrollsakResponse } from "~/saker/types.backend";
import { finnSakMedReferanse } from "./id";
import { kanEndreSak, kanLasteOppFiler, kanLeseSaksinnhold, kanSeFilområdet } from "./sakstilgang";
import { hentStegbaserteSaksregler } from "./stegregler";

/** Regelen for hvert felt står i `sakstilgang.ts`. Stegreglene er lagt på her. */
export type Sakstilgang = {
  sak: KontrollsakResponse;
  /** Kan lese dokumenter, arkiv og historikk. */
  kanSe: boolean;
  /** Kan se filer og mapper. Alle på en ufordelt sak. */
  kanSeFiler: boolean;
  /** Kan redigere dokumenter: eier eller delt med etter at utredning er startet. */
  kanRedigereDokumenter: boolean;
  /** Kan laste opp, omdøpe og flytte filer og lage mapper. Alle på en ufordelt, aktiv sak. */
  kanLasteOppFiler: boolean;
  /** Kan slette filer og mapper: eier eller delt med på en aktiv sak. */
  kanEndreFiler: boolean;
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

  const kanEndre = kanEndreSak(sak, innlogget);
  const kanSkrive = !innlogget.erLesebruker;
  const stegregler = hentStegbaserteSaksregler(sak.steg);

  return {
    sak,
    kanSe: kanLeseSaksinnhold(sak, innlogget),
    kanSeFiler: kanSeFilområdet(sak, innlogget),
    kanRedigereDokumenter: kanEndre && kanSkrive && stegregler.kanRedigereDokumenter,
    kanLasteOppFiler: kanSkrive && kanLasteOppFiler(sak, innlogget) && stegregler.kanLasteOppFiler,
    kanEndreFiler: kanEndre && kanSkrive && stegregler.kanLasteOppFiler,
  };
}
