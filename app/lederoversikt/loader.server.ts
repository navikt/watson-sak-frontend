import { getBackendOboToken } from "~/auth/access-token";
import type { InnloggetBruker } from "~/auth/innlogget-bruker.server";
import { skalBrukeMockdata } from "~/config/env.server";
import { hentKontrollsaker } from "~/fordeling/api.server";
import * as backendApi from "~/saker/api.server";
import { hentAlleSaker } from "~/saker/mock-alle-saker.server";
import { mockSaksbehandlerDetaljer } from "~/saker/mock-saksbehandlere.server";
import { getSaksenhet } from "~/saker/selectors";
import type { KontrollsakResponse } from "~/saker/types.backend";

/** Nok saker til å dekke selv store enheter i én side. */
const STOR_SIDESTØRRELSE = 500;

interface Ansatt {
  navIdent: string;
  navn: string;
}

export interface LederOversiktData {
  saker: KontrollsakResponse[];
  ansatte: Ansatt[];
}

type HentLederOversiktDataArgs = {
  request: Request;
  innloggetBruker: InnloggetBruker;
};

/**
 * Henter enhetens kontrollsaker og ansatte for lederoversikten.
 *
 * Feltet "enhet" har ulik betydning i mock- og produksjonsdata: mockdataen
 * bruker samme enhetskode som kontrollsakenes "enhet"-felt, mens NOM
 * (produksjon) returnerer et enhetsnavn for saksbehandlere. Vi matcher
 * derfor saksbehandlere mot enhetskoden i mock-modus, og mot enhetsnavnet
 * i produksjon, slik at begge kildene faktisk stemmer overens med
 * innlogget leders egen enhet.
 */
export async function hentLederOversiktData({
  request,
  innloggetBruker,
}: HentLederOversiktDataArgs): Promise<LederOversiktData> {
  const { enhetId, enhet } = innloggetBruker;

  if (!enhetId) {
    return { saker: [], ansatte: [] };
  }

  if (skalBrukeMockdata) {
    const saker = hentAlleSaker(request).filter((sak) => getSaksenhet(sak) === enhetId);
    const ansatte = mockSaksbehandlerDetaljer
      .filter((saksbehandler) => saksbehandler.enhet === enhetId)
      .map((saksbehandler) => ({ navIdent: saksbehandler.navIdent, navn: saksbehandler.navn }));

    return { saker, ansatte };
  }

  const token = await getBackendOboToken(request);
  const [førsteSide, saksbehandlere] = await Promise.all([
    hentKontrollsaker({ token, page: 1, size: STOR_SIDESTØRRELSE, enhet: [enhetId] }),
    backendApi.hentSaksbehandlere(token),
  ]);

  // De aller fleste enheter har færre saker enn STOR_SIDESTØRRELSE, men for å
  // ikke gi leder et ufullstendig bilde henter vi resten av sidene også når
  // enheten har mer enn én side med kontrollsaker.
  const øvrigeSider = await Promise.all(
    Array.from({ length: førsteSide.totalPages - 1 }, (_, i) =>
      hentKontrollsaker({ token, page: i + 2, size: STOR_SIDESTØRRELSE, enhet: [enhetId] }),
    ),
  );
  const kontrollsaker = [førsteSide, ...øvrigeSider].flatMap((side) => side.items);

  const ansatte = saksbehandlere
    .filter((saksbehandler) => saksbehandler.enhet === enhet)
    .map((saksbehandler) => ({ navIdent: saksbehandler.navIdent, navn: saksbehandler.navn }));

  return { saker: kontrollsaker, ansatte };
}
