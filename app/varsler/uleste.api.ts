import type { LoaderFunctionArgs } from "react-router";
import { getBackendOboToken } from "~/auth/access-token";
import { skalBrukeMockdata } from "~/config/env.server";
import { logger } from "~/logging/logging";
import { hentUlesteVarsler as hentUlesteVarslerFraApi } from "./api.server";
import { hentUlesteVarsler as hentUlesteVarslerFraMock } from "./mock-data.server";

export async function loader({ request }: LoaderFunctionArgs) {
  if (skalBrukeMockdata) {
    return { varsler: hentUlesteVarslerFraMock(request) };
  }

  const token = await getBackendOboToken(request);
  try {
    return { varsler: await hentUlesteVarslerFraApi(token) };
  } catch (err) {
    logger.warn("Klarte ikke hente uleste varsler", { feil: String(err) });
    return { varsler: [] };
  }
}
