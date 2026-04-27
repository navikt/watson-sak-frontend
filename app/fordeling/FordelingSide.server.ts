import { data } from "react-router";
import { oppdaterTilgjengeligeHandlinger } from "~/saker/mock-uuid";
import { getBackendOboToken } from "~/auth/access-token";
import { skalBrukeMockdata } from "~/config/env.server";
import { mockSaksbehandlerDetaljer } from "~/saker/mock-saksbehandlere.server";
import type { Route } from "./+types/FordelingSide.route";
import { hentKontrollsakerForFordeling, tildelKontrollsak } from "./api.server";
import { mapKontrollsakTilFordelingSak, erEierlosKontrollsak } from "./mapper";
import { mockKontrollsaker } from "./mock-data.server";

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const handling = formData.get("handling");

  if (handling !== "tildel") {
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
    const kontrollsak = mockKontrollsaker.find((eksisterendeSak) => eksisterendeSak.id === sakId);

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
  const kontrollsaker = await hentKontrollsakerForFordeling(request);

  return kontrollsaker
    ? kontrollsaker.items.filter(erEierlosKontrollsak).map(mapKontrollsakTilFordelingSak)
    : mockKontrollsaker.filter(erEierlosKontrollsak).map(mapKontrollsakTilFordelingSak);
}
