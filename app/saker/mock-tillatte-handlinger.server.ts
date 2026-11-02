import type {
  KontrollsakResponse,
  KontrollsakStatus,
  KontrollsakSteg,
  ResultatType,
  TillatteHandlingerResponse,
} from "./types.backend";
import {
  erHenlagtIGjeldendeSteg,
  erPolitiresultatKomplett,
  kanAvsluttesFraForvaltning,
} from "./handlinger/tillatte-steg";
import { henleggelsesarsakEtiketter, resultatEtiketter } from "./visning";

export function erGyldigMockStegovergang(
  sak: KontrollsakResponse,
  nyttSteg: KontrollsakSteg,
): boolean {
  if (sak.status === "I_BERO") return false;
  const steg = sak.steg === "UTREDES" ? "UTREDNING" : sak.steg;
  const ytelserHarAntattBelop = sak.ytelser.every((ytelse) => ytelse.belop !== null);
  switch (steg) {
    case "OPPRETTET":
      return nyttSteg === "UTREDNING" || nyttSteg === "STRAFFERETTSLIG_VURDERING";
    case "UTREDNING":
      if (nyttSteg === "FORVALTNING") {
        return (
          ["FEILUTBETALINGSSAK_ORDINAER", "FEILUTBETALINGSSAK_POTENSIELL_STRAFFESAK"].includes(
            sak.resultat?.utredning?.type ?? "",
          ) && ytelserHarAntattBelop
        );
      }
      return (
        nyttSteg === "AVSLUTTET" &&
        ["KONTROLLNOTAT", "HENLAGT"].includes(sak.resultat?.utredning?.type ?? "") &&
        (sak.resultat?.utredning?.type !== "HENLAGT" ||
          sak.resultat.utredning.henleggelsesarsak != null)
      );
    case "FORVALTNING":
      if (nyttSteg === "STRAFFERETTSLIG_VURDERING") {
        return sak.resultat?.forvaltning?.type === "SAKEN_SKAL_VURDERES_FOR_ANMELDELSE";
      }
      return (
        nyttSteg === "AVSLUTTET" && kanAvsluttesFraForvaltning(sak, feltskjemaFor("FORVALTNING"))
      );
    case "STRAFFERETTSLIG_VURDERING":
      if (nyttSteg === "POLITI") {
        return (
          sak.resultat?.strafferettsligVurdering?.type === "ANMELDT" &&
          sak.resultat.strafferettsligVurdering.anmeldtBelop != null &&
          Boolean(sak.resultat.strafferettsligVurdering.politidistrikt?.trim())
        );
      }
      return (
        nyttSteg === "AVSLUTTET" &&
        ["FEILUTBETALINGSSAK_ORDINAER", "HENLAGT"].includes(
          sak.resultat?.strafferettsligVurdering?.type ?? "",
        ) &&
        (sak.resultat?.strafferettsligVurdering?.type !== "HENLAGT" ||
          sak.resultat.strafferettsligVurdering.henleggelsesarsak != null)
      );
    case "POLITI":
      // En påklaget henleggelse må erstattes av en ny avgjørelse før saken kan avsluttes.
      return (
        nyttSteg === "AVSLUTTET" &&
        sak.status !== "PAAKLAGET" &&
        erPolitiresultatKomplett(sak.resultat?.politi)
      );
    default:
      return false;
  }
}

const resultatvalg: Partial<Record<KontrollsakSteg, ResultatType[]>> = {
  UTREDNING: ["FEILUTBETALINGSSAK_ORDINAER", "FEILUTBETALINGSSAK_POTENSIELL_STRAFFESAK", "HENLAGT"],
  FORVALTNING: [
    "SAKEN_SKAL_VURDERES_FOR_ANMELDELSE",
    "SAKEN_SKAL_IKKE_VURDERES_FOR_ANMELDELSE",
    "FEILUTBETALINGSSAK_ORDINAER",
    "KONTROLLNOTAT",
    "HENLAGT",
  ],
  STRAFFERETTSLIG_VURDERING: ["ANMELDT", "HENLAGT"],
  POLITI: ["HENLAGT", "FORELEGG", "PATALEUNNLATELSE", "FRIFINNELSE", "DOMFELLELSE"],
};

type Henleggelsesarsak = keyof typeof henleggelsesarsakEtiketter;

