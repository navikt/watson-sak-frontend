import { POLITIDISTRIKTER } from "~/saker/politidistrikter";
import { type KontrollsakSteg, type TillatteHandlingerResponse } from "~/saker/types.backend";
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
      /** Brødtekst over sjekklisten. */
      ingress: string;
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
      /** Viser valgene i grupper med overskrift. Valg som ikke står i en gruppe, vises ikke. */
      grupper?: readonly { tittel: string; verdier: readonly string[] }[];
      /** Viser «Avbryt», som lukker modalen, i stedet for «Tilbake». */
      avbryt?: boolean;
      primær: string;
    }
  | { type: "status"; tittel: string; primær: string }
  | {
      type: "skjema";
      tittel: string;
      /** Viser etiketten til den valgte verdien i dette feltet som undertittel, for eksempel resultattypen. */
      undertittelFelt?: string;
      felter: readonly string[];
      /** Verdier feltene starter med, for eksempel «Nei» på ja/nei-spørsmål. */
      standardverdier?: Verdier;
      /** Begrenser valgene i enum-felt, for eksempel hvilke utredningsresultater som gir forvaltning. */
      tillatteVerdier?: Readonly<Record<string, readonly string[]>>;
      /** Ledetekst for beløpsfeltene. Ytelsestypen legges til når saken har flere ytelser. */
      belopEtikett?: string;
      /** Beløpene per ytelse kan stå tomme. */
      belopValgfritt?: boolean;
      primær: string | ((verdier: Verdier) => string);
      /** Primærknappen lagrer resultatet uten stegbytte, for eksempel ved påklaget henleggelse. */
      lagreUtenAvslutning?: (verdier: Verdier) => boolean;
      /** Viser varselet om at saken avsluttes nederst i skjemaet. */
      visAvslutningsvarsel?: (verdier: Verdier) => boolean;
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
  /** Bredden på modalen gjennom hele handlingen. Standard er `small`. */
  bredde?: "small" | "medium";
  trinn: readonly Trinn[];
  /** Resultatverdier handlingen alltid sender, for eksempel `utredning.type=HENLAGT`. */
  faste: Verdier;
  innsending: Innsending;
};

export type Feltvisning = {
  /** Hjelpetekst under ledeteksten. */
  beskrivelse?: string;
  /** Låste valg vises som en nedtrekksliste. */
  valg?: readonly string[];
  /** Tekstfeltet vises på én linje og har maks lengde. Andre tekstfelt er flerlinjede. */
  maksLengde?: number;
  /** Feltet vises smalt med enheten til høyre, for eksempel «kr» eller «timer». */
  enhet?: string;
};

/** Hvordan enkeltfelt vises, utover det feltskjemaet fra backend sier. */
export const feltvisning: Readonly<Record<string, Feltvisning>> = {
  "strafferettsligVurdering.politidistrikt": {
    beskrivelse: "Velg politidistriktet saken anmeldes til.",
    valg: POLITIDISTRIKTER,
  },
  "politi.begrunnelse": { maksLengde: 200 },
  "politi.ubetingetFengselMaaneder": { enhet: "mnd" },
  "politi.ubetingetFengselDager": { enhet: "dag" },
  "politi.betingetFengselMaaneder": { enhet: "mnd" },
  "politi.betingetFengselDager": { enhet: "dag" },
  "politi.samfunnsstraffTimer": { enhet: "timer" },
  "politi.domfeltBelop": { enhet: "kr" },
  "politi.siviltRettskrav": { enhet: "kr" },
  "politi.strafferabattLiggetid": {
    beskrivelse:
      "Lang liggetid (saksbehandlingstid) hos Nav og/eller politiet kan gi redusert straff.",
  },
};

/**
 * Felt som vises sammen under én ledetekst, for eksempel måneder og dager fengsel.
 * Nøkkelen er det første feltet i gruppen.
 */
