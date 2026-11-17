import type { DokumentInnhold } from "~/saker/filer/typer";
import { brevTilBrukerHeader, h1, h2, mal, p, signatur } from "./node-builders";

type Node = ReturnType<typeof p>;

function personvernOgInnsyn(): Node[] {
  return [
    h2("Du har rettigheter knyttet til personopplysningene dine"),
    p(
      "Du finner informasjon om hvordan Nav behandler personopplysningene dine, og hvilke rettigheter du har, på nav.no/personvernerklaering.",
    ),
    p("Nav kan veilede deg på telefon 55 55 33 33 om hvordan Nav behandler personopplysninger."),

    h2("Du har rett til innsyn i saken din"),
    p(
      "Du har rett til å se dokumentene i saken din. Dette følger av forvaltningsloven § 18. Kontakt oss om du vil se dokumentene i saken din. Ta kontakt på nav.no/kontakt eller på telefon 55 55 33 33. Du kan lese mer om innsynsretten på nav.no/personvernerklaering.",
    ),
  ];
}

function harDuSpørsmål(): Node[] {
  return [
    h2("Har du spørsmål?"),
    p("Du finner mer informasjon på nav.no."),
    p("På nav.no/kontakt kan du chatte eller skrive til oss."),
    p(
      "Hvis du ikke finner svar på nav.no, kan du ringe oss på telefon 55 55 33 33, hverdager 09.00–15.00.",
    ),
  ];
}

function harDuSpørsmålStraffesak(): Node[] {
  return [
    h2("Har du spørsmål?"),
    p(
      "Har du spørsmål til Nav, kan du chatte eller skrive til oss på nav.no/kontakt eller ringe oss på telefon 55 55 33 33 hverdager 09.00–15.00.",
    ),
  ];
}

function slikBehandlerNavOpplysningene(kilde: string): Node[] {
  return [
    p(
      "Hvis opplysningene gir grunnlag for å vurdere retten din til [stønad] på nytt, vil du få et forhåndsvarsel fra Nav. Du vil få anledning til å uttale deg.",
    ),
    p(
      `${kilde} som Nav kontroll innhenter, blir arkivert i saken. Nav har arkiveringsplikt etter arkivloven og kan senere bruke opplysningene for å kontrollere om stønaden din er gitt på riktig grunnlag. Nav kan også innhente flere opplysninger ved behov.`,
    ),
    p("Nav kan dele opplysningene med andre offentlige myndigheter der vi har lovhjemmel for det."),
  ];
}

/** Orienterer bruker om at Nav kontroll innhenter kontoopplysninger fra bank, jf. ftrl. § 21-4. */
export function orienteringInnhentingKontoMal(): DokumentInnhold {
  return mal([
    brevTilBrukerHeader(),
    h1("Nav kontroll innhenter opplysninger fra finansinstitusjon"),
    p(
      "Du har søkt om / fått / får utbetalt [stønad] fra [dato] til [dato]. Vi innhenter kontoopplysningene dine fra [bank]. Opplysningene vi har bedt om, gjelder [kontotype og informasjonstype] for perioden [dato – dato].",
    ),
    p("Navs rett til å innhente opplysninger kommer frem av folketrygdloven § 21-4."),

    h2("Hvorfor innhenter vi kontoopplysninger?"),
    p("Nav kontroll undersøker om utbetalinger til deg fra Nav er korrekte."),
    p(
      "Vi innhenter informasjon fra kontoen din / kontoene dine for å undersøke om opplysningene er forenlige med å motta [stønad] fra Nav. Du kan lese mer om vilkårene for rett til [stønad] på nav.no.",
    ),
    p("[Kopier inn lenke til aktuell stønadsside fra nav.no.]"),

    h2("Slik behandler Nav kontoopplysninger"),
    slikBehandlerNavOpplysningene("Kontoopplysningene"),

    personvernOgInnsyn(),
    harDuSpørsmål(),
    signatur(),
  ]);
}

