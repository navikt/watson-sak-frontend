import { data } from "react-router";
import { getBackendOboToken } from "~/auth/access-token";
import { hentInnloggetBruker } from "~/auth/innlogget-bruker.server";
import { skalBrukeMockdata } from "~/config/env.server";
import * as backendApi from "~/saker/api.server";
import type { DokumentInnhold } from "~/saker/filer/typer";
import { hentSakstilgangFraMock } from "~/saker/tilgang.server";
import { hentDokument, hentDokumenttreForSak, lagreDokument } from "../mock-data.server";
import { erAktivSakKontrollsak } from "../../handlinger/tilgjengeligeHandlinger";
import type { Route } from "./+types/DokumentSide.route";

export async function loader({ request, params }: Route.LoaderArgs) {
  if (!skalBrukeMockdata) {
    const sakReferanse = params.sakId;
    const docId = params.docId;
    if (!sakReferanse || !docId) {
      throw data("Mangler sak eller dokument", { status: 400 });
    }

    const token = await getBackendOboToken(request);
    const [sak, dokument, innlogget] = await Promise.all([
      backendApi.hentKontrollsak(token, sakReferanse),
      backendApi.hentDokument(token, sakReferanse, docId),
      hentInnloggetBruker({ request }),
    ]);

    const kanSe =
      sak.saksbehandlere.eier?.navIdent === innlogget.navIdent ||
      sak.saksbehandlere.deltMed.some(
        (saksbehandler) => saksbehandler.navIdent === innlogget.navIdent,
      );

    if (!kanSe) {
      throw data("Ingen tilgang til denne saken", { status: 403 });
    }

    return {
      dokument,
      dokumenter: sak.dokumenter ?? [],
      sakReferanse,
      kanRedigere: kanSe && erAktivSakKontrollsak(sak.status),
    };
  }

  const tilgang = await hentSakstilgangFraMock(request, params.sakId);
  if (!tilgang) {
    throw data("Sak ikke funnet", { status: 404 });
  }
  if (!tilgang.kanSe) {
    throw data("Ingen tilgang til denne saken", { status: 403 });
  }

  const dokument = hentDokument(request, String(tilgang.sak.id), params.docId);
  if (!dokument) {
    throw data("Dokument ikke funnet", { status: 404 });
  }

  return {
    dokument,
    dokumenter: hentDokumenttreForSak(request, String(tilgang.sak.id)),
    sakReferanse: params.sakId,
    kanRedigere: tilgang.kanRedigereDokumenter,
  };
}

function normaliserTittel(verdi: unknown): string {
  if (typeof verdi !== "string") {
    return "Uten tittel";
  }
  const trimmet = verdi.trim();
  return trimmet.length > 0 ? trimmet : "Uten tittel";
}

function erGyldigInnhold(verdi: unknown): verdi is DokumentInnhold {
  // Tiptap forventer et dokument med «doc» som rot-node.
  return (
    typeof verdi === "object" && verdi !== null && (verdi as { type?: unknown }).type === "doc"
  );
}

export async function action({ request, params }: Route.ActionArgs) {
  if (!skalBrukeMockdata) {
    if (request.method !== "PUT") {
      throw data("Metoden støttes ikke", { status: 405 });
    }

    const sakReferanse = params.sakId;
    const docId = params.docId;
    if (!sakReferanse || !docId) {
      throw data("Mangler sak eller dokument", { status: 400 });
    }

    const token = await getBackendOboToken(request);
    let kropp: { tittel?: unknown; innhold?: unknown };
    try {
      kropp = (await request.json()) as { tittel?: unknown; innhold?: unknown };
    } catch {
      throw data("Ugyldig JSON i forespørselen", { status: 400 });
    }
    if (!erGyldigInnhold(kropp.innhold)) {
      throw data("Ugyldig dokumentinnhold", { status: 400 });
    }

    const oppdatert = await backendApi.lagreDokument(token, sakReferanse, docId, {
      tittel: normaliserTittel(kropp.tittel),
      innhold: kropp.innhold,
    });

    return { ok: true as const, tittel: oppdatert.tittel, endretDato: oppdatert.endretDato };
  }
  if (request.method !== "PUT") {
    throw data("Metoden støttes ikke", { status: 405 });
  }

  const tilgang = await hentSakstilgangFraMock(request, params.sakId);
  if (!tilgang) {
    throw data("Sak ikke funnet", { status: 404 });
  }
  if (!tilgang.kanRedigereDokumenter) {
    throw data("Ingen tilgang til å redigere dokumentet", { status: 403 });
  }

  let kropp: { tittel?: unknown; innhold?: unknown };
  try {
    kropp = (await request.json()) as { tittel?: unknown; innhold?: unknown };
  } catch {
    throw data("Ugyldig JSON i forespørselen", { status: 400 });
  }
  if (!erGyldigInnhold(kropp.innhold)) {
    throw data("Ugyldig dokumentinnhold", { status: 400 });
  }

  const innlogget = await hentInnloggetBruker({ request });
  const oppdatert = lagreDokument(request, String(tilgang.sak.id), params.docId, {
    tittel: normaliserTittel(kropp.tittel),
    innhold: kropp.innhold,
    endretAv: innlogget.name,
  });

  if (!oppdatert) {
    throw data("Dokument ikke funnet", { status: 404 });
  }

  return { ok: true as const, tittel: oppdatert.tittel, endretDato: oppdatert.endretDato };
}
