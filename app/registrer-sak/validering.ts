import { z } from "zod";
import {
  kontrollsakKategoriVerdier,
  kontrollsakKildeVerdier,
  kontrollsakMisbrukstypeVerdier,
  misbrukstyperPerKategori,
} from "~/saker/kategorier";

export const kildeAlternativer = kontrollsakKildeVerdier;

export const kildeEtiketter: Record<(typeof kildeAlternativer)[number], string> = {
  PUBLIKUM: "Publikum",
  NAV_KONTROLL: "Nav kontroll",
  NAV_OVRIG: "Nav øvrig",
  REGISTERSAMKJORING: "Registersamkjøring",
  A_KRIMSAMARBEID: "A-krimsamarbeid",
  POLITIET: "Politiet",
  SKATTEETATEN: "Skatteetaten",
  UTLENDINGSMYNDIGHETEN: "Utlendingsmyndighetene",
  UTENRIKSTJENESTEN: "Utenrikstjenesten",
  STATENS_VEGVESEN: "Statens vegvesen",
  KOMMUNE: "Kommune",
  BANK_OG_FINANS: "Bank og finans",
  ANNET: "Annet",
};

export const kategoriAlternativer = kontrollsakKategoriVerdier;
export { misbrukstyperPerKategori as misbrukstypePerKategori };

export const merkingAlternativer = ["PRIORITERT", "SENSITIV", "POLITIANMELDELSE", "ANNET"] as const;

export const merkingEtiketter: Record<(typeof merkingAlternativer)[number], string> = {
  PRIORITERT: "Prioritert",
  SENSITIV: "Sensitiv",
  POLITIANMELDELSE: "Politianmeldelse",
  ANNET: "Annet",
};

export const enhetAlternativer = ["ØST", "VEST", "NORD", "ANALYSE"] as const;

export const enhetEtiketter: Record<(typeof enhetAlternativer)[number], string> = {
  ØST: "Øst",
  VEST: "Vest",
  NORD: "Nord",
  ANALYSE: "Analyse",
};

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

function dagensDato() {
  return new Date().toISOString().slice(0, 10);
}

function lagValgfrittDatofelt() {
  return z
    .string()
    .optional()
    .transform((dato) => (dato ? normaliserDato(dato) : undefined))
    .refine((dato) => dato === undefined || erGyldigIsoDato(dato), "Ugyldig dato")
    .refine(
      (dato) => dato === undefined || dato <= dagensDato(),
      "Datoen kan ikke være frem i tid",
    );
}

const misbrukstypeSchema = z.enum(kontrollsakMisbrukstypeVerdier);
const merkingSchema = z.string().trim().min(1, "Merking kan ikke være tom");

const valgfrittBeløpSchema = z.preprocess((verdi) => {
  if (verdi === "" || verdi === null || verdi === undefined) return undefined;
  const tall = Number(verdi);
  return Number.isFinite(tall) ? tall : verdi;
}, z.number({ message: "Ca beløp må være et gyldig tall" }).positive("Ca beløp må være et positivt tall").optional());

const ytelseRadSchema = z
  .object({
    type: z
      .string()
      .optional()
      .transform((verdi) => (verdi && verdi.trim() !== "" ? verdi : undefined)),
    fraDato: lagValgfrittDatofelt(),
    tilDato: lagValgfrittDatofelt(),
    beløp: valgfrittBeløpSchema,
  })
  .refine(({ fraDato, tilDato }) => !fraDato || !tilDato || fraDato <= tilDato, {
    message: "Til dato må være lik eller etter fra dato",
    path: ["tilDato"],
  });

function erUtfyltYtelseRad(rad: {
  type?: string;
  fraDato?: string;
  tilDato?: string;
  beløp?: number;
}) {
  return Boolean(rad.type ?? rad.fraDato ?? rad.tilDato ?? rad.beløp !== undefined);
}

export const opprettSakSchema = z
  .object({
    personIdent: z
      .string()
      .min(1, "Fødselsnummer er påkrevd")
      .regex(/^\d{11}$/, "Fødselsnummer må bestå av 11 siffer"),
    kategori: z.enum(kategoriAlternativer, { message: "Velg kategori" }),
    kilde: z.enum(kildeAlternativer, { message: "Velg kilde" }),
    misbruktype: z.array(misbrukstypeSchema).optional().default([]),
    merking: z.array(merkingSchema).optional().default([]),
    enhet: z.enum(enhetAlternativer).optional(),
    organisasjonsnummer: z
      .string()
      .regex(/^\d{9}$/, "Organisasjonsnummer må bestå av 9 siffer")
      .optional()
      .or(z.literal("")),
    ytelser: z.array(ytelseRadSchema).optional().default([]),
  })
  .transform((data) => ({
    ...data,
    ytelser: data.ytelser.filter(erUtfyltYtelseRad),
  }))
  .refine(
    ({ kategori, misbruktype }) => {
      if (misbruktype.length === 0) return true;
      const gyldige = misbrukstyperPerKategori[kategori as keyof typeof misbrukstyperPerKategori];
      if (!gyldige || gyldige.length === 0) return false;
      return misbruktype.every((type) => gyldige.includes(type as (typeof gyldige)[number]));
    },
    {
      message: "En eller flere misbruktyper passer ikke for valgt kategori",
      path: ["misbruktype"],
    },
  );

export const redigerSaksinformasjonSchema = z
  .object({
    kategori: z.enum(kategoriAlternativer, { message: "Velg kategori" }),
    kilde: z.enum(kildeAlternativer, { message: "Velg kilde" }),
    misbruktype: z.array(misbrukstypeSchema).optional().default([]),
    merking: z.array(merkingSchema).optional().default([]),
    ytelser: z.array(ytelseRadSchema).optional().default([]),
  })
  .transform((data) => ({
    ...data,
    ytelser: data.ytelser.filter(erUtfyltYtelseRad),
  }))
  .refine(
    ({ kategori, misbruktype }) => {
      if (misbruktype.length === 0) return true;
      const gyldige = misbrukstyperPerKategori[kategori as keyof typeof misbrukstyperPerKategori];
      if (!gyldige || gyldige.length === 0) return false;
      return misbruktype.every((type) => gyldige.includes(type as (typeof gyldige)[number]));
    },
    {
      message: "En eller flere misbruktyper passer ikke for valgt kategori",
      path: ["misbruktype"],
    },
  );

export type OpprettSakSkjema = z.infer<typeof opprettSakSchema>;
