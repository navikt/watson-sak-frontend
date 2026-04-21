import { data } from "react-router";
import { getBackendOboToken } from "~/auth/access-token";
import { skalBrukeMockdata } from "~/config/env.server";
import type { Route } from "./+types/FordelingSide.route";
import { hentKontrollsakerForFordeling, tildelKontrollsak } from "./api.server";
import { mapKontrollsakTilFordelingSak, erUfordeltKontrollsak } from "./mapper";
import { mockKontrollsaker } from "./mock-data.server";

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const handling = formData.get("handling");

  if (handling !== "tildel") {
    throw data("Ukjent handling", { status: 400 });
  }

  const sakId = formData.get("sakId");
  const saksbehandler = formData.get("saksbehandler");

  if (
    typeof sakId !== "string" ||
    sakId.trim().length === 0 ||
    typeof saksbehandler !== "string" ||
    saksbehandler.trim().length === 0
  ) {
    throw data("Mangler sak eller saksbehandler for tildeling.", { status: 400 });
  }

  if (skalBrukeMockdata) {
    const kontrollsak = mockKontrollsaker.find((eksisterendeSak) => eksisterendeSak.id === sakId);

    if (!kontrollsak) {
      throw data("Sak ikke funnet", { status: 404 });
    }

    kontrollsak.status = "TILDELT";
    kontrollsak.saksbehandlere.eier = {
      navIdent: saksbehandler,
      navn: saksbehandler,
      enhet: kontrollsak.saksbehandlere.opprettetAv.enhet,
    };
    return { ok: true };
  }

  const token = await getBackendOboToken(request);
  await tildelKontrollsak({ token, sakId, saksbehandler });

  return { ok: true };
}

export async function loader({ request }: Route.LoaderArgs) {
  const kontrollsaker = await hentKontrollsakerForFordeling(request);

  return kontrollsaker
    ? kontrollsaker.items.filter(erUfordeltKontrollsak).map(mapKontrollsakTilFordelingSak)
    : mockKontrollsaker.filter(erUfordeltKontrollsak).map(mapKontrollsakTilFordelingSak);
}
