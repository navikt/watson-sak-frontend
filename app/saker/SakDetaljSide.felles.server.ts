import { data } from "react-router";
import { logger } from "~/logging/logging";
import { redigerSaksinformasjonSchema } from "~/registrer-sak/validering";
import * as backendApi from "~/saker/api.server";
import type {
  KontrollsakResponse,
  KontrollsakSaksbehandler,
  KontrollsakSteg,
  KontrollsakStatus,
  LagreResultatRequest,
  TillatteHandlingerResponse,
} from "~/saker/types.backend";
import { lagIsoTidspunktFraNorskDatoTid } from "~/utils/date-utils";
import { notatMalValg } from "./handlinger/notatValg";
import { byggLagreResultatRequest } from "./handlinger/resultat-request";
import { erHenlagtIGjeldendeSteg } from "./handlinger/tillatte-steg";
import type { Route } from "./+types/SakDetaljSide.route";
import type { RedigerSaksinformasjonResultat } from "./komponenter/Saksinformasjon.types";

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
export function finnEndredeSaksinformasjonsfelter(
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
export function beskrivEndredeFelter(felter: string[]): string {
  if (felter.length === 0) {
    return "Saksinformasjonen ble lagret uten endringer.";
  }

  if (felter.length === 1) {
    return `Endret ${felter[0]}.`;
  }

  const alleUnntattSiste = felter.slice(0, -1).join(", ");
  return `Endret ${alleUnntattSiste} og ${felter[felter.length - 1]}.`;
}

export function normaliserArbeidsgiverFeil(
  feil: Record<string, string[]>,
): Record<string, string[]> {
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
 * og statuskoden indikerer en forventet, klientrettet feil (for eksempel
 * 400/403/404). Ved 5xx brukes en generisk melding i stedet, siden slike feil
 * kan inneholde tekniske detaljer som ikke bør vises til saksbehandleren.
 */
export function historikkFeilmelding(feil: unknown): string {
  if (feil instanceof backendApi.BackendFeilException && feil.status < 500) {
    return feil.message;
  }
  logger.error("Uventet feil ved historikk-handling", { feil });
  return "Kunne ikke lagre historikkinnslaget. Prøv igjen.";
}

export function koblingsFeilmelding(feil: unknown): string {
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

export type ActionResult =
  | { ok: true; sak?: Route.ComponentProps["loaderData"]["sak"] }
  | RedigerSaksinformasjonResultat;

// --- Hjelpefunksjoner ---

const gyldigeStatuser = new Set<KontrollsakStatus>([
  "AKTIV",
  "VENTER_PA_INFORMASJON",
  "VENTER_PA_VEDTAK",
  "VENTER_PA_RESULTAT",
  "PAAKLAGET",
  "I_BERO",
]);

function erGyldigStatus(verdi: string): verdi is KontrollsakStatus {
  return gyldigeStatuser.has(verdi as KontrollsakStatus);
}

export function parseStatusFraDialog(verdi: string | undefined): KontrollsakStatus | null {
  if (verdi === undefined || verdi === "" || verdi === "__NULL__") {
    return null;
  }
  if (!erGyldigStatus(verdi)) {
    throw data("Ugyldig arbeidsstatus", { status: 400 });
  }
  return verdi;
}

export function krevTillattHandling(
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

/** Leser og validerer resultatet som lagres uten stegbytte. */
export function byggResultatForLagring(
  formData: FormData,
  tillatte: TillatteHandlingerResponse,
): LagreResultatRequest {
  try {
    const resultat = byggLagreResultatRequest(
      formData,
      tillatte.feltskjema,
      tillatte.tilstand.steg,
      undefined,
      tillatte.tilstand.ytelser,
    );
    if (!resultat) throw new Error("Velg et resultat før du fortsetter");
    return resultat;
  } catch (feil) {
    throw data(feil instanceof Error ? feil.message : "Ugyldige resultatfelter", { status: 400 });
  }
}

export function getHendelsestypeForStatusendring(status: KontrollsakStatus) {
  if (status === "I_BERO") return "SAK_SATT_I_BERO";
  if (status === "AKTIV") return "SAK_GJENOPPTATT";
  return "SAK_SATT_PA_VENT";
}

export function getHendelsestypeForStegendring(steg: KontrollsakSteg) {
  switch (steg) {
    case "POLITI":
      return "POLITIANMELDT";
    default:
      return "STATUS_ENDRET";
  }
}

/** Speiler `statusEtterResultat` i backend. */
function statusEtterMockResultat(
  sak: KontrollsakResponse,
  resultat: LagreResultatRequest,
): KontrollsakStatus | null {
  if (resultat.paaklaget) return "PAAKLAGET";
  if (sak.status === "PAAKLAGET" && resultat.politi) return "VENTER_PA_RESULTAT";
  return sak.status;
}

export function lagreMockResultat(sak: KontrollsakResponse, resultat: LagreResultatRequest): void {
  sak.status = statusEtterMockResultat(sak, resultat);
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

export function finnSaksbehandlerDetalj(
  saksbehandlerDetaljer: KontrollsakSaksbehandler[],
  navIdent: string,
) {
  return (
    saksbehandlerDetaljer.find(
      (saksbehandler) => saksbehandler.navIdent === navIdent || saksbehandler.navn === navIdent,
    ) ?? null
  );
}

export function lagTidspunktFraSkjema(dato: string, tid: string): string {
  return lagIsoTidspunktFraNorskDatoTid(dato, tid);
}

export function finnNotatMalLabel(verdi: FormDataEntryValue | null): string | undefined {
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
export const handlingerSomKreverUtredning = new Set([
  "del_tilgang",
  "fjern_delt_tilgang",
  "send_notat",
  "opprett_journalpost",
  "opprett_oppgave",
  "legg_til_historikk",
]);

/** Tildelingshandlinger som bare sakens eier eller en leder kan utføre */
const eierEllerLederFeilmeldinger: Record<string, string> = {
  FRISTILL: "Du må være sakens saksbehandler eller leder for å fjerne saksbehandler",
  overfor_ansvarlig:
    "Du må være sakens saksbehandler eller leder for å endre ansvarlig saksbehandler",
};

export function krevEierEllerLeder(handling: string): boolean {
  return handling in eierEllerLederFeilmeldinger;
}

export function sjekkEierEllerLeder(
  handling: string,
  sak: KontrollsakResponse,
  innlogget: { navIdent: string; erLeder: boolean },
) {
  const erEier = sak.saksbehandlere.eier?.navIdent === innlogget.navIdent;
  if (!erEier && !innlogget.erLeder) {
    throw data(eierEllerLederFeilmeldinger[handling], { status: 403 });
  }
}

export function erTildelingshandling(handling: string): boolean {
  return tildelingshandlinger.has(handling);
}

export function erKoblingshandling(handling: string): boolean {
  return koblingshandlinger.has(handling);
}

export function erSaksbehandlerPåSak(sak: KontrollsakResponse, navIdent: string): boolean {
  return (
    sak.saksbehandlere.eier?.navIdent === navIdent ||
    sak.saksbehandlere.deltMed.some((saksbehandler) => saksbehandler.navIdent === navIdent)
  );
}
