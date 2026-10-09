import { z } from "zod";
import type { FilResponse, MappeResponse } from "~/saker/filer/typer";
import {
  apiUrl,
  authHeaders,
  håndterFeil,
  dokumentReferanseSchema,
  FilIBrukFeilException,
  hentProblemDetailMedDokumenter,
  parseEllerKastFeil,
} from "~/saker/api-core.server";

// --- Filer (vedlegg) ---

const filResponseSchema = z.object({
  id: z.string(),
  filnavn: z.string(),
  storrelse: z.number(),
  contentType: z.string(),
  opprettetAv: z.string(),
  opprettet: z.string(),
  bruktIDokumenter: z.array(dokumentReferanseSchema).default([]),
  arkivert: z.string().nullish(),
  arkivertAv: z.string().nullish(),
  arkivertJournalpostId: z.string().nullish(),
  arkivertFraDokumentId: z.string().nullish(),
  mappe: z.string().nullish(),
});

export async function hentFiler(token: string, sakId: string): Promise<FilResponse[]> {
  const respons = await fetch(apiUrl(`/api/v1/kontrollsaker/${sakId}/filer`), {
    headers: authHeaders(token),
  });
  // 403 er en forventet tilstand her — saksbehandleren mangler fil-tilgang på
  // saken, se hentFilerMedTilgangskontroll i SakDetaljSide.loader.server.ts.
  if (!respons.ok)
    await håndterFeil(respons, "Kunne ikke hente filer", { forventedeStatuser: [403] });
  return parseEllerKastFeil(z.array(filResponseSchema), await respons.json(), "hentFiler");
}

export async function lastOppFil(token: string, sakId: string, fil: File): Promise<FilResponse> {
  const formData = new FormData();
  formData.append("fil", fil);
  const respons = await fetch(apiUrl(`/api/v1/kontrollsaker/${sakId}/filer`), {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    body: formData,
  });
  if (!respons.ok) await håndterFeil(respons, "Kunne ikke laste opp fil");
  return parseEllerKastFeil(filResponseSchema, await respons.json(), "lastOppFil");
}

export async function slettFil(token: string, sakId: string, filId: string): Promise<void> {
  const respons = await fetch(apiUrl(`/api/v1/kontrollsaker/${sakId}/filer/${filId}`), {
    method: "DELETE",
    headers: authHeaders(token),
  });
  if (respons.ok) return;
  if (respons.status === 409) {
    const { detalj, dokumenter } = await hentProblemDetailMedDokumenter(respons);
    throw new FilIBrukFeilException(detalj ?? "Filen er i bruk i et dokument", dokumenter);
  }
  await håndterFeil(respons, "Kunne ikke slette fil");
}

export async function omdøpFil(
  token: string,
  sakId: string,
  filId: string,
  navn: string,
): Promise<FilResponse> {
  const respons = await fetch(apiUrl(`/api/v1/kontrollsaker/${sakId}/filer/${filId}`), {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify({ navn }),
  });
  if (!respons.ok) {
    await håndterFeil(respons, "Kunne ikke endre filnavn", { forventedeStatuser: [400, 409] });
  }
  return parseEllerKastFeil(filResponseSchema, await respons.json(), "omdøpFil");
}

// --- Mapper ---

const mappeResponseSchema = z.object({
  sti: z.string(),
  opprettetAv: z.string(),
  opprettet: z.string(),
});

const FORVENTEDE_MAPPEFEIL = [400, 404, 409];

export async function hentMapper(token: string, sakId: string): Promise<MappeResponse[]> {
  const respons = await fetch(apiUrl(`/api/v1/kontrollsaker/${sakId}/mapper`), {
    headers: authHeaders(token),
  });
  if (!respons.ok)
    await håndterFeil(respons, "Kunne ikke hente mapper", { forventedeStatuser: [403] });
  return parseEllerKastFeil(z.array(mappeResponseSchema), await respons.json(), "hentMapper");
}

export async function opprettMappe(token: string, sakId: string, sti: string): Promise<void> {
  const respons = await fetch(apiUrl(`/api/v1/kontrollsaker/${sakId}/mapper`), {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ sti }),
  });
  if (!respons.ok) {
    await håndterFeil(respons, "Kunne ikke opprette mappe", {
      forventedeStatuser: FORVENTEDE_MAPPEFEIL,
    });
  }
}

/** Gir en mappe nytt navn eller flytter den. Undermapper og innhold følger med. */
export async function endreMappe(
  token: string,
  sakId: string,
  fraSti: string,
  tilSti: string,
): Promise<void> {
  const respons = await fetch(apiUrl(`/api/v1/kontrollsaker/${sakId}/mapper`), {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify({ fraSti, tilSti }),
  });
  if (!respons.ok) {
    await håndterFeil(respons, "Kunne ikke endre mappe", {
      forventedeStatuser: FORVENTEDE_MAPPEFEIL,
    });
  }
}

export async function slettMappe(token: string, sakId: string, sti: string): Promise<void> {
  const url = apiUrl(
    `/api/v1/kontrollsaker/${sakId}/mapper?${new URLSearchParams({ sti }).toString()}`,
  );
  const respons = await fetch(url, { method: "DELETE", headers: authHeaders(token) });
  if (!respons.ok) {
    await håndterFeil(respons, "Kunne ikke slette mappe", {
      forventedeStatuser: FORVENTEDE_MAPPEFEIL,
    });
  }
}

export async function flyttDokumentTilMappe(
  token: string,
  sakId: string,
  docId: string,
  mappe: string | null,
): Promise<void> {
  const respons = await fetch(apiUrl(`/api/v1/kontrollsaker/${sakId}/dokumenter/${docId}/mappe`), {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify({ mappe }),
  });
  if (!respons.ok) {
    await håndterFeil(respons, "Kunne ikke flytte dokument", {
      forventedeStatuser: FORVENTEDE_MAPPEFEIL,
    });
  }
}

export async function flyttFilTilMappe(
  token: string,
  sakId: string,
  filId: string,
  mappe: string | null,
): Promise<void> {
  const respons = await fetch(apiUrl(`/api/v1/kontrollsaker/${sakId}/filer/${filId}/mappe`), {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify({ mappe }),
  });
  if (!respons.ok) {
    await håndterFeil(respons, "Kunne ikke flytte fil", {
      forventedeStatuser: FORVENTEDE_MAPPEFEIL,
    });
  }
}

/**
 * Henter filinnhold direkte fra backend og returnerer det rå HTTP-svaret.
 * Svaret inneholder filbytes med Content-Disposition-header for nedlasting.
 * Unngår bruk av signerte GCS-URLer som krever iam.serviceAccounts.signBlob.
 */
export async function lastNedFil(token: string, sakId: string, filId: string): Promise<Response> {
  const respons = await fetch(apiUrl(`/api/v1/kontrollsaker/${sakId}/filer/${filId}`), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!respons.ok) await håndterFeil(respons, "Kunne ikke laste ned fil");
  return respons;
}
