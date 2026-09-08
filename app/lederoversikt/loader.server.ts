import { getBackendOboToken } from "~/auth/access-token";
import type { InnloggetBruker } from "~/auth/innlogget-bruker.server";
import { skalBrukeMockdata } from "~/config/env.server";
import { hentLederStatistikk } from "./api.server";
import { lagMockLederStatistikk } from "./mock.server";
import type { LederStatistikk } from "./types";

type HentLederOversiktDataArgs = {
  request: Request;
  innloggetBruker: InnloggetBruker;
};

/**
 * Henter ferdig aggregert lederstatistikk. Produksjonskallet sender ingen
 * enhetsidentifikator; backend utleder enheten fra token og NOM.
 */
export async function hentLederOversiktData({
  request,
  innloggetBruker,
}: HentLederOversiktDataArgs): Promise<LederStatistikk> {
  if (skalBrukeMockdata) {
    if (!innloggetBruker.enhetId) {
      throw new Error("Kan ikke lage mockstatistikk uten enhetstilhørighet.");
    }
    return lagMockLederStatistikk(request, innloggetBruker.enhetId, innloggetBruker.enhet);
  }

  const token = await getBackendOboToken(request);
  return hentLederStatistikk(token);
}
