import type { LederEnhetStatistikk } from "./types";

function sammenstill(deler: string[]): string {
  if (deler.length === 1) return deler[0];
  return `${deler.slice(0, -1).join(", ")} og ${deler[deler.length - 1]}`;
}

/**
 * Bygger velkomstteksten for lederoversikten fra øyeblikksbildet backend beregner.
 * Tallene er de samme som de fire første nøkkeltallene på statistikksiden.
 */
export function lagLederVelkomstOppsummering(
  enhet: LederEnhetStatistikk,
  enhetNavn: string,
): string {
  const { totalt, aktive, venterPåAndre, ikkeFordelt } = enhet.oyeblikksbilde;

  if (totalt === 0) {
    return `Enheten ${enhetNavn} har ingen åpne saker akkurat nå.`;
  }

  const innledning = `Enheten ${enhetNavn} har ${totalt} ${totalt === 1 ? "åpen sak" : "åpne saker"}.`;
  const deler = [
    aktive > 0 ? `${aktive} ${aktive === 1 ? "er aktiv" : "er aktive"}` : null,
    venterPåAndre > 0 ? `${venterPåAndre} venter på andre` : null,
    ikkeFordelt > 0 ? `${ikkeFordelt} er ikke fordelt` : null,
  ].filter((del): del is string => del !== null);

  if (deler.length === 0) return innledning;

  const detaljer = sammenstill(deler);
  return `${innledning} ${detaljer.charAt(0).toUpperCase()}${detaljer.slice(1)}.`;
}
