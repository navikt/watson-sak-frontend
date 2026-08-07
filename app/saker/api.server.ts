import { data } from "react-router";
import { z } from "zod";
import { BACKEND_API_URL } from "~/config/env.server";
import { logger } from "~/logging/logging";
import type {
  Dokument,
  DokumentInnhold,
  DokumentNode,
  DokumentReferanse,
  FilResponse,
} from "~/saker/filer/typer";
import {
  kontrollsakHendelseResponseSchema,
  dokumentNodeSchema,
  kontrollsakPageResponseSchema,
  kontrollsakResponseSchema,
  type Blokkeringsarsak,
  type Henleggelsesarsak,
  type KontrollsakPageResponse,
  type KontrollsakResponse,
  type KontrollsakSaksbehandler,
  type KontrollsakStatus,
} from "./types.backend";

const saksbehandlerListeSchema = z.array(
  z.object({
    navIdent: z.string(),
    navn: z.string(),
    enhet: z.string().nullable(),
  }),
);

const journalpostReferanseSchema = z.object({
  journalpostId: z.string(),
  journalposttype: z.string(),
  tittel: z.string(),
  opprettet: z.string(),
});

const dokumentInnholdSchema: z.ZodType<DokumentInnhold> = z.array(
  z.record(z.string(), z.unknown()),
);

const dokumentResponseSchema = dokumentNodeSchema.extend({
  innhold: dokumentInnholdSchema,
});

function apiUrl(sti: string): string {
  if (!BACKEND_API_URL) {
    throw new Error(`Mangler backend-URL for kall til ${sti}`);
  }
  return `${BACKEND_API_URL}${sti}`;
}

function authHeaders(token: string): HeadersInit {
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

async function håndterFeil(respons: Response, beskrivelse: string): Promise<never> {
  const detalj = await hentProblemDetail(respons);
  logger.error(`${beskrivelse} — status ${respons.status}${detalj ? `: ${detalj}` : ""}`);
  throw new BackendFeilException(respons.status, detalj ?? beskrivelse);
}

const dokumentReferanseSchema = z.object({ id: z.string(), tittel: z.string() });

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
async function hentProblemDetailMedDokumenter(
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

function kastHvisIkkeFunnet(respons: Response): void {
  if (respons.status === 404) {
    throw data("Dokument ikke funnet", { status: 404 });
  }
}

function parseEllerKastFeil<T>(schema: z.ZodType<T>, data: unknown, kontekst: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    logger.error(`Schema-validering feilet for ${kontekst}`, { feil: result.error.format() });
    throw new Error(`Ugyldig svar fra watson-admin-api (${kontekst})`);
  }
  return result.data;
}

// --- Kontrollsak ---

export async function hentKontrollsak(token: string, sakId: string): Promise<KontrollsakResponse> {
  const respons = await fetch(apiUrl(`/api/v1/kontrollsaker/${sakId}`), {
    headers: authHeaders(token),
  });
  if (respons.status === 404) {
    throw data("Sak ikke funnet", { status: 404 });
  }
  if (!respons.ok) await håndterFeil(respons, "Kunne ikke hente kontrollsak");
  return parseEllerKastFeil(kontrollsakResponseSchema, await respons.json(), "hentKontrollsak");
}

/**
 * Henter en kontrollsak på saksnummer for bruk i søk, uten å kaste ved 404.
 * Returnerer `null` når saken ikke finnes, slik at søket kan vise «ingen treff»
 * fremfor en feilside.
 */
export async function hentKontrollsakForSøk(
  token: string,
  sakId: string,
): Promise<KontrollsakResponse | null> {
  const respons = await fetch(apiUrl(`/api/v1/kontrollsaker/${sakId}`), {
    headers: authHeaders(token),
  });
  if (respons.status === 404) return null;
  if (!respons.ok) await håndterFeil(respons, "Kunne ikke hente kontrollsak");
  return parseEllerKastFeil(
    kontrollsakResponseSchema,
    await respons.json(),
    "hentKontrollsakForSøk",
  );
}

export async function søkKontrollsaker(
  token: string,
  personIdent: string,
  page = 1,
  size = 20,
): Promise<KontrollsakPageResponse> {
  const params = new URLSearchParams({ page: String(page), size: String(size) });
  const respons = await fetch(apiUrl(`/api/v1/kontrollsaker/sok?${params}`), {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ personIdent }),
  });
  if (!respons.ok) await håndterFeil(respons, "Kunne ikke søke etter kontrollsaker");
  return parseEllerKastFeil(
    kontrollsakPageResponseSchema,
    await respons.json(),
    "søkKontrollsaker",
  );
}

