import { data } from "react-router";
import { hentInnloggetBruker } from "~/auth/innlogget-bruker.server";
import { skalBrukeMockdata } from "~/config/env.server";
import type { DokumentInnhold } from "~/saker/filer/typer";
import { hentSakstilgangFraMock } from "~/saker/tilgang.server";
import { hentDokument, hentDokumenttreForSak, lagreDokument } from "../mock-data.server";
import type { Route } from "./+types/DokumentSide.route";

const dokumenterIkkeTilgjengelig = "Dokumenter er ikke tilgjengelig ennå";

export async function loader({ request, params }: Route.LoaderArgs) {
  if (!skalBrukeMockdata) {
    throw data(dokumenterIkkeTilgjengelig, { status: 501 });
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
    throw data(dokumenterIkkeTilgjengelig, { status: 501 });
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
