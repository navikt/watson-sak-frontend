import { data, type ActionFunctionArgs, type LoaderFunctionArgs } from "react-router";
import { getBackendOboToken } from "~/auth/access-token";
import { hentInnloggetBruker } from "~/auth/innlogget-bruker.server";
import { skalBrukeMockdata } from "~/config/env.server";
import * as backendApi from "~/saker/api.server";
import { erSakseier } from "~/saker/handlinger/tilgjengeligeHandlinger";
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
    // Sakseier-sjekk håndheves av backend — den returnerer 403 om brukeren ikke er eier.
    try {
      await backendApi.slettFil(token, sakId, filId);
    } catch (feil) {
      if (feil instanceof backendApi.FilIBrukFeilException) {
        // Filen er satt inn som bilde i minst ett dokument — returner (ikke kast)
        // slik at fetcher.data kan vise en forklarende dialog i stedet for en 500-side.
        return data(
          { ok: false as const, dokumenter: feil.dokumenter, melding: feil.message },
          { status: 409 },
        );
      }
      throw feil;
    }
    return { ok: true as const };
  }

  const tilgang = await hentSakstilgangFraMock(request, sakId);
  if (!tilgang) {
    throw data("Sak ikke funnet", { status: 404 });
  }

  const innlogget = await hentInnloggetBruker({ request });
  if (!erSakseier(tilgang.sak, innlogget.navIdent)) {
    throw data("Kun sakseier kan slette vedlegg", { status: 403 });
  }

  const slettet = slettFilMock(request, String(tilgang.sak.id), filId);
  if (!slettet) {
    throw data("Fil ikke funnet", { status: 404 });
  }

  return { ok: true as const };
}
