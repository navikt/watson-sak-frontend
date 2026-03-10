import { mockSaker } from "~/fordeling/mock-data.server";
import { mockMineSaker } from "~/mine-saker/mock-data.server";
import type { SakHendelse, SakHendelseType } from "./typer";

const historikkMap = new Map<string, SakHendelse[]>();

let nesteId = 1;

function lagId(): string {
  return String(nesteId++);
}

/** Legg til en hendelse i historikken for en sak */
export function leggTilHendelse(
  sakId: string,
  type: SakHendelseType,
  utførtAv: string,
  detaljer?: { fra?: string; til?: string },
  tidspunkt?: string,
): SakHendelse {
  const hendelse: SakHendelse = {
    id: lagId(),
    sakId,
    tidspunkt: tidspunkt ?? new Date().toISOString(),
    type,
    utførtAv,
    detaljer,
  };

  const eksisterende = historikkMap.get(sakId) ?? [];
  eksisterende.push(hendelse);
  historikkMap.set(sakId, eksisterende);

  return hendelse;
}

/** Hent historikken for en sak, sortert med nyeste først */
export function hentHistorikk(sakId: string): SakHendelse[] {
  const hendelser = historikkMap.get(sakId) ?? [];
  return [...hendelser].sort(
    (a, b) => new Date(b.tidspunkt).getTime() - new Date(a.tidspunkt).getTime(),
  );
}

// Generer historikk for eksisterende mock-saker
const statusRekkefølge = ["tips mottatt", "tips avklart", "under utredning", "avsluttet"] as const;

function genererHistorikk(saker: typeof mockSaker) {
  for (const sak of saker) {
    const innmeldtDato = new Date(sak.datoInnmeldt);

    // Sak opprettet
    leggTilHendelse(sak.id, "opprettet", "System", undefined, innmeldtDato.toISOString());

    // Generer statusendringer basert på nåværende status
    const nåværendeIndex = statusRekkefølge.indexOf(
      sak.status as (typeof statusRekkefølge)[number],
    );
    for (let i = 1; i <= nåværendeIndex; i++) {
      const dagerEtter = i * 3;
      const dato = new Date(innmeldtDato);
      dato.setDate(dato.getDate() + dagerEtter);

      leggTilHendelse(
        sak.id,
        "status_endret",
        "Kari Saksbehandler",
        {
          fra: statusRekkefølge[i - 1],
          til: statusRekkefølge[i],
        },
        dato.toISOString(),
      );
    }

    // Legg til tildeling hvis saken er kommet forbi "tips mottatt"
    if (nåværendeIndex >= 1) {
      const tildelingsDato = new Date(innmeldtDato);
      tildelingsDato.setDate(tildelingsDato.getDate() + 2);

      leggTilHendelse(
        sak.id,
        "tildelt",
        "System",
        { til: "Kari Saksbehandler" },
        tildelingsDato.toISOString(),
      );
    }

    // Legg til avdelingsendring for noen saker
    if (sak.avdeling && nåværendeIndex >= 2) {
      const avdelingsDato = new Date(innmeldtDato);
      avdelingsDato.setDate(avdelingsDato.getDate() + 5);

      leggTilHendelse(
        sak.id,
        "avdeling_endret",
        "Ola Nordmann",
        { fra: "Kontroll Øst", til: sak.avdeling },
        avdelingsDato.toISOString(),
      );
    }
  }
}

genererHistorikk(mockSaker);
genererHistorikk(mockMineSaker);
