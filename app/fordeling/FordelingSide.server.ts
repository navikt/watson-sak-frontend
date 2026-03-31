import { data } from "react-router";
import { getBackendOboToken } from "~/auth/access-token";
import { skalBrukeMockdata } from "~/config/env.server";
import type { Route } from "./+types/FordelingSide.route";
import { hentKontrollsakerForFordeling, tildelKontrollsak } from "./api.server";
import { mapKontrollsakTilFordelingSak, erUfordeltKontrollsak } from "./mapper";
import { mockSaker } from "./mock-data.server";

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
    const sak = mockSaker.find((eksisterendeSak) => eksisterendeSak.id === sakId);

    if (!sak) {
      throw data("Sak ikke funnet", { status: 404 });
    }

    sak.status = "under utredning";
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
    : mockSaker
        .filter((sak) => sak.status === "tips mottatt" || sak.status === "tips avklart")
        .map((sak) => ({
          id: sak.id,
          opprettetDato: sak.datoInnmeldt,
          kategori: sak.kategori ?? null,
          ytelser: sak.ytelser,
        }));
}
