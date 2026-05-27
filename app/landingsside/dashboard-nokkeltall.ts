import type { KontrollsakResponse } from "~/saker/types.backend";

export interface DashboardNokkeltall {
  totalt: number;
  opprettetIPerioden: number;
  aktive: number;
  avsluttetIPerioden: number;
  venterPaAndre: number;
  eldsteApneSakId: number | null;
  eldsteApneSakDager: number | null;
}

function erApenSak(sak: KontrollsakResponse): boolean {
  return sak.status !== "HENLAGT" && sak.status !== "AVSLUTTET";
}

function erInnenforPeriode(dato: string, referansedato: Date, antallDager: number): boolean {
  const grense = new Date(referansedato);
  grense.setDate(grense.getDate() - antallDager);
  return new Date(dato) >= grense;
}

export function beregnDashboardNokkeltall(
  saker: KontrollsakResponse[],
  referansedato: Date = new Date(),
): DashboardNokkeltall {
  const apneSaker = saker.filter(erApenSak);

  const totalt = apneSaker.length;

  const opprettetIPerioden = saker.filter((sak) =>
    erInnenforPeriode(sak.opprettet, referansedato, 30),
  ).length;

  const aktive = saker.filter(
    (sak) =>
      (sak.status === "UTREDES" || sak.status === "STRAFFERETTSLIG_VURDERING") &&
      sak.blokkert === null,
  ).length;

  const avsluttetIPerioden = saker.filter(
    (sak) =>
      (sak.status === "AVSLUTTET" || sak.status === "HENLAGT") &&
      sak.oppdatert !== null &&
      erInnenforPeriode(sak.oppdatert, referansedato, 30),
  ).length;

  const venterPaAndre = saker.filter(
    (sak) =>
      sak.blokkert === "VENTER_PA_INFORMASJON" ||
      sak.blokkert === "VENTER_PA_VEDTAK" ||
      sak.status === "ANMELDT",
  ).length;

  const eldsteApneSak = apneSaker.sort((a, b) => a.opprettet.localeCompare(b.opprettet))[0];
  const eldsteApneSakId = eldsteApneSak?.id ?? null;
  const eldsteApneSakDager = eldsteApneSak
    ? Math.round(
        (referansedato.getTime() - new Date(eldsteApneSak.opprettet).getTime()) /
          (1000 * 60 * 60 * 24),
      )
    : null;

  return {
    totalt,
    opprettetIPerioden,
    aktive,
    avsluttetIPerioden,
    venterPaAndre,
    eldsteApneSakId,
    eldsteApneSakDager,
  };
}
