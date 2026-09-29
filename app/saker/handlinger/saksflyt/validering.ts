import type { TillatteHandlingerResponse } from "~/saker/types.backend";
import {
  erGyldigIsoDato,
  lesBelop,
  resultatFeltErAktivt,
  resultatFeltErPaakrevd,
} from "../resultat-request";
import {
  aktiveVerdier,
  erBelopsfelt,
  finnSkjemafelt,
  type Trinn,
  type Verdier,
  ytelseVerdiNavn,
} from "./saksflyt";

type Skjemafelt = TillatteHandlingerResponse["feltskjema"][number];

/** Feilmeldinger per felt. Nøkkelen er feltnavnet, eller `ytelse.<id>.<felt>` for beløp. */
export type Feil = Record<string, string>;

export function sjekkpunktNavn(indeks: number): string {
  return `sjekkliste.${indeks}`;
}

/** Feltene i et skjematrinn som skal vises, gitt verdiene brukeren har valgt så langt. */
export function hentSynligeFelter(
  trinn: Extract<Trinn, { type: "skjema" }>,
  verdier: Verdier,
  feltskjema: TillatteHandlingerResponse["feltskjema"],
): Skjemafelt[] {
  const aktive = aktiveVerdier(verdier, feltskjema);
  return trinn.felter.flatMap((navn) => {
    const felt = finnSkjemafelt(feltskjema, navn);
    if (!felt) return [];
    if (erBelopsfelt(navn)) return [felt];
    return resultatFeltErAktivt(felt, aktive) ? [felt] : [];
  });
}

function iDag(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Oslo" }).format(new Date());
}

function validerFelt(felt: Skjemafelt, verdi: string, verdier: Verdier): string | undefined {
  if (verdi.trim() === "") {
    return resultatFeltErPaakrevd(felt, verdier) ? `${felt.etikett} må fylles ut` : undefined;
  }
  if (felt.datatype === "tall") {
    try {
      const tall = lesBelop(verdi, felt.etikett);
      if (felt.felt === "politi.strafferabattProsent" && tall > 100) {
        return "Strafferabatt kan ikke være over 100 %";
      }
    } catch {
      return `${felt.etikett} må være et gyldig tall`;
    }
  }
  if (felt.datatype === "dato") {
    if (!erGyldigIsoDato(verdi)) return `${felt.etikett} må være en gyldig dato`;
    if (verdi > iDag()) return `${felt.etikett} kan ikke være fram i tid`;
  }
  return undefined;
}

/** Validerer trinnet før brukeren går videre. Returnerer et tomt objekt når alt er i orden. */
export function validerTrinn(
  trinn: Trinn,
  verdier: Verdier,
  tillatteHandlinger: TillatteHandlingerResponse,
): Feil {
  const feil: Feil = {};
  switch (trinn.type) {
    case "sjekkliste":
      if (trinn.punkter.some((_, indeks) => verdier[sjekkpunktNavn(indeks)] !== "true")) {
        feil.sjekkliste = "Alle punktene må være fullført før du kan gå videre";
      }
      return feil;
    case "enkeltvalg":
      if (!verdier[trinn.felt]) feil[trinn.felt] = `Velg ${trinn.legend.toLowerCase()}`;
      return feil;
    case "status":
      if (verdier.status === undefined) feil.status = "Velg status";
      return feil;
    case "bekreftAvslutning":
      return feil;
    case "skjema":
      for (const felt of hentSynligeFelter(trinn, verdier, tillatteHandlinger.feltskjema)) {
        if (erBelopsfelt(felt.felt)) {
          for (const ytelse of tillatteHandlinger.tilstand.ytelser) {
            const navn = ytelseVerdiNavn(ytelse.id, felt.felt);
            const verdi = verdier[navn]?.trim() ?? "";
            if (verdi === "") {
              feil[navn] = "Fyll inn beløp";
              continue;
            }
            try {
              lesBelop(verdi, "Beløpet");
            } catch {
              feil[navn] = "Beløpet må være et tall med opptil to desimaler";
            }
          }
          continue;
        }
        const melding = validerFelt(felt, verdier[felt.felt] ?? "", verdier);
        if (melding) feil[felt.felt] = melding;
      }
      return feil;
  }
}
