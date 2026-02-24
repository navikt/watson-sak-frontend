import type { Sak, SakKilde, SakStatus } from "./typer";

export type Sorteringsretning = "nyest" | "eldst";

export function sorterSakerEtterDato(
  saker: Sak[],
  retning: Sorteringsretning,
): Sak[] {
  return [...saker].sort((a, b) => {
    const sammenligning = a.datoInnmeldt.localeCompare(b.datoInnmeldt);
    return retning === "nyest" ? -sammenligning : sammenligning;
  });
}

export function formaterDato(dato: string): string {
  return new Date(dato).toLocaleDateString("nb-NO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

const kildeVisningsnavn: Record<SakKilde, string> = {
  telefon: "Telefon",
  epost: "E-post",
  brev: "Brev",
  registersamkjøring: "Registersamkjøring",
  saksbehandler: "Saksbehandler",
  annet: "Annet",
};

export function formaterKilde(kilde: SakKilde): string {
  return kildeVisningsnavn[kilde];
}

const statusVariant: Record<
  SakStatus,
  "info" | "warning" | "success" | "neutral"
> = {
  "tips mottatt": "info",
  "tips avklart": "warning",
  "under utredning": "warning",
  avsluttet: "neutral",
};

export function hentStatusVariant(
  status: SakStatus,
): "info" | "warning" | "success" | "neutral" {
  return statusVariant[status];
}

export function filtrerSaker(
  saker: Sak[],
  valgteStatuser: SakStatus[],
  valgteYtelser: string[],
): Sak[] {
  return saker.filter((sak) => {
    const matcherStatus =
      valgteStatuser.length === 0 || valgteStatuser.includes(sak.status);
    const matcherYtelse =
      valgteYtelser.length === 0 ||
      sak.ytelser.some((ytelse) => valgteYtelser.includes(ytelse));
    return matcherStatus && matcherYtelse;
  });
}

export function hentUnikeYtelser(saker: Sak[]): string[] {
  return [...new Set(saker.flatMap((sak) => sak.ytelser))].sort((a, b) =>
    a.localeCompare(b, "nb"),
  );
}
