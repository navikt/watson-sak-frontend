# Feilmeldinger ved tekniske feil

En teknisk feil skal ikke gi en helsides feilside. Meldingen vises der feilen skjedde, og resten av siden virker. Meldingen sier hva som gikk galt, hva saksbehandleren kan gjøre, og at feilen er registrert. Innført i TH-90.

Tekstene står i `app/feilhåndtering/feilmeldinger.ts`. Det er den eneste kilden. Dette dokumentet forklarer hvordan systemet virker og hvilke regler tekstene følger.

## Slik ser en melding ut

Alle meldingene er Aksel-varsler av typen error, laget med `<Feilmelding>`:

1. **Tittel:** hva som gikk galt, for eksempel «Vi fikk ikke delt tilgangen».
2. **Brødtekst:** hva saksbehandleren kan gjøre, for eksempel «Prøv igjen om litt.»
3. **Fast avslutning:** «Feilen er registrert hos oss. Oppgi feil-ID `a1b2c3d4` hvis du melder feilen i Porten.»

Feil-ID-en er den samme som i Loki, så vi finner feilen når den meldes inn. Den faste avslutningen står i `FEILEN_ER_REGISTRERT` i `Feilmelding.tsx`. Når teamet får varsel om feil, endres den til «Teamet har fått beskjed og jobber med å fikse feilen».

## «Feilet» eller «vet ikke»

Ved innsending skiller vi mellom to situasjoner, og meldingen har en variant for hver:

| Situasjon | Når                                                                          | Tittel                             | Brødtekst                                                             |
| --------- | ---------------------------------------------------------------------------- | ---------------------------------- | --------------------------------------------------------------------- |
| Feilet    | Backend svarte selv med 5xx, men ikke 502 eller 504                          | «Vi fikk ikke endret steget»       | «Prøv igjen om litt.»                                                 |
| Vet ikke  | Nettverksfeil, tidsavbrudd, 502 eller 504, eller svar som ikke lot seg tolke | «Vi vet ikke om steget ble endret» | «Last inn siden og se hvilket steg saken står i før du prøver igjen.» |

watson-admin-api kjører endringer i databasetransaksjoner. Når backend svarer med 5xx, er endringen rullet tilbake, og vi vet at den ikke ble lagret. Fikk vi ikke svar, kan endringen være lagret. Da ber vi brukeren sjekke før et nytt forsøk, så ingenting blir lagret to ganger.

Et svar som ikke lot seg tolke (ugyldig JSON eller skjemafeil) regnes som «vet ikke». Backend svarte da OK, så endringen er sannsynligvis lagret.

Serveren avgjør situasjonen i `erUsikker` i `teknisk-feil.server.ts` og setter `usikker` på feilsvaret. Mangler feltet, viser klienten «vet ikke», fordi det er det trygge valget.

**Forutsetning:** «Feilet» stemmer bare så lenge backend ruller tilbake før den svarer med 5xx. Gjør et endepunkt noe utenfor transaksjonen (for eksempel kall til Gosys eller Dokarkiv) før det feiler, må den handlingen bare ha «vet ikke»-teksten.

## Henting av data (loadere)

Bruk `hentEllerFeil` for hver kilde som kan feile uten at siden mister mening. Den gir ett av tre utfall:

- `ok`: dataene finnes.
- `ingenTilgang`: 403, eller statusene i `ingenTilgangStatuser`. Dette er en gyldig tilstand.
- `feil`: teknisk feil, logget med feil-ID.

Teknisk feil må aldri bli til tom data. Ellers ser «ingen filer» og «fikk ikke hentet filer» like ut.

På sakssiden er bare saken og innlogget bruker kritiske. Feiler de, kaster `kritisk()` et 500-svar med feil-ID, og `ErrorBoundary` i route-filen viser «Vi fikk ikke hentet saken» inne i sideoppsettet. Feiler tillatte handlinger, viser siden ingen handlinger (fail closed).

