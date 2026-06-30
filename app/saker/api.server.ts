import { data } from "react-router";
import { z } from "zod";
import { BACKEND_API_URL } from "~/config/env.server";
import { logger } from "~/logging/logging";
import type { Dokument, DokumentInnhold, DokumentNode } from "~/saker/filer/typer";
import {
  kontrollsakHendelseResponseSchema,
  dokumentNodeSchema,
  kontrollsakResponseSchema,
  type Blokkeringsarsak,
  type Henleggelsesarsak,
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

const dokumentInnholdSchema: z.ZodType<DokumentInnhold> = z
  .object({
    type: z.string(),
  })
  .passthrough();

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

async function håndterFeil(respons: Response, beskrivelse: string): Promise<never> {
  logger.error(`${beskrivelse} — status ${respons.status}`);
  throw new Error(beskrivelse);
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

export async function søkKontrollsaker(
  token: string,
  personIdent: string,
): Promise<KontrollsakResponse[]> {
  const respons = await fetch(apiUrl("/api/v1/kontrollsaker/sok"), {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ personIdent }),
  });
  if (!respons.ok) await håndterFeil(respons, "Kunne ikke søke etter kontrollsaker");
  return parseEllerKastFeil(
    z.array(kontrollsakResponseSchema),
    await respons.json(),
    "søkKontrollsaker",
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

export async function opprettNotat(token: string, sakId: string, tittel: string, tekst: string) {
  const respons = await fetch(apiUrl(`/api/v1/kontrollsaker/${sakId}/notater`), {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ tittel, tekst }),
  });
  if (!respons.ok) await håndterFeil(respons, "Kunne ikke opprette notat");
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

/** @deprecated Bruk hentKodeverk() og les .merker fra resultatet */
export async function hentMerkinger(token: string): Promise<string[]> {
  const kodeverk = await hentKodeverk(token);
  return kodeverk.merker;
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
