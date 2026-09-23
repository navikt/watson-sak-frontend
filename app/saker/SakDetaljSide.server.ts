import { data } from "react-router";
import { getBackendOboToken } from "~/auth/access-token";
import { hentInnloggetBruker } from "~/auth/innlogget-bruker.server";
import { skalBrukeMockdata } from "~/config/env.server";
import { logger } from "~/logging/logging";
import { redigerSaksinformasjonSchema } from "~/registrer-sak/validering";
import {
  bygFeilkartFraIssues,
  parseYtelseRader,
  type YtelseRadVerdier,
} from "~/registrer-sak/skjema-helpers";
import * as backendApi from "~/saker/api.server";
import { hentAlleSaker, medInnloggetEier } from "~/saker/mock-alle-saker.server";
import { mockSaksbehandlere, mockSaksbehandlerDetaljer } from "~/saker/mock-saksbehandlere.server";
import { mockSeksjoner } from "~/saker/mock-seksjoner.server";
import type {
  KontrollsakResponse,
  KontrollsakSaksbehandler,
  KontrollsakSteg,
  KontrollsakStatus,
  LagreResultatRequest,
  TillatteHandlingerResponse,
} from "~/saker/types.backend";
import type { FilResponse } from "~/saker/filer/typer";
import { lagIsoTidspunktFraNorskDatoTid } from "~/utils/date-utils";
import { hentTekstfelt, hentValgfriTekst } from "~/utils/form-data";
import { hentDokumenttreForSak } from "./filer/mock-data.server";
import {
  arkiverFil,
  hentFilerForSak,
  opprettArkivertFilFraDokument,
} from "./filer/mock-data-filer.server";
import { arkiverDokument } from "~/testing/mock-store/dokumenter.server";
import { hentMockState } from "~/testing/mock-store/session.server";
import { notatMalValg } from "./handlinger/notatValg";
import { byggLagreResultatRequest, validerResultatFeltNavn } from "./handlinger/resultat-request";
import { erAktivSakKontrollsak, erSakseier } from "./handlinger/tilgjengeligeHandlinger";
import {
  erGyldigMockStegovergang,
  hentMockTillatteHandlinger,
} from "./mock-tillatte-handlinger.server";
import {
  erHenlagtIGjeldendeSteg,
  harLagretResultatForOvergang,
  hentVisbareSteg,
  manglerEndeligUtfallVedAvslutning,
} from "./handlinger/tillatte-steg";
import {
  hentHistorikk,
  leggTilHendelse,
  leggTilManuellHendelse,
  redigerManuellHendelse,
  slettManuellHendelse,
} from "./historikk/mock-data.server";
import { finnSakMedReferanse } from "./id";
import { getSaksenhet } from "./selectors";
import { hentStegbaserteSaksregler } from "./stegregler";
import type { Route } from "./+types/SakDetaljSide.route";

type RedigerteSaksinformasjonsverdier = ReturnType<typeof redigerSaksinformasjonSchema.parse>;

/** Feltnavn slik de vises for saksbehandler i historikken. */
const SAKSINFORMASJON_FELTNAVN = {
  kategori: "kategori",
  misbrukstype: "misbrukstype",
  merking: "merking",
  kilde: "kilde",
  organisasjonsnummer: "organisasjonsnummer",
  ytelser: "ytelser",
} as const;

/**
 * Misbrukstype, merking og organisasjonsnummer er mengder — rekkefølgen har
 * ingen betydning for saksbehandleren, så en omstokking skal ikke gi
 * historikkinnslag.
 */
function erLikeMengder(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const sortertA = [...a].sort();
  const sortertB = [...b].sort();
  return sortertA.every((verdi, indeks) => verdi === sortertB[indeks]);
}

/** Finner hvilke saksinformasjonsfelter som faktisk endrer verdi, i visningsrekkefølge. */
function finnEndredeSaksinformasjonsfelter(
  sak: KontrollsakResponse,
  validert: RedigerteSaksinformasjonsverdier,
  nyeYtelser: KontrollsakResponse["ytelser"],
): string[] {
  const endrede: string[] = [];

  if (sak.kategori !== validert.kategori) {
    endrede.push(SAKSINFORMASJON_FELTNAVN.kategori);
  }
  if (!erLikeMengder(sak.misbruktype ?? [], validert.misbruktype)) {
    endrede.push(SAKSINFORMASJON_FELTNAVN.misbrukstype);
  }
  if (!erLikeMengder(sak.merking ?? [], validert.merking)) {
    endrede.push(SAKSINFORMASJON_FELTNAVN.merking);
  }
  if (sak.kilde !== validert.kilde) {
    endrede.push(SAKSINFORMASJON_FELTNAVN.kilde);
  }
  if (!erLikeMengder(sak.arbeidsgivere ?? [], validert.arbeidsgivere)) {
    endrede.push(SAKSINFORMASJON_FELTNAVN.organisasjonsnummer);
  }
  if (JSON.stringify(sak.ytelser) !== JSON.stringify(nyeYtelser)) {
    endrede.push(SAKSINFORMASJON_FELTNAVN.ytelser);
  }

  return endrede;
}

/** Lager historikkbeskrivelsen «Endret kategori, kilde og ytelser». */
function beskrivEndredeFelter(felter: string[]): string {
  if (felter.length === 0) {
    return "Saksinformasjonen ble lagret uten endringer.";
  }

  if (felter.length === 1) {
    return `Endret ${felter[0]}.`;
  }

  const alleUnntattSiste = felter.slice(0, -1).join(", ");
  return `Endret ${alleUnntattSiste} og ${felter[felter.length - 1]}.`;
}

function normaliserArbeidsgiverFeil(feil: Record<string, string[]>): Record<string, string[]> {
  const resultat: Record<string, string[]> = {};
  for (const [nøkkel, meldinger] of Object.entries(feil)) {
    const overordnet = nøkkel.replace(/^(arbeidsgivere)\.\d+$/, "$1");
    (resultat[overordnet] ??= []).push(...meldinger);
  }
  return resultat;
}

/**
 * Oversetter en feil fra et manuelt historikk-kall (opprett/rediger/slett) til
 * en brukervennlig melding. Bruker backendens egen feilmelding når den finnes
 * OG statuskoden indikerer en forventet, klientrettet feil (f.eks. 409
 * Conflict ved BigQuerys streaming buffer, eller 400/403/404) — disse
 * meldingene er skrevet for sluttbruker. Ved 5xx (interne serverfeil) brukes
 * en generisk melding i stedet, siden slike feil kan inneholde tekniske
 * detaljer som ikke bør vises til saksbehandleren.
 */
export function historikkFeilmelding(feil: unknown): string {
  if (feil instanceof backendApi.BackendFeilException && feil.status < 500) {
    return feil.message;
  }
  logger.error("Uventet feil ved historikk-handling", { feil });
  return "Kunne ikke lagre historikkinnslaget. Prøv igjen.";
}

function koblingsFeilmelding(feil: unknown): string {
  if (feil instanceof backendApi.BackendFeilException && feil.status < 500) {
    return feil.message;
  }
  const feiltype = feil instanceof Error ? feil.name : typeof feil;
  const status = feil instanceof backendApi.BackendFeilException ? feil.status : undefined;
  logger.error("Uventet feil ved endring av sakskobling, feiltype={}, status={}", {
    feiltype,
    status,
  });
  return "Kunne ikke endre koblingen. Prøv igjen.";
}