Meldingene for data som ikke kunne hentes, står i `SakDetaljSide.route.tsx` og `SakDetaljSidePanel.tsx`. De har en «Prøv igjen»-knapp som henter dataene på nytt (`kanPrøveIgjen`).

## Innsending (actions)

På serveren:

- Fang feil fra backendkall og returner `tekniskFeilSvar(feil, { kontekst, sakId, request })`. Den kaster kjente feil (4xx, redirects) videre uendret, så eksisterende håndtering av 403 og 409 virker som før.
- Ressursruter som svarer med `Response.json`, bruker `tekniskFeilResponse` i stedet.
- Valider input før `try`, og send aldri skjemadata tilbake i svaret.

I klienten:

- Vis `<Innsendingsfeil svar={fetcher.data} tekster={INNSENDINGSFEIL.delTilgang} />` ved knappen eller inne i dialogen. Komponenten rendrer ingenting når svaret ikke er en teknisk feil.
- Lukk ikke dialogen ved feil, og tøm ikke skjemaet.
- Holder komponenten feilen i egen state, bruk `tekniskFeilFra(svar)`, så `usikker` blir med.
- Reager bare på svar når fetcheren går fra en annen tilstand til `idle`. Ellers kan en render rett etter innsending behandle det forrige svaret.
- Nullstill feilen når dialogen åpnes og lukkes, så en feil fra et tidligere forsøk ikke vises.
- Sperr lukking mens innsendingen pågår, også med kryss og Escape (`onBeforeClose` og `onCancel`).

## Regler for tekstene

Reglene er avklart med design.

- Tittelen sier hva som gikk galt med denne handlingen: «Vi fikk ikke koblet sakene», ikke «Vi fikk ikke lagret endringen».
- Brødteksten sier hva brukeren kan gjøre. Ved «feilet» er det som regel «Prøv igjen om litt.»
- Be bare om å sjekke noe i «vet ikke»-varianten. «Vi fikk ikke lagret» etterfulgt av «Sjekk om det ble lagret» motsier seg selv.
- Ikke skriv at innholdet ligger der fortsatt («Det du har fylt inn, ligger fortsatt her»). Brukeren ser det rett under meldingen.
- Ikke vis tekst eller statuskode fra backend.
- Handlinger som bare henter data, trenger ikke «vet ikke»-variant, fordi ingenting blir endret.

## Legge til en ny melding

1. Legg til en nøkkel i `INNSENDINGSFEIL` i `feilmeldinger.ts`. Bruk `varianter(...)` for handlinger som endrer noe, og én tekst for handlinger som ikke kan gi dobbel lagring.
2. Skriv nummeret i en kommentar, og legg meldingen til i oversikten under.
3. Bruk `<Innsendingsfeil>` med nøkkelen. `tekster` er påkrevd, så det finnes ingen generell standardtekst å falle tilbake på.
4. Skriv en test for «feilet» (`usikker: false`) og en for «vet ikke».

## Personvern i logger og Faro

- `loggTekniskFeil` logger feil-ID, feiltype, status, saksId og sti uten query. Den logger aldri `error.message`, stack, request-body eller tekst fra backend, fordi de kan inneholde fødselsnummer.
- `håndterFeil` og kommentarklienten logger backendens `detail` bare ved lokal utvikling.
- `logger` tar ikke med melding og stack fra `Error`-objekter utenfor lokal utvikling.
- Faro maskerer 11-sifrede tall og fjerner query og fragment fra alle URL-er i payloaden (`faro-persondata.ts`).
- Handlingsnavn fra skjemaet logges bare når de består av bokstaver og understrek (`loggkontekstFor`).

## Testing

- `teknisk-feil.server.test.ts` dekker `erTekniskFeil`, `erUsikker`, `hentEllerFeil` og `tekniskFeilSvar`.
- `feilmeldinger.test.tsx` dekker valg av variant og tekster for mappehandlinger.
- I mock-modus simulerer `?mockFeil=<seksjon>` teknisk feil i en seksjon på sakssiden, for eksempel `/saker/1?mockFeil=historikk`. Gyldige seksjoner er `historikk`, `filer`, `saksbehandlere`, `tillatteHandlinger` og `andreSaker`. Parameteren virker ikke mot ekte backend.
- `seksjonsfeil.spec.ts` og `dokumentlagring.spec.ts` er Playwright-testene.

