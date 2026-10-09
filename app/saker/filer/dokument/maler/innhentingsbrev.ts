import type { DokumentInnhold } from "~/saker/filer/typer";
import {
  celle,
  dokumentHeader,
  h1,
  h2,
  h3,
  mal,
  p,
  pMedVariabler,
  rad,
  tabell,
  ul,
  variabel,
} from "./node-builders";

/** Brev til arbeidsgiver med pålegg om å sende opplysninger, jf. folketrygdloven § 21-4. */
export function innhentingsbrevmal(): DokumentInnhold {
  return mal([
    dokumentHeader("Innhentingsbrev"),
    tabell(
      rad(celle("Til:"), celle("[arbeidsgiver]")),
      rad(celle("Deres ref.:"), celle("")),
      rad(celle("Vår ref.:"), celle(pMedVariabler(variabel("saksnummer")))),
      rad(celle("Vår dato:"), celle(pMedVariabler(variabel("dagens-dato")))),
    ),

    h1("Dere må sende oss opplysninger"),
    pMedVariabler("Gjelder: ", variabel("navn"), ", ", variabel("fødselsnummer")),
    p("Vi kontrollerer retten til stønader og utbetalinger fra Nav."),
    pMedVariabler(
      "Alt 1: ",
      variabel("navn"),
      " er registrert i Arbeidsgiver- og arbeidstakerregisteret som ansatt hos dere fra [dato] til [dato].",
    ),
    pMedVariabler(
      "Alt 2: Vi har opplysninger om at dere har utbetalt lønn til / innrapportert lønn på ",
      variabel("navn"),
      " i perioden [dato – dato].",
    ),
    pMedVariabler(
      "Alt 3: Vi har opplysninger om at ",
      variabel("navn"),
      " arbeider / har arbeidet hos dere i perioden [dato – dato].",
    ),

    h2("Dette må dere sende oss"),
    p("Vi ber om følgende opplysninger for perioden [dato – dato]:"),
    ul([
      "start- og eventuell sluttdato for ansettelsen",
      "arbeidsavtaler",
      "oversikt over faste stillingsprosenter i perioden",
      "timelister ved timelønn, eventuelt annen dokumentasjon som viser hvor mange timer han eller hun har jobbet hver uke eller dag",
      "lønnsslipper",
      "oversikt over feriedager og annet fravær – lønnede fraværsdager må spesifiseres",
      "oversikt over sykedager – lønnede sykedager må spesifiseres",
    ]),
    p(
      "[Legg til kulepunkter som gjelder spesielle yrkesgrupper, for eksempel taxi, offshore, lærere eller permitterte.]",
    ),
    p("Oppgi navn og telefonnummer til en kontaktperson i virksomheten når dere svarer."),
    p("Dere må sende oss opplysningene innen [dato]."),

    h2("Slik sender dere opplysningene"),
    p("Send dokumentasjonen til:"),
    pMedVariabler("Nav kontroll ", variabel("avdeling")),
    p("[postboks]"),
    p("[postnummer og sted]"),

    h2("Vi har rett til å hente inn opplysningene"),
    p(
      "Vi har rett til å hente inn disse opplysningene etter folketrygdloven § 21-4. Dette gjelder selv om opplysningene er taushetsbelagte.",
    ),

    h2("Dere har rett til å klage"),
    p(
      "Hvis dere mener at dere ikke har plikt til å gi oss opplysningene, kan dere klage innen tre dager fra dere fikk dette brevet. Dette følger av forvaltningsloven § 14.",
    ),

    h2("Har dere spørsmål?"),
    pMedVariabler(
      "Hvis dere har spørsmål eller noe er uklart, ta kontakt med ",
      variabel("saksbehandler"),
      " på telefon [telefonnummer].",
    ),
    p("Vennlig hilsen"),
    pMedVariabler("Nav kontroll ", variabel("avdeling")),
    pMedVariabler(variabel("saksbehandler")),

    h1("Vedlegg: Lovtekster"),
    p("Informasjon om Navs rett til å hente inn opplysninger og deres klagerett."),
    h3("Folketrygdloven § 21-4 første, tredje og sjette ledd"),
    p(
      "Arbeids- og velferdsetaten, Helsedirektoratet eller det organ Helsedirektoratet bestemmer har rett til å innhente de opplysninger som er nødvendige for å kontrollere om vilkårene for en ytelse er oppfylt, vil kunne være oppfylt eller har vært oppfylt i tilbakelagte perioder, eller for å kontrollere utbetalinger etter en direkte oppgjørsordning. Opplysninger kan innhentes fra helsepersonell, andre som yter tjenester forutsatt at de gjør det for trygdens regning, arbeidsgiver, tidligere arbeidsgiver, tilbyder av posttjenester, utdanningsinstitusjon, barnetilsynsordning, offentlig virksomhet, Folkeregisteret, pensjonsinnretning, forsikringsselskap og annen finansinstitusjon og regnskapsfører. Adgangen til å innhente opplysninger etter første og andre punktum omfatter også opplysninger om andre enn stønadstakeren. Arbeids- og velferdsetaten har også rett til å innhente opplysninger fra arbeidsgiver og tidligere arbeidsgiver i forbindelse med utredning og produksjon av statistikk på de områdene etaten administrerer. Den som blir pålagt å gi opplysninger, plikter å gjøre dette uten godtgjørelse.",
    ),
    p("Ved innhenting av opplysninger mv. etter første og andre ledd gjelder reglene i § 21-4 c."),
    p(
      "De som blir pålagt å gi opplysninger, erklæringer og uttalelser, plikter å gjøre dette uten hinder av taushetsplikt.",
    ),
    h3("Folketrygdloven § 21-4 c femte og sjette ledd"),
    p(
      "Reglene om bevisfritak i tvisteloven §§ 22-8 og 22-9 gjelder tilsvarende ved anvendelsen av bestemmelsene i § 21-4 og § 21-4 a første ledd.",
    ),
    p(
      "Opplysninger, uttalelser og erklæringer etter § 21-4 og § 21-4 a første ledd skal gis uten ugrunnet opphold.",
    ),
    h3("Forvaltningsloven § 14 (Saksforberedelse og klage ved pålegg om å gi opplysninger)"),
    p(
      "Blir noen pålagt å gi opplysninger, skal heimelen for pålegget angis. Vedkommende har rett til å klage over pålegget dersom han mener at han ikke har plikt eller lovlig adgang til å gi opplysningene. Han skal gjøres oppmerksom på klageadgangen i forbindelse med pålegget. Klage, som kan være muntlig, må framsettes straks når den pålegget angår er til stede, og ellers innen 3 dager. Dersom vedkommende forvaltningsorgan finner det påtrengende nødvendig for å gjennomføre sine oppgaver etter loven, kan det kreve at opplysningene blir gitt før klagesaken er avgjort.",
    ),
  ]);
}
