import { kastHvisUtlogget } from "~/auth/session-utløpt.server";
import { BACKEND_API_URL } from "~/config/env.server";
import { logger } from "~/logging/logging";
import {
  kommentarlisteSchema,
  kommentartraadSchema,
  tilBackendAnker,
  type Anker,
  type Kommentarliste,
  type Kommentartraad,
} from "./typer";

/**
 * Klient mot `DokumentKommentarController` i watson-admin-api, under
 * `/api/v1/kontrollsaker/{sakId}/dokumenter/{docId}`.
 *
 * Request- og responsformatene her er **eksakte speilinger** av backendens DTO-er.
 * Frontendvennlige navn oppstår først i Zod-transformasjonen i `typer.ts`.
 *
 * Optimistisk låsing: oppretting sender klientgenererte UUID-er (idempotent),
 * mens endringer sender forventet versjon – som `traadVersjon` i body ved svar,
 * `versjon` i body ved redigering/adressering, og `?versjon=` som query ved DELETE.
 */

export class KommentarBackendFeil extends Error {
  constructor(
    public readonly status: number,
    melding: string,
  ) {
    super(melding);
    this.name = "KommentarBackendFeil";
  }
}

/**
 * HTTP 409 fra backend. Dekker både utdatert versjon, adressert tråd, arkivert
 * dokument og idempotenskonflikt. ProblemDetail-svaret inneholder **ikke** den
 * ferske tråden, så klienten må hente kommentarlisten på nytt selv.
 */
export class KommentarKonfliktFeil extends KommentarBackendFeil {
  constructor(melding: string) {
    super(409, melding);
    this.name = "KommentarKonfliktFeil";
  }
}

function basisUrl(sakId: string, docId: string): string {
  if (!BACKEND_API_URL) {
    throw new Error("Mangler backend-URL for kommentarkall");
  }
  return `${BACKEND_API_URL}/api/v1/kontrollsaker/${sakId}/dokumenter/${docId}`;
}

function headers(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

async function lesProblemDetail(respons: Response): Promise<string | null> {
  try {
    const kropp: unknown = await respons.clone().json();
    if (
      kropp &&
      typeof kropp === "object" &&
      "detail" in kropp &&
      typeof kropp.detail === "string"
    ) {
      return kropp.detail;
    }
  } catch {
    // Ikke JSON – bruk fallback-beskrivelsen.
  }
  return null;
}

async function kastFeil(respons: Response, beskrivelse: string): Promise<never> {
  kastHvisUtlogget(respons);
  const detalj = await lesProblemDetail(respons);
  const melding = detalj ?? beskrivelse;
  if (respons.status === 409) {
    logger.warn(`${beskrivelse} — konflikt (409): ${melding}`);
    throw new KommentarKonfliktFeil(melding);
  }
  if (respons.status < 500) {
    logger.warn(`${beskrivelse} — status ${respons.status}: ${melding}`);
  } else {
    logger.error(`${beskrivelse} — status ${respons.status}: ${melding}`);
  }
  throw new KommentarBackendFeil(respons.status, melding);
}

function parseTraad(data: unknown, kontekst: string): Kommentartraad {
  const resultat = kommentartraadSchema.safeParse(data);
  if (!resultat.success) {
    logger.error(`Schema-validering feilet for ${kontekst}`, { feil: resultat.error.format() });
    throw new Error(`Ugyldig svar fra watson-admin-api (${kontekst})`);
  }
  return resultat.data;
}

/** GET /kommentartraader */
export async function hentKommentarliste(
  token: string,
  sakId: string,
  docId: string,
): Promise<Kommentarliste> {
  const respons = await fetch(`${basisUrl(sakId, docId)}/kommentartraader`, {
    headers: headers(token),
  });
  if (!respons.ok) await kastFeil(respons, "Kunne ikke hente kommentarer");

  const resultat = kommentarlisteSchema.safeParse(await respons.json());
  if (!resultat.success) {
    logger.error("Schema-validering feilet for hentKommentarliste", {
      feil: resultat.error.format(),
    });
    throw new Error("Ugyldig svar fra watson-admin-api (hentKommentarliste)");
  }
  return resultat.data;
}

/** POST /kommentartraader */
export async function opprettKommentartraad(
  token: string,
  sakId: string,
  docId: string,
  data: {
    traadId: string;
    kommentarId: string;
    anker: Anker;
    opprinneligSitat?: string | null;
    tekst: string;
  },
): Promise<Kommentartraad> {
  const { ankerType, anker, ankerVersjon } = tilBackendAnker(data.anker);
  const respons = await fetch(`${basisUrl(sakId, docId)}/kommentartraader`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify({
      traadId: data.traadId,
      kommentarId: data.kommentarId,
      ankerType,
      anker,
      ankerVersjon,
      opprinneligSitat: data.opprinneligSitat ?? null,
      tekst: data.tekst,
    }),
  });
  if (!respons.ok) await kastFeil(respons, "Kunne ikke opprette kommentartråd");
  return parseTraad(await respons.json(), "opprettKommentartraad");
}

