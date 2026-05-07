import type { KontrollsakResponse } from "~/saker/types.backend";
import type { SakHendelse } from "~/saker/historikk/typer";
import type { Varsel } from "~/varsler/typer";
import { lagInitialKontrollsaker } from "./saker/fordeling.server";
import { lagInitialMineKontrollsaker } from "./saker/mine-saker.server";
import { lagInitialeVarsler } from "./varsler.server";
import { genererHistorikkForSaker } from "./historikk.server";

export interface MockState {
  kontrollsaker: KontrollsakResponse[];
  mineKontrollsaker: KontrollsakResponse[];
  historikk: Map<string, SakHendelse[]>;
  tommeFilområder: Set<string>;
  varsler: Varsel[];
  nesteFordelingssakId: number;
  nesteHistorikkId: number;
}

/** Bygger en helt fersk mocktilstand fra bunnen av */
function lagFreshState(): MockState {
  const kontrollsaker = lagInitialKontrollsaker();
  const mineKontrollsaker = lagInitialMineKontrollsaker();
  const historikk = new Map<string, SakHendelse[]>();
  let nesteHistorikkId = 1;

  nesteHistorikkId = genererHistorikkForSaker(kontrollsaker, historikk, nesteHistorikkId);
  nesteHistorikkId = genererHistorikkForSaker(mineKontrollsaker, historikk, nesteHistorikkId);

  return {
    kontrollsaker,
    mineKontrollsaker,
    historikk,
    tommeFilområder: new Set(),
    varsler: lagInitialeVarsler(),
    nesteFordelingssakId: 200,
    nesteHistorikkId,
  };
}

const sessions = new Map<string, MockState>();
let defaultSession: MockState | undefined;

const MOCK_SESSION_COOKIE = "mock-session";

function hentSessionIdFraCookie(request: Request): string | undefined {
  const cookieHeader = request.headers.get("Cookie");
  if (!cookieHeader) return undefined;

  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${MOCK_SESSION_COOKIE}=([^;]+)`));
  return match?.[1];
}

/** Hent mock-tilstanden for en request basert på cookie */
export function hentMockState(request: Request): MockState {
  const sessionId = hentSessionIdFraCookie(request);

  if (!sessionId) {
    defaultSession ??= lagFreshState();
    return defaultSession;
  }

  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, lagFreshState());
  }

  return sessions.get(sessionId)!;
}

/** Tilbakestill mockdata. Returnerer sessionId og Set-Cookie-header. */
export function resetMockSession(request: Request): {
  sessionId: string;
  setCookieHeader: string;
} {
  const eksisterende = hentSessionIdFraCookie(request);
  const sessionId = eksisterende ?? crypto.randomUUID();

  sessions.set(sessionId, lagFreshState());

  return {
    sessionId,
    setCookieHeader: `${MOCK_SESSION_COOKIE}=${sessionId}; Path=/; HttpOnly; SameSite=Lax`,
  };
}

/** Tilbakestill default-sesjonen (for enhetstester uten cookie) */
export function resetDefaultSession() {
  defaultSession = lagFreshState();
}
