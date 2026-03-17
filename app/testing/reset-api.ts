import { skalBrukeMockdata } from "~/config/env.server";
import { resetMockSaker } from "~/fordeling/mock-data.server";
import { resetMockMineSaker } from "~/mine-saker/mock-data.server";
import { resetHistorikk } from "~/saker/historikk/mock-data.server";

/**
 * API-rute som tilbakestiller all mock-data til opprinnelig tilstand.
 * Kun tilgjengelig når appen kjører med mock-data (local-mock / demo).
 */
export function action() {
  if (!skalBrukeMockdata) {
    throw new Response("Ikke tilgjengelig i dette miljøet", { status: 403 });
  }

  resetMockSaker();
  resetMockMineSaker();
  resetHistorikk();

  return Response.json({ ok: true });
}
