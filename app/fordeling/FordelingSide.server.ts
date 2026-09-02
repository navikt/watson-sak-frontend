import { data } from "react-router";
import { oppdaterTilgjengeligeHandlinger } from "~/saker/mock-uuid";
import { getBackendOboToken } from "~/auth/access-token";
import { hentInnloggetBruker } from "~/auth/innlogget-bruker.server";
import { skalBrukeMockdata } from "~/config/env.server";
import { mockSaksbehandlerDetaljer } from "~/saker/mock-saksbehandlere.server";
import { hentFordelingssaker } from "~/saker/mock-alle-saker.server";
import type { Route } from "./+types/FordelingSide.route";
import { hentKontrollsakerForFordeling, tildelKontrollsak } from "./api.server";
import { mapKontrollsakTilFordelingSak, erEierlosKontrollsak } from "./mapper";

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
}

export async function loader({ request }: Route.LoaderArgs) {
  if (skalBrukeMockdata) {
    return hentFordelingssaker(request)
      .filter(erEierlosKontrollsak)
      .map(mapKontrollsakTilFordelingSak);
  }

  const innloggetBruker = await hentInnloggetBruker({ request });
  if (!innloggetBruker.enhetId) {
    throw new Error("Fant ikke konfigurert enhet for innlogget bruker.");
  }
  const kontrollsaker = await hentKontrollsakerForFordeling(request, innloggetBruker.enhetId);
  if (!kontrollsaker) {
    throw new Error("Forventet kontrollsaker i backend-modus for fordeling.");
  }

  // Backend returnerer kun saker uten ansvarlig i saksbehandlerens enhet
  // (utenAnsvarlig=true og enhet=<innlogget enhet> er sendt).
  return kontrollsaker.items.map(mapKontrollsakTilFordelingSak);
}
