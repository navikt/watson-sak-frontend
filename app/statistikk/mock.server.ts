import type { Aldersvarsel } from "~/alle-saker/aldersfilter";
import { filtrerSaker } from "~/alle-saker/saker-utils";
import { getSaksenhet } from "~/saker/selectors";
import { lagMockOyeblikksbilde, velgSakKategori } from "~/saker/mock-oppsummering.server";
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
    ["Strafferettslig vurdering", "STRAFFERETTSLIG_VURDERING"],
    ["Politi", "POLITI"],
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
  const hovedavdelingId = spørring.enhetId ?? avdelingId;
  const omfangEnheter =
    spørring.nivaa === "underavdeling"
      ? [hovedavdelingId].filter((enhetId): enhetId is string => enhetId !== null)
      : spørring.nivaa === "hovedavdeling" && hovedavdelingId
        ? [hovedavdelingId]
        : [];
  // Mocken kjenner bare valgt enhet og saker med enhetstilhørighet; hovedavdeling tar med underenheter som finnes i sakene.
  const nøkkeltallEnheter =
    spørring.nivaa === "hovedavdeling" && hovedavdelingId
      ? [
          ...omfangEnheter,
          ...new Set(
            aldersgrunnlag.saker
              .map(getSaksenhet)
              .filter((enhet) => enhet.startsWith(`${hovedavdelingId}-`)),
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
  const åpneSaker = nøkkeltallSaker.filter((sak) => velgSakKategori(sak) !== null);
  const øyeblikksbilde = lagMockOyeblikksbilde(nøkkeltallSaker);
  const nå = new Date();
  const eldsteÅpneSak = åpneSaker.reduce<(typeof åpneSaker)[number] | null>(
    (eldste, sak) =>
      !eldste || new Date(sak.opprettet).getTime() < new Date(eldste.opprettet).getTime()
        ? sak
        : eldste,
    null,
  );
  const aldersbøtter = [
    ["0–3", 0, 2],
    ["3–6", 3, 5],
    ["6–9", 6, 8],
    ["9–12", 9, 11],
    ["12–24", 12, 23],
    [">24", 24, Number.MAX_SAFE_INTEGER],
  ] as const;
  const månederSiden = (opprettet: string) => heleKalendermåneder(opprettet, nå);
  const periodeTall = {
    innkomne: 323,
    avsluttede: 250,
    snittDagerAvsluttet: 32,
    antattBeløp: "2400000",
    vedtattBeløp: "1800000",
    anmeldtBeløp: "600000",
  };
  const henlagt = [
    ["Etter utredning", 126],
    ["Som straffesak", 42],
  ].map(([navn, verdi]) => ({ navn, verdi })) as Statistikk["henlagt"];
  const henlagtAntall = henlagt.reduce((sum, rad) => sum + rad.verdi, 0);

  const valgtOmfang =
    spørring.nivaa === "meg"
      ? "meg"
      : spørring.nivaa === "hovedavdeling"
        ? `hovedavdeling:${hovedavdelingId ?? "ukjent"}`
        : spørring.nivaa === "underavdeling"
          ? `enhet:${spørring.enhetId ?? avdelingId ?? "ukjent"}`
          : "organisasjon";
  const organisasjonsvalg: Statistikk["organisasjonsvalg"] = [
    { verdi: "meg", label: "Meg selv", type: "meg" },
    {
      verdi: `hovedavdeling:${avdelingId ?? "ukjent"}`,
      label: `Min avdeling (${avdeling})`,
      type: "enhet",
    },
    {
      verdi: `enhet:${avdelingId ?? "ukjent"}`,
      label: avdeling || "Egen enhet",
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
  ];
  if (!organisasjonsvalg.some((valg) => valg.verdi === valgtOmfang)) {
    organisasjonsvalg.push({
      verdi: valgtOmfang,
      label: valgtOmfang.startsWith("hovedavdeling:")
        ? `Min avdeling (${avdeling || "ukjent"})`
        : avdeling || "Egen enhet",
      type: "enhet",
    });
  }

  return {
    valgtOmfang,
    omfangEnheter,
    organisasjonsvalg,
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
      {
        label: "Eldste åpne sak",
        verdi: eldsteÅpneSak ? `${månederSiden(eldsteÅpneSak.opprettet)} mnd` : "–",
        forklaring: eldsteÅpneSak ? `Sak ${eldsteÅpneSak.id}` : "Ingen åpne saker",
        tone: "neutral",
      },
      {
        label: "Saksbehandlingstid",
        verdi: formaterVarighet(periodeTall.snittDagerAvsluttet),
        forklaring: "Snitt fra utredning til avsluttet, siste 12 mnd",
        tone: "success",
      },
    ],
    sakstyper: sakstyper.map(([navn, filterverdi]) => ({
      navn,
      filterverdi,
      deler: statuser.map(([status, statusfilter]) => ({
        navn: status,
        filterverdi: statusfilter,
        verdi: åpneSaker.filter(
          (sak) => sak.kategori === filterverdi && normaliserSteg(sak.steg) === statusfilter,
        ).length,
      })),
    })),
    alderssammensetning: aldersbøtter.map(([navn, fra, til]) => ({
      navn,
      verdi: åpneSaker.filter(
        (sak) => månederSiden(sak.opprettet) >= fra && månederSiden(sak.opprettet) <= til,
      ).length,
    })),
    periodeTall,
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
      verdi:
        navn === "Opprettet" ? periodeTall.innkomne : navn === "Henlagt" ? henlagtAntall : verdi,
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
    henlagt,
  };
}

function normaliserSteg(steg: string): string {
  if (steg === "UTREDES") return "UTREDNING";
  if (steg === "ANMELDT") return "POLITI";
  return steg;
}

function heleKalendermåneder(opprettet: string, nå: Date): number {
  const datoFormat = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Oslo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const deler = (dato: Date) =>
    Object.fromEntries(
      datoFormat.formatToParts(dato).map(({ type, value }) => [type, Number(value)]),
    );
  const fra = deler(new Date(opprettet));
  const til = deler(nå);
  const kalenderdager = (til.year - fra.year) * 12 + til.month - fra.month;
  return kalenderdager - (til.day < fra.day ? 1 : 0);
}

function formaterVarighet(dager: number | null | undefined): string {
  if (dager == null) return "–";
  if (dager === 0) return "under 1 dag";
  if (dager === 1) return "1 dag";
  if (dager < 60) return `${dager} dager`;
  return `${Math.floor(dager / 30)} mnd`;
}
