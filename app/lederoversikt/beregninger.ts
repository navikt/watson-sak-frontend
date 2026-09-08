import { getOppdatertDato } from "~/saker/selectors";
import type { KontrollsakResponse } from "~/saker/types.backend";

/** Antall dager uten oppdatering før en åpen sak regnes som "over frist". */
const OVER_FRIST_DAGER = 30;

const lukkedeStatuser: KontrollsakResponse["status"][] = ["ANMELDT", "HENLAGT", "AVSLUTTET"];

/** En sak regnes som "åpen" så lenge den ikke er anmeldt, henlagt eller avsluttet. */
export function erÅpenSak(sak: KontrollsakResponse): boolean {
  return !lukkedeStatuser.includes(sak.status);
}

/**
 * En åpen sak er "over frist" når den ikke er oppdatert de siste 30 dagene.
 *
 * Vi regner dager siden oppdatering direkte (nå minus oppdatert), i stedet for
 * å bruke `forskjellIDager` sin absoluttverdi: en sak med en (feilaktig)
 * fremtidig oppdateringsdato skal ikke telles som over frist bare fordi
 * avstanden i tid er stor.
 */
export function erOverFrist(sak: KontrollsakResponse, nå: Date = new Date()): boolean {
  if (!erÅpenSak(sak)) return false;

  const dagerSidenOppdatert = Math.floor(
    (nå.getTime() - new Date(getOppdatertDato(sak)).getTime()) / (1000 * 60 * 60 * 24),
  );

  return dagerSidenOppdatert > OVER_FRIST_DAGER;
}

export interface AnsattOversikt {
  navIdent: string;
  navn: string;
  totalAntall: number;
  innenforFrist: number;
  overFrist: number;
}

/**
 * Grupperer enhetens åpne saker per ansvarlig saksbehandler. Ansatte uten
 * noen saker listes fortsatt (med 0 i alle tall), slik at leder ser hele
 * bemanningen i enheten – ikke bare de med tildelte saker.
 */
export function beregnAnsatteOversikt(
  saker: KontrollsakResponse[],
  ansatte: { navIdent: string; navn: string }[],
  nå: Date = new Date(),
): AnsattOversikt[] {
  const åpneSaker = saker.filter(erÅpenSak);

  return ansatte.map(({ navIdent, navn }) => {
    const sakerHosAnsatt = åpneSaker.filter(
      (sak) => sak.saksbehandlere.eier?.navIdent === navIdent,
    );
    const overFristAntall = sakerHosAnsatt.filter((sak) => erOverFrist(sak, nå)).length;

    return {
      navIdent,
      navn,
      totalAntall: sakerHosAnsatt.length,
      innenforFrist: sakerHosAnsatt.length - overFristAntall,
      overFrist: overFristAntall,
    };
  });
}

export interface EnhetsOppsummering {
  antallÅpneSaker: number;
  antallOverFrist: number;
  antallUfordelte: number;
}

/** Aggregerer enhetens saker til nøkkeltall brukt i velkomstseksjonen. */
export function beregnEnhetsOppsummering(
  saker: KontrollsakResponse[],
  nå: Date = new Date(),
): EnhetsOppsummering {
  const åpneSaker = saker.filter(erÅpenSak);

  return {
    antallÅpneSaker: åpneSaker.length,
    antallOverFrist: åpneSaker.filter((sak) => erOverFrist(sak, nå)).length,
    antallUfordelte: åpneSaker.filter((sak) => !sak.saksbehandlere.eier).length,
  };
}
