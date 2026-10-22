import { z } from "zod";
import { lesBelop } from "./handlinger/resultat-request";
import { erGyldigPolitidistrikt } from "./politidistrikter";
import { type KontrollsakResponse } from "./types.backend";

/** Anmeldt beløp og politidistrikt slik de vises på saken. */
export type Anmeldelse = { anmeldtBelop: number; politidistrikt: string | null };

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
  };
}

/** Anmeldt beløp og politidistrikt kan bare redigeres når en anmeldt sak er hos politiet. Backend håndhever det samme. */
export function kanRedigereAnmeldelse(sak: KontrollsakResponse): boolean {
  return sak.steg === "POLITI" && sak.resultat?.strafferettsligVurdering?.type === "ANMELDT";
}

/** Politidistriktet må velges fra den faste listen, samme som i saksflyten. */
const politidistriktSchema = z
  .string({ message: "Politidistrikt må fylles ut" })
  .trim()
  .min(1, "Politidistrikt må fylles ut")
  .refine(erGyldigPolitidistrikt, { message: "Velg et politidistrikt fra listen" });

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
});

type LestAnmeldelse =
  | { sendt: false }
  | {
      sendt: true;
      verdier: { anmeldtBelop: string; politidistrikt: string };
      resultat: ReturnType<typeof redigerAnmeldelseSchema.safeParse>;
    };

/** Leser anmeldelsesfeltene fra redigeringsskjemaet. Feltene finnes bare når anmeldelsen kan redigeres. */
export function lesAnmeldelseFraSkjema(formData: FormData): LestAnmeldelse {
  if (!formData.has("anmeldtBelop") && !formData.has("politidistrikt")) return { sendt: false };
  const tekst = (navn: string) => {
    const verdi = formData.get(navn);
    return typeof verdi === "string" ? verdi : "";
  };
  const verdier = { anmeldtBelop: tekst("anmeldtBelop"), politidistrikt: tekst("politidistrikt") };
  return { sendt: true, verdier, resultat: redigerAnmeldelseSchema.safeParse(verdier) };
}

/** Feltnavnene som endres, slik de vises i historikken. Brukes før den lagrede vurderingen overskrives. */
export function finnEndredeAnmeldelsesfelter(
  sak: KontrollsakResponse,
  ny: { anmeldtBelop: number; politidistrikt: string },
): string[] {
  const vurdering = sak.resultat?.strafferettsligVurdering;
  return [
    ...(vurdering?.anmeldtBelop === ny.anmeldtBelop ? [] : ["anmeldt beløp"]),
    ...(vurdering?.politidistrikt === ny.politidistrikt ? [] : ["politidistrikt"]),
  ];
}
