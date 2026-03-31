export interface KontrollsakResponse {
  id: string;
  personIdent: string;
  saksbehandler: string;
  status: string;
  kategori: string;
  prioritet: string;
  mottakEnhet: string;
  mottakSaksbehandler: string;
  ytelser: Array<{
    id: string;
    type: string;
    periodeFra: string;
    periodeTil: string;
  }>;
  bakgrunn: {
    id: string;
    kilde: string;
    innhold: string;
    avsender: {
      id: string;
      navn: string | null;
      telefon: string | null;
      adresse: string | null;
      anonym: boolean;
    } | null;
    vedlegg: Array<{
      id: string;
      filnavn: string;
      lokasjon: string;
    }>;
    tilleggsopplysninger: string | null;
  } | null;
  resultat: unknown;
  opprettet: string;
  oppdatert: string | null;
}

export interface KontrollsakPageResponse {
  items: KontrollsakResponse[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
}
