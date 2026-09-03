import type { LoaderFunctionArgs } from "react-router";
import { getBackendOboToken } from "~/auth/access-token";
import { hentInnloggetBruker } from "~/auth/innlogget-bruker.server";
import { skalBrukeMockdata } from "~/config/env.server";
import { hentKontrollsaker } from "~/fordeling/api.server";
import { hentMineSaker } from "~/saker/mock-alle-saker.server";
import { getOpprettetDato } from "~/saker/selectors";
import type { KontrollsakResponse } from "~/saker/types.backend";
import { lagVelkomstOppsummering } from "./velkomst";

export async function loader({ request }: LoaderFunctionArgs) {
  const innloggetBruker = await hentInnloggetBruker({ request });

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

  return { mineSaker, velkomstOppsummering };
}
