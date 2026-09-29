import type {
  LagreResultatRequest,
  KontrollsakSteg,
  TillatteHandlingerResponse,
} from "~/saker/types.backend";

const resultatFeltStier = {
  "utredning.type": ["utredning", "type"],
  "utredning.henleggelsesarsak": ["utredning", "henleggelsesarsak"],
  "forvaltning.type": ["forvaltning", "type"],
  "forvaltning.endeligUtfall.type": ["forvaltning", "endeligUtfall", "type"],
  "forvaltning.endeligUtfall.henleggelsesarsak": [
    "forvaltning",
    "endeligUtfall",
    "henleggelsesarsak",
  ],
  "strafferettsligVurdering.type": ["strafferettsligVurdering", "type"],
  "strafferettsligVurdering.henleggelsesarsak": ["strafferettsligVurdering", "henleggelsesarsak"],
  "politi.type": ["politi", "type"],
  "politi.henleggelsesarsak": ["politi", "henleggelsesarsak"],
  "politi.begrunnelse": ["politi", "begrunnelse"],
  "politi.detaljer": ["politi", "detaljer"],
  "politi.belopTilbakekrevd": ["politi", "belopTilbakekrevd"],
  "politi.strafferabatt": ["politi", "strafferabatt"],
  "politi.strafferabattProsent": ["politi", "strafferabattProsent"],
  "politi.domsdato": ["politi", "domsdato"],
  paaklaget: ["paaklaget"],
} as const;

/** Valgfrie tekstfelt. Alle andre felt er påkrevd når vilkåret i `paakrevdNar` er oppfylt. */
const valgfrieFelt = new Set(["politi.detaljer"]);

type Resultatfelt = keyof typeof resultatFeltStier;

const resultatFeltWhitelist = new Set<string>(Object.keys(resultatFeltStier));
const fasteSkjemafelter = new Set([
  "handling",
  "steg",
  "status",
  "beskrivelse",
  "versjon",
  "registrerResultat",
]);
const belopFelt = new Set(["belop", "endeligBelop", "anmeldtBelop"]);

function erResultatfelt(felt: string): felt is Resultatfelt {
  return resultatFeltWhitelist.has(felt);
}

/**
 * Tolker `paakrevdNar` fra backend, for eksempel `politi.type=FORELEGG, BOT eller PATALEUNNLATELSE`
 * eller `politi.strafferabatt=true`. Et felt uten vilkår er alltid aktivt.
 */
function erAktivt(
  felt: TillatteHandlingerResponse["feltskjema"][number],
  verdier: Map<string, string>,
): boolean {
  if (!felt.paakrevdNar) return true;
  const match = /^([A-Za-z.]+)=([A-Za-z_, ]+)$/.exec(felt.paakrevdNar);
  if (!match || !erResultatfelt(match[1])) return false;

  const valg = match[2].split(/\s+eller\s+|,\s*/).filter(Boolean);
  return valg.includes(verdier.get(match[1]) ?? "");
}

function erPaakrevd(
  felt: TillatteHandlingerResponse["feltskjema"][number],
  verdier: Map<string, string>,
): boolean {
  if (felt.paakrevd) return true;
  if (!felt.paakrevdNar || valgfrieFelt.has(felt.felt)) return false;
  return erAktivt(felt, verdier);
}

export function resultatFeltErAktivt(
  felt: TillatteHandlingerResponse["feltskjema"][number],
  verdier: Record<string, string>,
): boolean {
  return erAktivt(felt, new Map(Object.entries(verdier)));
}

export function resultatFeltErPaakrevd(
  felt: TillatteHandlingerResponse["feltskjema"][number],
  verdier: Record<string, string>,
): boolean {
  return erPaakrevd(felt, new Map(Object.entries(verdier)));
}

function konverterVerdi(
  felt: TillatteHandlingerResponse["feltskjema"][number],
  verdi: string,
): string | boolean | number | undefined {
  if (felt.datatype === "enum") {
    if (!felt.verdier.some((valg) => valg.verdi === verdi)) {
      throw new Error(`Ugyldig valg for ${felt.felt}`);
    }
    return verdi;
  }
  if (felt.datatype === "boolsk") {
    if (verdi !== "true" && verdi !== "false") {
      throw new Error(`Ugyldig verdi for ${felt.felt}`);
    }
    return verdi === "true";
  }
  if (felt.datatype === "tekst") {
    return verdi.trim() || undefined;
  }
  if (felt.datatype === "tall") {
    return lesBelop(verdi, felt.etikett);
  }
  if (felt.datatype === "dato") {
    if (!erGyldigIsoDato(verdi)) throw new Error(`${felt.etikett} må være en gyldig dato`);
    return verdi;
  }
  return undefined;
}

/** Sjekker at verdien er en dato på formen YYYY-MM-DD som finnes i kalenderen. */
export function erGyldigIsoDato(verdi: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(verdi)) return false;
  const dato = new Date(`${verdi}T00:00:00Z`);
  return !Number.isNaN(dato.getTime()) && dato.toISOString().slice(0, 10) === verdi;
}

function settFelt(
  objekt: Record<string, unknown>,
  sti: readonly string[],
  verdi: string | boolean | number,
): void {
  let gren = objekt;
  for (const del of sti.slice(0, -1)) {
    if (!gren[del]) gren[del] = {};
    gren = gren[del] as Record<string, unknown>;
  }
  gren[sti[sti.length - 1]] = verdi;
}

