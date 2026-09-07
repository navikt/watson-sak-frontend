import { RouteConfig } from "~/routeConfig";
import { OVER_FRIST_DAGER, type EnhetsOppsummering } from "./beregninger";
import type { LederAdvarsel } from "./velkomst";

function formaterSakTekst(antall: number, entall: string, flertall: string) {
  return `${antall} ${antall === 1 ? entall : flertall}`;
}

/**
 * Bygger listen over advarsler leder ser på oversikten: saker som har blitt
 * liggende over frist, og eierløse saker som venter på fordeling i enheten.
 */
export function lagLederAdvarsler(
  oppsummering: EnhetsOppsummering,
  enhetId: string,
): LederAdvarsel[] {
  const advarsler: LederAdvarsel[] = [];

  if (oppsummering.antallOverFrist > 0) {
    advarsler.push({
      id: "over-frist",
      tekst: `${formaterSakTekst(oppsummering.antallOverFrist, "sak er", "saker er")} over frist – ikke oppdatert på over ${OVER_FRIST_DAGER} dager.`,
      lenke: {
        to: `${RouteConfig.ALLE_SAKER}?enhet=${enhetId}&sorter=oppdatert&retning=asc`,
        label: "Se saker over frist",
      },
    });
  }

  if (oppsummering.antallUfordelte > 0) {
    advarsler.push({
      id: "ufordelte",
      tekst: `${formaterSakTekst(oppsummering.antallUfordelte, "ufordelt sak", "ufordelte saker")} venter på tildeling i enheten.`,
      lenke: { to: RouteConfig.FORDELING, label: "Gå til fordeling" },
    });
  }

  return advarsler;
}
