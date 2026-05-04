import type { KontrollsakResponse } from "~/saker/types.backend";
import { hentHistorikk } from "~/saker/historikk/mock-data.server";
import { beregnBehandlingstid } from "~/statistikk/beregninger";
import type { Avslutningsdatoer } from "~/statistikk/mock-data.server";

interface BeregnDineSakerSiste14DagerArgs {
  saker: KontrollsakResponse[];
  avslutningsdatoer: Avslutningsdatoer;
  tidligereTipsSakIder: string[];
  referansedato: string;
}

export interface DineSakerSiste14DagerStatistikk {
  antallSakerJobbetMed: number;
  antallTipsTilVurdering: number;
  antallSendtTilNayNfp: number;
  snittBehandlingstidPerSak: number | null;
  antallHenlagteSaker: number;
  antallHenlagteTips: number;
  antallSakerIBero: number;
}

function getOpprettet(sak: KontrollsakResponse): string {
  return sak.opprettet;
}

function harEier(sak: KontrollsakResponse) {
  return sak.saksbehandlere.eier !== null;
}

function erSendtTilNayNfp(sak: KontrollsakResponse) {
  return hentHistorikk(sak.id).some((hendelse) => hendelse.hendelsesType === "VIDERESENDT_TIL_NAY_NFP");
}

function erInnenforSiste14Dager(dato: string, referansedato: string) {
  const referanse = new Date(referansedato);
  const fjortenDagerSiden = new Date(referanse);
  fjortenDagerSiden.setDate(referanse.getDate() - 14);

  return new Date(dato) >= fjortenDagerSiden;
}

export function beregnDineSakerSiste14Dager({
  saker,
  avslutningsdatoer,
  tidligereTipsSakIder,
  referansedato,
}: BeregnDineSakerSiste14DagerArgs): DineSakerSiste14DagerStatistikk {
  const sakerSiste14Dager = saker.filter(
    (sak) => erInnenforSiste14Dager(getOpprettet(sak), referansedato) && harEier(sak),
  );

  const behandlingstid = beregnBehandlingstid(sakerSiste14Dager, avslutningsdatoer);

  return {
    antallSakerJobbetMed: sakerSiste14Dager.length,
    antallTipsTilVurdering: 0,
    antallSendtTilNayNfp: sakerSiste14Dager.filter((sak) => erSendtTilNayNfp(sak)).length,
    snittBehandlingstidPerSak: behandlingstid?.gjennomsnitt ?? null,
    antallHenlagteSaker: sakerSiste14Dager.filter(
      (sak) => sak.status === "HENLAGT" && !tidligereTipsSakIder.includes(sak.id),
    ).length,
    antallHenlagteTips: sakerSiste14Dager.filter(
      (sak) => sak.status === "HENLAGT" && tidligereTipsSakIder.includes(sak.id),
    ).length,
    antallSakerIBero: sakerSiste14Dager.filter((sak) => sak.blokkert === "I_BERO").length,
  };
}
