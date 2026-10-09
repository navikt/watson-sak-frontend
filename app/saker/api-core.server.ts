import { data } from "react-router";
import { z } from "zod";
import { kastHvisUtlogget } from "~/auth/session-utløpt.server";
import { BACKEND_API_URL } from "~/config/env.server";
import { logger } from "~/logging/logging";
import type {
  DokumentHistorikkSide,
  DokumentInnhold,
  DokumentReferanse,
} from "~/saker/filer/typer";
import { dokumentNodeSchema } from "./types.backend";
import { visningsnavn } from "~/auth/visningsnavn";

export const saksbehandlerListeSchema = z.array(
  z
    .object({
      navIdent: z.string(),
      navn: z.string(),
      enhet: z.string().nullable(),
    })
    .transform((saksbehandler) => ({
      ...saksbehandler,
      navn: visningsnavn(saksbehandler.navIdent, saksbehandler.navn),
    })),
);

export const journalpostReferanseSchema = z.object({
  journalpostId: z.string(),
  journalposttype: z.string(),
  tittel: z.string(),
  opprettet: z.string(),
});

const dokumentInnholdSchema: z.ZodType<DokumentInnhold> = z.array(
  z.record(z.string(), z.unknown()),
);

export const dokumentResponseSchema = dokumentNodeSchema.extend({
  innhold: dokumentInnholdSchema,
});

const dokumentHistorikkNodeSchema = z.object({
  id: z.string(),
  tittel: z.string(),
  endretAvIdent: z.string(),
  endretAvNavn: z.string(),
  endretTidspunkt: z.string(),
});

function medEndretAvVisningsnavn<T extends { endretAvIdent: string; endretAvNavn: string }>(
  node: T,
): T {
  return { ...node, endretAvNavn: visningsnavn(node.endretAvIdent, node.endretAvNavn) };
}

export const dokumentHistorikkResponseSchema = dokumentHistorikkNodeSchema
  .extend({
    innhold: dokumentInnholdSchema,
  })
  .transform(medEndretAvVisningsnavn);

export const dokumentHistorikkSideSchema: z.ZodType<DokumentHistorikkSide> = z.object({
  items: z.array(dokumentHistorikkNodeSchema.transform(medEndretAvVisningsnavn)),
  page: z.number(),
  size: z.number(),
  totalItems: z.number(),
  totalPages: z.number(),
});

export function apiUrl(sti: string): string {
  if (!BACKEND_API_URL) {
    throw new Error(`Mangler backend-URL for kall til ${sti}`);
  }
  return `${BACKEND_API_URL}${sti}`;
}

export function authHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

/**
 * Feil fra et backend-kall som ga et ikke-OK HTTP-svar. Bærer den faktiske
 * statuskoden, slik at kalleren kan skille forventede/forbigående feil
 * (f.eks. 409 Conflict) fra uventede serverfeil.
 */
export class BackendFeilException extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "BackendFeilException";
  }
}

/**
 * @param forventedeStatuser Statuskoder som representerer en kjent, håndtert
 * tilstand for dette kallet (f.eks. 403 ved manglende fil-tilgang) i stedet
 * for en uventet feil. Disse logges med `logger.warn` fremfor `logger.error`
 * for å unngå unødvendig feilstøy i logger ved normal bruk.
 */
export async function håndterFeil(
  respons: Response,
  beskrivelse: string,
  opts?: { forventedeStatuser?: number[] },
): Promise<never> {
  kastHvisUtlogget(respons);
  const detalj = await hentProblemDetail(respons);
  const melding = `${beskrivelse} — status ${respons.status}${detalj ? `: ${detalj}` : ""}`;
  if (opts?.forventedeStatuser?.includes(respons.status)) {
    logger.warn(melding);
  } else {
    logger.error(melding);
  }
  throw new BackendFeilException(respons.status, detalj ?? beskrivelse);
}

export const dokumentReferanseSchema = z.object({ id: z.string(), tittel: z.string() });

/**
 * Feil kastet når sletting av et vedlegg avvises av backend fordi filen er
 * satt inn som bilde i ett eller flere dokumenter. Bærer med seg hvilke
 * dokumenter det gjelder, slik at brukeren kan få en presis feilmelding.
 */
export class FilIBrukFeilException extends BackendFeilException {
  constructor(
    message: string,
    public readonly dokumenter: DokumentReferanse[],
  ) {
    super(409, message);
    this.name = "FilIBrukFeilException";
  }
}

/**
 * Som hentProblemDetail, men leser i tillegg det egendefinerte
 * «dokumenter»-feltet som GlobalExceptionHandler legger på ProblemDetail-svaret
 * ved 409 Conflict for filer som er i bruk.
 */
export async function hentProblemDetailMedDokumenter(
  respons: Response,
): Promise<{ detalj: string | null; dokumenter: DokumentReferanse[] }> {
  try {
    const body: unknown = await respons.clone().json();
    if (body && typeof body === "object") {
      const detalj = "detail" in body && typeof body.detail === "string" ? body.detail : null;
      const dokumenterRaw = "dokumenter" in body ? body.dokumenter : undefined;
      const parsed = z.array(dokumentReferanseSchema).safeParse(dokumenterRaw);
      return { detalj, dokumenter: parsed.success ? parsed.data : [] };
    }
  } catch {
    // Svaret var ikke gyldig JSON.
  }
  return { detalj: null, dokumenter: [] };
}

/**
 * Leser `detail`-feltet fra et RFC 7807 ProblemDetail-svar (formatet
 * watson-admin-api sin GlobalExceptionHandler returnerer ved feil), slik at
 * brukervennlige feilmeldinger fra backend (f.eks. ved 409 Conflict) når
 * frem til brukeren i stedet for en generisk melding.
 */
async function hentProblemDetail(respons: Response): Promise<string | null> {
  try {
    const body: unknown = await respons.clone().json();
    if (body && typeof body === "object" && "detail" in body && typeof body.detail === "string") {
      return body.detail;
    }
  } catch {
    // Svaret var ikke gyldig JSON — bruk fallback-beskrivelsen i håndterFeil.
  }
  return null;
}

export function kastHvisIkkeFunnet(respons: Response): void {
  if (respons.status === 404) {
    throw data("Dokument ikke funnet", { status: 404 });
  }
}

export function parseEllerKastFeil<T>(schema: z.ZodType<T>, data: unknown, kontekst: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    logger.error(`Schema-validering feilet for ${kontekst}`, { feil: result.error.format() });
    throw new Error(`Ugyldig svar fra watson-admin-api (${kontekst})`);
  }
  return result.data;
}
