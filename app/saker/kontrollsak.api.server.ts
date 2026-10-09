import { data } from "react-router";
import { z } from "zod";
import { logger } from "~/logging/logging";
import {
  kontrollsakPageResponseSchema,
  kontrollsakResponseSchema,
  oppgaveKortSchema,
  type KontrollsakPageResponse,
  type KontrollsakResponse,
  type KontrollsakSaksbehandler,
  type LagreResultatRequest,
  type KontrollsakSteg,
  type KontrollsakStatus,
  type TillatteHandlingerResponse,
  tillatteHandlingerResponseSchema,
} from "./types.backend";
import { sakHendelseSchema } from "./historikk/typer";
import {
  saksbehandlerListeSchema,
  journalpostReferanseSchema,
  apiUrl,
  authHeaders,
  håndterFeil,
  parseEllerKastFeil,
} from "~/saker/api-core.server";

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

export async function hentTillatteHandlinger(
  token: string,
  sakId: string,
): Promise<TillatteHandlingerResponse> {
  const sti = `/api/v1/kontrollsaker/${sakId}/tillatte-handlinger`;
  const respons = await fetch(apiUrl(sti), { headers: authHeaders(token) });
  if (!respons.ok) await håndterFeil(respons, "Kunne ikke hente tillatte handlinger");
  return parseEllerKastFeil(
    tillatteHandlingerResponseSchema,
    await respons.json(),
    "hentTillatteHandlinger",
  );
}

/** Søker på internt saksnummer eller saksnummeret fra det gamle systemet. */
export async function søkKontrollsakerPåSaksnummer(
  token: string,
  saksnummer: string,
): Promise<KontrollsakResponse[]> {
  const respons = await fetch(
    apiUrl(`/api/v1/kontrollsaker/sok/saksnummer/${encodeURIComponent(saksnummer)}`),
    {
      headers: authHeaders(token),
    },
  );
  if (respons.status === 404) return [];
  if (!respons.ok) await håndterFeil(respons, "Kunne ikke søke etter kontrollsaker på saksnummer");
  return parseEllerKastFeil(
    z.array(kontrollsakResponseSchema),
    await respons.json(),
    "søkKontrollsakerPåSaksnummer",
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
  return parseEllerKastFeil(z.array(sakHendelseSchema), await respons.json(), "hentHendelser");
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

export async function endreSteg(
  token: string,
  sakId: string,
  versjon: number,
  steg: KontrollsakSteg,
  resultat?: LagreResultatRequest,
  beskrivelse?: string,
): Promise<KontrollsakResponse> {
  const respons = await fetch(apiUrl(`/api/v1/kontrollsaker/${sakId}/steg`), {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ versjon, steg, resultat, beskrivelse }),
  });
  if (!respons.ok) await håndterFeil(respons, "Kunne ikke endre steg");
  return parseEllerKastFeil(kontrollsakResponseSchema, await respons.json(), "endreSteg");
}

export async function lagreResultat(
  token: string,
  sakId: string,
  resultat: LagreResultatRequest,
): Promise<KontrollsakResponse> {
  const respons = await fetch(apiUrl(`/api/v1/kontrollsaker/${sakId}/resultat`), {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify(resultat),
  });
  if (!respons.ok) await håndterFeil(respons, "Kunne ikke lagre resultatet");
  return parseEllerKastFeil(kontrollsakResponseSchema, await respons.json(), "lagreResultat");
}

export async function endreStatus(
  token: string,
  sakId: string,
  status: KontrollsakStatus | null,
  beskrivelse?: string,
): Promise<KontrollsakResponse> {
  const respons = await fetch(apiUrl(`/api/v1/kontrollsaker/${sakId}/status`), {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ status, beskrivelse }),
  });
  if (!respons.ok) await håndterFeil(respons, "Kunne ikke endre status");
  return parseEllerKastFeil(kontrollsakResponseSchema, await respons.json(), "endreStatus");
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

const opprettJournalpostResponseSchema = z.object({
  journalpostId: z.string(),
});

export async function opprettJournalpost(
  token: string,
  sakId: string,
  journalposttype: string,
  tittel: string,
  tekst: string,
  vedleggIds: string[] = [],
  dokumentIds: string[] = [],
): Promise<{ journalpostId: string }> {
  const respons = await fetch(apiUrl(`/api/v1/kontrollsaker/${sakId}/journalposter`), {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ journalposttype, tittel, tekst, vedleggIds, dokumentIds }),
  });
  if (!respons.ok) await håndterFeil(respons, "Kunne ikke opprette journalpost");
  return parseEllerKastFeil(
    opprettJournalpostResponseSchema,
    await respons.json(),
    "opprettJournalpost",
  );
}

const oppgaveResponseSchema = oppgaveKortSchema
  .omit({ sistEndret: true, opprettet: true })
  .extend({ prioritet: z.string().nullable() });

export type OppgaveResponse = z.infer<typeof oppgaveResponseSchema>;

export async function opprettOppgave(
  token: string,
  sakId: string,
  tildeltEnhetsnr: string,
  prioritet: string,
  fristDato: string,
  beskrivelse: string,
  oppgavetype: string,
  journalpostId?: string,
): Promise<OppgaveResponse> {
  const respons = await fetch(apiUrl(`/api/v1/kontrollsaker/${sakId}/oppgave`), {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({
      tildeltEnhetsnr,
      prioritet,
      fristDato,
      beskrivelse,
      oppgavetype,
      ...(journalpostId ? { journalpostId } : {}),
    }),
  });
  if (!respons.ok) await håndterFeil(respons, "Kunne ikke opprette oppgave");
  return parseEllerKastFeil(oppgaveResponseSchema, await respons.json(), "opprettOppgave");
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
  enheter: z.array(kodeverkInfoSchema).default([]),
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
