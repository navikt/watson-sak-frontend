import { data, redirect } from "react-router";
import { oppdaterTilgjengeligeHandlinger } from "~/saker/mock-uuid";
import { getBackendOboToken } from "~/auth/access-token";
import { hentInnloggetBruker } from "~/auth/innlogget-bruker.server";
import { skalBrukeMockdata } from "~/config/env.server";
import { mockSaksbehandlerDetaljer } from "~/saker/mock-saksbehandlere.server";
import { hentFordelingssaker } from "~/saker/mock-alle-saker.server";
import { tekniskFeilSvar } from "~/feilhåndtering/teknisk-feil.server";
import type { Route } from "./+types/FordelingSide.route";
import { hentKontrollsakerForFordeling, tildelKontrollsak } from "./api.server";
import { mapKontrollsakTilFordelingSak } from "./mapper";
import { hentMockFordelingsside } from "./mock.server";

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const handling = formData.get("handling");

  if (handling !== "tildel" && handling !== "TILDEL") {
    throw data("Ukjent handling", { status: 400 });
  }

  const sakId = formData.get("sakId");
  const navIdent = formData.get("navIdent");

  if (
    typeof sakId !== "string" ||
    sakId.trim().length === 0 ||
    typeof navIdent !== "string" ||
    navIdent.trim().length === 0
  ) {
    throw data("Mangler sak eller navIdent for tildeling.", { status: 400 });
  }

  try {
    if (skalBrukeMockdata) {
      const kontrollsak = hentFordelingssaker(request).find(
        (eksisterendeSak) => eksisterendeSak.id === Number(sakId),
      );

      if (!kontrollsak) {
        throw data("Sak ikke funnet", { status: 404 });
      }

      const valgtSaksbehandler = mockSaksbehandlerDetaljer.find(
        (saksbehandler) => saksbehandler.navIdent === navIdent,
      );

      if (!valgtSaksbehandler) {
        throw data("Saksbehandler ikke funnet", { status: 404 });
      }

      kontrollsak.saksbehandlere.eier = {
        navIdent: valgtSaksbehandler.navIdent,
        navn: valgtSaksbehandler.navn,
        enhet: valgtSaksbehandler.enhet,
      };
      oppdaterTilgjengeligeHandlinger(kontrollsak);
      return { ok: true };
    }

    const token = await getBackendOboToken(request);
    await tildelKontrollsak({ token, sakId, saksbehandler: navIdent });

    return { ok: true };
  } catch (feil) {
    return tekniskFeilSvar(feil, { kontekst: "fordele sak", request });
  }
}

export async function loader({ request }: Route.LoaderArgs) {
  const kontrollsaker = skalBrukeMockdata
    ? hentMockFordelingsside(request, await hentInnloggetBruker({ request }))
    : await hentKontrollsakerForFordeling(request);
  if (!kontrollsaker) {
    throw new Error("Forventet kontrollsaker i backend-modus for fordeling.");
  }

  const sisteSide = Math.max(1, kontrollsaker.totalPages);
  if (kontrollsaker.page > sisteSide) {
    const url = new URL(request.url);
    url.searchParams.set("side", String(sisteSide));
    throw redirect(`${url.pathname}${url.search}`);
  }
  return {
    saker: kontrollsaker.items.map(mapKontrollsakTilFordelingSak),
    enhet: kontrollsaker.enhetNavn,
    valgtOmfang: kontrollsaker.valgtOmfang,
    organisasjonsvalg: kontrollsaker.organisasjonsvalg,
    oppsummering: kontrollsaker.oppsummering,
    paginering: {
      side: kontrollsaker.page,
      totalSider: kontrollsaker.totalPages,
      totalAntall: kontrollsaker.totalItems,
    },
  };
}
