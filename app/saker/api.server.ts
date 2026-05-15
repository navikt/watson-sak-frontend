import { z } from "zod";
import { BACKEND_API_URL } from "~/config/env.server";
import { logger } from "~/logging/logging";
import {
  kontrollsakHendelseResponseSchema,
  kontrollsakResponseSchema,
  type Blokkeringsarsak,
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

// --- Kontrollsak ---

export async function hentKontrollsak(token: string, sakId: string): Promise<KontrollsakResponse> {
  const respons = await fetch(apiUrl(`/api/v1/kontrollsaker/${sakId}`), {
    headers: authHeaders(token),
  });
  if (!respons.ok) await håndterFeil(respons, "Kunne ikke hente kontrollsak");
  return kontrollsakResponseSchema.parse(await respons.json());
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
  return z.array(kontrollsakResponseSchema).parse(await respons.json());
}

// --- Hendelser ---

export async function hentHendelser(token: string, sakId: string) {
  const respons = await fetch(apiUrl(`/api/v1/kontrollsaker/${sakId}/hendelser`), {
    headers: authHeaders(token),
  });
  if (!respons.ok) await håndterFeil(respons, "Kunne ikke hente hendelser");
  return z.array(kontrollsakHendelseResponseSchema).parse(await respons.json());
}

// --- Journalposter ---

export async function hentJournalposter(token: string, sakId: string) {
  const respons = await fetch(apiUrl(`/api/v1/kontrollsaker/${sakId}/journalposter`), {
    headers: authHeaders(token),
  });
  if (!respons.ok) await håndterFeil(respons, "Kunne ikke hente journalposter");
  return z.array(journalpostReferanseSchema).parse(await respons.json());
}

// --- Handlinger ---

export async function endreStatus(
  token: string,
  sakId: string,
  status: KontrollsakStatus,
  beskrivelse?: string,
): Promise<KontrollsakResponse> {
  const respons = await fetch(apiUrl(`/api/v1/kontrollsaker/${sakId}/status`), {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ status, beskrivelse }),
  });
  if (!respons.ok) await håndterFeil(respons, "Kunne ikke endre status");
  return kontrollsakResponseSchema.parse(await respons.json());
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
  return kontrollsakResponseSchema.parse(await respons.json());
}

export async function tildelKontrollsak(
  token: string,
  sakId: string,
  navIdent: string,
  beskrivelse?: string,
): Promise<KontrollsakResponse> {
  const respons = await fetch(apiUrl(`/api/v1/kontrollsaker/${sakId}/tildel`), {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ navIdent, beskrivelse }),
  });
  if (!respons.ok) await håndterFeil(respons, "Kunne ikke tildele kontrollsak");
  return kontrollsakResponseSchema.parse(await respons.json());
}

export async function fristillKontrollsak(
  token: string,
  sakId: string,
  beskrivelse?: string,
): Promise<KontrollsakResponse> {
  const respons = await fetch(apiUrl(`/api/v1/kontrollsaker/${sakId}/fristill`), {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ beskrivelse }),
  });
  if (!respons.ok) await håndterFeil(respons, "Kunne ikke fristille kontrollsak");
  return kontrollsakResponseSchema.parse(await respons.json());
}

export async function delKontrollsak(
  token: string,
  sakId: string,
  navIdent: string,
): Promise<KontrollsakResponse> {
  const respons = await fetch(apiUrl(`/api/v1/kontrollsaker/${sakId}/del`), {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ navIdent }),
  });
  if (!respons.ok) await håndterFeil(respons, "Kunne ikke dele kontrollsak");
  return kontrollsakResponseSchema.parse(await respons.json());
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
  return saksbehandlerListeSchema.parse(await respons.json());
}
