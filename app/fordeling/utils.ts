import type { SakKilde, SakStatus } from "./typer";

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
