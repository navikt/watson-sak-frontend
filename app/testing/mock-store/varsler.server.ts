import { lagMockSakId } from "~/saker/mock-uuid";
import { type Varsel, varselSchema } from "~/varsler/typer";
import type { MockState } from "./session.server";

const rådata: Varsel[] = [
  {
    id: "varsel-101",
    sakId: String(lagMockSakId("101", 1)),
    tittel: "Ny aktivitet på sak #101",
    tekst: "Det er registrert en ny vurdering på saken.",
    tidspunkt: "2026-03-10",
    erLest: false,
    status: "announcement",
  },
  {
    id: "varsel-102",
    sakId: String(lagMockSakId("102", 1)),
    tittel: "Sak #102 er oppdatert",
    tekst: "Saken har fått ny status og er klar for videre oppfølging.",
    tidspunkt: "2026-03-11",
    erLest: false,
    status: "warning",
  },
  {
    id: "varsel-103",
    sakId: String(lagMockSakId("103", 1)),
    tittel: "Ny kommentar på sak #103",
    tekst: "Det har kommet inn en ny kommentar fra saksbehandler.",
    tidspunkt: "2026-03-12",
    erLest: false,
    status: "announcement",
  },
  {
    id: "varsel-104",
    sakId: String(lagMockSakId("104", 1)),
    tittel: "Sak #104 trenger oppfølging",
    tekst: "Fristen nærmer seg og saken bør vurderes i dag.",
    tidspunkt: "2026-03-13",
    erLest: false,
    status: "warning",
  },
  {
    id: "varsel-105",
    sakId: String(lagMockSakId("101", 1)),
    tittel: "Sak #101 er klar for neste steg",
    tekst: "Alle nødvendige dokumenter er nå tilgjengelige.",
    tidspunkt: "2026-03-14",
    erLest: false,
    status: "success",
  },
  {
    id: "varsel-106",
    sakId: String(lagMockSakId("102", 1)),
    tittel: "Sak #102 har ny hendelse",
    tekst: "Det er loggført en ny hendelse i historikken.",
    tidspunkt: "2026-03-15",
    erLest: false,
    status: "announcement",
  },
  {
    id: "varsel-107",
    sakId: String(lagMockSakId("103", 1)),
    tittel: "Sak #103 må vurderes",
    tekst: "Det har kommet inn nye opplysninger som krever vurdering.",
    tidspunkt: "2026-03-16",
    erLest: false,
    status: "warning",
  },
];

export function lagInitialeVarsler(): Varsel[] {
  return rådata.map((varsel) => varselSchema.parse(varsel));
}

export function hentUlesteVarsler(state: MockState): Varsel[] {
  return state.varsler
    .filter((varsel) => !varsel.erLest)
    .sort((a, b) => b.tidspunkt.localeCompare(a.tidspunkt));
}

export function hentVarsler(state: MockState): Varsel[] {
  return state.varsler;
}

export function markerVarselSomLest(state: MockState, varselId: string) {
  const varsel = state.varsler.find((item) => item.id === varselId);

  if (!varsel) {
    throw new Error(`Fant ikke varsel med id ${varselId}`);
  }

  varsel.erLest = true;
}
