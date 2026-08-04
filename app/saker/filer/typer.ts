/**
 * Plate/Slate-dokument lagret som JSON. Formatet er en liste av noder
 * (Slate Value), der hver node har «type» og «children».
 * Vi holder typen løs slik at server-koden ikke trenger å importere editor-pakken.
 */
export type DokumentInnhold = object[];

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
