import { hentAlleSaker } from "~/saker/mock-alle-saker.server";
import { mockSaksbehandlerDetaljer } from "~/saker/mock-saksbehandlere.server";
import { getSaksenhet } from "~/saker/selectors";
import type { KontrollsakResponse } from "~/saker/types.backend";
import {
  LEDERSTATISTIKK_STATUSER,
  type LederAnsattStatistikk,
  type LederArbeidsstatus,
  type LederStatistikk,
} from "./types";

const ARBEIDSSTATUSER: LederArbeidsstatus[] = [
  "IKKE_BLOKKERT",
  "VENTER_PA_INFORMASJON",
  "VENTER_PA_VEDTAK",
  "I_BERO",
];

/** Lager lederstatistikk fra den muterbare mock-store-en med samme kontrakt som backend. */
export function lagMockLederStatistikk(
  request: Request,
  enhetId: string,
  enhetNavn: string,
  iDag: Date = new Date(),
): LederStatistikk {
  const saker = hentAlleSaker(request).filter(
    (sak) => getSaksenhet(sak) === enhetId && sak.status !== "AVSLUTTET",
  );
  const grensedato = trekkFraDager(datoIOslo(iDag), 30);
  const erOverFrist = (sak: KontrollsakResponse) =>
    sak.oppdatert !== null && datoIOslo(new Date(sak.oppdatert)) <= grensedato;

  const perStatus = Object.fromEntries(
    LEDERSTATISTIKK_STATUSER.map((status) => [
      status,
      saker.filter((sak) => sak.status === status).length,
    ]),
  ) as LederStatistikk["enhet"]["perStatus"];
  const perArbeidsstatus = Object.fromEntries(
    ARBEIDSSTATUSER.map((arbeidsstatus) => [
      arbeidsstatus,
      saker.filter((sak) => (sak.blokkert ?? "IKKE_BLOKKERT") === arbeidsstatus).length,
    ]),
  ) as Record<LederArbeidsstatus, number>;

  const ansatte: LederAnsattStatistikk[] = mockSaksbehandlerDetaljer
    .filter((ansatt) => ansatt.enhet === enhetId)
    .map((ansatt) => {
      const sakerForAnsatt = saker.filter(
        (sak) => sak.saksbehandlere.eier?.navIdent === ansatt.navIdent,
      );
      return {
        navn: ansatt.navn,
        navIdent: ansatt.navIdent,
        totaltAntallIkkeAvsluttede: sakerForAnsatt.length,
        antallOverFrist: sakerForAnsatt.filter(erOverFrist).length,
      };
    })
    .sort((a, b) => a.navn.localeCompare(b.navn, "nb"));

  const ufordelte = saker.filter((sak) => !sak.saksbehandlere.eier);

  return {
    enhetId,
    enhetNavn,
    enhet: {
      totaltAntallIkkeAvsluttede: saker.length,
      antallOverFrist: saker.filter(erOverFrist).length,
      perStatus,
      perArbeidsstatus,
      antallUfordelte: ufordelte.length,
    },
    ansatte: {
      tilgjengelig: true,
      liste: ansatte,
      ufordelt: {
        totaltAntallIkkeAvsluttede: ufordelte.length,
        antallOverFrist: ufordelte.filter(erOverFrist).length,
      },
    },
  };
}

function datoIOslo(dato: Date): string {
  const deler = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Oslo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(dato);
  const verdi = (type: Intl.DateTimeFormatPartTypes) =>
    deler.find((del) => del.type === type)?.value ?? "";
  return `${verdi("year")}-${verdi("month")}-${verdi("day")}`;
}

function trekkFraDager(dato: string, antallDager: number): string {
  const [år, måned, dag] = dato.split("-").map(Number);
  return new Date(Date.UTC(år, måned - 1, dag - antallDager)).toISOString().slice(0, 10);
}
