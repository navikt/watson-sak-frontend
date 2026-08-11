import { data, type ActionFunctionArgs } from "react-router";
import { getBackendOboToken } from "~/auth/access-token";
import { hentInnloggetBruker } from "~/auth/innlogget-bruker.server";
import { skalBrukeMockdata } from "~/config/env.server";
import * as backendApi from "~/saker/api.server";
import { hentSakstilgangFraMock } from "~/saker/tilgang.server";
import { gjenopprettDokumentHistorikk, hentDokumentHistorikkpunkt } from "../mock-data.server";

export async function action({ request, params }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    throw data("Metoden støttes ikke", { status: 405 });
  }
  const sakReferanse = params.sakId;
  const docId = params.docId;
  if (!sakReferanse || !docId) {
    throw data("Mangler sak eller dokument", { status: 400 });
  }

  let kropp: { handling?: unknown; historikkId?: unknown };
  try {
    kropp = (await request.json()) as { handling?: unknown; historikkId?: unknown };
  } catch {
    throw data("Ugyldig JSON i forespørselen", { status: 400 });
  }
  if (
    (kropp.handling !== "hent_historikkpunkt" && kropp.handling !== "gjenopprett_historikkpunkt") ||
    typeof kropp.historikkId !== "string"
  ) {
    throw data("Ugyldig historikkhandling", { status: 400 });
  }

  if (!skalBrukeMockdata) {
    const token = await getBackendOboToken(request);
    if (kropp.handling === "hent_historikkpunkt") {
      const historikkpunkt = await backendApi.hentDokumentHistorikkpunkt(
        token,
        sakReferanse,
        docId,
        kropp.historikkId,
      );
      return Response.json({ historikkpunkt });
    }
    const dokument = await backendApi.gjenopprettDokumentHistorikk(
      token,
      sakReferanse,
      docId,
      kropp.historikkId,
    );
    return Response.json({ dokument });
  }

  const tilgang = await hentSakstilgangFraMock(request, sakReferanse);
  if (!tilgang) throw data("Sak ikke funnet", { status: 404 });
  if (!tilgang.kanSe) throw data("Ingen tilgang til denne saken", { status: 403 });
  if (kropp.handling === "hent_historikkpunkt") {
    const historikkpunkt = hentDokumentHistorikkpunkt(
      request,
      String(tilgang.sak.id),
      docId,
      kropp.historikkId,
    );
    if (!historikkpunkt) throw data("Historikkpunkt ikke funnet", { status: 404 });
    return Response.json({ historikkpunkt });
  }
  if (!tilgang.kanRedigereDokumenter) {
    throw data("Ingen tilgang til å gjenopprette dokumentet", { status: 403 });
  }
  const innlogget = await hentInnloggetBruker({ request });
  const dokument = gjenopprettDokumentHistorikk(
    request,
    String(tilgang.sak.id),
    docId,
    kropp.historikkId,
    innlogget.name,
  );
  if (!dokument) throw data("Historikkpunkt ikke funnet", { status: 404 });
  return Response.json({ dokument });
}
