import type { LoaderFunctionArgs } from "react-router";
import { beregnTraktSteg } from "~/alle-saker/saker-utils";
import { hentInnloggetBruker } from "~/auth/innlogget-bruker.server";
import { skalBrukeMockdata } from "~/config/env.server";
import { hentMineSaker } from "~/saker/mock-alle-saker.server";
import { getOpprettetDato } from "~/saker/selectors";
import type { KontrollsakResponse } from "~/saker/types.backend";
import { hentUlesteVarsler } from "~/varsler/mock-data.server";
import { lagVelkomstOppsummering } from "./velkomst";

function hentOppdatertDato(sak: KontrollsakResponse): string {
  return sak.oppdatert ?? sak.opprettet;
}

function erInnenforSiste14Dager(dato: string, referansedato: Date): boolean {
  const fjortenDagerSiden = new Date(referansedato);
  fjortenDagerSiden.setDate(fjortenDagerSiden.getDate() - 14);
  return new Date(dato) >= fjortenDagerSiden;
}

function finnReferansedato(saker: KontrollsakResponse[]): Date {
  if (saker.length === 0) return new Date();
  const nyeste = saker.reduce((a, b) => (hentOppdatertDato(a) > hentOppdatertDato(b) ? a : b));
  return new Date(hentOppdatertDato(nyeste));
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

  const referansedato = finnReferansedato(mineSakerHosInnloggetBruker);
  const sakerSiste14Dager = mineSakerHosInnloggetBruker.filter((sak) =>
    erInnenforSiste14Dager(hentOppdatertDato(sak), referansedato),
  );
  const traktSteg = beregnTraktSteg(sakerSiste14Dager);

  return { mineSaker, varsler, velkomstOppsummering, traktSteg };
}
