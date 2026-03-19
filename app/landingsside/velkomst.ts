import type { Sak } from "~/saker/typer";

interface Oppsummeringsdel {
  antall: number;
  tekst: string;
}

function formaterSakTekst(antall: number, entall: string, flertall: string) {
  return `${antall} ${antall === 1 ? entall : flertall}`;
}

function velgMestRelevantArbeid(saker: Sak[]): Oppsummeringsdel[] {
  const antallTipsTilVurdering = saker.filter((sak) => sak.status === "tips mottatt").length;
  const antallTilUtredning = saker.filter((sak) => sak.status === "under utredning").length;
  const antallSomVenterPåSvar = saker.filter(
    (sak) => sak.status === "videresendt til nay/nfp",
  ).length;

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

export function lagVelkomstOppsummering(saker: Sak[]) {
  const oppsummeringer = velgMestRelevantArbeid(saker);

  return sammenstillOppsummering(oppsummeringer);
}
