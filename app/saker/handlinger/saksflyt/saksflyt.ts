import type { KontrollsakSteg, TillatteHandlingerResponse } from "~/saker/types.backend";
import { resultatFeltErAktivt } from "../resultat-request";
import { erHenlagtIGjeldendeSteg, hentVisbareSteg } from "../tillatte-steg";
import { sjekklister } from "./sjekklister";

type Feltskjema = TillatteHandlingerResponse["feltskjema"];

/** Skjemaverdier i modalen. Resultatfelt bruker feltnavnet fra feltskjemaet, beløp bruker `ytelse.<id>.<felt>`. */
export type Verdier = Record<string, string>;

export type Trinn =
  | {
      type: "sjekkliste";
      tittel: string;
      beskrivelse: string;
      punkter: readonly string[];
      primær: string;
    }
  | {
      type: "enkeltvalg";
      tittel: string;
      felt: string;
      legend: string;
      beskrivelse?: string;
      tillatteVerdier?: readonly string[];
      primær: string;
    }
  | { type: "status"; tittel: string; primær: string }
  | {
      type: "skjema";
      tittel: string | ((verdier: Verdier, feltskjema: Feltskjema) => string);
      felter: readonly string[];
      /** Begrenser valgene i enum-felt, for eksempel hvilke utredningsresultater som gir forvaltning. */
      tillatteVerdier?: Readonly<Record<string, readonly string[]>>;
      /** Ledetekst for beløpsfeltene. Ytelsestypen legges til når saken har flere ytelser. */
      belopEtikett?: string;
      primær: string;
      /** Tilbyr «Registrer resultat, men ikke avslutt» når backend tillater det. */
      kanLagreUtenAvslutning?: boolean;
    }
  | { type: "bekreftAvslutning"; primær: string };

export type Innsending =
  | { handling: "endre_steg_dialog"; steg: KontrollsakSteg }
  | { handling: "endre_status" }
  | { handling: "lagre_resultat" };

export type Sakshandling = {
  id: string;
  seksjon: "steg" | "resultat";
  etikett: string;
  erPrimær?: boolean;
  trinn: readonly Trinn[];
  /** Resultatverdier handlingen alltid sender, for eksempel `utredning.type=HENLAGT`. */
  faste: Verdier;
  innsending: Innsending;
};

const bekreftAvslutning: Trinn = { type: "bekreftAvslutning", primær: "Avslutt sak" };

function henlegg(felt: string, faste: Verdier): Sakshandling {
  return {
    id: "henlegg",
    seksjon: "resultat",
    etikett: "Henlegg sak",
    faste,
    trinn: [
      {
        type: "enkeltvalg",
        tittel: "Henlegg sak",
        felt,
        legend: "Henleggelsesårsak",
        beskrivelse: "Velg årsak - alternativene avhenger av fasen",
        primær: "Henlegg og avslutt sak",
      },
      bekreftAvslutning,
    ],
    innsending: { handling: "endre_steg_dialog", steg: "AVSLUTTET" },
  };
}

function avsluttMedResultat(id: string, etikett: string, faste: Verdier): Sakshandling {
  return {
    id,
    seksjon: "resultat",
    etikett,
    faste,
    trinn: [bekreftAvslutning],
    innsending: { handling: "endre_steg_dialog", steg: "AVSLUTTET" },
  };
}

function registrerPolitiresultatTittel(verdier: Verdier, feltskjema: Feltskjema): string {
  const utfall = verdier["politi.type"];
  if (utfall === "DOMFELLELSE") return "Registrer dom";
  const etikett = feltskjema
    .find((felt) => felt.felt === "politi.type")
    ?.verdier.find((valg) => valg.verdi === utfall)?.etikett;
  return etikett ? `Registrer ${etikett.toLowerCase()}` : "Registrer avgjørelse";
}

