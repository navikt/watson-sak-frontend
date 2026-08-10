/**
 * Plate/Slate-dokument lagret som JSON. Formatet er en liste av noder
 * (Slate Value), der hver node har «type» og «children».
 * Vi holder typen løs slik at server-koden ikke trenger å importere editor-pakken.
 */
export type DokumentInnhold = Record<string, unknown>[];

/** Referanse til et dokument (id + tittel) — brukes til å vise hvor et vedlegg er i bruk. */
export type DokumentReferanse = {
  id: string;
  tittel: string;
};

/** Metadata for en opplastet fil tilknyttet en kontrollsak. */
export type FilResponse = {
  id: string;
  filnavn: string;
  storrelse: number;
  contentType: string;
  opprettetAv: string;
  opprettet: string;
  /** Dokumentene (om noen) der filen er satt inn som bilde. Tom liste betyr at filen ikke er i bruk. */
  bruktIDokumenter: DokumentReferanse[];
};

/** Node i dokumentlisten for en sak. */
export type DokumentNode = {
  id: string;
  tittel: string;
  endretAv: string;
  endretDato: string;
  låsAv: string | null;
};

/** Et fullstendig dokument inkludert innhold, hentet for editoren. */
export type Dokument = {
  id: string;
  tittel: string;
  innhold: DokumentInnhold;
  endretAv: string;
  endretDato: string;
  låsAv: string | null;
};

/** Lett historikkpunkt. Innhold hentes først når saksbehandleren åpner forhåndsvisningen. */
export type DokumentHistorikkNode = {
  id: string;
  tittel: string;
  endretAv: string;
  endretTidspunkt: string;
};

export type DokumentHistorikk = DokumentHistorikkNode & {
  innhold: DokumentInnhold;
};

export type DokumentHistorikkSide = {
  items: DokumentHistorikkNode[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
};