/** Speiler `Henleggelsesarsak.tillatteFor` i backend. */
const henleggelsesarsakerPerSteg: Partial<Record<KontrollsakSteg, Henleggelsesarsak[]>> = {
  UTREDNING: [
    "IKKE_KAPASITET",
    "IKKE_TILSTREKKELIG_BEVISGRUNNLAG",
    "IKKE_TILSTREKKELIG_SKYLD",
    "FORELDET",
    "SAK_PABEGYNT_ELLER_OVERTATT_AV_ANDRE",
    "IKKE_PRIORITERT",
    "KONTROLLNOTAT",
  ],
  STRAFFERETTSLIG_VURDERING: [
    "NAY_MANGLER_I_SAKSBEHANDLINGEN",
    "NFP_MANGLER_I_SAKSBEHANDLINGEN",
    "NAY_MANGLER_VED_BEREGNINGSSKJEMA",
    "NFP_MANGLER_VED_BEREGNINGSSKJEMA",
    "NAY_MANGELFULL_DOKUMENTASJON",
    "NFP_MANGELFULL_DOKUMENTASJON",
    "NAY_MANGLENDE_DOKUMENTER",
    "NFP_MANGLENDE_DOKUMENTER",
    "NAY_LANG_LIGGETID_HOS_NAV",
    "NFP_LANG_LIGGETID_HOS_NAV",
    "NAY_GAMMEL_SAK",
    "NFP_GAMMEL_SAK",
    "NAV_KONTOR_BRUKER_FEILINFORMERT",
    "NAV_KONTOR_MANGLENDE_INFORMASJON",
    "TUNGTVEIENDE_GRUNNER",
    "UNDER_BELOPSGRENSEN",
    "UNDER_KLAGEBEHANDLING",
    "MANGLER_SUBJEKTIV_SKYLD",
  ],
};

function henleggelsesarsaker(steg: KontrollsakSteg) {
  return (henleggelsesarsakerPerSteg[steg] ?? []).map((verdi) => ({
    verdi,
    etikett: henleggelsesarsakEtiketter[verdi],
  }));
}

function mockFelt(
  felt: string,
  etikett: string,
  datatype: TillatteHandlingerResponse["feltskjema"][number]["datatype"],
  paakrevd: boolean,
  verdier: { verdi: string; etikett: string }[] = [],
  paakrevdNar?: string,
): TillatteHandlingerResponse["feltskjema"][number] {
  return { felt, etikett, datatype, paakrevd, verdier, paakrevdNar };
}

const DOMFELLELSE = "politi.type=DOMFELLELSE";

function valgfrittDomfellelsesfelt(
  felt: string,
  etikett: string,
  datatype: TillatteHandlingerResponse["feltskjema"][number]["datatype"] = "heltall",
): TillatteHandlingerResponse["feltskjema"][number] {
  return { felt, etikett, datatype, paakrevd: false, verdier: [], valgfriNar: DOMFELLELSE };
}

