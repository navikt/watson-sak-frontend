import { data } from "react-router";
import { getBackendOboToken } from "~/auth/access-token";
import { hentInnloggetBruker } from "~/auth/innlogget-bruker.server";
import { env, skalBrukeMockdata } from "~/config/env.server";
import {
  erTekniskFeil,
  hentEllerFeil,
  loggTekniskFeil,
} from "~/feilhåndtering/teknisk-feil.server";
import { logger } from "~/logging/logging";
import { hentMockMigreringKandidater } from "~/migrering/mock-data.server";
import { hentMigreringskandidat } from "~/migrering/api.server";
import * as backendApi from "~/saker/api.server";
import { hentAlleSaker, medInnloggetEier } from "~/saker/mock-alle-saker.server";
import { mockSaksbehandlere, mockSaksbehandlerDetaljer } from "~/saker/mock-saksbehandlere.server";
import { mockSeksjoner } from "~/saker/mock-seksjoner.server";
import type { KontrollsakResponse, TillatteHandlingerResponse } from "~/saker/types.backend";
import { kontrollsakAvvisningsgrunnSchema } from "~/saker/types.backend";
import { hentDokumenttreForSak } from "./filer/mock-data.server";
import { hentMapperstier, hentMapperstierFraMock } from "./filer/mapper/mapper.server";
import { hentFilerForSak } from "./filer/mock-data-filer.server";
import { migreringErÅpen } from "~/migrering/miljo";
import { migreringsnotatSeed } from "~/testing/mock-store/dokumenter.server";
import { erSakseier } from "./handlinger/tilgjengeligeHandlinger";
import { hentMockTillatteHandlinger } from "./mock-tillatte-handlinger.server";
import { hentHistorikk } from "./historikk/mock-data.server";
import { finnSakMedReferanse } from "./id";
import { kanLeseSaksinnhold, kanSeFilområdet } from "./sakstilgang";
import { parseSakId } from "~/saker/sti-param.server";
import type { Route } from "./+types/SakDetaljSide.route";

// --- Loader ---

const RELATERTE_SAKER_SIDESTORRELSE = 10;

function hentRelaterteSakerSide(request: Request): number {
  const verdi = new URL(request.url).searchParams.get("relaterteSaker");
  const side = Number.parseInt(verdi ?? "", 10);
  return Number.isInteger(side) && side >= 1 ? side : 1;
}

/**
 * Uten tillatte handlinger viser vi ingen handlinger (fail closed). Brukes både ved 403
 * og ved teknisk feil, så en feil aldri gir flere handlinger enn tilgangen tillater.
 */
