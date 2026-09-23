/** Visningsmodell for prototypen, ikke en ferdig backend-kontrakt eller statusmotor. */
export interface MigreringKandidat {
  kilde: "UTREDNING" | "SV";
  pid: string;
  navn: string;
  ansvar:
    | { type: "BEKREFTET"; navIdent: string }
    | { type: "LOGGTREFF"; navIdent: string }
    | { type: "UKJENT" };
  vurdering: "MULIG_KANDIDAT" | "MA_AVKLARES";
  fase: string;
  begrunnelse: string;
  kildefelter: { felt: string; verdi: string | null }[];
}

export interface MigreringLister {
  mine: MigreringKandidat[];
  utenBekreftetAnsvarlig: MigreringKandidat[];
}

export const kildeEtikett = {
  UTREDNING: "Utredning",
  SV: "SV / straffesak",
} as const;

export const vurderingEtikett = {
  MULIG_KANDIDAT: "Mulig kandidat",
  MA_AVKLARES: "Må avklares",
} as const;
