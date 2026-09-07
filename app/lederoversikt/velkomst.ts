import type { EnhetsOppsummering } from "./beregninger";

function formaterSakTekst(antall: number, entall: string, flertall: string) {
  return `${antall} ${antall === 1 ? entall : flertall}`;
}

function sammenstill(deler: string[]): string {
  if (deler.length === 1) return deler[0];
  return `${deler.slice(0, -1).join(", ")} og ${deler[deler.length - 1]}`;
}

/** Bygger velkomstteksten for lederoversikten, aggregert på enhetsnivå. */
export function lagLederVelkomstOppsummering(
  oppsummering: EnhetsOppsummering,
  enhetNavn: string,
): string {
  if (oppsummering.antallÅpneSaker === 0) {
    return `Enheten ${enhetNavn} har ingen åpne saker akkurat nå.`;
  }

  const deler = [formaterSakTekst(oppsummering.antallÅpneSaker, "åpen sak", "åpne saker")];

  if (oppsummering.antallOverFrist > 0) {
    deler.push(
      formaterSakTekst(oppsummering.antallOverFrist, "sak over frist", "saker over frist"),
    );
  }

  if (oppsummering.antallUfordelte > 0) {
    deler.push(formaterSakTekst(oppsummering.antallUfordelte, "ufordelt sak", "ufordelte saker"));
  }

  return `Enheten ${enhetNavn} har ${sammenstill(deler)} akkurat nå.`;
}

export interface LederAdvarsel {
  id: string;
  tekst: string;
  lenke: { to: string; label: string };
}
