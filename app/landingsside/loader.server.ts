import type { LoaderFunctionArgs } from "react-router";
import { hentInnloggetBruker } from "~/auth/innlogget-bruker.server";
import { skalBrukeMockdata } from "~/config/env.server";
import {
  mockMineSakerAvslutningsdatoer,
  mockMineSakerTidligereTipsSakIder,
} from "~/mine-saker/mock-data.server";
import { hentMineSaker } from "~/saker/mock-alle-saker.server";
import { getOpprettetDato } from "~/saker/selectors";
import { hentUlesteVarsler } from "~/varsler/mock-data.server";
import { beregnDineSakerSiste14Dager } from "./beregninger";
import { lagVelkomstOppsummering } from "./velkomst";

export async function loader({ request }: LoaderFunctionArgs) {
  const innloggetBruker = await hentInnloggetBruker({ request });

  if (!skalBrukeMockdata) {
    // TODO: Implementer backend-kall for landingsside
    throw new Response("Landingsside er ikke tilgjengelig uten mockdata", { status: 501 });
  }

  const mineSakerHosInnloggetBruker = hentMineSaker(request, innloggetBruker.navIdent);

  const aktiveMineSaker = mineSakerHosInnloggetBruker.filter(
    (sak) => sak.status !== "ANMELDT" && sak.status !== "HENLAGT" && sak.status !== "AVSLUTTET",
  );

  const sakerForVelkomstOppsummering = mineSakerHosInnloggetBruker.filter(
    (sak) => sak.status !== "HENLAGT" && sak.status !== "AVSLUTTET",
  );

  const mineSaker = [...aktiveMineSaker]
    .sort((a, b) => getOpprettetDato(b).localeCompare(getOpprettetDato(a)))
    .slice(0, 5);
  const varsler = hentUlesteVarsler(request);
  const velkomstOppsummering = lagVelkomstOppsummering(sakerForVelkomstOppsummering);
  const referansedato = new Date().toISOString().split("T")[0];
  const dineSakerSiste14Dager = beregnDineSakerSiste14Dager({
    request,
    saker: aktiveMineSaker,
    avslutningsdatoer: mockMineSakerAvslutningsdatoer,
    tidligereTipsSakIder: mockMineSakerTidligereTipsSakIder,
    referansedato,
  });

  return { mineSaker, varsler, velkomstOppsummering, dineSakerSiste14Dager };
}