function feltskjemaFor(steg: KontrollsakSteg): TillatteHandlingerResponse["feltskjema"] {
  switch (steg) {
    case "UTREDNING":
    case "UTREDES":
      return [
        mockFelt(
          "utredning.type",
          "Resultat fra utredningen",
          "enum",
          true,
          (resultatvalg.UTREDNING ?? []).map((verdi) => ({
            verdi,
            etikett: resultatEtiketter[verdi],
          })),
        ),
        mockFelt(
          "utredning.henleggelsesarsak",
          "Årsak til henleggelse",
          "enum",
          false,
          henleggelsesarsaker("UTREDNING"),
          "utredning.type=HENLAGT",
        ),
        mockFelt("ytelser[].belop", "Beløp for ytelsen", "belop", false),
      ];
    case "FORVALTNING":
      return [
        mockFelt("forvaltning.type", "Beslutning i forvaltningen", "enum", true, [
          {
            verdi: "SAKEN_SKAL_VURDERES_FOR_ANMELDELSE",
            etikett: "Saken skal vurderes for anmeldelse",
          },
          {
            verdi: "SAKEN_SKAL_IKKE_VURDERES_FOR_ANMELDELSE",
            etikett: "Saken skal ikke vurderes for anmeldelse",
          },
        ]),
        mockFelt(
          "forvaltning.endeligUtfall.type",
          "Endelig resultat",
          "enum",
          false,
          (["FEILUTBETALINGSSAK_ORDINAER", "KONTROLLNOTAT", "HENLAGT"] as const).map((verdi) => ({
            verdi,
            etikett: resultatEtiketter[verdi],
          })),
          "forvaltning.type=SAKEN_SKAL_IKKE_VURDERES_FOR_ANMELDELSE",
        ),
        mockFelt("ytelser[].endeligBelop", "Endelig beløp for ytelsen", "belop", false),
        mockFelt("forvaltning.tilbakekrevdBelop", "Tilbakekrevd beløp", "belop", false),
      ];
    case "STRAFFERETTSLIG_VURDERING":
      return [
        mockFelt(
          "strafferettsligVurdering.type",
          "Resultat av strafferettslig vurdering",
          "enum",
          true,
          (resultatvalg.STRAFFERETTSLIG_VURDERING ?? []).map((verdi) => ({
            verdi,
            etikett: resultatEtiketter[verdi],
          })),
        ),
        mockFelt(
          "strafferettsligVurdering.henleggelsesarsak",
          "Årsak til henleggelse",
          "enum",
          false,
          henleggelsesarsaker("STRAFFERETTSLIG_VURDERING"),
          "strafferettsligVurdering.type=HENLAGT",
        ),
        mockFelt(
          "strafferettsligVurdering.anmeldtBelop",
          "Anmeldt beløp",
          "belop",
          false,
          [],
          "strafferettsligVurdering.type=ANMELDT",
        ),
        mockFelt(
          "strafferettsligVurdering.politidistrikt",
          "Politidistrikt",
          "tekst",
          false,
          [],
          "strafferettsligVurdering.type=ANMELDT",
        ),
      ];
    case "POLITI":
      return [
        mockFelt(
          "politi.type",
          "Resultat",
          "enum",
          true,
          (resultatvalg.POLITI ?? []).map((verdi) => ({
            verdi,
            etikett: resultatEtiketter[verdi],
          })),
        ),
        mockFelt(
          "politi.begrunnelse",
          "Årsak",
          "tekst",
          false,
          [],
          "politi.type=HENLAGT eller FRIFINNELSE",
        ),
        mockFelt(
          "paaklaget",
          "Påklager Nav Kontroll henleggelsen?",
          "boolsk",
          false,
          [],
          "politi.type=HENLAGT",
        ),
        mockFelt("politi.belop", "Beløp", "belop", false, [], "politi.type=FORELEGG"),
        mockFelt("politi.domsdato", "Domsdato", "dato", false, [], DOMFELLELSE),
        valgfrittDomfellelsesfelt("politi.ubetingetFengselMaaneder", "Ubetinget fengsel (måneder)"),
        valgfrittDomfellelsesfelt("politi.ubetingetFengselDager", "Ubetinget fengsel (dager)"),
        valgfrittDomfellelsesfelt("politi.betingetFengselMaaneder", "Betinget fengsel (måneder)"),
        valgfrittDomfellelsesfelt("politi.betingetFengselDager", "Betinget fengsel (dager)"),
        valgfrittDomfellelsesfelt("politi.samfunnsstraffTimer", "Samfunnsstraff"),
        valgfrittDomfellelsesfelt("politi.domfeltBelop", "Domfelt beløp", "belop"),
        valgfrittDomfellelsesfelt("politi.siviltRettskrav", "Sivilt rettskrav", "belop"),
        valgfrittDomfellelsesfelt("politi.bot", "Bot", "belop"),
        mockFelt("politi.tilstaaelsesdom", "Tilståelsesdom", "boolsk", true, [], DOMFELLELSE),
        mockFelt("politi.medvirker", "Medvirker?", "boolsk", true, [], DOMFELLELSE),
        mockFelt(
          "politi.strafferabattLiggetid",
          "Strafferabatt?",
          "enum",
          true,
          [
            { verdi: "INGEN", etikett: "Ingen strafferabatt" },
            { verdi: "NAV", etikett: "Liggetid hos Nav" },
            { verdi: "POLITIET", etikett: "Liggetid hos politiet" },
            { verdi: "BEGGE", etikett: "Liggetid hos begge" },
          ],
          DOMFELLELSE,
        ),
        mockFelt(
          "politi.emkBrudd",
          "Brudd på EMK art. 6?",
          "boolsk",
          false,
          [],
          "politi.strafferabattLiggetid=NAV, POLITIET eller BEGGE",
        ),
      ];
    default:
      return [];
  }
}