export async function søkKontrollsakerOrganisasjon(
  token: string,
  organisasjonsnummer: string,
  page = 1,
  size = 20,
): Promise<KontrollsakPageResponse> {
  const params = new URLSearchParams({ page: String(page), size: String(size) });
  const respons = await fetch(apiUrl(`/api/v1/kontrollsaker/sok/organisasjon?${params}`), {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ organisasjonsnummer }),
  });
  if (!respons.ok) await håndterFeil(respons, "Kunne ikke søke på organisasjonsnummer");
  return parseEllerKastFeil(
    kontrollsakPageResponseSchema,
    await respons.json(),
    "søkKontrollsakerOrganisasjon",
  );
}

// --- Hendelser ---

export async function hentHendelser(token: string, sakId: string) {
  const respons = await fetch(apiUrl(`/api/v1/kontrollsaker/${sakId}/hendelser`), {
    headers: authHeaders(token),
  });
  if (!respons.ok) await håndterFeil(respons, "Kunne ikke hente hendelser");
  return parseEllerKastFeil(
    z.array(kontrollsakHendelseResponseSchema),
    await respons.json(),
    "hentHendelser",
  );
}

// --- Journalposter ---

export async function hentJournalposter(token: string, sakId: string) {
  const respons = await fetch(apiUrl(`/api/v1/kontrollsaker/${sakId}/journalposter`), {
    headers: authHeaders(token),
  });
  if (!respons.ok) await håndterFeil(respons, "Kunne ikke hente journalposter");
  return parseEllerKastFeil(
    z.array(journalpostReferanseSchema),
    await respons.json(),
    "hentJournalposter",
  );
}

export async function hentDokument(token: string, sakId: string, docId: string): Promise<Dokument> {
  const respons = await fetch(apiUrl(`/api/v1/kontrollsaker/${sakId}/dokumenter/${docId}`), {
    headers: authHeaders(token),
  });
  kastHvisIkkeFunnet(respons);
  if (!respons.ok) await håndterFeil(respons, "Kunne ikke hente dokument");
  return parseEllerKastFeil(dokumentResponseSchema, await respons.json(), "hentDokument");
}

// --- Handlinger ---

export async function endreStatus(
  token: string,
  sakId: string,
  status: KontrollsakStatus,
  beskrivelse?: string,
  henleggelsesarsak?: Henleggelsesarsak | null,
): Promise<KontrollsakResponse> {
  const respons = await fetch(apiUrl(`/api/v1/kontrollsaker/${sakId}/status`), {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ status, beskrivelse, henleggelsesarsak: henleggelsesarsak ?? null }),
  });
  if (!respons.ok) await håndterFeil(respons, "Kunne ikke endre status");
  return parseEllerKastFeil(kontrollsakResponseSchema, await respons.json(), "endreStatus");
}

export async function endreBlokkering(
  token: string,
  sakId: string,
  blokkert: Blokkeringsarsak | null,
  beskrivelse?: string,
): Promise<KontrollsakResponse> {
  const respons = await fetch(apiUrl(`/api/v1/kontrollsaker/${sakId}/blokkering`), {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ blokkert, beskrivelse }),
  });
  if (!respons.ok) await håndterFeil(respons, "Kunne ikke endre blokkering");
  return parseEllerKastFeil(kontrollsakResponseSchema, await respons.json(), "endreBlokkering");
}

export async function tildelKontrollsak(
  token: string,
  sakId: string,
  navIdent: string,
): Promise<KontrollsakResponse> {
  const respons = await fetch(apiUrl(`/api/v1/kontrollsaker/${sakId}/saksbehandler`), {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ aksjon: "TILDEL", navIdent }),
  });
  if (!respons.ok) await håndterFeil(respons, "Kunne ikke tildele kontrollsak");
  return parseEllerKastFeil(kontrollsakResponseSchema, await respons.json(), "tildelKontrollsak");
}

export async function fristillKontrollsak(
  token: string,
  sakId: string,
): Promise<KontrollsakResponse> {
  const respons = await fetch(apiUrl(`/api/v1/kontrollsaker/${sakId}/saksbehandler`), {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ aksjon: "FRISTILL" }),
  });
  if (!respons.ok) await håndterFeil(respons, "Kunne ikke fristille kontrollsak");
  return parseEllerKastFeil(kontrollsakResponseSchema, await respons.json(), "fristillKontrollsak");
}

