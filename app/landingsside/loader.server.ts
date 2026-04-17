import {
  mockMineKontrollsaker,
  mockMineSakerAvslutningsdatoer,
  mockMineSakerTidligereTipsSakIder,
} from "~/mine-saker/mock-data.server";
import { getOpprettetDato } from "~/saker/selectors";
import { hentUlesteVarsler } from "~/varsler/mock-data.server";
import { beregnDineSakerSiste14Dager } from "./beregninger";
import { lagVelkomstOppsummering } from "./velkomst";

export function loader() {
  const fordelteMineSaker = mockMineKontrollsaker.filter(
    (sak) => sak.status !== "AVSLUTTET" && sak.status !== "UFORDELT",
  );

  const mineSaker = [...fordelteMineSaker]
    .sort((a, b) => getOpprettetDato(b).localeCompare(getOpprettetDato(a)))
    .slice(0, 5);
  const varsler = hentUlesteVarsler();
  const velkomstOppsummering = lagVelkomstOppsummering(fordelteMineSaker);
  const referansedato = new Date().toISOString().split("T")[0];
  const dineSakerSiste14Dager = beregnDineSakerSiste14Dager({
    saker: fordelteMineSaker,
    avslutningsdatoer: mockMineSakerAvslutningsdatoer,
    tidligereTipsSakIder: mockMineSakerTidligereTipsSakIder,
    referansedato,
  });

  return { mineSaker, varsler, velkomstOppsummering, dineSakerSiste14Dager };
}
