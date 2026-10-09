import { data } from "react-router";
import { getBackendOboToken } from "~/auth/access-token";
import { hentInnloggetBruker } from "~/auth/innlogget-bruker.server";
import { env, skalBrukeMockdata } from "~/config/env.server";
import { logger } from "~/logging/logging";
import { hentMockMigreringKandidater } from "~/migrering/mock-data.server";
import { hentMigreringskandidat } from "~/migrering/api.server";
import * as backendApi from "~/saker/api.server";
import { hentAlleSaker, medInnloggetEier } from "~/saker/mock-alle-saker.server";
import { mockSaksbehandlere, mockSaksbehandlerDetaljer } from "~/saker/mock-saksbehandlere.server";
import { mockSeksjoner } from "~/saker/mock-seksjoner.server";
import type { KontrollsakResponse, TillatteHandlingerResponse } from "~/saker/types.backend";
import type { FilResponse } from "~/saker/filer/typer";
import { hentDokumenttreForSak } from "./filer/mock-data.server";
import { hentMapperstier, hentMapperstierFraMock } from "./filer/mapper/mapper.server";
import { hentJournalposterForSak } from "~/testing/mock-store/journalposter.server";
import { hentFilerForSak } from "./filer/mock-data-filer.server";
import { migreringErÅpen } from "~/migrering/miljo";
import { migreringsnotatSeed } from "~/testing/mock-store/dokumenter.server";
import { hentMockState } from "~/testing/mock-store/session.server";
import { erSakseier } from "./handlinger/tilgjengeligeHandlinger";
import { hentMockTillatteHandlinger } from "./mock-tillatte-handlinger.server";
import { hentHistorikk } from "./historikk/mock-data.server";
import { finnSakMedReferanse } from "./id";
import { kanLeseSaksinnhold } from "./sakstilgang";
import type { Route } from "./+types/SakDetaljSide.route";

// --- Loader ---

/**
 * Henter filer for saken, men behandler manglende fil-tilgang (HTTP 403) som en
 * gyldig tilstand i stedet for en feil.
 *
 * Backend (`FilTilgangService`) kan gi fil-tilgang til flere roller enn eier og
 * delt-med (bl.a. den som opprettet saken eller er ansvarlig på en koblet sak),
 * men enkeltdokumenter kan likevel ikke åpnes av disse rollene. Sakssiden viser
 * derfor filområdet kun for eier/delt-med (se `kanSeFilområde` i
 * `SakDetaljSide.route.tsx`) uavhengig av `harFilTilgang` — feltet brukes her
 * kun til å behandle 403 fra `hentFiler` som en gyldig tilstand, ikke som feil.
 *
 * Kalles fra `Promise.all` i loaderen — dersom `hentFiler` hadde kastet uhåndtert
 * herfra, ville hele loaderen (og dermed hele sakssiden) feilet for enhver
 * saksbehandler uten fil-tilgang, se opprinnelig bug.
 *
 * Andre feil enn 403 (5xx, nettverksfeil o.l.) kastes videre som reelle feil.
 */
async function hentFilerMedTilgangskontroll(
  token: string,
  sakId: string,
): Promise<{ filer: FilResponse[]; harFilTilgang: boolean }> {
  try {
    const filer = await backendApi.hentFiler(token, sakId);
    return { filer, harFilTilgang: true };
  } catch (feil) {
    if (feil instanceof backendApi.BackendFeilException && feil.status === 403) {
      return { filer: [], harFilTilgang: false };
    }
    throw feil;
  }
}

async function hentHistorikkMedTilgangskontroll(
  token: string,
  sakId: string,
): Promise<Awaited<ReturnType<typeof backendApi.hentHendelser>>> {
  try {
    return await backendApi.hentHendelser(token, sakId);
  } catch (feil) {
    if (feil instanceof backendApi.BackendFeilException && feil.status === 403) {
      return [];
    }
    throw feil;
  }
}

async function hentJournalposterMedTilgangskontroll(
  token: string,
  sakId: string,
): Promise<Awaited<ReturnType<typeof backendApi.hentJournalposter>>> {
  try {
    return await backendApi.hentJournalposter(token, sakId);
  } catch (feil) {
    if (feil instanceof backendApi.BackendFeilException && feil.status === 403) {
      return [];
    }
    throw feil;
  }
}

