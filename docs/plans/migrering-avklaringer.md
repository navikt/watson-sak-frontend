# Migreringsveileder: kontrakt, beslutningstabell og avklaringer

Avsnitt 1–7 beskriver det opprinnelige utkastet fra fagnotatet «Overføring
av saker til nytt saksbehandlingssystem» (23.09.2026). Beslutningene for
den lokale implementeringen står under «Lokal flyt med lagret migreringsstatus».
Ekte data lastes inn i en senere oppgave. Eldre avklaringer om direkte
Access-integrasjon skal ikke brukes som spesifikasjon for denne leveransen.

Ingen fødselsnumre, navn eller saksinnhold fra reelle saker skal inn i chat,
mockdata, tester eller dokumentasjon. Del bare aggregater og faglig tolkning.

**Oppdatering (SAK-67, leveranse uten import):** `UTEN_ANSVARLIG` er fjernet fra
backend. Visningene er nå `MINE` og `ANSATTE`.

- `ANSATTE` er bare for ledere (ledergruppe og lederansvar for enheten). Den viser
  kandidater med bekreftet ansvar for andre ansatte i lederens enhet, uten personident
  og uten «Opprett sak».
- Responsen har `utilgjengelig: boolean`. Den er `true` når NOM eller tilgangsmaskinen
  ikke svarte. Kandidater uten bekreftet personinnsyn utelates, og frontend viser en
  kort feilmelding. Feil mot migreringstabellen gir fortsatt 502, og loaderen viser da
  tom liste og feilmelding.
- Notatet fra opprettelse er et vanlig dokument på saken. Det har ingen egne
  tilgangsregler utover dokumenttilgangen på saken.
- Migreringsfunksjonen og tabellen `migreringskandidat` er midlertidige. Se
  `watson-developer/docs/arkitektur/migrering-fjerning.md`.

Avsnittene under som nevner `UTEN_ANSVARLIG` beskriver det tidligere utkastet.

Kilder:

