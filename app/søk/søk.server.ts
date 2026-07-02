import { getBackendOboToken } from "~/auth/access-token";
import { skalBrukeMockdata } from "~/config/env.server";
import * as backendApi from "~/saker/api.server";
import { hentAlleSaker } from "~/saker/mock-alle-saker.server";
import type { KontrollsakResponse } from "~/saker/types.backend";
import { getPersonIdent } from "~/saker/visning";
import { erFnr, erOrganisasjonsnummer, erSaksnummer } from "~/utils/string-utils";

type Søksak = KontrollsakResponse;

export type SøkeType = "saksnummer" | "personIdent" | "organisasjonsnummer" | "ukjent";

export type SøkResultat = {
  søketekst: string;
  søketype: SøkeType;
  resultater: Søksak[];
};

/**
 * Søker etter kontrollsaker basert på søketekstens form:
 * - Saksnummer (rent numerisk, verken 9 eller 11 siffer) → henter saken direkte på id.
 *   Gir alltid 0 eller 1 treff.
 * - Fødselsnummer (11 siffer) → søker mot backend på personIdent.
 * - Organisasjonsnummer (9 siffer) → foreløpig kun støttet i mock-modus, siden
 *   backend ikke har et orgnr-søkeendepunkt ennå.
 * - Alt annet gir ingen treff.
 */
export async function søkSaker(request: Request, søketekst: string): Promise<SøkResultat> {
  const normalisert = søketekst.trim();

  if (!normalisert) {
    return { søketekst: normalisert, søketype: "ukjent", resultater: [] };
  }

  if (erSaksnummer(normalisert)) {
    return {
      søketekst: normalisert,
      søketype: "saksnummer",
      resultater: await søkPåSaksnummer(request, normalisert),
    };
  }

  if (erFnr(normalisert)) {
    return {
      søketekst: normalisert,
      søketype: "personIdent",
      resultater: await søkPåPersonIdent(request, normalisert),
    };
  }

  if (erOrganisasjonsnummer(normalisert)) {
    return {
      søketekst: normalisert,
      søketype: "organisasjonsnummer",
      resultater: await søkPåOrganisasjonsnummer(request, normalisert),
    };
  }

  return { søketekst: normalisert, søketype: "ukjent", resultater: [] };
}

async function søkPåSaksnummer(request: Request, saksnummer: string): Promise<Søksak[]> {
  if (!skalBrukeMockdata) {
    const token = await getBackendOboToken(request);
    const sak = await backendApi.hentKontrollsakForSøk(token, saksnummer);
    return sak ? [sak] : [];
  }

  const alleSaker: Søksak[] = hentAlleSaker(request);
  const sak = alleSaker.find((s) => String(s.id) === saksnummer);
  return sak ? [sak] : [];
}

async function søkPåPersonIdent(request: Request, personIdent: string): Promise<Søksak[]> {
  if (!skalBrukeMockdata) {
    const token = await getBackendOboToken(request);
    return backendApi.søkKontrollsaker(token, personIdent);
  }

  const alleSaker: Søksak[] = hentAlleSaker(request);
  return alleSaker.filter((sak) => getPersonIdent(sak) === personIdent);
}

async function søkPåOrganisasjonsnummer(
  request: Request,
  organisasjonsnummer: string,
): Promise<Søksak[]> {
  if (!skalBrukeMockdata) {
    const token = await getBackendOboToken(request);
    return backendApi.søkKontrollsakerOrganisasjon(token, organisasjonsnummer);
  }

  const alleSaker: Søksak[] = hentAlleSaker(request);
  return alleSaker.filter((sak) => sak.arbeidsgivere.includes(organisasjonsnummer));
}
