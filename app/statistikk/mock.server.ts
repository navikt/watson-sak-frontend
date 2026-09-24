import type { Statistikk, StatistikkSpørring } from "./types";

export function lagMockStatistikk(
  spørring: StatistikkSpørring,
  avdeling: string,
  avdelingId: string | null,
): Statistikk {
  const statusfarger = [
    ["Opprettet", "OPPRETTET", "--ax-brand-blue-600"],
    ["Utredes", "UTREDES", "--ax-brand-magenta-600"],
    ["Forvaltning", "FORVALTNING", "--ax-warning-600"],
    ["Avsluttet", "AVSLUTTET", "--ax-success-700"],
  ] as const;
  const sakstyper = [
    ["Samliv", "SAMLIV"],
    ["Arbeid", "ARBEID"],
    ["Utland", "UTLAND"],
    ["Identitet", "IDENTITET"],
    ["Tiltak", "TILTAK"],
    ["Dokumentfalsk", "DOKUMENTFALSK"],
    ["Annet", "ANNET"],
    ["Behandler", "BEHANDLER"],
  ] as const;
  const label =
    spørring.fra.endsWith("-01-01") && spørring.til.endsWith("-12-31")
      ? spørring.fra.slice(0, 4)
      : spørring.fra === spørring.til
        ? spørring.fra
        : "Egendefinert periode";

  return {
    valgtOmfang: spørring.enhetId ? `enhet:${spørring.enhetId}` : spørring.nivaa,
    organisasjonsvalg: [
      { verdi: "meg", label: "Meg selv", type: "meg" },
      {
        verdi: `enhet:${avdelingId ?? "ukjent"}`,
        label: `Min avdeling (${avdeling})`,
        type: "enhet",
      },
      {
        verdi: `enhet:${avdelingId ?? "ukjent"}-1`,
        label: `${avdeling} 1`,
        type: "enhet",
      },
      {
        verdi: `enhet:${avdelingId ?? "ukjent"}-2`,
        label: `${avdeling} 2`,
        type: "enhet",
      },
      { verdi: "organisasjon", label: "Hele organisasjonen", type: "organisasjon" },
    ],
    periode: { fra: spørring.fra, til: spørring.til, label },
    varsler: [
      {
        tone: "warning",
        tekst: "7 saker nærmer seg 12 måneders total behandlingstid",
        lenkeTekst: "Se aktive saker",
        filter: "nærmer-seg-frist",
      },
      {
        tone: "info",
        tekst: "24 saker overskrider 30 dager fra opprettet",
        lenkeTekst: "Se aktive saker",
        filter: "over-30-dager",
      },
    ],
    nøkkeltall: [
      { label: "Totalt", verdi: "87", forklaring: "Antall saker", tone: "accent" },
      { label: "Aktive", verdi: "60", forklaring: "Utrede + straffevurd.", tone: "warning" },
      {
        label: "Venter på andre",
        verdi: "15",
        forklaring: "Info/berostilling/politi",
        tone: "accent",
      },
      { label: "Ikke fordelt", verdi: "12", forklaring: "Saker", tone: "danger" },
      { label: "Eldste åpne", verdi: "27 mnd", forklaring: "Sak 102", tone: "neutral" },
      {
        label: "Saksbehandlingstid",
        verdi: "4 mnd",
        forklaring: "Utredning (snitt)",
        tone: "success",
      },
    ],
    sakstyper: sakstyper.map(([navn, filterverdi], index) => ({
      navn,
      filterverdi,
      deler: statusfarger.map(([status, statusfilter, farge], statusIndex) => ({
        navn: status,
        filterverdi: statusfilter,
        verdi: [8, 12, 6, 8][(index + statusIndex) % 4] + statusIndex * 2,
        farge,
      })),
    })),
    alderssammensetning: [
      ["0–3", 49, "--ax-success-700"],
      ["3–6", 18, "--ax-success-600"],
      ["6–9", 9, "--ax-warning-700"],
      ["9–12", 7, "--ax-warning-600"],
      ["12–24", 3, "--ax-danger-600"],
      [">24", 1, "--ax-danger-700"],
    ].map(([navn, verdi, farge]) => ({ navn, verdi, farge })) as Statistikk["alderssammensetning"],
    periodeTall: {
      innkomne: 87,
      avsluttede: 156,
      antattBeløp: "2,4 mill",
      vedtattBeløp: "1,8 mill",
      anmeldtBeløp: "0,6 mill",
    },
    statusfordeling: [
      ["Tildelt", "OPPRETTET", 323, 100],
      ["Utredet", "UTREDES", 234, 72],
      ["Henlagt", "AVSLUTTET", 168, 52],
      ["Forvaltning", "FORVALTNING", 120, 37],
      ["Strafferettslig vurdert", "STRAFFERETTSLIG_VURDERING", 89, 28],
      ["Politi", "POLITI", 45, 14],
    ].map(([navn, filterverdi, verdi, prosent]) => ({
      navn,
      filterverdi,
      verdi,
      prosent,
    })) as Statistikk["statusfordeling"],
    kategorifordeling: [
      ["Samliv", 18, "--ax-brand-blue-600"],
      ["Arbeid", 18, "--ax-brand-beige-700"],
      ["Utland", 15, "--ax-warning-600"],
      ["Identitet", 13, "--ax-meta-purple-600"],
      ["Tiltak", 11, "--ax-brand-blue-800"],
      ["Dokumentfalsk", 15, "--ax-danger-700"],
      ["Annet", 13, "--ax-success-700"],
      ["Behandler", 11, "--ax-brand-magenta-700"],
    ].map(([navn, verdi, farge]) => ({ navn, verdi, farge })) as Statistikk["kategorifordeling"],
    kontrollrapport: [
      ["Feilutbetaling", 78, 65],
      ["Potensiell straffesak", 42, 35],
    ].map(([navn, verdi, prosent]) => ({ navn, verdi, prosent })) as Statistikk["kontrollrapport"],
    henlagt: [
      ["Etter utredning", 126, "--ax-success-700"],
      ["Som straffesak", 42, "--ax-danger-600"],
    ].map(([navn, verdi, farge]) => ({ navn, verdi, farge })) as Statistikk["henlagt"],
  };
}
