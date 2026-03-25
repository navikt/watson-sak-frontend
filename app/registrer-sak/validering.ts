import { z } from "zod";

export const kildeAlternativer = ["INTERN", "EKSTERN", "ANONYM_TIPS"] as const;
export const kategoriAlternativer = [
  "UDEFINERT",
  "FEILUTBETALING",
  "MISBRUK",
  "OPPFØLGING",
] as const;
export const prioritetAlternativer = ["HØY", "NORMAL", "LAV"] as const;

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

export const registrerSakSchema = z
  .object({
    personIdent: z
      .string()
      .min(1, "Fødselsnummer er påkrevd")
      .regex(/^\d{11}$/, "Fødselsnummer må bestå av 11 siffer"),
    ytelser: z.array(z.string().min(1)).min(1, "Velg minst én ytelse"),
    fraDato: lagPåkrevdDatofelt("Fra dato"),
    tilDato: lagPåkrevdDatofelt("Til dato"),
    kategori: z.enum(kategoriAlternativer, { message: "Velg kategori" }),
    prioritet: z.enum(prioritetAlternativer, { message: "Velg prioritet" }),
    kilde: z.enum(kildeAlternativer, { message: "Velg kilde" }),
    bakgrunn: z.string().min(1, "Bakgrunn er påkrevd"),
    avsenderNavn: z.string().optional(),
    avsenderTelefon: z.string().optional(),
    avsenderAdresse: z.string().optional(),
    avsenderAnonym: z.boolean().default(false),
  })
  .refine(({ fraDato, tilDato }) => fraDato <= tilDato, {
    message: "Til dato må være lik eller etter fra dato",
    path: ["tilDato"],
  });

export type RegistrerSakSkjema = z.infer<typeof registrerSakSchema>;
