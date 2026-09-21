import { data } from "react-router";
import { getBackendOboToken } from "~/auth/access-token";
import { FeatureFlagg } from "~/feature-toggling/featureflagg";
import { hentAlleFeatureFlagg } from "~/feature-toggling/utils.server";
import { hentInnloggetBruker } from "~/auth/innlogget-bruker.server";
import { skalBrukeMockdata } from "~/config/env.server";
import { logger } from "~/logging/logging";
import { hentValgfriTekst } from "~/utils/form-data";
import { ChatRateLimitFeil, sendChatMelding } from "./api.server";
import { hentMockChatSvar } from "./mock-data.server";

/**
 * Ressursrute for AI-veileder-chatboblen (`AiVeilederChatBobble.tsx`).
 *
 * Skjules bak feature-flagget `FeatureFlagg.AI_VEILEDER` på samme måte som
 * selve boblen — denne actionen kaster 404 hvis flagget er av, slik at
 * endepunktet heller ikke er nåbart direkte hvis noen prøver.
 */
export async function action({ request }: { request: Request }) {
  const oboTokenForFlagg = skalBrukeMockdata
    ? null
    : await getBackendOboToken(request).catch(() => null);
  const user = await hentInnloggetBruker({ request, oboToken: oboTokenForFlagg });
  const featureFlagg = await hentAlleFeatureFlagg(user.navIdent);

  if (!featureFlagg[FeatureFlagg.AI_VEILEDER]) {
    throw data(null, { status: 404 });
  }

  const formData = await request.formData();
  const melding = (hentValgfriTekst(formData, "melding") ?? "").trim();

  if (skalBrukeMockdata) {
    return Response.json({ data: hentMockChatSvar(melding) });
  }

  try {
    const token = await getBackendOboToken(request);
    const resultat = await sendChatMelding(token, melding);
    return Response.json({ data: resultat });
  } catch (error) {
    if (error instanceof ChatRateLimitFeil) {
      return Response.json({ feil: "For mange meldinger, prøv igjen om litt." }, { status: 429 });
    }
    logger.error("AI-veileder feilet", { error: String(error) });
    return Response.json({ feil: "AI-veilederen er utilgjengelig akkurat nå." }, { status: 502 });
  }
}