/** Handlingene i hvert steg, i visningsrekkefølge. Backend avgjør hvilke som faktisk tilbys. */
const handlingstabell: Partial<Record<KontrollsakSteg, readonly Sakshandling[]>> = {
  OPPRETTET: [
    {
      id: "til-utredning",
      seksjon: "steg",
      etikett: "Gå til Utredning",
      erPrimær: true,
      faste: {},
      trinn: [],
      innsending: { handling: "endre_steg_dialog", steg: "UTREDNING" },
    },
    {
      id: "til-strafferettslig-vurdering",
      seksjon: "steg",
      etikett: "Gå til strafferettslig vurdering",
      faste: {},
      trinn: [],
      innsending: { handling: "endre_steg_dialog", steg: "STRAFFERETTSLIG_VURDERING" },
    },
  ],
  UTREDNING: [
    {
      id: "til-forvaltning",
      seksjon: "steg",
      etikett: "Send til Forvaltning",
      erPrimær: true,
      faste: {},
      trinn: [
        {
          type: "skjema",
          tittel: "Send til Forvaltning",
          felter: ["utredning.type", "ytelser[].belop"],
          tillatteVerdier: {
            "utredning.type": [
              "FEILUTBETALINGSSAK_ORDINAER",
              "FEILUTBETALINGSSAK_POTENSIELL_STRAFFESAK",
            ],
          },
          belopEtikett: "Antatt beløp",
          primær: "Neste",
        },
        { ...sjekklister.tilForvaltning, primær: "Alt OK - gå til forvaltning" },
      ],
      innsending: { handling: "endre_steg_dialog", steg: "FORVALTNING" },
    },
    avsluttMedResultat("informasjonssak", "Registrer som informasjonssak", {
      "utredning.type": "KONTROLLNOTAT",
    }),
    henlegg("utredning.henleggelsesarsak", { "utredning.type": "HENLAGT" }),
  ],
  FORVALTNING: [
    {
      id: "til-strafferettslig-vurdering",
      seksjon: "steg",
      etikett: "Gå til Strafferettslig vurdering",
      erPrimær: true,
      faste: { "forvaltning.type": "SAKEN_SKAL_VURDERES_FOR_ANMELDELSE" },
      trinn: [
        {
          type: "skjema",
          tittel: "Registrer oppdatert beløp",
          felter: ["ytelser[].endeligBelop"],
          belopEtikett: "Oppdatert beløp",
          primær: "Til strafferettslig vurdering",
        },
      ],
      innsending: { handling: "endre_steg_dialog", steg: "STRAFFERETTSLIG_VURDERING" },
    },
    {
      id: "registrer-feilutbetaling",
      seksjon: "resultat",
      etikett: "Registrer feilutbetaling",
      faste: {
        "forvaltning.type": "SAKEN_SKAL_IKKE_VURDERES_FOR_ANMELDELSE",
        "forvaltning.endeligUtfall.type": "FEILUTBETALINGSSAK_ORDINAER",
      },
      trinn: [
        {
          type: "skjema",
          tittel: "Registrer beløp som er feilutbetalt",
          felter: ["ytelser[].endeligBelop"],
          belopEtikett: "Beløp som er feilutbetalt",
          primær: "Registrer feilutbetaling og avslutt saken",
        },
        bekreftAvslutning,
      ],
      innsending: { handling: "endre_steg_dialog", steg: "AVSLUTTET" },
    },
    henlegg("forvaltning.endeligUtfall.henleggelsesarsak", {
      "forvaltning.type": "SAKEN_SKAL_IKKE_VURDERES_FOR_ANMELDELSE",
      "forvaltning.endeligUtfall.type": "HENLAGT",
    }),
  ],
  STRAFFERETTSLIG_VURDERING: [
    {
      id: "til-politiet",
      seksjon: "steg",
      etikett: "Gå til Politiet",
      erPrimær: true,
      faste: { "strafferettsligVurdering.type": "ANMELDT" },
      trinn: [
        {
          type: "skjema",
          tittel: "Registrer beløp som skal anmeldes",
          felter: ["ytelser[].anmeldtBelop"],
          belopEtikett: "Beløp som skal anmeldes",
          primær: "Gå til politiet",
        },
      ],
      innsending: { handling: "endre_steg_dialog", steg: "POLITI" },
    },
    avsluttMedResultat("kontrollnotat", "Registrer kontrollnotat", {
      "strafferettsligVurdering.type": "KONTROLLNOTAT",
    }),
    avsluttMedResultat("feilutbetalingssak", "Registrer feilutbetalingssak", {
      "strafferettsligVurdering.type": "FEILUTBETALINGSSAK_ORDINAER",
    }),
    henlegg("strafferettsligVurdering.henleggelsesarsak", {
      "strafferettsligVurdering.type": "HENLAGT",
    }),
  ],
  POLITI: [
    {
      id: "registrer-avgjorelse",
      seksjon: "steg",
      etikett: "Registrer avgjørelse",
      erPrimær: true,
      faste: {},
      trinn: [
        {
          type: "enkeltvalg",
          tittel: "Registrer avgjørelse",
          felt: "politi.type",
          legend: "Utfall",
          beskrivelse: "Velg utfallet av saken hos politiet",
          tillatteVerdier: ["FORELEGG", "BOT", "PATALEUNNLATELSE", "FRIFINNELSE", "DOMFELLELSE"],
          primær: "Neste",
        },
        {
          type: "skjema",
          tittel: registrerPolitiresultatTittel,
          felter: [
            "politi.belopTilbakekrevd",
            "politi.strafferabatt",
            "politi.strafferabattProsent",
            "politi.domsdato",
            "politi.begrunnelse",
            "politi.detaljer",
          ],
          primær: "Registrer resultat og avslutt saken",
          kanLagreUtenAvslutning: true,
        },
        bekreftAvslutning,
      ],
      innsending: { handling: "endre_steg_dialog", steg: "AVSLUTTET" },
    },
    henlegg("politi.henleggelsesarsak", { "politi.type": "HENLAGT" }),
    {
      id: "henlagt-paaklaget",
      seksjon: "resultat",
      etikett: "Registrer sak som henlagt og påklaget fra Nav",
      faste: { "politi.type": "HENLAGT_PAAKLAGET" },
      trinn: [
        {
          type: "enkeltvalg",
          tittel: "Henlagt og påklaget fra Nav",
          felt: "politi.henleggelsesarsak",
          legend: "Henleggelsesårsak",
          beskrivelse: "Velg årsaken politiet oppga for henleggelsen",
          primær: "Registrer og avslutt sak",
        },
        bekreftAvslutning,
      ],
      innsending: { handling: "endre_steg_dialog", steg: "AVSLUTTET" },
    },
  ],
};