// --- Typer ---

type Feltfeil = Record<string, string[]>;

type RedigerSaksinformasjonData = {
  kategori: string;
  kilde: string;
  misbruktype: string[];
  merking: string[];
  arbeidsgivere: string[];
  ytelser: YtelseRadVerdier[];
};

type ActionResult =
  | { ok: true; sak?: Route.ComponentProps["loaderData"]["sak"] }
  | { ok: false; feil: Feltfeil; verdier?: RedigerSaksinformasjonData };

// --- Hjelpefunksjoner ---

const gyldigeStatuser = new Set<KontrollsakStatus>([
  "AKTIV",
  "VENTER_PA_INFORMASJON",
  "VENTER_PA_VEDTAK",
  "VENTER_PA_RESULTAT",
  "I_BERO",
]);

function erGyldigStatus(verdi: string): verdi is KontrollsakStatus {
  return gyldigeStatuser.has(verdi as KontrollsakStatus);
}

function parseStatusFraDialog(verdi: string | undefined): KontrollsakStatus | null {
  if (verdi === undefined || verdi === "" || verdi === "__NULL__") {
    return null;
  }
  if (!erGyldigStatus(verdi)) {
    throw data("Ugyldig arbeidsstatus", { status: 400 });
  }
  return verdi;
}

function krevTillattHandling(
  tillatteHandlinger: TillatteHandlingerResponse,
  type: TillatteHandlingerResponse["handlinger"][number]["type"],
): void {
  if (type === "HENLEGG" && erHenlagtIGjeldendeSteg(tillatteHandlinger.tilstand)) {
    throw data("Saken er allerede henlagt i gjeldende steg", { status: 409 });
  }
  if (!tillatteHandlinger.handlinger.some((handling) => handling.type === type)) {
    throw data("Handlingen er ikke tillatt for saken i gjeldende tilstand", { status: 409 });
  }
}

function getHendelsestypeForStatusendring(status: KontrollsakStatus) {
  if (status === "I_BERO") return "SAK_SATT_I_BERO";
  if (status === "AKTIV") return "SAK_GJENOPPTATT";
  return "SAK_SATT_PA_VENT";
}

function getHendelsestypeForStegendring(steg: KontrollsakSteg) {
  switch (steg) {
    case "POLITI":
      return "POLITIANMELDT";
    default:
      return "STATUS_ENDRET";
  }
}

function lagreMockResultat(sak: KontrollsakResponse, resultat: LagreResultatRequest): void {
  sak.resultat = {
    ...sak.resultat,
    ...(resultat.utredning ? { utredning: resultat.utredning } : {}),
    ...(resultat.forvaltning ? { forvaltning: resultat.forvaltning } : {}),
    ...(resultat.strafferettsligVurdering
      ? { strafferettsligVurdering: resultat.strafferettsligVurdering }
      : {}),
    ...(resultat.politi ? { politi: resultat.politi } : {}),
  };
  if (resultat.ytelser) {
    const belopPerYtelse = new Map(resultat.ytelser.map((ytelse) => [ytelse.id, ytelse]));
    sak.ytelser = sak.ytelser.map((ytelse) => {
      const belop = ytelse.id ? belopPerYtelse.get(ytelse.id) : undefined;
      return belop
        ? {
            ...ytelse,
            ...(belop.belop !== undefined ? { belop: belop.belop } : {}),
            ...(belop.endeligBelop !== undefined ? { endeligBelop: belop.endeligBelop } : {}),
          }
        : ytelse;
    });
  }
}

function finnSaksbehandlerDetalj(
  saksbehandlerDetaljer: KontrollsakSaksbehandler[],
  navIdent: string,
) {
  return (
    saksbehandlerDetaljer.find(
      (saksbehandler) => saksbehandler.navIdent === navIdent || saksbehandler.navn === navIdent,
    ) ?? null
  );
}

function lagTidspunktFraSkjema(dato: string, tid: string): string {
  return lagIsoTidspunktFraNorskDatoTid(dato, tid);
}

function finnNotatMalLabel(verdi: FormDataEntryValue | null): string | undefined {
  if (typeof verdi !== "string" || verdi.length === 0) return undefined;
  return notatMalValg.find((mal) => mal.verdi === verdi)?.label;
}

// --- Hjelpefunksjoner for tilgangskontroll ---

/** Handlinger som tillates uten å være sakseier */
const tildelingshandlinger = new Set([
  "TILDEL",
  "TILDEL_MEG",
  "FRISTILL",
  "overfor_ansvarlig",
  "send_til_annen_enhet",
  "videresend_seksjon",
]);
const koblingshandlinger = new Set(["koble_sak", "fjern_kobling"]);
const handlingerSomKreverUtredning = new Set([
  "del_tilgang",
  "fjern_delt_tilgang",
  "send_notat",
  "opprett_journalpost",
  "opprett_oppgave",
  "legg_til_historikk",
]);

function erTildelingshandling(handling: string): boolean {
  return tildelingshandlinger.has(handling);
}

function erKoblingshandling(handling: string): boolean {
  return koblingshandlinger.has(handling);
}

function erSaksbehandlerPåSak(sak: KontrollsakResponse, navIdent: string): boolean {
  return (
    sak.saksbehandlere.eier?.navIdent === navIdent ||
    sak.saksbehandlere.deltMed.some((saksbehandler) => saksbehandler.navIdent === navIdent)
  );
}

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
    ] = await Promise.all([
      sakPromise,
      hentHistorikkMedTilgangskontroll(token, sakId),
      hentJournalposterMedTilgangskontroll(token, sakId),
      backendApi.hentSaksbehandlere(token),
      hentFilerMedTilgangskontroll(token, sakId),
      hentTillatteHandlingerMedTilgangskontroll(token, sakId, sakPromise),
      hentInnloggetBruker({ request }),
    ]);

    // Henter kun første side (maks 100 saker) — visningen på sakdetaljsiden er en enkel
    // liste over "andre saker for personen", ikke en fullstendig paginert visning.
    const andreSaker = await hentAndreSakerMedTilgangskontroll(token, sak);

    // Dokumenter/filer skal kun eksponeres i loader-responsen (og dermed nås av klienten)
    // for saksbehandlere med direkte tilgang (eier/delt-med/leder) — se `kanSeFilområde` i
    // SakDetaljSide.route.tsx, som styrer UI-visningen. Uten denne sperren ville
    // metadata om dokumenter/filer likevel bli sendt til klienten i SSR-payloaden
    // selv om komponenten ikke rendrer dem. Sperren må gjelde både det dedikerte
    // `dokumenter`-feltet og `sak.dokumenter` (samme metadata nøstet i sak-objektet),
    // ellers lekker dokumentmetadata likevel via `sak` i loader-responsen.
    const erEier = erSakseier(sak, innlogget.navIdent);
    const harDeltTilgang = sak.saksbehandlere.deltMed.some(
      (s) => s.navIdent === innlogget.navIdent,
    );
    const harDirekteTilgang = erEier || harDeltTilgang || innlogget.erLeder;
    const sakForRespons = harDirekteTilgang ? sak : { ...sak, dokumenter: [] };

    return {
      sak: sakForRespons,
      tillatteHandlinger,
      historikk,
      journalposter,
      dokumenter: harDirekteTilgang ? sak.dokumenter : [],
      filer: harDirekteTilgang ? filerResultat.filer : [],
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
  const tillatteHandlinger = hentMockTillatteHandlinger(sak);
  const historikk = hentHistorikk(request, String(sak.id));
  const erEier = sak.saksbehandlere.eier?.navIdent === innlogget.navIdent;
  const harDeltTilgang = sak.saksbehandlere.deltMed.some((s) => s.navIdent === innlogget.navIdent);
  const harTilgangViaKobling = sak.kobledeSaker.some(
    (kobletId) =>
      alleSaker.find((s) => s.id === kobletId)?.saksbehandlere.eier?.navIdent ===
      innlogget.navIdent,
  );
  const harFilTilgang = erEier || harDeltTilgang || harTilgangViaKobling;
  // Kun direkte tilgang (eier/delt-med) gir rett til å se dokumenter/filer i UI-en
  // (se `kanSeFilområde` i SakDetaljSide.route.tsx). `harFilTilgang` er bredere
  // (inkluderer tilgang via koblet sak) og brukes ikke til å avgjøre om
  // dokument-/filmetadata skal eksponeres i loader-responsen.
  const harDirekteTilgang = erEier || harDeltTilgang || innlogget.erLeder;
  const dokumenter = harDirekteTilgang ? hentDokumenttreForSak(request, String(sak.id)) : [];
  const filer = harDirekteTilgang ? hentFilerForSak(request, String(sak.id)) : [];
  const andreSaker = alleSaker.filter(
    (annenSak) => annenSak.personIdent === sak.personIdent && annenSak.id !== sak.id,
  );
  return {
    sak,
    tillatteHandlinger,
    historikk,
    journalposter: [],
    dokumenter,
    filer,
    harFilTilgang,
    andreSaker,
    saksbehandlere: mockSaksbehandlere,
    saksbehandlerDetaljer: mockSaksbehandlerDetaljer,
    seksjoner: mockSeksjoner,
  };
}

