export interface FordelingSak {
  id: number;
  navn: string | null;
  opprettetDato: string;
  oppdatertDato: string;
  kategori: string | null;
  misbrukstyper: string[];
  ytelser: string[];
  status: string;
  ventestatus: string | null;
}
