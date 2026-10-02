import { data, type ActionFunctionArgs } from "react-router";
import { lagreNotatFraOpprettelse } from "./notat-fra-opprettelse.server";

/**
 * Resource route for å prøve på nytt å lagre notatet fra opprettelsen, når
 * det første forsøket (i `RegistrerSakSide.server.ts`-action) feilet. Saken
 * finnes allerede — dette kaller bare dokumentlagringen på nytt, mot samme
 * sak. Ikke koblet til migreringskandidaten eller migreringsstatus.
 */
export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    throw data("Metoden støttes ikke", { status: 405 });
  }

  const formData = await request.formData();
  const sakId = formData.get("sakId");
  const notat = formData.get("notat");

  if (typeof sakId !== "string" || !sakId) {
    throw data("Mangler sak-id", { status: 400 });
  }
  if (typeof notat !== "string" || !notat.trim()) {
    throw data("Mangler notattekst", { status: 400 });
  }

  try {
    await lagreNotatFraOpprettelse(request, sakId, notat.trim());
    return { ok: true as const };
  } catch {
    return data({ ok: false as const }, { status: 502 });
  }
}
