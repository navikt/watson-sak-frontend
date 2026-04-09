import { skalBrukeMockdata } from "~/config/env.server";
import { resetMockStore } from "~/testing/mock-store/reset.server";

/**
 * API-rute som tilbakestiller all mock-data til opprinnelig tilstand.
 * Kun tilgjengelig når appen kjører med mock-data (local-mock / demo).
 */
export function action() {
  if (!skalBrukeMockdata) {
    throw new Response("Ikke tilgjengelig i dette miljøet", { status: 403 });
  }

  resetMockStore();

  return Response.json({ ok: true });
}