/** Orienterer bruker om at Nav kontroll har gjort oppslag i Valutaregisteret, jf. ftrl. § 21-4. */
export function orienteringInnhentingValutaregisterMal(): DokumentInnhold {
  return mal([
    brevTilBrukerHeader(),
    h1("Nav kontroll innhenter opplysninger fra Valutaregisteret"),
    p(
      "Du har søkt om / fått / får utbetalt [stønad] fra [dato] til [dato]. Vi har gjort oppslag på deg i Valutaregisteret for perioden [dato – dato].",
    ),
    p("Navs rett til å innhente opplysninger kommer frem av folketrygdloven § 21-4."),

    h2("Hvorfor innhenter vi opplysninger fra Valutaregisteret?"),
    p("Nav kontroll undersøker om utbetalinger til deg fra Nav er korrekte."),
    p(
      "Vi innhenter informasjon fra Valutaregisteret for å undersøke om opplysningene er forenlige med å motta [stønad] fra Nav. Du kan lese mer om vilkårene for rett til [stønad] på nav.no.",
    ),
    p("[Kopier inn lenke til aktuell stønadsside fra nav.no.]"),

    h2("Slik behandler Nav opplysningene"),
    slikBehandlerNavOpplysningene("Opplysningene fra Valutaregisteret"),

    personvernOgInnsyn(),
    harDuSpørsmål(),
    signatur(),
  ]);
}

/** Orienterer bruker om at undersøkelsen etter innhenting av kontoopplysninger er avsluttet. */
export function orienteringAvsluttetInnhentingKontoMal(): DokumentInnhold {
  return mal([
    brevTilBrukerHeader(),
    h1("Informasjon om avsluttet undersøkelse"),
    p("Nav kontroll viser til orienteringen [dato] om innhenting av opplysninger fra [bank]."),
    p(
      "Nav kontroll har avsluttet undersøkelsen. Opplysningene vi har innhentet, er arkivert i saken din. Nav har arkiveringsplikt etter arkivloven og kan senere bruke opplysningene for å kontrollere om stønaden din er gitt på riktig grunnlag.",
    ),
    p(
      "Vi minner om at dersom det skjer endringer som kan være av betydning for retten din til stønaden, må du melde fra til Nav.",
    ),

    personvernOgInnsyn(),
    harDuSpørsmål(),
    signatur(),
  ]);
}

/** Orienterer bruker om at Nav kontroll har anmeldt forholdet til politiet. */
export function orienteringAnmeldelseMal(): DokumentInnhold {
  return mal([
    brevTilBrukerHeader(),
    h1("Informasjon om anmeldelse"),
    p(
      "Nav arbeid og ytelser / Nav familie- og pensjonsytelser gjorde [dato] vedtak om at du skal betale tilbake [stønad] som du ikke hadde rett til. I vedtaket står det at Nav kontroll skal vurdere om vi skal anmelde saken til politiet.",
    ),
    p(
      "Vi mener at du kan ha begått en straffbar handling, og vi har derfor anmeldt deg til [sted] politidistrikt for bedrageri av [beløp] kroner.",
    ),
    p(
      "Politiet vil avgjøre om dette er en straffesak eller ikke, og du vil bli kontaktet av politiet når de begynner å behandle saken din.",
    ),

    h2("Har du spørsmål?"),
    p("Har du spørsmål til straffesaken, må du kontakte politiet."),
    p(
      "Har du andre spørsmål til Nav, kan du chatte eller skrive til oss på nav.no/kontakt eller ringe oss på telefon 55 55 33 33 hverdager 09.00–15.00.",
    ),
    signatur(),
  ]);
}

/** Orienterer bruker om at Nav kontroll ikke anmelder forholdet til politiet. */
export function orienteringHenleggelseMal(): DokumentInnhold {
  return mal([
    brevTilBrukerHeader(),
    h1("Vi anmelder ikke saken din"),
    p(
      "Nav arbeid og ytelser / Nav familie- og pensjonsytelser gjorde [dato] vedtak om at du skal betale tilbake [stønad] som du ikke hadde rett til. I vedtaket står det at Nav kontroll skal vurdere om vi skal anmelde saken til politiet.",
    ),
    p(
      "Vi har kommet frem til at vi ikke anmelder deg til politiet. Du må likevel betale tilbake det feilutbetalte beløpet.",
    ),
    p("[Hvis aktuelt:]"),
    p("Denne avgjørelsen har ingen innvirkning på saken som er til behandling i Trygderetten."),
    p("[Hvis aktuelt:]"),
    p(
      "Nav arbeid og ytelser [enhet] vil vurdere om du blir utestengt fra retten til dagpenger etter folketrygdloven § 4-28. Hvis du blir utestengt, vil du få et vedtak om dette.",
    ),

    harDuSpørsmålStraffesak(),
    signatur(),
  ]);
}
