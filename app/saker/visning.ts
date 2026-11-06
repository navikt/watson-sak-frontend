import type {
  KontrollsakKategori,
  KontrollsakKilde,
  KontrollsakMisbrukstype,
  KontrollsakResponse,
  KontrollsakStatus,
  KontrollsakSteg,
  KontrollsakYtelse,
  ResultatType,
} from "./types.backend";
import {
  kontrollsakKategoriEtiketter,
  kontrollsakKildeEtiketter,
  kontrollsakMisbrukstypeEtiketter,
  kontrollsakYtelseTypeEtiketter,
} from "./kategorier";

export type { KontrollsakSteg };

const stegEtiketter: Record<KontrollsakSteg, string> = {
  OPPRETTET: "Opprettet",
  UTREDNING: "Utredning",
  UTREDES: "Utredning",
  FORVALTNING: "Forvaltning",
  STRAFFERETTSLIG_VURDERING: "Strafferettslig vurdering",
  POLITI: "Politi",
  ANMELDT: "Politi",
  AVSLUTTET: "Avsluttet",
};

const statusEtiketter: Record<KontrollsakStatus, string> = {
  AKTIV: "Aktiv",
  VENTER_PA_INFORMASJON: "Venter på informasjon",
  VENTER_PA_VEDTAK: "Venter på vedtak",
  VENTER_PA_RESULTAT: "Venter på resultat",
  PAAKLAGET: "Påklaget",
  I_BERO: "I bero",
};

export function formaterSteg(steg: KontrollsakSteg | null | undefined): string {
  if (!steg) return "Ukjent";
  return stegEtiketter[steg];
}

/** Tag-farge for steg. Alle steg har samme farge overalt i løsningen. */
export const STEG_FARGE = "info";

export type StatusFarge = "success" | "warning" | "neutral";

/** Tag-farge for status: «Aktiv» (eller ingen status) er success, alle ventestatuser er warning. */
export function hentStatusFarge(status: KontrollsakStatus | null | undefined): StatusFarge {
  return !status || status === "AKTIV" ? "success" : "warning";
}

export function formaterStatus(status: KontrollsakStatus): string {
  return statusEtiketter[status];
}

export const resultatEtiketter: Record<ResultatType, string> = {
  KONTROLLNOTAT: "Kontrollnotat",
  FEILUTBETALINGSSAK_ORDINAER: "Feilutbetalingssak, ordinær",
  FEILUTBETALINGSSAK_POTENSIELL_STRAFFESAK: "Feilutbetalingssak, potensiell straffesak",
  HENLAGT: "Henlagt",
  SAKEN_SKAL_VURDERES_FOR_ANMELDELSE: "Saken skal vurderes for anmeldelse",
  SAKEN_SKAL_IKKE_VURDERES_FOR_ANMELDELSE: "Saken skal ikke vurderes for anmeldelse",
  ANMELDT: "Anmeldt",
  FORELEGG: "Forelegg",
  BOT: "Bot",
  PATALEUNNLATELSE: "Påtaleunnlatelse",
  FRIFINNELSE: "Frifinnelse",
  DOMFELLELSE: "Domfelt",
};

