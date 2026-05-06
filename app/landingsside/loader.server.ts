import {
  mockMineSakerAvslutningsdatoer,
  mockMineSakerTidligereTipsSakIder,
} from "~/mine-saker/mock-data.server";
import { hentMineSaker } from "~/saker/mock-alle-saker.server";
import { getOpprettetDato } from "~/saker/selectors";
import { hentUlesteVarsler } from "~/varsler/mock-data.server";
import { beregnDineSakerSiste14Dager } from "./beregninger";
import { lagVelkomstOppsummering } from "./velkomst";

export function loader() {
  const mineSakerHosInnloggetBruker = hentMineSaker();

  const aktiveMineSaker = mineSakerHosInnloggetBruker.filter(
    (sak) => sak.status !== "ANMELDT" && sak.status !== "HENLAGT" && sak.status !== "AVSLUTTET",
  );

  const sakerForVelkomstOppsummering = mineSakerHosInnloggetBruker.filter(
    (sak) => sak.status !== "HENLAGT" && sak.status !== "AVSLUTTET",
  );

  const mineSaker = [...aktiveMineSaker]
    .sort((a, b) => getOpprettetDato(b).localeCompare(getOpprettetDato(a)))
    .slice(0, 5);
  const varsler = hentUlesteVarsler();
  const velkomstOppsummering = lagVelkomstOppsummering(sakerForVelkomstOppsummering);
  const referansedato = new Date().toISOString().split("T")[0];
  const dineSakerSiste14Dager = beregnDineSakerSiste14Dager({
    saker: aktiveMineSaker,
    avslutningsdatoer: mockMineSakerAvslutningsdatoer,
    tidligereTipsSakIder: mockMineSakerTidligereTipsSakIder,
    referansedato,
  });

  return { mineSaker, varsler, velkomstOppsummering, dineSakerSiste14Dager };
}