/** Avslutter en sak som allerede har et lagret resultat som gir avslutning. */
const avsluttSak: Sakshandling = avsluttMedResultat("avslutt", "Avslutt sak", {});

export const endreStatus: Sakshandling = {
  id: "endre-status",
  seksjon: "steg",
  etikett: "Endre status",
  faste: {},
  trinn: [{ type: "status", tittel: "Endre status", primær: "Endre status" }],
  innsending: { handling: "endre_status" },
};

function normalisertSteg(steg: KontrollsakSteg): KontrollsakSteg {
  if (steg === "UTREDES") return "UTREDNING";
  if (steg === "ANMELDT") return "POLITI";
  return steg;
}

export function finnSkjemafelt(
  feltskjema: Feltskjema,
  felt: string,
): Feltskjema[number] | undefined {
  return feltskjema.find((skjemafelt) => skjemafelt.felt === felt);
}

function fastVerdiErTillatt(
  tillatteHandlinger: TillatteHandlingerResponse,
  felt: string,
  verdi: string,
): boolean {
  const skjemafelt = finnSkjemafelt(tillatteHandlinger.feltskjema, felt);
  return (
    (skjemafelt?.verdier.some((valg) => valg.verdi === verdi) ?? false) &&
    tillatteHandlinger.tillatteResultater.some((resultat) => resultat === verdi)
  );
}

function trinnfeltFinnes(handling: Sakshandling, feltskjema: Feltskjema): boolean {
  return handling.trinn.every((trinn) => {
    if (trinn.type === "enkeltvalg") return finnSkjemafelt(feltskjema, trinn.felt) !== undefined;
    if (trinn.type === "skjema") {
      return trinn.felter.some((felt) => finnSkjemafelt(feltskjema, felt) !== undefined);
    }
    return true;
  });
}

function erTilgjengelig(
  handling: Sakshandling,
  tillatteHandlinger: TillatteHandlingerResponse,
  visbareSteg: readonly KontrollsakSteg[],
): boolean {
  const { innsending } = handling;
  if (innsending.handling !== "endre_steg_dialog") return false;
  return (
    visbareSteg.includes(innsending.steg) &&
    Object.entries(handling.faste).every(([felt, verdi]) =>
      fastVerdiErTillatt(tillatteHandlinger, felt, verdi),
    ) &&
    trinnfeltFinnes(handling, tillatteHandlinger.feltskjema)
  );
}

/**
 * Handlingene som skal vises i menyen for steg og resultat.
 *
 * Frontend eier rekkefølge og tekster. Backend avgjør hva som er lov gjennom
 * `handlinger`, `muligeNesteSteg`, `tillatteSteg`, `tillatteResultater` og `feltskjema`.
 */
export function hentHandlinger(tillatteHandlinger: TillatteHandlingerResponse): Sakshandling[] {
  const { tilstand } = tillatteHandlinger;
  const kanFlytte = tillatteHandlinger.handlinger.some(
    (handling) => handling.type === "FLYTT_TIL_NESTE_STEG",
  );
  if (tilstand.status === "I_BERO" || !kanFlytte) return [];

  const visbareSteg = hentVisbareSteg(tillatteHandlinger);
  const kanAvslutteMedLagretResultat =
    visbareSteg.includes("AVSLUTTET") && tillatteHandlinger.tillatteSteg.includes("AVSLUTTET");

  if (erHenlagtIGjeldendeSteg(tilstand)) {
    return kanAvslutteMedLagretResultat ? [avsluttSak] : [];
  }

  const handlinger = (handlingstabell[normalisertSteg(tilstand.steg)] ?? []).filter((handling) =>
    erTilgjengelig(handling, tillatteHandlinger, visbareSteg),
  );
  return kanAvslutteMedLagretResultat ? [...handlinger, avsluttSak] : handlinger;
}

