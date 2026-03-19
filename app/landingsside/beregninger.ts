import type { Sak } from "~/saker/typer";
import { beregnBehandlingstid } from "~/statistikk/beregninger";
import type { Avslutningsdatoer } from "~/statistikk/mock-data.server";

interface BeregnDineSakerSiste14DagerArgs {
  saker: Sak[];
  avslutningsdatoer: Avslutningsdatoer;
  tidligereTipsSakIder: string[];
  referansedato: string;
}

export interface DineSakerSiste14DagerStatistikk {
  antallSakerJobbetMed: number;
  antallTipsAvklart: number;
  antallSendtTilNayNfp: number;
  snittBehandlingstidPerSak: number | null;
  antallHenlagteSaker: number;
  antallHenlagteTips: number;
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
  const sakerSiste14Dager = saker.filter((sak) =>
    erInnenforSiste14Dager(sak.datoInnmeldt, referansedato),
  );

  const behandlingstid = beregnBehandlingstid(sakerSiste14Dager, avslutningsdatoer);

  return {
    antallSakerJobbetMed: sakerSiste14Dager.length,
    antallTipsAvklart: sakerSiste14Dager.filter((sak) => sak.status === "tips avklart").length,
    antallSendtTilNayNfp: sakerSiste14Dager.filter(
      (sak) => sak.status === "videresendt til nay/nfp",
    ).length,
    snittBehandlingstidPerSak: behandlingstid?.gjennomsnitt ?? null,
    antallHenlagteSaker: sakerSiste14Dager.filter((sak) => sak.status === "henlagt").length,
    antallHenlagteTips: sakerSiste14Dager.filter(
      (sak) => sak.status === "henlagt" && tidligereTipsSakIder.includes(sak.id),
    ).length,
  };
}