export const henleggelsesarsakEtiketter = {
  FORELDET: "Foreldet",
  IKKE_KAPASITET: "Ikke kapasitet",
  IKKE_TILSTREKKELIG_BEVISGRUNNLAG: "Ikke tilstrekkelig dokumentasjon",
  IKKE_TILSTREKKELIG_SKYLD: "Ikke tilstrekkelig skyld",
  SAK_PABEGYNT_ELLER_OVERTATT_AV_ANDRE: "Sak påbegynt eller overtatt av andre",
  IKKE_PRIORITERT: "Ikke prioritert",
  KONTROLLNOTAT: "Kontrollnotat",
  NAY_MANGLER_I_SAKSBEHANDLINGEN: "NAY: Mangler i saksbehandlingen",
  NFP_MANGLER_I_SAKSBEHANDLINGEN: "NFP: Mangler i saksbehandlingen",
  NAY_MANGLER_VED_BEREGNINGSSKJEMA: "NAY: Mangler ved beregningsskjema",
  NFP_MANGLER_VED_BEREGNINGSSKJEMA: "NFP: Mangler ved beregningsskjema",
  NAY_MANGELFULL_DOKUMENTASJON: "NAY: Mangelfull dokumentasjon",
  NFP_MANGELFULL_DOKUMENTASJON: "NFP: Mangelfull dokumentasjon",
  NAY_MANGLENDE_DOKUMENTER: "NAY: Manglende dokumenter",
  NFP_MANGLENDE_DOKUMENTER: "NFP: Manglende dokumenter",
  NAY_LANG_LIGGETID_HOS_NAV: "NAY: Lang liggetid hos Nav",
  NFP_LANG_LIGGETID_HOS_NAV: "NFP: Lang liggetid hos Nav",
  NAY_GAMMEL_SAK: "NAY: Gammel sak",
  NFP_GAMMEL_SAK: "NFP: Gammel sak",
  NAV_KONTOR_BRUKER_FEILINFORMERT: "Nav-kontor: Bruker feilinformert",
  NAV_KONTOR_MANGLENDE_INFORMASJON: "Nav-kontor: Manglende informasjon",
  TUNGTVEIENDE_GRUNNER: "Tungtveiende grunner",
  UNDER_BELOPSGRENSEN: "Under beløpsgrensen",
  UNDER_KLAGEBEHANDLING: "Under klagebehandling",
  MANGLER_SUBJEKTIV_SKYLD: "Mangler subjektiv skyld",
  INGEN_UTREDNING: "Ingen utredning",
  BEVISETS_STILLING: "Bevisets stilling",
  BELOP_UNDER_PATALEGRENSE: "Beløp under påtalegrense",
  INTET_STRAFFBART_FORHOLD: "Intet straffbart forhold",
  FEILREGISTRERT_DUBLETT: "Feilregistrert / dublett",
  IKKE_GRUNNLAG_FOR_TILBAKEKREVING: "Ikke grunnlag for tilbakekreving",
  BELOP_UNDER_BELOPSGRENSE: "Beløp under beløpsgrense",
  FEILUTBETALING: "Feilutbetaling",
} as const;

function formaterResultattype(type: string): string {
  return resultatEtiketter[type as ResultatType] ?? type;
}

/**
 * Resultatet saken ble avsluttet med: det siste steget som har et avsluttende resultat.
 * Returnerer `null` når saken ikke har et slikt resultat.
 */
export function hentSluttresultat(resultat: KontrollsakResponse["resultat"]): string | null {
  if (!resultat) return null;
  if (resultat.politi?.type) return formaterResultattype(resultat.politi.type);
  const sv = resultat.strafferettsligVurdering?.type;
  if (sv && sv !== "ANMELDT") return formaterResultattype(sv);
  const endeligUtfall = resultat.forvaltning?.endeligUtfall ?? resultat.endeligUtfall;
  if (endeligUtfall?.type) return formaterResultattype(endeligUtfall.type);
  const utredning = resultat.utredning?.type;
  if (utredning === "HENLAGT" || utredning === "KONTROLLNOTAT") {
    return formaterResultattype(utredning);
  }
  return null;
}

function formaterFengselsstraff(
  måneder: number | null | undefined,
  dager: number | null | undefined,
): string | null {
  const deler: string[] = [];
  if (måneder && måneder > 0) deler.push(`${måneder} ${måneder === 1 ? "måned" : "måneder"}`);
  if (dager && dager > 0) deler.push(`${dager} ${dager === 1 ? "dag" : "dager"}`);
  return deler.length > 0 ? deler.join(" og ") : null;
}

function hentHenleggelsesarsak(resultat: KontrollsakResponse["resultat"]): string | null {
  if (!resultat) return null;
  if (resultat.politi?.type) {
    return resultat.politi.type === "HENLAGT"
      ? (resultat.politi.henleggelsesarsak ?? resultat.politi.begrunnelse ?? null)
      : null;
  }
  const strafferettsligVurdering = resultat.strafferettsligVurdering;
  if (strafferettsligVurdering?.type && strafferettsligVurdering.type !== "ANMELDT") {
    return strafferettsligVurdering.type === "HENLAGT"
      ? (strafferettsligVurdering.henleggelsesarsak ?? null)
      : null;
  }
  const endeligUtfall = resultat.forvaltning?.endeligUtfall ?? resultat.endeligUtfall;
  if (endeligUtfall?.type) {
    return endeligUtfall.type === "HENLAGT" ? (endeligUtfall.henleggelsesarsak ?? null) : null;
  }
  return resultat.utredning?.type === "HENLAGT"
    ? (resultat.utredning.henleggelsesarsak ?? null)
    : null;
}

