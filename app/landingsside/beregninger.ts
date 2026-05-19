import type { KontrollsakResponse } from "~/saker/types.backend";
import type { Nokkeltall } from "~/statistikk/types";
import type { Avslutningsdatoer } from "~/statistikk/mock-data.server";

const DAGER_12_UKER = 84;
const DAGER_15_UKER = 105;

function dagerMellom(fra: string, til: string): number {
  const fraDato = new Date(fra);
  const tilDato = new Date(til);
  return Math.round((tilDato.getTime() - fraDato.getTime()) / (1000 * 60 * 60 * 24));
}

export function beregnNokkeltall(
  saker: KontrollsakResponse[],
  avslutningsdatoer: Avslutningsdatoer,
): Nokkeltall {
  const pagaendeSaker = saker.filter(
    (sak) => sak.status !== "HENLAGT" && sak.status !== "AVSLUTTET",
  ).length;

  const paVent = saker.filter((sak) => sak.blokkert !== null).length;

  const avsluttedeMedDato = saker
    .filter((s) => s.status === "AVSLUTTET" || s.status === "HENLAGT")
    .filter((s) => avslutningsdatoer[s.id] !== undefined)
    .map((s) => dagerMellom(s.opprettet, avslutningsdatoer[s.id]));

  const antallAvsluttede = avsluttedeMedDato.length;

  const utredetInnen12Uker =
    antallAvsluttede > 0
      ? Math.round(
          (avsluttedeMedDato.filter((d) => d <= DAGER_12_UKER).length / antallAvsluttede) * 100,
        )
      : 0;

  const utredetInnen15Uker =
    antallAvsluttede > 0
      ? Math.round(
          (avsluttedeMedDato.filter((d) => d <= DAGER_15_UKER).length / antallAvsluttede) * 100,
        )
      : 0;

  const gjennomsnittligSaksbehandlingstid =
    antallAvsluttede > 0
      ? Math.round(avsluttedeMedDato.reduce((sum, d) => sum + d, 0) / antallAvsluttede)
      : 0;

  return {
    pagaendeSaker,
    paVent,
    utredetInnen12Uker,
    utredetInnen15Uker,
    gjennomsnittligSaksbehandlingstid,
  };
}
