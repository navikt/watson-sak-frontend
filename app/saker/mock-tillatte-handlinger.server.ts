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

export function erGyldigMockStegovergang(
  sak: KontrollsakResponse,
  nyttSteg: KontrollsakSteg,
): boolean {
  if (sak.status === "I_BERO") return false;
  const steg = sak.steg === "UTREDES" ? "UTREDNING" : sak.steg;
  const ytelserHarAntattBelop = sak.ytelser.every((ytelse) => ytelse.belop !== null);
  const ytelserHarEndeligBelop = sak.ytelser.every((ytelse) => ytelse.endeligBelop !== null);
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
        return (
          sak.resultat?.forvaltning?.type === "SAKEN_SKAL_VURDERES_FOR_ANMELDELSE" &&
          ytelserHarEndeligBelop
        );
      }
      return (
        nyttSteg === "AVSLUTTET" && kanAvsluttesFraForvaltning(sak, feltskjemaFor("FORVALTNING"))
      );
    case "STRAFFERETTSLIG_VURDERING":
      if (nyttSteg === "POLITI") {
        return sak.resultat?.strafferettsligVurdering?.type === "ANMELDT";
      }
      return (
        nyttSteg === "AVSLUTTET" &&
        ["KONTROLLNOTAT", "FEILUTBETALINGSSAK_ORDINAER", "HENLAGT"].includes(
          sak.resultat?.strafferettsligVurdering?.type ?? "",
        ) &&
        (sak.resultat?.strafferettsligVurdering?.type !== "HENLAGT" ||
          sak.resultat.strafferettsligVurdering.henleggelsesarsak != null)
      );
    case "POLITI":
      return nyttSteg === "AVSLUTTET" && erPolitiresultatKomplett(sak.resultat?.politi);
    default:
      return false;
  }
}

const resultatvalg: Partial<Record<KontrollsakSteg, ResultatType[]>> = {
  UTREDNING: [
    "KONTROLLNOTAT",
    "FEILUTBETALINGSSAK_ORDINAER",
    "FEILUTBETALINGSSAK_POTENSIELL_STRAFFESAK",
    "HENLAGT",
  ],
  FORVALTNING: [
    "SAKEN_SKAL_VURDERES_FOR_ANMELDELSE",
    "SAKEN_SKAL_IKKE_VURDERES_FOR_ANMELDELSE",
    "FEILUTBETALINGSSAK_ORDINAER",
    "KONTROLLNOTAT",
    "HENLAGT",
  ],
  STRAFFERETTSLIG_VURDERING: ["ANMELDT", "KONTROLLNOTAT", "FEILUTBETALINGSSAK_ORDINAER", "HENLAGT"],
  POLITI: ["HENLAGT", "FORELEGG", "BOT", "PATALEUNNLATELSE", "FRIFINNELSE", "DOMFELLELSE"],
};

const resultatetiketter: Record<ResultatType, string> = {
  KONTROLLNOTAT: "Kontrollnotat",
  FEILUTBETALINGSSAK_ORDINAER: "Feilutbetalingssak, ordinær",
  FEILUTBETALINGSSAK_POTENSIELL_STRAFFESAK: "Feilutbetalingssak, potensiell straffesak",
  HENLAGT: "Henlagt",
  SAKEN_SKAL_VURDERES_FOR_ANMELDELSE: "Saken skal vurderes for anmeldelse",
  SAKEN_SKAL_IKKE_VURDERES_FOR_ANMELDELSE: "Saken skal ikke vurderes for anmeldelse",
  ANMELDT: "Anmeldt",
  FORELEGG: "Forelegg",
  BOT: "Bot",
  PATALEUNNLATELSE: "Påtaleunnlatelse",
  FRIFINNELSE: "Frifinnelse",
  DOMFELLELSE: "Domfellelse",
};

const henleggelsesarsaker = [
  { verdi: "IKKE_KAPASITET", etikett: "Ikke kapasitet" },
  { verdi: "IKKE_TILSTREKKELIG_BEVISGRUNNLAG", etikett: "Ikke tilstrekkelig bevisgrunnlag" },
  { verdi: "IKKE_TILSTREKKELIG_SKYLD", etikett: "Ikke tilstrekkelig skyld" },
  { verdi: "INGEN_UTREDNING", etikett: "Ingen utredning" },
  { verdi: "FORELDET", etikett: "Foreldet" },
];

const begrensedeHenleggelsesarsaker = henleggelsesarsaker.filter((arsak) =>
  ["IKKE_TILSTREKKELIG_BEVISGRUNNLAG", "IKKE_TILSTREKKELIG_SKYLD"].includes(arsak.verdi),
);

