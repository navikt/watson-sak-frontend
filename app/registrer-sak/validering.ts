import { z } from "zod";

export const kildeAlternativer = ["INTERN", "EKSTERN", "ANONYM_TIPS", "PUBLIKUM"] as const;

export const kategoriAlternativer = [
  "BEHANDLER",
  "ARBEID",
  "SAMLIV",
  "UTLAND",
  "IDENTITET",
  "TILTAK",
  "DOKUMENTFALSK",
  "ANNET",
] as const;

export const misbrukstypePerKategori: Partial<
  Record<(typeof kategoriAlternativer)[number], readonly string[]>
> = {
  BEHANDLER: ["Behandler §25-7", "L-takster", "Behandler", "L-takster foretak"],
  ARBEID: ["Hvit inntekt", "Fiktivt arbeidsforhold", "Svart arbeid", "Feil inntektsgrunnlag"],
  SAMLIV: ["Skjult samliv", "Endret sivilstatus"],
  UTLAND: ["Medlemskap bortfalt", "Innenfor EØS", "Utenfor EØS"],
  IDENTITET: ["Identitetsmisbruk", "Opphold på feil grunnlag"],
  TILTAK: ["Misbruk av tiltaksplass", "Avbrutt tiltak"],
};

export const merkingAlternativer = ["PRIORITERT", "SENSITIV", "POLITIANMELDELSE", "ANNET"] as const;

export const enhetAlternativer = ["ØST", "VEST", "NORD", "SØR", "OSLO"] as const;

function normaliserDato(dato: string) {
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(dato)) {
    const [dag, måned, år] = dato.split(".");
    return `${år}-${måned}-${dag}`;
  }

  return dato;
}

function erGyldigIsoDato(dato: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dato)) {
    return false;
  }

  const [år, måned, dag] = dato.split("-").map(Number);
  const normalisert = new Date(Date.UTC(år, måned - 1, dag));

  return (
    !Number.isNaN(normalisert.getTime()) &&
    normalisert.getUTCFullYear() === år &&
    normalisert.getUTCMonth() === måned - 1 &&
    normalisert.getUTCDate() === dag
  );
}

function lagPåkrevdDatofelt(feltnavn: string) {
  return z.preprocess(
    (verdi) => (typeof verdi === "string" ? verdi : ""),
    z
      .string()
      .min(1, `${feltnavn} er påkrevd`)
      .transform((dato) => normaliserDato(dato))
      .refine((dato) => erGyldigIsoDato(dato), "Ugyldig dato"),
  );
}

export const opprettSakSchema = z
  .object({
    personIdent: z
      .string()
      .min(1, "Fødselsnummer er påkrevd")
      .regex(/^\d{11}$/, "Fødselsnummer må bestå av 11 siffer"),
    ytelser: z.array(z.string().min(1)).min(1, "Velg minst én ytelse"),
    fraDato: lagPåkrevdDatofelt("Fra dato"),
    tilDato: lagPåkrevdDatofelt("Til dato"),
    kategori: z.enum(kategoriAlternativer, { message: "Velg kategori" }),
    misbruktype: z
      .string()
      .refine((val) => {
        const alleMisbrukstyper = Object.values(misbrukstypePerKategori).flat();
        return !val || alleMisbrukstyper.includes(val);
      }, "Ugyldig misbruktype")
      .optional(),
    merking: z.enum(merkingAlternativer).optional(),
    kilde: z.enum(kildeAlternativer, { message: "Velg kilde" }),
    enhet: z.enum(enhetAlternativer, { message: "Velg enhet" }),
    caBeløp: z.preprocess((verdi) => {
      if (verdi === "" || verdi === null || verdi === undefined) return undefined;
      const tall = Number(verdi);
      return Number.isFinite(tall) ? tall : verdi;
    }, z.number({ message: "Ca beløp må være et gyldig tall" }).positive("Ca beløp må være et positivt tall").optional()),
    organisasjonsnummer: z
      .string()
      .regex(/^\d{9}$/, "Organisasjonsnummer må bestå av 9 siffer")
      .optional()
      .or(z.literal("")),
  })
  .refine(({ fraDato, tilDato }) => fraDato <= tilDato, {
    message: "Til dato må være lik eller etter fra dato",
    path: ["tilDato"],
  })
  .refine(
    ({ kategori, misbruktype }) => {
      const harMisbrukstyper = kategori in misbrukstypePerKategori;
      if (harMisbrukstyper && !misbruktype) return false;
      return true;
    },
    { message: "Velg misbruktype", path: ["misbruktype"] },
  );

export type OpprettSakSkjema = z.infer<typeof opprettSakSchema>;
