import { z } from "zod";

/** Maks lengde på en kommentartekst. Speiler KOMMENTAR_MAKS_LENGDE i watson-admin-api. */
export const MAKS_KOMMENTARLENGDE = 5000;

/** Skjemaversjonen vi skriver nye ankere med. Sendes som `ankerVersjon`. */
export const ANKER_VERSJON = 1;

/** Hvor en kommentartråd er forankret. Speiler `KommentarAnkerType` i backend. */
export const ankertypeSchema = z.enum(["DOCUMENT", "TEXT", "ELEMENT"]);
export type Ankertype = z.infer<typeof ankertypeSchema>;

/**
 * Ankeret er **ugjennomsiktig for backend** – det lagres som en vilkårlig JSON-map,
 * mens typen og skjemaversjonen ligger i egne felter (`ankerType`/`ankerVersjon`).
 *
 * Internt i frontend jobber vi med en diskriminert union der `type` er en del av
 * objektet, fordi ankermotoren trenger diskriminatoren. Konverteringen mellom de to
 * representasjonene skjer kun i `fraBackendAnker` og `tilBackendAnker`.
 */
const tekstAnkerPayloadSchema = z.object({
  /** Stabil node-id fra NodeIdPlugin, hvis dokumentet hadde en da kommentaren ble laget. */
  nodeId: z.string().nullish(),
  /** Slate-sti til blokken teksten står i, slik den var ved opprettelse. */
  path: z.array(z.number()).default([]),
  /** Start/slutt målt i blokkens samlede tekst. */
  startOffset: z.number().default(0),
  sluttOffset: z.number().default(0),
  exact: z.string().default(""),
  prefix: z.string().default(""),
  suffix: z.string().default(""),
});

const elementAnkerPayloadSchema = z.object({
  nodeId: z.string().nullish(),
  path: z.array(z.number()).default([]),
  /** Slate-typen på elementet, f.eks. «p», «h2», «td», «img», «variabel». */
  elementtype: z.string().default(""),
  /** Normalisert tekstavtrykk brukt til å gjenkjenne elementet hvis stien flytter seg. */
  fingerprint: z.string().default(""),
});

export type DokumentAnker = { type: "DOCUMENT" };
export type TekstAnker = z.infer<typeof tekstAnkerPayloadSchema> & { type: "TEXT" };
export type ElementAnker = z.infer<typeof elementAnkerPayloadSchema> & { type: "ELEMENT" };
export type Anker = DokumentAnker | TekstAnker | ElementAnker;

export const DOKUMENTANKER: DokumentAnker = { type: "DOCUMENT" };

/**
 * Setter sammen backendens `ankerType` og ugjennomsiktige `anker`-map til den
 * diskriminerte unionen frontend jobber med. Et anker vi ikke klarer å tolke
 * degraderes til et dokumentanker – tråden og teksten er viktigere enn ankeret.
 */
export function fraBackendAnker(ankerType: Ankertype, anker: unknown): Anker {
  if (ankerType === "TEXT") {
    const parset = tekstAnkerPayloadSchema.safeParse(anker ?? {});
    return parset.success ? { type: "TEXT", ...parset.data } : DOKUMENTANKER;
  }
  if (ankerType === "ELEMENT") {
    const parset = elementAnkerPayloadSchema.safeParse(anker ?? {});
    return parset.success ? { type: "ELEMENT", ...parset.data } : DOKUMENTANKER;
  }
  return DOKUMENTANKER;
}

/**
 * Deler den interne unionen opp i de tre feltene backend forventer i requesten.
 * `type` er ikke en del av `anker`-mapen – den ligger i `ankerType`.
 */
export function tilBackendAnker(anker: Anker): {
  ankerType: Ankertype;
  anker: Record<string, unknown>;
  ankerVersjon: number;
} {
  const { type, ...nyttelast } = anker;
  return {
    ankerType: type,
    // DOCUMENT har ingen nyttelast, men backend krever at feltet er til stede.
    anker: type === "DOCUMENT" ? {} : (nyttelast as Record<string, unknown>),
    ankerVersjon: ANKER_VERSJON,
  };
}

/**
 * Eksakt speiling av `KommentarResponse`. Vi beholder backendnavnene (`tekst`,
 * `erEgen`, `erRot`) også internt, slik at det ikke oppstår to sannheter om
 * hva et felt heter.
 */
