import type { SakStatus } from "~/saker/typer";
import type {
  KontrollsakHandling,
  KontrollsakResponse,
  KontrollsakStatus,
} from "~/saker/types.backend";

const statusRekkefølge: SakStatus[] = [
  "tips mottatt",
  "tips avklart",
  "under utredning",
  "avsluttet",
];

/** Hent neste status i rekkefølgen, eller null om saken er i sluttilstand */
export function hentNesteStatus(status: SakStatus): SakStatus | null {
  const index = statusRekkefølge.indexOf(status);
  if (index === -1 || index >= statusRekkefølge.length - 1) return null;
  return statusRekkefølge[index + 1];
}

/** Sjekk om en sak kan ha handlinger utført på seg */
export function erAktivSak(status: SakStatus): boolean {
  return (
    status !== "avsluttet" &&
    status !== "henlagt" &&
    status !== "videresendt til nay/nfp" &&
    status !== "politianmeldt"
  );
}

/** Sjekk om en sak kan videresendes til NAY/NFP */
export function kanVideresendesTilNayNfp(status: SakStatus): boolean {
  return status === "under utredning";
}

/** Sjekk om en sak kan politianmeldes */
export function kanPolitianmeldes(status: SakStatus): boolean {
  return status === "under utredning";
}

export function erAktivSakKontrollsak(status: KontrollsakStatus): boolean {
  return status !== "AVSLUTTET";
}

const støttedeKontrollsakHandlinger = new Set<KontrollsakHandling>([
  "TILDEL",
  "FRISTILL",
  "START_UTREDNING",
  "SETT_VENTER_PA_INFORMASJON",
  "SETT_VENTER_PA_VEDTAK",
  "SETT_ANMELDELSE_VURDERES",
  "SETT_ANMELDT",
  "SETT_HENLAGT",
  "SETT_I_BERO",
  "FORTSETT_FRA_I_BERO",
  "AVSLUTT",
  "AVSLUTT_MED_KONKLUSJON",
]);

export function erStøttetKontrollsakHandling(handling: string): handling is KontrollsakHandling {
  return støttedeKontrollsakHandlinger.has(handling as KontrollsakHandling);
}

export function hentStøttedeTilgjengeligeHandlinger(sak: KontrollsakResponse) {
  return sak.tilgjengeligeHandlinger.filter((handling) =>
    erStøttetKontrollsakHandling(handling.handling),
  );
}

export function harKontrollsakHandling(sak: KontrollsakResponse, handling: KontrollsakHandling) {
  return hentStøttedeTilgjengeligeHandlinger(sak).some(
    (tilgjengeligHandling) => tilgjengeligHandling.handling === handling,
  );
}
