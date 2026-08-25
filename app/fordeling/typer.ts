import type { KontrollsakStatus } from "~/saker/types.backend";

export interface FordelingSak {
  id: number;
  navn: string | null;
  opprettetDato: string;
  oppdatertDato: string;
  kategori: string | null;
  misbrukstyper: string[];
  ytelser: string[];
  merking: string[];
  status: string;
  statusKode: KontrollsakStatus;
  ventestatus: string | null;
}