function formaterHenleggelsesarsak(arsak: string): string {
  return Object.hasOwn(henleggelsesarsakEtiketter, arsak)
    ? henleggelsesarsakEtiketter[arsak as keyof typeof henleggelsesarsakEtiketter]
    : arsak;
}

export type SluttresultatDetalj = { etikett: string; verdi: string };

const strafferabattEtiketter: Record<string, string> = {
  INGEN: "Ingen strafferabatt",
  NAV: "Liggetid hos Nav",
  POLITIET: "Liggetid hos politiet",
  BEGGE: "Liggetid hos begge",
};

export function hentSluttresultatDetaljer(
  resultat: KontrollsakResponse["resultat"],
  ytelser: KontrollsakResponse["ytelser"] = [],
): SluttresultatDetalj[] {
  const dom = resultat?.politi;
  const detaljer: SluttresultatDetalj[] = [];
  const leggTil = (etikett: string, verdi: string) => detaljer.push({ etikett, verdi });

  if (dom && (dom.type === "BOT" || dom.type === "FORELEGG") && dom.belop != null) {
    leggTil("Beløp", `${formaterBelop(dom.belop)} kr`);
  }

  if (dom?.type === "DOMFELLELSE") {
    if (dom.domsdato) leggTil("Domsdato", formaterIsoTilNorskDato(dom.domsdato));

    const ubetingetFengsel = formaterFengselsstraff(
      dom.ubetingetFengselMaaneder,
      dom.ubetingetFengselDager,
    );
    if (ubetingetFengsel) leggTil("Ubetinget fengsel", ubetingetFengsel);

    const betingetFengsel = formaterFengselsstraff(
      dom.betingetFengselMaaneder,
      dom.betingetFengselDager,
    );
    if (betingetFengsel) leggTil("Betinget fengsel", betingetFengsel);

    if (dom.samfunnsstraffTimer != null) {
      leggTil("Samfunnsstraff", `${dom.samfunnsstraffTimer} timer`);
    }
    if (dom.domfeltBelop != null) {
      leggTil("Domfelt beløp", `${formaterBelop(dom.domfeltBelop)} kr`);
    }
    if (dom.bot != null) {
      leggTil("Bot", `${formaterBelop(dom.bot)} kr`);
    }
    if (dom.siviltRettskrav != null) {
      leggTil("Sivilt rettskrav", `${formaterBelop(dom.siviltRettskrav)} kr`);
    }
    if (dom.tilstaaelsesdom != null) {
      leggTil("Tilståelsesdom", dom.tilstaaelsesdom ? "Ja" : "Nei");
    }
    if (dom.medvirker != null) {
      leggTil("Medvirker", dom.medvirker ? "Ja" : "Nei");
    }
    if (dom.emkBrudd != null) {
      leggTil("Brudd på EMK art. 6", dom.emkBrudd ? "Ja" : "Nei");
    }
    if (dom.strafferabattLiggetid) {
      leggTil(
        "Strafferabatt",
        strafferabattEtiketter[dom.strafferabattLiggetid] ?? dom.strafferabattLiggetid,
      );
    }
    if (dom.detaljer?.trim()) leggTil("Detaljer", dom.detaljer.trim());
  }

  const henleggelsesarsak = hentHenleggelsesarsak(resultat);
  if (henleggelsesarsak) {
    leggTil("Årsak", formaterHenleggelsesarsak(henleggelsesarsak));
  }

  const ytelsesSum =
    resultat?.forvaltning &&
    ytelser.length > 0 &&
    ytelser.every((ytelse) => ytelse.endeligBelop != null)
      ? ytelser.reduce((sum, ytelse) => sum + (ytelse.endeligBelop ?? 0), 0)
      : null;
  const tilbakekrevdBelop = resultat?.forvaltning?.tilbakekrevdBelop ?? ytelsesSum;
  if (tilbakekrevdBelop != null) {
    leggTil("Tilbakekrevd beløp", `${formaterBelop(tilbakekrevdBelop)} kr`);
  }

  return detaljer;
}

/**
 * Tekst og farge for status-taggen til en sak. Avsluttede saker viser resultatet i stedet
 * for status, i nøytral farge.
 */
