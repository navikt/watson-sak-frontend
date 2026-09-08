import { parseAzureUserToken } from "@navikt/oasis";
import { redirect } from "react-router";
import { env } from "~/config/env.server";
import { logger } from "~/logging/logging";
import { getBackendOboToken, getValidToken } from "./access-token";
import { hentSaksbehandlerInfo } from "./api.server";

export interface InnloggetBruker {
  preferredUsername: string;
  name: string;
  navIdent: string;
  enhet: string;
  enhetId: string | null;
  erLeder: boolean;
}

/**
 * Navngitte lokale mock-brukere for `BRUKERPROFIL` i `local-mock`.
 *
 * NAV-identer og enhets-ID-er samsvarer med de tilsvarende mock-brukerne i
 * watson-admin-api (se `mock-saksbehandlere.json`), slik at samme profil gir samme
 * identitet både i ren mock og mot en ekte lokal backend (`local-backend`).
 *
 * Enhetene "Øst" (ky153k) og "Vest" (gu301n) har to saksbehandlere hver, slik at man
 * kan teste overføring av saker mellom saksbehandlere i samme enhet, i tillegg til
 * overføring på tvers av enheter (Øst/Vest/Analyse).
 */
const LOKALE_BRUKERPROFILER: Record<string, InnloggetBruker> = {
  "saksbehandler-analyse": {
    preferredUsername: "lokal.utvikler",
    name: "Lokal Utvikler",
    navIdent: "L999999",
    enhet: "Analyse",
    enhetId: "by295h",
    erLeder: false,
  },
  "leder-analyse": {
    preferredUsername: "lene.leder",
    name: "Lene Leder",
    navIdent: "L900006",
    enhet: "Analyse",
    enhetId: "by295h",
    erLeder: true,
  },
  "leder-øst": {
    preferredUsername: "lars.leder",
    name: "Lars Leder",
    navIdent: "L900000",
    enhet: "Øst",
    enhetId: "ky153k",
    erLeder: true,
  },
  "leder-vest": {
    preferredUsername: "lisa.leder",
    name: "Lisa Leder",
    navIdent: "L900001",
    enhet: "Vest",
    enhetId: "gu301n",
    erLeder: true,
  },
  "saksbehandler-øst-1": {
    preferredUsername: "simen.saksbehandler",
    name: "Simen Saksbehandler",
    navIdent: "L900002",
    enhet: "Øst",
    enhetId: "ky153k",
    erLeder: false,
  },
  "saksbehandler-øst-2": {
    preferredUsername: "sara.saksbehandler",
    name: "Sara Saksbehandler",
    navIdent: "L900003",
    enhet: "Øst",
    enhetId: "ky153k",
    erLeder: false,
  },
  "saksbehandler-vest-1": {
    preferredUsername: "silje.saksbehandler",
    name: "Silje Saksbehandler",
    navIdent: "L900004",
    enhet: "Vest",
    enhetId: "gu301n",
    erLeder: false,
  },
  "saksbehandler-vest-2": {
    preferredUsername: "stian.saksbehandler",
    name: "Stian Saksbehandler",
    navIdent: "L900005",
    enhet: "Vest",
    enhetId: "gu301n",
    erLeder: false,
  },
};

type HentInnloggetBrukerArgs = {
  request: Request;
  oboToken?: string | null;
};
/**
 * Returnerer den innloggede brukeren, eller redirecter brukeren til innlogging
 */
export async function hentInnloggetBruker({
  request,
  oboToken,
}: HentInnloggetBrukerArgs): Promise<InnloggetBruker> {
  if (env.ENVIRONMENT === "local-mock") {
    const lokalProfil = LOKALE_BRUKERPROFILER[env.BRUKERPROFIL];
    if (lokalProfil) {
      return lokalProfil;
    }

    return {
      preferredUsername: "test",
      name: "Saks Behandlersen",
      navIdent: "Z999999",
      enhet: "4812",
      enhetId: "4812",
      erLeder: false,
    };
  }
  const token = await getValidToken(request);

  const parseResult = parseAzureUserToken(token);
  if (!parseResult.ok) {
    logger.error("Token parse resultat ikke ok", { error: parseResult.error });
    throw redirect(`/oauth2/login`);
  }

  if (env.ENVIRONMENT === "demo") {
    // Demo har ingen ekte OBO-oppslag mot backend (se test «unngår obo-oppslag i demo»),
    // så vi bruker samme mock-enhet som local-mock i stedet for en placeholder-tekst.
    // Ellers vil "avdeling"-variabelen i dokumentteksteditoren vise den bokstavelige
    // teksten "Ukjent" i stedet for en gyldig enhet.
    return {
      preferredUsername: parseResult.preferred_username,
      name: parseResult.name,
      navIdent: parseResult.NAVident,
      enhet: "4812",
      enhetId: "4812",
      erLeder: false,
    };
  }

  const resolvedOboToken = oboToken ?? (await getBackendOboToken(request));

  const saksbehandlerInfo = await hentSaksbehandlerInfo(resolvedOboToken);

  return {
    preferredUsername: parseResult.preferred_username,
    name: parseResult.name,
    navIdent: parseResult.NAVident,
    enhet: saksbehandlerInfo.enhet ?? "Ukjent",
    enhetId: saksbehandlerInfo.enhetId,
    erLeder: saksbehandlerInfo.erLeder,
  };
}