function hentTvangsverdierForResultat(
  skjema: TillatteHandlingerResponse["feltskjema"],
  resultatType: string,
): Record<string, string> {
  const typefelt = skjema.find(
    (felt) =>
      felt.felt.endsWith(".type") && felt.verdier.some((valg) => valg.verdi === resultatType),
  );
  if (!typefelt) return {};

  const verdier: Record<string, string> = { [typefelt.felt]: resultatType };
  const vilkaar = /^([A-Za-z.]+)=([A-Z_]+)/.exec(typefelt.paakrevdNar ?? "");
  if (vilkaar && erResultatfelt(vilkaar[1]) && skjema.some((felt) => felt.felt === vilkaar[1])) {
    verdier[vilkaar[1]] = vilkaar[2];
  }
  return verdier;
}

export function validerResultatFeltNavn(
  formData: FormData,
  skjema: TillatteHandlingerResponse["feltskjema"],
  ytelser: TillatteHandlingerResponse["tilstand"]["ytelser"] = [],
): void {
  const skjemaFelt = new Set(skjema.map((felt) => felt.felt));
  const ytelseIder = new Set(ytelser.map((ytelse) => ytelse.id));
  for (const [navn] of formData.entries()) {
    if (navn.startsWith("resultat.")) {
      const felt = navn.slice("resultat.".length);
      if (!erResultatfelt(felt) || !skjemaFelt.has(felt)) {
        throw new Error("Skjemaet inneholder et ukjent resultatfelt");
      }
    } else if (navn.startsWith("ytelse.")) {
      const match = /^ytelse\.([0-9a-f-]{36})\.(belop|endeligBelop|anmeldtBelop)$/.exec(navn);
      if (
        !match ||
        !ytelseIder.has(match[1] ?? "") ||
        !belopFelt.has(match[2] ?? "") ||
        !skjemaFelt.has(`ytelser[].${match[2]}`)
      ) {
        throw new Error("Skjemaet inneholder et ukjent ytelsesfelt");
      }
    } else if (!fasteSkjemafelter.has(navn)) {
      throw new Error("Skjemaet inneholder et ukjent felt");
    }
  }
}

export function lesBelop(verdi: string, felt: string): number {
  const normalisert = verdi.replace(/[\s\u00a0\u202f]/g, "").replace(",", ".");
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalisert)) {
    throw new Error(`${felt} må være et gyldig beløp`);
  }
  const belop = Number(normalisert);
  if (!Number.isFinite(belop)) throw new Error(`${felt} må være et gyldig beløp`);
  return belop;
}

export function byggLagreResultatRequest(
  formData: FormData,
  skjema: TillatteHandlingerResponse["feltskjema"],
  steg: KontrollsakSteg,
  tvungetResultat?: string,
  ytelser: TillatteHandlingerResponse["tilstand"]["ytelser"] = [],
  inkluderResultat = true,
): LagreResultatRequest | undefined {
  validerResultatFeltNavn(formData, skjema, ytelser);
  const registrerteVerdier = new Map<string, string>();

  for (const [navn, verdi] of formData.entries()) {
    if (!navn.startsWith("resultat.")) {
      continue;
    }
    const felt = navn.slice("resultat.".length);
    if (typeof verdi === "string") registrerteVerdier.set(felt, verdi);
  }

  if (tvungetResultat) {
    const tvungneVerdier = hentTvangsverdierForResultat(skjema, tvungetResultat);
    if (Object.keys(tvungneVerdier).length === 0) {
      throw new Error("Resultatet er ikke tillatt i dette steget");
    }
    for (const [felt, verdi] of Object.entries(tvungneVerdier)) {
      registrerteVerdier.set(felt, verdi);
    }
  }

  const resultat: Record<string, unknown> = { versjon: 1, steg };
  let harResultat = false;
  for (const felt of skjema) {
    if (!inkluderResultat) continue;
    if (!erResultatfelt(felt.felt)) continue;
    const aktiv = erAktivt(felt, registrerteVerdier);
    const verdi = registrerteVerdier.get(felt.felt);
    if (!aktiv) {
      registrerteVerdier.delete(felt.felt);
      continue;
    }
    if (erPaakrevd(felt, registrerteVerdier) && !verdi?.trim()) {
      throw new Error(`${felt.etikett} er påkrevd`);
    }
    if (verdi === undefined || verdi === "") continue;

    const konvertert = konverterVerdi(felt, verdi);
    if (konvertert === undefined) continue;
    settFelt(resultat, resultatFeltStier[felt.felt], konvertert);
    harResultat = true;
  }

  const belopFelter = skjema
    .filter((felt) => felt.datatype === "belop")
    .map((felt) => felt.felt.slice("ytelser[].".length));
  const ytelserRequest =
    belopFelter.length === 0
      ? []
      : ytelser.flatMap((ytelse) => {
          const belop: Record<string, number> = {};
          for (const felt of belopFelter) {
            if (!belopFelt.has(felt)) continue;
            const verdi = formData.get(`ytelse.${ytelse.id}.${felt}`);
            if (typeof verdi !== "string" || verdi.trim() === "") continue;
            belop[felt] = lesBelop(verdi, `Beløp for ${ytelse.type}`);
          }
          return Object.keys(belop).length === 0 ? [] : [{ id: ytelse.id, ...belop }];
        });

  if (ytelserRequest.length > 0) resultat.ytelser = ytelserRequest;
  if (!harResultat && ytelserRequest.length === 0) return undefined;
  return resultat as LagreResultatRequest;
}
