import type { Statistikk, StatistikkSpørring } from "./types";

export function lagMockStatistikk(
  spørring: StatistikkSpørring,
  avdeling: string,
  avdelingId: string | null,
): Statistikk {
  const statuser = [
    ["Opprettet", "OPPRETTET"],
    ["Utredes", "UTREDES"],
    ["Forvaltning", "FORVALTNING"],
    ["Avsluttet", "AVSLUTTET"],
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
      deler: statuser.map(([status, statusfilter], statusIndex) => ({
        navn: status,
        filterverdi: statusfilter,
        verdi: [8, 12, 6, 8][(index + statusIndex) % 4] + statusIndex * 2,
      })),
    })),
    alderssammensetning: [
      ["0–3", 49],
      ["3–6", 18],
      ["6–9", 9],
      ["9–12", 7],
      ["12–24", 3],
      [">24", 1],
    ].map(([navn, verdi]) => ({ navn, verdi })) as Statistikk["alderssammensetning"],
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
      ["Samliv", 18],
      ["Arbeid", 18],
      ["Utland", 15],
      ["Identitet", 13],
      ["Tiltak", 11],
      ["Dokumentfalsk", 15],
      ["Annet", 13],
      ["Behandler", 11],
    ].map(([navn, verdi]) => ({ navn, verdi })) as Statistikk["kategorifordeling"],
    kontrollrapport: [
      ["Feilutbetaling", 78, 65],
      ["Potensiell straffesak", 42, 35],
    ].map(([navn, verdi, prosent]) => ({ navn, verdi, prosent })) as Statistikk["kontrollrapport"],
    henlagt: [
      ["Etter utredning", 126],
      ["Som straffesak", 42],
    ].map(([navn, verdi]) => ({ navn, verdi })) as Statistikk["henlagt"],
  };
}
