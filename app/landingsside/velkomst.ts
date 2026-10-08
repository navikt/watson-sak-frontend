import type { MineSakerOppsummering } from "./api.server";

const kategorier: {
  nøkkel: keyof MineSakerOppsummering;
  entall: string;
  flertall: string;
}[] = [
  { nøkkel: "aktive", entall: "aktiv sak", flertall: "aktive saker" },
  { nøkkel: "nye", entall: "ny sak", flertall: "nye saker" },
  { nøkkel: "venter", entall: "sak på vent", flertall: "saker på vent" },
  { nøkkel: "iBero", entall: "sak i bero", flertall: "saker i bero" },
];

/** Viser de to største kategoriene fra oppsummeringen backend teller. */
export function lagVelkomstOppsummering(oppsummering: MineSakerOppsummering) {
  const deler = kategorier
    .map(({ nøkkel, entall, flertall }) => {
      const antall = oppsummering[nøkkel];
      return { antall, tekst: `${antall} ${antall === 1 ? entall : flertall}` };
    })
    .filter((del) => del.antall > 0)
    .sort((a, b) => b.antall - a.antall)
    .slice(0, 2);

  if (deler.length === 0) {
    return "Er du klar for nye oppgaver? Du har ingen saker hos deg akkurat nå.";
  }
  if (deler.length === 1) {
    return `Akkurat nå har du ${deler[0].tekst}.`;
  }
  return `Akkurat nå har du ${deler[0].tekst} og ${deler[1].tekst}.`;
}
