import type { DokumentInnhold } from "~/saker/filer/typer";
import {
  celle,
  h1,
  h2,
  h3,
  mal,
  metadataTabell,
  p,
  rad,
  stønadSammendragTabell,
  tabell,
  topptekst,
  ul,
} from "./node-builders";

export function ensligForsørgerRapportmal({
  erStraffesak,
}: {
  erStraffesak: boolean;
}): DokumentInnhold {
  return mal([
    p("Kontrollrapport"),
    p("Unntatt offentlighet"),
    p("jf. Lov om off. § 13, jf. NAV-loven § 7"),
    metadataTabell(),

    h1("Rapport om stønad som enslig mor eller far"),
    p("Vi har kontrollert perioden fra [dato] til [dato]."),
    erStraffesak
      ? p(
          "Kontrollen viser at [stønadsmottaker] har levd/bodd sammen med [navn], i et ekteskapslignende forhold i en felles husholdning, og ikke har hatt krav på [stønad].",
        )
      : p(
          "Kontrollen viser at det er mest sannsynlig at [stønadsmottaker] har levd/bodd sammen med [navn], i et ekteskapslignende forhold i en felles husholdning, og ikke har hatt krav på [stønad].",
        ),
    p(
      "Vi ber dere vurdere å stanse utbetalingen av [stønad] og om [stønadsmottaker] skal betale tilbake:",
    ),
    stønadSammendragTabell(),

    h1("Bakgrunn for kontrollen"),
    p(
      "Nav kontroll fikk [dato] et anonymt tips / opplysninger fra [kilde] om at [gjengi opplysninger fra tips]. Se vedlegg [navn på vedlegg].",
    ),
    p(
      "På bakgrunn av tipset / kontrollen har vi gjennomgått fagsystemene og innhentet opplysninger fra [bank, posten, barnevernet, utleier, mv.].",
    ),
    p(
      "Vi har også innhentet opplysninger fra [eksempler: bank, Skatteetaten, arbeidsgiver, regnskapsfører, oppdragsgiver, tredjeperson]. [hvis aktuelt]",
    ),
    p("Opplysningene er innhentet etter at vi har gjort konkrete vurderinger av nødvendighet."),

    h1("Regelverk"),
    p(
      "[Ta med de materielle bestemmelsene som vurderingene i kontrollrapporten viser til. Folketrygdlovens, barnetrygdlovens, og/eller kontantstøtteloven bestemmelser om enslig forsørger.]",
    ),

    h1("Opplysninger i saken"),
    h2("Opplysninger fra Navs fagsystemer"),
    h3("Familieforhold"),
    p("[hvis aktuelt]"),
    h3("Adressehistorikk"),
    p(
      "[stønadsmottaker] er registrert med følgende bostedsadresse(r) i perioden vi har kontrollert:",
    ),
    ul(["[adresse]"]),
    h3("Stønadshistorikk"),
    p(
      "[Her kan vi presentere opplysningene kronologisk eller per stønad, og enten som prosatekst eller kulepunkter. Fullstendige opplysninger om stønaden/ene er i fagsystemene.]",
    ),
    p(
      "[eksempel overgangsstønad: [navn] søkte om overgangsstønad [dato]. NAV innvilget [dato] overgangsstønad fra [dato]. NAV opphørte stønaden [dato] fordi [grunn].]",
    ),
    p("[navn] har fått informasjon i søknaden, i vedtaket og i vedlegg til vedtaket, om at h*n"),
    ul(["ikke kan være samboer", "må melde fra til NAV dersom h*n inngår samboerskap."]),
    p(
      "[eksempel utvidet barnetrygd: [navn] søkte om utvidet barnetrygd [dato]. NAV innvilget [dato] utvidet barnetrygd fra [dato].]",
    ),
    p("[navn] har fått informasjon i søknaden, i vedtaket og i vedlegg til vedtaket, om at h*n"),
    ul([
      "må melde fra til NAV dersom h*n flytter sammen med den andre av barnets foreldre",
      "må melde fra til NAV dersom h*n inngår et ekteskapslignende samboerforhold med en person hun ikke har felles barn med.",
    ]),
    h3("Relevante opplysninger i [den andre forelders/antatt samboers e.l.] sak"),
    p("[skriv kort om hvem, hvor og hvilken sak]"),

    h2("Opplysninger fra Posten"),
    p(
      "Vi har innhentet opplysninger fra Posten for perioden [dato – dato]. [Stønadsmottaker] er registrert med følgende postadresse(r):",
    ),
    ul(["[adresse]"]),

    h2("Opplysninger fra Eiendomsregisteret"),
    p(
      "Vi har gjort søk i Eiendomsregisteret. [Stønadsmottaker] er registrert med følgende eiendom(mer) i perioden vi har kontrollert:",
    ),
    ul(["[adresse]"]),

    h2("Opplysninger fra bank"),
    p("For perioden [dato–dato] har vi innhentet og benyttet opplysninger fra følgende banker:"),
    p("[bank og ev. kontonummer]"),
    p(
      "Vi har også innhentet opplysninger fra [bank/kontonummer], men disse har ikke vært relevante for saken.",
    ),
    p(
      "[navn] er kontoeier og eneste disponent på konto [nummer]. / I tillegg til [navn] er [person] disponent på kontoen.",
    ),
    p("Vi har laget en oversikt over relevante transaksjoner. Oversikten viser at [hovedtrekk]."),
    p("Se vedlagte «kontoutdrag» og «Brev til bank»."),
    p(
      "[Hvis aktuelt] Kontoopplysninger [vurdere å spesifisere hvilke konti] er lagt på filutveksling til [enhet].",
    ),

    h2("Opplysninger fra utleier"),
    p(
      "Vi har innhentet opplysninger fra [navn på utleier] for perioden [dato – dato]. Disse viser at [fritekst/kulepunkter]",
    ),

    h2("Opplysninger fra barnevernet"),
    p(
      "Vi har innhentet opplysninger fra barnevernet for perioden [dato – dato]. Disse viser at [fritekst/kulepunkter]",
    ),

    h2("Kontakt med stønadsmottakeren"),
    p(
      "Alt 1: Vi har ikke vært i kontakt med [stønadsmottaker] i forbindelse med utredningen av saken.",
    ),
    p(
      "Alt 2: Vi tok kontakt med [stønadsmottaker] [type kontakt og dato]. I samtalen / brevet opplyste [navn] [skriv kort om innholdet i samtalen/brevet].",
    ),
    p("Se vedlagte samtalereferat eller skriv fra stønadsmottakeren."),

    h1("Vurderingen vår"),
    p(
      "NAV Kontroll mener at [stønadsmottaker] har fått stønad(-er) som enslig mor eller far som h*n ikke har hatt krav på. Kontrollen viser at [stønadsmottaker] har levd/bodd sammen med [navn] i et ekteskapslignende forhold i perioden [dato – dato].",
    ),
    p("Vi har lagt vekt på dette:"),
    ul([
      "[stønadsmottaker] har gitt uriktige opplysninger til NAV: I søknaden(e) krysset h*n av for at h*n ikke tilbringer tid med den andre av barnets foreldre. Dette samsvarer ikke med opplysningene vi har innhentet.",
      "[stønadsmottaker] har vært folkeregistrert med bostedsadresse på adressen til [navn] siden [dato].",
      "[stønadsmottaker] har disponert konto, [kontonummer], til [navn] fra [dato].",
      "I husleiekontrakten står [stønadsmottaker] og [navn] som leietakere for boligen i [adresse] fra [dato].",
      "Bankkontoopplysningene viser sammenblandet økonomi.",
      "Det er overføringer mellom [stønadsmottaker] og [navn].",
      "[stønadsmottaker] og [navn] fikk barn sammen [dato].",
    ]),
    p("Husk også å ta med ev. momenter som kan tilsi at bruker er enslig mor eller far."),
    p(
      "[stønadsmottaker] har fått informasjon om at h*n har plikt til å gi riktige opplysninger til NAV, og har fått den informasjonen h*n trenger for å gi riktige opplysninger.",
    ),
    p(
      erStraffesak
        ? "Vi ber NAV Arbeid og ytelser / NAV Familie- og pensjonsytelser vurdere å stanse og kreve tilbake [stønad] i perioden [dato – dato]. Saken bør anmeldes til politiet. Vi viser til vedlagte anmeldelse."
        : "Vi ber NAV Arbeid og ytelser / NAV Familie- og pensjonsytelser vurdere å stanse og kreve tilbake [stønad] i perioden [dato – dato].",
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
      "Fristavbrytende handling må i så fall gjøres innen [dato – ett år regnet fra dagen før datoen for når Nav fikk eller burde fått kunnskap om kravet].",
    ),

    h1("Vi ønsker tilbakemelding"),
    p(
      "Vi ønsker tilbakemelding om resultatet i saken når den er ferdig behandlet, og klagefrist er utløpt.",
    ),
    erStraffesak
      ? p(
          "Dere må vurdere å sende over saken til Nav kontroll [enhet] for vurdering av anmeldelse til politiet hvis det kommer ny informasjon.",
        )
      : p("Vi vil da vurdere om det er grunnlag for anmeldelse."),
    p("Vi bistår gjerne hvis dere har spørsmål i saken."),
    p("Kontaktperson: [saksbehandlers navn]"),
    p("Vennlig hilsen"),
    p("NAV Kontroll vest"),
    p("[navn]"),
    p("Fagansvarlig rådgiver"),

    h1("Vedlegg"),
    tabell(
      rad(topptekst("Nr."), topptekst("Vedlegg")),
      rad(celle("1."), celle("Dokumentbeskrivelse")),
      rad(celle("2."), celle("Kontoutdrag")),
      rad(
        celle("3."),
        celle("Brev til bank (ev. banker) og svarbrevets (ev. svarbrevenes) førsteside"),
      ),
    ),
    p("Vedleggene er sendt til skanning på tema Kontroll i Gosys [dato]."),
    p("[hvis aktuelt]"),
    p(
      "Kontoopplysninger [vurdere å spesifisere hvilke konti] er lagt på filutveksling til [enhet].",
    ),
  ]);
}