export function hentStatusTag(sak: Pick<KontrollsakResponse, "steg" | "status" | "resultat">): {
  tekst: string;
  farge: StatusFarge;
} {
  if (sak.steg === "AVSLUTTET") {
    return { tekst: hentSluttresultat(sak.resultat) ?? "Ikke registrert", farge: "neutral" };
  }
  return { tekst: formaterStatus(sak.status ?? "AKTIV"), farge: hentStatusFarge(sak.status) };
}

export function formaterKategori(kategori: KontrollsakKategori | null | undefined): string | null {
  if (!kategori) {
    return null;
  }

  return kontrollsakKategoriEtiketter[kategori] ?? kategori;
}

function formaterKilde(kilde: KontrollsakKilde | null | undefined): string {
  if (!kilde) {
    return "Ukjent kilde";
  }

  return kontrollsakKildeEtiketter[kilde] ?? kilde;
}

export function formaterYtelseType(type: string): string {
  return (
    kontrollsakYtelseTypeEtiketter[type as keyof typeof kontrollsakYtelseTypeEtiketter] ?? type
  );
}

function hentYtelseTyper(ytelser: KontrollsakYtelse[]): string[] {
  return ytelser.map((ytelse) => formaterYtelseType(ytelse.type));
}

function formaterPeriode(fra: string | null, til: string | null): string {
  return `${fra ?? "ukjent"} – ${til ?? "ukjent"}`;
}

export function formaterPeriodeForYtelser(ytelser: KontrollsakYtelse[]): string | null {
  if (ytelser.length === 0) {
    return null;
  }

  const perioder = [
    ...new Set(ytelser.map((ytelse) => formaterPeriode(ytelse.periodeFra, ytelse.periodeTil))),
  ];

  return perioder.join(", ");
}

/**
 * Formaterer en ISO-datostreng (YYYY-MM-DD) til norsk kort format (dd.mm.yyyy)
 *
 * @example
 * formaterIsoTilNorskDato("2023-01-05") // "05.01.2023"
 */
export function formaterIsoTilNorskDato(iso: string | undefined | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso ?? "";
  const dag = `${date.getDate()}`.padStart(2, "0");
  const måned = `${date.getMonth() + 1}`.padStart(2, "0");
  const år = date.getFullYear();
  return `${dag}.${måned}.${år}`;
}

/**
 * Formaterer periode for en enkelt ytelse til norsk kort format, med bindestrek
 * som fallback for manglende fra-/til-dato.
 *
 * @example
 * formaterYtelsePeriode("2023-01-05", "2023-06-01") // "05.01.2023 – 01.06.2023"
 * formaterYtelsePeriode("2023-01-05", null) // "05.01.2023 –"
 */
export function formaterYtelsePeriode(
  fra: string | null | undefined,
  til: string | null | undefined,
): string {
  const fraTekst = formaterIsoTilNorskDato(fra);
  const tilTekst = formaterIsoTilNorskDato(til);
  if (fraTekst && tilTekst) return `${fraTekst} – ${tilTekst}`;
  if (fraTekst) return `${fraTekst} –`;
  if (tilTekst) return `– ${tilTekst}`;
  return "–";
}

export function getPersonIdent(sak: KontrollsakResponse): string {
  return sak.personIdent;
}

export function getStegOgStatusTekst(sak: KontrollsakResponse): string {
  if (sak.status) {
    return `${formaterStatus(sak.status)} · ${formaterSteg(sak.steg)}`;
  }

  return formaterSteg(sak.steg);
}

export function getYtelseTyper(sak: KontrollsakResponse): string[] {
  return hentYtelseTyper(sak.ytelser);
}

export function getBeskrivelse(_sak: KontrollsakResponse): string | null {
  return null;
}

export function getKildeText(sak: KontrollsakResponse): string {
  return formaterKilde(sak.kilde);
}

export function getKontaktinformasjon(_sak: KontrollsakResponse) {
  return null;
}

export function formaterBelop(belop: number): string {
  return new Intl.NumberFormat("nb-NO").format(belop);
}

export function formaterMisbrukstype(misbrukstype: KontrollsakMisbrukstype): string {
  return kontrollsakMisbrukstypeEtiketter[misbrukstype] ?? misbrukstype;
}
