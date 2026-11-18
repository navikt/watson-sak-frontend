export type Migreringskilde = "UTREDNING" | "SV" | "NKA_DAGPENGER" | "NKA_AAP";

export type Migreringsstatus = "IKKE_PABEGYNT" | "UNDER_MIGRERING" | "FULLSTENDIG";

export const MIGRERINGSSTATUSER: readonly Migreringsstatus[] = [
  "IKKE_PABEGYNT",
  "UNDER_MIGRERING",
  "FULLSTENDIG",
];

export const statusEtikett: Record<Migreringsstatus, string> = {
  IKKE_PABEGYNT: "Ikke startet",
  UNDER_MIGRERING: "Under flytting",
  FULLSTENDIG: "Ferdig flyttet",
};

/** Kandidater uten lagret status regnes som ikke startet. */
export function hentMigreringsstatus(kandidat: { migreringsstatus?: Migreringsstatus }) {
  return kandidat.migreringsstatus ?? "IKKE_PABEGYNT";
}

export type MigreringKategori =
  | "TIPS_RESTANSE"
  | "TIPS_VENTER_RESULTAT"
  | "SV_RESTANSE"
  | "SV_VENTER_RESULTAT"
  | "REGISTER_DAGPENGER"
  | "REGISTER_AAP";

type MigreringVurdering = "MULIG_KANDIDAT" | "MA_AVKLARES";

interface MigreringGrunnlagsfelt {
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
  // Bare eksplisitt status fra et godkjent grunnlag. Sak opprettet betyr ikke ferdig migrert.
  migreringsstatus?: Migreringsstatus;
  kategori: MigreringKategori;
  navn: string;
  ansvar:
    | { type: "BEKREFTET"; navIdent: string }
    | { type: "LOGGTREFF"; navIdent: string }
    | { type: "UKJENT"; navIdent?: null };
  enhet?: string | null;
  /** Visningsnavn på ansvarlig. Satt i lederens samlede visning. */
  ansvarligNavn?: string | null;
  vurdering: MigreringVurdering;
  ekskluderFraStatistikk: boolean;
  referansedato?: string | null;
  referansedatoFelt?: string | null;
  fase: string;
  begrunnelse: string;
  kildefelter: MigreringGrunnlagsfelt[];
  alleredeMigrertTilKontrollsakId?: number | null;
  hentetTidspunkt?: string;
  /**
   * Kun satt når `ansvar.type === "BEKREFTET"` — backend haandhever dette i
   * MigreringResponseMapper, ikke bare klienten. Aldri satt for
   * UTEN_ANSVARLIG/LOGGTREFF (se avsnitt 10 i migrering-avklaringer.md).
   */
  personIdent?: string | null;
}

/** Én side med kandidater. `side` er 1-basert. */
export interface MigreringSide {
  kandidater: MigreringKandidat[];
  side: number;
  totalSider: number;
  totalAntall: number;
}

export const MIGRERING_SIDESTORRELSE = 20;

/** Ansatt en leder kan se kandidater for og tildele kandidater til. */
export interface MigreringAnsatt {
  navIdent: string;
  navn: string;
  enhetId: string;
  enhetNavn?: string | null;
}

/** Filtrene i URL-en. `enhet` og `ansvarlig` brukes bare i lederens visning. */
export interface MigreringFilter {
  status: Migreringsstatus[];
  enhet: string | null;
  ansvarlig: string | null;
}

export interface MigreringLister {
  /** Egne kandidater. For ledere også ansattes, med personident når ansvaret er bekreftet. */
  liste: MigreringSide;
  /** Valg til filtre og tildeling. Tom for andre enn ledere. */
  ansatteValg: MigreringAnsatt[];
  filter: MigreringFilter;
  erLeder: boolean;
  /** Innlogget brukers NAV-ident. Lederens egne saker ligger først i listen. */
  egenNavIdent?: string;
  /** NOM, tilgangsmaskinen eller migreringstabellen svarte ikke. Listene kan da mangle kandidater. */
  utilgjengelig: boolean;
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
