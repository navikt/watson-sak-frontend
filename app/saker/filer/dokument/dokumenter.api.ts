import { data, redirect, type ActionFunctionArgs } from "react-router";
import { getBackendOboToken } from "~/auth/access-token";
import { hentInnloggetBruker } from "~/auth/innlogget-bruker.server";
import { skalBrukeMockdata } from "~/config/env.server";
import { RouteConfig } from "~/routeConfig";
import * as backendApi from "~/saker/api.server";
import { hentSakstilgangFraMock } from "~/saker/tilgang.server";
import { lagreDokument, opprettDokument, slettDokument } from "../mock-data.server";
import { byggMalInnhold, MAL_NAVN, type MalId } from "./maler";

function lesValgtMal(formData: FormData): { malId: MalId; erStraffesak: boolean } | null {
  const malId = formData.get("malId");
  if (typeof malId !== "string" || !(malId in MAL_NAVN)) {
    return null;
  }
  return { malId: malId as MalId, erStraffesak: formData.get("erStraffesak") === "true" };
}

/** Leser skjemadata trygt selv om forespørselen ikke har noen body (f.eks. et enkelt POST-kall uten felter). */
async function lesFormData(request: Request): Promise<FormData> {
  const contentType = request.headers.get("content-type") ?? "";
  if (
    !contentType.includes("multipart/form-data") &&
    !contentType.includes("application/x-www-form-urlencoded")
  ) {
    return new FormData();
  }
  return request.formData();
}

/**
 * Resource route for dokumenter på en sak.
 *
 * - POST oppretter et dokument og redirecter saksbehandleren rett inn i editoren.
 *   Skjemafeltet «malId» (valgfritt, se `MalId`) fyller dokumentet med en rapportmal;
 *   «erStraffesak» («true»/«false») styrer hvilken variant av malen som brukes.
 *   Uten «malId» opprettes et tomt dokument, som før.
 * - DELETE sletter dokumentet med `docId` fra skjemadataene.
 *
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

    const formData = await lesFormData(request);
    const valgtMal = lesValgtMal(formData);

    const opprettet = await backendApi.opprettDokument(token, sakReferanse);
    if (!opprettet.id) {
      throw data("Kunne ikke opprette dokument", { status: 502 });
    }
    if (valgtMal) {
      await backendApi.lagreDokument(token, sakReferanse, opprettet.id, {
        tittel: MAL_NAVN[valgtMal.malId],
        innhold: byggMalInnhold(valgtMal),
      });
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

  const formData = await lesFormData(request);
  const valgtMal = lesValgtMal(formData);

  const innlogget = await hentInnloggetBruker({ request });
  const { id } = opprettDokument(request, String(tilgang.sak.id), innlogget.name);
  if (valgtMal) {
    lagreDokument(request, String(tilgang.sak.id), id, {
      tittel: MAL_NAVN[valgtMal.malId],
      innhold: byggMalInnhold(valgtMal),
      endretAv: innlogget.name,
    });
  }

  return redirect(byggDokumentUrl(sakReferanse, id));
}

function byggDokumentUrl(sakReferanse: string, docId: string): string {
  return RouteConfig.SAKER_DOKUMENT.replace(":sakId", sakReferanse).replace(":docId", docId);
}