export function hentMockTillatteHandlinger(sak: KontrollsakResponse): TillatteHandlingerResponse {
  const steg = sak.steg === "UTREDES" ? "UTREDNING" : sak.steg;
  const feltskjema = feltskjemaFor(steg);
  const resultater = resultatvalg[steg] ?? [];
  const handlinger: TillatteHandlingerResponse["handlinger"] = [];
  const ytelser = sak.ytelser.map((ytelse, indeks) => ({
    ...ytelse,
    id: ytelse.id ?? `00000000-0000-4000-8000-${(sak.id + indeks).toString(16).padStart(12, "0")}`,
  }));
  const muligeNesteSteg: KontrollsakSteg[] =
    sak.status === "I_BERO"
      ? []
      : (() => {
          switch (steg) {
            case "OPPRETTET":
              return ["UTREDNING", "STRAFFERETTSLIG_VURDERING"];
            case "UTREDNING":
              return sak.resultat?.utredning?.type === "HENLAGT"
                ? ["AVSLUTTET"]
                : ["FORVALTNING", "AVSLUTTET"];
            case "FORVALTNING":
              return erHenlagtIGjeldendeSteg({ steg, resultat: sak.resultat ?? null })
                ? ["AVSLUTTET"]
                : ["STRAFFERETTSLIG_VURDERING", "AVSLUTTET"];
            case "STRAFFERETTSLIG_VURDERING":
              return sak.resultat?.strafferettsligVurdering?.type === "HENLAGT"
                ? ["AVSLUTTET"]
                : ["POLITI", "AVSLUTTET"];
            case "POLITI":
              return ["AVSLUTTET"];
            default:
              return [];
          }
        })();
  const kanFlytteTil = muligeNesteSteg.filter((nesteSteg) =>
    erGyldigMockStegovergang(sak, nesteSteg),
  );
  const statusvalg: Record<KontrollsakSteg, (KontrollsakStatus | null)[]> = {
    OPPRETTET: [null],
    UTREDNING: ["AKTIV", "VENTER_PA_INFORMASJON"],
    UTREDES: ["AKTIV", "VENTER_PA_INFORMASJON"],
    FORVALTNING: ["VENTER_PA_VEDTAK"],
    STRAFFERETTSLIG_VURDERING: ["AKTIV", "VENTER_PA_INFORMASJON"],
    POLITI: ["VENTER_PA_RESULTAT"],
    ANMELDT: ["VENTER_PA_RESULTAT"],
    AVSLUTTET: [],
  };
  const statusFørBero =
    sak.status === "I_BERO"
      ? sak.statusFørBero !== undefined
        ? sak.statusFørBero
        : (statusvalg[steg][0] ?? null)
      : null;
  if (steg !== "AVSLUTTET" && sak.status !== "I_BERO") {
    if (muligeNesteSteg.length > 0) {
      handlinger.push({
        type: "FLYTT_TIL_NESTE_STEG",
        metode: "POST",
        sti: `/api/v1/kontrollsaker/${sak.id}/steg`,
      });
    }
  }
  if (
    steg === "POLITI" &&
    sak.status !== "I_BERO" &&
    (sak.status === "PAAKLAGET" ||
      !erHenlagtIGjeldendeSteg({ steg, resultat: sak.resultat ?? null }))
  ) {
    handlinger.push({
      type: "REGISTRER_RESULTAT",
      metode: "PUT",
      sti: `/api/v1/kontrollsaker/${sak.id}/resultat`,
    });
  }
  if (steg !== "AVSLUTTET") {
    handlinger.push({
      type: "ENDRE_STATUS",
      metode: "POST",
      sti: `/api/v1/kontrollsaker/${sak.id}/status`,
    });
  }

  return {
    versjon: 1,
    tilstand: {
      steg,
      status: sak.status,
      statusFørBero,
      resultat: sak.resultat ?? null,
      ytelser,
    },
    handlinger,
    tillatteSteg: kanFlytteTil,
    muligeNesteSteg,
    tillatteStatuser:
      steg === "AVSLUTTET"
        ? []
        : sak.status === "I_BERO"
          ? [statusFørBero]
          : sak.status === "PAAKLAGET"
            ? ["PAAKLAGET", "I_BERO"]
            : [...statusvalg[steg], "I_BERO"],
    tillatteResultater: resultater,
    paakrevdeRegistreringer: [],
    paakrevdeRegistreringerPerSteg: Object.fromEntries(
      muligeNesteSteg.map((nesteSteg) => {
        if (steg === "UTREDNING") {
          return [
            nesteSteg,
            nesteSteg === "FORVALTNING"
              ? ["utredning.type", "ytelser[].belop"]
              : ["utredning.type"],
          ];
        }
        if (steg === "FORVALTNING") {
          return [
            nesteSteg,
            nesteSteg === "AVSLUTTET"
              ? ["forvaltning.type", "forvaltning.endeligUtfall.type"]
              : ["forvaltning.type"],
          ];
        }
        if (steg === "STRAFFERETTSLIG_VURDERING") {
          return [
            nesteSteg,
            nesteSteg === "POLITI"
              ? [
                  "strafferettsligVurdering.type",
                  "strafferettsligVurdering.anmeldtBelop",
                  "strafferettsligVurdering.politidistrikt",
                ]
              : ["strafferettsligVurdering.type"],
          ];
        }
        if (steg === "POLITI") {
          return [nesteSteg, ["politi.type"]];
        }
        return [nesteSteg, []];
      }),
    ),
    feltskjema,
  };
}
