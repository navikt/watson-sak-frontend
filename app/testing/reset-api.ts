import { skalBrukeMockdata } from "~/config/env.server";
import { resetMockSession } from "~/testing/mock-store/reset.server";

/**
 * API-rute som tilbakestiller all mock-data til opprinnelig tilstand.
 * Kun tilgjengelig når appen kjører med mock-data (local-mock / demo).
 * Returnerer en cookie som binder nettleseren til en isolert mock-sesjon.
 */
export function action({ request }: { request: Request }) {
  if (!skalBrukeMockdata) {
    throw new Response("Ikke tilgjengelig i dette miljøet", { status: 403 });
  }

  const { setCookieHeader } = resetMockSession(request);

  return Response.json({ ok: true }, { headers: { "Set-Cookie": setCookieHeader } });
}