export async function delKontrollsak(
  token: string,
  sakId: string,
  navIdent: string,
): Promise<KontrollsakResponse> {
  const respons = await fetch(apiUrl(`/api/v1/kontrollsaker/${sakId}/deling`), {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ aksjon: "DEL", navIdent }),
  });
  if (!respons.ok) await håndterFeil(respons, "Kunne ikke dele kontrollsak");
  return parseEllerKastFeil(kontrollsakResponseSchema, await respons.json(), "delKontrollsak");
}

export async function opprettJournalpost(
  token: string,
  sakId: string,
  journalposttype: string,
  tittel: string,
  tekst: string,
  vedleggIds: string[] = [],
) {
  const respons = await fetch(apiUrl(`/api/v1/kontrollsaker/${sakId}/journalposter`), {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ journalposttype, tittel, tekst, vedleggIds }),
  });
  if (!respons.ok) await håndterFeil(respons, "Kunne ikke opprette journalpost");
  return respons.json();
}

// --- Saksbehandlere ---

export async function hentSaksbehandlere(token: string): Promise<KontrollsakSaksbehandler[]> {
  const respons = await fetch(apiUrl("/api/v1/saksbehandlere"), {
    headers: authHeaders(token),
  });
  if (!respons.ok) await håndterFeil(respons, "Kunne ikke hente saksbehandlere");
  return parseEllerKastFeil(saksbehandlerListeSchema, await respons.json(), "hentSaksbehandlere");
}

// --- Kodeverk ---

const kodeverkInfoSchema = z.object({
  kode: z.string(),
  beskrivelse: z.string(),
});

const misbrukstypeInfoSchema = z.object({
  kode: z.string(),
  kategori: z.string(),
  beskrivelse: z.string(),
});

const kodeverkResponseSchema = z.object({
  merker: z.array(z.string()),
  kategorier: z.array(kodeverkInfoSchema),
  misbrukstyper: z.array(misbrukstypeInfoSchema),
  ytelseTyper: z.array(kodeverkInfoSchema),
  kilder: z.array(kodeverkInfoSchema),
});

export type Kodeverk = z.infer<typeof kodeverkResponseSchema>;

/** Henter alle statiske oppslagsverdier fra kodeverk-endepunktet. */
export async function hentKodeverk(token: string): Promise<Kodeverk> {
  const respons = await fetch(apiUrl("/api/v1/kodeverk"), {
    headers: authHeaders(token),
  });
  if (!respons.ok) await håndterFeil(respons, "Kunne ikke hente kodeverk");
  return parseEllerKastFeil(kodeverkResponseSchema, await respons.json(), "hentKodeverk");
}

export async function overforAnsvarlig(
  token: string,
  sakId: string,
  navIdent: string,
): Promise<KontrollsakResponse> {
  const respons = await fetch(apiUrl(`/api/v1/kontrollsaker/${sakId}/saksbehandler`), {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ aksjon: "OVERFOR", navIdent }),
  });
  if (!respons.ok) await håndterFeil(respons, "Kunne ikke overføre ansvarlig");
  return parseEllerKastFeil(kontrollsakResponseSchema, await respons.json(), "overforAnsvarlig");
}

export async function fjernDeltTilgang(
  token: string,
  sakId: string,
  navIdent: string,
): Promise<KontrollsakResponse> {
  const respons = await fetch(apiUrl(`/api/v1/kontrollsaker/${sakId}/deling`), {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ aksjon: "FJERN", navIdent }),
  });
  if (!respons.ok) await håndterFeil(respons, "Kunne ikke fjerne delt tilgang");
  return parseEllerKastFeil(kontrollsakResponseSchema, await respons.json(), "fjernDeltTilgang");
}

export async function redigerKontrollsak(
  token: string,
  sakId: string,
  data: {
    kategori?: string;
    kilde?: string;
    misbruktype?: string[];
    merking?: string[];
    arbeidsgivere?: { organisasjonsnummer: string }[];
    ytelser?: {
      type: string;
      periodeFra: string;
      periodeTil: string;
      belop?: number | null;
      endeligBelop?: number | null;
    }[];
  },
): Promise<void> {
  const respons = await fetch(apiUrl(`/api/v1/kontrollsaker/${sakId}`), {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
  if (!respons.ok) await håndterFeil(respons, "Kunne ikke redigere saksinformasjon");
}

export async function videresend(
  token: string,
  sakId: string,
  enhet: string,
  beskrivelse?: string,
): Promise<void> {
  const respons = await fetch(apiUrl(`/api/v1/kontrollsaker/${sakId}/videresend`), {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ enhet, beskrivelse }),
  });
  if (!respons.ok) await håndterFeil(respons, "Kunne ikke videresende kontrollsak");
}