export const feltgrupper: Readonly<Record<string, { legend: string; felter: readonly string[] }>> =
  {
    "politi.ubetingetFengselMaaneder": {
      legend: "Ubetinget fengsel",
      felter: ["politi.ubetingetFengselMaaneder", "politi.ubetingetFengselDager"],
    },
    "politi.betingetFengselMaaneder": {
      legend: "Betinget fengsel",
      felter: ["politi.betingetFengselMaaneder", "politi.betingetFengselDager"],
    },
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

const erPåklagetHenleggelse = (verdier: Verdier) =>
  verdier["politi.type"] === "HENLAGT" && verdier.paaklaget === "true";

/** Handlingene i hvert steg, i visningsrekkefølge. Backend avgjør hvilke som faktisk tilbys. */
const handlingstabell: Partial<Record<KontrollsakSteg, readonly Sakshandling[]>> = {
  OPPRETTET: [
    {
      id: "til-utredning",
      seksjon: "steg",
      etikett: "Gå til utredning",
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
      etikett: "Send til forvaltning",
      erPrimær: true,
      faste: {},
      trinn: [
        {
          type: "skjema",
          tittel: "Send til forvaltning",
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
    henlegg("utredning.henleggelsesarsak", { "utredning.type": "HENLAGT" }),
  ],
  FORVALTNING: [
    {
      id: "til-strafferettslig-vurdering",
      seksjon: "steg",
      etikett: "Gå til strafferettslig vurdering",
      erPrimær: true,
      faste: { "forvaltning.type": "SAKEN_SKAL_VURDERES_FOR_ANMELDELSE" },
      trinn: [
        {
          type: "skjema",
          tittel: "Endelig beløp",
          felter: ["ytelser[].endeligBelop", "forvaltning.tilbakekrevdBelop"],
          belopEtikett: "Endelig beløp",
          belopValgfritt: true,
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
          felter: ["ytelser[].endeligBelop", "forvaltning.tilbakekrevdBelop"],
          belopEtikett: "Beløp som er feilutbetalt",
          belopValgfritt: true,
          primær: "Registrer feilutbetaling og avslutt saken",
        },
        bekreftAvslutning,
      ],
      innsending: { handling: "endre_steg_dialog", steg: "AVSLUTTET" },
    },
    // Henleggelse i forvaltningen har ingen årsak.
    avsluttMedResultat("henlegg", "Henlegg sak", {
      "forvaltning.type": "SAKEN_SKAL_IKKE_VURDERES_FOR_ANMELDELSE",
      "forvaltning.endeligUtfall.type": "HENLAGT",
    }),
  ],
  STRAFFERETTSLIG_VURDERING: [
    {
      id: "til-politiet",
      seksjon: "steg",
      etikett: "Gå til politiet",
      erPrimær: true,
      faste: { "strafferettsligVurdering.type": "ANMELDT" },
      trinn: [
        {
          type: "skjema",
          tittel: "Registrer beløp som skal anmeldes",
          felter: [
            "strafferettsligVurdering.anmeldtBelop",
            "strafferettsligVurdering.politidistrikt",
          ],
          primær: "Gå til politiet",
        },
      ],
      innsending: { handling: "endre_steg_dialog", steg: "POLITI" },
    },
    avsluttMedResultat("feilutbetalingssak", "Registrer feilutbetalingssak", {
      "strafferettsligVurdering.type": "FEILUTBETALINGSSAK_ORDINAER",
    }),
    henlegg("strafferettsligVurdering.henleggelsesarsak", {
      "strafferettsligVurdering.type": "HENLAGT",
    }),
  ],
  POLITI: [
    {
      id: "registrer-resultat",
      seksjon: "steg",
      etikett: "Registrer resultat",
      erPrimær: true,
      bredde: "medium",
      faste: {},
      trinn: [
        {
          type: "enkeltvalg",
          tittel: "Registrer resultat",
          felt: "politi.type",
          legend: "Resultat",
          beskrivelse: "Velg resultatet som er registrert i saken.",
          grupper: [
            { tittel: "Politiet", verdier: ["HENLAGT", "FORELEGG", "BOT", "PATALEUNNLATELSE"] },
            { tittel: "Domstolen", verdier: ["FRIFINNELSE", "DOMFELLELSE"] },
          ],
          avbryt: true,
          primær: "Neste",
        },
        {
          type: "skjema",
          tittel: "Registrer resultat",
          undertittelFelt: "politi.type",
          felter: [
            "politi.begrunnelse",
            "paaklaget",
            "politi.belop",
            "politi.domsdato",
            "politi.ubetingetFengselMaaneder",
            "politi.ubetingetFengselDager",
            "politi.betingetFengselMaaneder",
            "politi.betingetFengselDager",
            "politi.samfunnsstraffTimer",
            "politi.domfeltBelop",
            "politi.siviltRettskrav",
            "politi.tilstaaelsesdom",
            "politi.strafferabattLiggetid",
          ],
          standardverdier: {
            paaklaget: "false",
            "politi.tilstaaelsesdom": "false",
            "politi.strafferabattLiggetid": "INGEN",
          },
          primær: (verdier) =>
            erPåklagetHenleggelse(verdier) ? "Registrer påklaget henleggelse" : "Lagre og avslutt",
          lagreUtenAvslutning: erPåklagetHenleggelse,
          visAvslutningsvarsel: (verdier) => !erPåklagetHenleggelse(verdier),
        },
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
  // En påklaget henleggelse må erstattes av en ny avgjørelse før saken kan avsluttes.
  const kanAvslutteMedLagretResultat =
    tilstand.status !== "PAAKLAGET" &&
    visbareSteg.includes("AVSLUTTET") &&
    tillatteHandlinger.tillatteSteg.includes("AVSLUTTET");

  // En påklaget henleggelse kan erstattes av en ny avgjørelse fra politiet.
  if (erHenlagtIGjeldendeSteg(tilstand) && tilstand.status !== "PAAKLAGET") {
    return kanAvslutteMedLagretResultat ? [avsluttSak] : [];
  }

  const handlinger = (handlingstabell[normalisertSteg(tilstand.steg)] ?? []).filter((handling) =>
    erTilgjengelig(handling, tillatteHandlinger, visbareSteg),
  );
  return kanAvslutteMedLagretResultat ? [...handlinger, avsluttSak] : handlinger;
}

/** Verdien som representerer «ingen status» i skjemaet. Serveren tolker den som `null`. */
export const INGEN_STATUS = "__NULL__";

const ytelsesfeltPrefiks = "ytelser[].";

type Belopsfelt = "belop" | "endeligBelop";

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

/** Lagret verdi for et beløpsfelt på resultatet, for eksempel `forvaltning.tilbakekrevdBelop`. */
function lagretResultatbelop(
  resultat: TillatteHandlingerResponse["tilstand"]["resultat"],
  felt: string,
): number | null | undefined {
  if (felt === "forvaltning.tilbakekrevdBelop") return resultat?.forvaltning?.tilbakekrevdBelop;
  if (felt === "strafferettsligVurdering.anmeldtBelop") {
    return resultat?.strafferettsligVurdering?.anmeldtBelop;
  }
  return undefined;
}

/**
 * Startverdier: statusen saken har nå, standardverdiene i skjemaet og lagrede beløp. Endelig beløp
 * starter med antatt beløp når det ikke er registrert, siden de ofte er like.
 */
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
    Object.assign(verdier, trinn.standardverdier);
    for (const felt of trinn.felter) {
      if (!erBelopsfelt(felt)) {
        const lagret = lagretResultatbelop(tilstand.resultat, felt);
        if (lagret != null) verdier[felt] = formaterTall(lagret);
        continue;
      }
      const nokkel = belopsnokkel(felt);
      for (const ytelse of tilstand.ytelser) {
        const lagret = ytelse[nokkel] ?? (nokkel === "endeligBelop" ? ytelse.belop : null);
        if (lagret != null) verdier[ytelseVerdiNavn(ytelse.id, felt)] = formaterTall(lagret);
      }
    }
  }
  return verdier;
}

/**
 * Valgene for et enum-felt. Handlingen kan begrense valgene, og for resultattyper (`*.type`)
 * vises bare verdier som backend tillater i `tillatteResultater`.
 */
export function hentValg(
  felt: Feltskjema[number],
  tillatteResultater: readonly string[],
  begrensning?: readonly string[],
): Feltskjema[number]["verdier"] {
  return felt.verdier.filter(
    (valg) =>
      (!begrensning || begrensning.includes(valg.verdi)) &&
      (!felt.felt.endsWith(".type") || tillatteResultater.includes(valg.verdi)),
  );
}

/**
 * Fjerner verdier for felt som ikke er aktive, for eksempel domsdato når resultatet er endret fra
 * domfellelse til bot. Feltskjemaet gås gjennom i rekkefølge, slik at felt som avhenger av et
 * inaktivt felt også forsvinner. Serveren gjør det samme i `byggLagreResultatRequest`.
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