- [Research](https://confluence.adeo.no/pages/viewpage.action?pageId=863614195)
- [Løsningsbeskrivelse](https://confluence.adeo.no/pages/viewpage.action?pageId=863618529)
- Arbeidsnotat i `watson-developer`: `docs/notater/legacy-kontroll-db.md`
- Figma: [Sak, node 7841-13534](https://www.figma.com/design/MtreBNojkooH15uhUOPTyB/Sak?node-id=7841-13534)

## 1. Kategorier (beslutningstabell)

En kandidat er én rad i én kildetabell. Kategoriene er disjunkte innenfor
samme tabell. En rad som ikke treffer noen kategori er ikke en
migreringskandidat.

| Kategori               | Kildetabell             | Migreringskilde | Regel                                                                                                                                           | Forventet antall             |
| ---------------------- | ----------------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| `TIPS_RESTANSE`        | `KT_TABELLPERSON`       | `UTREDNING`     | `TIPSINNDATO IS NOT NULL AND UTREDRES IS NULL`                                                                                                  | 586                          |
| `TIPS_VENTER_RESULTAT` | `KT_TABELLPERSON`       | `UTREDNING`     | `UTREDRES IN ('REV. STRAFFESAK', 'REV. IKKE STRAFFESAK') AND FVRES IS NULL AND PROSJEKTENHET NOT IN ('Spaniakontoret', 'NAV Kontroll analyse')` | 612                          |
| `SV_RESTANSE`          | `KT_TABELLPERSONSTRAFF` | `SV`            | `SVMOTTATT IS NOT NULL AND SVRES IS NULL`                                                                                                       | 434 (420 etter kilderydding) |
| `SV_VENTER_RESULTAT`   | `KT_TABELLPERSONSTRAFF` | `SV`            | `SVRES IN ('Anmeldt', 'Anm. Agiver') AND POLDOMDATO IS NULL AND PROSJEKTIDENT <> 'KA' AND <referansedato> >= 2020-01-01`                        | 637                          |
| `REGISTER_DAGPENGER`   | `NKA_KONTROLL`          | `NKA_DAGPENGER` | `RESULTAT = 'UNDER ARBEID'`                                                                                                                     | 77                           |
| `REGISTER_AAP`         | `NKA_KONTROLL_AAP`      | `NKA_AAP`       | `RESULTAT = 'UNDER ARBEID'`                                                                                                                     | 60                           |

Presiseringer:

- **Null-semantikk.** Tom streng og streng med bare mellomrom behandles som
  `NULL` for alle kodefelt. Kodesammenligning skjer etter `trim()`, med eksakt
  store/små bokstaver som i tabellen.
- **FERDIGDATO** brukes ikke i noen regel.
- **PROSJEKTENHET/PROSJEKTIDENT = NULL** gir ikke eksklusjon. `NOT IN` og `<>`
  gjelder bare utfylte verdier.
- **TIPS_RESTANSE:** saker som henlegges under avklaring skal ha
  `UTREDRES = 'Henlagt, ikke utredet'` i kilden. Fagansvarlig har rettet
  avvik i Access. Koden legger ikke på ekstra filter på `TIPSAVKL`.
- **SV_RESTANSE:** koden implementerer regelen slik den står og gir 434.
  Fagansvarlig har bedt om henleggelse av 12 arbeidsgiveranmeldelser fra før
  2021 i kilden. Når det er gjort, gir samme regel 420. Ingen datofilter i kode.
- **SV_VENTER_RESULTAT:** «Stilt i bero» og «Henleggelse påklaget» kommer med
  når `POLDOMDATO` er tom. `POLDOMRES` er ikke en del av regelen.
- **Referansedato for 2020-grensen** er en navngitt konstant i backend,
  `SV_VENTER_REFERANSEDATOFELT`, foreløpig satt til `SVDATO`. Feltvalget er
  åpent spørsmål (se avsnitt 6). Grensen `2020-01-01` er også en navngitt
  konstant. Rad med tom referansedato blir kandidat med vurdering `MA_AVKLARES`,
  ikke utelatt.
- **Registerkontroll:** alle kontrollister tas med, ikke bare siste
  `KONTROLLISTE`, fordi saksbehandlers åpne saker på eldre lister også skal
  overføres. Omfanget er åpent spørsmål (se avsnitt 6).

### Vurdering per kandidat

| Situasjon                                                          | `vurdering`                          |
| ------------------------------------------------------------------ | ------------------------------------ |
| Alle predikater i kategorien er oppfylt og ingen avvik under       | `MULIG_KANDIDAT`                     |
| `SV_VENTER_RESULTAT` med tom referansedato                         | `MA_AVKLARES`                        |
| `TIPS_RESTANSE` der `TIPSAVKL IN ('Henlagt', 'Henlagt/grunnløst')` | `MA_AVKLARES`                        |
| `SV_RESTANSE` der `SVDATO IS NOT NULL` (dato uten resultat)        | `MA_AVKLARES`                        |
| Registerkandidat der saksbehandlernavn ikke gir entydig NAV-ident  | `MULIG_KANDIDAT` med ansvar `UKJENT` |

### Flagg

- `ekskluderFraStatistikk = true` når `SVRES = 'Anm. Agiver'`. Arbeidsgiveranmeldelser
  behandles av Nav registerforvaltning og skal ikke telle i offisiell statistikk
  om anmeldelse av trygdemisbruk. Flagget vises i UI og følger med ved opprettelse
  når opprettelse åpnes. Lagring på kontrollsak er utenfor denne leveransen.

## 2. Kandidatidentitet

- **Migreringskilde** (`Migreringskilde` i backend, `kilde` i API):
  `UTREDNING`, `SV`, `NKA_DAGPENGER`, `NKA_AAP`. Eksisterende verdier
  `UTREDNING` og `SV` beholdes. Planens arbeidsnavn `TIPS`, `NKA_DP` og
  `NKA_AAP` tilsvarer henholdsvis `UTREDNING`, `NKA_DAGPENGER` og `NKA_AAP`.
- **Nøkkel:** `(legacyKilde, legacyPid)`. `kandidatId` i API er
  `"<Migreringskilde>:<legacyPid>"`, for eksempel `SV:123456`.
- **PID** er et løpenummer per tabell. Det finnes ingen kobling mellom PID i
  tipstabellen og PID i SV-tabellen. Utredning og SV blir aldri slått sammen
  automatisk, verken via PID, TIPSREF eller FNR. SV-PID kobles til SID
  (sakstype og beløp for SV-saken).
- **Format:** `legacyPid` er bare sifre, 1 til 12 tegn (`^[0-9]{1,12}$`).
  Femsifferkravet fra V10 fjernes.

## 3. API-kontrakt

### `GET /api/v1/migrering/kandidater`

Query-parametre:

| Parameter  | Type                         | Standard | Beskrivelse            |
| ---------- | ---------------------------- | -------- | ---------------------- |
| `visning`  | `MINE` \| `UTEN_ANSVARLIG`   | `MINE`   | Hvilken liste          |
| `kategori` | `MigreringKategori`, valgfri | alle     | Filtrer på én kategori |
| `page`     | Int ≥ 1                      | 1        | Som i dag              |
| `size`     | Int 1–100                    | 20       | Som i dag              |

Klienten sender aldri NAV-ident eller enhet. Ukjente query-parametre ignoreres.

`MigreringKandidatResponse` (nye felt markert med ✚):

```kotlin
data class MigreringKandidatResponse(
    val kandidatId: String,              // "<kilde>:<legacyPid>"
    val kilde: String,                   // Migreringskilde
    val legacyPid: String,               // ✚
    val kategori: String,                // ✚ MigreringKategori
    val ansvar: MigreringAnsvarResponse, // type + navIdent (kun BEKREFTET/LOGGTREFF)
    val enhet: String?,                  // ✚ fallback-enhet når ansvar ikke er BEKREFTET
    val vurdering: String,               // MULIG_KANDIDAT | MA_AVKLARES
    val ekskluderFraStatistikk: Boolean, // ✚
    val referansedato: LocalDate?,       // ✚
    val referansedatoFelt: String?,      // ✚ kildefeltets navn, f.eks. "TIPSINNDATO"
    val fase: String,
    val begrunnelse: String,
    val grunnlag: List<MigreringGrunnlagsfeltResponse>,
    val alleredeMigrertTilKontrollsakId: Long?,
    val hentetTidspunkt: Instant,
    val personIdent: String?,     // ✦ kun satt når ansvar er BEKREFTET
)
```

`MigreringKandidatPageResponse` får `antallPerKategori: Map<String, Long>` (✚)
for oppsummeringen. Tallene gjelder bare kandidater innlogget bruker har tilgang
til i valgt `visning`, uavhengig av `kategori`-filteret.

Referansedato per kategori: `TIPSINNDATO` for tipskategoriene,
`SVMOTTATT` for `SV_RESTANSE`, `SV_VENTER_REFERANSEDATOFELT` for
`SV_VENTER_RESULTAT`. For registerkategoriene er feltet åpent. Til det er
avklart er `referansedato` og `referansedatoFelt` `null`.

`personIdent` returneres nå i listen, men **bare** når `ansvar.type ==
BEKREFTET`. For `UTEN_ANSVARLIG` og `LOGGTREFF` er feltet alltid `null` —
håndheves i `MigreringResponseMapper.toResponse()`, ikke bare i klienten (se
avsnitt 9, revidert etter Figma-sammenligning). Dette gjør at «Opprett sak»
fra migreringslisten kan forhåndsutfylle person i tråd med Figma-skjerm 2
(«Opprett sak, Enhet forhåndsutfylt + PID») for kandidater saksbehandler
allerede eier.

```kotlin
enum class MigreringKategori {
    TIPS_RESTANSE, TIPS_VENTER_RESULTAT,
    SV_RESTANSE, SV_VENTER_RESULTAT,
    REGISTER_DAGPENGER, REGISTER_AAP,
}
```

### `POST /api/v1/kontrollsaker` (`OpprettKontrollsakRequest`)

Nye valgfrie felt:

```kotlin
val legacyPid: String? = null,             // ^[0-9]{1,12}$
val legacyKilde: Migreringskilde? = null,
```

- Begge eller ingen. Bare ett av feltene gir 400.
- Når feltene er satt, henter backend kandidaten på nytt fra kilden med
  innlogget brukers tilgang. Finnes den ikke, eller har brukeren ikke tilgang,
  svarer backend 404 med samme melding for begge tilfeller.
- `personIdent` i requesten må være lik kandidatens `personIdent`. Avvik gir 400.
- Finnes det allerede en kontrollsak med samme `(legacyKilde, legacyPid)`,
  svarer backend 409 med `kontrollsakId` til eksisterende sak. Den unike indeksen
  er siste skanse ved samtidige innsendinger.
- Frontend sender `legacyPid` og `legacyKilde` videre fra forhåndsutfyllingen.
  Skjulte felt er ikke tillitsgrunnlag: backend validerer alt over.

### Database (Flyway, neste ledige versjon, V26 på `main`)

- `ADD COLUMN legacy_kilde TEXT`
- CHECK `legacy_kilde IN ('UTREDNING','SV','NKA_DAGPENGER','NKA_AAP')`
- CHECK `(legacy_kilde IS NULL) = (legacy_pid IS NULL)`
- Erstatt `kontrollsak_legacy_pid_digits_chk` med `^[0-9]{1,12}$`
- Backfill `legacy_kilde = 'UTREDNING'` der `legacy_pid IS NOT NULL`
- Erstatt `idx_kontrollsak_legacy_pid` med unik indeks på
  `(legacy_kilde, legacy_pid) WHERE legacy_pid IS NOT NULL`
- V10 endres ikke

`findAllByLegacyPid` beholdes for saksøk på tvers av kilder. Oppslag for
«allerede migrert» og duplikatkontroll bruker `(legacyKilde, legacyPid)`.

## 4. Tilgang (🔴 rød sone)

- NAV-ident hentes bare fra validert Azure AD-token (`TokenService`).
- **`MINE`:** ansvar `BEKREFTET` og `ansvar.navIdent` lik innlogget ident.
- **`UTEN_ANSVARLIG`:** ansvar er ikke `BEKREFTET`, kandidaten har `enhet`, og
  innlogget saksbehandlers enhet fra NOM (`NomClient.getSaksbehandler`) er lik
  kandidatens `enhet`. Kandidater uten `enhet` vises ikke for noen. De telles
  som eget avvik i logg for oppfølging.
- **Søkelogg gir aldri tilgang.** `LOGGTREFF` vises bare som informasjon i
  `UTEN_ANSVARLIG` og er aldri grunnlag for `MINE`.
- Personinnsyn sjekkes i tillegg med `TilgangService.sjekkTilgang(personIdent)`
  (populasjon og skjerming). Kandidater brukeren ikke har innsyn i filtreres bort
  før paginering og telling.
- Registerkontroll: saksbehandlernavn kobles mot lokal tabell for NAV-ident.
  Bare entydig treff gir `BEKREFTET`. Ellers `UKJENT` og enhet-fallback.
- Treff og avvisning revisjonslogges som i dag (`AuditLoggService`).

## 5. Frontend

- Seks kategorier vises som faner eller seksjoner etter Figma 7841-13534, med
  antall fra `antallPerKategori`. `MINE` og `UTEN_ANSVARLIG` er et separat valg.
- `types.ts` speiler kontrakten over. Mockdata er syntetisk og dekker alle seks
  kategorier, `MA_AVKLARES` og `ekskluderFraStatistikk`.
- Kandidater med `ekskluderFraStatistikk` får en synlig etikett
  («Arbeidsgiveranmeldelse, holdes utenfor statistikk»).
- Ruten er fortsatt bare tilgjengelig i `local-mock` og `demo` til datakilden er
  avklart. «Opprett sak» åpnes i mock når backend støtter `legacyPid` og
  `legacyKilde`, og viser 409 som «Allerede overført» med lenke til saken.
- `forhåndsutfyll.api.ts` tar imot `legacyPid` og `legacyKilde` i tillegg til FNR.

## 6. Avklaringer

### Besvart av fagansvarlig (23.09.2026)

| Nr. | Spørsmål                 | Svar                                                                                                                                                                                                        |
| --- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Utredning og forvaltning | Venter-på-resultat er `UTREDRES` REV-koder med tom `FVRES`, minus Spaniakontoret og NAV Kontroll analyse (612). FERDIGDATO brukes ikke. Kilden er ryddet for `FVRES`/`FVDATO`-avvik.                        |
| 2   | SV-oppfølging            | Bruk `POLDOMDATO IS NULL`. «Stilt i bero» og «Henleggelse påklaget» uten dato kommer med. Anm. Agiver kommer med, men skal holdes utenfor statistikk. KA holdes utenfor. Saker eldre enn 2020 tas ikke med. |
| 3   | Saksidentitet og kobling | PID er løpenummer per tabell. Ingen kobling mellom tips-PID og SV-PID. SV-PID kobles til SID.                                                                                                               |
| 4   | Ansvar og tilgang        | Saker uten saksbehandler får enhetsnummer, og saksbehandlere i enheten får tilgang. Hvem som setter enhet i kilden er ikke avklart.                                                                         |

### Åpne

| Nr. | Spørsmål                                                                                           | Påvirker                                    |
| --- | -------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| A   | Hvilket datofelt gjelder for grensen «eldre enn 2020» i `SV_VENTER_RESULTAT`? Foreløpig `SVDATO`.  | Konstanten `SV_VENTER_REFERANSEDATOFELT`    |
| B   | Gjelder registerkontroll alle kontrollister eller bare siste `KONTROLLISTE`? Foreløpig alle.       | Regel for `REGISTER_*`                      |
| C   | Datakilde: hvordan kommer Access-data til backend (målmotor, skjema, lesetilgang, frysetidspunkt)? | `MigreringskildeClient`-implementasjon      |
| D   | Er de 12 SV-restansene fra før 2021 henlagt i kilden (434 til 420)?                                | Bare volumkontroll, ikke kode               |
| E   | Hvilken nøkkel og hvilket datofelt har `NKA_KONTROLL` og `NKA_KONTROLL_AAP`?                       | `legacyPid` og `referansedato` for register |
| F   | Skal påklagede henleggelser etter 1.1.2024 tas med selv om `POLDOMDATO` er satt? Foreløpig nei.    | Regel for `SV_VENTER_RESULTAT`              |
| G   | Hvem setter enhet på saker uten saksbehandler i kilden, og hvilken enhet brukes?                   | Dekning i `UTEN_ANSVARLIG`                  |
| 5   | Database og kontrakt: målplattform, read-only-tilgang, oppdatering/frysing.                        | Se C                                        |
| 6   | Ferdig migrert: hvilke felt, notater og vedlegg følger med? Er det bare FNR, PID og saksbehandler? | Opprettelsesflyt og kvittering              |

## 7. Verifisering

- Backend: syntetiske tester for hvert predikat i hver kategori, både positivt
  og negativt, inkludert `NULL` mot tom streng, eksklusjonsverdier, KA,
  datogrensen, Anm. Agiver og `MA_AVKLARES`-tilfellene. Deretter `./gradlew build`.
- Frontend: `pnpm test -- migrering`, deretter `pnpm verify`.
- Volum: en person med tilgang til Access kjører én `COUNT(*)` per kategori mot
  samme snapshot og sammenligner med tabellen i avsnitt 1. Bare aggregater deles.

## Kjente tekniske risikoer

- ~~Duplikat Flyway-versjon V19~~ løst: begge brancher er rebaset (se avsnitt 9).
  Backend-branchen har nå V24 og V25 fra `main`, migreringskolonnen er `V26`,
  ingen `V27`-kollisjon lenger.
- ~~Begge brancher inneholder AI-chatbot-commits~~ løst: skilt ut til egne
  branches (se avsnitt 9).
- ~~Frontend-branchen er 52 commits bak `main`~~ løst: rebaset (se avsnitt 9).
- **Docker/Testcontainers er fortsatt ikke tilgjengelig i denne sandkassen.**
  Alle Postgres-/Spring-context-integrasjonstester (`MigreringControllerTest`,
  `KontrollsakControllerTest`, `KontrollsakSpecificationPostgresTest`, m.fl.)
  feiler med `DockerClientProviderStrategy`-årsak, ikke av kodefeil — bekreftet
  på nytt etter rebase ved å lese XML-testrapportene: samtlige 24 feilende
  filer har samme rotfeil, 70 mock-baserte filer er grønne. Disse må kjøres på
  nytt i CI eller lokalt med Docker før merge. `./gradlew build -x test` er
  grønn; `./gradlew test` feiler bare på disse.

## 9. Rebase og opprydding (denne runden)

Begge branches er rebaset på oppdatert `main` og chatbot-commits er skilt ut:

- **Backend** (`watson-admin-api`): rebaset `SAK-67/migreringsveileder` fra
  `d20c121` (gammel merge med `origin/main`) til nyeste `main` (`f7730ee`,
  tilstandsmaskin for kontrollsaker). Chatbot-commit `892b970` er flyttet til
  egen branch `chore/ai-veileder-chatbot` og fjernet fra migreringsbranchen.
  Tre konflikter, alle import-sammenslåinger i `GlobalExceptionHandler.kt` og
  `KontrollsakService.kt`/-testen (ingen logikkendring), pluss ett `git rm` av
  en `V27__chatbot_tabeller.sql`-omdøping som ikke lenger trengs når chatboten
  ikke er på branchen. `./gradlew build -x test` grønn. `./gradlew test`
  feiler bare på de kjente Docker-avhengige testene (se over).
- **Frontend** (`watson-sak-frontend`): rebaset `SAK-67/migreringsveileder` fra
  `f0fbdc3` (chatbot-commit) til nyeste `main`, 52 commits fremover. Chatbot-
  commit skilt ut til `chore/ai-veileder-chatbot`. Én konflikt, sammenslåing av
  ikon-importer i `AppSidebar.tsx` (migrering + statistikk-lenke lagt til
  samtidig i `main`). `pnpm verify` grønn: test, lint, format, typecheck og
  unused alle `exited with code 0` (136 filer, 1243 tester).
- Sikkerhetskopier av branchene før rebase: `backup/SAK-67-migreringsveileder-
før-rebase` i begge repoer.
- **Ikke gjort:** `chore/ai-veileder-chatbot`-branchene er ikke selv rebaset
  eller ryddet (backend-varianten har fortsatt sin egen `V19`-kollisjon med
  `V19__dokumentkommentarer.sql` på `main` og må få nytt versjonsnummer når
  den tas videre). Ingen av branchene er pushet til `origin` fra denne
  sandkassen (nettverkstilgang til GitHub er blokkert her).

## 8. 6.a-review og 7.a-avslutning (denne runden)

**Rødsone-funn:** `KontrollsakService.validerLegacyMigrering` gjenbruker
`MigreringService.hentKandidat`, som **bare** autoriserer bekreftet ansvar
(fanen «Mine saker»). En saksbehandler med enhetstilgang til en
`UTEN_ANSVARLIG`-kandidat kunne derfor trykke «Opprett sak» i UI-et og få en
villedende 404 («Personen ble ikke funnet») i stedet for en presis forklaring.
Backend feiler trygt (lukket, ikke åpent), men UI-et løy om årsaken. Rettet i
denne runden: `MigreringInnhold.tsx` deaktiverer nå «Opprett sak» for
kandidater der `ansvar.type !== "BEKREFTET"`, med en synlig forklaring i
stedet. Avklaring **H** over er nå besvart: dette er en varig sperre, ikke en
midlertidig — den skal ikke fjernes uten en ny, eksplisitt beslutning.

**Persondata-sjekk:** ingen ekte fødselsnummer i backend- eller
frontend-mockdata/-tester — kun syntetiske, gjentatte siffer (`11111111111`
osv.) i backend, og ingen FNR-felt i det hele tatt i frontendens
`MigreringKandidat` (personIdent eksponeres bevisst aldri i API-responsen).

**Verifisering kjørt denne runden:**

- Frontend: `pnpm verify` grønn (118 filer, 1008+ tester, lint/format/
  typecheck/knip alle 0).
- Backend: `./gradlew build -x test` grønn. `./gradlew test` feiler bare på
  Docker-avhengige integrasjonstester (se risikoliste over) — ingen
  mock-baserte enhetstester feiler.

**Ikke gjort i forrige runde, løst i denne runden** (se avsnitt 9 og avklaring
H over): rebase av backend-branchen mot `main` (V24/V25), utskilling av
chatbot-commits, og svar på avklaring H. Docker-testene må fortsatt kjøres av
utvikleren i en vanlig terminal utenfor sandkassen (se avsnitt 9) — ikke
bekreftet grønt her.

## 10. Figma-sammenligning og PII-utvidelse (denne runden)

**Funn:** implementasjonen hadde driftet fra Figma-skissen
(`docs/migrering.jpeg`, 4 skjermer). Skjerm 1 («Migrering – liste») viser en
flat tabell (PID, personnummer, opprettet i Access, «Opprett sak») uten faner
eller kategorier — seks-kategori-visningen kom fra fagnotatet 23.09, _etter_
denne skissen, og er ikke i konflikt i seg selv. Skjerm 2 («Opprett sak, Enhet
forhåndsutfylt + PID») derimot viste en reell motsetning: personen/PID-en er
allerede valgt når skjemaet åpnes, mens koden (bevisst, se § 3 før denne
revisjonen) aldri sendte `personIdent` fra migreringslisten og krevde manuelt
fnr-oppslag på nytt i `/registrer-sak`.

**Beslutning (denne runden):** følg Figma. `personIdent` eksponeres nå i
`MigreringKandidatResponse`, men **bare** når `ansvar.type == BEKREFTET` —
håndhevet i `MigreringResponseMapper.toResponse()` på backend, ikke bare
filtrert i klienten. `UTEN_ANSVARLIG`- og `LOGGTREFF`-kandidater får fortsatt
aldri `personIdent`, i tråd med avklaring H (varig sperre).

🔴 Rød sone: dette utvider hva slags persondata som forlater
migrerings-APIet. Endringen er gjort med streng betingelse
(`BEKREFTET`-ansvar only) og er dokumentert her, men er **ikke** egenhendig
godkjent av fagansvarlig/personvern — bare valgt av utvikler i denne økten
som svar på et reelt design-kode-avvik. Før merge bør personvernvurderingen
for dette feltet bekreftes eksplisitt, på samme måte som avklaring H ble det.

Frontend kan nå sende `personIdent` fra en bekreftet kandidat til den
etablerte forhåndsutfyllingen i både mockmodus og `local-backend`. Backend
må fortsatt validere kandidaten på nytt ved opprettelse; skjulte skjemafelt
er aldri et tillitsgrunnlag.

## Lokal flyt med lagret migreringsstatus

`watson-admin-api` oppretter tabellen `migreringskandidat` med Flyway V27.
V29 legger til nye kolonner i lokale databaser der en eldre V27 allerede er
kjørt. Flyways `repair()` kjører ikke tidligere SQL på nytt. V29 avviser gamle
sakskoblinger og manglende kategori i stedet for å gjette på dataene.
En rad identifiseres av `(kilde, legacy_pid)` og inneholder personident,
ansvarlig Nav-ident, kategori, status og en eventuell kobling til én Watson-sak.
Fullføring lagrer også hvem som bekreftet den og når. Notater og vedlegg
lagres på Watson-saken gjennom den eksisterende dokument- og filflyten,
ikke i migreringstabellen. Den separate V28-arbeidsfilen for en egen
dokumenttype inngår ikke i denne leveransen.

I lokal backend-profil legges sju syntetiske rader inn uten å overskrive
eksisterende rader. Testprofilen bruker fortsatt mockklienten. Utenfor
testprofilen leser backend tabellen. Ingen ekte Access-data importeres her;
det er en egen oppgave. Frontend holder migreringsruten stengt i prod og
åpen i `dev` og `local-backend`, der den henter én side om gangen (20 per
side) fra kandidat-API-et med brukerens OBO-token. `local-mock` og `demo`
viser syntetiske eksempler som en uavhengig prototype uten backend-kall.

Bare registrert ansvarlig kan lese en kandidat, opprette sak fra den eller
bekrefte ferdig flyttet. Personinnsyn kontrolleres i tillegg i backend. Å
være leder gir ingen ekstra rett i migreringsflyten; lederens øvrige
rettigheter på en eksisterende Watson-sak endres ikke. Opprettelse kobler
saken og setter `UNDER_MIGRERING` i samme transaksjon. Bare en egen,
manuell POST til ferdigstill-endepunktet setter `FULLSTENDIG`. En opprettet
sak eller opplastet fil betyr ikke at overføringen er ferdig. Gjentatt
ferdigmelding beholder første bekreftelse.

Sakopprettelse fra migreringslisten setter den bekreftede ansvarlige
(`KontrollsakFactory.opprettFraRequest`) som sakens ansvarlige — samme
Nav-ident som allerede er validert mot kandidaten i
`MigreringService.hentKandidat`. Vanlige nye saker får fortsatt ingen
ansvarlig før fordeling.

"Opprett sak"-skjemaet viser et valgfritt internt notatfelt bare når det
åpnes fra migreringslisten. Utfylt tekst lagres som et vanlig dokument
("Notat fra opprettelse") gjennom det eksisterende dokument-API-et
(`opprettDokument`/`lagreDokument`), kalt direkte fra opprettelsen — ikke via
den steg-sperrede `/api/saker/:sakId/dokumenter`-routen, som først tillater
redigering fra steget Utredes. Feiler notatlagringen, beholdes saken som
`UNDER_MIGRERING`, og bekreftelsesvisningen tilbyr å prøve å lagre notatet på
nytt mot samme sak (`/api/registrer-sak/notat`).

🔴 Rød sone: Teamet må gå gjennom tilgangsregelen, personinnsyn og
statusovergangene før merge. Backendens Postgres-integrasjonstester må
kjøres med Docker før endringen kan godkjennes. Oppbevaring og sletting av
fødselsnummer må godkjennes før ekte rader lastes inn. Ingen personident
skal logges i vanlige applikasjonslogger eller brukes som metrikketikett.

Ved senere deployment må man kontrollere at Flyway V27 er kjørt, at bare
ansvarlig får opp sine kandidater, og at status først endres etter en
manuell bekreftelse. Mål antall rader per status og følg feilraten på
migrerings-endepunktene uten personopplysninger i metrikker. Ved feil
holdes frontend-ruten stengt; eksisterende rader slettes ikke ved rollback.

Dette er lokal kode og tester, ikke en produksjonsgodkjenning.

## Prøve prototypen

```bash
ENVIRONMENT=local-mock pnpm run dev
```

Åpne `/migrering` på porten som Vite skriver ut (5175 hvis Tilt allerede bruker
5174). Fra listen kan du åpne `/saker/1181` og `/saker/1182`.

Playwright-testen sjekker listelenker, notatkort, grønn bekreftelse og
lukkeknapp. Den tar også skjermbilder på desktop og mobil for manuell
sammenligning med `watson-developer/docs/migrering2.png`. Når Chromium er installert, kan
den kjøres i en vanlig terminal mot den eksisterende lokale mockserveren:

```bash
PLAYWRIGHT_BASE_URL=http://localhost:5175 pnpm exec playwright test app/migrering/migrering-visning.spec.ts --project=chromium
```

Playwright skriver skjermbilder som vedlegg til HTML-testrapporten. Testen er
ikke kjørt i cplt-sandboxen fordi browseren ikke får tilgang til Crashpad-katalogen.
