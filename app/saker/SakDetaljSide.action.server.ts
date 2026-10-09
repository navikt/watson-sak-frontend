import { data } from "react-router";
import { skalBrukeMockdata } from "~/config/env.server";
import { logger } from "~/logging/logging";
import * as backendApi from "~/saker/api.server";
import { hentTekstfelt } from "~/utils/form-data";
import type { Route } from "./+types/SakDetaljSide.route";
import { backendAction } from "~/saker/handlinger/backend-action.server";
import { mockAction } from "~/saker/handlinger/mock-action.server";

// --- Action ---

export async function action({ request, params }: Route.ActionArgs) {
  const formData = await request.formData();
  const handling = hentTekstfelt(formData, "handling", "Ugyldig handling");
  const sakId = params.sakId;

  const utfør = () =>
    skalBrukeMockdata
      ? mockAction(request, sakId, handling, formData)
      : backendAction(request, sakId, handling, formData);

  if (!saksflythandlinger.has(handling)) return utfør();
  try {
    return await utfør();
  } catch (feil) {
    return saksflytfeil(feil);
  }
}

/** Handlingene fra saksflyt-modalen. Feil returneres slik at modalen beholder verdiene. */
const saksflythandlinger = new Set(["endre_steg_dialog", "lagre_resultat", "endre_status"]);

type SaksflytFeil = { ok: false; feil: string };

function saksflytfeil(feil: unknown) {
  if (feil instanceof Response) throw feil;
  const konflikt =
    "Endringen ble avvist. Saken kan være endret av noen andre. Last inn siden på nytt og prøv igjen.";
  if (feil instanceof backendApi.BackendFeilException) {
    const melding =
      feil.status === 409
        ? konflikt
        : "Kunne ikke lagre endringen. Last inn siden på nytt og prøv igjen.";
    return data<SaksflytFeil>({ ok: false, feil: melding }, { status: feil.status });
  }
  if (
    feil &&
    typeof feil === "object" &&
    "init" in feil &&
    "data" in feil &&
    typeof feil.data === "string"
  ) {
    const status = (feil.init as ResponseInit | null)?.status ?? 400;
    return data<SaksflytFeil>({ ok: false, feil: feil.data }, { status });
  }
  // fetch avviser med TypeError ved nettverks- og DNS-feil, før backend har svart.
  if (feil instanceof TypeError) {
    logger.error("Fikk ikke kontakt med backend fra saksflyt-modalen", { feil: feil.message });
    return data<SaksflytFeil>(
      { ok: false, feil: "Fikk ikke kontakt med baksystemet. Prøv igjen om litt." },
      { status: 502 },
    );
  }
  throw feil;
}
