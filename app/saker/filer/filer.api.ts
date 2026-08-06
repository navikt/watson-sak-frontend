import { data, type ActionFunctionArgs } from "react-router";
import { getBackendOboToken } from "~/auth/access-token";
import { hentInnloggetBruker } from "~/auth/innlogget-bruker.server";
import { skalBrukeMockdata } from "~/config/env.server";
import * as backendApi from "~/saker/api.server";
import { hentSakstilgangFraMock } from "~/saker/tilgang.server";
import { leggTilFil } from "./mock-data-filer.server";

/**
 * Resource route for vedlegg (filer) på en sak.
 *
 * - POST: laster opp en fil til backend (GCS) og returnerer FilResponse.
 */
export async function action({ request, params }: ActionFunctionArgs) {
  const sakReferanse = params.sakId;
  if (!sakReferanse) {
    throw data("Mangler sak", { status: 400 });
  }

  if (request.method !== "POST") {
    throw data("Metoden støttes ikke", { status: 405 });
  }

  const formData = await request.formData();
  const fil = formData.get("fil");
  if (!(fil instanceof File) || fil.size === 0) {
    throw data("Mangler fil", { status: 400 });
  }

  if (!skalBrukeMockdata) {
    const token = await getBackendOboToken(request);
    return await backendApi.lasteOppFil(token, sakReferanse, fil);
  }

  const tilgang = await hentSakstilgangFraMock(request, sakReferanse);
  if (!tilgang) {
    throw data("Sak ikke funnet", { status: 404 });
  }
  if (!tilgang.kanRedigereDokumenter) {
    throw data("Ingen tilgang til å laste opp filer", { status: 403 });
  }

  const innlogget = await hentInnloggetBruker({ request });
  return leggTilFil(request, String(tilgang.sak.id), fil, innlogget.name);
}