// --- Action ---

export async function action({ request, params }: Route.ActionArgs) {
  const formData = await request.formData();
  const handling = hentTekstfelt(formData, "handling", "Ugyldig handling");
  const sakId = params.sakId;

  if (!skalBrukeMockdata) {
    return backendAction(request, sakId, handling, formData);
  }

  return mockAction(request, sakId, handling, formData);
}

// --- Backend-action (ekte API-kall) ---

async function backendAction(
  request: Request,
  sakId: string,
  handling: string,
  formData: FormData,
): Promise<ActionResult> {
  const token = await getBackendOboToken(request);
  let sakFraTilgangskontroll: Route.ComponentProps["loaderData"]["sak"] | undefined;

  if (!erTildelingshandling(handling) && !erKoblingshandling(handling)) {
    const innlogget = await hentInnloggetBruker({ request });
    const nåværendeSak = await backendApi.hentKontrollsak(token, sakId);
    if (nåværendeSak.saksbehandlere.eier?.navIdent !== innlogget.navIdent) {
      throw data("Du må være tildelt saken for å utføre denne handlingen", { status: 403 });
    }
    sakFraTilgangskontroll = nåværendeSak;
  }

  if (
    sakFraTilgangskontroll &&
    !hentStegbaserteSaksregler(sakFraTilgangskontroll.steg).kanUtføreUtredningsarbeid &&
    handlingerSomKreverUtredning.has(handling)
  ) {
    throw data("Handlingen krever at saken har steg Utredes", { status: 400 });
  }

  if (handling === "FRISTILL") {
    const innlogget = await hentInnloggetBruker({ request });
    const nåværendeSak = sakFraTilgangskontroll ?? (await backendApi.hentKontrollsak(token, sakId));
    const erEier = nåværendeSak.saksbehandlere.eier?.navIdent === innlogget.navIdent;
    if (!erEier && !innlogget.erLeder) {
      throw data("Du må være sakens saksbehandler eller leder for å fjerne saksbehandler", {
        status: 403,
      });
    }
  }

  switch (handling) {
    case "TILDEL_MEG": {
      const innlogget = await hentInnloggetBruker({ request });
      const tillatte = await backendApi.hentTillatteHandlinger(token, sakId);
      if (tillatte.tilstand.steg === "OPPRETTET" && !tillatte.tillatteSteg.includes("UTREDNING")) {
        throw data("Saken kan ikke flyttes til Utredning i gjeldende tilstand", { status: 409 });
      }
      const tildelt = await backendApi.tildelKontrollsak(token, sakId, innlogget.navIdent);
      if (tildelt.steg !== "OPPRETTET") return { ok: true, sak: tildelt };

      try {
        const sak = await backendApi.endreSteg(token, sakId, 1, "UTREDNING");
        return { ok: true, sak };
      } catch (feil) {
        if (!(feil instanceof backendApi.BackendFeilException)) throw feil;
        throw data(
          "Saken ble tildelt deg, men kunne ikke flyttes til Utredning. Flytt saken manuelt før du fortsetter.",
          { status: feil.status },
        );
      }
    }
    case "TILDEL": {
      const navIdent = hentTekstfelt(formData, "navIdent", "Ugyldig saksbehandler");
      const sak = await backendApi.tildelKontrollsak(token, sakId, navIdent);
      return { ok: true, sak };
    }
    case "FRISTILL": {
      const sak = await backendApi.fristillKontrollsak(token, sakId);
      return { ok: true, sak };
    }
    case "endre_steg":
    case "endre_steg_dialog": {
      const nyttSteg = hentTekstfelt(formData, "steg", "Ugyldig steg");
      const beskrivelse = hentValgfriTekst(formData, "beskrivelse");
      const tillatte = await backendApi.hentTillatteHandlinger(token, sakId);
      krevTillattHandling(tillatte, "FLYTT_TIL_NESTE_STEG");
      try {
        validerResultatFeltNavn(formData, tillatte.feltskjema, tillatte.tilstand.ytelser);
      } catch (feil) {
        throw data(feil instanceof Error ? feil.message : "Ugyldige skjemafelter", {
          status: 400,
        });
      }
      if (!hentVisbareSteg(tillatte).includes(nyttSteg as KontrollsakSteg)) {
        throw data("Steget er ikke tillatt for saken i gjeldende tilstand", { status: 409 });
      }

      let resultat: LagreResultatRequest | undefined;
      const registrerResultat = formData.get("registrerResultat") === "true";
      if (nyttSteg === "AVSLUTTET" && !registrerResultat) {
        throw data("Registrer resultat før saken flyttes til Avsluttet", { status: 400 });
      }
      if (
        !harLagretResultatForOvergang(tillatte, nyttSteg as KontrollsakSteg) &&
        !registrerResultat
      ) {
        throw data("Registrer resultat før saken flyttes til neste steg", { status: 400 });
      }
      try {
        resultat = byggLagreResultatRequest(
          formData,
          tillatte.feltskjema,
          tillatte.tilstand.steg,
          undefined,
          tillatte.tilstand.ytelser,
          registrerResultat,
        );
      } catch (feil) {
        throw data(feil instanceof Error ? feil.message : "Ugyldige resultatfelter", {
          status: 400,
        });
      }
      if (registrerResultat && !resultat) {
        throw data("Velg et resultat før du fortsetter", { status: 400 });
      }
      if (
        manglerEndeligUtfallVedAvslutning(tillatte.tilstand, nyttSteg as KontrollsakSteg, resultat)
      ) {
        throw data("Velg endelig resultat før du flytter saken til Avsluttet", { status: 400 });
      }
      const sak = await backendApi.endreSteg(
        token,
        sakId,
        tillatte.versjon,
        nyttSteg as KontrollsakSteg,
        resultat,
        beskrivelse ?? undefined,
      );
      return { ok: true, sak };
    }
    case "endre_status": {
      const tillatte = await backendApi.hentTillatteHandlinger(token, sakId);
      krevTillattHandling(tillatte, "ENDRE_STATUS");
      try {
        validerResultatFeltNavn(formData, tillatte.feltskjema);
      } catch (feil) {
        throw data(feil instanceof Error ? feil.message : "Ugyldige skjemafelter", {
          status: 400,
        });
      }
      const status = parseStatusFraDialog(hentValgfriTekst(formData, "status"));
      if (!tillatte.tillatteStatuser.includes(status)) {
        throw data("Statusen er ikke tillatt for saken i gjeldende tilstand", { status: 409 });
      }
      const beskrivelse = hentValgfriTekst(formData, "beskrivelse");
      const sak = await backendApi.endreStatus(token, sakId, status, beskrivelse ?? undefined);
      return { ok: true, sak };
    }
    case "del_tilgang": {
      const navIdent = hentTekstfelt(formData, "navIdent", "Ugyldig saksbehandler");
      const sak = await backendApi.delKontrollsak(token, sakId, navIdent);
      return { ok: true, sak };
    }
    case "send_notat": {
      const notatRaw = formData.get("notat");
      if (typeof notatRaw !== "string" || !notatRaw.trim()) {
        throw data("Notat er påkrevd", { status: 400 });
      }
      const malLabel = finnNotatMalLabel(formData.get("mal"));
      const tittel = malLabel ?? "Notat";
      await backendApi.opprettJournalpost(token, sakId, "NOTAT", tittel, notatRaw.trim());
      return { ok: true };
    }
    case "opprett_journalpost": {
      const journalposttype = hentTekstfelt(
        formData,
        "journalposttype",
        "Journalposttype er påkrevd",
      );
      const tittel = hentTekstfelt(formData, "tittel", "Tittel er påkrevd");
      const innhold = hentTekstfelt(formData, "innhold", "Innhold er påkrevd");
      const vedleggIds = formData.getAll("vedleggId").map(String);
      const dokumentIds = formData.getAll("dokumentId").map(String);
      const knyttTilOppgave = formData.get("knyttTilOppgave") === "true";

      const journalpostRespons = await backendApi.opprettJournalpost(
        token,
        sakId,
        journalposttype,
        tittel.trim(),
        innhold.trim(),
        vedleggIds,
        dokumentIds,
      );

      if (knyttTilOppgave) {
        const tildeltEnhetsnr = hentTekstfelt(
          formData,
          "behandlendeEnhet",
          "Behandlende enhet er påkrevd",
        );
        const prioritet = hentTekstfelt(formData, "prioritet", "Prioritet er påkrevd");
        const fristDato = hentTekstfelt(formData, "frist", "Frist er påkrevd");
        const beskrivelse = hentTekstfelt(formData, "beskrivelse", "Beskrivelse er påkrevd");
        const oppgavetype = hentTekstfelt(formData, "oppgavetype", "Oppgavetype er påkrevd");
        await backendApi.opprettOppgave(
          token,
          sakId,
          tildeltEnhetsnr,
          prioritet,
          fristDato,
          beskrivelse,
          oppgavetype,
          journalpostRespons.journalpostId,
        );
      }

      return { ok: true };
    }
    case "opprett_oppgave": {
      const tildeltEnhetsnr = hentTekstfelt(
        formData,
        "behandlendeEnhet",
        "Behandlende enhet er påkrevd",
      );
      const prioritet = hentTekstfelt(formData, "prioritet", "Prioritet er påkrevd");
      const fristDato = hentTekstfelt(formData, "frist", "Frist er påkrevd");
      const beskrivelse = hentTekstfelt(formData, "beskrivelse", "Beskrivelse er påkrevd");
      const oppgavetype = hentTekstfelt(formData, "oppgavetype", "Oppgavetype er påkrevd");
      await backendApi.opprettOppgave(
        token,
        sakId,
        tildeltEnhetsnr,
        prioritet,
        fristDato,
        beskrivelse,
        oppgavetype,
      );
      return { ok: true };
    }
    case "overfor_ansvarlig": {
      const navIdent = hentTekstfelt(formData, "navIdent", "Ugyldig saksbehandler");
      const sak = await backendApi.overforAnsvarlig(token, sakId, navIdent);
      return { ok: true, sak };
    }
    case "fjern_delt_tilgang": {
      const navIdent = hentTekstfelt(formData, "navIdent", "Ugyldig saksbehandler");
      const sak = await backendApi.fjernDeltTilgang(token, sakId, navIdent);
      return { ok: true, sak };
    }
    case "videresend_seksjon":
    case "send_til_annen_enhet": {
      const enhet = hentTekstfelt(formData, "seksjon", "Ugyldig enhet");
      const beskrivelse = hentValgfriTekst(formData, "beskrivelse");
      await backendApi.videresend(token, sakId, enhet, beskrivelse ?? undefined);
      return { ok: true };
    }
    case "rediger_saksinformasjon": {
      const ytelseRader = parseYtelseRader(formData);
      const rådata = {
        kategori: formData.get("kategori") ?? undefined,
        kilde: formData.get("kilde") ?? undefined,
        misbruktype: formData
          .getAll("misbruktype")
          .filter((v): v is string => typeof v === "string" && v.length > 0),
        merking: formData
          .getAll("merking")
          .filter((v): v is string => typeof v === "string" && v.length > 0),
        arbeidsgivere: formData
          .getAll("arbeidsgivere")
          .filter((v): v is string => typeof v === "string" && v.length > 0),
        ytelser: ytelseRader,
      };

      const resultat = redigerSaksinformasjonSchema.safeParse(rådata);
      if (!resultat.success) {
        return {
          ok: false,
          feil: normaliserArbeidsgiverFeil(bygFeilkartFraIssues(resultat.error.issues)),
          verdier: {
            kategori: typeof rådata.kategori === "string" ? rådata.kategori : "",
            kilde: typeof rådata.kilde === "string" ? rådata.kilde : "",
            misbruktype: rådata.misbruktype,
            merking: rådata.merking,
            arbeidsgivere: rådata.arbeidsgivere,
            ytelser: ytelseRader.length > 0 ? ytelseRader : [{}],
          },
        } satisfies ActionResult;
      }

      const validert = resultat.data;

      await backendApi.redigerKontrollsak(token, sakId, {
        kategori: validert.kategori,
        kilde: validert.kilde,
        misbruktype: validert.misbruktype,
        merking: validert.merking,
        arbeidsgivere: validert.arbeidsgivere.map((orgnr) => ({ organisasjonsnummer: orgnr })),
        ytelser: validert.ytelser.map((y) => ({
          type: y.type ?? "",
          periodeFra: y.fraDato ?? "",
          periodeTil: y.tilDato ?? "",
          belop: y.beløp ?? null,
          endeligBelop: y.endeligBeløp ?? null,
        })),
      });
      return { ok: true };
    }
    case "koble_sak":
    case "fjern_kobling": {
      const kobletSakIdRaw = formData.get("relatertSakId");
      if (typeof kobletSakIdRaw !== "string" || !kobletSakIdRaw.trim()) {
        return {
          ok: false,
          feil: { skjema: ["Mangler sak-ID å koble til"] },
        } satisfies ActionResult;
      }
      const kobletSakId = Number(kobletSakIdRaw);
      if (!Number.isSafeInteger(kobletSakId) || kobletSakId <= 0) {
        return {
          ok: false,
          feil: { skjema: ["Ugyldig sak-ID"] },
        } satisfies ActionResult;
      }
      const innlogget = await hentInnloggetBruker({ request });
      const [nåværendeSak, kobletSak] = await Promise.all([
        backendApi.hentKontrollsak(token, sakId),
        backendApi.hentKontrollsak(token, String(kobletSakId)),
      ]);
      if (
        kobletSak.id === nåværendeSak.id ||
        (handling === "koble_sak" && kobletSak.personIdent !== nåværendeSak.personIdent)
      ) {
        return {
          ok: false,
          feil: { skjema: ["Kan ikke endre kobling til denne saken"] },
        } satisfies ActionResult;
      }
      if (
        !erSaksbehandlerPåSak(nåværendeSak, innlogget.navIdent) &&
        !erSaksbehandlerPåSak(kobletSak, innlogget.navIdent)
      ) {
        throw data("Du må være saksbehandler på minst én av sakene for å endre koblingen", {
          status: 403,
        });
      }
      try {
        await backendApi.kobleSak(
          token,
          sakId,
          kobletSakId,
          handling === "koble_sak" ? "KOBLE" : "FJERN",
        );
        return { ok: true };
      } catch (feil) {
        return {
          ok: false,
          feil: { skjema: [koblingsFeilmelding(feil)] },
        } satisfies ActionResult;
      }
    }
    case "legg_til_historikk": {
      const tittel = hentTekstfelt(formData, "tittel", "Tittel er påkrevd");
      const notat = hentValgfriTekst(formData, "notat") ?? "";
      const dato = hentTekstfelt(formData, "dato", "Dato er påkrevd");
      const tid = hentTekstfelt(formData, "tid", "Tid er påkrevd");
      const tidspunkt = lagTidspunktFraSkjema(dato, tid);
      try {
        await backendApi.opprettManuellHendelse(
          token,
          sakId,
          tittel,
          notat || undefined,
          tidspunkt,
        );
        return { ok: true };
      } catch (feil) {
        return { ok: false, feil: { skjema: [historikkFeilmelding(feil)] } } satisfies ActionResult;
      }
    }
    case "rediger_historikk": {
      const hendelseId = hentTekstfelt(formData, "hendelseId", "Hendelse-ID er påkrevd");
      const tittel = hentTekstfelt(formData, "tittel", "Tittel er påkrevd");
      const notat = hentValgfriTekst(formData, "notat") ?? "";
      const dato = hentTekstfelt(formData, "dato", "Dato er påkrevd");
      const tid = hentTekstfelt(formData, "tid", "Tid er påkrevd");
      const tidspunkt = lagTidspunktFraSkjema(dato, tid);
      try {
        await backendApi.redigerManuellHendelse(
          token,
          sakId,
          hendelseId,
          tittel,
          notat || undefined,
          tidspunkt,
        );
        return { ok: true };
      } catch (feil) {
        return { ok: false, feil: { skjema: [historikkFeilmelding(feil)] } } satisfies ActionResult;
      }
    }
    case "slett_historikk": {
      const hendelseId = hentTekstfelt(formData, "hendelseId", "Hendelse-ID er påkrevd");
      try {
        await backendApi.slettManuellHendelse(token, sakId, hendelseId);
        return { ok: true };
      } catch (feil) {
        return { ok: false, feil: { skjema: [historikkFeilmelding(feil)] } } satisfies ActionResult;
      }
    }
    default: {
      throw data("Ugyldig handling", { status: 400 });
    }
  }
}

