import type { LoaderFunctionArgs } from "react-router";
import { getBackendOboToken } from "~/auth/access-token";
import { hentInnloggetBruker } from "~/auth/innlogget-bruker.server";
import { skalBrukeMockdata } from "~/config/env.server";
import { hentKontrollsaker } from "~/fordeling/api.server";
import { hentLederOversiktData } from "~/lederoversikt/loader.server";
import { lagLederVelkomstOppsummering } from "~/lederoversikt/velkomst";
import { hentMineSaker } from "~/saker/mock-alle-saker.server";
import { lagMockMineSakerOppsummering } from "~/saker/mock-oppsummering.server";
import { getOpprettetDato } from "~/saker/selectors";
import type { KontrollsakResponse } from "~/saker/types.backend";
import { hentMineSakerOppsummering, type MineSakerOppsummering } from "./api.server";
import { lagVelkomstOppsummering } from "./velkomst";

async function lastSaksbehandlerData(
  request: Request,
  innloggetBruker: { navIdent: string; name: string },
) {
  let mineSakerHosInnloggetBruker: KontrollsakResponse[];
  let oppsummering: MineSakerOppsummering;

  if (!skalBrukeMockdata) {
    const token = await getBackendOboToken(request);
    const [resultat, hentetOppsummering] = await Promise.all([
      hentKontrollsaker({
        token,
        page: 1,
        size: 200,
        ansvarligNavIdent: innloggetBruker.navIdent,
      }),
      hentMineSakerOppsummering(token),
    ]);
    mineSakerHosInnloggetBruker = resultat.items;
    oppsummering = hentetOppsummering;
  } else {
    mineSakerHosInnloggetBruker = hentMineSaker(
      request,
      innloggetBruker.navIdent,
      innloggetBruker.name,
    );
    oppsummering = lagMockMineSakerOppsummering(mineSakerHosInnloggetBruker);
  }

  const aktiveMineSaker = mineSakerHosInnloggetBruker.filter(
    (sak) => sak.steg !== "POLITI" && sak.steg !== "ANMELDT" && sak.steg !== "AVSLUTTET",
  );

  const mineSaker = [...aktiveMineSaker]
    .sort((a, b) => getOpprettetDato(b).localeCompare(getOpprettetDato(a)))
    .slice(0, 10);

  const velkomstOppsummering = lagVelkomstOppsummering(oppsummering);

  return { type: "saksbehandler" as const, mineSaker, velkomstOppsummering };
}

async function lastLederData(
  request: Request,
  innloggetBruker: Awaited<ReturnType<typeof hentInnloggetBruker>>,
) {
  const statistikk = await hentLederOversiktData({ request, innloggetBruker });

  return {
    type: "leder" as const,
    velkomstOppsummering: lagLederVelkomstOppsummering(statistikk.enhet, statistikk.enhetNavn),
    statistikk,
  };
}

export async function loader({ request }: LoaderFunctionArgs) {
  const innloggetBruker = await hentInnloggetBruker({ request });

  if (innloggetBruker.erLeder) {
    return lastLederData(request, innloggetBruker);
  }

  return lastSaksbehandlerData(request, innloggetBruker);
}