function mockFelt(
  felt: string,
  etikett: string,
  datatype: "enum" | "tekst" | "boolsk" | "belop",
  paakrevd: boolean,
  verdier: { verdi: string; etikett: string }[] = [],
  paakrevdNar?: string,
): TillatteHandlingerResponse["feltskjema"][number] {
  return { felt, etikett, datatype, paakrevd, verdier, paakrevdNar };
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
            etikett: resultatetiketter[verdi],
          })),
        ),
        mockFelt(
          "utredning.henleggelsesarsak",
          "Årsak til henleggelse",
          "enum",
          false,
          henleggelsesarsaker,
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
            etikett: resultatetiketter[verdi],
          })),
          "forvaltning.type=SAKEN_SKAL_IKKE_VURDERES_FOR_ANMELDELSE",
        ),
        mockFelt(
          "forvaltning.endeligUtfall.henleggelsesarsak",
          "Årsak til henleggelse",
          "enum",
          false,
          henleggelsesarsaker,
          "forvaltning.endeligUtfall.type=HENLAGT",
        ),
        mockFelt("ytelser[].endeligBelop", "Endelig beløp for ytelsen", "belop", false),
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
            etikett: resultatetiketter[verdi],
          })),
        ),
        mockFelt(
          "strafferettsligVurdering.henleggelsesarsak",
          "Årsak til henleggelse",
          "enum",
          false,
          begrensedeHenleggelsesarsaker,
          "strafferettsligVurdering.type=HENLAGT",
        ),
      ];
    case "POLITI":
      return [
        mockFelt(
          "politi.type",
          "Resultat fra politiet",
          "enum",
          true,
          (resultatvalg.POLITI ?? []).map((verdi) => ({
            verdi,
            etikett: resultatetiketter[verdi],
          })),
        ),
        mockFelt(
          "politi.begrunnelse",
          "Begrunnelse",
          "tekst",
          false,
          [],
          "politi.type=HENLAGT eller FRIFINNELSE",
        ),
        mockFelt(
          "politi.detaljer",
          "Tilleggsopplysninger",
          "tekst",
          false,
          [],
          "politi.type=FORELEGG, BOT eller PATALEUNNLATELSE",
        ),
        mockFelt("politi.domstype", "Type dom", "tekst", false, [], "politi.type=DOMFELLELSE"),
        mockFelt("politi.varighet", "Varighet", "tekst", false, [], "politi.type=DOMFELLELSE"),
        mockFelt(
          "politi.redusertForEmkArtikkel6",
          "Reduksjon etter EMK artikkel 6",
          "boolsk",
          false,
          [],
          "politi.type=DOMFELLELSE",
        ),
        mockFelt(
          "politi.redusertForLangSaksbehandling",
          "Reduksjon for lang saksbehandling",
          "boolsk",
          false,
          [],
          "politi.type=DOMFELLELSE",
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
              switch (sak.resultat?.utredning?.type) {
                case "FEILUTBETALINGSSAK_ORDINAER":
                case "FEILUTBETALINGSSAK_POTENSIELL_STRAFFESAK":
                  return ["FORVALTNING"];
                case "KONTROLLNOTAT":
                case "HENLAGT":
                  return ["AVSLUTTET"];
                default:
                  return ["FORVALTNING", "AVSLUTTET"];
              }
            case "FORVALTNING":
              return erHenlagtIGjeldendeSteg({ steg, resultat: sak.resultat ?? null })
                ? ["AVSLUTTET"]
                : ["STRAFFERETTSLIG_VURDERING", "AVSLUTTET"];
            case "STRAFFERETTSLIG_VURDERING":
              return sak.resultat?.strafferettsligVurdering?.type === "ANMELDT"
                ? ["POLITI"]
                : sak.resultat?.strafferettsligVurdering?.type
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
    STRAFFERETTSLIG_VURDERING: ["AKTIV"],
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
    if (statusvalg[steg].some((status) => status !== sak.status)) {
      handlinger.push({
        type: "ENDRE_STATUS",
        metode: "POST",
        sti: `/api/v1/kontrollsaker/${sak.id}/status`,
      });
    }
    handlinger.push({
      type: "SETT_I_BERO",
      metode: "POST",
      sti: `/api/v1/kontrollsaker/${sak.id}/status`,
    });
  } else if (steg !== "AVSLUTTET") {
    handlinger.push({
      type: "TA_UT_AV_BERO",
      metode: "POST",
      sti: `/api/v1/kontrollsaker/${sak.id}/status`,
    });
  }
  if (resultater.length > 0) {
    handlinger.push({
      type: "REGISTRER_RESULTAT",
      metode: "PUT",
      sti: `/api/v1/kontrollsaker/${sak.id}/resultat`,
    });
  }
  if (
    resultater.includes("HENLAGT") &&
    !erHenlagtIGjeldendeSteg({ steg, resultat: sak.resultat ?? null })
  ) {
    handlinger.push({
      type: "HENLEGG",
      metode: "PUT",
      sti: `/api/v1/kontrollsaker/${sak.id}/resultat`,
      resultatType: "HENLAGT",
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
      steg === "AVSLUTTET" ? [] : sak.status === "I_BERO" ? [statusFørBero] : statusvalg[steg],
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
              ? [
                  "forvaltning.type",
                  "forvaltning.endeligUtfall.type",
                  ...(sak.resultat?.forvaltning?.endeligUtfall?.type === "HENLAGT" ||
                  sak.resultat?.forvaltning?.endeligUtfall?.type === "KONTROLLNOTAT"
                    ? []
                    : [
                        sak.resultat?.forvaltning?.endeligUtfall?.type ===
                        "FEILUTBETALINGSSAK_ORDINAER"
                          ? "ytelser[].endeligBelop"
                          : "ytelser[].endeligBelop ved FEILUTBETALINGSSAK_ORDINAER",
                      ]),
                ]
              : ["forvaltning.type", "ytelser[].endeligBelop"],
          ];
        }
        if (steg === "STRAFFERETTSLIG_VURDERING") {
          return [nesteSteg, ["strafferettsligVurdering.type"]];
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