function formaterJournalposttype(type: string): string {
  switch (type) {
    case "INNGAAENDE":
      return "Inngående";
    case "UTGAAENDE":
      return "Utgående";
    case "NOTAT":
      return "Notat";
    default:
      return type;
  }
}

function formaterPrioritet(prioritet: string): string {
  switch (prioritet) {
    case "LAV":
      return "lav";
    case "NORMAL":
      return "normal";
    case "HOY":
      return "høy";
    default:
      return prioritet.toLowerCase();
  }
}

// --- Mock-action (lokal mock-tilstand) ---

async function mockAction(
  request: Request,
  sakId: string,
  handling: string,
  formData: FormData,
): Promise<ActionResult> {
  const sak = finnSakMedReferanse(hentAlleSaker(request), sakId);
  if (!sak) {
    throw data("Sak ikke funnet", { status: 404 });
  }

  if (!erTildelingshandling(handling) && !erKoblingshandling(handling)) {
    const innlogget = await hentInnloggetBruker({ request });
    const sakMedEier = medInnloggetEier(sak, innlogget.navIdent, innlogget.name);
    if (sakMedEier.saksbehandlere.eier?.navIdent !== innlogget.navIdent) {
      throw data("Du må være tildelt saken for å utføre denne handlingen", { status: 403 });
    }
  }

  if (handling === "FRISTILL") {
    const innlogget = await hentInnloggetBruker({ request });
    const erEier = sak.saksbehandlere.eier?.navIdent === innlogget.navIdent;
    if (!erEier && !innlogget.erLeder) {
      throw data("Du må være sakens saksbehandler eller leder for å fjerne saksbehandler", {
        status: 403,
      });
    }
  }

  if (
    sak.steg === "AVSLUTTET" &&
    (handling === "endre_steg" || handling === "endre_steg_dialog" || handling === "endre_status")
  ) {
    throw data("Kan ikke endre avsluttet sak", { status: 400 });
  }

  const saksbehandlere = sak.saksbehandlere;
  const tillatte = hentMockTillatteHandlinger(sak);

  if (
    !hentStegbaserteSaksregler(sak.steg).kanUtføreUtredningsarbeid &&
    handlingerSomKreverUtredning.has(handling)
  ) {
    throw data("Handlingen krever at saken har steg Utredes", { status: 400 });
  }

  switch (handling) {
    case "TILDEL_MEG": {
      if (sak.saksbehandlere.eier) {
        throw data("Saken har allerede en saksbehandler", { status: 409 });
      }
      if (sak.steg === "OPPRETTET" && !tillatte.tillatteSteg.includes("UTREDNING")) {
        throw data("Saken kan ikke flyttes til Utredning i gjeldende tilstand", { status: 409 });
      }
      const innlogget = await hentInnloggetBruker({ request });
      const valgtSaksbehandler = finnSaksbehandlerDetalj(
        mockSaksbehandlerDetaljer,
        innlogget.navIdent,
      ) ?? {
        navIdent: innlogget.navIdent,
        navn: innlogget.name,
        enhet: innlogget.enhet,
      };
      sak.saksbehandlere.eier = valgtSaksbehandler;
      leggTilHendelse(request, sak, "SAK_TILDELT");
      if (sak.steg === "OPPRETTET") {
        sak.steg = "UTREDNING";
        sak.status = "AKTIV";
        leggTilHendelse(request, sak, "STATUS_ENDRET", undefined, { status: sak.status });
      }
      break;
    }
    case "TILDEL": {
      const navIdent = hentTekstfelt(formData, "navIdent", "Ugyldig saksbehandler");
      const navn = hentValgfriTekst(formData, "navn") ?? navIdent;
      const valgtSaksbehandler = finnSaksbehandlerDetalj(mockSaksbehandlerDetaljer, navIdent) ?? {
        navIdent,
        navn,
        enhet: null,
      };

      sak.saksbehandlere.eier = valgtSaksbehandler;
      leggTilHendelse(request, sak, "SAK_TILDELT");
      break;
    }
    case "FRISTILL": {
      sak.saksbehandlere.eier = null;
      break;
    }
    case "endre_steg":
    case "endre_steg_dialog": {
      const nyttSteg = hentTekstfelt(formData, "steg", "Ugyldig steg");
      krevTillattHandling(tillatte, "FLYTT_TIL_NESTE_STEG");
      if (!hentVisbareSteg(tillatte).includes(nyttSteg as KontrollsakSteg)) {
        throw data("Steget er ikke tillatt for saken i gjeldende tilstand", { status: 409 });
      }
      try {
        validerResultatFeltNavn(formData, tillatte.feltskjema, tillatte.tilstand.ytelser);
      } catch (feil) {
        throw data(feil instanceof Error ? feil.message : "Ugyldige skjemafelter", {
          status: 400,
        });
      }
      const beskrivelse = hentValgfriTekst(formData, "beskrivelse");
      const forrigeStatus = sak.status;
      const registrerResultat = formData.get("registrerResultat") === "true";
      if (nyttSteg === "AVSLUTTET" && !registrerResultat) {
        throw data("Registrer resultat før saken flyttes til Avsluttet", { status: 400 });
      }
      if (
        !harLagretResultatForOvergang(tillatte, nyttSteg as KontrollsakSteg) &&
        !registrerResultat
      ) {
        throw data("Registrer resultat før saken flyttes til neste steg", { status: 400 });
      }
      const kandidat = { ...sak };
      try {
        const resultat = byggLagreResultatRequest(
          formData,
          tillatte.feltskjema,
          tillatte.tilstand.steg,
          undefined,
          tillatte.tilstand.ytelser,
          registrerResultat,
        );
        if (registrerResultat && !resultat) throw new Error("Velg et resultat før du fortsetter");
        if (
          manglerEndeligUtfallVedAvslutning(
            tillatte.tilstand,
            nyttSteg as KontrollsakSteg,
            resultat,
          )
        ) {
          throw new Error("Velg endelig resultat før du flytter saken til Avsluttet");
        }
        if (resultat) {
          lagreMockResultat(kandidat, resultat);
        }
      } catch (feil) {
        throw data(feil instanceof Error ? feil.message : "Ugyldige resultatfelter", {
          status: 400,
        });
      }

      if (!erGyldigMockStegovergang(kandidat, nyttSteg as KontrollsakSteg)) {
        throw data("Stegbyttet er ikke gyldig for registrert resultat", { status: 409 });
      }
      sak.resultat = kandidat.resultat;
      sak.ytelser = kandidat.ytelser;
      sak.steg = nyttSteg as KontrollsakSteg;
      sak.status = (
        {
          OPPRETTET: null,
          UTREDNING: "AKTIV",
          UTREDES: "AKTIV",
          FORVALTNING: "VENTER_PA_VEDTAK",
          STRAFFERETTSLIG_VURDERING: "AKTIV",
          POLITI: "VENTER_PA_RESULTAT",
          ANMELDT: "VENTER_PA_RESULTAT",
          AVSLUTTET: null,
        } satisfies Record<KontrollsakSteg, KontrollsakStatus | null>
      )[nyttSteg as KontrollsakSteg];
      leggTilHendelse(request, sak, getHendelsestypeForStegendring(sak.steg), undefined, {
        beskrivelse,
        status: nyttSteg === "AVSLUTTET" ? forrigeStatus : sak.status,
      });
      break;
    }
    case "endre_status": {
      krevTillattHandling(tillatte, "ENDRE_STATUS");
      const status = parseStatusFraDialog(hentValgfriTekst(formData, "status"));
      if (!tillatte.tillatteStatuser.includes(status)) {
        throw data("Statusen er ikke tillatt for saken i gjeldende tilstand", { status: 409 });
      }
      validerResultatFeltNavn(formData, tillatte.feltskjema);
      const beskrivelse = hentValgfriTekst(formData, "beskrivelse");

      const varIBero = sak.status === "I_BERO";
      if (status === "I_BERO") sak.statusFørBero = sak.status;
      if (varIBero) sak.statusFørBero = null;
      sak.status = status;
      leggTilHendelse(
        request,
        sak,
        varIBero || status === null ? "SAK_GJENOPPTATT" : getHendelsestypeForStatusendring(status),
        undefined,
        { beskrivelse },
      );
      break;
    }
    case "overfor_ansvarlig": {
      const navIdent = hentTekstfelt(formData, "navIdent", "Ugyldig saksbehandler");
      const valgtSaksbehandler = finnSaksbehandlerDetalj(mockSaksbehandlerDetaljer, navIdent);

      if (!valgtSaksbehandler) {
        throw data("Ugyldig saksbehandler", { status: 400 });
      }

      const berortSaksbehandlerEnhet =
        valgtSaksbehandler.enhet === null ? undefined : valgtSaksbehandler.enhet;

      sak.saksbehandlere.eier = valgtSaksbehandler;
      sak.saksbehandlere.deltMed = sak.saksbehandlere.deltMed.filter(
        (saksbehandler) => saksbehandler.navIdent !== valgtSaksbehandler.navIdent,
      );

      leggTilHendelse(request, sak, "ANSVARLIG_SAKSBEHANDLER_ENDRET", undefined, {
        berortSaksbehandlerNavn: valgtSaksbehandler.navn,
        berortSaksbehandlerNavIdent: valgtSaksbehandler.navIdent,
        berortSaksbehandlerEnhet,
      });
      break;
    }
    case "videresend_seksjon": {
      const nySeksjon = hentTekstfelt(formData, "seksjon", "Ugyldig seksjon");

      if (sak.saksbehandlere.eier) {
        sak.saksbehandlere.eier = {
          ...sak.saksbehandlere.eier,
          enhet: nySeksjon,
        };
      } else {
        sak.saksbehandlere.opprettetAv = {
          ...sak.saksbehandlere.opprettetAv,
          enhet: nySeksjon,
        };
      }
      leggTilHendelse(request, sak, "MOTTAKSENHET_ENDRET");
      break;
    }
    case "send_til_annen_enhet": {
      const nySeksjon = hentTekstfelt(formData, "seksjon", "Ugyldig enhet");

      if (nySeksjon === getSaksenhet(sak)) {
        throw data("Velg en annen enhet", { status: 400 });
      }

      sak.saksbehandlere.opprettetAv = {
        ...sak.saksbehandlere.opprettetAv,
        enhet: nySeksjon,
      };
      sak.saksbehandlere.eier = null;
      leggTilHendelse(request, sak, "MOTTAKSENHET_ENDRET");
      break;
    }
    case "rediger_saksinformasjon": {
      if (!erAktivSakKontrollsak(sak.steg)) {
        return {
          ok: false,
          feil: { skjema: ["Saken kan ikke redigeres i dette steget."] },
        } satisfies ActionResult;
      }

      const ytelseRader = parseYtelseRader(formData);
      const rådata = {
        kategori: formData.get("kategori") ?? undefined,
        kilde: formData.get("kilde") ?? undefined,
        misbruktype: formData
          .getAll("misbruktype")
          .filter((v): v is string => typeof v === "string" && v.length > 0),
        merking: formData
          .getAll("merking")
          .filter((v): v is string => typeof v === "string" && v.length > 0),
        arbeidsgivere: formData
          .getAll("arbeidsgivere")
          .filter((v): v is string => typeof v === "string" && v.length > 0),
        ytelser: ytelseRader,
      };

      const verdier: RedigerSaksinformasjonData = {
        kategori: typeof rådata.kategori === "string" ? rådata.kategori : "",
        kilde: typeof rådata.kilde === "string" ? rådata.kilde : "",
        misbruktype: rådata.misbruktype,
        merking: rådata.merking,
        arbeidsgivere: rådata.arbeidsgivere,
        ytelser: ytelseRader.length > 0 ? ytelseRader : [{}],
      };

      const resultat = redigerSaksinformasjonSchema.safeParse(rådata);

      if (!resultat.success) {
        return {
          ok: false,
          feil: normaliserArbeidsgiverFeil(bygFeilkartFraIssues(resultat.error.issues)),
          verdier,
        } satisfies ActionResult;
      }

      const validert = resultat.data;
      const nyeYtelser = validert.ytelser.map((ytelse) => ({
        type: ytelse.type ?? "",
        periodeFra: ytelse.fraDato ?? "",
        periodeTil: ytelse.tilDato ?? "",
        belop: ytelse.beløp ?? null,
        endeligBelop: ytelse.endeligBeløp ?? null,
      }));
      const endredeFelter = finnEndredeSaksinformasjonsfelter(sak, validert, nyeYtelser);

      sak.kategori = validert.kategori;
      sak.misbruktype = [...validert.misbruktype];
      sak.merking = [...validert.merking];
      sak.kilde = validert.kilde;
      sak.arbeidsgivere = [...validert.arbeidsgivere];
      sak.ytelser = nyeYtelser;
      leggTilHendelse(request, sak, "SAKSINFORMASJON_ENDRET", undefined, {
        beskrivelse: beskrivEndredeFelter(endredeFelter),
      });
      return { ok: true, sak } satisfies ActionResult;
    }
    case "koble_sak":
    case "fjern_kobling": {
      const kobletSakIdRaw = formData.get("relatertSakId");
      const kobletSakId = Number(kobletSakIdRaw);
      if (!Number.isSafeInteger(kobletSakId) || kobletSakId <= 0) {
        return {
          ok: false,
          feil: { skjema: ["Ugyldig sak-ID"] },
        } satisfies ActionResult;
      }

      const kobletSak = hentAlleSaker(request).find((annenSak) => annenSak.id === kobletSakId);
      if (
        !kobletSak ||
        kobletSak.id === sak.id ||
        (handling === "koble_sak" && kobletSak.personIdent !== sak.personIdent)
      ) {
        return {
          ok: false,
          feil: { skjema: ["Kan ikke endre kobling til denne saken"] },
        } satisfies ActionResult;
      }
      const innlogget = await hentInnloggetBruker({ request });
      if (
        !erSaksbehandlerPåSak(sak, innlogget.navIdent) &&
        !erSaksbehandlerPåSak(kobletSak, innlogget.navIdent)
      ) {
        throw data("Du må være saksbehandler på minst én av sakene for å endre koblingen", {
          status: 403,
        });
      }

      const erKoblet = sak.kobledeSaker.includes(kobletSak.id);
      if (handling === "koble_sak") {
        if (erKoblet) {
          return {
            ok: false,
            feil: { skjema: ["Sakene er allerede koblet"] },
          } satisfies ActionResult;
        }
        sak.kobledeSaker.push(kobletSak.id);
        kobletSak.kobledeSaker.push(sak.id);
      } else {
        if (!erKoblet) {
          return {
            ok: false,
            feil: { skjema: ["Sakene er ikke koblet"] },
          } satisfies ActionResult;
        }
        sak.kobledeSaker = sak.kobledeSaker.filter((id) => id !== kobletSak.id);
        kobletSak.kobledeSaker = kobletSak.kobledeSaker.filter((id) => id !== sak.id);
      }

      return { ok: true } satisfies ActionResult;
    }
    case "del_tilgang": {
      const navIdent = hentTekstfelt(formData, "navIdent", "Ugyldig saksbehandler");
      const valgtSaksbehandler = finnSaksbehandlerDetalj(mockSaksbehandlerDetaljer, navIdent);

      if (!valgtSaksbehandler) {
        throw data("Ugyldig saksbehandler", { status: 400 });
      }

      const berortSaksbehandlerEnhet =
        valgtSaksbehandler.enhet === null ? undefined : valgtSaksbehandler.enhet;

      const erAnsvarlig = sak.saksbehandlere.eier?.navIdent === valgtSaksbehandler.navIdent;
      const erAlleredeDelt = saksbehandlere.deltMed.some(
        (saksbehandler) => saksbehandler.navIdent === valgtSaksbehandler.navIdent,
      );

      if (!erAnsvarlig && !erAlleredeDelt) {
        saksbehandlere.deltMed.push(valgtSaksbehandler);
        leggTilHendelse(request, sak, "TILGANG_DELT", undefined, {
          berortSaksbehandlerNavn: valgtSaksbehandler.navn,
          berortSaksbehandlerNavIdent: valgtSaksbehandler.navIdent,
          berortSaksbehandlerEnhet,
        });
      }

      break;
    }
    case "fjern_delt_tilgang": {
      const navIdent = hentTekstfelt(formData, "navIdent", "Ugyldig saksbehandler");
      const saksbehandler = saksbehandlere.deltMed.find(
        (deltSaksbehandler) => deltSaksbehandler.navIdent === navIdent,
      );

      saksbehandlere.deltMed = saksbehandlere.deltMed.filter(
        (deltSaksbehandler) => deltSaksbehandler.navIdent !== navIdent,
      );

      if (saksbehandler) {
        const berortSaksbehandlerEnhet =
          saksbehandler.enhet === null ? undefined : saksbehandler.enhet;

        leggTilHendelse(request, sak, "TILGANG_FJERNET", undefined, {
          berortSaksbehandlerNavn: saksbehandler.navn,
          berortSaksbehandlerNavIdent: saksbehandler.navIdent,
          berortSaksbehandlerEnhet,
        });
      }

      break;
    }
    case "legg_til_historikk": {
      const tittel = hentTekstfelt(formData, "tittel", "Tittel er påkrevd");
      const notat = hentValgfriTekst(formData, "notat") ?? "";
      const dato = hentTekstfelt(formData, "dato", "Dato er påkrevd");
      const tid = hentTekstfelt(formData, "tid", "Tid er påkrevd");

      const tidspunkt = lagTidspunktFraSkjema(dato, tid);
      const { navIdent } = await hentInnloggetBruker({ request });
      leggTilManuellHendelse(request, sak, tittel, notat, tidspunkt, navIdent);
      break;
    }
    case "rediger_historikk": {
      const hendelseId = hentTekstfelt(formData, "hendelseId", "Hendelse-ID er påkrevd");
      const tittel = hentTekstfelt(formData, "tittel", "Tittel er påkrevd");
      const notat = hentValgfriTekst(formData, "notat") ?? "";
      const dato = hentTekstfelt(formData, "dato", "Dato er påkrevd");
      const tid = hentTekstfelt(formData, "tid", "Tid er påkrevd");

      const tidspunkt = lagTidspunktFraSkjema(dato, tid);
      redigerManuellHendelse(request, String(sak.id), hendelseId, tittel, notat, tidspunkt);
      break;
    }
    case "slett_historikk": {
      const hendelseId = hentTekstfelt(formData, "hendelseId", "Hendelse-ID er påkrevd");
      slettManuellHendelse(request, String(sak.id), hendelseId);
      break;
    }
    case "send_notat": {
      const notatRaw = formData.get("notat");
      if (typeof notatRaw !== "string" || !notatRaw.trim()) {
        throw data("Notat er påkrevd", { status: 400 });
      }
      const notat = notatRaw.trim();
      const malLabel = finnNotatMalLabel(formData.get("mal"));
      const knyttTilOppgave = formData.get("knyttTilOppgave") === "true";
      const oppgavetype = hentValgfriTekst(formData, "oppgavetype") ?? "";

      const deler = [notat];
      if (malLabel) {
        deler.push(`Mal: ${malLabel}`);
      }
      if (knyttTilOppgave) {
        deler.push(`Knyttet til oppgave${oppgavetype ? `: ${oppgavetype}` : ""}`);
      }

      leggTilHendelse(request, sak, "NOTAT_SENDT", undefined, {
        beskrivelse: deler.join("\n"),
      });
      break;
    }
    case "opprett_journalpost": {
      const journalposttype = hentValgfriTekst(formData, "journalposttype") ?? "NOTAT";
      const jpTittel = hentValgfriTekst(formData, "tittel") ?? "Journalpost";
      const innhold = hentValgfriTekst(formData, "innhold") ?? "";
      const dokumentIds = formData.getAll("dokumentId").map(String);
      const vedleggIdsForArkivering = formData.getAll("vedleggId").map(String);
      const knyttTilOppgave = formData.get("knyttTilOppgave") === "true";
      const { navIdent } = await hentInnloggetBruker({ request });
      const journalpostId = `demo-${crypto.randomUUID()}`;

      const antallArkiverteVedlegg = vedleggIdsForArkivering.filter(
        (filId) => arkiverFil(request, sakId, filId, navIdent, journalpostId) !== null,
      ).length;

      const dokumenttre = hentDokumenttreForSak(request, sakId);
      let antallArkiverteDokumenter = 0;
      for (const dokumentId of dokumentIds) {
        const dokument = dokumenttre.find((node) => node.id === dokumentId);
        if (!dokument || dokument.arkivert) continue;
        if (!arkiverDokument(hentMockState(request), sakId, dokumentId, navIdent, journalpostId)) {
          continue;
        }
        opprettArkivertFilFraDokument(request, sakId, dokument, navIdent, journalpostId);
        antallArkiverteDokumenter += 1;
      }

      const deler = [innhold];
      if (knyttTilOppgave) {
        const oppgavetype = hentValgfriTekst(formData, "oppgavetype") ?? "";
        const prioritet = hentValgfriTekst(formData, "prioritet") ?? "";
        const frist = hentValgfriTekst(formData, "frist") ?? "";
        const oppgaveDeler = [`Knyttet til oppgave${oppgavetype ? `: ${oppgavetype}` : ""}`];
        if (prioritet) oppgaveDeler.push(`Prioritet: ${formaterPrioritet(prioritet)}`);
        if (frist) oppgaveDeler.push(`Frist: ${frist}`);
        deler.push(oppgaveDeler.join(", "));
      }

      leggTilHendelse(request, sak, "JOURNALPOST_OPPRETTET", undefined, {
        tittel: `${formaterJournalposttype(journalposttype)}: ${jpTittel}`,
        beskrivelse: deler.join("\n"),
      });

      for (let i = 0; i < antallArkiverteVedlegg; i += 1) {
        leggTilHendelse(request, sak, "FIL_ARKIVERT", undefined, {
          beskrivelse: "Vedlegg arkivert i journalpost",
        });
      }
      for (let i = 0; i < antallArkiverteDokumenter; i += 1) {
        leggTilHendelse(request, sak, "FIL_ARKIVERT", undefined, {
          beskrivelse: "Dokument arkivert i journalpost",
        });
      }

      if (knyttTilOppgave) {
        const oppgavetype = hentValgfriTekst(formData, "oppgavetype") ?? "";
        const prioritet = hentValgfriTekst(formData, "prioritet") ?? "";
        const fristVerdi = hentValgfriTekst(formData, "frist") ?? "";
        const behandlendeEnhet = hentValgfriTekst(formData, "behandlendeEnhet") ?? "";
        const beskrivelse = hentValgfriTekst(formData, "beskrivelse") ?? "";
        const oppgaveDeler: string[] = [];
        if (prioritet) oppgaveDeler.push(`Prioritet: ${formaterPrioritet(prioritet)}`);
        if (fristVerdi) oppgaveDeler.push(`Frist: ${fristVerdi}`);
        if (behandlendeEnhet) oppgaveDeler.push(`Enhet: ${behandlendeEnhet}`);
        if (beskrivelse) oppgaveDeler.push(beskrivelse);
        leggTilHendelse(request, sak, "OPPGAVE_OPPRETTET", undefined, {
          tittel: oppgavetype || "Oppgave",
          beskrivelse: oppgaveDeler.join("\n"),
        });
      }

      break;
    }
    case "opprett_oppgave": {
      const oppgavetype = hentValgfriTekst(formData, "oppgavetype") ?? "";
      const prioritet = hentValgfriTekst(formData, "prioritet") ?? "";
      const fristVerdi = hentValgfriTekst(formData, "frist") ?? "";
      const behandlendeEnhet = hentValgfriTekst(formData, "behandlendeEnhet") ?? "";
      const beskrivelse = hentValgfriTekst(formData, "beskrivelse") ?? "";

      const deler: string[] = [];
      if (prioritet) deler.push(`Prioritet: ${formaterPrioritet(prioritet)}`);
      if (fristVerdi) deler.push(`Frist: ${fristVerdi}`);
      if (behandlendeEnhet) deler.push(`Enhet: ${behandlendeEnhet}`);
      if (beskrivelse) deler.push(beskrivelse);

      leggTilHendelse(request, sak, "OPPGAVE_OPPRETTET", undefined, {
        tittel: oppgavetype || "Oppgave",
        beskrivelse: deler.join("\n"),
      });
      break;
    }
    default: {
      throw data("Ugyldig handling", { status: 400 });
    }
  }

  sak.oppdatert = new Date().toISOString();

  return { ok: true } satisfies ActionResult;
}
