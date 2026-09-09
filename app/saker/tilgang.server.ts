import { hentInnloggetBruker } from "~/auth/innlogget-bruker.server";
import { hentAlleSaker, medInnloggetEier } from "~/saker/mock-alle-saker.server";
import type { KontrollsakResponse } from "~/saker/types.backend";
import { erAktivSakKontrollsak, erSakseier } from "./handlinger/tilgjengeligeHandlinger";
import { finnSakMedReferanse } from "./id";

export type Sakstilgang = {
  sak: KontrollsakResponse;
  /** Eier, delt-med eller leder: kan se saken og dens dokumenter. */
  kanSe: boolean;
  /** Kan redigere dokumenter: eier, delt-med eller leder på en aktiv sak. */
  kanRedigereDokumenter: boolean;
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

  const erEier = erSakseier(sak, innlogget.navIdent);
  const harDeltTilgang = sak.saksbehandlere.deltMed.some((s) => s.navIdent === innlogget.navIdent);
  const kanSe = erEier || harDeltTilgang || innlogget.erLeder;

  return {
    sak,
    kanSe,
    kanRedigereDokumenter: kanSe && erAktivSakKontrollsak(sak.status),
  };
}
