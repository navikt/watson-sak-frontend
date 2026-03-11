export type FilType =
  | "word"
  | "excel"
  | "pdf"
  | "powerpoint"
  | "bilde"
  | "csv"
  | "json"
  | "kode"
  | "tekst"
  | "annet";

export type FilNode = {
  id: string;
  navn: string;
  sharepointUrl: string;
} & (
  | {
      type: "fil";
      format: FilType;
      endretAv: string;
      endretDato: string;
    }
  | {
      type: "mappe";
      barn: FilNode[];
    }
);
