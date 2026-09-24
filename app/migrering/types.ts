export type Migreringskilde = "UTREDNING" | "SV" | "NKA_DAGPENGER" | "NKA_AAP";

export type MigreringKategori =
  | "TIPS_RESTANSE"
  | "TIPS_VENTER_RESULTAT"
  | "SV_RESTANSE"
  | "SV_VENTER_RESULTAT"
  | "REGISTER_DAGPENGER"
  | "REGISTER_AAP";

export type MigreringVurdering = "MULIG_KANDIDAT" | "MA_AVKLARES";

export interface MigreringAnsvar {
  type: "BEKREFTET" | "LOGGTREFF" | "UKJENT";
  navIdent?: string | null;
}

export interface MigreringGrunnlagsfelt {
  felt: string;
  verdi: string | null;
}

/**
 * Domenemodell og visningsmodell for en migreringskandidat iht 2.a frosset kontrakt.
 */
export interface MigreringKandidat {
  kandidatId: string; // "<kilde>:<legacyPid>"
  kilde: Migreringskilde;
  legacyKilde: Migreringskilde;
  pid: string; // alias for legacyPid for bakoverkompatibilitet
  legacyPid: string;
  kategori: MigreringKategori;
  navn: string;
  ansvar:
    | { type: "BEKREFTET"; navIdent: string }
    | { type: "LOGGTREFF"; navIdent: string }
    | { type: "UKJENT"; navIdent?: null };
  enhet?: string | null;
  vurdering: MigreringVurdering;
  ekskluderFraStatistikk: boolean;
  referansedato?: string | null;
  referansedatoFelt?: string | null;
  fase: string;
  begrunnelse: string;
  kildefelter: MigreringGrunnlagsfelt[];
  alleredeMigrertTilKontrollsakId?: number | null;
  hentetTidspunkt?: string;
}

/** API DTO response typer */
export interface MigreringKandidatResponse {
  kandidatId: string;
  kilde: Migreringskilde;
  legacyPid: string;
  kategori: MigreringKategori;
  ansvar: {
    type: "BEKREFTET" | "LOGGTREFF" | "UKJENT";
    navIdent?: string | null;
  };
  enhet?: string | null;
  vurdering: MigreringVurdering;
  ekskluderFraStatistikk: boolean;
  referansedato?: string | null;
  referansedatoFelt?: string | null;
  fase: string;
  begrunnelse: string;
  grunnlag: MigreringGrunnlagsfelt[];
  alleredeMigrertTilKontrollsakId?: number | null;
  hentetTidspunkt: string;
}

export interface MigreringKandidatPageResponse {
  items: MigreringKandidatResponse[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
  antallPerKategori: Record<string, number>;
}

export interface MigreringLister {
  mine: MigreringKandidat[];
  utenBekreftetAnsvarlig: MigreringKandidat[];
}

export const kildeEtikett: Record<Migreringskilde, string> = {
  UTREDNING: "Utredning",
  SV: "SV / straffesak",
  NKA_DAGPENGER: "Registerkontroll dagpenger",
  NKA_AAP: "Registerkontroll AAP",
};

export const kategoriEtikett: Record<MigreringKategori, string> = {
  TIPS_RESTANSE: "Tipsrestanser",
  TIPS_VENTER_RESULTAT: "Tips venter resultat",
  SV_RESTANSE: "Straffesaker restanser",
  SV_VENTER_RESULTAT: "Straffesaker venter på resultat",
  REGISTER_DAGPENGER: "Registersamkjøring dagpenger",
  REGISTER_AAP: "Registersamkjøring AAP",
};

export const vurderingEtikett: Record<MigreringVurdering, string> = {
  MULIG_KANDIDAT: "Mulig kandidat",
  MA_AVKLARES: "Må avklares",
};
