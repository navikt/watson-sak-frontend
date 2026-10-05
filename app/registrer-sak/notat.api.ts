import { data, type ActionFunctionArgs } from "react-router";
import { erUtloggetFeil } from "~/auth/session-utløpt.server";
import { logger } from "~/logging/logging";
import { kreverEgenMigreringssak, lagreNotatFraOpprettelse } from "./notat-fra-opprettelse.server";
import { NOTAT_MAKS_TEGN } from "./validering";

/**
 * Resource route for å prøve på nytt å lagre notatet fra opprettelsen, når
 * det første forsøket (i `RegistrerSakSide.server.ts`-action) feilet. Saken
 * finnes allerede. `sakId` kommer fra klienten og stoles derfor ikke på:
 * ruten krever at saken er innlogget brukers egen migreringssak i
 * `UNDER_MIGRERING` (se `kreverEgenMigreringssak`). Lagringen er idempotent,
 * så et nytt forsøk oppdaterer notatet i stedet for å lage et nytt dokument.
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
  if (notat.trim().length > NOTAT_MAKS_TEGN) {
    throw data(`Notatet kan ikke være lengre enn ${NOTAT_MAKS_TEGN} tegn`, { status: 400 });
  }

  await kreverEgenMigreringssak(request, sakId);

  try {
    await lagreNotatFraOpprettelse(request, sakId, notat.trim(), { gjenbrukEksisterende: true });
    return { ok: true as const };
  } catch (feil) {
    // Utløpt sesjon skal gi innloggingssiden, ikke en «prøv igjen»-melding.
    if (erUtloggetFeil(feil)) throw feil;
    logger.error("Kunne ikke lagre notat ved retry for migreringssak", { sakId, feil });
    return data({ ok: false as const }, { status: 502 });
  }
}
