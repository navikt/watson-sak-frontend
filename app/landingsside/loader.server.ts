import type { LoaderFunctionArgs } from "react-router";
import { beregnTraktSteg } from "~/alle-saker/saker-utils";
import { getBackendOboToken } from "~/auth/access-token";
import { hentInnloggetBruker } from "~/auth/innlogget-bruker.server";
import { skalBrukeMockdata } from "~/config/env.server";
import { hentKontrollsaker } from "~/fordeling/api.server";
import { hentMineSaker } from "~/saker/mock-alle-saker.server";
import { getOpprettetDato } from "~/saker/selectors";
import type { KontrollsakResponse } from "~/saker/types.backend";
import { hentUlesteVarsler } from "~/varsler/mock-data.server";
import type { Varsel } from "~/varsler/typer";
import { lagVelkomstOppsummering } from "./velkomst";

function hentOppdatertDato(sak: KontrollsakResponse): string {
  return sak.oppdatert ?? sak.opprettet;
}

function erInnenforSiste30Dager(dato: string, referansedato: Date): boolean {
  const trettiDagerSiden = new Date(referansedato);
  trettiDagerSiden.setDate(trettiDagerSiden.getDate() - 30);
  return new Date(dato) >= trettiDagerSiden;
}

function finnReferansedato(saker: KontrollsakResponse[]): Date {
  if (saker.length === 0) return new Date();
  const nyeste = saker.reduce((a, b) => (hentOppdatertDato(a) > hentOppdatertDato(b) ? a : b));
  return new Date(hentOppdatertDato(nyeste));
}

export async function loader({ request }: LoaderFunctionArgs) {
  const innloggetBruker = await hentInnloggetBruker({ request });

  let mineSakerHosInnloggetBruker: KontrollsakResponse[];
  let varsler: Varsel[];

  if (!skalBrukeMockdata) {
    const token = await getBackendOboToken(request);
    const resultat = await hentKontrollsaker({
      token,
      page: 1,
      size: 200,
      ansvarligNavIdent: innloggetBruker.navIdent,
    });
    mineSakerHosInnloggetBruker = resultat.items;
    varsler = []; // TODO: hent varsler fra backend når endepunktet er klart
  } else {
    mineSakerHosInnloggetBruker = hentMineSaker(
      request,
      innloggetBruker.navIdent,
      innloggetBruker.name,
    );
    varsler = hentUlesteVarsler(request);
  }

  const aktiveMineSaker = mineSakerHosInnloggetBruker.filter(
    (sak) => sak.status !== "ANMELDT" && sak.status !== "HENLAGT" && sak.status !== "AVSLUTTET",
  );

  const sakerForVelkomstOppsummering = mineSakerHosInnloggetBruker.filter(
    (sak) => sak.status !== "HENLAGT" && sak.status !== "AVSLUTTET",
  );

  const mineSaker = [...aktiveMineSaker]
    .sort((a, b) => getOpprettetDato(b).localeCompare(getOpprettetDato(a)))
    .slice(0, 5);

  const velkomstOppsummering = lagVelkomstOppsummering(sakerForVelkomstOppsummering);

  const referansedato = finnReferansedato(mineSakerHosInnloggetBruker);
  const sakerSiste30Dager = mineSakerHosInnloggetBruker.filter((sak) =>
    erInnenforSiste30Dager(hentOppdatertDato(sak), referansedato),
  );
  const traktSteg = beregnTraktSteg(sakerSiste30Dager);

  return { mineSaker, varsler, velkomstOppsummering, traktSteg };
}
