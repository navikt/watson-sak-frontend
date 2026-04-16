import type { KontrollsakResponse } from "~/saker/types.backend";

interface Oppsummeringsdel {
  antall: number;
  tekst: string;
}

function formaterSakTekst(antall: number, entall: string, flertall: string) {
  return `${antall} ${antall === 1 ? entall : flertall}`;
}

function getStatus(sak: KontrollsakResponse) {
  return sak.status;
}

function velgMestRelevantArbeid(saker: KontrollsakResponse[]): Oppsummeringsdel[] {
  const antallTipsTilVurdering = saker.filter((sak) => getStatus(sak) === "UFORDELT").length;
  const antallTilUtredning = saker.filter(
    (sak) => getStatus(sak) === "UTREDES" || getStatus(sak) === "I_BERO",
  ).length;
  const antallSomVenterPåSvar = saker.filter((sak) => getStatus(sak) === "FORVALTNING").length;

  const oppsummeringer: Oppsummeringsdel[] = [
    {
      antall: antallTipsTilVurdering,
      tekst: `${antallTipsTilVurdering} tips til vurdering`,
    },
    {
      antall: antallTilUtredning,
      tekst: formaterSakTekst(antallTilUtredning, "sak til utredning", "saker til utredning"),
    },
    {
      antall: antallSomVenterPåSvar,
      tekst: formaterSakTekst(
        antallSomVenterPåSvar,
        "sak som venter på svar fra NAY/NFP",
        "saker som venter på svar fra NAY/NFP",
      ),
    },
  ];

  return oppsummeringer
    .filter((oppsummering) => oppsummering.antall > 0)
    .sort((a, b) => b.antall - a.antall)
    .slice(0, 2);
}

function sammenstillOppsummering(oppsummeringer: Oppsummeringsdel[]) {
  if (oppsummeringer.length === 0) {
    return "Er du klar for nye oppgaver? Du har ingen saker hos deg akkurat nå.";
  }

  if (oppsummeringer.length === 1) {
    return `Akkurat nå har du ${oppsummeringer[0].tekst}.`;
  }

  return `Akkurat nå har du ${oppsummeringer[0].tekst} og ${oppsummeringer[1].tekst}.`;
}

export function lagVelkomstOppsummering(saker: KontrollsakResponse[]) {
  const oppsummeringer = velgMestRelevantArbeid(saker);

  return sammenstillOppsummering(oppsummeringer);
}
