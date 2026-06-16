import { data, redirect, type ActionFunctionArgs } from "react-router";
import { getBackendOboToken } from "~/auth/access-token";
import { hentInnloggetBruker } from "~/auth/innlogget-bruker.server";
import { skalBrukeMockdata } from "~/config/env.server";
import { RouteConfig } from "~/routeConfig";
import * as backendApi from "~/saker/api.server";
import { hentSakstilgangFraMock } from "~/saker/tilgang.server";
import { opprettDokument, slettDokument } from "../mock-data.server";

/**
 * Resource route for dokumenter på en sak.
 *
 * - POST oppretter et tomt dokument og redirecter saksbehandleren rett inn i editoren.
 * - DELETE sletter dokumentet med `docId` fra skjemadataene.
 *
 * Backend er ikke klar ennå, så funksjonen er foreløpig kun tilgjengelig med mockdata.
 */
export async function action({ request, params }: ActionFunctionArgs) {
  const sakReferanse = params.sakId;
  if (!sakReferanse) {
    throw data("Mangler sak", { status: 400 });
  }

  if (request.method !== "POST" && request.method !== "DELETE") {
    throw data("Metoden støttes ikke", { status: 405 });
  }

  if (!skalBrukeMockdata) {
    const token = await getBackendOboToken(request);

    if (request.method === "DELETE") {
      const formData = await request.formData();
      const docId = formData.get("docId");
      if (typeof docId !== "string" || !docId) {
        throw data("Mangler dokument-id", { status: 400 });
      }

      await backendApi.slettDokument(token, sakReferanse, docId);

      const redirectTo = formData.get("redirectTo");
      if (
        typeof redirectTo === "string" &&
        redirectTo.startsWith("/") &&
        !redirectTo.startsWith("//")
      ) {
        return redirect(redirectTo);
      }
      return { ok: true as const };
    }

    const opprettet = await backendApi.opprettDokument(token, sakReferanse);
    if (!opprettet.id) {
      throw data("Kunne ikke opprette dokument", { status: 502 });
    }
    return redirect(byggDokumentUrl(sakReferanse, opprettet.id));
  }

  const tilgang = await hentSakstilgangFraMock(request, sakReferanse);
  if (!tilgang) {
    throw data("Sak ikke funnet", { status: 404 });
  }
  if (!tilgang.kanRedigereDokumenter) {
    throw data("Ingen tilgang til å endre dokumenter", { status: 403 });
  }

  if (request.method === "DELETE") {
    const formData = await request.formData();
    const docId = formData.get("docId");
    if (typeof docId !== "string" || !docId) {
      throw data("Mangler dokument-id", { status: 400 });
    }
    const slettet = slettDokument(request, String(tilgang.sak.id), docId);
    if (!slettet) {
      throw data("Dokument ikke funnet", { status: 404 });
    }

    // Når man sletter dokumentet man ser på, redirecter vi til en trygg, intern URL.
    // Det hindrer at React Router revaliderer den nå-døde dokument-loaderen (som ville
    // gitt 404). Treet på saksvisningen sender ingen redirectTo og revalideres som vanlig.
    const redirectTo = formData.get("redirectTo");
    if (
      typeof redirectTo === "string" &&
      redirectTo.startsWith("/") &&
      !redirectTo.startsWith("//")
    ) {
      return redirect(redirectTo);
    }
    return { ok: true as const };
  }

  const innlogget = await hentInnloggetBruker({ request });
  const { id } = opprettDokument(request, String(tilgang.sak.id), innlogget.name);

  return redirect(byggDokumentUrl(sakReferanse, id));
}

function byggDokumentUrl(sakReferanse: string, docId: string): string {
  return RouteConfig.SAKER_DOKUMENT.replace(":sakId", sakReferanse).replace(":docId", docId);
}