export async function kobleSak(
  token: string,
  sakId: string,
  kobletSakId: number,
  aksjon: "KOBLE" | "FJERN",
  beskrivelse?: string,
): Promise<void> {
  const respons = await fetch(apiUrl(`/api/v1/kontrollsaker/${sakId}/kobling`), {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ kobletSakId, aksjon, beskrivelse }),
  });
  if (!respons.ok) await håndterFeil(respons, "Kunne ikke koble sak");
}

export async function opprettManuellHendelse(
  token: string,
  sakId: string,
  tittel: string,
  beskrivelse?: string,
  tidspunkt?: string,
): Promise<void> {
  const respons = await fetch(apiUrl(`/api/v1/kontrollsaker/${sakId}/hendelser`), {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ tittel, beskrivelse, tidspunkt }),
  });
  if (!respons.ok) await håndterFeil(respons, "Kunne ikke opprette manuell hendelse");
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
  data: Pick<Dokument, "tittel" | "innhold">,
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

export async function slettDokument(token: string, sakId: string, docId: string): Promise<void> {
  const respons = await fetch(apiUrl(`/api/v1/kontrollsaker/${sakId}/dokumenter/${docId}`), {
    method: "DELETE",
    headers: authHeaders(token),
  });
  kastHvisIkkeFunnet(respons);
  if (!respons.ok) await håndterFeil(respons, "Kunne ikke slette dokument");
}

export async function redigerManuellHendelse(
  token: string,
  sakId: string,
  hendelseId: string,
  tittel: string,
  beskrivelse?: string,
  tidspunkt?: string,
): Promise<void> {
  logger.info(`Redigerer manuell hendelse ${hendelseId} for sak ${sakId}`);
  const respons = await fetch(apiUrl(`/api/v1/kontrollsaker/${sakId}/hendelser/${hendelseId}`), {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify({ tittel, beskrivelse, tidspunkt }),
  });
  if (!respons.ok) await håndterFeil(respons, "Kunne ikke redigere manuell hendelse");
}

export async function slettManuellHendelse(
  token: string,
  sakId: string,
  hendelseId: string,
): Promise<void> {
  logger.info(`Sletter manuell hendelse ${hendelseId} for sak ${sakId}`);
  const respons = await fetch(apiUrl(`/api/v1/kontrollsaker/${sakId}/hendelser/${hendelseId}`), {
    method: "DELETE",
    headers: authHeaders(token),
  });
  if (!respons.ok) await håndterFeil(respons, "Kunne ikke slette manuell hendelse");
}

// --- Filer (vedlegg) ---

const filResponseSchema = z.object({
  id: z.string(),
  filnavn: z.string(),
  storrelse: z.number(),
  contentType: z.string(),
  opprettetAv: z.string(),
  opprettet: z.string(),
  bruktIDokumenter: z.array(dokumentReferanseSchema).default([]),
});

const filNedlastingResponseSchema = z.object({
  url: z.string(),
  utloper: z.string(),
});

export async function hentFiler(token: string, sakId: string): Promise<FilResponse[]> {
  const respons = await fetch(apiUrl(`/api/v1/kontrollsaker/${sakId}/filer`), {
    headers: authHeaders(token),
  });
  if (!respons.ok) await håndterFeil(respons, "Kunne ikke hente filer");
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

// --- Personoppslag ---

const personOppslagResponseSchema = z.object({
  navn: z.string(),
  personIdent: z.string(),
  alder: z.number(),
  adresseskjermet: z.boolean().default(false),
});

type PersonOppslagBackendResponse = z.infer<typeof personOppslagResponseSchema>;

export type SlåOppPersonResultat =
  | { type: "success"; person: PersonOppslagBackendResponse }
  | { type: "ikke-funnet" }
  | { type: "ingen-tilgang" }
  | { type: "feil"; melding: string };

export async function slåOppPerson(
  token: string,
  personIdent: string,
): Promise<SlåOppPersonResultat> {
  const respons = await fetch(apiUrl("/api/v1/person/oppslag"), {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ personIdent }),
  });

  if (respons.ok) {
    const person = parseEllerKastFeil(
      personOppslagResponseSchema,
      await respons.json(),
      "slåOppPerson",
    );
    return { type: "success", person };
  }

  if (respons.status === 403) return { type: "ingen-tilgang" };
  if (respons.status === 404) return { type: "ikke-funnet" };

  logger.error(`Personoppslag feilet — status ${respons.status}`);
  return { type: "feil", melding: "Feil i baksystem – prøv igjen senere" };
}