export function kanLagreUtenAvslutning(tillatteHandlinger: TillatteHandlingerResponse): boolean {
  return tillatteHandlinger.handlinger.some((handling) => handling.type === "REGISTRER_RESULTAT");
}

/** Verdien som representerer «ingen status» i skjemaet. Serveren tolker den som `null`. */
export const INGEN_STATUS = "__NULL__";

const ytelsesfeltPrefiks = "ytelser[].";

type Belopsfelt = "belop" | "endeligBelop" | "anmeldtBelop";

export function erBelopsfelt(felt: string): boolean {
  return felt.startsWith(ytelsesfeltPrefiks);
}

function belopsnokkel(felt: string): Belopsfelt {
  return felt.slice(ytelsesfeltPrefiks.length) as Belopsfelt;
}

export function ytelseVerdiNavn(ytelseId: string, felt: string): string {
  return `ytelse.${ytelseId}.${belopsnokkel(felt)}`;
}

function formaterTall(verdi: number): string {
  return new Intl.NumberFormat("nb-NO", { useGrouping: false, maximumFractionDigits: 2 }).format(
    verdi,
  );
}

/** Startverdier: statusen saken har nå, og lagrede beløp per ytelse. */
export function hentStartverdier(
  handling: Sakshandling,
  tillatteHandlinger: TillatteHandlingerResponse,
): Verdier {
  const verdier: Verdier = {};
  const { tilstand } = tillatteHandlinger;
  if (handling.innsending.handling === "endre_status") {
    const gjeldende = tilstand.status === "I_BERO" ? tilstand.statusFørBero : tilstand.status;
    if (tillatteHandlinger.tillatteStatuser.includes(gjeldende)) {
      verdier.status = gjeldende ?? INGEN_STATUS;
    }
  }
  for (const trinn of handling.trinn) {
    if (trinn.type !== "skjema") continue;
    for (const felt of trinn.felter.filter(erBelopsfelt)) {
      for (const ytelse of tilstand.ytelser) {
        const lagret = ytelse[belopsnokkel(felt)];
        if (lagret != null) verdier[ytelseVerdiNavn(ytelse.id, felt)] = formaterTall(lagret);
      }
    }
  }
  return verdier;
}

/**
 * Fjerner verdier for felt som ikke er aktive. Feltskjemaet gås gjennom i rekkefølge, slik at
 * `politi.strafferabattProsent` forsvinner når `politi.strafferabatt` er inaktiv fordi utfallet
 * er endret. Serveren gjør det samme i `byggLagreResultatRequest`.
 */
export function aktiveVerdier(verdier: Verdier, feltskjema: Feltskjema): Verdier {
  const aktive = { ...verdier };
  for (const felt of feltskjema) {
    if (!resultatFeltErAktivt(felt, aktive)) delete aktive[felt.felt];
  }
  return aktive;
}

/** Bygger skjemadataene som sendes til route-actionen. */
export function byggInnsending(
  handling: Sakshandling,
  verdier: Verdier,
  tillatteHandlinger: TillatteHandlingerResponse,
  innsending: Innsending = handling.innsending,
): FormData {
  const formData = new FormData();
  formData.set("handling", innsending.handling);
  formData.set("versjon", String(tillatteHandlinger.versjon));

  if (innsending.handling === "endre_status") {
    formData.set("status", verdier.status ?? "");
    return formData;
  }

  const { feltskjema } = tillatteHandlinger;
  let harResultat = false;
  for (const [felt, verdi] of Object.entries(
    aktiveVerdier({ ...verdier, ...handling.faste }, feltskjema),
  )) {
    if (verdi.trim() === "") continue;
    if (felt.startsWith("ytelse.")) {
      formData.set(felt, verdi);
      harResultat = true;
    } else if (finnSkjemafelt(feltskjema, felt)) {
      formData.set(`resultat.${felt}`, verdi);
      harResultat = true;
    }
  }

  if (innsending.handling === "endre_steg_dialog") {
    formData.set("steg", innsending.steg);
    formData.set("registrerResultat", String(harResultat));
  }
  return formData;
}
