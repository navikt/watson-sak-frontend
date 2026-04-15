import type { KontrollsakResponse } from "~/saker/types.backend";
import type { KontrollsakStatus } from "~/saker/visning";
import type { Avslutningsdatoer } from "./mock-data.server";

type Statistikksak = KontrollsakResponse;
type StatistikkStatus = KontrollsakStatus;

function getStatus(sak: Statistikksak): StatistikkStatus {
  return sak.status;
}

function getOpprettet(sak: Statistikksak): string {
  return sak.opprettet;
}

function getSeksjonNavn(sak: Statistikksak): string {
  return sak.saksbehandlere.opprettetAv.navn ?? sak.saksbehandlere.opprettetAv.navIdent;
}

function getYtelseTyper(sak: Statistikksak): string[] {
  return sak.ytelser.map((ytelse) => ytelse.type);
}

/** Antall saker gruppert etter status */
export function beregnAntallPerStatus(saker: Statistikksak[]): Record<StatistikkStatus, number> {
  const resultat: Record<StatistikkStatus, number> = {
    UFORDELT: 0,
    UTREDES: 0,
    FORVALTNING: 0,
    I_BERO: 0,
    AVSLUTTET: 0,
  };

  for (const sak of saker) {
    resultat[getStatus(sak)]++;
  }

  return resultat;
}

interface BehandlingstidResultat {
  min: number;
  median: number;
  gjennomsnitt: number;
  maks: number;
  antall: number;
}

function dagerMellom(fra: string, til: string): number {
  const fraDato = new Date(fra);
  const tilDato = new Date(til);
  return Math.round((tilDato.getTime() - fraDato.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Beregn behandlingstid (i dager) for avsluttede/henlagte saker.
 * Returnerer null dersom det ikke finnes noen avsluttede saker.
 */
export function beregnBehandlingstid(
  saker: Statistikksak[],
  avslutningsdatoer: Avslutningsdatoer,
): BehandlingstidResultat | null {
  const behandlingstider = saker
    .filter((s) => getStatus(s) === "AVSLUTTET")
    .filter((s) => avslutningsdatoer[s.id] !== undefined)
    .map((s) => dagerMellom(getOpprettet(s), avslutningsdatoer[s.id]));

  if (behandlingstider.length === 0) return null;

  const sortert = [...behandlingstider].sort((a, b) => a - b);
  const sum = sortert.reduce((acc, val) => acc + val, 0);
  const midtpunkt = Math.floor(sortert.length / 2);
  const median =
    sortert.length % 2 === 0
      ? (sortert[midtpunkt - 1] + sortert[midtpunkt]) / 2
      : sortert[midtpunkt];

  return {
    min: sortert[0],
    median,
    gjennomsnitt: Math.round(sum / sortert.length),
    maks: sortert[sortert.length - 1],
    antall: sortert.length,
  };
}

export interface GruppertAntall {
  navn: string;
  antall: number;
}

/** Antall saker gruppert etter seksjon */
export function beregnAntallPerSeksjon(saker: Statistikksak[]): GruppertAntall[] {
  const map = new Map<string, number>();

  for (const sak of saker) {
    const seksjonNavn = getSeksjonNavn(sak);
    map.set(seksjonNavn, (map.get(seksjonNavn) ?? 0) + 1);
  }

  return [...map.entries()]
    .map(([navn, antall]) => ({ navn, antall }))
    .sort((a, b) => b.antall - a.antall);
}

/** Fordeling av saker basert på ytelse (én sak kan telle på flere ytelser) */
export function beregnFordelingPerYtelse(saker: Statistikksak[]): GruppertAntall[] {
  const map = new Map<string, number>();

  for (const sak of saker) {
    for (const ytelse of getYtelseTyper(sak)) {
      map.set(ytelse, (map.get(ytelse) ?? 0) + 1);
    }
  }

  return [...map.entries()]
    .map(([navn, antall]) => ({ navn, antall }))
    .sort((a, b) => b.antall - a.antall);
}

/** Fordeling av saker basert på antall ytelser per sak */
export function beregnFordelingPerAntallYtelser(saker: Statistikksak[]): GruppertAntall[] {
  const map = new Map<number, number>();

  for (const sak of saker) {
    const antall = getYtelseTyper(sak).length;
    map.set(antall, (map.get(antall) ?? 0) + 1);
  }

  return [...map.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([antallYtelser, antallSaker]) => ({
      navn: `${antallYtelser} ${antallYtelser === 1 ? "ytelse" : "ytelser"}`,
      antall: antallSaker,
    }));
}
