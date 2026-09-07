import type { LoaderFunctionArgs } from "react-router";
import { getBackendOboToken } from "~/auth/access-token";
import { hentInnloggetBruker } from "~/auth/innlogget-bruker.server";
import { skalBrukeMockdata } from "~/config/env.server";
import { hentKontrollsaker } from "~/fordeling/api.server";
import { beregnAnsatteOversikt, beregnEnhetsOppsummering } from "~/lederoversikt/beregninger";
import { hentLederOversiktData } from "~/lederoversikt/loader.server";
import { lagLederVelkomstOppsummering } from "~/lederoversikt/velkomst";
import { hentMineSaker } from "~/saker/mock-alle-saker.server";
import { getOpprettetDato } from "~/saker/selectors";
import type { KontrollsakResponse } from "~/saker/types.backend";
import { lagVelkomstOppsummering } from "./velkomst";

async function lastSaksbehandlerData(
  request: Request,
  innloggetBruker: { navIdent: string; name: string },
) {
  let mineSakerHosInnloggetBruker: KontrollsakResponse[];

  if (!skalBrukeMockdata) {
    const token = await getBackendOboToken(request);
    const resultat = await hentKontrollsaker({
      token,
      page: 1,
      size: 200,
      ansvarligNavIdent: innloggetBruker.navIdent,
    });
    mineSakerHosInnloggetBruker = resultat.items;
  } else {
    mineSakerHosInnloggetBruker = hentMineSaker(
      request,
      innloggetBruker.navIdent,
      innloggetBruker.name,
    );
  }

  const aktiveMineSaker = mineSakerHosInnloggetBruker.filter(
    (sak) => sak.status !== "ANMELDT" && sak.status !== "HENLAGT" && sak.status !== "AVSLUTTET",
  );

  const sakerForVelkomstOppsummering = mineSakerHosInnloggetBruker.filter(
    (sak) => sak.status !== "HENLAGT" && sak.status !== "AVSLUTTET",
  );

  const mineSaker = [...aktiveMineSaker]
    .sort((a, b) => getOpprettetDato(b).localeCompare(getOpprettetDato(a)))
    .slice(0, 10);

  const velkomstOppsummering = lagVelkomstOppsummering(sakerForVelkomstOppsummering);

  return { type: "saksbehandler" as const, mineSaker, velkomstOppsummering };
}

async function lastLederData(
  request: Request,
  innloggetBruker: Awaited<ReturnType<typeof hentInnloggetBruker>>,
) {
  const { saker, ansatte } = await hentLederOversiktData({ request, innloggetBruker });

  const enhetsOppsummering = beregnEnhetsOppsummering(saker);
  const ansatteOversikt = [...beregnAnsatteOversikt(saker, ansatte)].sort(
    (a, b) => b.totalAntall - a.totalAntall,
  );
  const enhetNavn = innloggetBruker.enhet;

  return {
    type: "leder" as const,
    velkomstOppsummering: lagLederVelkomstOppsummering(enhetsOppsummering, enhetNavn),
    enhetId: innloggetBruker.enhetId ?? "",
    enhetNavn,
    ansatteOversikt,
  };
}

export async function loader({ request }: LoaderFunctionArgs) {
  const innloggetBruker = await hentInnloggetBruker({ request });

  if (innloggetBruker.erLeder) {
    return lastLederData(request, innloggetBruker);
  }

  return lastSaksbehandlerData(request, innloggetBruker);
}
