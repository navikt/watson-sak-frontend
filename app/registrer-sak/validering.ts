import { z } from "zod";
import { sakKildeSchema } from "~/fordeling/typer";

export const registrerSakSchema = z.object({
  fødselsnummer: z
    .string()
    .min(1, "Fødselsnummer er påkrevd")
    .regex(/^\d{11}$/, "Fødselsnummer må bestå av 11 siffer"),
  ytelser: z.array(z.string()).min(1, "Velg minst én ytelse"),
  fraDato: z.string().date("Ugyldig dato").optional(),
  tilDato: z.string().date("Ugyldig dato").optional(),
  avdeling: z.string().min(1, "Velg avdeling"),
  kategori: z.string().min(1, "Velg kategori"),
  tags: z.array(z.string()).default([]),
  kilde: sakKildeSchema,
  kontaktNavn: z.string().optional(),
  kontaktTelefon: z.string().optional(),
  kontaktEpost: z
    .string()
    .email("Ugyldig e-postadresse")
    .optional()
    .or(z.literal("")),
  anonymt: z.boolean().default(false),
  beskrivelse: z.string().min(1, "Beskrivelse er påkrevd"),
});
