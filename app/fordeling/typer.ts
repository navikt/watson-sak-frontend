export interface FordelingSak {
  id: string;
  navn: string | null;
  opprettetDato: string;
  oppdatertDato: string;
  kategori: string | null;
  misbrukstyper: string[];
  ytelser: string[];
  status: {
    tekst: string;
    variant: "info" | "warning" | "success" | "neutral";
  };
}
