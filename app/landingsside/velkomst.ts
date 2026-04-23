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

function erAktivStatus(status: KontrollsakResponse["status"]) {
  return status === "OPPRETTET" || status === "UTREDES" || status === "ANMELDELSE_VURDERES";
}

function erVentendeStatus(status: KontrollsakResponse["status"]) {
  return status === "VENTER_PA_INFORMASJON" || status === "VENTER_PA_VEDTAK";
}

function velgMestRelevantArbeid(saker: KontrollsakResponse[]): Oppsummeringsdel[] {
  const antallAktiveSaker = saker.filter((sak) => erAktivStatus(getStatus(sak))).length;
  const antallVentendeSaker = saker.filter((sak) => erVentendeStatus(getStatus(sak))).length;
  const antallSakerIBero = saker.filter((sak) => sak.iBero).length;

  const oppsummeringer: Oppsummeringsdel[] = [
    {
      antall: antallAktiveSaker,
      tekst: formaterSakTekst(antallAktiveSaker, "aktiv sak", "aktive saker"),
    },
    {
      antall: antallVentendeSaker,
      tekst: formaterSakTekst(antallVentendeSaker, "sak på vent", "saker på vent"),
    },
    {
      antall: antallSakerIBero,
      tekst: formaterSakTekst(antallSakerIBero, "sak i bero", "saker i bero"),
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