## Oversikt

Numrene er de samme som i oversikten design har godkjent, og står som kommentarer i koden.

| Nr.     | Handling                                     | Nøkkel eller fil                                | Varianter |
| ------- | -------------------------------------------- | ----------------------------------------------- | --------- |
| 1       | Hente saken                                  | `SakDetaljSide.route.tsx` (`ErrorBoundary`)     | Én        |
| 2       | Hente tillatte handlinger                    | `SakDetaljSide.route.tsx`                       | Én        |
| 3       | Hente filer                                  | `SakDetaljSide.route.tsx`                       | Én        |
| 4       | Hente andre saker på personen                | `SakDetaljSide.route.tsx`                       | Én        |
| 5       | Hente saksbehandlere                         | `SakDetaljSidePanel.tsx`                        | Én        |
| 6       | Hente historikk                              | `SakDetaljSidePanel.tsx`                        | Én        |
| 7a–7c   | Endre steg, endre status, lagre resultat     | `endreSteg`, `endreStatus`, `lagreResultat`     | To        |
| 8       | Redigere saksinformasjon                     | `saksinformasjon`                               | To        |
| 9a–9b   | Koble saker, fjerne kobling                  | `kobleSaker`, `fjerneKobling`                   | To        |
| 10      | «Tildel meg»                                 | `tildelMeg`                                     | To        |
| 11      | Fristille saken                              | `fristill`                                      | To        |
| 12      | Overføre ansvar                              | `overførAnsvar`                                 | To        |
| 13      | Sende til annen enhet                        | `sendTilEnhet`                                  | To        |
| 14      | Dele tilgang                                 | `delTilgang`                                    | To        |
| 15      | Ny hendelse i historikken                    | `nyHendelse`                                    | To        |
| 16      | Redigere hendelse                            | `redigerHendelse`                               | To        |
| 17      | Endre filnavn                                | `endreFilnavn`                                  | To        |
| 18      | Slette hendelse                              | `slettHendelse`                                 | To        |
| 19      | Fjerne delt tilgang                          | `fjernTilgang`                                  | To        |
| 20      | Merke saken som ferdig flyttet               | `ferdigFlyttet`                                 | Én        |
| 21a–21c | Opprette, gi nytt navn og slette mappe       | `opprettMappe`, `giMappeNyttNavn`, `slettMappe` | To        |
| 22–23   | Dra og slipp på sakssiden og dokumentsiden   | `flytteFeil(navn)`                              | To        |
| 24      | Laste opp fil                                | `lastOppFil`                                    | To        |
| 25      | Slette fil                                   | `slettFil`                                      | To        |
| 26      | Opprette dokument                            | `opprettDokument`                               | Én        |
| 27      | Slette dokument                              | `slettDokument`                                 | To        |
| 28      | Lagre dokument (har egen «Prøv igjen»-knapp) | `lagreDokument`                                 | Én        |
| 29–30   | Ny kommentar, svar i tråd                    | `lagreKommentar`                                | Én        |
| 31      | Slette kommentar                             | `slettKommentar`                                | To        |
| 32      | Markere kommentar som løst                   | `løsKommentar`                                  | Én        |
| 33      | Gjenåpne kommentar                           | `gjenåpneKommentar`                             | Én        |
| 34      | Registrere sak                               | `registrerSak`                                  | To        |
| 35      | Slå opp person                               | `slåOppPerson`                                  | Én        |
| 36      | Fordele sak                                  | `fordelSak`                                     | To        |
| 37      | Tildele i migrering                          | `tildelMigrering`                               | To        |
| 38      | Søke                                         | `søk`                                           | Én        |
| 39      | Merke varsler som lest                       | `merkVarslerLest`                               | Én        |
| 40      | Helsides feilside, siste skanse              | `InternalServerError.tsx`                       | Én        |
