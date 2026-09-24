import { redirectDocument } from "react-router";
import { RouteConfig } from "~/routeConfig";
import { erFnr } from "~/utils/string-utils";
import type { Migreringskilde } from "~/migrering/types";
import { pendingFnrCookie, type PendingSakData } from "./pending-fnr.server";

const gyldigeKilder: Migreringskilde[] = ["UTREDNING", "SV", "NKA_DAGPENGER", "NKA_AAP"];

/**
 * `fnr` er valgfri her: migreringslistens API eksponerer aldri personIdent
 * (bevisst utelatt av personvernhensyn, se MigreringResponseMapper i
 * backend). Når "Opprett sak" trykkes fra migreringslisten sendes derfor kun
 * `legacyPid`/`legacyKilde`, og saksbehandler må slå opp personen manuelt med
 * fødselsnummer på /registrer-sak.
 */
export async function action({ request }: { request: Request }) {
  const formData = await request.formData();
  const fnrRaw = (formData.get("fnr")?.toString() ?? "").replace(/\s/g, "");
  const fnr = erFnr(fnrRaw) ? fnrRaw : undefined;

  const legacyPidRaw = formData.get("legacyPid")?.toString()?.trim();
  const legacyKildeRaw = formData.get("legacyKilde")?.toString()?.trim() as
    | Migreringskilde
    | undefined;

  const legacyPid = legacyPidRaw && /^[0-9]{1,12}$/.test(legacyPidRaw) ? legacyPidRaw : undefined;
  const legacyKilde =
    legacyKildeRaw && gyldigeKilder.includes(legacyKildeRaw) ? legacyKildeRaw : undefined;

  if (!fnr && !(legacyPid && legacyKilde)) {
    return redirectDocument(RouteConfig.REGISTRER_SAK);
  }

  const cookieData: PendingSakData = {
    ...(fnr ? { fnr } : {}),
    ...(legacyPid && legacyKilde ? { legacyPid, legacyKilde } : {}),
  };

  return redirectDocument(RouteConfig.REGISTRER_SAK, {
    headers: { "Set-Cookie": await pendingFnrCookie.serialize(cookieData) },
  });
}
