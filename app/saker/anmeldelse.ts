import { z } from "zod";
import { lesBelop } from "./handlinger/resultat-request";
import {
  type KontrollsakResponse,
  POLITIDISTRIKT_MAKS_LENGDE,
  POLITIETS_SAKSREFERANSE_MAKS_LENGDE,
} from "./types.backend";

/** Anmeldelsesopplysninger slik de vises på saken. */
export type Anmeldelse = {
  anmeldtBelop: number;
  politidistrikt: string | null;
  politietsSaksreferanse: string | null;
};

/**
 * Anmeldelsen vises når saken er hos politiet eller avsluttet, og anmeldt beløp er registrert.
 * Eldre saker kan mangle politidistrikt.
 */
export function hentAnmeldelseForVisning(sak: KontrollsakResponse): Anmeldelse | null {
  if (sak.steg !== "POLITI" && sak.steg !== "AVSLUTTET") return null;
  const vurdering = sak.resultat?.strafferettsligVurdering;
  if (vurdering?.type !== "ANMELDT" || vurdering.anmeldtBelop == null) return null;
  return {
    anmeldtBelop: vurdering.anmeldtBelop,
    politidistrikt: vurdering.politidistrikt?.trim() || null,
    politietsSaksreferanse: vurdering.politietsSaksreferanse?.trim() || null,
  };
}

/** Anmeldelsesopplysninger kan bare redigeres når en anmeldt sak er hos politiet. Backend håndhever det samme. */
export function kanRedigereAnmeldelse(sak: KontrollsakResponse): boolean {
  return sak.steg === "POLITI" && sak.resultat?.strafferettsligVurdering?.type === "ANMELDT";
}

const kontrolltegn = /[\p{Cc}\p{Cf}\u2028\u2029]/u;

/** Samme regler som backend: trimmet, ikke tomt, maks 100 tegn og ingen kontrolltegn eller linjeskift. */
const politidistriktSchema = z
  .string({ message: "Politidistrikt må fylles ut" })
  .trim()
  .min(1, "Politidistrikt må fylles ut")
  .refine((verdi) => [...verdi].length <= POLITIDISTRIKT_MAKS_LENGDE, {
    message: `Politidistrikt kan ha opptil ${POLITIDISTRIKT_MAKS_LENGDE} tegn`,
  })
  .refine((verdi) => !kontrolltegn.test(verdi), {
    message: "Politidistrikt kan ikke inneholde linjeskift eller usynlige tegn",
  });

const politietsSaksreferanseSchema = z
  .string()
  .trim()
  .max(POLITIETS_SAKSREFERANSE_MAKS_LENGDE, {
    message: `Politiets saksreferanse kan ha opptil ${POLITIETS_SAKSREFERANSE_MAKS_LENGDE} tegn`,
  })
  .refine((verdi) => !kontrolltegn.test(verdi), {
    message: "Politiets saksreferanse kan ikke inneholde linjeskift eller usynlige tegn",
  });

export const redigerAnmeldelseSchema = z.object({
  anmeldtBelop: z
    .string({ message: "Anmeldt beløp må fylles ut" })
    .trim()
    .min(1, "Anmeldt beløp må fylles ut")
    .transform((verdi, ctx) => {
      try {
        return lesBelop(verdi, "Anmeldt beløp");
      } catch {
        ctx.addIssue({
          code: "custom",
          message: "Anmeldt beløp må være et tall med opptil to desimaler",
        });
        return z.NEVER;
      }
    }),
  politidistrikt: politidistriktSchema,
  politietsSaksreferanse: politietsSaksreferanseSchema,
});

type LestAnmeldelse =
  | { sendt: false }
  | {
      sendt: true;
      verdier: {
        anmeldtBelop: string;
        politidistrikt: string;
        politietsSaksreferanse: string;
      };
      resultat: ReturnType<typeof redigerAnmeldelseSchema.safeParse>;
    };

/** Leser anmeldelsesfeltene fra redigeringsskjemaet. Feltene finnes bare når anmeldelsen kan redigeres. */
export function lesAnmeldelseFraSkjema(formData: FormData): LestAnmeldelse {
  if (
    !formData.has("anmeldtBelop") &&
    !formData.has("politidistrikt") &&
    !formData.has("politietsSaksreferanse")
  ) {
    return { sendt: false };
  }
  const tekst = (navn: string) => {
    const verdi = formData.get(navn);
    return typeof verdi === "string" ? verdi : "";
  };
  const verdier = {
    anmeldtBelop: tekst("anmeldtBelop"),
    politidistrikt: tekst("politidistrikt"),
    politietsSaksreferanse: tekst("politietsSaksreferanse"),
  };
  return { sendt: true, verdier, resultat: redigerAnmeldelseSchema.safeParse(verdier) };
}

/** Feltnavnene som endres, slik de vises i historikken. Brukes før den lagrede vurderingen overskrives. */
export function finnEndredeAnmeldelsesfelter(
  sak: KontrollsakResponse,
  ny: { anmeldtBelop: number; politidistrikt: string; politietsSaksreferanse: string },
): string[] {
  const vurdering = sak.resultat?.strafferettsligVurdering;
  return [
    ...(vurdering?.anmeldtBelop === ny.anmeldtBelop ? [] : ["anmeldt beløp"]),
    ...(vurdering?.politidistrikt === ny.politidistrikt ? [] : ["politidistrikt"]),
    ...((vurdering?.politietsSaksreferanse?.trim() || "") === ny.politietsSaksreferanse
      ? []
      : ["politiets saksreferanse"]),
  ];
}
