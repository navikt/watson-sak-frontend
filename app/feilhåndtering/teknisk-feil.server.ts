import { data } from "react-router";
import { logger } from "~/logging/logging";

/**
 * En feil saksbehandleren ikke kan gjøre noe med: 5xx fra backend, nettverksfeil
 * eller ugyldig svar. Alt annet (4xx, redirects, `data(...)`-svar) er kjente
 * tilstander som skal håndteres der de oppstår.
 */
export function erTekniskFeil(feil: unknown): boolean {
  if (feil instanceof Response) return feil.status >= 500;
  if (harHttpStatus(feil)) return feil.status >= 500;
  if (erDataSvar(feil)) return (feil.init?.status ?? 200) >= 500;
  return feil instanceof Error;
}

/**
 * `BackendFeilException` og subklassene (f.eks. `FilIBrukFeilException`). Sjekkes strukturelt,
 * ikke med instanceof, så det virker på tvers av moduler og i tester som mocker api.server.
 */
function harHttpStatus(feil: unknown): feil is Error & { status: number } {
  return feil instanceof Error && "status" in feil && typeof feil.status === "number";
}

function erDataSvar(feil: unknown): feil is { init: ResponseInit | null; data: unknown } {
  return !!feil && typeof feil === "object" && "init" in feil && "data" in feil;
}

export function lagFeilId(): string {
  return crypto.randomUUID().slice(0, 8);
}

type Loggkontekst = {
  /** Hva vi prøvde å gjøre, f.eks. «hente historikk». Skal ikke inneholde persondata. */
  kontekst: string;
  sakId?: string | number;
  request?: Request;
};

/**
 * Logger en teknisk feil uten persondata og returnerer en feil-ID som kan vises til brukeren.
 *
 * Vi logger bevisst ikke `error.message`, stack, request-body eller query-strenger:
 * meldinger fra backend og URL-er kan inneholde fødselsnummer.
 */
export function loggTekniskFeil(feil: unknown, { kontekst, sakId, request }: Loggkontekst) {
  const feilId = lagFeilId();
  logger.error(`Teknisk feil: ${kontekst}`, {
    feilId,
    feiltype: feil instanceof Error ? feil.name : typeof feil,
    status: statusFra(feil),
    ...(sakId !== undefined && { sakId: String(sakId) }),
    ...(request && { sti: stiFra(request) }),
  });
  return feilId;
}

/** Bare pathname, aldri query (kan inneholde fnr). Logging skal aldri kaste. */
function stiFra(request: Request): string | undefined {
  try {
    return new URL(request.url).pathname;
  } catch {
    return undefined;
  }
}

function statusFra(feil: unknown): number | undefined {
  if (feil instanceof Response || harHttpStatus(feil)) return feil.status;
  if (erDataSvar(feil)) return feil.init?.status ?? undefined;
  return undefined;
}

/** Svarformatet actions bruker for tekniske feil. Skjemaet viser `<Feilmelding>` ved knappen. */
export type TekniskFeilSvar = { ok: false; feil: string; feilId: string; teknisk: true };

export const TEKNISK_FEIL_ACTION =
  "Vi fikk ikke lagret endringen på grunn av en teknisk feil. Sjekk om endringen ble lagret før du prøver igjen.";

/**
 * Gjør en teknisk feil i en action om til et svar skjemaet kan vise, i stedet for en feilside.
 * Kjente feil (4xx, redirects) kastes videre uendret. Vi sender aldri skjemadata tilbake.
 */
export function tekniskFeilSvar(feil: unknown, loggkontekst: Loggkontekst) {
  if (!erTekniskFeil(feil)) throw feil;
  const feilId = loggTekniskFeil(feil, loggkontekst);
  return data<TekniskFeilSvar>(
    { ok: false, feil: TEKNISK_FEIL_ACTION, feilId, teknisk: true },
    { status: 500 },
  );
}

export type Utfall<T> =
  | { status: "ok"; data: T }
  | { status: "ingenTilgang" }
  | { status: "feil"; feilId: string };

/**
 * 🔴 Henter én seksjon av en side. Skiller tre utfall så UI-et aldri viser «tomt» når
 * hentingen feilet:
 * - `ok`: data finnes
 * - `ingenTilgang`: 403 (eller statuser i `ingenTilgangStatuser`), en gyldig tilstand
 * - `feil`: teknisk feil, logget med feil-ID
 *
 * 4xx som ikke er tilgangsfeil kastes videre, sånn som før.
 */
export async function hentEllerFeil<T>(
  hent: () => Promise<T>,
  loggkontekst: Loggkontekst & { ingenTilgangStatuser?: number[] },
): Promise<Utfall<T>> {
  const ingenTilgang = loggkontekst.ingenTilgangStatuser ?? [403];
  try {
    return { status: "ok", data: await hent() };
  } catch (feil) {
    if (harHttpStatus(feil) && ingenTilgang.includes(feil.status)) {
      return { status: "ingenTilgang" };
    }
    if (!erTekniskFeil(feil)) throw feil;
    return { status: "feil", feilId: loggTekniskFeil(feil, loggkontekst) };
  }
}
