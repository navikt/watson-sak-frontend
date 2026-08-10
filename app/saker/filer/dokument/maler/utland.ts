import type { DokumentInnhold } from "~/saker/filer/typer";
import {
  celle,
  h1,
  h2,
  h3,
  mal,
  metadataTabell,
  p,
  pMedVariabler,
  rad,
  tabell,
  topptekst,
  ul,
  variabel,
} from "./node-builders";

export function utlandRapportmal({ erStraffesak }: { erStraffesak: boolean }): DokumentInnhold {
  return mal([
    p("Kontrollrapport"),
    p("Unntatt offentlighet"),
    p("jf. Lov om off. § 13, jf. Nav-loven § 7"),
    metadataTabell(),

    h1("Rapport om [stønad]"),
    p("Vi har kontrollert perioden fra [dato] til [dato]."),
    erStraffesak
      ? p(
          "Kontrollen viser at [stønadsmottaker] har oppholdt seg i utlandet i flere perioder / deler av perioden.",
        )
      : p(
          "Kontrollen viser at det er mest sannsynlig at [stønadsmottaker] har oppholdt seg i utlandet i flere perioder / deler av perioden.",
        ),
    p(
      "Vi ber dere vurdere [å stanse utbetalingen av [stønad]] og om [stønadsmottaker] skal betale tilbake:",
    ),
    tabell(
      rad(topptekst("Stønad"), topptekst("Fra"), topptekst("Til"), topptekst("Land/Årsak")),
      rad(celle("[Stønad]"), celle(""), celle(""), celle("")),
    ),

    h1("Bakgrunn for kontrollen"),
    p(
      "Alt. 1: Nav kontroll fikk [dato] et anonymt tips / opplysninger fra [kilde] om at [gjengi opplysninger fra tips]. Se vedlegg [navn på vedlegg].",
    ),
    p("Alt. 2: Vi tok saken opp til kontroll [dato] basert på opplysninger fra valutaregisteret."),
    p(
      "På bakgrunn av tipset / kontrollen har vi gjennomgått fagsystemene, gjort søk i valutaregister og innhentet opplysninger fra [bank, trygdemyndigheter i utlandet, mv.].",
    ),
    p("[hvis aktuelt]"),
    p(
      "Vi har også innhentet opplysninger fra [eksempler: bank, Skatteetaten, arbeidsgiver, regnskapsfører, oppdragsgiver, tredjeperson].",
    ),
    p("Opplysningene er innhentet etter at vi har gjort konkrete vurderinger av nødvendighet."),

    h1("Regelverk"),
    p(
      "[Ta med de materielle bestemmelsene som vurderingene i kontrollrapporten viser til. Folketrygdloven, ev. rundskriv, barnetrygdloven mv.]",
    ),

    h1("Opplysninger i saken"),
    h2("Opplysninger fra Navs fagsystemer"),
    h3("Personopplysninger"),
    p(
      "[Skriv kort om statsborgerskap, adressehistorikk, ev. familie og hvor mange er registrert bosatt på enheten]",
    ),
    p(
      "[stønadsmottaker] er registrert med følgende bostedsadresse(r) i perioden vi har kontrollert:",
    ),
    ul(["[adresse]"]),
    h3("Språk"),
    p("[skriv kort om språk om det er relevant for saken]"),
    h3("Arbeidsforhold"),
    p("[skriv kort om arbeidsforhold om det er relevant for saken]"),
    h3("Stønadshistorikk"),
    p(
      "For fullstendige opplysninger om stønadsforholdene viser vi til fagsystemene. I denne rapporten nevner vi følgende:",
    ),
    p(
      "[Her kan vi presentere opplysningene kronologisk eller per stønad, og enten som prosatekst eller kulepunkter. Fullstendige opplysninger om stønaden/ene er i fagsystemene.]",
    ),
    p(
      "[eksempel: [stønadsmottaker] søkte om dagpenger [dato]. Nav innvilget [dagpengene/arbeidsavklaringspenger] fra [dato] og inntil 104 uker. Nav stanset [dagpengene] [dato] fordi […]]",
    ),
    p(
      "AAP: [stønadsmottaker] har fått informasjon på nav.no, i søknadsdialogen, i vedtak [dato] og vedlegg til vedtak, om at h*n må",
    ),
    ul([
      "søke om å beholde arbeidsavklaringspenger i utlandet før h*n reiser til land utenfor EU/EØS",
      "melde fra til Nav om h*n skal reise eller flytte til utlandet",
    ]),
    p(
      "DP: [stønadsmottaker] har fått informasjon på nav.no, i søknadsdialogen, i vedtak [dato] og vedlegg til vedtak, om at h*n",
    ),
    ul([
      "ikke har krav på dagpenger ved utlandsopphold",
      "må melde fra til Nav om h*n skal reise eller flytte til utlandet",
    ]),
    h3("Aktivitetsplan og annen dialog med [stønadsmottaker]"),
    p("Vi har ikke funnet opplysninger om utenlandsopphold i aktivitetsplaner eller dialog."),
    p("[stønadsmottaker] hadde avtaler med Nav / lege eller tiltak på følgende datoer:"),
    tabell(
      rad(topptekst("Dato"), topptekst("Fysiske-, digitale- eller telefonmøter med merknader")),
      rad(celle(""), celle("")),
    ),
    p(
      "DP/ferie før 2023: [stønadsmottaker] er på DittNav [dato] informert om at h*n kan ta ferie i inntil fire uker og samtidig motta dagpenger.",
    ),
    h3("Meldekort"),
    p(
      "[stønadsmottaker] må sende meldekort hver fjortende dag, og bekrefte å ha lest og forstått veiledningstekstene. Disse viser […]",
    ),
    p("Alt 1: [stønadsmottaker] har ikke meldt ferie/fravær, sykdom eller arbeid på meldekort."),
    p("Alt 2: [stønadsmottaker] har meldt ferie/fravær, sykdom og arbeid [nevn perioder]."),
    p("[ev. tabell med oversikt over arbeidstimer, sykdom. Husk endringer under korona]"),
    h3("Relevante opplysninger i [ektefellens / barnets / e.l.] sak"),
    p("[skriv kort om hvem, hvor og hvilken sak]"),

    h2("Opplysninger fra valutaregisteret"),
    p(
      "Vi har gjort søk i valutaregisteret for perioden [dato – dato]. [skriv kort om hva dette inneholder]",
    ),
    p(
      "Valutaregisteret skiller ikke fysiske varekjøp fra netthandel. Disse transaksjonene er oppført som KNMK på vedlagte oversikt.",
    ),
    p(
      "Vi legger til grunn at transaksjoner fra [land] er netthandel. [Begrunn ev. ytterligere] Disse transaksjonene er ikke relevante for saken.",
    ),
    p("Vi viser til vedlagte utskrift (valutaregisteret)."),

    h2("Opplysninger fra bank"),
    p("For perioden [dato–dato] har vi innhentet opplysninger fra følgende banker:"),
    p("[bank og ev. kontonummer]"),
    p(
      "[stønadsmottaker] er kontoeier og eneste disponent på konto. / I tillegg til [stønadsmottaker] er [person] disponent på kontoen.",
    ),
    p(
      "[Få med om det er utstedt flere bankkort til kontoen/kontiene til stønadsmottaker og ev. kortnummer samt hvilken konto som er tilknyttet.]",
    ),
    p(
      "Vi har laget en oversikt over når det er gjort uttak og varekjøp i Norge og i utlandet. Oversikten viser at [hovedtrekk].",
    ),
    p("Se vedlagte «Uttak og varekjøp» og «Brev til bank»."),
    p("Ta kontakt hvis dere har behov for kontoopplysninger."),

    h2("Opplysninger fra trygdemyndighetene i [land]"),
    p(
      "Vi har innhentet opplysninger fra [navn på trygdemyndigheter]. Disse viser at [fritekst/kulepunkter]",
    ),

    h2("Opplysninger fra [andre kilder]"),
    p(
      "[for eksempel barns skolegang, arbeidsgiver, Helfo, Grensekontroll, sosiale medier, internett m.m.]",
    ),

    h2("Kontakt med stønadsmottakeren"),
    p(
      "Alt 1: Vi informerte [stønadsmottaker] [dato] om at vi har innhentet opplysninger fra finansinstitusjon. Ut over denne henvendelsen har vi ikke vært i kontakt med [stønadsmottaker].",
    ),
    p(
      "Alt 2: Vi tok kontakt med [stønadsmottaker] [type kontakt og dato]. I samtalen / brevet opplyste [stønadsmottaker] [skriv kort om innholdet].",
    ),
    p(
      "Alt 3: Vi har ikke vært i kontakt med [stønadsmottaker] i forbindelse med utredningen av saken.",
    ),
    p("Se vedlagte samtalereferat eller skriv fra stønadsmottakeren."),

    h1("Vurderingen vår"),
    p(
      erStraffesak
        ? "Nav kontroll mener at [stønadsmottaker] har fått [stønad] h*n ikke har hatt krav på. Kontrollen viser at [stønadsmottaker] har oppholdt seg i utlandet i periodene:"
        : "Nav kontroll mener at [stønadsmottaker] har fått [stønad] h*n ikke har hatt krav på. Kontrollen viser at det er mest sannsynlig at [stønadsmottaker] har oppholdt seg i utlandet i periodene:",
    ),
    tabell(
      rad(topptekst("Perioder"), topptekst("Begrunnelser / merknader / land")),
      rad(celle(""), celle("")),
    ),
    p("Vi har lagt vekt på [opplysninger som ikke kommer frem av tabellen]."),
    p(
      "[Husk også å ta med ev. momenter som kan tilsi at stønadsmottaker har oppholdt seg i Norge.]",
    ),
    p("Vi mener dere bør vurdere å opphøre medlemskapet fra [dato] fordi"),
    p("[kort begrunnelse/kulepunkter]."),
    p("[Ev. lovvalgsvurdering]"),
    p(
      "[stønadsmottaker] har fått informasjon om at h*n har plikt til å gi riktige opplysninger til Nav, og har fått den informasjonen h*n trenger for å gi riktige opplysninger.",
    ),
    p(
      "Vi ber Nav arbeid og ytelser / Nav familie- og pensjonsytelser vurdere å stanse og kreve tilbake [stønad] i periodene i tabellen over.",
    ),

    h1("Foreldelse"),
    p(
      "Hele / deler av tilbakebetalingskravet vil være foreldet/står i fare for å bli foreldet etter den alminnelige foreldelsesfristen på tre år, jf. foreldelsesloven § 2.",
    ),
    p("[hvis aktuelt]"),
    p(
      "Nav kontroll mener at tilleggsfristen i foreldelsesloven § 10 nr. 1 kan komme til anvendelse, og ber om at Nav arbeid og ytelser / Nav familie- og pensjonsytelser vurderer dette.",
    ),
    p(
      "Fristavbrytende handling må i så fall gjøres innen [dato – ett år regnet fra dagen før datoen for når Nav fikk eller burde skaffet seg kunnskap om kravet]. Er det behov for ytterligere opplysninger for å vurdere tilleggsfristen ta kontakt med Nav kontroll.",
    ),

    h1("Vi ønsker tilbakemelding"),
    ...(erStraffesak
      ? [
          p(
            "Når saken er ferdig behandlet, og klagefristen er utløpt, må dere sende saken tilbake til Nav Kontroll [enhet]. Vi vil da vurdere om saken skal anmeldes til politiet.",
          ),
        ]
      : [
          p(
            "Vi ønsker tilbakemelding om resultatet i saken når den er ferdig behandlet, og klagefrist er utløpt.",
          ),
          p(
            "Dere må vurdere å sende over saken til Nav kontroll [enhet] for vurdering av anmeldelse til politiet hvis det kommer nye opplysninger av betydning i saken. Se nærmere forklaringer i rutine på Navet for saker til strafferettslig vurdering: Retningslinjer for saker til strafferettslig vurdering",
          ),
        ]),
    p("Vi bistår gjerne hvis dere har spørsmål i saken."),
    pMedVariabler("Kontaktperson: ", variabel("saksbehandler")),
    p("Vennlig hilsen"),
    pMedVariabler("Nav kontroll ", variabel("avdeling")),
    pMedVariabler(variabel("saksbehandler")),
    p("fagansvarlig rådgiver"),

    h1("Vedlegg"),
    tabell(
      rad(topptekst("Nr."), topptekst("Vedlegg")),
      rad(celle("1."), celle("Dokumentbeskrivelse")),
      rad(celle("2."), celle("Utskrift fra valutaregisteret")),
      rad(
        celle("3."),
        celle("Brev til bank (ev. banker) og svarbrevets (ev. svarbrevenes) førsteside"),
      ),
      rad(celle("4."), celle("Uttak og varekjøp")),
      rad(celle("5."), celle("Opplysning til folkeregisteret om bosetting i utlandet")),
    ),
    p("Vedleggene er sendt til skanning på tema Kontroll i Gosys [dato]."),
    p("[hvis aktuelt]"),
    p(
      "Kontoopplysninger [vurdere å spesifisere hvilke konti] er lagt på filutveksling til [enhet].",
    ),
  ]);
}
