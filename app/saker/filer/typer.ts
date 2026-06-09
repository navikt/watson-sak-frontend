/**
 * Tiptap-dokument lagret som JSON (ProseMirror-node). Vi holder denne typen
 * løs og strukturell slik at server-koden ikke trenger å importere editor-pakken.
 */
export type DokumentInnhold = {
  type: string;
  content?: DokumentInnhold[];
  [key: string]: unknown;
};

/**
 * Node i dokumenttreet for en sak. Mapper beholdes i datamodellen (seedet demo-data
 * kan ha mapper), men i v1 opprettes nye dokumenter flatt på rot.
 */
export type DokumentNode =
  | {
      id: string;
      type: "mappe";
      navn: string;
      barn: DokumentNode[];
    }
  | {
      id: string;
      type: "dokument";
      tittel: string;
      endretAv: string;
      endretDato: string;
    };

/** Et fullstendig dokument inkludert innhold, hentet for editoren. */
export type Dokument = {
  id: string;
  tittel: string;
  innhold: DokumentInnhold;
  endretAv: string;
  endretDato: string;
};

/** En dokument-node (ikke mappe) i dokumenttreet. */
export type Dokumentrad = Extract<DokumentNode, { type: "dokument" }>;