async function hentTillatteHandlingerMedTilgangskontroll(
  token: string,
  sakId: string,
  sakPromise: Promise<KontrollsakResponse>,
): Promise<TillatteHandlingerResponse> {
  const sak = await sakPromise;
  try {
    return await backendApi.hentTillatteHandlinger(token, sakId);
  } catch (feil) {
    if (feil instanceof backendApi.BackendFeilException && feil.status === 403) {
      logger.warn("Mangler tilgang til å hente tillatte handlinger", { sakId });
      return {
        versjon: 1,
        tilstand: {
          steg: sak.steg,
          status: sak.status,
          statusFørBero: null,
          resultat: sak.resultat ?? null,
          ytelser: sak.ytelser.map((ytelse, indeks) => ({
            ...ytelse,
            id:
              ytelse.id ??
              `00000000-0000-4000-8000-${(sak.id + indeks).toString(16).padStart(12, "0")}`,
          })),
        },
        handlinger: [],
        tillatteSteg: [],
        tillatteStatuser: [],
        tillatteResultater: [],
        paakrevdeRegistreringer: [],
        paakrevdeRegistreringerPerSteg: {},
        feltskjema: [],
      };
    }
    throw feil;
  }
}

async function hentAndreSakerMedTilgangskontroll(
  token: string,
  sak: KontrollsakResponse,
): Promise<KontrollsakResponse[]> {
  if (!sak.personIdent || sak.tilgang?.kanSeRelaterteSaker === false) {
    return [];
  }

  try {
    const søkeresultat = await backendApi.søkKontrollsaker(token, sak.personIdent, 1, 100);
    return søkeresultat.items.filter((annenSak) => annenSak.id !== sak.id);
  } catch (feil) {
    if (feil instanceof backendApi.BackendFeilException && feil.status === 403) {
      logger.warn("Mangler tilgang til å hente relaterte saker", { sakId: sak.id });
      return [];
    }
    throw feil;
  }
}