/** POST /kommentartraader/{traadId}/kommentarer */
export async function opprettKommentar(
  token: string,
  sakId: string,
  docId: string,
  traadId: string,
  data: { kommentarId: string; tekst: string; traadVersjon: number },
): Promise<Kommentartraad> {
  const respons = await fetch(`${basisUrl(sakId, docId)}/kommentartraader/${traadId}/kommentarer`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify({
      kommentarId: data.kommentarId,
      tekst: data.tekst,
      traadVersjon: data.traadVersjon,
    }),
  });
  if (!respons.ok) await kastFeil(respons, "Kunne ikke opprette kommentar");
  return parseTraad(await respons.json(), "opprettKommentar");
}

/** PUT /kommentarer/{kommentarId} */
export async function redigerKommentar(
  token: string,
  sakId: string,
  docId: string,
  kommentarId: string,
  data: { tekst: string; versjon: number },
): Promise<Kommentartraad> {
  const respons = await fetch(`${basisUrl(sakId, docId)}/kommentarer/${kommentarId}`, {
    method: "PUT",
    headers: headers(token),
    body: JSON.stringify({ tekst: data.tekst, versjon: data.versjon }),
  });
  if (!respons.ok) await kastFeil(respons, "Kunne ikke redigere kommentar");
  return parseTraad(await respons.json(), "redigerKommentar");
}

/** DELETE /kommentarer/{kommentarId}?versjon= */
export async function slettKommentar(
  token: string,
  sakId: string,
  docId: string,
  kommentarId: string,
  versjon: number,
): Promise<Kommentartraad> {
  const respons = await fetch(
    `${basisUrl(sakId, docId)}/kommentarer/${kommentarId}?versjon=${versjon}`,
    { method: "DELETE", headers: headers(token) },
  );
  if (!respons.ok) await kastFeil(respons, "Kunne ikke slette kommentar");
  // Backend svarer alltid med tråden slik den ser ut etterpå. `synlig: false`
  // betyr at tråden ikke lenger har synlige kommentarer.
  return parseTraad(await respons.json(), "slettKommentar");
}

/** PUT /kommentartraader/{traadId}/adressering */
export async function adresserKommentartraad(
  token: string,
  sakId: string,
  docId: string,
  traadId: string,
  versjon: number,
): Promise<Kommentartraad> {
  const respons = await fetch(`${basisUrl(sakId, docId)}/kommentartraader/${traadId}/adressering`, {
    method: "PUT",
    headers: headers(token),
    body: JSON.stringify({ versjon }),
  });
  if (!respons.ok) await kastFeil(respons, "Kunne ikke markere tråden som løst");
  return parseTraad(await respons.json(), "adresserKommentartraad");
}

/** DELETE /kommentartraader/{traadId}/adressering?versjon= */
export async function gjenaapneKommentartraad(
  token: string,
  sakId: string,
  docId: string,
  traadId: string,
  versjon: number,
): Promise<Kommentartraad> {
  const respons = await fetch(
    `${basisUrl(sakId, docId)}/kommentartraader/${traadId}/adressering?versjon=${versjon}`,
    { method: "DELETE", headers: headers(token) },
  );
  if (!respons.ok) await kastFeil(respons, "Kunne ikke gjenåpne tråden");
  return parseTraad(await respons.json(), "gjenaapneKommentartraad");
}
