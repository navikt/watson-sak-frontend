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
  stønadSammendragTabell,
  tabell,
  topptekst,
  ul,
  variabel,
} from "./node-builders";

export function arbeidRapportmal({ erStraffesak }: { erStraffesak: boolean }): DokumentInnhold {
  return mal([
    p("Kontrollrapport"),
    p("Unntatt offentlighet"),
    p("jf. Lov om off. § 13, jf. NAV-loven § 7"),
    metadataTabell(),

    h1("Rapport om [stønad]"),
    p("Vi har kontrollert perioden fra [dato] til [dato]."),
    erStraffesak
      ? p(
          "Kontrollen viser at [stønadsmottaker] har arbeidet / hatt inntekt samtidig som h*n har mottatt [stønad(er)] fra Nav / ikke har rett på [stønad] fordi [grunn].",
        )
      : p(
          "Kontrollen viser at det er mest sannsynlig at [stønadsmottaker] har arbeidet / hatt inntekt samtidig som h*n har mottatt [stønad(er)] fra Nav / ikke har rett på [stønad] fordi [grunn].",
        ),
    p(
      "Vi ber dere vurdere å stanse utbetalingen av [stønad] og om [stønadsmottaker] skal betale tilbake:",
    ),
    stønadSammendragTabell(),

    h1("Bakgrunn for kontrollen"),
    p(
      "Nav kontroll fikk [dato] et anonymt tips / opplysninger fra [kilde] om at [gjengi opplysninger fra tips, se vedlegg [navn på vedlegg]].",
    ),
    p(
      "På bakgrunn av tipset / kontrollen har vi gjennomgått fagsystemene og innhentet opplysninger fra [bank, Skatteetaten, arbeidsgiver, regnskapsfører, oppdragsgiver, tredjeperson, se vedlegg [navn på vedlegg]].",
    ),
    p(
      "Vi har også innhentet opplysninger fra [bank, Skatteetaten, arbeidsgiver, regnskapsfører, oppdragsgiver, tredjeperson, se vedlegg [navn på vedlegg]]. [hvis aktuelt]",
    ),
    p("Opplysningene er innhentet etter at vi har gjort konkrete vurderinger av nødvendighet."),

    h1("Regelverk"),
    p(
      "[Ta med de materielle bestemmelsene som vurderingene i kontrollrapporten viser til og gjengi konkret den delen av bestemmelsen som er relevant for saken.]",
    ),

    h1("Opplysninger i saken"),
    h2("Opplysninger fra Navs fagsystemer"),
    h3("Personopplysninger"),
    p("[hvis aktuelt]"),
    h3("Stønadshistorikk"),
    p(
      "For fullstendige opplysninger om stønadsforholdene viser vi til fagsystemene. I denne rapporten nevner vi følgende:",
    ),
    p(
      "[Her kan du presentere opplysningene kronologisk eller per stønad, og enten som prosatekst eller kulepunkter.]",
    ),
    p(
      "[Eksempel: [navn] søkte om [stønad] [dato]. I søknaden opplyste [navn] […]. Vedlagt søknaden var […]. Nav innvilget [dato] [stønad] fra [dato] til [dato].]",
    ),
    p("[Her skal vi presentere:"),
    ul([
      "hvilken informasjon stønadsmottaker har fått om sine plikter",
      "om stønadsmottaker har bekreftet at h*n har forstått informasjonen",
      "om stønadsmottaker har bekreftet at opplysningene h*n har gitt til Nav er riktige.]",
    ]),
    h3("Meldekort"),
    p("[hvis aktuelt]"),
    p(
      "[Her må du kort redegjøre for opplysninger gitt på meldekortene. Eksempel: [navn] sendte meldekort i den aktuelle perioden. Meldekortene viser at […].]",
    ),
    h3("Aa-registeret"),
    p(
      "Stønadsmottaker er registrert med [arbeidsforhold] i aktuell periode. [Ved mange arbeidsforhold kan det brukes tabell eller kulepunkter.]",
    ),
    h3("A-inntekt"),
    p(
      "[For bruker. [navn] er i perioden [til fra] registrert med følgende inntekt fra [foretak].]",
    ),
    h3("Næringsinntekt"),
    p(
      "[For bruker. [navn] er i perioden [til fra] registrert med følgende næringsinntekt fra [foretak].]",
    ),

    h2("[Foretak, org.nr.]"),
    h3("Brønnøysundregistrene"),
    p(
      "Foretaket ble registrert i Brønnøysundregistrene [dato]. Foretaket er/har vært registrert innenfor bransje [type]. [Hvis aktuelt: Foretaket er slettet [dato].]",
    ),
    p("[navn] er/har vært registrert som [rolle]."),
    h3("Aa-registeret"),
    p(
      "Foretaket er registrert med [antall] arbeidstakere. [Her presenteres også personer registrert med aktuelle roller].",
    ),
    h3("A-inntekt"),
    p("[hvis aktuelt]"),
    p(
      "[Her redegjøres for inntekt innrapportert på andre ansatte / manglende inntekt på andre ansatte.]",
    ),

    h2("Opplysninger fra Skatteetaten"),
    p("[For bruker. Vi har innhentet opplysninger fra Skatteetaten om…]"),
    p("[For foretak. Vi har innhentet opplysninger fra Skatteetaten om…]"),

    h2("Opplysninger fra bank"),
    p("For perioden [dato – dato] har vi innhentet og benyttet opplysninger fra følgende banker:"),
    ul(["[bank og ev. kontonummer]"]),
    p(
      "[navn] er kontoeier og eneste disponent på konto. / I tillegg til [navn] er [person] disponent på kontoen.",
    ),
    p("Vi har laget en oversikt over relevante transaksjoner. Oversikten viser at [hovedtrekk]."),
    p("Se vedlagte «kontoutdrag» og «Brev til bank»."),

    h2("Opplysninger fra [navn]"),
    p(
      "Vi har innhentet opplysninger fra [navn] for perioden [dato – dato]. [For eksempel andre offentlige etater, regnskapsfører, arbeidsgiver, oppdragsgiver, tredjeperson.]",
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
      "Nav kontroll mener at [stønadsmottaker] har fått stønad(-er) som h*n ikke har hatt krav på. Kontrollen viser at [stønadsmottaker] har arbeidet / hatt inntekt / ikke oppfylt vilkårene for [stønad] i perioden [dato – dato].",
    ),
    p("Vi har lagt vekt på dette:"),
    ul([
      "[stønadsmottaker] startet opp [navn på virksomhet] under stønadsperioden.",
      "[stønadsmottaker] er registrert som daglig leder i [navn på virksomhet].",
      "[stønadsmottaker] eier aksjene i virksomheten.",
      "[stønadsmottaker] har disposisjonsrett til virksomhetens konto.",
      "det er overført [kroner] fra virksomhetens konto til [stønadsmottaker]s private konto.",
      "det er ingen ansatte registrert i virksomheten samtidig som virksomheten har en omsetning på [kroner].",
      "[stønadsmottaker] er påtruffet i arbeid [dato].",
      "[stønadsmottaker] er innført i personallisten [dato/periode].",
      "timelister/fakturaer viser at [...].",
    ]),
    p("[Husk å ta med momenter fra en ev. samtale med stønadsmottaker.]"),
    p(
      "[Husk også å ta med ev. momenter som kan tilsi at stønadsmottaker har / har hatt rett på stønaden.]",
    ),
    p(
      "[stønadsmottaker] har fått informasjon om at h*n har plikt til å gi riktige opplysninger til Nav, og har fått den informasjonen h*n trenger for å gi riktige opplysninger.",
    ),
    p(
      erStraffesak
        ? "Vi ber Nav arbeid og ytelser / Nav familie- og pensjonsytelser vurdere å stanse og kreve tilbake [stønad] i perioden [dato – dato]. Saken bør anmeldes til politiet. Vi viser til vedlagte anmeldelse."
        : "Vi ber Nav arbeid og ytelser / Nav familie- og pensjonsytelser vurdere å stanse og kreve tilbake [stønad] i perioden [dato – dato].",
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
    erStraffesak
      ? p(
          "Når saken er ferdig behandlet, og klagefristen er utløpt, må dere sende saken tilbake til Nav Kontroll. Vi vil da vurdere om det er grunnlag for å sende ytterligere opplysninger til politiet.",
        )
      : p(
          "Når saken er ferdig behandlet, og klagefristen er utløpt, må dere sende saken tilbake til Nav Kontroll. Vi vil da vurdere om det er grunnlag for anmeldelse.",
        ),
    p("Vi bistår gjerne hvis dere har spørsmål i saken."),
    pMedVariabler("Kontaktperson: ", variabel("saksbehandler")),
    p("Vennlig hilsen"),
    pMedVariabler("Nav kontroll ", variabel("avdeling")),
    pMedVariabler(variabel("saksbehandler")),
    p("fagansvarlig rådgiver/seniorrådgiver"),

    h1("Vedlegg"),
    tabell(
      rad(topptekst("Nr."), topptekst("Vedlegg")),
      rad(celle("1."), celle("Dokumentbeskrivelse")),
      rad(celle("2."), celle("Oversikt overføringer")),
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
