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
    nesteFordelingssakId: 10000,
    nesteHistorikkId,
  };
}

const MAX_SESSIONS = 50;
const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutter

interface SessionEntry {
  state: MockState;
  lastAccessed: number;
}

const sessions = new Map<string, SessionEntry>();
let defaultSession: MockState | undefined;

const MOCK_SESSION_COOKIE = "mock-session";

/** Fjern sesjoner som er eldre enn TTL, eller de eldste hvis vi er over maks */
function pruneSesjoner() {
  const now = Date.now();
  for (const [id, entry] of sessions) {
    if (now - entry.lastAccessed > SESSION_TTL_MS) {
      sessions.delete(id);
    }
  }

  if (sessions.size > MAX_SESSIONS) {
    const sorted = [...sessions.entries()].sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
    const toRemove = sorted.slice(0, sessions.size - MAX_SESSIONS);
    for (const [id] of toRemove) {
      sessions.delete(id);
    }
  }
}

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

  const entry = sessions.get(sessionId);
  if (!entry) {
    const nyState = lagFreshState();
    sessions.set(sessionId, { state: nyState, lastAccessed: Date.now() });
    return nyState;
  }

  entry.lastAccessed = Date.now();
  return entry.state;
}

/** Tilbakestill mockdata. Returnerer sessionId og Set-Cookie-header. */
export function resetMockSession(request: Request): {
  sessionId: string;
  setCookieHeader: string;
} {
  const eksisterende = hentSessionIdFraCookie(request);
  const sessionId = eksisterende ?? crypto.randomUUID();

  pruneSesjoner();
  sessions.set(sessionId, { state: lagFreshState(), lastAccessed: Date.now() });

  return {
    sessionId,
    setCookieHeader: `${MOCK_SESSION_COOKIE}=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=1800`,
  };
}

/** Tilbakestill default-sesjonen (for enhetstester uten cookie) */
export function resetDefaultSession() {
  defaultSession = lagFreshState();
}
