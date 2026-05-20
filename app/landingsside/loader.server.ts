import type { LoaderFunctionArgs } from "react-router";
import { beregnTraktSteg } from "~/alle-saker/saker-utils";
import { hentInnloggetBruker } from "~/auth/innlogget-bruker.server";
import { skalBrukeMockdata } from "~/config/env.server";
import { hentMineSaker } from "~/saker/mock-alle-saker.server";
import { getOpprettetDato } from "~/saker/selectors";
import { hentUlesteVarsler } from "~/varsler/mock-data.server";
import { lagVelkomstOppsummering } from "./velkomst";

function erInnenforSiste14Dager(dato: string): boolean {
  const fjortenDagerSiden = new Date();
  fjortenDagerSiden.setDate(fjortenDagerSiden.getDate() - 14);
  return new Date(dato) >= fjortenDagerSiden;
}

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

  const sakerSiste14Dager = mineSakerHosInnloggetBruker.filter((sak) =>
    erInnenforSiste14Dager(sak.opprettet),
  );
  const traktSteg = beregnTraktSteg(sakerSiste14Dager);

  return { mineSaker, varsler, velkomstOppsummering, traktSteg };
}
