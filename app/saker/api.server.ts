import { z } from "zod";
import { BACKEND_API_URL } from "~/config/env.server";
import { logger } from "~/logging/logging";
import {
  kontrollsakHendelseResponseSchema,
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
