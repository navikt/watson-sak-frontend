import { data, type ActionFunctionArgs, type LoaderFunctionArgs } from "react-router";
import { getBackendOboToken } from "~/auth/access-token";
import { skalBrukeMockdata } from "~/config/env.server";
import * as backendApi from "~/saker/api.server";
import { hentSakstilgangFraMock } from "~/saker/tilgang.server";
import {
  slettFil as slettFilMock,
  hentFilInnhold as hentFilInnholdMock,
} from "./mock-data-filer.server";

/**
 * Resource route for én enkelt fil på en sak.
 *
 * - GET: streamer filinnhold direkte fra backend (ingen signert URL).
 * - DELETE: sletter filen (kun sakseier).
 */
export async function loader({ request, params }: LoaderFunctionArgs) {
  const { sakId, filId } = params;
  if (!sakId || !filId) {
    throw data("Mangler sak eller fil", { status: 400 });
  }

  if (!skalBrukeMockdata) {
    const token = await getBackendOboToken(request);
    return await backendApi.lastNedFil(token, sakId, filId);
  }

  return hentFilInnholdMock(request, sakId, filId);
}

export async function action({ request, params }: ActionFunctionArgs) {
  const { sakId, filId } = params;
  if (!sakId || !filId) {
    throw data("Mangler sak eller fil", { status: 400 });
  }

  if (request.method !== "DELETE") {
    throw data("Metoden støttes ikke", { status: 405 });
  }

  if (!skalBrukeMockdata) {
    const token = await getBackendOboToken(request);
    await backendApi.slettFil(token, sakId, filId);
    return { ok: true as const };
  }

  const tilgang = await hentSakstilgangFraMock(request, sakId);
  if (!tilgang) {
    throw data("Sak ikke funnet", { status: 404 });
  }

  slettFilMock(request, String(tilgang.sak.id), filId);
  return { ok: true as const };
}
