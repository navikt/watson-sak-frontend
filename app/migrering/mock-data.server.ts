import type { MigreringKandidat } from "./types";

// Kun syntetiske visningseksempler uten FNR. Vurderingene er illustrasjoner,
// ikke automatisk klassifisering av ekte Access-data eller godkjente regler.
function utredningsfelter(
  utredres: string | null,
  fvres: string | null = null,
  ferdigdato = false,
): MigreringKandidat["kildefelter"] {
  return [
    { felt: "TIPSAVKL", verdi: "Utredes" },
    { felt: "UTREDRES", verdi: utredres },
    { felt: "FVRES", verdi: fvres },
    { felt: "FVDATO", verdi: fvres ? "Satt (eksempel)" : null },
    { felt: "FERDIGDATO", verdi: ferdigdato ? "Satt (eksempel)" : null },
  ];
}

function svFelter(
  svres: string | null,
  poldomres: string | null = null,
  avgjortdato = false,
): MigreringKandidat["kildefelter"] {
  return [
    { felt: "SVRES", verdi: svres },
    { felt: "SVDATO", verdi: svres ? "Satt (eksempel)" : null },
    { felt: "POLDOMRES", verdi: poldomres },
    { felt: "POLDOMDATO", verdi: poldomres ? "Satt (eksempel)" : null },
    { felt: "POLDOMAVGJORTDATO", verdi: avgjortdato ? "Satt (eksempel)" : null },
  ];
}

export function hentMockMigreringKandidater(navIdent: string): MigreringKandidat[] {
  return [
    {
      kilde: "UTREDNING",
      pid: "100245",
      navn: "Ada Eksempel",
      ansvar: { type: "BEKREFTET", navIdent },
      vurdering: "MULIG_KANDIDAT",
      fase: "Utredning uten resultat",
      begrunnelse:
        "Utredes uten utredningsresultat, forvaltningsresultat eller ferdigdato. Illustrerer utvalget på 580 rader, ikke et endelig migreringsvedtak.",
      kildefelter: utredningsfelter(null),
    },
    {
      kilde: "UTREDNING",
      pid: "100310",
      navn: "Bente Eksempel",
      ansvar: { type: "BEKREFTET", navIdent },
      vurdering: "MA_AVKLARES",
      fase: "Ferdigdato uten resultat",
      begrunnelse:
        "Utredningsresultatet mangler, men ferdigdato er satt. Illustrerer de fire avvikene; datoen alene avgjør ikke status.",
      kildefelter: utredningsfelter(null, null, true),
    },
    {
      kilde: "UTREDNING",
      pid: "100388",
      navn: "Carl Eksempel",
      ansvar: { type: "BEKREFTET", navIdent },
      vurdering: "MULIG_KANDIDAT",
      fase: "Mulig venting på forvaltning",
      begrunnelse:
        "REV. STRAFFESAK uten forvaltningsresultat, forvaltningsdato og ferdigdato. Kan være venting eller manglende oppdatering; må bekreftes.",
      kildefelter: utredningsfelter("REV. STRAFFESAK"),
    },
    {
      kilde: "UTREDNING",
      pid: "100412",
      navn: "Dag Eksempel",
      ansvar: { type: "BEKREFTET", navIdent },
      vurdering: "MA_AVKLARES",
      fase: "Forvaltningsresultat registrert",
      begrunnelse:
        "REV-koden står sammen med et forvaltningsresultat. Ikke automatisk ventende eller avsluttet; avklar eventuell videre SV-oppfølging.",
      kildefelter: utredningsfelter("REV. STRAFFESAK", "Feilutbetalingssak"),
    },
    {
      // Samme PID som utredningseksemplet, men en separat kildepost.
      kilde: "SV",
      pid: "100245",
      navn: "Ester Eksempel",
      ansvar: { type: "BEKREFTET", navIdent },
      vurdering: "MULIG_KANDIDAT",
      fase: "SV uten resultat",
      begrunnelse:
        "SV-resultat og alle undersøkte datoer mangler. Kildeposten holdes adskilt fra utredning, også ved lik PID.",
      kildefelter: svFelter(null),
    },
    {
      kilde: "SV",
      pid: "100501",
      navn: "Fie Eksempel",
      ansvar: { type: "UKJENT" },
      vurdering: "MULIG_KANDIDAT",
      fase: "Anmeldt uten politiresultat",
      begrunnelse:
        "Anmeldt med SV-dato, men uten politiresultat eller politidatoer. Avklar både videre oppfølging og ansvar før migrering.",
      kildefelter: svFelter("Anmeldt"),
    },
    {
      kilde: "SV",
      pid: "100634",
      navn: "Geir Eksempel",
      ansvar: { type: "UKJENT" },
      vurdering: "MA_AVKLARES",
      fase: "Stilt i bero med avgjørelsesdato",
      begrunnelse:
        "Politiresultatet er Stilt i bero selv om avgjørelsesdato er satt. Utfylt resultat/dato er ikke tilstrekkelig til å avslutte saken.",
      kildefelter: svFelter("Anmeldt", "Stilt i bero", true),
    },
    {
      kilde: "UTREDNING",
      pid: "100722",
      navn: "Hilde Eksempel",
      ansvar: { type: "UKJENT" },
      vurdering: "MULIG_KANDIDAT",
      fase: "Mulig venting på forvaltning",
      begrunnelse:
        "REV. IKKE STRAFFESAK uten forvaltningsresultat eller datoer. Manglende registrering betyr ikke nødvendigvis at saken fortsatt venter.",
      kildefelter: utredningsfelter("REV. IKKE STRAFFESAK"),
    },
    {
      kilde: "UTREDNING",
      pid: "100799",
      navn: "Inga Eksempel",
      ansvar: { type: "LOGGTREFF", navIdent },
      vurdering: "MA_AVKLARES",
      fase: "Ansvar ikke bekreftet",
      begrunnelse:
        "Det finnes et søkeloggtreff for innlogget bruker, men søkeaktivitet er ikke eierskap. Eksemplet vises derfor ikke under Mine saker.",
      kildefelter: utredningsfelter("REV. IKKE STRAFFESAK"),
    },
  ];
}
