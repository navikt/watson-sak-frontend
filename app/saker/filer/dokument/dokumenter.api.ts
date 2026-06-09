import { data, redirect, type ActionFunctionArgs } from "react-router";
import { hentInnloggetBruker } from "~/auth/innlogget-bruker.server";
import { skalBrukeMockdata } from "~/config/env.server";
import { RouteConfig } from "~/routeConfig";
import { hentSakstilgangFraMock } from "~/saker/tilgang.server";
import { opprettDokument } from "../mock-data.server";

/**
 * Resource route for dokumenter på en sak.
 *
 * POST oppretter et tomt dokument og redirecter saksbehandleren rett inn i editoren.
 * Backend er ikke klar ennå, så funksjonen er foreløpig kun tilgjengelig med mockdata.
 */
export async function action({ request, params }: ActionFunctionArgs) {
  const sakReferanse = params.sakId;
  if (!sakReferanse) {
    throw data("Mangler sak", { status: 400 });
  }

  if (!skalBrukeMockdata) {
    throw data("Dokumenter er ikke tilgjengelig ennå", { status: 501 });
  }

  const tilgang = await hentSakstilgangFraMock(request, sakReferanse);
  if (!tilgang) {
    throw data("Sak ikke funnet", { status: 404 });
  }
  if (!tilgang.kanRedigereDokumenter) {
    throw data("Ingen tilgang til å opprette dokument", { status: 403 });
  }

  const innlogget = await hentInnloggetBruker({ request });
  const { id } = opprettDokument(request, String(tilgang.sak.id), innlogget.name);

  return redirect(RouteConfig.SAKER_DOKUMENT.replace(":sakId", sakReferanse).replace(":docId", id));
}
