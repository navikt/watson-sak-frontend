/**
 * Tiptap-dokument lagret som JSON (ProseMirror-node). Vi holder denne typen
 * løs og strukturell slik at server-koden ikke trenger å importere editor-pakken.
 */
export type DokumentInnhold = {
  type: string;
  content?: DokumentInnhold[];
  [key: string]: unknown;
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
