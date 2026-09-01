import { z } from "zod";

/**
 * conform sin parseWithZod normaliserer tomme skjemafelt (f.eks. et <select>
 * uten valgt verdi) til `undefined` før Zod validerer. For påkrevde
 * strengfelt uten `.optional()` treffer dette Zods innebygde
 * "invalid_type"-feil ("Invalid input: expected string, received undefined")
 * FØR vår egen `.min(1, "...")`-melding rekker å kjøre, og saksbehandler ser en
 * teknisk Zod-melding i stedet for en forståelig feilmelding.
 *
 * Løsningen — samme mønster som ellers i appen (se f.eks. OpprettOppgaveModal,
 * EndreStatusModal) — er å sette meldingen via `error`-opsjonen på selve
 * `z.string()`-skjemaet. Da dekker den både "feil type" (mangler verdi) og
 * `.min(1, ...)` (tom streng), slik at meldingen alltid blir den samme uansett
 * hvordan det tomme feltet kommer inn.
 */
function påkrevdTekst(melding: string) {
  return z.string({ error: melding }).min(1, melding);
}

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

const merkingSchema = z.string().trim().min(1, "Merking kan ikke være tom");

const valgfrittBeløpSchema = z.preprocess(
  (verdi) => {
    if (verdi === "" || verdi === null || verdi === undefined) return undefined;
    const tall = Number(verdi);
    return Number.isFinite(tall) ? tall : verdi;
  },
  z
    .number({ message: "Antatt beløp må være et gyldig tall" })
    .positive("Antatt beløp må være et positivt tall")
    .optional(),
);

const valgfrittEndeligBeløpSchema = z.preprocess(
  (verdi) => {
    if (verdi === "" || verdi === null || verdi === undefined) return undefined;
    const tall = Number(verdi);
    return Number.isFinite(tall) ? tall : verdi;
  },
  z
    .number({ message: "Endelig beløp må være et gyldig tall" })
    .positive("Endelig beløp må være et positivt tall")
    .optional(),
);

const ytelseRadSchema = z
  .object({
    type: z
      .string()
      .optional()
      .transform((verdi) => (verdi && verdi.trim() !== "" ? verdi : undefined)),
    fraDato: lagValgfrittDatofelt(),
    tilDato: lagValgfrittDatofelt(),
    beløp: valgfrittBeløpSchema,
    endeligBeløp: valgfrittEndeligBeløpSchema,
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
  endeligBeløp?: number;
}) {
  return Boolean(
    rad.type ??
    rad.fraDato ??
    rad.tilDato ??
    (rad.beløp !== undefined || rad.endeligBeløp !== undefined),
  );
}

export const opprettSakSchema = z
  .object({
    personIdent: påkrevdTekst("Fødselsnummer er påkrevd").regex(
      /^\d{11}$/,
      "Fødselsnummer må bestå av 11 siffer",
    ),
    kategori: påkrevdTekst("Velg kategori"),
    kilde: påkrevdTekst("Velg kilde"),
    misbruktype: z
      .array(z.string().trim().min(1, "Misbruktype kan ikke være tom"))
      .optional()
      .default([]),
    merking: z.array(merkingSchema).optional().default([]),
    enhet: påkrevdTekst("Velg enhet"),
    arbeidsgivere: z
      .array(z.string().regex(/^\d{9}$/, "Organisasjonsnummer må bestå av 9 siffer"))
      .max(10, "Maks 10 arbeidsgivere")
      .optional()
      .default([]),
    ytelser: z.array(ytelseRadSchema).optional().default([]),
  })
  .transform((data) => ({
    ...data,
    ytelser: data.ytelser.filter(erUtfyltYtelseRad),
  }));

export const redigerSaksinformasjonSchema = z
  .object({
    kategori: påkrevdTekst("Velg kategori"),
    kilde: påkrevdTekst("Velg kilde"),
    misbruktype: z
      .array(z.string().trim().min(1, "Misbruktype kan ikke være tom"))
      .optional()
      .default([]),
    merking: z.array(merkingSchema).optional().default([]),
    arbeidsgivere: z
      .array(z.string().regex(/^\d{9}$/, "Organisasjonsnummer må bestå av 9 siffer"))
      .max(10, "Maks 10 arbeidsgivere")
      .optional()
      .default([]),
    ytelser: z.array(ytelseRadSchema).optional().default([]),
  })
  .transform((data) => ({
    ...data,
    ytelser: data.ytelser.filter(erUtfyltYtelseRad),
  }));

export type OpprettSakSkjema = z.infer<typeof opprettSakSchema>;
