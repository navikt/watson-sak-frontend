import type {
  Dokument,
  DokumentHistorikk,
  DokumentHistorikkSide,
  DokumentNode,
} from "~/saker/filer/typer";
import { dokumentNodeSchema } from "./types.backend";
import {
  dokumentResponseSchema,
  dokumentHistorikkResponseSchema,
  dokumentHistorikkSideSchema,
  apiUrl,
  authHeaders,
  håndterFeil,
  kastHvisIkkeFunnet,
  parseEllerKastFeil,
} from "~/saker/api-core.server";

export async function hentDokument(token: string, sakId: string, docId: string): Promise<Dokument> {
  const respons = await fetch(apiUrl(`/api/v1/kontrollsaker/${sakId}/dokumenter/${docId}`), {
    headers: authHeaders(token),
  });
  kastHvisIkkeFunnet(respons);
  if (!respons.ok) await håndterFeil(respons, "Kunne ikke hente dokument");
  return parseEllerKastFeil(dokumentResponseSchema, await respons.json(), "hentDokument");
}

export async function opprettDokument(token: string, sakId: string): Promise<DokumentNode> {
  const respons = await fetch(apiUrl(`/api/v1/kontrollsaker/${sakId}/dokumenter`), {
    method: "POST",
    headers: authHeaders(token),
  });
  if (!respons.ok) await håndterFeil(respons, "Kunne ikke opprette dokument");
  return parseEllerKastFeil(dokumentNodeSchema, await respons.json(), "opprettDokument");
}

export async function lagreDokument(
  token: string,
  sakId: string,
  docId: string,
  data: Pick<Dokument, "tittel" | "innhold"> & { opprettHistorikk?: boolean },
): Promise<Dokument> {
  const respons = await fetch(apiUrl(`/api/v1/kontrollsaker/${sakId}/dokumenter/${docId}`), {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
  kastHvisIkkeFunnet(respons);
  if (!respons.ok) await håndterFeil(respons, "Kunne ikke lagre dokument");
  return parseEllerKastFeil(dokumentResponseSchema, await respons.json(), "lagreDokument");
}

export async function hentDokumentHistorikk(
  token: string,
  sakId: string,
  docId: string,
): Promise<DokumentHistorikkSide> {
  const respons = await fetch(
    apiUrl(`/api/v1/kontrollsaker/${sakId}/dokumenter/${docId}/historikk`),
    {
      headers: authHeaders(token),
    },
  );
  kastHvisIkkeFunnet(respons);
  if (!respons.ok) await håndterFeil(respons, "Kunne ikke hente dokumenthistorikk");
  return parseEllerKastFeil(
    dokumentHistorikkSideSchema,
    await respons.json(),
    "hentDokumentHistorikk",
  );
}

export async function hentDokumentHistorikkpunkt(
  token: string,
  sakId: string,
  docId: string,
  historikkId: string,
): Promise<DokumentHistorikk> {
  const respons = await fetch(
    apiUrl(`/api/v1/kontrollsaker/${sakId}/dokumenter/${docId}/historikk/${historikkId}`),
    { headers: authHeaders(token) },
  );
  kastHvisIkkeFunnet(respons);
  if (!respons.ok) await håndterFeil(respons, "Kunne ikke hente historikkpunkt");
  return parseEllerKastFeil(
    dokumentHistorikkResponseSchema,
    await respons.json(),
    "hentDokumentHistorikkpunkt",
  );
}

export async function gjenopprettDokumentHistorikk(
  token: string,
  sakId: string,
  docId: string,
  historikkId: string,
): Promise<Dokument> {
  const respons = await fetch(
    apiUrl(
      `/api/v1/kontrollsaker/${sakId}/dokumenter/${docId}/historikk/${historikkId}/gjenopprett`,
    ),
    { method: "POST", headers: authHeaders(token) },
  );
  kastHvisIkkeFunnet(respons);
  if (!respons.ok) await håndterFeil(respons, "Kunne ikke gjenopprette historikkpunkt");
  return parseEllerKastFeil(
    dokumentResponseSchema,
    await respons.json(),
    "gjenopprettDokumentHistorikk",
  );
}

export async function slettDokument(token: string, sakId: string, docId: string): Promise<void> {
  const respons = await fetch(apiUrl(`/api/v1/kontrollsaker/${sakId}/dokumenter/${docId}`), {
    method: "DELETE",
    headers: authHeaders(token),
  });
  kastHvisIkkeFunnet(respons);
  if (!respons.ok) await håndterFeil(respons, "Kunne ikke slette dokument");
}
