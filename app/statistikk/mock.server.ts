import type { Aldersvarsel } from "~/alle-saker/aldersfilter";
import { filtrerSaker } from "~/alle-saker/saker-utils";
import { getSaksenhet } from "~/saker/selectors";
import { lagMockOyeblikksbilde } from "~/saker/mock-oppsummering.server";
import type { KontrollsakResponse } from "~/saker/types.backend";
import type { Statistikk, StatistikkSpørring } from "./types";

/** Mock-sakene varslene telles i, og innlogget bruker for «Meg selv»-omfanget. */
/** `mineSaker` er samme utvalg som forsiden teller (hentMineSaker), med demosakene som eies av innlogget bruker. */
type Aldersgrunnlag = {
  saker: KontrollsakResponse[];
  navIdent: string;
  mineSaker?: KontrollsakResponse[];
};

/**
 * Teller med samme filter som «Alle saker» bruker i mockmodus, så tallet i varslet blir det
 * samme som antall treff bak lenken. Speiler `lagVarsler` i watson-admin-api.
 */
function lagVarsler(
  { saker, navIdent }: Aldersgrunnlag,
  omfangEnheter: string[],
  erMeg: boolean,
): Statistikk["varsler"] {
  const tell = (aldersvarsel: Aldersvarsel) =>
    filtrerSaker(saker, {
      enhet: omfangEnheter,
      saksbehandler: erMeg ? [navIdent] : [],
      kategori: [],
      misbrukstype: [],
      merking: [],
      steg: [],
      aldersvarsel,
    }).length;
  const antallSaker = (antall: number) => `${antall} ${antall === 1 ? "sak" : "saker"}`;
  const nærmerSegTolvMåneder = tell("NAERMER_SEG_12_MAANEDER");
  const fraTrettiDager = tell("FRA_30_DAGER");

  return [
    ...(nærmerSegTolvMåneder > 0
      ? [
          {
            tone: "warning" as const,
            tekst: `${antallSaker(nærmerSegTolvMåneder)} nærmer seg 12 måneders total behandlingstid`,
            lenkeTekst: "Se aktive saker",
            filter: "nærmer-seg-frist",
          },
        ]
      : []),
    ...(fraTrettiDager > 0
      ? [
          {
            tone: "info" as const,
            tekst: `${antallSaker(fraTrettiDager)} overskrider 30 dager fra opprettet`,
            lenkeTekst: "Se aktive saker",
            filter: "over-30-dager",
          },
        ]
      : []),
  ];
}

export function lagMockStatistikk(
  spørring: StatistikkSpørring,
  avdeling: string,
  avdelingId: string | null,
  aldersgrunnlag: Aldersgrunnlag,
): Statistikk {
  const statuser = [
    ["Opprettet", "OPPRETTET"],
    ["Utredning", "UTREDNING"],
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
  const omfangEnheter =
    spørring.nivaa === "underavdeling"
      ? [spørring.enhetId ?? avdelingId].filter((enhetId): enhetId is string => enhetId !== null)
      : spørring.nivaa === "hovedavdeling" && avdelingId
        ? [avdelingId]
        : [];
  // Mocken kjenner bare valgt enhet og saker med enhetstilhørighet; hovedavdeling tar med underenheter som finnes i sakene.
  const nøkkeltallEnheter =
    spørring.nivaa === "hovedavdeling" && avdelingId
      ? [
          ...omfangEnheter,
          ...new Set(
            aldersgrunnlag.saker
              .map(getSaksenhet)
              .filter((enhet) => enhet.startsWith(`${avdelingId}-`)),
          ),
        ]
      : omfangEnheter;
  const nøkkeltallSaker =
    spørring.nivaa === "meg"
      ? (aldersgrunnlag.mineSaker ??
        aldersgrunnlag.saker.filter(
          (sak) => sak.saksbehandlere.eier?.navIdent === aldersgrunnlag.navIdent,
        ))
      : nøkkeltallEnheter.length > 0
        ? aldersgrunnlag.saker.filter(
            (sak) =>
              nøkkeltallEnheter.includes(getSaksenhet(sak)) ||
              nøkkeltallEnheter.includes(sak.saksbehandlere.eier?.enhet ?? ""),
          )
        : aldersgrunnlag.saker;
  const øyeblikksbilde = lagMockOyeblikksbilde(nøkkeltallSaker);

  return {
    valgtOmfang:
      spørring.enhetId || (spørring.nivaa === "underavdeling" && avdelingId)
        ? `enhet:${spørring.enhetId ?? avdelingId}`
        : spørring.nivaa,
    omfangEnheter,
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
    varsler: lagVarsler(aldersgrunnlag, omfangEnheter, spørring.nivaa === "meg"),
    nøkkeltall: [
      {
        label: "Totalt",
        verdi: String(øyeblikksbilde.totalt),
        forklaring: `Åpne saker, inkludert ${øyeblikksbilde.nye} nye`,
        tone: "accent",
      },
      {
        label: "Aktive",
        verdi: String(øyeblikksbilde.aktive),
        forklaring: "I utredning eller strafferettslig vurdering",
        tone: "warning",
      },
      {
        label: "Venter på andre",
        verdi: String(øyeblikksbilde.venterPåAndre),
        forklaring:
          "Venter på informasjon, vedtak eller resultat, i bero, forvaltning eller politi",
        tone: "accent",
      },
      {
        label: "Ikke fordelt",
        verdi: String(øyeblikksbilde.ikkeFordelt),
        forklaring: "Saker",
        tone: "danger",
      },
      { label: "Eldste åpne sak", verdi: "27 mnd", forklaring: "Sak 102", tone: "neutral" },
      {
        label: "Saksbehandlingstid",
        verdi: "4 mnd",
        forklaring: "Utredes til avsluttet (snitt)",
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
      innkomne: 323,
      avsluttede: 156,
      snittDagerAvsluttet: 32,
      antattBeløp: "2400000",
      vedtattBeløp: "1800000",
      anmeldtBeløp: "600000",
    },
    statusfordeling: [
      ["Opprettet", "OPPRETTET", 323, 100],
      ["Utredet", "UTREDNING", 234, 72],
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
