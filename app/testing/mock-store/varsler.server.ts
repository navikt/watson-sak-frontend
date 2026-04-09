import { lagMockSakUuid } from "~/saker/mock-uuid";
import { type Varsel, varselSchema } from "~/varsler/typer";

const rådata: Varsel[] = [
  {
    id: "varsel-101",
    sakId: lagMockSakUuid("101", 1),
    tittel: "Ny aktivitet på sak #101",
    tekst: "Det er registrert en ny vurdering på saken.",
    tidspunkt: "2026-03-10",
    erLest: false,
    status: "announcement",
  },
  {
    id: "varsel-102",
    sakId: lagMockSakUuid("102", 1),
    tittel: "Sak #102 er oppdatert",
    tekst: "Saken har fått ny status og er klar for videre oppfølging.",
    tidspunkt: "2026-03-11",
    erLest: false,
    status: "warning",
  },
  {
    id: "varsel-103",
    sakId: lagMockSakUuid("103", 1),
    tittel: "Ny kommentar på sak #103",
    tekst: "Det har kommet inn en ny kommentar fra saksbehandler.",
    tidspunkt: "2026-03-12",
    erLest: false,
    status: "announcement",
  },
  {
    id: "varsel-104",
    sakId: lagMockSakUuid("104", 1),
    tittel: "Sak #104 trenger oppfølging",
    tekst: "Fristen nærmer seg og saken bør vurderes i dag.",
    tidspunkt: "2026-03-13",
    erLest: false,
    status: "warning",
  },
  {
    id: "varsel-105",
    sakId: lagMockSakUuid("101", 1),
    tittel: "Sak #101 er klar for neste steg",
    tekst: "Alle nødvendige dokumenter er nå tilgjengelige.",
    tidspunkt: "2026-03-14",
    erLest: false,
    status: "success",
  },
  {
    id: "varsel-106",
    sakId: lagMockSakUuid("102", 1),
    tittel: "Sak #102 har ny hendelse",
    tekst: "Det er loggført en ny hendelse i historikken.",
    tidspunkt: "2026-03-15",
    erLest: false,
    status: "announcement",
  },
  {
    id: "varsel-107",
    sakId: lagMockSakUuid("103", 1),
    tittel: "Sak #103 må vurderes",
    tekst: "Det har kommet inn nye opplysninger som krever vurdering.",
    tidspunkt: "2026-03-16",
    erLest: false,
    status: "warning",
  },
];

export let mockVarsler: Varsel[] = rådata.map((varsel) => varselSchema.parse(varsel));

export function hentUlesteVarsler() {
  return mockVarsler
    .filter((varsel) => !varsel.erLest)
    .sort((a, b) => b.tidspunkt.localeCompare(a.tidspunkt));
}

export function markerVarselSomLest(varselId: string) {
  const varsel = mockVarsler.find((item) => item.id === varselId);

  if (!varsel) {
    throw new Error(`Fant ikke varsel med id ${varselId}`);
  }

  varsel.erLest = true;
}

export function resetMockVarsler() {
  mockVarsler = rådata.map((varsel) => varselSchema.parse(varsel));
}