function ingenTillatteHandlinger(sak: KontrollsakResponse): TillatteHandlingerResponse {
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

/** Feil-ID per seksjon som ikke kunne hentes. Seksjonen viser `<Feilmelding>` i stedet for tom data. */
export type Seksjonsfeil = Partial<
  Record<"historikk" | "filer" | "saksbehandlere" | "tillatteHandlinger" | "andreSaker", string>
>;

const SEKSJONER = [
  "historikk",
  "filer",
  "saksbehandlere",
  "tillatteHandlinger",
  "andreSaker",
] as const;

/**
 * Bare i mock-modus: `?mockFeil=historikk&mockFeil=filer` simulerer teknisk feil i seksjonene,
 * så Playwright kan teste feilmeldingene. Kalles aldri i backend-grenen.
 */
function mockSeksjonsfeil(request: Request): Seksjonsfeil {
  const ønsket = new URL(request.url).searchParams.getAll("mockFeil");
  return Object.fromEntries(
    SEKSJONER.filter((seksjon) => ønsket.includes(seksjon)).map((seksjon) => [seksjon, "mock0001"]),
  );
}

/** Bare mock-modus kan simulere disse tilgangsavslagene med queryparameter. */
function mockAvvisningsgrunn(request: Request) {
  const verdi = new URL(request.url).searchParams.get("mockAvvisningsgrunn");
  const parsed = kontrollsakAvvisningsgrunnSchema.safeParse(verdi);
  return parsed.success ? parsed.data : null;
}

/**
 * 🔴 Kritiske kilder: uten dem kan ikke siden vises. Teknisk feil logges med feil-ID og kastes
 * som 500-svar med ID-en, så route-boundary kan vise samme ID som i loggen.
 * Kjente feil (401, 403, 404, redirect) kastes videre uendret.
 */
async function kritisk<T>(
  hent: Promise<T>,
  loggkontekst: Parameters<typeof loggTekniskFeil>[1],
): Promise<T> {
  try {
    return await hent;
  } catch (feil) {
    if (!erTekniskFeil(feil)) throw feil;
    throw data({ feilId: loggTekniskFeil(feil, loggkontekst) }, { status: 500 });
  }
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const sakId = parseSakId(params.sakId);
  const relaterteSakerSide = hentRelaterteSakerSide(request);
  if (!skalBrukeMockdata) {
    const token = await getBackendOboToken(request);
    const logg = { sakId, request };

    // Hent detaljsaken først. Ved målrettet 403 skal ingen andre saksdata lastes.
    const detaljResultat = await kritisk(backendApi.hentKontrollsakForDetalj(token, sakId), {
      ...logg,
      kontekst: "hente sak",
    });
    if (detaljResultat.status === "avvist") {
      throw data({ avvisningsgrunn: detaljResultat.avvisningsgrunn }, { status: 403 });
    }
    const sak = detaljResultat.sak;

    // Innlogget bruker er også kritisk. Resten er seksjoner som feiler hver for seg.
    const [
      innlogget,
      historikkUtfall,
      saksbehandlereUtfall,
      filerUtfall,
      mapperUtfall,
      tillatteHandlingerUtfall,
    ] = await Promise.all([
      kritisk(hentInnloggetBruker({ request }), { ...logg, kontekst: "hente innlogget bruker" }),
      hentEllerFeil(() => backendApi.hentHendelser(token, sakId), {
        ...logg,
        kontekst: "hente historikk",
      }),
      hentEllerFeil(() => backendApi.hentSaksbehandlere(token), {
        ...logg,
        kontekst: "hente saksbehandlere",
      }),
      // Backend (`FilTilgangService`) svarer 403 når saken er fordelt og innlogget ikke er
      // eier eller delt med, og 404 når innlogget mangler tilgang til personen (så svaret
      // ikke avslører at saken finnes). Begge betyr «ingen filer å vise».
      hentEllerFeil(() => backendApi.hentFiler(token, sakId), {
        ...logg,
        kontekst: "hente filer",
        ingenTilgangStatuser: [403, 404],
      }),
      hentEllerFeil(() => hentMapperstier(token, sakId), { ...logg, kontekst: "hente mapper" }),
      hentEllerFeil(() => backendApi.hentTillatteHandlinger(token, sakId), {
        ...logg,
        kontekst: "hente tillatte handlinger",
      }),
    ]);

    if (tillatteHandlingerUtfall.status === "ingenTilgang") {
      logger.warn("Mangler tilgang til å hente tillatte handlinger", { sakId });
    }
    const tillatteHandlinger =
      tillatteHandlingerUtfall.status === "ok"
        ? tillatteHandlingerUtfall.data
        : ingenTillatteHandlinger(sak);

    // Uten persontilgang eller tilgang til relaterte saker henter vi ingenting. Ved feil viser
    // vi feilmelding, aldri en ufiltrert liste. Tilgangsmaskinen filtrerer i backend.
    const personIdent = sak.personIdent;
    const andreSakerUtfall =
      !personIdent || sak.tilgang?.kanSeRelaterteSaker === false
        ? ({ status: "ikkeHentet" } as const)
        : await hentEllerFeil(
            () =>
              backendApi.søkKontrollsaker(
                token,
                personIdent,
                relaterteSakerSide,
                RELATERTE_SAKER_SIDESTORRELSE,
              ),
            { ...logg, kontekst: "hente andre saker på samme person" },
          );
    if (andreSakerUtfall.status === "ingenTilgang") {
      logger.warn("Mangler tilgang til å hente relaterte saker", { sakId: sak.id });
    }
    const andreSaker =
      andreSakerUtfall.status === "ok"
        ? andreSakerUtfall.data.items.filter((annenSak) => annenSak.id !== sak.id)
        : [];
    const andreSakerSide = {
      side: relaterteSakerSide,
      totalSider: andreSakerUtfall.status === "ok" ? andreSakerUtfall.data.totalPages : 0,
    };

    const historikk = historikkUtfall.status === "ok" ? historikkUtfall.data : [];
    const saksbehandlerDetaljer =
      saksbehandlereUtfall.status === "ok" ? saksbehandlereUtfall.data : [];
    const filerResultat = {
      filer: filerUtfall.status === "ok" ? filerUtfall.data : [],
      harFilTilgang: filerUtfall.status !== "ingenTilgang",
    };
    const mapper = mapperUtfall.status === "ok" ? mapperUtfall.data : [];
    const feilFra = (utfall: { status: string; feilId?: string }) =>
      utfall.status === "feil" ? utfall.feilId : undefined;
    const seksjonsfeil: Seksjonsfeil = {
      historikk: feilFra(historikkUtfall),
      saksbehandlere: feilFra(saksbehandlereUtfall),
      filer: feilFra(filerUtfall) ?? feilFra(mapperUtfall),
      tillatteHandlinger: feilFra(tillatteHandlingerUtfall),
      andreSaker: feilFra(andreSakerUtfall),
    };

    // Dokumenter/filer skal kun eksponeres i loader-responsen (og dermed nås av klienten)
    // for saksbehandlere med lesetilgang — se `kanLeseSaksinnhold`, som også styrer
    // UI-visningen i SakDetaljSide.route.tsx. Uten denne sperren ville
    // metadata om dokumenter/filer likevel bli sendt til klienten i SSR-payloaden
    // selv om komponenten ikke rendrer dem. Sperren må gjelde både det dedikerte
    // `dokumenter`-feltet og `sak.dokumenter` (samme metadata nøstet i sak-objektet),
    // ellers lekker dokumentmetadata likevel via `sak` i loader-responsen. Uten tilgang til
    // personen (`sak.tilgang.kanSeFiler`) gjelder samme sperre, også for eier og delt-med.
    const erEier = erSakseier(sak, innlogget.navIdent);
    const harPersontilgang = sak.tilgang?.kanSeFiler ?? true;
    const harDirekteTilgang = kanLeseSaksinnhold(sak, innlogget) && harPersontilgang;
    // Filer og mapper vises også på ufordelte saker, se `kanSeFilområdet`.
    const kanSeFiler = kanSeFilområdet(sak, innlogget) && harPersontilgang;
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
      dokumenter: harDirekteTilgang ? sak.dokumenter : [],
      filer: kanSeFiler ? filerResultat.filer : [],
      mapper: kanSeFiler ? mapper : [],
      harFilTilgang: filerResultat.harFilTilgang,
      andreSaker,
      andreSakerSide,
      saksbehandlere: saksbehandlerDetaljer.map((sb) => sb.navn),
      saksbehandlerDetaljer,
      seksjoner: mockSeksjoner,
      seksjonsfeil,
    };
  }

  const mockGrunn = mockAvvisningsgrunn(request);
  if (mockGrunn) {
    throw data({ avvisningsgrunn: mockGrunn }, { status: 403 });
  }

  const alleSaker = hentAlleSaker(request);
  const rawSak = finnSakMedReferanse(alleSaker, sakId);
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
  const seksjonsfeil = mockSeksjonsfeil(request);
  const tillatteHandlinger = seksjonsfeil.tillatteHandlinger
    ? ingenTillatteHandlinger(sak)
    : hentMockTillatteHandlinger(sak);
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
  const harDirekteTilgang = kanLeseSaksinnhold(sak, innlogget) && (sak.tilgang?.kanSeFiler ?? true);
  const kanSeFiler = kanSeFilområdet(sak, innlogget) && (sak.tilgang?.kanSeFiler ?? true);
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
  const filer = kanSeFiler ? hentFilerForSak(request, String(sak.id)) : [];
  const mapper = kanSeFiler ? hentMapperstierFraMock(request, String(sak.id)) : [];
  const relaterteSaker =
    !sak.personIdent || sak.tilgang?.kanSeRelaterteSaker === false
      ? []
      : alleSaker.filter(
          (annenSak) => annenSak.personIdent === sak.personIdent && annenSak.id !== sak.id,
        );
  const totalSider = Math.ceil(relaterteSaker.length / RELATERTE_SAKER_SIDESTORRELSE);
  const start = (relaterteSakerSide - 1) * RELATERTE_SAKER_SIDESTORRELSE;
  const andreSaker = relaterteSaker.slice(start, start + RELATERTE_SAKER_SIDESTORRELSE);
  // Backend setter `tilgang` på saken. Mocksakene mangler den, så vi speiler
  // backend sin arkivregel: den som kan lese saksinnholdet, kan se arkivet.
  // Mock-ledere leder bare sin egen enhet.
  const ledetEnheter = innlogget.erLeder && innlogget.enhetId ? [innlogget.enhetId] : [];
  const sakMedTilgang = {
    ...sak,
    tilgang: {
      harTilgangTilKontrollobjekt: true,
      kanSeHistorikk: true,
      kanSeRelaterteSaker: true,
      kanTildeleSak: true,
      kanSeFiler: true,
      ...sak.tilgang,
      erLederForSakensEnhet: !!sak.enhet && ledetEnheter.includes(sak.enhet),
      ledetEnheter,
      kanSeArkiv: sak.tilgang?.kanSeArkiv ?? harDirekteTilgang,
    },
  };
  return {
    sak: sakMedTilgang,
    migreringsstatus,
    migreringsnotatEksempel,
    tillatteHandlinger,
    historikk,
    dokumenter,
    filer,
    mapper,
    harFilTilgang,
    andreSaker,
    andreSakerSide: { side: relaterteSakerSide, totalSider },
    saksbehandlere: mockSaksbehandlere,
    saksbehandlerDetaljer: mockSaksbehandlerDetaljer,
    seksjoner: mockSeksjoner,
    seksjonsfeil,
  };
}
