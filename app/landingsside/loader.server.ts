import {
  mockMineKontrollsaker,
  mockMineSakerInnloggetNavIdent,
  mockMineSakerAvslutningsdatoer,
  mockMineSakerTidligereTipsSakIder,
} from "~/mine-saker/mock-data.server";
import { getOpprettetDato } from "~/saker/selectors";
import { hentUlesteVarsler } from "~/varsler/mock-data.server";
import { beregnDineSakerSiste14Dager } from "./beregninger";
import { lagVelkomstOppsummering } from "./velkomst";

export function loader() {
  const mineSakerHosInnloggetBruker = mockMineKontrollsaker.filter(
    (sak) => sak.saksbehandlere.eier?.navIdent === mockMineSakerInnloggetNavIdent,
  );

  const aktiveMineSaker = mineSakerHosInnloggetBruker.filter(
    (sak) =>
      sak.status !== "ANMELDT" &&
      sak.status !== "HENLAGT" &&
      sak.status !== "AVSLUTTET",
  );

  const mineSaker = [...aktiveMineSaker]
    .sort((a, b) => getOpprettetDato(b).localeCompare(getOpprettetDato(a)))
    .slice(0, 5);
  const varsler = hentUlesteVarsler();
  const velkomstOppsummering = lagVelkomstOppsummering(aktiveMineSaker);
  const referansedato = new Date().toISOString().split("T")[0];
  const dineSakerSiste14Dager = beregnDineSakerSiste14Dager({
    saker: aktiveMineSaker,
    avslutningsdatoer: mockMineSakerAvslutningsdatoer,
    tidligereTipsSakIder: mockMineSakerTidligereTipsSakIder,
    referansedato,
  });

  return { mineSaker, varsler, velkomstOppsummering, dineSakerSiste14Dager };
}
