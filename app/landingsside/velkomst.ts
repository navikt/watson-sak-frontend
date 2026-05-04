import type { KontrollsakResponse } from "~/saker/types.backend";

interface Oppsummeringsdel {
  antall: number;
  tekst: string;
}

function formaterSakTekst(antall: number, entall: string, flertall: string) {
  return `${antall} ${antall === 1 ? entall : flertall}`;
}

const aktiveStatuser: KontrollsakResponse["status"][] = [
  "OPPRETTET",
  "UTREDES",
  "STRAFFERETTSLIG_VURDERING",
  "ANMELDT",
];

function erAktivStatus(sak: KontrollsakResponse) {
  return (
    aktiveStatuser.includes(sak.status) &&
    sak.blokkert !== "VENTER_PA_INFORMASJON" &&
    sak.blokkert !== "VENTER_PA_VEDTAK"
  );
}

function erVentende(sak: KontrollsakResponse) {
  return sak.blokkert === "VENTER_PA_INFORMASJON" || sak.blokkert === "VENTER_PA_VEDTAK";
}

function velgMestRelevantArbeid(saker: KontrollsakResponse[]): Oppsummeringsdel[] {
  const antallAktiveSaker = saker.filter((sak) => erAktivStatus(sak)).length;
  const antallVentendeSaker = saker.filter((sak) => erVentende(sak)).length;
  const antallSakerIBero = saker.filter((sak) => sak.blokkert === "I_BERO").length;

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