const kommentarSchema = z.object({
  id: z.string(),
  traadId: z.string(),
  erRot: z.boolean().default(false),
  tekst: z.string().default(""),
  forfatterIdent: z.string().default(""),
  forfatterNavn: z.string().default(""),
  opprettet: z.string(),
  endret: z.string(),
  versjon: z.number().default(0),
  /** Backend avgjør om innlogget saksbehandler kan redigere/slette kommentaren. */
  erEgen: z.boolean().default(false),
});

export type Kommentar = z.infer<typeof kommentarSchema>;

/**
 * Eksakt speiling av `KommentarTraadResponse`, transformert til frontendvennlige
 * navn: `ankertype`, den sammensatte `anker`-unionen og det avledede flagget
 * `adressert` (backend sender `resolved` som tidspunkt eller null).
 */
export const kommentartraadSchema = z
  .object({
    id: z.string(),
    dokumentId: z.string(),
    ankerType: ankertypeSchema.catch("DOCUMENT"),
    anker: z.unknown(),
    ankerVersjon: z.number().default(ANKER_VERSJON),
    opprinneligSitat: z.string().nullish(),
    opprettetAvIdent: z.string().default(""),
    opprettetAvNavn: z.string().default(""),
    opprettet: z.string(),
    resolved: z.string().nullish(),
    resolvedAvIdent: z.string().nullish(),
    resolvedAvNavn: z.string().nullish(),
    versjon: z.number().default(0),
    synlig: z.boolean().default(true),
    kommentarer: z.array(kommentarSchema).default([]),
  })
  .transform((rå) => ({
    id: rå.id,
    dokumentId: rå.dokumentId,
    ankertype: rå.ankerType,
    anker: fraBackendAnker(rå.ankerType, rå.anker),
    ankerVersjon: rå.ankerVersjon,
    opprinneligSitat: rå.opprinneligSitat ?? null,
    opprettetAvIdent: rå.opprettetAvIdent,
    opprettetAvNavn: rå.opprettetAvNavn,
    opprettet: rå.opprettet,
    resolved: rå.resolved ?? null,
    /** Avledet av `resolved`: en adressert tråd er skrivebeskyttet til den gjenåpnes. */
    adressert: (rå.resolved ?? null) !== null,
    resolvedAvIdent: rå.resolvedAvIdent ?? null,
    resolvedAvNavn: rå.resolvedAvNavn ?? null,
    versjon: rå.versjon,
    synlig: rå.synlig,
    kommentarer: rå.kommentarer,
  }));

export type Kommentartraad = z.infer<typeof kommentartraadSchema>;

/** Eksakt speiling av `KommentarTraadListeResponse`. */
export const kommentarlisteSchema = z.object({
  dokumentId: z.string(),
  arkivert: z.string().nullish(),
  /** Backendfasit for om dokumentet kan kommenteres. Falsk når dokumentet er arkivert. */
  kanKommentere: z.boolean(),
  traader: z.array(kommentartraadSchema).default([]),
});

export type Kommentarliste = z.infer<typeof kommentarlisteSchema>;

/** Maks lengde på `opprinneligSitat`. Speiler `@Size(max = 2000)` i backend. */
export const MAKS_SITATLENGDE = 2000;

/**
 * Klipper et sitat til backendens maksgrense.
 *
 * En saksbehandler kan markere et helt avsnitt på flere tusen tegn. Uten
 * klipping ville hele POST-en blitt avvist med 400 – og kommentaren gått tapt.
 * Sitatet er kun til visning i panelet; selve forankringen ligger i ankeret.
 */
export function klippSitat(tekst: string): string {
  const trimmet = tekst.trim();
  return trimmet.length > MAKS_SITATLENGDE ? trimmet.slice(0, MAKS_SITATLENGDE) : trimmet;
}

/** Validerer og trimmer kommentartekst. Ren tekst med linjeskift – ingen formatering. */
export function normaliserKommentartekst(
  verdi: unknown,
): { ok: true; tekst: string } | { ok: false; feil: string } {
  if (typeof verdi !== "string") {
    return { ok: false, feil: "Kommentaren mangler innhold." };
  }
  // Normaliser linjeskift først, slik at maks-grensen teller likt i alle nettlesere.
  const trimmet = verdi.replaceAll("\r\n", "\n").trim();
  if (trimmet.length === 0) {
    return { ok: false, feil: "Kommentaren kan ikke være tom." };
  }
  if (trimmet.length > MAKS_KOMMENTARLENGDE) {
    return {
      ok: false,
      feil: `Kommentaren kan ikke være lengre enn ${MAKS_KOMMENTARLENGDE} tegn.`,
    };
  }
  return { ok: true, tekst: trimmet };
}
