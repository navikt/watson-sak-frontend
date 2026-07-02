import { getBackendOboToken } from "~/auth/access-token";
import { skalBrukeMockdata } from "~/config/env.server";
import * as backendApi from "~/saker/api.server";
import { hentAlleSaker } from "~/saker/mock-alle-saker.server";
import type { KontrollsakResponse } from "~/saker/types.backend";
import { getPersonIdent } from "~/saker/visning";
import { paginerElementer } from "~/utils/paginering";
import { erFnr, erOrganisasjonsnummer, erSaksnummer } from "~/utils/string-utils";

type Søksak = KontrollsakResponse;

const SØK_RADER_PER_SIDE = 20;

export type SøkeType = "saksnummer" | "personIdent" | "organisasjonsnummer" | "ukjent";

export type SøkResultat = {
  søketekst: string;
  søketype: SøkeType;
  resultater: Søksak[];
  side: number;
  totalSider: number;
  totalAntall: number;
};

/**
 * Søker etter kontrollsaker basert på søketekstens form:
 * - Saksnummer (rent numerisk, verken 9 eller 11 siffer) → henter saken direkte på id.
 *   Gir alltid 0 eller 1 treff, og pagineres derfor ikke.
 * - Fødselsnummer (11 siffer) → søker mot backend på personIdent, paginert.
 * - Organisasjonsnummer (9 siffer) → søker mot backend på organisasjonsnummer, paginert.
 * - Alt annet gir ingen treff.
 *
 * @param side sidenummer (starter på 1) — brukes kun for personIdent- og organisasjonsnummer-søk
 */
export async function søkSaker(
  request: Request,
  søketekst: string,
  side = 1,
): Promise<SøkResultat> {
  const normalisert = søketekst.trim();

  if (!normalisert) {
    return {
      søketekst: normalisert,
      søketype: "ukjent",
      resultater: [],
      side: 1,
      totalSider: 1,
      totalAntall: 0,
    };
  }

  if (erSaksnummer(normalisert)) {
    const resultater = await søkPåSaksnummer(request, normalisert);
    return {
      søketekst: normalisert,
      søketype: "saksnummer",
      resultater,
      side: 1,
      totalSider: 1,
      totalAntall: resultater.length,
    };
  }

  if (erFnr(normalisert)) {
    const { resultater, totalSider, totalAntall } = await søkPåPersonIdent(
      request,
      normalisert,
      side,
    );
    return {
      søketekst: normalisert,
      søketype: "personIdent",
      resultater,
      side,
      totalSider,
      totalAntall,
    };
  }

  if (erOrganisasjonsnummer(normalisert)) {
    const { resultater, totalSider, totalAntall } = await søkPåOrganisasjonsnummer(
      request,
      normalisert,
      side,
    );
    return {
      søketekst: normalisert,
      søketype: "organisasjonsnummer",
      resultater,
      side,
      totalSider,
      totalAntall,
    };
  }

  return {
    søketekst: normalisert,
    søketype: "ukjent",
    resultater: [],
    side: 1,
    totalSider: 1,
    totalAntall: 0,
  };
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

type PaginertSøkeresultat = { resultater: Søksak[]; totalSider: number; totalAntall: number };

async function søkPåPersonIdent(
  request: Request,
  personIdent: string,
  side: number,
): Promise<PaginertSøkeresultat> {
  if (!skalBrukeMockdata) {
    const token = await getBackendOboToken(request);
    const { items, totalPages, totalItems } = await backendApi.søkKontrollsaker(
      token,
      personIdent,
      side,
      SØK_RADER_PER_SIDE,
    );
    return { resultater: items, totalSider: totalPages, totalAntall: totalItems };
  }

  const alleSaker: Søksak[] = hentAlleSaker(request);
  const treff = alleSaker.filter((sak) => getPersonIdent(sak) === personIdent);
  const { elementer, totalSider } = paginerElementer(treff, side, SØK_RADER_PER_SIDE);
  return { resultater: elementer, totalSider, totalAntall: treff.length };
}

async function søkPåOrganisasjonsnummer(
  request: Request,
  organisasjonsnummer: string,
  side: number,
): Promise<PaginertSøkeresultat> {
  if (!skalBrukeMockdata) {
    const token = await getBackendOboToken(request);
    const { items, totalPages, totalItems } = await backendApi.søkKontrollsakerOrganisasjon(
      token,
      organisasjonsnummer,
      side,
      SØK_RADER_PER_SIDE,
    );
    return { resultater: items, totalSider: totalPages, totalAntall: totalItems };
  }

  const alleSaker: Søksak[] = hentAlleSaker(request);
  const treff = alleSaker.filter((sak) => sak.arbeidsgivere.includes(organisasjonsnummer));
  const { elementer, totalSider } = paginerElementer(treff, side, SØK_RADER_PER_SIDE);
  return { resultater: elementer, totalSider, totalAntall: treff.length };
}
