export interface FordelingSak {
  id: string;
  opprettetDato: string;
  kategori: string | null;
  kategoriVariant: "neutral";
  ytelser: string[];
}