export async function loader({ request, params }: Route.LoaderArgs) {
  if (!skalBrukeMockdata) {
    const token = await getBackendOboToken(request);
    const sakId = params.sakId;
    const sakPromise = backendApi.hentKontrollsak(token, sakId);

    const [
      sak,
      historikk,
      journalposter,
      saksbehandlerDetaljer,
      filerResultat,
      tillatteHandlinger,
      innlogget,
      mapper,
    ] = await Promise.all([
      sakPromise,
      hentHistorikkMedTilgangskontroll(token, sakId),
      hentJournalposterMedTilgangskontroll(token, sakId),
      backendApi.hentSaksbehandlere(token),
      hentFilerMedTilgangskontroll(token, sakId),
      hentTillatteHandlingerMedTilgangskontroll(token, sakId, sakPromise),
      hentInnloggetBruker({ request }),
      hentMapperstier(token, sakId),
    ]);

    // Henter kun første side (maks 100 saker) — visningen på sakdetaljsiden er en enkel
    // liste over "andre saker for personen", ikke en fullstendig paginert visning.
    const andreSaker = await hentAndreSakerMedTilgangskontroll(token, sak);

    // Dokumenter/filer skal kun eksponeres i loader-responsen (og dermed nås av klienten)
    // for saksbehandlere med lesetilgang — se `kanLeseSaksinnhold`, som også styrer
    // UI-visningen i SakDetaljSide.route.tsx. Uten denne sperren ville
    // metadata om dokumenter/filer likevel bli sendt til klienten i SSR-payloaden
    // selv om komponenten ikke rendrer dem. Sperren må gjelde både det dedikerte
    // `dokumenter`-feltet og `sak.dokumenter` (samme metadata nøstet i sak-objektet),
    // ellers lekker dokumentmetadata likevel via `sak` i loader-responsen.
    const erEier = erSakseier(sak, innlogget.navIdent);
    const harDirekteTilgang = kanLeseSaksinnhold(sak, innlogget);
    const sakForRespons = harDirekteTilgang ? sak : { ...sak, dokumenter: [] };
    let kandidat = null;
    if (migreringErÅpen(env.ENVIRONMENT) && erEier && sak.legacyKilde && sak.legacyPid) {
      try {
        kandidat = await hentMigreringskandidat(request, `${sak.legacyKilde}:${sak.legacyPid}`);
      } catch (feil) {
        // Eldre saker kan ha PID uten at de er lastet inn i migreringstabellen ennå.
        if (!(feil instanceof Response && feil.status === 404)) throw feil;
      }
    }
    const migreringsstatus =
      kandidat?.alleredeMigrertTilKontrollsakId === sak.id &&
      kandidat.personIdent === sak.personIdent
        ? (kandidat.migreringsstatus ?? null)
        : null;

    return {
      sak: sakForRespons,
      migreringsstatus,
      migreringsnotatEksempel: null,
      tillatteHandlinger,
      historikk,
      journalposter: harDirekteTilgang ? journalposter : [],
      dokumenter: harDirekteTilgang ? sak.dokumenter : [],
      filer: harDirekteTilgang ? filerResultat.filer : [],
      mapper: harDirekteTilgang ? mapper : [],
      harFilTilgang: filerResultat.harFilTilgang,
      andreSaker,
      saksbehandlere: saksbehandlerDetaljer.map((sb) => sb.navn),
      saksbehandlerDetaljer,
      seksjoner: mockSeksjoner,
    };
  }

  const alleSaker = hentAlleSaker(request);
  const rawSak = finnSakMedReferanse(alleSaker, params.sakId);
  if (!rawSak) {
    throw data("Sak ikke funnet", { status: 404 });
  }
  const innlogget = await hentInnloggetBruker({ request });
  const sak = medInnloggetEier(rawSak, innlogget.navIdent, innlogget.name);
  const erEier = sak.saksbehandlere.eier?.navIdent === innlogget.navIdent;
  // Kun syntetisk visning for sakseier: samsvar på kilde, PID, person og saks-ID.
  // En opprettet sak betyr aldri i seg selv at migreringen er fullstendig.
  const migreringsstatus =
    erEier && sak.legacyPid && sak.legacyKilde
      ? (hentMockMigreringKandidater(innlogget.navIdent).find(
          (k) =>
            k.legacyKilde === sak.legacyKilde &&
            k.legacyPid === sak.legacyPid &&
            k.personIdent === sak.personIdent &&
            k.alleredeMigrertTilKontrollsakId === sak.id,
        )?.migreringsstatus ?? null)
      : null;
  const tillatteHandlinger = hentMockTillatteHandlinger(sak);
  const historikk = hentHistorikk(request, String(sak.id));
  const harDeltTilgang = sak.saksbehandlere.deltMed.some((s) => s.navIdent === innlogget.navIdent);
  const harTilgangViaKobling = sak.kobledeSaker.some(
    (kobletId) =>
      alleSaker.find((s) => s.id === kobletId)?.saksbehandlere.eier?.navIdent ===
      innlogget.navIdent,
  );
  const harFilTilgang = erEier || harDeltTilgang || harTilgangViaKobling;
  // Lesetilgang (eier/delt-med/leder, eller avsluttet sak) gir rett til å se dokumenter/filer.
  // `harFilTilgang` er bredere (inkluderer tilgang via koblet sak) og brukes ikke til å
  // avgjøre om dokument-/filmetadata skal eksponeres i loader-responsen.
  const harDirekteTilgang = kanLeseSaksinnhold(sak, innlogget);
  const dokumenter = harDirekteTilgang ? hentDokumenttreForSak(request, String(sak.id)) : [];
  const migreringsnotatEksempel =
    erEier &&
    migreringsstatus === "FULLSTENDIG" &&
    dokumenter.some((dokument) => dokument.id === migreringsnotatSeed.id && !dokument.arkivert)
      ? {
          id: migreringsnotatSeed.id,
          tittel: migreringsnotatSeed.tittel,
          tekst: migreringsnotatSeed.avsnitt.join(" "),
          opprettetDato: migreringsnotatSeed.opprettetDato,
        }
      : null;
  const filer = harDirekteTilgang ? hentFilerForSak(request, String(sak.id)) : [];
  const mapper = harDirekteTilgang ? hentMapperstierFraMock(request, String(sak.id)) : [];
  const andreSaker = alleSaker.filter(
    (annenSak) => annenSak.personIdent === sak.personIdent && annenSak.id !== sak.id,
  );
  return {
    sak,
    migreringsstatus,
    migreringsnotatEksempel,
    tillatteHandlinger,
    historikk,
    journalposter: harDirekteTilgang
      ? hentJournalposterForSak(hentMockState(request), String(sak.id))
      : [],
    dokumenter,
    filer,
    mapper,
    harFilTilgang,
    andreSaker,
    saksbehandlere: mockSaksbehandlere,
    saksbehandlerDetaljer: mockSaksbehandlerDetaljer,
    seksjoner: mockSeksjoner,
  };
}
