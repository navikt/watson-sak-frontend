import {
  mockMineSaker,
  mockMineSakerAvslutningsdatoer,
  mockMineSakerTidligereTipsSakIder,
} from "~/mine-saker/mock-data.server";
import { sorterSakerEtterDato } from "~/saker/utils";
import { hentUlesteVarsler } from "~/varsler/mock-data.server";
import { beregnDineSakerSiste14Dager } from "./beregninger";
import { lagVelkomstOppsummering } from "./velkomst";

export function loader() {
  const mineSaker = sorterSakerEtterDato(mockMineSaker, "nyest").slice(0, 5);
  const varsler = hentUlesteVarsler();
  const velkomstOppsummering = lagVelkomstOppsummering(mockMineSaker);
  const referansedato = new Date().toISOString().split("T")[0];
  const dineSakerSiste14Dager = beregnDineSakerSiste14Dager({
    saker: mockMineSaker,
    avslutningsdatoer: mockMineSakerAvslutningsdatoer,
    tidligereTipsSakIder: mockMineSakerTidligereTipsSakIder,
    referansedato,
  });

  return { mineSaker, varsler, velkomstOppsummering, dineSakerSiste14Dager };
}
